import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
  Modal,
  Dimensions
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { FilePlus, FileText, ExternalLink, ArrowLeft, Filter, Check, Clock, DollarSign, Calendar, X, CheckCircle, Download, Eye } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { WebView } from 'react-native-webview';
import EmptyState from '@/components/EmptyState';
import { boletosApiService } from '@/services/boletos-api';
import { stripeBoletosService } from '@/services/stripe-boletos';

// Interface para o boleto formatado para exibição
interface Boleto {
  id: string;
  description: string;
  dueDate: string;
  value: string;
  status: 'paid' | 'pending';
  pdfUrl: string;
  month: string;
  year: string;
  paymentUrl?: string;
}

type FilterTab = 'all' | 'pending' | 'paid';
type PeriodFilter = 'all' | 'current-month' | 'current-year' | 'previous-months';

export default function BoletosScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [filteredBoletos, setFilteredBoletos] = useState<Boleto[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComprovanteModal, setShowComprovanteModal] = useState(false);
  const [selectedBoleto, setSelectedBoleto] = useState<Boleto | null>(null);
  const [showBoletoModal, setShowBoletoModal] = useState(false);
  const [generatedBoleto, setGeneratedBoleto] = useState<any>(null);
  const [generatingBoleto, setGeneratingBoleto] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Determinar qual serviço usar baseado nas variáveis de ambiente
  const getApiService = () => {
    const stripeKey = process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY;
    const apiProvider = process.env.EXPO_PUBLIC_API_PROVIDER;
    
    if (apiProvider === 'stripe' || (stripeKey && !apiProvider)) {
      return stripeBoletosService;
    }
    return boletosApiService;
  };

  // Função para carregar os boletos da API
  useEffect(() => {
    loadBoletos();
  }, []);

  // Efeito para aplicar os filtros quando boletos, aba ativa ou filtro de período mudar
  useEffect(() => {
    applyFilters();
  }, [boletos, activeTab, periodFilter]);

  // Efeito para lidar com deep links de retorno do Stripe Checkout
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      console.log('🔗 Deep link recebido:', event.url);
      const url = event.url;

      // Exemplo: seuapp://checkout/success?session_id=cs_test_XXXXX
      if (url.includes('checkout/success') && url.includes('session_id=')) {
        const sessionId = url.split('session_id=')[1]?.split('&')[0]; // Extrai o session_id
        
        if (sessionId) {
          console.log('🆔 Checkout Session ID extraído:', sessionId);
          // setCheckoutSessionIdForProcessing(sessionId); // Guardar para processamento
          Alert.alert(
            'Processando Boleto...',
            'Seu boleto está sendo finalizado. Aguarde um momento.'
          );
          setGeneratingBoleto(true); // Mostrar indicador de carregamento

          try {
            // 1. Chamar um endpoint no SEU BACKEND para buscar a Checkout Session do Stripe
            //    e obter o payment_intent_id.
            //    Este endpoint de backend chamaria: GET https://api.stripe.com/v1/checkout/sessions/{SESSION_ID}
            //    Alternativamente, se o seu backend já armazena essa relação, pode buscar direto.
            
            // **** INÍCIO DA SIMULAÇÃO/PLACEHOLDER para obtenção do Payment Intent ID ****
            // Na sua implementação real, você chamaria seu backend aqui para obter o paymentIntentId.
            // Exemplo: const paymentIntentId = await getApiService().getPaymentIntentIdFromCheckoutSession(sessionId);
            const mockPaymentIntentId = `simulated_pi_for_${sessionId}`;
            console.log('⚠️ Usando Payment Intent ID simulado para buscar detalhes:', mockPaymentIntentId);
            // **** FIM DA SIMULAÇÃO/PLACEHOLDER ****

            // Uma vez que você tenha o paymentIntentId (real ou simulado):
            const boletoCompleto = await getApiService().getBoletoById(mockPaymentIntentId, 0);
            debugBoletoData(boletoCompleto, 'DeepLink Success -> getBoletoById');

            if (boletoCompleto && boletoCompleto.id) {
              setGeneratedBoleto(boletoCompleto);
              setShowBoletoModal(true); // Abrir o modal com opções de visualizar/baixar
            } else {
              console.error('Boleto não encontrado ou detalhes incompletos após deep link para paymentIntentId:', mockPaymentIntentId);
              Alert.alert('Erro', 'Não foi possível carregar os detalhes completos do boleto após o pagamento.');
            }
            
            await loadBoletos(); // Recarregar a lista para mostrar o novo boleto ou status atualizado

          } catch (error) {
            console.error('Erro ao processar retorno do Stripe Checkout:', error);
            Alert.alert('Erro', 'Não foi possível finalizar o processamento do boleto.');
          } finally {
            setGeneratingBoleto(false);
          }
        }
      } else if (url.includes('checkout/cancel')) {
        console.log('🚫 Checkout cancelado pelo usuário.');
        Alert.alert('Cancelado', 'A geração do boleto foi cancelada.');
      }
    };

    // Adicionar listener para deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Verificar se o app foi aberto por um deep link inicial
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []); // Executar apenas uma vez na montagem do componente

  const applyFilters = () => {
    let filtered = [...boletos];
    
    // Filtro por status (aba)
    if (activeTab === 'pending') {
      filtered = filtered.filter(boleto => boleto.status === 'pending');
    } else if (activeTab === 'paid') {
      filtered = filtered.filter(boleto => boleto.status === 'paid');
    }
    
    // Filtro por período
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    if (periodFilter === 'current-month') {
      filtered = filtered.filter(boleto => {
        const [month, year] = getMonthYearFromBoleto(boleto);
        return month === currentMonth && year === currentYear;
      });
    } else if (periodFilter === 'current-year') {
      filtered = filtered.filter(boleto => {
        const [, year] = getMonthYearFromBoleto(boleto);
        return year === currentYear;
      });
    } else if (periodFilter === 'previous-months') {
      filtered = filtered.filter(boleto => {
        const [month, year] = getMonthYearFromBoleto(boleto);
        return (year < currentYear) || (year === currentYear && month < currentMonth);
      });
    }
    
    // Ordenar por data de vencimento (mais recente primeiro)
    filtered.sort((a, b) => {
      // Converter datas no formato DD/MM/YYYY para objetos Date
      const [dayA, monthA, yearA] = a.dueDate.split('/').map(Number);
      const [dayB, monthB, yearB] = b.dueDate.split('/').map(Number);
      
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      
      return dateB.getTime() - dateA.getTime();
    });
    
    setFilteredBoletos(filtered);
  };
  
  // Função auxiliar para extrair mês e ano do boleto
  const getMonthYearFromBoleto = (boleto: Boleto): [number, number] => {
    // Extrair de dueDate no formato DD/MM/YYYY
    const [day, month, year] = boleto.dueDate.split('/').map(Number);
    return [month, year];
  };

  const loadBoletos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se o usuário está logado e tem CPF
      if (!user) {
        setError('Usuário não autenticado.');
        setLoading(false);
        return;
      }

      // Log de debug para verificar dados do usuário
      console.log('🔍 Debug User Info:');
      console.log('User ID:', user.id);
      console.log('User CPF:', user.cpf);
      console.log('User Email:', user.email);
      
      // Chamada real à API
      const response = await getApiService().fetchBoletos({
        status: 'all', // Buscar todos os boletos (pagos e pendentes)
        limit: 100, // Buscar até 100 boletos
        userEmail: user.email,
        userName: user.name,
      });
      
      // Formatar os dados da API para o formato usado no componente
      const formattedBoletos = response.data.map(boleto => 
        getApiService().formatBoletoForDisplay(boleto)
      );

      // Log de debug para verificar quantos boletos foram retornados
      console.log(`📊 Boletos encontrados para usuário ${user.cpf || user.email}: ${formattedBoletos.length}`);
      
      setBoletos(formattedBoletos);
      setLoading(false);
      setRefreshing(false);
      
    } catch (error) {
      console.error('Erro ao carregar boletos:', error);
      setError('Não foi possível carregar os boletos. Verifique sua conexão e tente novamente.');
      
      // Limpar a lista de boletos em caso de erro
      setBoletos([]);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPeriodFilter('all');
    setActiveTab('all');
    loadBoletos();
  };

  // Função para debugar dados do boleto
  const debugBoletoData = (boleto: any, source: string) => {
    console.log(`🔍 Debug ${source}:`, {
      id: boleto.id,
      description: boleto.description,
      value: boleto.value,
      valueType: typeof boleto.value,
      dueDate: boleto.dueDate,
      dueDateType: typeof boleto.dueDate,
      barcode: boleto.barcode || 'N/A',
      digitable_line: boleto.digitable_line || 'N/A',
      pdfUrl: boleto.pdfUrl || 'N/A',
      paymentUrl: boleto.paymentUrl || 'N/A',
      status: boleto.status,
      created_at: boleto.created_at,
      expires_at: boleto.expires_at
    });
  };

  const handleBoletoPress = async (boleto: Boleto) => {
    if (boleto.status === 'paid') {
      setSelectedBoleto(boleto);
      setShowComprovanteModal(true);
    } else { // Boleto pendente - sempre tentar visualizar detalhes existentes
      console.log(`[handleBoletoPress] Boleto ID: ${boleto.id}, Status: ${boleto.status}`);
      console.log(`  ├─ Details: pdfUrl: ${!!boleto.pdfUrl}, paymentUrl: ${!!boleto.paymentUrl}`);
      console.log(`  └─ Action: Tentando visualizar detalhes da fatura/boleto existente.`);

      setGeneratingBoleto(true);
      try {
        const boletoCompleto = await getApiService().getBoletoById(boleto.id, 0);
        debugBoletoData(boletoCompleto, 'handleBoletoPress (view existing) -> getBoletoById');

        if (boletoCompleto.paymentUrl && typeof boletoCompleto.paymentUrl === 'string' && boletoCompleto.paymentUrl.trim() !== '') {
          console.log('        -> Priorizando WebView para paymentUrl:', boletoCompleto.paymentUrl);
          openBoletoInWebView(boletoCompleto.paymentUrl);
        } else {
          console.log('        -> paymentUrl não encontrado/válido. Mostrando modal customizado. paymentUrl:', boletoCompleto.paymentUrl);
          setGeneratedBoleto(boletoCompleto);
          setShowBoletoModal(true);
        }
      } catch (error) {
        console.error('Erro em handleBoletoPress ao processar boleto pendente:', error);
        Alert.alert(
          'Erro ao Processar Boleto',
          'Não foi possível carregar os detalhes do boleto. Tente novamente.',
          [{ text: 'OK' }]
        );
        // Em caso de erro, ainda mostrar o modal com os dados básicos
        setGeneratedBoleto(boleto); 
        setShowBoletoModal(true);
      } finally {
        setGeneratingBoleto(false);
      }
    }
  };

  const generateBoleto = async (boletoInfo: Boleto) => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    setGeneratingBoleto(true);
    try {
      // Extrair valor numérico do string formatado (R$ 450,00 → 45000)
      let valueString = boletoInfo.value
        .replace('R$', '')
        .trim()
        .replace(/\./g, '') 
        .replace(',', '.'); 
      
      const valueInReais = parseFloat(valueString);
      const valueInCents = Math.round(valueInReais * 100); 

      // Converter data para ISO string (ainda pode ser útil para descrição)
      const [day, month, year] = boletoInfo.dueDate.split('/').map(Number);
      const dueDateObject = new Date(year, month - 1, day);

      let description = boletoInfo.description;
      if (!description || 
          description === 'Payment for Invoice' || 
          description.includes('Boleto pi_') ||
          description.trim() === '') {
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const monthName = monthNames[dueDateObject.getMonth()];
        description = `Taxa de condomínio - ${monthName}/${dueDateObject.getFullYear()}`;
      }

      console.log('🔄 Iniciando geração de boleto via Stripe Checkout Session:', {
        description,
        valueInCents,
        customerEmail: user.email,
        customerName: user.name,
        customerDocument: user.cpf, 
      });

      if (isNaN(valueInCents) || valueInCents <= 0) {
        throw new Error(`Valor inválido: ${boletoInfo.value} → ${valueInCents} centavos`);
      }
      if (!user.cpf) {
        Alert.alert('CPF Necessário', 'O CPF do usuário é necessário para gerar boletos.');
        throw new Error('CPF do usuário não encontrado.');
      }

      // Chamar o backend para criar a Checkout Session
      const service = getApiService();
      let checkoutSessionUrl: string | null = null;

      // Usar um type guard manual verificando a existência do método
      // REMOVIDO: Funcionalidade de checkout não é mais necessária
      // if (typeof (service as StripeBoletosService).requestBoletoCheckoutSession === 'function') {
      //   const stripeService = service as StripeBoletosService;
      //   const sessionResponse = await stripeService.requestBoletoCheckoutSession({
      //     description: description,
      //     value: valueInCents,
      //     customerEmail: user.email || '',
      //     customerName: user.name || '',
      //     customerDocument: user.cpf, // CPF/CNPJ é crucial aqui
      //   });
      //   checkoutSessionUrl = sessionResponse.checkoutSessionUrl;
      // } else {
        // Lidar com o caso em que o serviço não é Stripe ou não suporta este método
        console.error('Serviço de boletos configurado não suporta Stripe Checkout Sessions, ou o método requestBoletoCheckoutSession não foi encontrado.');
        throw new Error('A geração de boletos via Stripe Checkout não é suportada pelo provedor de API atual ou o método necessário não está disponível.');
      // }

      // Redirecionar para a URL do Stripe Checkout
      if (checkoutSessionUrl) {
        console.log('🌐 Redirecionando para Stripe Checkout:', checkoutSessionUrl);
        const supported = await Linking.canOpenURL(checkoutSessionUrl);
        if (supported) {
          await Linking.openURL(checkoutSessionUrl);
          // O fluxo continuará quando o usuário for redirecionado de volta para o app via deep link (success_url)
          // Você precisará de um listener para esse deep link (ver Passo C)
        } else {
          Alert.alert('Erro', `Não foi possível abrir a URL: ${checkoutSessionUrl}`);
        }
      } else {
        throw new Error('URL do Checkout não recebida do backend.');
      }

      // Não vamos mais chamar loadBoletos() ou setShowBoletoModal(true) aqui diretamente.
      // Isso será tratado após o retorno do deep link.

    } catch (e) {
      console.error('Erro ao iniciar geração de boleto via Checkout:', e);
      let errorMessage = 'Ocorreu um erro desconhecido.';
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      Alert.alert(
        'Erro ao Gerar Boleto',
        `Não foi possível iniciar o processo de geração do boleto. Verifique sua conexão e tente novamente. Detalhe: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingBoleto(false);
    }
  };

  const handleCloseComprovante = () => {
    setShowComprovanteModal(false);
    setSelectedBoleto(null);
  };

  const handleCloseBoletoModal = () => {
    setShowBoletoModal(false);
    setGeneratedBoleto(null);
  };

  const handleBackPress = () => {
    router.back();
  };

  // Função para baixar PDF do boleto
  const downloadBoleto = async (boletoData: any) => {
    if (!boletoData.pdfUrl) {
      Alert.alert('Erro', 'URL do PDF não disponível');
      return;
    }

    try {
      setDownloading(true);
      
      // Solicitar permissões para salvar na galeria
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'É necessário permitir acesso à galeria para salvar o boleto.');
        setDownloading(false);
        return;
      }

      // Baixar o arquivo
      const fileName = `boleto_${boletoData.id}_${new Date().getTime()}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      const downloadResult = await FileSystem.downloadAsync(boletoData.pdfUrl, fileUri);
      
      if (downloadResult.status === 200) {
        // Salvar na galeria
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync('Boletos', asset, false);
        
        Alert.alert(
          'Download Concluído',
          'O boleto foi salvo na sua galeria na pasta "Boletos".',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Falha no download');
      }
      
      setDownloading(false);
    } catch (error) {
      console.error('Erro ao baixar boleto:', error);
      setDownloading(false);
      Alert.alert(
        'Erro no Download',
        'Não foi possível baixar o boleto. Tente novamente.',
        [{ text: 'OK' }]
      );
    }
  };

  // Função para abrir boleto em WebView
  const openBoletoInWebView = (url: string) => {
    setWebViewUrl(url);
    setShowWebView(true);
  };

  // Função para fechar WebView
  const closeWebView = () => {
    setShowWebView(false);
    setWebViewUrl('');
  };

  const renderBoletoCard = ({ item: boleto }: { item: Boleto }) => {
    const isPastDue = () => {
      if (boleto.status === 'pending') {
        const [day, month, year] = boleto.dueDate.split('/').map(Number);
        const dueDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate < today;
      }
      return false;
    };
    
    const isPaid = boleto.status === 'paid';
    const isOverdueStatus = isPastDue();
    const idIsString = typeof boleto.id === 'string';
    const idStartsWithInv = idIsString && boleto.id.startsWith('in_'); // Invoice ID
    const idStartsWithPi = idIsString && boleto.id.startsWith('pi_'); // Payment Intent ID
    const hasExistingDetails = !!boleto.pdfUrl || !!boleto.paymentUrl || idStartsWithPi || idStartsWithInv;

    // Determinar o texto do botão principal
    let buttonText = '';
    if (isPaid) {
      buttonText = 'Ver comprovante';
    } else if (generatingBoleto) {
      buttonText = 'Carregando...';
    } else {
      buttonText = 'Ver boleto'; // Sempre "Ver boleto" para pendentes, pois são faturas já criadas
    }

    // Logs de depuração
    if (boleto && boleto.id && typeof boleto.description === 'string') {
      console.log(`[renderBoletoCard] Boleto ID: ${boleto.id}, Desc: ${boleto.description.substring(0,30)}, Status: ${boleto.status}`);
      console.log(`  ├─ Details: pdfUrl: ${!!boleto.pdfUrl}, paymentUrl: ${!!boleto.paymentUrl}, idIsString: ${idIsString}, idStartsWithPi: ${idStartsWithPi}, idStartsWithInv: ${idStartsWithInv}`);
      console.log(`  ├─ State: isPaid: ${isPaid}, generatingBoleto (screen): ${generatingBoleto}, isOverdue: ${isOverdueStatus}`);
      console.log(`  └─ Decision: hasExistingDetails: ${hasExistingDetails} -> Button text: "${buttonText}"`);
    }
    
    return (
      <TouchableOpacity 
        style={[
          styles.card,
          isPaid ? styles.paidCard : 
          isOverdueStatus ? styles.overdueCard : styles.pendingCard
        ]}
        onPress={() => handleBoletoPress(boleto)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <FileText size={24} color={isPaid ? Colors.success : isOverdueStatus ? Colors.error : Colors.primary} />
            <Text style={styles.cardTitle}>{boleto.description}</Text>
          </View>
          <View style={[
            styles.statusContainer,
            isPaid ? styles.paidStatusContainer : 
            isOverdueStatus ? styles.overdueStatusContainer : styles.pendingStatusContainer
          ]}>
            <Text style={[
              styles.statusText, 
              isPaid ? styles.paidStatus : 
              isOverdueStatus ? styles.overdueStatus : styles.pendingStatus
            ]}>
              {isPaid ? 'Pago' : isOverdueStatus ? 'Vencido' : 'Pendente'}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardDetailsContainer}>
          <View style={styles.cardDetails}>
            <Calendar size={16} color={Colors.gray[500]} style={styles.detailIcon} />
            <Text style={styles.cardDetailLabel}>Vencimento:</Text>
            <Text style={[
              styles.cardDetailValue,
              isOverdueStatus && styles.overdueText
            ]}>{boleto.dueDate}</Text>
          </View>
          
          <View style={styles.cardDetails}>
            <DollarSign size={16} color={Colors.gray[500]} style={styles.detailIcon} />
            <Text style={styles.cardDetailLabel}>Valor:</Text>
            <Text style={styles.cardDetailValue}>{boleto.value}</Text>
          </View>
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[
              styles.cardAction,
              isPaid ? styles.paidCardAction : 
              isOverdueStatus ? styles.overdueCardAction : styles.pendingCardAction,
              generatingBoleto && styles.disabledCardAction
            ]}
            onPress={() => handleBoletoPress(boleto)}
            disabled={generatingBoleto && !isPaid}
          >
            {generatingBoleto && !isPaid ? (
              <ActivityIndicator size={16} color="white" />
            ) : (
              <ExternalLink size={16} color="white" />
            )}
            <Text style={styles.cardActionText}>
              {buttonText}
            </Text>
          </TouchableOpacity>

          {/* Botão de Download - sempre visível para boletos pendentes */}
          {boleto.status === 'pending' && (
            <TouchableOpacity 
              style={[
                styles.cardAction,
                styles.downloadCardAction,
                (generatingBoleto || downloading) && styles.disabledCardAction
              ]}
              onPress={async () => {
                if (generatingBoleto || downloading) return;
                
                try {
                  setGeneratingBoleto(true);
                  const boletoCompleto = await getApiService().getBoletoById(boleto.id, 0); 
                  
                  if (boletoCompleto.pdfUrl) {
                    console.log('📄 Fazendo download do PDF:', boletoCompleto.pdfUrl);
                    await downloadBoleto(boletoCompleto);
                  } 
                  else if (boletoCompleto.paymentUrl && typeof boletoCompleto.paymentUrl === 'string' && boletoCompleto.paymentUrl.trim() !== '') {
                    console.log('🌐 Abrindo boleto em WebView (via botão Download Card):', boletoCompleto.paymentUrl);
                    openBoletoInWebView(boletoCompleto.paymentUrl);
                  } 
                  else {
                    Alert.alert(
                      'Download não disponível', 
                      'O PDF ou link de visualização do boleto ainda não está disponível. Tente novamente em alguns minutos ou use a opção "Ver boleto" para mais detalhes.',
                      [{ text: 'OK' }]
                    );
                  }
                  setGeneratingBoleto(false);
                } catch (error) {
                  console.error('Erro ao buscar dados para download no card:', error);
                  setGeneratingBoleto(false);
                  Alert.alert(
                    'Erro no Download', 
                    'Não foi possível acessar o boleto para download/visualização. Tente novamente.',
                    [{ text: 'OK' }]
                  );
                }
              }}
              disabled={generatingBoleto || downloading}
            >
              {(generatingBoleto || downloading) ? (
                <ActivityIndicator size={16} color="white" />
              ) : (
                <Download size={16} color="white" />
              )}
              <Text style={styles.cardActionText}>
                {generatingBoleto ? 'Carregando...' : downloading ? 'Baixando...' : 'Download'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar o filtro de período
  const renderPeriodFilter = () => {
    return (
      <View style={styles.periodFilterContainer}>
        <TouchableOpacity 
          style={[styles.periodFilterOption, periodFilter === 'all' && styles.activePeriodFilter]}
          onPress={() => setPeriodFilter('all')}
        >
          <Text style={[styles.periodFilterText, periodFilter === 'all' && styles.activePeriodFilterText]}>
            Todos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.periodFilterOption, periodFilter === 'current-month' && styles.activePeriodFilter]}
          onPress={() => setPeriodFilter('current-month')}
        >
          <Text style={[styles.periodFilterText, periodFilter === 'current-month' && styles.activePeriodFilterText]}>
            Mês atual
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.periodFilterOption, periodFilter === 'current-year' && styles.activePeriodFilter]}
          onPress={() => setPeriodFilter('current-year')}
        >
          <Text style={[styles.periodFilterText, periodFilter === 'current-year' && styles.activePeriodFilterText]}>
            Ano atual
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.periodFilterOption, periodFilter === 'previous-months' && styles.activePeriodFilter]}
          onPress={() => setPeriodFilter('previous-months')}
        >
          <Text style={[styles.periodFilterText, periodFilter === 'previous-months' && styles.activePeriodFilterText]}>
            Meses anteriores
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderComprovanteModal = () => {
    if (!selectedBoleto) return null;

    return (
      <Modal
        visible={showComprovanteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseComprovante}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comprovante de Pagamento</Text>
            <TouchableOpacity 
              onPress={handleCloseComprovante}
              style={styles.closeButton}
            >
              <X size={24} color={Colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Status de Pagamento */}
            <View style={styles.comprovanteHeader}>
              <CheckCircle size={48} color={Colors.success} />
              <Text style={styles.comprovanteStatus}>Pagamento Confirmado</Text>
              <Text style={styles.comprovanteDate}>
                Pago em {selectedBoleto.dueDate}
              </Text>
            </View>

            {/* Detalhes do Boleto */}
            <View style={styles.comprovanteSection}>
              <Text style={styles.comprovanteSectionTitle}>Detalhes do Pagamento</Text>
              
              <View style={styles.comprovanteItem}>
                <Text style={styles.comprovanteLabel}>Descrição:</Text>
                <Text style={styles.comprovanteValue}>{selectedBoleto.description}</Text>
              </View>

              <View style={styles.comprovanteItem}>
                <Text style={styles.comprovanteLabel}>Valor Pago:</Text>
                <Text style={[styles.comprovanteValue, styles.comprovanteAmount]}>
                  {selectedBoleto.value}
                </Text>
              </View>

              <View style={styles.comprovanteItem}>
                <Text style={styles.comprovanteLabel}>Data de Vencimento:</Text>
                <Text style={styles.comprovanteValue}>{selectedBoleto.dueDate}</Text>
              </View>

              <View style={styles.comprovanteItem}>
                <Text style={styles.comprovanteLabel}>ID da Transação:</Text>
                <Text style={styles.comprovanteValue}>{selectedBoleto.id}</Text>
              </View>

              <View style={styles.comprovanteItem}>
                <Text style={styles.comprovanteLabel}>Status:</Text>
                <View style={styles.comprovanteStatusContainer}>
                  <CheckCircle size={16} color={Colors.success} />
                  <Text style={styles.comprovanteStatusText}>Pago</Text>
                </View>
              </View>
            </View>

            {/* Informações Adicionais */}
            <View style={styles.comprovanteSection}>
              <Text style={styles.comprovanteSectionTitle}>Informações Adicionais</Text>
              
              <View style={styles.comprovanteInfoBox}>
                <Text style={styles.comprovanteInfoText}>
                  Este comprovante confirma que o pagamento foi processado com sucesso. 
                  Guarde este comprovante para seus registros.
                </Text>
              </View>
            </View>

            {/* Botões de Ação */}
            <View style={styles.comprovanteActions}>
              {selectedBoleto.pdfUrl && (
                <TouchableOpacity 
                  style={styles.comprovanteActionButton}
                  onPress={() => {
                    Linking.openURL(selectedBoleto.pdfUrl);
                  }}
                >
                  <FileText size={20} color="white" />
                  <Text style={styles.comprovanteActionText}>Ver PDF Original</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.comprovanteActionButton, styles.comprovanteSecondaryButton]}
                onPress={handleCloseComprovante}
              >
                <Text style={[styles.comprovanteActionText, styles.comprovanteSecondaryText]}>
                  Fechar
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderBoletoModal = () => {
    if (!generatedBoleto) return null;

    // Garantir que temos os dados corretos para exibição
    let displayValue = 'Valor não disponível';
    
    if (typeof generatedBoleto.value === 'number' && !isNaN(generatedBoleto.value)) {
      displayValue = (generatedBoleto.value / 100).toFixed(2).replace('.', ',');
    } else if (typeof generatedBoleto.value === 'string' && generatedBoleto.value.trim() !== '') {
      // Se já é uma string formatada, extrair apenas os números
      const cleanValue = generatedBoleto.value.replace(/[^\d,]/g, '');
      if (cleanValue) {
        displayValue = cleanValue;
      }
    }
    
    // Corrigir formatação da data de vencimento
    let displayDate = 'Data não disponível';
    
    if (generatedBoleto.dueDate) {
      try {
        let dateObj;
        
        // Se for timestamp Unix (número)
        if (typeof generatedBoleto.dueDate === 'number') {
          dateObj = new Date(generatedBoleto.dueDate * 1000);
        }
        // Se for timestamp Unix como string
        else if (typeof generatedBoleto.dueDate === 'string' && generatedBoleto.dueDate.match(/^\d+$/)) {
          dateObj = new Date(parseInt(generatedBoleto.dueDate) * 1000);
        }
        // Se for ISO string
        else if (typeof generatedBoleto.dueDate === 'string') {
          dateObj = new Date(generatedBoleto.dueDate);
        }
        
        // Verificar se a data é válida
        if (dateObj && !isNaN(dateObj.getTime())) {
          displayDate = dateObj.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      } catch (error) {
        console.error('Erro ao formatar data:', error);
        displayDate = 'Data inválida';
      }
    }
    
    // Se temos expires_at do Stripe, usar esse valor
    if (generatedBoleto.expires_at && typeof generatedBoleto.expires_at === 'number') {
      try {
        const expiresDate = new Date(generatedBoleto.expires_at * 1000);
        if (!isNaN(expiresDate.getTime())) {
          displayDate = expiresDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      } catch (error) {
        console.error('Erro ao formatar data de expiração:', error);
      }
    }

    // Obter informações do usuário para exibir CPF/CNPJ
    const customerDocument = user?.cpf || 'Não informado';
    const customerName = user?.name || 'Não informado';
    const customerEmail = user?.email || 'Não informado';

    console.log('🔍 Dados do modal:', {
      originalValue: generatedBoleto.value,
      valueType: typeof generatedBoleto.value,
      isNaN: isNaN(generatedBoleto.value as any),
      displayValue,
      dueDate: generatedBoleto.dueDate,
      displayDate,
      barcode: generatedBoleto.barcode,
      digitable_line: generatedBoleto.digitable_line,
      hasBarcode: !!generatedBoleto.barcode,
      hasDigitableLine: !!generatedBoleto.digitable_line,
      pdfUrl: generatedBoleto.pdfUrl,
      paymentUrl: generatedBoleto.paymentUrl,
      hasPdfUrl: !!generatedBoleto.pdfUrl,
      hasPaymentUrl: !!generatedBoleto.paymentUrl,
      showDownloadSection: !!(generatedBoleto.pdfUrl || generatedBoleto.paymentUrl),
      customerDocument,
      customerName,
      customerEmail
    });

    return (
      <Modal
        visible={showBoletoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseBoletoModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Visualizar Boleto</Text>
            <TouchableOpacity 
              onPress={handleCloseBoletoModal}
              style={styles.closeButton}
            >
              <X size={24} color={Colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Status de Geração */}
            <View style={styles.boletoHeader}>
              <FileText size={48} color={Colors.primary} />
              <Text style={styles.boletoStatus}>Boleto Bancário</Text>
              <Text style={styles.boletoDate}>
                Vencimento: {displayDate}
              </Text>
            </View>

            {/* Informações Principais do Boleto */}
            <View style={styles.boletoSection}>
              <Text style={styles.boletoSectionTitle}>📋 Informações do Boleto</Text>
              
              <View style={styles.boletoItem}>
                <Text style={styles.boletoLabel}>ID do Boleto:</Text>
                <Text style={styles.boletoValue}>{generatedBoleto.id}</Text>
              </View>

              <View style={styles.boletoItem}>
                <Text style={styles.boletoLabel}>Descrição:</Text>
                <Text style={styles.boletoValue}>{generatedBoleto.description}</Text>
              </View>

              <View style={styles.boletoItem}>
                <Text style={styles.boletoLabel}>Valor:</Text>
                <Text style={[styles.boletoValue, styles.boletoAmount]}>
                  R$ {displayValue}
                </Text>
              </View>

              <View style={styles.boletoItem}>
                <Text style={styles.boletoLabel}>Status:</Text>
                <View style={styles.statusContainer}>
                  {generatedBoleto.status === 'paid' ? (
                    <>
                      <CheckCircle size={16} color={Colors.success} />
                      <Text style={[styles.boletoValue, { color: Colors.success }]}>Pago</Text>
                    </>
                  ) : (
                    <>
                      <Clock size={16} color={Colors.warning} />
                      <Text style={[styles.boletoValue, { color: Colors.warning }]}>Pendente</Text>
                    </>
                  )}
                </View>
              </View>

              <View style={styles.boletoItem}>
                <Text style={styles.boletoLabel}>Data de Vencimento:</Text>
                <Text style={styles.boletoValue}>
                  {displayDate}
                </Text>
              </View>
            </View>

            {/* Informações do Cliente */}
            <View style={styles.boletoSection}>
              <Text style={styles.boletoSectionTitle}>👤 Dados do Pagador</Text>
              
              <View style={styles.boletoItem}>
                <Text style={styles.boletoLabel}>Nome:</Text>
                <Text style={styles.boletoValue}>{customerName}</Text>
              </View>

              <View style={styles.boletoItem}>
                <Text style={styles.boletoLabel}>CPF/CNPJ:</Text>
                <Text style={styles.boletoValue}>{customerDocument}</Text>
              </View>

              <View style={styles.boletoItem}>
                <Text style={styles.boletoLabel}>Email:</Text>
                <Text style={styles.boletoValue}>{customerEmail}</Text>
              </View>
            </View>

            {/* Código de Barras e Linha Digitável */}
            {(generatedBoleto.barcode || generatedBoleto.digitable_line) && (
              <View style={styles.boletoSection}>
                <Text style={styles.boletoSectionTitle}>🔢 Dados para Pagamento</Text>
                
                {generatedBoleto.digitable_line && (
                  <View style={styles.boletoCodeContainer}>
                    <View style={styles.boletoCodeHeader}>
                      <Text style={styles.boletoCodeLabel}>Linha Digitável:</Text>
                      <TouchableOpacity 
                        style={styles.copyButton}
                        onPress={async () => {
                          try {
                            await Clipboard.setStringAsync(generatedBoleto.digitable_line);
                            Alert.alert(
                              'Copiado!', 
                              'A linha digitável foi copiada para a área de transferência.',
                              [{ text: 'OK' }]
                            );
                          } catch (error) {
                            console.error('Erro ao copiar linha digitável:', error);
                            Alert.alert(
                              'Erro', 
                              'Não foi possível copiar a linha digitável. Tente novamente.',
                              [{ text: 'OK' }]
                            );
                          }
                        }}
                      >
                        <Text style={styles.copyButtonText}>📋 Copiar</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.boletoCodeBox}>
                      <Text style={styles.boletoCodeText} selectable>
                        {generatedBoleto.digitable_line}
                      </Text>
                    </View>
                  </View>
                )}

                {generatedBoleto.barcode && (
                  <View style={styles.boletoCodeContainer}>
                    <View style={styles.boletoCodeHeader}>
                      <Text style={styles.boletoCodeLabel}>Código de Barras:</Text>
                      <TouchableOpacity 
                        style={styles.copyButton}
                        onPress={async () => {
                          try {
                            await Clipboard.setStringAsync(generatedBoleto.barcode);
                            Alert.alert(
                              'Copiado!', 
                              'O código de barras foi copiado para a área de transferência.',
                              [{ text: 'OK' }]
                            );
                          } catch (error) {
                            console.error('Erro ao copiar código de barras:', error);
                            Alert.alert(
                              'Erro', 
                              'Não foi possível copiar o código de barras. Tente novamente.',
                              [{ text: 'OK' }]
                            );
                          }
                        }}
                      >
                        <Text style={styles.copyButtonText}>📋 Copiar</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.boletoCodeBox}>
                      <Text style={styles.boletoCodeText} selectable>
                        {generatedBoleto.barcode}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Se não tiver código de barras, mostrar aviso */}
            {(!generatedBoleto.barcode && !generatedBoleto.digitable_line) && (
              <View style={styles.boletoSection}>
                <Text style={styles.boletoSectionTitle}>ℹ️ Informação</Text>
                <View style={styles.boletoInfoBox}>
                  <Text style={styles.boletoInfoText}>
                    ⏳ O código de barras e linha digitável ainda estão sendo processados pelo sistema de pagamento. 
                    Eles estarão disponíveis em alguns minutos. Você pode usar o PDF ou o link de visualização abaixo.
                  </Text>
                </View>
              </View>
            )}

            {/* Instruções */}
            <View style={styles.boletoSection}>
              <Text style={styles.boletoSectionTitle}>📝 Como Pagar</Text>
              
              <View style={styles.boletoInfoBox}>
                <Text style={styles.boletoInfoText}>
                  • Você pode pagar este boleto em qualquer banco, casa lotérica ou pelo internet banking{'\n'}
                  • Use a linha digitável ou o código de barras para efetuar o pagamento{'\n'}
                  • Mantenha o comprovante de pagamento para seus registros{'\n'}
                  • O pagamento será processado em até 3 dias úteis
                </Text>
              </View>
            </View>

            {/* Botões de Ação */}
            <View style={styles.boletoActions}>
              {/* Botões de Visualização e Download */}
              <View style={styles.downloadSection}>
                <Text style={styles.downloadSectionTitle}>📱 Visualizar e Baixar</Text>
                
                {/* Botão para visualizar online usando hosted_voucher_url */}
                {generatedBoleto.paymentUrl && (
                  <TouchableOpacity 
                    style={[styles.boletoActionButton, styles.viewButton]}
                    onPress={() => {
                      console.log('🌐 Abrindo boleto em WebView para visualização:', generatedBoleto.paymentUrl);
                      openBoletoInWebView(generatedBoleto.paymentUrl);
                    }}
                  >
                    <Eye size={20} color="white" />
                    <Text style={styles.boletoActionText}>Visualizar Boleto</Text>
                  </TouchableOpacity>
                )}

                {/* Botão para baixar PDF */}
                {generatedBoleto.pdfUrl ? (
                  <TouchableOpacity 
                    style={[
                      styles.boletoActionButton, 
                      styles.downloadButton,
                      downloading && styles.disabledActionButton
                    ]}
                    onPress={() => {
                      console.log('📄 Fazendo download do PDF do boleto:', generatedBoleto.pdfUrl);
                      downloadBoleto(generatedBoleto);
                    }}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <ActivityIndicator size={20} color="white" />
                    ) : (
                      <Download size={20} color="white" />
                    )}
                    <Text style={styles.boletoActionText}>
                      {downloading ? 'Baixando...' : 'Baixar PDF'}
                    </Text>
                  </TouchableOpacity>
                ) : generatedBoleto.paymentUrl && (
                  <View style={styles.downloadInfoBox}>
                    <Text style={styles.downloadInfoText}>
                      📄 O PDF será gerado automaticamente quando você acessar a visualização acima. 
                      Na página do boleto, você poderá baixar o PDF diretamente.
                    </Text>
                  </View>
                )}
              </View>

              {/* Botão de Pagamento Online (se disponível) */}
              {generatedBoleto.paymentUrl && generatedBoleto.status === 'pending' && (
                <TouchableOpacity 
                  style={[styles.boletoActionButton, styles.paymentButton]}
                  onPress={() => {
                    console.log('💳 Abrindo pagamento online:', generatedBoleto.paymentUrl);
                    Linking.openURL(generatedBoleto.paymentUrl);
                  }}
                >
                  <DollarSign size={20} color="white" />
                  <Text style={styles.boletoActionText}>Pagar Online</Text>
                </TouchableOpacity>
              )}

              {/* Botão Compartilhar (se tiver dados) */}
              {(generatedBoleto.barcode || generatedBoleto.digitable_line || generatedBoleto.paymentUrl) && (
                <TouchableOpacity 
                  style={[styles.boletoActionButton, styles.shareButton]}
                  onPress={async () => {
                    // Criar texto para compartilhar
                    const shareText = `💰 Boleto Bancário\n\n` +
                      `📋 Descrição: ${generatedBoleto.description}\n` +
                      `💵 Valor: R$ ${displayValue}\n` +
                      `📅 Vencimento: ${displayDate}\n` +
                      `🆔 ID: ${generatedBoleto.id}\n\n` +
                      `👤 Pagador: ${customerName}\n` +
                      `📄 CPF/CNPJ: ${customerDocument}\n\n` +
                      (generatedBoleto.digitable_line ? `🔢 Linha Digitável:\n${generatedBoleto.digitable_line}\n\n` : '') +
                      (generatedBoleto.barcode ? `📊 Código de Barras:\n${generatedBoleto.barcode}\n\n` : '') +
                      (generatedBoleto.paymentUrl ? `🌐 Visualizar Online:\n${generatedBoleto.paymentUrl}\n\n` : '') +
                      `📱 Gerado pelo App Condomínio Fácil`;

                    try {
                      await Clipboard.setStringAsync(shareText);
                      Alert.alert(
                        'Dados Copiados!', 
                        'Todos os dados do boleto foram copiados para a área de transferência. Você pode agora colar em qualquer aplicativo de mensagem.',
                        [{ text: 'OK' }]
                      );
                    } catch (error) {
                      console.error('Erro ao copiar dados do boleto:', error);
                      Alert.alert(
                        'Erro', 
                        'Não foi possível copiar os dados. Tente novamente.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                >
                  <ExternalLink size={20} color="white" />
                  <Text style={styles.boletoActionText}>Compartilhar Dados</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.boletoActionButton, styles.boletoSecondaryButton]}
                onPress={handleCloseBoletoModal}
              >
                <Text style={[styles.boletoActionText, styles.boletoSecondaryText]}>
                  Fechar
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // Renderizar WebView Modal para boletos
  const renderWebViewModal = () => {
    return (
      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={closeWebView}
      >
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Boleto Bancário</Text>
            <TouchableOpacity 
              onPress={closeWebView}
              style={styles.webViewCloseButton}
            >
              <X size={24} color={Colors.gray[600]} />
            </TouchableOpacity>
          </View>
          
          {webViewUrl ? (
            <WebView
              source={{ uri: webViewUrl }}
              style={styles.webView}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.webViewLoadingText}>Carregando boleto...</Text>
                </View>
              )}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView error:', nativeEvent);
                Alert.alert(
                  'Erro ao carregar',
                  'Não foi possível carregar o boleto. Tente novamente.',
                  [
                    { text: 'Fechar', onPress: closeWebView },
                    { text: 'Abrir no navegador', onPress: () => {
                      closeWebView();
                      Linking.openURL(webViewUrl);
                    }}
                  ]
                );
              }}
            />
          ) : (
            <View style={styles.webViewError}>
              <Text style={styles.webViewErrorText}>URL não disponível</Text>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Boletos',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={handleBackPress}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          )
        }} 
      />
      <View style={styles.container}>
        {/* Banner de erro ou aviso */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              ⚠️ {error}
            </Text>
          </View>
        )}

        
        {/* Abas de filtro por status */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'all' && styles.activeTab]} 
            onPress={() => setActiveTab('all')}
          >
            <FileText size={18} color={activeTab === 'all' ? Colors.primary : Colors.gray[500]} />
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>Todos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pending' && styles.activeTab]} 
            onPress={() => setActiveTab('pending')}
          >
            <Clock size={18} color={activeTab === 'pending' ? Colors.primary : Colors.gray[500]} />
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pendentes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'paid' && styles.activeTab]} 
            onPress={() => setActiveTab('paid')}
          >
            <Check size={18} color={activeTab === 'paid' ? Colors.primary : Colors.gray[500]} />
            <Text style={[styles.tabText, activeTab === 'paid' && styles.activeTabText]}>Pagos</Text>
          </TouchableOpacity>
        </View>
        
        {/* Botão de filtro e opções */}
        <View style={styles.filterSection}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilterOptions(!showFilterOptions)}
          >
            <Filter size={18} color={Colors.primary} />
            <Text style={styles.filterButtonText}>Filtrar por período</Text>
          </TouchableOpacity>
          
          {showFilterOptions && renderPeriodFilter()}
        </View>
        
        {/* Lista de boletos */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Carregando boletos...</Text>
          </View>
        ) : filteredBoletos.length > 0 ? (
          <FlatList
            data={filteredBoletos}
            renderItem={renderBoletoCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
            }
          >
            <EmptyState
              title={error ? "Erro ao carregar boletos" : "Nenhum boleto encontrado"}
              description={error ? "Puxe para baixo para tentar novamente" : "Não há boletos para o período selecionado"}
              icon={<FileText size={64} color={Colors.gray[400]} />}
            />
          </ScrollView>
        )}
      </View>
      
      {/* Modal do Comprovante */}
      {renderComprovanteModal()}
      {renderBoletoModal()}
      {renderWebViewModal()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  backButton: {
    marginRight: 16,
    marginLeft: 8,
  },
  errorBanner: {
    padding: 12,
    backgroundColor: Colors.error + '20',
    borderRadius: 8,
    margin: 16,
    marginBottom: 8,
  },
  errorText: {
    color: Colors.error,
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
  },
  infoBanner: {
    padding: 12,
    backgroundColor: Colors.primary + '20',
    borderRadius: 8,
    margin: 16,
    marginBottom: 8,
  },
  infoText: {
    color: Colors.primary,
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[500],
    marginLeft: 4,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  filterSection: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary + '10',
  },
  filterButtonText: {
    marginLeft: 8,
    color: Colors.primary,
    fontWeight: '500',
  },
  periodFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  periodFilterOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
    marginRight: 8,
  },
  activePeriodFilter: {
    backgroundColor: Colors.primary + '20',
  },
  periodFilterText: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  activePeriodFilterText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Colors.gray[600],
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
  },
  paidCard: {
    borderLeftColor: Colors.success,
  },
  pendingCard: {
    borderLeftColor: Colors.primary,
  },
  overdueCard: {
    borderLeftColor: Colors.error,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[800],
    marginLeft: 12,
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paidStatusContainer: {
    backgroundColor: Colors.success + '20',
  },
  pendingStatusContainer: {
    backgroundColor: Colors.primary + '20',
  },
  overdueStatusContainer: {
    backgroundColor: Colors.error + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  paidStatus: {
    color: Colors.success,
    fontWeight: '500',
  },
  pendingStatus: {
    color: Colors.primary,
  },
  overdueStatus: {
    color: Colors.error,
  },
  overdueText: {
    color: Colors.error,
  },
  cardDetailsContainer: {
    marginBottom: 16,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  cardDetailLabel: {
    fontSize: 14,
    color: Colors.gray[600],
    marginRight: 4,
  },
  cardDetailValue: {
    fontSize: 14,
    color: Colors.gray[800],
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  paidCardAction: {
    backgroundColor: Colors.success,
  },
  pendingCardAction: {
    backgroundColor: Colors.primary,
  },
  overdueCardAction: {
    backgroundColor: Colors.error,
  },
  cardActionText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.gray[800],
    marginRight: 16,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    padding: 16,
  },
  comprovanteHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  comprovanteStatus: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.success,
    marginTop: 12,
    textAlign: 'center',
  },
  comprovanteDate: {
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: 4,
    textAlign: 'center',
  },
  comprovanteSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  comprovanteSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.gray[800],
    marginBottom: 12,
  },
  comprovanteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  comprovanteLabel: {
    fontSize: 14,
    color: Colors.gray[600],
    flex: 1,
  },
  comprovanteValue: {
    fontSize: 14,
    color: Colors.gray[800],
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  comprovanteAmount: {
    fontSize: 16,
    color: Colors.success,
    fontWeight: 'bold',
  },
  comprovanteStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comprovanteStatusText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
    marginLeft: 4,
  },
  comprovanteInfoBox: {
    padding: 16,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  comprovanteInfoText: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
  },
  comprovanteActions: {
    paddingTop: 16,
    marginBottom: 32,
  },
  comprovanteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  comprovanteSecondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  comprovanteActionText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  comprovanteSecondaryText: {
    color: Colors.gray[700],
  },
  boletoHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  boletoStatus: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  boletoDate: {
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: 4,
    textAlign: 'center',
  },
  boletoSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  boletoSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.gray[800],
    marginBottom: 12,
  },
  boletoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  boletoLabel: {
    fontSize: 14,
    color: Colors.gray[600],
    flex: 1,
  },
  boletoValue: {
    fontSize: 14,
    color: Colors.gray[800],
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  boletoAmount: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  boletoCodeContainer: {
    marginBottom: 16,
  },
  boletoCodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boletoCodeLabel: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 4,
  },
  boletoCodeBox: {
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 4,
  },
  boletoCodeText: {
    fontSize: 14,
    color: Colors.gray[800],
    fontWeight: '500',
  },
  boletoInfoBox: {
    padding: 16,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  boletoInfoText: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
  },
  boletoActions: {
    paddingTop: 16,
    marginBottom: 32,
  },
  boletoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  boletoSecondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  boletoActionText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  boletoSecondaryText: {
    color: Colors.gray[700],
  },
  disabledCardAction: {
    backgroundColor: Colors.gray[300],
  },
  downloadSection: {
    marginBottom: 16,
  },
  downloadSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.gray[800],
    marginBottom: 8,
  },
  downloadButton: {
    backgroundColor: Colors.primary,
  },
  paymentButton: {
    backgroundColor: Colors.success,
  },
  shareButton: {
    backgroundColor: Colors.primary + '80', // Semi-transparente
  },
  downloadCardAction: {
    backgroundColor: Colors.gray[600],
  },
  copyButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 4,
  },
  copyButtonText: {
    fontSize: 14,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  downloadInfoBox: {
    padding: 16,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: 12,
  },
  downloadInfoText: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
  },
  viewButton: {
    backgroundColor: Colors.primary,
  },
  disabledActionButton: {
    backgroundColor: Colors.gray[300],
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.gray[800],
    marginRight: 16,
  },
  webViewCloseButton: {
    padding: 8,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewLoadingText: {
    marginTop: 16,
    color: Colors.gray[600],
    fontSize: 16,
  },
  webViewError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewErrorText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '500',
  },
}); 