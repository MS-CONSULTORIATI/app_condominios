// services/boletos-api.ts
export interface BoletoAPI {
  id: string;
  description: string;
  dueDate: string;
  value: number; // Valor em centavos
  status: 'paid' | 'pending';
  pdfUrl?: string;
  paymentUrl?: string;
  barcode?: string;
  digitable_line?: string;
  expires_at?: number;
  created_at?: string;
  updated_at?: string;
  // Campos adicionais para tracking de invoices
  invoice_id?: string;
  payment_intent_id?: string | null;
}

export interface BoletoResponse {
  data: BoletoAPI[];
  total: number;
  page: number;
  limit: number;
}

class BoletosApiService {
  private baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.stripe.com/v1';
  private apiKey = process.env.EXPO_PUBLIC_API_KEY || '';

  async fetchBoletos(params?: {
    status?: 'paid' | 'pending' | 'all';
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    customer?: string; // CPF, email ou ID do usuário
  }): Promise<BoletoResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.status && params.status !== 'all') {
        queryParams.append('status', params.status);
      }
      if (params?.page) {
        queryParams.append('page', params.page.toString());
      }
      if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params?.startDate) {
        queryParams.append('start_date', params.startDate);
      }
      if (params?.endDate) {
        queryParams.append('end_date', params.endDate);
      }
      
      // Filtro por customer (CPF, email ou ID)
      if (params?.customer) {
        // Determinar o tipo de identificador e usar o parâmetro apropriado
        const customerInfo = params.customer;
        
        if (customerInfo.includes('@')) {
          // É um email
          queryParams.append('customer_email', customerInfo);
          console.log(`🔍 Filtrando boletos para email: ${customerInfo}`);
        } else if (customerInfo.length === 11 && /^\d+$/.test(customerInfo)) {
          // É um CPF (11 dígitos numéricos)
          queryParams.append('customer_cpf', customerInfo);
          console.log(`🔍 Filtrando boletos para CPF: ${customerInfo}`);
        } else {
          // Assume que é um ID genérico
          queryParams.append('customer_id', customerInfo);
          console.log(`🔍 Filtrando boletos para customer ID: ${customerInfo}`);
        }
      }

      const url = `${this.baseUrl}/boletos?${queryParams.toString()}`;
      
      console.log(`📡 Chamando API: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📊 Total de boletos retornados pela API: ${data.data?.length || 0}`);
      
      return data;
    } catch (error) {
      console.error('Erro ao buscar boletos:', error);
      throw error;
    }
  }

  async getBoletoById(id: string): Promise<BoletoAPI> {
    try {
      const response = await fetch(`${this.baseUrl}/boletos/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar boleto:', error);
      throw error;
    }
  }

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
    try {
      const response = await fetch(`${this.baseUrl}/boletos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao criar boleto:', error);
      throw error;
    }
  }

  // Método para formatar dados da API para o formato usado no componente
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
    
    return {
      id: boleto.id,
      description: boleto.description,
      dueDate: formattedDate,
      value: `R$ ${(boleto.value / 100).toFixed(2).replace('.', ',')}`,
      status: boleto.status,
      pdfUrl: boleto.pdfUrl || boleto.paymentUrl || '',
      month,
      year,
    };
  }
}

export const boletosApiService = new BoletosApiService(); 