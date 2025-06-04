# Integração da API de Boletos

Este documento explica como configurar e usar a integração da API de boletos no aplicativo.

## Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto e adicione as seguintes variáveis:

```bash
# Configurações da API de Boletos
EXPO_PUBLIC_API_BASE_URL=https://api.exemplo.com
EXPO_PUBLIC_API_KEY=sua_chave_da_api_aqui

# Opcional: Especificar o provedor da API
EXPO_PUBLIC_API_PROVIDER=generic  # 'generic' ou 'stripe'
```

### 2. Provedores Suportados

#### API Genérica (Padrão)
```bash
EXPO_PUBLIC_API_BASE_URL=https://sua-api.com/v1
EXPO_PUBLIC_API_KEY=bearer_token_ou_api_key
EXPO_PUBLIC_API_PROVIDER=generic
```

#### Stripe
```bash
EXPO_PUBLIC_STRIPE_SECRET_KEY=sk_test_sua_chave_stripe_aqui
EXPO_PUBLIC_API_PROVIDER=stripe
```

**Nota:** A integração com Stripe usa chamadas diretas à API REST, não requerendo dependências adicionais.

#### PagSeguro (usando API genérica)
```bash
EXPO_PUBLIC_API_BASE_URL=https://api.pagseguro.uol.com.br
EXPO_PUBLIC_API_KEY=sua_chave_pagseguro_aqui
EXPO_PUBLIC_API_PROVIDER=generic
```

### 3. Seleção Automática do Provedor

O aplicativo seleciona automaticamente o provedor baseado nas variáveis de ambiente:

1. Se `EXPO_PUBLIC_API_PROVIDER=stripe` ou se `EXPO_PUBLIC_STRIPE_SECRET_KEY` estiver definida, usa Stripe
2. Caso contrário, usa a API genérica

## Estrutura da API

### Endpoints Esperados (API Genérica)

#### 1. Listar Boletos
```
GET /boletos?status=all&page=1&limit=50&start_date=2023-01-01&end_date=2023-12-31
```

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "description": "Taxa de condomínio - Janeiro/2023",
      "dueDate": "2023-01-10T00:00:00Z",
      "value": 45000,
      "status": "paid",
      "pdfUrl": "https://exemplo.com/boleto1.pdf",
      "paymentUrl": "https://exemplo.com/pagar/1",
      "barcode": "12345678901234567890123456789012345678901234567890",
      "digitable_line": "12345.67890 12345.678901 23456.789012 3 45678901234567890",
      "expires_at": 1673308800,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-10T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 50
}
```

#### 2. Buscar Boleto por ID
```
GET /boletos/{id}
```

**Response:**
```json
{
  "id": "1",
  "description": "Taxa de condomínio - Janeiro/2023",
  "dueDate": "2023-01-10T00:00:00Z",
  "value": 45000,
  "status": "paid",
  "pdfUrl": "https://exemplo.com/boleto1.pdf",
  "paymentUrl": "https://exemplo.com/pagar/1",
  "barcode": "12345678901234567890123456789012345678901234567890",
  "digitable_line": "12345.67890 12345.678901 23456.789012 3 45678901234567890",
  "expires_at": 1673308800,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-10T00:00:00Z"
}
```

#### 3. Criar Boleto
```
POST /boletos
```

**Request Body:**
```json
{
  "description": "Taxa de condomínio - Janeiro/2023",
  "value": 45000,
  "dueDate": "2023-01-10T00:00:00Z",
  "customerInfo": {
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "document": "12345678901"
  }
}
```

## Autenticação

### API Genérica
A API usa autenticação via Bearer Token no header:

```
Authorization: Bearer sua_chave_da_api_aqui
```

### Stripe
O Stripe usa a chave secreta diretamente na inicialização do SDK.

## Status dos Boletos

- `pending`: Boleto pendente de pagamento
- `paid`: Boleto pago

## Valores

Os valores são enviados em centavos. Por exemplo:
- R$ 450,00 = 45000 centavos
- R$ 1.250,50 = 125050 centavos

## Tratamento de Erros

O sistema exibe mensagens de erro adequadas quando não é possível conectar com a API. Em caso de falha, será mostrado um estado vazio com opção de tentar novamente via pull-to-refresh.

### Códigos de Erro Comuns

- `401`: Token inválido ou expirado
- `403`: Acesso negado
- `404`: Boleto não encontrado
- `500`: Erro interno do servidor

## Exemplos de Configuração

### Exemplo 1: Usando Stripe
```bash
# .env
EXPO_PUBLIC_STRIPE_SECRET_KEY=sk_test_51H...
EXPO_PUBLIC_API_PROVIDER=stripe
```

### Exemplo 2: Usando API Personalizada
```bash
# .env
EXPO_PUBLIC_API_BASE_URL=https://minha-api.com/v1
EXPO_PUBLIC_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_API_PROVIDER=generic
```

### Exemplo 3: Auto-detecção (Stripe com fallback)
```bash
# .env
EXPO_PUBLIC_STRIPE_SECRET_KEY=sk_test_51H...
# EXPO_PUBLIC_API_PROVIDER não definido = usa Stripe automaticamente
```

## Implementação com Stripe

Quando usar Stripe, certifique-se de:

1. **Instalar a dependência:**
   ```bash
   npm install stripe
   ```

2. **Configurar corretamente:**
   ```bash
   EXPO_PUBLIC_STRIPE_SECRET_KEY=sk_test_sua_chave_stripe
   ```

3. **Os Payment Intents devem ter:**
   - `payment_method_types: ['boleto']`
   - Configuração para o mercado brasileiro

### Testando a API do Stripe Diretamente

Para verificar se sua integração Stripe está funcionando, você pode testar diretamente via curl seguindo a [documentação oficial](https://docs.stripe.com/api/payment_intents/list):

```bash
# Listar todos os Payment Intents (básico)
curl -G https://api.stripe.com/v1/payment_intents \
  -u sk_test_SUA_CHAVE_DE_API: \
  -d limit=10

