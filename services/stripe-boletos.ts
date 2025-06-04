import { BoletoAPI, BoletoResponse } from './boletos-api';

export class StripeBoletosService {
  private apiKey: string;
  private baseUrl = 'https://api.stripe.com/v1';

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY || '';
    
    console.log('🔍 Stripe Service initialized');
    console.log('API Key exists:', !!this.apiKey);
    
    if (!this.apiKey) {
      console.error('❌ Stripe API Key not found');
    }
  }

  // Buscar ou criar customer por email
  private async findOrCreateCustomer(email: string, name?: string): Promise<string | null> {
    if (!this.apiKey || !email) {
      console.error('Missing API key or email');
      return null;
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log(`🔍 Finding/creating customer for email: ${normalizedEmail}`);

    try {
      // Buscar customer existente
      const searchUrl = `${this.baseUrl}/customers?email=${encodeURIComponent(normalizedEmail)}&limit=1`;
      const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.data && searchData.data.length > 0) {
          const customer = searchData.data[0];
          console.log(`✅ Customer found: ${customer.id}`);
          return customer.id;
        }
      }

      // Criar novo customer
      console.log(`Creating new customer for: ${normalizedEmail}`);
      const createBody = new URLSearchParams();
      createBody.append('email', normalizedEmail);
      if (name) createBody.append('name', name);

      const createResponse = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: createBody,
      });

      if (createResponse.ok) {
        const newCustomer = await createResponse.json();
        console.log(`✅ Customer created: ${newCustomer.id}`);
        return newCustomer.id;
      } else {
        const errorText = await createResponse.text();
        console.error('❌ Error creating customer:', errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error in findOrCreateCustomer:', error);
      return null;
    }
  }

  // Listar PaymentIntents (boletos)
  async fetchBoletos(params?: {
    status?: 'paid' | 'pending' | 'all';
    limit?: number;
    userEmail?: string;
    userName?: string;
  }): Promise<BoletoResponse> {
    if (!this.apiKey) {
      throw new Error('Stripe API Key not configured');
    }

    try {
      const limit = params?.limit || 100;
      
      // Preparar query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('expand[]', 'data.payment_method');

      // Se tiver email, filtrar por customer
      let customerId: string | null = null;
      if (params?.userEmail && params.userEmail !== 'DEBUG_ALL') {
        customerId = await this.findOrCreateCustomer(params.userEmail, params.userName);
        if (customerId) {
          queryParams.append('customer', customerId);
          console.log(`🔍 Filtering by customer: ${customerId}`);
        }
      } else if (params?.userEmail === 'DEBUG_ALL') {
        console.log('🔍 DEBUG MODE: Listing ALL PaymentIntents');
      }

      // Fazer requisição para API Stripe
      const url = `${this.baseUrl}/payment_intents?${queryParams.toString()}`;
      console.log(`📡 Calling Stripe API: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stripe API error:', errorText);
        throw new Error(`Stripe API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📦 Total PaymentIntents returned: ${data.data?.length || 0}`);

      // Log detalhado de cada intent
      data.data?.forEach((intent: any) => {
        const hasBoletoPM = intent.payment_method_types?.includes('boleto');
        const isSucceeded = intent.status === 'succeeded';
        console.log(`Intent ${intent.id}: status=${intent.status}, methods=${JSON.stringify(intent.payment_method_types)}, isBoleto=${hasBoletoPM}, isPaid=${isSucceeded}`);
      });

      // Filtrar apenas PaymentIntents com método boleto
      const boletoIntents = data.data?.filter((intent: any) => 
        intent.payment_method_types?.includes('boleto')
      ) || [];

      console.log(`📋 Boleto intents after filter: ${boletoIntents.length}`);

      // Aplicar filtro de status se especificado
      let filteredIntents = boletoIntents;
      if (params?.status && params.status !== 'all') {
        filteredIntents = boletoIntents.filter((intent: any) => {
          const isPaid = intent.status === 'succeeded';
          return params.status === 'paid' ? isPaid : !isPaid;
        });
        console.log(`📋 After status filter (${params.status}): ${filteredIntents.length}`);
      }

      // Converter para formato da aplicação
      const boletos: BoletoAPI[] = filteredIntents.map((intent: any) => {
        const paymentMethod = intent.payment_method;
        const boletoData = paymentMethod?.boleto || {};
        
        // Para boletos que estão em requires_action, os dados podem estar em next_action
        let barcodeInfo = {
          barcode: boletoData.barcode || '',
          digitable_line: boletoData.digitable_line || '',
          pdf: boletoData.pdf || '',
          hosted_voucher_url: boletoData.hosted_voucher_url || '',
          expires_at: boletoData.expires_at
        };

        // Se o PaymentIntent está em requires_action e tem next_action.boleto_display_details
        if (intent.status === 'requires_action' && 
            intent.next_action?.type === 'boleto_display_details' && 
            intent.next_action.boleto_display_details) {
          
          const boletoDisplayDetails = intent.next_action.boleto_display_details;
          
          // Usar os dados de boleto_display_details se disponíveis
          barcodeInfo = {
            barcode: boletoDisplayDetails.barcode || barcodeInfo.barcode,
            digitable_line: boletoDisplayDetails.digitable_line || barcodeInfo.digitable_line,
            pdf: boletoDisplayDetails.pdf || barcodeInfo.pdf,
            hosted_voucher_url: boletoDisplayDetails.hosted_voucher_url || barcodeInfo.hosted_voucher_url,
            expires_at: boletoDisplayDetails.expires_at || barcodeInfo.expires_at
          };
        }
        
        // Melhorar a descrição se ela for genérica
        let description = intent.description;
        
        // Se a descrição for genérica ou vazia, criar uma mais específica baseada na data
        if (!description || 
            description === 'Payment for Invoice' || 
            description.includes('Boleto pi_') ||
            description.trim() === '' ||
            description === `Boleto ${intent.id}`) {
          
          // Usar a data de expiração do boleto ou data de criação para definir o mês
          let referenceDate;
          if (barcodeInfo.expires_at) {
            referenceDate = new Date(barcodeInfo.expires_at * 1000);
          } else {
            referenceDate = new Date(intent.created * 1000);
          }
          
          const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
          ];
          
          const monthName = monthNames[referenceDate.getMonth()];
          const year = referenceDate.getFullYear();
          description = `Taxa de condomínio - ${monthName}/${year}`;
        }
        
        // Validar e processar os dados de retorno
        const validatedValue = intent.amount && typeof intent.amount === 'number' && !isNaN(intent.amount) 
          ? intent.amount 
          : 0;

        const validatedDueDate = barcodeInfo.expires_at 
          ? new Date(barcodeInfo.expires_at * 1000).toISOString()
          : new Date().toISOString();
        
        return {
          id: intent.id,
          description: description, // Usar a descrição melhorada
          dueDate: validatedDueDate,
          value: validatedValue,
          status: intent.status === 'succeeded' ? 'paid' : 'pending',
          pdfUrl: barcodeInfo.pdf || '',
          paymentUrl: barcodeInfo.hosted_voucher_url || '',
          barcode: barcodeInfo.barcode || '',
          digitable_line: barcodeInfo.digitable_line || '',
          expires_at: barcodeInfo.expires_at,
          created_at: new Date(intent.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      console.log(`✅ Final boletos for app: ${boletos.length}`);

      return {
        data: boletos,
        total: boletos.length,
        page: 1,
        limit: limit,
      };

    } catch (error) {
      console.error('❌ Error in fetchBoletos:', error);
      throw error;
    }
  }

  // Buscar boleto por ID
  async getBoletoById(id: string, retryForBarcode: boolean = false): Promise<BoletoAPI> {
    if (!this.apiKey) {
      throw new Error('Stripe API Key not configured');
    }

    try {
      const url = `${this.baseUrl}/payment_intents/${id}?expand[]=payment_method`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stripe API Error: ${response.status} - ${errorText}`);
      }

      const intent = await response.json();
      const paymentMethod = intent.payment_method;
      const boletoData = paymentMethod?.boleto || {};

      console.log('🔍 Raw Stripe Intent Data:', {
        id: intent.id,
        amount: intent.amount,
        amountType: typeof intent.amount,
        description: intent.description,
        created: intent.created,
        status: intent.status,
        paymentMethod: !!paymentMethod,
        paymentMethodType: paymentMethod?.type,
        hasNextAction: !!intent.next_action,
        nextActionType: intent.next_action?.type,
        boletoData: {
          expires_at: boletoData.expires_at,
          expires_at_type: typeof boletoData.expires_at,
          pdf: boletoData.pdf,
          barcode: boletoData.barcode,
          digitable_line: boletoData.digitable_line,
          hosted_voucher_url: boletoData.hosted_voucher_url
        }
      });

      // Para boletos que estão em requires_action, os dados podem estar em next_action
      let barcodeInfo = {
        barcode: boletoData.barcode || '',
        digitable_line: boletoData.digitable_line || '',
        pdf: boletoData.pdf || '',
        hosted_voucher_url: boletoData.hosted_voucher_url || '',
        expires_at: boletoData.expires_at
      };

      // Se o PaymentIntent está em requires_action e tem next_action.boleto_display_details
      if (intent.status === 'requires_action' && 
          intent.next_action?.type === 'boleto_display_details' && 
          intent.next_action.boleto_display_details) {
        
        const boletoDisplayDetails = intent.next_action.boleto_display_details;
        
        console.log('🔍 Boleto Display Details found:', {
          barcode: boletoDisplayDetails.barcode,
          digitable_line: boletoDisplayDetails.digitable_line,
          pdf: boletoDisplayDetails.pdf,
          hosted_voucher_url: boletoDisplayDetails.hosted_voucher_url,
          expires_at: boletoDisplayDetails.expires_at
        });

        // Usar os dados de boleto_display_details se disponíveis
        barcodeInfo = {
          barcode: boletoDisplayDetails.barcode || barcodeInfo.barcode,
          digitable_line: boletoDisplayDetails.digitable_line || barcodeInfo.digitable_line,
          pdf: boletoDisplayDetails.pdf || barcodeInfo.pdf,
          hosted_voucher_url: boletoDisplayDetails.hosted_voucher_url || barcodeInfo.hosted_voucher_url,
          expires_at: boletoDisplayDetails.expires_at || barcodeInfo.expires_at
        };
      }

      console.log('🔍 Final barcode info:', barcodeInfo);

      // Se não tem código de barras e ainda não tentamos retentar, aguardar um pouco e tentar novamente
      if (retryForBarcode && !barcodeInfo.barcode && !barcodeInfo.digitable_line && intent.status === 'requires_action') {
        console.log('⏳ Aguardando processamento do código de barras...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Aguardar 3 segundos
        
        console.log('🔄 Tentando buscar código de barras novamente...');
        return this.getBoletoById(id, false); // Tentar novamente, mas sem retry adicional
      }

      // Melhorar a descrição se ela for genérica
      let description = intent.description;
      
      // Se a descrição for genérica ou vazia, criar uma mais específica baseada na data
      if (!description || 
          description === 'Payment for Invoice' || 
          description.includes('Boleto pi_') ||
          description.trim() === '' ||
          description === `Boleto ${intent.id}`) {
        
        // Usar a data de expiração do boleto ou data de criação para definir o mês
        let referenceDate;
        if (barcodeInfo.expires_at) {
          referenceDate = new Date(barcodeInfo.expires_at * 1000);
        } else {
          referenceDate = new Date(intent.created * 1000);
        }
        
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        const monthName = monthNames[referenceDate.getMonth()];
        const year = referenceDate.getFullYear();
        description = `Taxa de condomínio - ${monthName}/${year}`;
      }

      // Validar e processar os dados de retorno
      const validatedValue = intent.amount && typeof intent.amount === 'number' && !isNaN(intent.amount) 
        ? intent.amount 
        : 0;

      const validatedDueDate = barcodeInfo.expires_at 
        ? new Date(barcodeInfo.expires_at * 1000).toISOString()
        : new Date().toISOString();

      console.log('🔍 Validated data before return:', {
        originalAmount: intent.amount,
        validatedValue,
        originalExpiresAt: barcodeInfo.expires_at,
        validatedDueDate,
        hasBarcode: !!barcodeInfo.barcode,
        hasDigitableLine: !!barcodeInfo.digitable_line,
        hasPdf: !!barcodeInfo.pdf,
        pdfUrl: barcodeInfo.pdf || '',
        paymentUrl: barcodeInfo.hosted_voucher_url || '',
        barcodeInfoDetails: {
          pdf: barcodeInfo.pdf,
          hosted_voucher_url: barcodeInfo.hosted_voucher_url,
          barcode: barcodeInfo.barcode?.substring(0, 20) + '...' || '',
          digitable_line: barcodeInfo.digitable_line?.substring(0, 20) + '...' || '',
        }
      });

      return {
        id: intent.id,
        description: description, // Usar a descrição melhorada
        dueDate: validatedDueDate,
        value: validatedValue,
        status: intent.status === 'succeeded' ? 'paid' : 'pending',
        pdfUrl: barcodeInfo.pdf || '',
        paymentUrl: barcodeInfo.hosted_voucher_url || '',
        barcode: barcodeInfo.barcode || '',
        digitable_line: barcodeInfo.digitable_line || '',
        expires_at: barcodeInfo.expires_at,
        created_at: new Date(intent.created * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };

    } catch (error) {
      console.error('❌ Error fetching boleto:', error);
      throw error;
    }
  }

  // Criar boleto
  async createBoleto(data: {
    description: string;
    value: number; // Em centavos
    dueDate: string;
    customerInfo?: {
      name: string;
      email: string;
      document: string;
    };
  }): Promise<BoletoAPI> {
    if (!this.apiKey) {
      throw new Error('Stripe API Key not configured');
    }

    console.log('🔍 Creating boleto:', {
      description: data.description,
      value: data.value,
      dueDate: data.dueDate,
      email: data.customerInfo?.email
    });

    try {
      // Buscar/criar customer se tiver email
      let customerId: string | null = null;
      if (data.customerInfo?.email) {
        customerId = await this.findOrCreateCustomer(
          data.customerInfo.email, 
          data.customerInfo.name
        );
      }

      // Calcular dias para expiração
      const expiresAt = Math.floor(new Date(data.dueDate).getTime() / 1000);
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const expiresAfterDays = Math.max(1, Math.ceil((expiresAt - nowInSeconds) / (24 * 60 * 60)));

      // Preparar dados do PaymentIntent - CORRIGIR ORDEM DOS PARÂMETROS
      const paymentData = new URLSearchParams();
      
      // Amount deve ser o primeiro parâmetro
      paymentData.append('amount', data.value.toString());
      paymentData.append('currency', 'brl');
      
      if (customerId) {
        paymentData.append('customer', customerId);
      }
      
      paymentData.append('description', data.description);
      
      if (data.customerInfo?.email) {
        paymentData.append('receipt_email', data.customerInfo.email);
      }
      
      // Configurações específicas do boleto
      paymentData.append('payment_method_types[]', 'boleto');
      paymentData.append('payment_method_options[boleto][expires_after_days]', expiresAfterDays.toString());
      
      // Configurar para confirmar automaticamente
      paymentData.append('confirmation_method', 'automatic');
      paymentData.append('confirm', 'true');

      console.log('📤 PaymentIntent data:', Object.fromEntries(paymentData.entries()));

      // Criar e confirmar PaymentIntent
      const response = await fetch(`${this.baseUrl}/payment_intents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: paymentData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stripe create error:', errorText);
        throw new Error(`Stripe API Error: ${response.status} - ${errorText}`);
      }

      const intent = await response.json();
      console.log(`✅ PaymentIntent created and confirmed: ${intent.id}`);

      // Buscar novamente com payment_method expandido para obter dados completos do boleto
      // Usar retry para aguardar código de barras ser processado
      const expandedIntent = await this.getBoletoById(intent.id, true);
      
      console.log('✅ Boleto data available:', {
        pdf: !!expandedIntent.pdfUrl,
        barcode: !!expandedIntent.barcode,
        digitable_line: !!expandedIntent.digitable_line,
        paymentUrl: !!expandedIntent.paymentUrl
      });
      
      return expandedIntent;

    } catch (error) {
      console.error('❌ Error creating boleto:', error);
      throw error;
    }
  }

  // Formatar para exibição no app
  formatBoletoForDisplay(boleto: BoletoAPI): {
    id: string;
    description: string;
    dueDate: string;
    value: string;
    status: 'paid' | 'pending';
    pdfUrl: string;
    month: string;
    year: string;
  } {
    const date = new Date(boleto.dueDate);
    const formattedDate = date.toLocaleDateString('pt-BR');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    
    // Melhorar a descrição se ela for genérica
    let description = boleto.description;
    
    // Se a descrição for genérica ou vazia, criar uma mais específica
    if (!description || 
        description === 'Payment for Invoice' || 
        description.includes('Boleto pi_') ||
        description.trim() === '' ||
        description === `Boleto ${boleto.id}`) {
      
      // Criar descrição baseada na data de vencimento
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      
      const monthName = monthNames[date.getMonth()];
      description = `Taxa de condomínio - ${monthName}/${year}`;
    }
    
    return {
      id: boleto.id,
      description: description,
      dueDate: formattedDate,
      value: `R$ ${(boleto.value / 100).toFixed(2).replace('.', ',')}`,
      status: boleto.status,
      pdfUrl: boleto.pdfUrl || boleto.paymentUrl || '',
      month,
      year,
    };
  }
}

export const stripeBoletosService = new StripeBoletosService(); 