# Guia de Teste da Integração da API de Boletos

Este documento fornece instruções para testar a integração da API de boletos.

## Pré-requisitos

1. Configurar as variáveis de ambiente no arquivo `.env`
2. Reiniciar o aplicativo após mudanças na configuração

## Cenários de Teste

### 1. Teste com API Real

#### Configuração
```bash
# .env
EXPO_PUBLIC_API_BASE_URL=https://sua-api.com/v1
EXPO_PUBLIC_API_KEY=sua_chave_aqui
EXPO_PUBLIC_API_PROVIDER=generic
```

#### Checklist
- [ ] Os boletos são carregados da API real
- [ ] Não há aviso de "dados de exemplo" na tela
- [ ] Filtros funcionam corretamente
- [ ] Pull-to-refresh atualiza os dados
- [ ] Links de pagamento abrem corretamente

### 2. Teste com Stripe

#### Configuração
```bash
# .env
EXPO_PUBLIC_STRIPE_SECRET_KEY=sk_test_...
EXPO_PUBLIC_API_PROVIDER=stripe
```

#### Pré-requisitos
```bash
npm install stripe
```

#### Checklist
- [ ] Payment Intents com boleto são listados
- [ ] Status 'succeeded' aparece como 'Pago'
- [ ] Status 'pending' aparece como 'Pendente'
- [ ] PDFs e URLs de pagamento funcionam
- [ ] Dados são formatados corretamente em reais

### 3. Teste de Erro de API

#### Configuração
```bash
# .env (API inválida propositalmente)
EXPO_PUBLIC_API_BASE_URL=https://api-inexistente.com
EXPO_PUBLIC_API_KEY=chave_invalida
```

#### Checklist
- [ ] Aviso de erro aparece no topo da tela
- [ ] Mensagem: "⚠️ Não foi possível carregar os boletos. Verifique sua conexão e tente novamente."
- [ ] Estado vazio é exibido com título "Erro ao carregar boletos"
- [ ] Descrição sugere "Puxe para baixo para tentar novamente"
- [ ] Pull-to-refresh permite tentar novamente
- [ ] Aplicativo não trava ou fica em loading infinito

### 4. Teste dos Filtros

#### Testando Filtros de Status
1. **Todos**: Deve mostrar boletos pagos e pendentes
2. **Pendentes**: Apenas boletos com status 'pending'
3. **Pagos**: Apenas boletos com status 'paid'

#### Testando Filtros de Período
1. **Todos**: Todos os boletos independente da data
2. **Mês atual**: Apenas boletos do mês atual
3. **Ano atual**: Apenas boletos do ano atual
4. **Meses anteriores**: Boletos de meses/anos anteriores

### 5. Teste de UX

#### Carregamento
- [ ] Spinner aparece durante carregamento inicial
- [ ] Texto "Carregando boletos..." é exibido
- [ ] Pull-to-refresh funciona suavemente

#### Estados Vazios
- [ ] Mensagem apropriada quando não há boletos
- [ ] Ícone e texto explicativo aparecem
- [ ] Pull-to-refresh funciona mesmo no estado vazio

#### Erros de Rede
- [ ] Timeout de rede mostra mensagem de erro
- [ ] Falha de conectividade ativa fallback
- [ ] Usuário pode tentar novamente via pull-to-refresh

## Logs de Debug

### Habilitando Logs
No console do desenvolvedor, procure por:

```
// Sucesso da API
"Boletos carregados com sucesso: X itens"

// Erro da API
"Erro ao carregar boletos: [detalhe do erro]"

// Stripe específico
"Erro ao buscar boletos do Stripe: [detalhe]"
```

### Verificando Requisições de Rede
1. Abra as ferramentas de desenvolvedor
2. Vá para a aba "Network"
3. Atualize os boletos
4. Verifique se as requisições estão sendo feitas corretamente

## Problemas Comuns

### 1. "Stripe não está instalado"
**Solução:** 
```bash
npm install stripe
```

### 2. "API não configurada"
**Causa:** Variáveis de ambiente não definidas  
**Solução:** Verificar arquivo `.env` e reiniciar o app

### 3. "CORS Error" (Web)
**Causa:** API não configurada para aceitar requisições do domínio  
**Solução:** Configurar CORS na API ou usar proxy

### 4. Lista vazia mesmo com API funcionando
**Causa:** API retornando formato diferente do esperado ou dados vazios  
**Solução:** Verificar estrutura da resposta da API e logs do console

### 5. Formatação incorreta de valores
**Causa:** API retornando valores em formato diferente do esperado  
**Solução:** Verificar se valores estão em centavos

## Exemplo de Response da API

### Formato Esperado
```json
{
  "data": [
    {
      "id": "bol_123",
      "description": "Taxa de condomínio - Janeiro/2024",
      "dueDate": "2024-01-15T00:00:00Z",
      "value": 45000,
      "status": "pending",
      "pdfUrl": "https://exemplo.com/boleto.pdf",
      "paymentUrl": "https://exemplo.com/pagar/123"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

### Verificando Formato Real
Use ferramentas como Postman ou curl para testar a API:

```bash
curl -H "Authorization: Bearer sua_chave" \
     https://sua-api.com/v1/boletos
```

## Checklist Final

Antes de considerar a integração como concluída:

- [ ] ✅ API real carrega dados corretamente
- [ ] ✅ Tratamento de erro funciona adequadamente
- [ ] ✅ Todos os filtros funcionam
- [ ] ✅ Interface responde bem ao carregamento
- [ ] ✅ Links de pagamento abrem
- [ ] ✅ Pull-to-refresh atualiza dados
- [ ] ✅ Não há crashes ou travamentos
- [ ] ✅ Logs de erro são informativos
- [ ] ✅ Performance é adequada (< 3s para carregar)
- [ ] ✅ Estados vazios são informativos

## Próximas Etapas

Após confirmar que a integração básica está funcionando:

1. **Implementar notificações** para boletos próximos do vencimento
2. **Adicionar cache local** para melhor performance offline
3. **Implementar paginação** para grandes volumes de dados
4. **Adicionar métricas** para monitoramento da API
5. **Criar testes automatizados** para regressão

## Suporte

Para problemas específicos da integração:

1. Verificar logs do console
2. Testar API diretamente (Postman/curl)
3. Consultar documentação da API específica
4. Verificar conectividade de rede
5. Confirmar configuração das variáveis de ambiente 

## 🚀 Setup Rápido

### 1. **Instalação das Dependências**
```bash
# As dependências já estão incluídas no projeto
# Não é necessário instalar bibliotecas adicionais
``` 