# Com expansão do payment_method (recomendado para ter dados do boleto)
curl -G https://api.stripe.com/v1/payment_intents \
  -u sk_test_SUA_CHAVE_DE_API: \
  -d limit=10 \
  -d "expand[]=data.payment_method"

# Com paginação usando starting_after
curl -G https://api.stripe.com/v1/payment_intents \
  -u sk_test_SUA_CHAVE_DE_API: \
  -d limit=10 \
  -d starting_after=pi_ULTIMO_ID \
  -d "expand[]=data.payment_method"

# Filtrar por customer específico
curl -G https://api.stripe.com/v1/payment_intents \
  -u sk_test_SUA_CHAVE_DE_API: \
  -d customer=cus_CUSTOMER_ID \
  -d "expand[]=data.payment_method"
```

**Nota importante:** A API do Stripe não permite filtrar diretamente por `payment_method_types` na listagem. A filtragem por boletos é feita no lado da aplicação após receber todos os Payment Intents.

### Estrutura de Response do Stripe

Baseado na [documentação oficial](https://docs.stripe.com/api/payment_intents/list):

```json
{
  "object": "list",
  "url": "/v1/payment_intents",
  "has_more": false,
  "data": [
    {
      "id": "pi_3MtwBwLkdIwHu7ix28a3tqPa",
      "object": "payment_intent",
      "amount": 45000,
      "amount_capturable": 0,
      "amount_received": 0,
      "created": 1680800504,
      "currency": "brl",
      "status": "requires_payment_method",
      "description": "Taxa de condomínio",
      "payment_method_types": [
        "boleto"
      ],
      "payment_method": {
        "id": "pm_1234567890",
        "object": "payment_method",
        "type": "boleto",
        "boleto": {
          "barcode": "12345678901234567890123456789012345678901234567890",
          "digitable_line": "12345.67890 12345.678901 23456.789012 3 45678901234567890",
          "expires_at": 1673308800,
          "pdf": "https://files.stripe.com/links/boleto.pdf",
          "hosted_voucher_url": "https://payments.stripe.com/boleto/voucher/test_..."
        }
      }
    }
  ]
}
```

### Parâmetros Suportados

Conforme a documentação oficial, você pode usar:

- **`customer`**: Filtrar por ID do customer
- **`limit`**: Número de itens retornados (padrão: 10)
- **`starting_after`**: ID do último item para paginação
- **`ending_before`**: ID do primeiro item para paginação reversa
- **`created`**: Filtros por data de criação
- **`expand`**: Expandir objetos relacionados (ex: `data.payment_method`)

## Testes

Para testar a integração:

1. **Com dados reais:** Configure as variáveis de ambiente corretamente
2. **Com dados mockados:** O sistema automaticamente usa dados de exemplo em caso de erro na API
3. **Alternando provedores:** Mude a variável `EXPO_PUBLIC_API_PROVIDER` e reinicie o app

## Funcionalidades Implementadas

✅ **Listagem de boletos** com filtros por status e período  
✅ **Refresh manual** (puxar para atualizar)  
✅ **Tratamento de erros** com mensagens amigáveis  
✅ **Suporte a múltiplos provedores** (Stripe, API genérica)  
✅ **Estados vazios informativos** quando não há dados  
✅ **Interface responsiva** com indicadores de carregamento

## Próximos Passos

- [ ] Implementar criação de novos boletos
- [ ] Adicionar notificações push para vencimentos
- [ ] Implementar pagamento direto pelo app
- [ ] Adicionar histórico detalhado de transações
- [ ] Implementar exportação de relatórios

## Suporte

Em caso de dúvidas sobre a integração, consulte a documentação da sua API de boletos ou entre em contato com o suporte técnico.

## ⚠️ **Filtro por Usuário (CPF)**

**IMPORTANTE:** Os boletos são automaticamente filtrados pelo usuário logado:

- 🔸 **Stripe**: Busca/cria Customer baseado no CPF ou email do usuário
- 🔸 **API Genérica**: Filtra por `customer_cpf`, `customer_email` ou `customer_id`
- 🔸 **Banner Informativo**: Mostra para qual CPF/email os boletos estão sendo exibidos

### Como Funciona o Filtro:

1. **Usuário logado tem CPF** → Filtra por `customer_cpf=12345678901`
2. **Usuário sem CPF, mas com email** → Filtra por `customer_email=user@exemplo.com`
3. **Fallback** → Usa `customer_id=user_id` como último recurso

### Logs de Debug:
```
🔍 Debug User Info:
User ID: abc123
User CPF: 12345678901
User Email: user@exemplo.com

📊 Boletos encontrados para usuário 12345678901: 5
``` 