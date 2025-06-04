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

  // Listar Invoices (faturas/boletos)
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
      queryParams.append('expand[]', 'data.payment_intent'); // Expandir payment_intent para obter detalhes do boleto

      // Se tiver email, filtrar por customer
      let customerId: string | null = null;
      if (params?.userEmail && params.userEmail !== 'DEBUG_ALL') {
        customerId = await this.findOrCreateCustomer(params.userEmail, params.userName);
        if (customerId) {
          queryParams.append('customer', customerId);
          console.log(`🔍 Filtering invoices by customer: ${customerId}`);
        }
      } else if (params?.userEmail === 'DEBUG_ALL') {
        console.log('🔍 DEBUG MODE: Listing ALL Invoices');
      }

      // Fazer requisição para API Stripe - buscar Invoices
      const url = `${this.baseUrl}/invoices?${queryParams.toString()}`;
      console.log(`📡 Calling Stripe API for Invoices: ${url}`);

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
      console.log(`📦 Total Invoices returned: ${data.data?.length || 0}`);

      // Log detalhado de cada invoice
      data.data?.forEach((invoice: any) => {
        const paymentIntent = invoice.payment_intent;
        const hasBoletoPM = paymentIntent?.payment_method_types?.includes('boleto');
        const isPaid = invoice.status === 'paid';
        console.log(`Invoice ${invoice.id}: status=${invoice.status}, payment_intent=${paymentIntent?.id}, methods=${JSON.stringify(paymentIntent?.payment_method_types)}, isBoleto=${hasBoletoPM}, isPaid=${isPaid}`);
      });

      // Filtrar apenas Invoices com payment_intent que tem método boleto OU sem payment_intent (ainda pendente de geração)
      const boletoInvoices = data.data?.filter((invoice: any) => {
        // Se tem payment_intent, verificar se é boleto
        if (invoice.payment_intent) {
          return invoice.payment_intent.payment_method_types?.includes('boleto');
        }
        // Se não tem payment_intent, é uma fatura criada mas ainda não paga (candidata para boleto)
        return true;
      }) || [];

      console.log(`📋 Boleto invoices after filter: ${boletoInvoices.length}`);

      // Aplicar filtro de status se especificado
      let filteredInvoices = boletoInvoices;
      if (params?.status && params.status !== 'all') {
        filteredInvoices = boletoInvoices.filter((invoice: any) => {
          const isPaid = invoice.status === 'paid';
          return params.status === 'paid' ? isPaid : !isPaid;
        });
        console.log(`📋 After status filter (${params.status}): ${filteredInvoices.length}`);
      }

      // Converter para formato da aplicação
      const boletos: BoletoAPI[] = filteredInvoices.map((invoice: any) => {
        const paymentIntent = invoice.payment_intent;
        let barcodeInfo = {
          barcode: '',
          digitable_line: '',
          pdf: '',
          hosted_voucher_url: '',
          expires_at: undefined as number | undefined
        };

        // Se tem payment_intent, extrair dados do boleto
        if (paymentIntent && paymentIntent.payment_method) {
          const boletoData = paymentIntent.payment_method.boleto || {};
          
          barcodeInfo = {
            barcode: boletoData.barcode || '',
            digitable_line: boletoData.digitable_line || '',
            pdf: boletoData.pdf || '',
            hosted_voucher_url: boletoData.hosted_voucher_url || '',
            expires_at: boletoData.expires_at
          };

          // Também verificar next_action se disponível
          if (paymentIntent.status === 'requires_action' && 
              paymentIntent.next_action?.type === 'boleto_display_details') {
            
            const boletoDisplayDetails = paymentIntent.next_action.boleto_display_details;
            
            barcodeInfo = {
              barcode: boletoDisplayDetails.barcode || barcodeInfo.barcode,
              digitable_line: boletoDisplayDetails.digitable_line || barcodeInfo.digitable_line,
              pdf: boletoDisplayDetails.pdf || barcodeInfo.pdf,
              hosted_voucher_url: boletoDisplayDetails.hosted_voucher_url || barcodeInfo.hosted_voucher_url,
              expires_at: boletoDisplayDetails.expires_at || barcodeInfo.expires_at
            };
          }
        }
        
        // Usar a descrição da invoice ou criar uma baseada na data
        let description = invoice.description;
        
        if (!description || description.trim() === '') {
          // Se não tem descrição, criar baseada na data de vencimento da invoice
          let referenceDate = new Date(invoice.due_date * 1000); // due_date é timestamp Unix
          
          const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
          ];
          
          const monthName = monthNames[referenceDate.getMonth()];
          const year = referenceDate.getFullYear();
          description = `Taxa de condomínio - ${monthName}/${year}`;
        }
        
        // Validar e processar os dados de retorno
        const validatedValue = invoice.amount_due && typeof invoice.amount_due === 'number' && !isNaN(invoice.amount_due) 
          ? invoice.amount_due 
          : 0;

        // Usar due_date da invoice como data de vencimento
        const validatedDueDate = invoice.due_date 
          ? new Date(invoice.due_date * 1000).toISOString()
          : new Date().toISOString();
        
        return {
          id: paymentIntent?.id || invoice.id, // Usar payment_intent.id se disponível, senão invoice.id
          description: description,
          dueDate: validatedDueDate,
          value: validatedValue,
          status: invoice.status === 'paid' ? 'paid' : 'pending',
          pdfUrl: barcodeInfo.pdf || '',
          paymentUrl: barcodeInfo.hosted_voucher_url || '',
          barcode: barcodeInfo.barcode || '',
          digitable_line: barcodeInfo.digitable_line || '',
          expires_at: barcodeInfo.expires_at,
          created_at: new Date(invoice.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          // Campos adicionais para tracking
          invoice_id: invoice.id,
          payment_intent_id: paymentIntent?.id || null,
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
  async getBoletoById(id: string, retryAttempt: number = 0): Promise<BoletoAPI> {
    if (!this.apiKey) {
      throw new Error('Stripe API Key not configured');
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 3000; // 3 segundos

    try {
      let url: string;
      let isInvoiceId = id.startsWith('in_');
      let isPaymentIntentId = id.startsWith('pi_');
      
      console.log(`🔍 getBoletoById called with ID: ${id}, isInvoice: ${isInvoiceId}, isPaymentIntent: ${isPaymentIntentId}`);

      if (isInvoiceId) {
        // Se é um Invoice ID, buscar a Invoice e expandir o payment_intent se existir
        url = `${this.baseUrl}/invoices/${id}?expand[]=payment_intent&expand[]=payment_intent.payment_method`;
      } else if (isPaymentIntentId) {
        // Se é um Payment Intent ID, usar o método original
        url = `${this.baseUrl}/payment_intents/${id}?expand[]=payment_method`;
      } else {
        throw new Error(`ID inválido: ${id}. Deve começar com 'in_' (Invoice) ou 'pi_' (Payment Intent)`);
      }
      
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

      const data = await response.json();
      
      if (isInvoiceId) {
        // Processar dados da Invoice
        const invoice = data;
        const paymentIntent = invoice.payment_intent;
        
        console.log(`🔍 [Attempt ${retryAttempt + 1}/${MAX_RETRIES + 1}] Invoice Data:`, {
          id: invoice.id,
          amount_due: invoice.amount_due,
          status: invoice.status,
          due_date: invoice.due_date,
          hasPaymentIntent: !!paymentIntent,
          paymentIntentId: paymentIntent?.id,
          paymentIntentStatus: paymentIntent?.status,
        });

        let barcodeInfo = {
          barcode: '',
          digitable_line: '',
          pdf: '',
          hosted_voucher_url: '',
          expires_at: undefined as number | undefined
        };

        // Se tem payment_intent, extrair dados do boleto
        if (paymentIntent && paymentIntent.payment_method) {
          const boletoData = paymentIntent.payment_method.boleto || {};
          
          barcodeInfo = {
            barcode: boletoData.barcode || '',
            digitable_line: boletoData.digitable_line || '',
            pdf: boletoData.pdf || '',
            hosted_voucher_url: boletoData.hosted_voucher_url || '',
            expires_at: boletoData.expires_at
          };

          // Também verificar next_action se disponível
          if (paymentIntent.status === 'requires_action' && 
              paymentIntent.next_action?.type === 'boleto_display_details') {
            
            const boletoDisplayDetails = paymentIntent.next_action.boleto_display_details;
            
            barcodeInfo = {
              barcode: boletoDisplayDetails.barcode || barcodeInfo.barcode,
              digitable_line: boletoDisplayDetails.digitable_line || barcodeInfo.digitable_line,
              pdf: boletoDisplayDetails.pdf || barcodeInfo.pdf,
              hosted_voucher_url: boletoDisplayDetails.hosted_voucher_url || barcodeInfo.hosted_voucher_url,
              expires_at: boletoDisplayDetails.expires_at || barcodeInfo.expires_at
            };
          }
        }

        console.log(`[Attempt ${retryAttempt + 1}] Extracted barcodeInfo from Invoice:`, barcodeInfo);

        // Para invoices sem payment_intent, não há barcode info ainda
        const needsRetry = !barcodeInfo.hosted_voucher_url && 
                           paymentIntent && 
                           (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_payment_method');

        if (needsRetry && retryAttempt < MAX_RETRIES) {
          console.log(`⏳ [Attempt ${retryAttempt + 1}] hosted_voucher_url não encontrado e payment_intent status (${paymentIntent.status}) indica processamento. Aguardando ${RETRY_DELAY_MS}ms para nova tentativa...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          return this.getBoletoById(id, retryAttempt + 1);
        }

        // Criar descrição baseada na invoice
        let description = invoice.description;
        if (!description || description.trim() === '') {
          const dueDateObj = new Date(invoice.due_date * 1000);
          const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
          description = `Taxa de condomínio - ${monthNames[dueDateObj.getMonth()]}/${dueDateObj.getFullYear()}`;
        }

        const resultBoleto: BoletoAPI = {
          id: paymentIntent?.id || invoice.id, // Usar payment_intent.id se disponível, senão invoice.id
          description: description,
          dueDate: new Date(invoice.due_date * 1000).toISOString(),
          value: invoice.amount_due || 0,
          status: invoice.status === 'paid' ? 'paid' : 'pending',
          pdfUrl: barcodeInfo.pdf || '',
          paymentUrl: barcodeInfo.hosted_voucher_url || '',
          barcode: barcodeInfo.barcode || '',
          digitable_line: barcodeInfo.digitable_line || '',
          expires_at: barcodeInfo.expires_at,
          created_at: new Date(invoice.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          invoice_id: invoice.id,
          payment_intent_id: paymentIntent?.id || null,
        };
        
        console.log('✅ Final resultBoleto from Invoice:', resultBoleto);
        return resultBoleto;

      } else {
        // Processar dados do Payment Intent (método original)
        const intent = data;
        const paymentMethod = intent.payment_method;
        const boletoData = paymentMethod?.boleto || {};

        console.log(`🔍 [Attempt ${retryAttempt + 1}/${MAX_RETRIES + 1}] Raw Stripe Intent Data:`, {
          id: intent.id,
          amount: intent.amount,
          status: intent.status,
          paymentMethodType: paymentMethod?.type,
          hasNextAction: !!intent.next_action,
          nextActionType: intent.next_action?.type,
          boletoDetails: paymentMethod?.boleto,
          nextActionDetails: intent.next_action?.boleto_display_details
        });

        let barcodeInfo = {
          barcode: boletoData.barcode || intent.next_action?.boleto_display_details?.barcode || '',
          digitable_line: boletoData.digitable_line || intent.next_action?.boleto_display_details?.digitable_line || '',
          pdf: boletoData.pdf || intent.next_action?.boleto_display_details?.pdf || '',
          hosted_voucher_url: boletoData.hosted_voucher_url || intent.next_action?.boleto_display_details?.hosted_voucher_url || '',
          expires_at: boletoData.expires_at || intent.next_action?.boleto_display_details?.expires_at
        };

        console.log(`[Attempt ${retryAttempt + 1}] Extracted barcodeInfo:`, barcodeInfo);

        // Condições para retry: Se não temos hosted_voucher_url E (status é requires_action OU status é requires_payment_method)
        const needsRetry = !barcodeInfo.hosted_voucher_url && 
                           (intent.status === 'requires_action' || intent.status === 'requires_payment_method');

        if (needsRetry && retryAttempt < MAX_RETRIES) {
          console.log(`⏳ [Attempt ${retryAttempt + 1}] hosted_voucher_url não encontrado e status (${intent.status}) indica processamento. Aguardando ${RETRY_DELAY_MS}ms para nova tentativa...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          return this.getBoletoById(id, retryAttempt + 1);
        }

        if (!barcodeInfo.hosted_voucher_url && retryAttempt >= MAX_RETRIES) {
          console.warn(`🔔 [Attempt ${retryAttempt + 1}] Máximo de tentativas atingido. hosted_voucher_url ainda não disponível para PI: ${id}`);
        }

        let description = intent.description;
        if (!description || description === 'Payment for Invoice' || description.includes('Boleto pi_') || description.trim() === '' || description === `Boleto ${intent.id}`) {
          let referenceDate = barcodeInfo.expires_at ? new Date(barcodeInfo.expires_at * 1000) : new Date(intent.created * 1000);
          const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
          description = `Taxa de condomínio - ${monthNames[referenceDate.getMonth()]}/${referenceDate.getFullYear()}`;
        }

        const validatedValue = intent.amount && typeof intent.amount === 'number' && !isNaN(intent.amount) ? intent.amount : 0;
        const validatedDueDate = barcodeInfo.expires_at ? new Date(barcodeInfo.expires_at * 1000).toISOString() : new Date(intent.created * 1000).toISOString();

        const resultBoleto: BoletoAPI = {
          id: intent.id,
          description: description,
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
          payment_intent_id: intent.id,
        };
        
        console.log('✅ Final resultBoleto from Payment Intent:', resultBoleto);
        return resultBoleto;
      }

    } catch (error) {
      console.error(`❌ Error in getBoletoById (Attempt ${retryAttempt + 1}):`, error);
      if (retryAttempt >= MAX_RETRIES || !(error instanceof SyntaxError)) {
          throw error; 
      } else {
          throw error;
      }
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
    paymentUrl?: string;
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
      paymentUrl: boleto.paymentUrl,
    };
  }
}

export const stripeBoletosService = new StripeBoletosService();