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
  FlatList
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { FilePlus, FileText, ExternalLink, ArrowLeft, Filter, Check, Clock, DollarSign, Calendar } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import EmptyState from '@/components/EmptyState';

// Definindo a interface para o boleto
interface Boleto {
  id: string;
  description: string;
  dueDate: string;
  value: string;
  status: 'paid' | 'pending';
  pdfUrl: string;
  month: string; // Adicionando mês para facilitar o filtro
  year: string;  // Adicionando ano para facilitar o filtro
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

  // Função para carregar os boletos (simulada por enquanto)
  useEffect(() => {
    loadBoletos();
  }, []);

  // Efeito para aplicar os filtros quando boletos, aba ativa ou filtro de período mudar
  useEffect(() => {
    applyFilters();
  }, [boletos, activeTab, periodFilter]);

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
      // Aqui futuramente será implementada a chamada para buscar os boletos
      // Por enquanto, criamos dados de exemplo
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      const mockBoletos: Boleto[] = [
        { 
          id: '1', 
          description: 'Taxa de condomínio - Janeiro/2023', 
          dueDate: '10/01/2023',
          value: 'R$ 450,00',
          status: 'paid',
          pdfUrl: 'https://example.com/boleto1.pdf',
          month: '01',
          year: '2023'
        },
        { 
          id: '2', 
          description: 'Taxa de condomínio - Fevereiro/2023', 
          dueDate: '10/02/2023',
          value: 'R$ 450,00',
          status: 'paid',
          pdfUrl: 'https://example.com/boleto2.pdf',
          month: '02',
          year: '2023'
        },
        { 
          id: '3', 
          description: 'Taxa de condomínio - Março/2023', 
          dueDate: '10/03/2023',
          value: 'R$ 450,00',
          status: 'paid',
          pdfUrl: 'https://example.com/boleto3.pdf',
          month: '03',
          year: '2023'
        },
        { 
          id: '4', 
          description: 'Taxa de condomínio - Abril/2023', 
          dueDate: '10/04/2023',
          value: 'R$ 450,00',
          status: 'paid',
          pdfUrl: 'https://example.com/boleto4.pdf',
          month: '04',
          year: '2023'
        },
        { 
          id: '5', 
          description: 'Taxa de condomínio - Maio/2023', 
          dueDate: '10/05/2023',
          value: 'R$ 450,00',
          status: 'pending',
          pdfUrl: 'https://example.com/boleto5.pdf',
          month: '05',
          year: '2023'
        },
        { 
          id: '6', 
          description: `Taxa de condomínio - ${currentMonth < 10 ? '0' + currentMonth : currentMonth}/${currentYear}`, 
          dueDate: `10/${currentMonth < 10 ? '0' + currentMonth : currentMonth}/${currentYear}`,
          value: 'R$ 450,00',
          status: 'pending',
          pdfUrl: 'https://example.com/boleto6.pdf',
          month: currentMonth < 10 ? '0' + currentMonth : currentMonth.toString(),
          year: currentYear.toString()
        },
      ];
      
      // Simula um atraso de rede
      setTimeout(() => {
        setBoletos(mockBoletos);
        setLoading(false);
        setRefreshing(false);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao carregar boletos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os boletos. Tente novamente.');
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

  const handleBoletoPress = (boleto: Boleto) => {
    // Abre o PDF do boleto ou redireciona para a URL de pagamento
    if (boleto.pdfUrl) {
      Linking.openURL(boleto.pdfUrl);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const renderBoletoCard = ({ item: boleto }: { item: Boleto }) => {
    const isPastDue = () => {
      // Verificar se o boleto pendente está vencido
      if (boleto.status === 'pending') {
        const [day, month, year] = boleto.dueDate.split('/').map(Number);
        const dueDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate < today;
      }
      return false;
    };
    
    return (
      <TouchableOpacity 
        style={[
          styles.card,
          boleto.status === 'paid' ? styles.paidCard : 
          isPastDue() ? styles.overdueCard : styles.pendingCard
        ]}
        onPress={() => handleBoletoPress(boleto)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <FileText size={24} color={boleto.status === 'paid' ? Colors.success : isPastDue() ? Colors.error : Colors.primary} />
            <Text style={styles.cardTitle}>{boleto.description}</Text>
          </View>
          <View style={[
            styles.statusContainer,
            boleto.status === 'paid' ? styles.paidStatusContainer : 
            isPastDue() ? styles.overdueStatusContainer : styles.pendingStatusContainer
          ]}>
            <Text style={[
              styles.statusText, 
              boleto.status === 'paid' ? styles.paidStatus : 
              isPastDue() ? styles.overdueStatus : styles.pendingStatus
            ]}>
              {boleto.status === 'paid' ? 'Pago' : isPastDue() ? 'Vencido' : 'Pendente'}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardDetailsContainer}>
          <View style={styles.cardDetails}>
            <Calendar size={16} color={Colors.gray[500]} style={styles.detailIcon} />
            <Text style={styles.cardDetailLabel}>Vencimento:</Text>
            <Text style={[
              styles.cardDetailValue,
              isPastDue() && styles.overdueText
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
              boleto.status === 'paid' ? styles.paidCardAction : 
              isPastDue() ? styles.overdueCardAction : styles.pendingCardAction
            ]}
            onPress={() => handleBoletoPress(boleto)}
          >
            <ExternalLink size={16} color="white" />
            <Text style={styles.cardActionText}>
              {boleto.status === 'paid' ? 'Ver comprovante' : 'Pagar agora'}
            </Text>
          </TouchableOpacity>
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
              icon={<FilePlus size={48} color={Colors.gray[400]} />}
              title="Nenhum boleto encontrado"
              description={`Não há boletos ${activeTab === 'pending' ? 'pendentes' : activeTab === 'paid' ? 'pagos' : ''} para o período selecionado.`}
            />
          </ScrollView>
        )}
      </View>
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
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 8,
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
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
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
}); 