import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, RefreshControl, BackHandler } from 'react-native';
import { router, useNavigation, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTopicsStore } from '@/store/topics-store';
import { useAuthStore } from '@/store/auth-store';
import { useMeetingsStore } from '@/store/meetings-store';
import { useDebtorsStore } from '@/store/debtors-store';
import { useNewsStore } from '@/store/news-store';
import TopicCard from '@/components/TopicCard';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import ServiceCard from '@/components/ServiceCard';
import MeetingAlert from '@/components/MeetingAlert';
import NewsCarousel from '@/components/NewsCarousel';
import Colors from '@/constants/colors';
import { 
  ClipboardList, 
  Plus, 
  AlertTriangle, 
  Lightbulb, 
  Users, 
  DoorOpen, 
  Video, 
  Newspaper, 
  PawPrint, 
  Package, 
  Camera,
  Calendar,
  Shield,
  FileText,
  ChevronRight,
  ShoppingBag,
  Hammer,
  DollarSign,
  X,
  Check,
  HelpCircle,
  PlusCircle,
  RefreshCcw,
  Search
} from 'lucide-react-native';
import { News, Topic } from '@/types';

const HIDDEN_NEWS_STORAGE_KEY = 'hidden_news_ids';

export default function HomeScreen() {
  const { topics, fetchTopics, isLoading, error } = useTopicsStore();
  const { meetings, upcomingMeetings, fetchMeetings } = useMeetingsStore();
  const { fetchDebtors, getStats } = useDebtorsStore();
  const { user } = useAuthStore();
  const { fetchNews, getRecentNews } = useNewsStore();
  
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const [debtorStats, setDebtorStats] = useState({ total: 0, pendingCount: 0, pendingAmount: 0 });
  const [showDebtorBanner, setShowDebtorBanner] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentNews, setRecentNews] = useState<News[]>([]);
  const [hiddenNewsIds, setHiddenNewsIds] = useState<string[]>([]);
  const [showHiddenNews, setShowHiddenNews] = useState(false);

  // Debug para verificar se o usuário é reconhecido como admin
  console.log('User role:', user?.role);
  console.log('Is admin:', isAdmin);

  // Function to refresh all data
  const refreshData = useCallback(async () => {
    console.log('Refreshing home screen data...');
    setRefreshing(true);
    
    try {
      // Refresh all data sources in parallel
      await Promise.all([
        fetchTopics(),
        fetchMeetings(),
        fetchDebtors().then(() => {
          setDebtorStats(getStats());
        }),
        fetchNews().then(() => {
          setRecentNews(getRecentNews());
        })
      ]);
      
      console.log('Data refresh complete');
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Erro', 'Não foi possível atualizar os dados. Tente novamente.');
    } finally {
      setRefreshing(false);
    }
  }, [fetchTopics, fetchMeetings, fetchDebtors, fetchNews, getStats, getRecentNews]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  // Initial data loading
  useEffect(() => {
    refreshData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Home screen focused - updating data');
      refreshData();
      
      // Optional: Set up real-time refresh interval
      const refreshInterval = setInterval(() => {
        console.log('Auto-refreshing home screen data');
        refreshData();
      }, 60000); // Refresh every 60 seconds
      
      return () => clearInterval(refreshInterval);
    }, [refreshData])
  );

  // Load hidden news IDs from storage on mount
  useEffect(() => {
    const loadHiddenNewsIds = async () => {
      try {
        const storedIds = await AsyncStorage.getItem(HIDDEN_NEWS_STORAGE_KEY);
        if (storedIds) {
          setHiddenNewsIds(JSON.parse(storedIds));
        }
      } catch (error) {
        console.error('Error loading hidden news IDs:', error);
      }
    };
    
    loadHiddenNewsIds();
  }, []);
  
  // Save hidden news IDs to storage when they change
  useEffect(() => {
    const saveHiddenNewsIds = async () => {
      try {
        await AsyncStorage.setItem(HIDDEN_NEWS_STORAGE_KEY, JSON.stringify(hiddenNewsIds));
      } catch (error) {
        console.error('Error saving hidden news IDs:', error);
      }
    };
    
    if (hiddenNewsIds.length > 0) {
      saveHiddenNewsIds();
    }
  }, [hiddenNewsIds]);

  // Handle back button press
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Return true to prevent default behavior (going back)
        return true;
      });

      return () => backHandler.remove();
    }, [])
  );

  const handleTopicPress = (topic: Topic) => {
    router.push({
      pathname: '/topic/[id]',
      params: { id: topic.id }
    });
  };

  const handleCreateTopic = () => {
    router.push('/topic/create');
  };

  const handleCreateMeeting = () => {
    router.push('/meeting/create');
  };

  const handleServicePress = (serviceName: string) => {
    // Verificar qual serviço foi selecionado
    if (serviceName === "Pets") {
      router.push('/pets');
      return;
    }
    
    if (serviceName === "Anúncios") {
      router.push('/advertisements');
      return;
    }
    
    if (serviceName === "Abrir Portão") {
      const phoneNumber = '61991071183';
      Linking.openURL(`tel:${phoneNumber}`)
        .catch(error => {
          console.error('Erro ao tentar ligar:', error);
          Alert.alert(
            "Erro",
            "Não foi possível iniciar a chamada telefônica. Verifique se seu dispositivo suporta esta função.",
            [{ text: "OK", style: "default" }]
          );
        });
      return;
    }
    
    if (serviceName === "Prestadores de Serviços") {
      router.push('/service-providers');
      return;
    }
    
    if (serviceName === "Notícias") {
      router.push('/news');
      return;
    }
    
    // Para outros serviços ainda não implementados
    Alert.alert(
      "Funcionalidade em desenvolvimento",
      `O serviço "${serviceName}" ainda não está disponível. Estamos trabalhando nisso!`,
      [{ text: "OK", style: "default" }]
    );
  };

  const handleNewsPress = (newsId: string) => {
    router.push({
      pathname: '/news/[id]',
      params: { id: newsId }
    });
  };

  const handleNewsClose = (newsId: string) => {
    setHiddenNewsIds(prev => [...prev, newsId]);
  };
  
  const handleRestoreNews = () => {
    setShowHiddenNews(prev => !prev);
  };
  
  // Filter news based on hidden state
  const visibleNews = showHiddenNews
    ? recentNews // Show all news
    : recentNews.filter(news => !hiddenNewsIds.includes(news.id)); // Filter out hidden news

  if (isLoading && topics.length === 0) {
    return <LoadingIndicator fullScreen text="Carregando pautas..." />;
  }

  // Define services based on user role
  const getServices = () => {
    console.log('Gerando serviços para o usuário:', user?.name);
    console.log('Papel do usuário (role):', user?.role);
    console.log('É admin?', isAdmin);

    // Serviços disponíveis apenas para o síndico (admin)
    const adminServices = [];
    
    if (isAdmin) {
      console.log('Adicionando serviços exclusivos do síndico');
      adminServices.push({
        title: "Administração",
        description: "Acesse o painel administrativo",
        icon: <Shield size={24} color="#EC4899" />,
        color: "#EC4899",
        onPress: () => router.push('/admin'),
      });
    }

    // Serviços para gerentes (manager) e síndico (admin)
    const managerServices = [];
    
    if (isManager) {
      console.log('Adicionando serviços de gerência');
      
      // Ordem solicitada: 1-Abrir Portão, 2-Boletos, 3-Inadiplentes, 4-Cameras, 
      // 5-Prestadores de Serviços, 6-Criar Pauta, 7-Criar Reunião
      
      // 1. Abrir Portão
      managerServices.push({
        title: "Abrir Portão",
        description: "Abra o portão do condomínio remotamente",
        icon: <DoorOpen size={24} color={Colors.secondary} />,
        color: Colors.secondary,
        onPress: () => handleServicePress("Abrir Portão"),
      });
      
      // 2. Boletos
      managerServices.push({
        title: "Boletos",
        description: "Visualize e pague seus boletos",
        icon: <FileText size={24} color="#10B981" />,
        color: "#10B981",
        onPress: () => router.push('/boletos'),
      });
      
      // 3. Inadimplentes
      managerServices.push({
        title: "Inadimplentes",
        description: "Gerencie moradores inadimplentes",
        icon: <AlertTriangle size={24} color="#F97316" />,
        color: "#F97316",
        onPress: () => router.push('/debtors'),
      });
      
      // 4. Câmeras
      managerServices.push({
        title: "Câmeras",
        description: "Acesse as câmeras de segurança",
        icon: <Camera size={24} color="#6366F1" />,
        color: "#6366F1",
        onPress: () => router.push('/cameras'),
      });
      
      // 5. Prestadores de Serviços
      managerServices.push({
        title: "Prestadores de Serviços",
        description: "Lista de prestadores de serviços confiáveis",
        icon: <Hammer size={24} color="#8B5CF6" />,
        color: "#8B5CF6",
        onPress: () => handleServicePress("Prestadores de Serviços"),
      });
      
      // 6. Criar Pauta
      managerServices.push({
        title: "Criar Pauta",
        description: "Crie uma nova pauta para discussão",
        icon: <ClipboardList size={24} color="#10B981" />,
        color: "#10B981",
        onPress: handleCreateTopic,
      });
      
      // 7. Criar Reunião
      managerServices.push({
        title: "Criar Reunião",
        description: "Agende uma nova reunião de condomínio",
        icon: <Calendar size={24} color="#FF0000" />,
        color: "#FF0000",
        onPress: handleCreateMeeting,
      });
      
      // Outros serviços do gerente que não estão na ordem especificada
      managerServices.push({
        title: "Criar Notícias",
        description: "Gerencie as notícias do condomínio",
        icon: <Newspaper size={24} color="#10B981" />,
        color: "#10B981",
        onPress: () => handleServicePress("Notícias"),
      });
    }

    // Serviços disponíveis para todos os usuários (moradores)
    // Se o usuário for gerente, alguns desses serviços já estão nos managerServices
    // e não devem ser duplicados
    const baseServices = [];
    
    // Apenas adicionar serviços que não são duplicados para gerentes
    if (!isManager) {
      baseServices.push({
        title: "Abrir Portão",
        description: "Abra o portão do condomínio remotamente",
        icon: <DoorOpen size={24} color={Colors.secondary} />,
        color: Colors.secondary,
        onPress: () => handleServicePress("Abrir Portão"),
      });
      
      baseServices.push({
        title: "Boletos",
        description: "Visualize e pague seus boletos",
        icon: <FileText size={24} color="#10B981" />,
        color: "#10B981",
        onPress: () => router.push('/boletos'),
      });
      
      baseServices.push({
        title: "Câmeras",
        description: "Acesse as câmeras de segurança",
        icon: <Camera size={24} color="#6366F1" />,
        color: "#6366F1",
        onPress: () => router.push('/cameras'),
      });
      
      baseServices.push({
        title: "Prestadores de Serviços",
        description: "Lista de prestadores de serviços confiáveis",
        icon: <Hammer size={24} color="#8B5CF6" />,
        color: "#8B5CF6",
        onPress: () => handleServicePress("Prestadores de Serviços"),
      });
    }
    
    // Estes serviços são sempre adicionados para todos os usuários
    baseServices.push({
      title: "Anúncios",
      description: "Compre e venda itens no condomínio",
      icon: <ShoppingBag size={24} color="#F43F5E" />,
      color: "#F43F5E",
      onPress: () => router.push('/advertisements'),
    });
    
    baseServices.push({
      title: "Achados e Perdidos",
      description: "Itens perdidos e encontrados no condomínio",
      icon: <Search size={24} color="#0EA5E9" />,
      color: "#0EA5E9",
      onPress: () => router.push('/lost-and-found'),
    });
    
    baseServices.push({
      title: "Pets",
      description: "Cadastre e gerencie informações sobre seus pets",
      icon: <PawPrint size={24} color="#8B5CF6" />,
      color: "#8B5CF6",
      onPress: () => handleServicePress("Pets"),
    });
    
    baseServices.push({
      title: "Encomendas",
      description: "Acompanhe suas entregas e encomendas",
      icon: <Package size={24} color="#F59E0B" />,
      color: "#F59E0B",
      onPress: () => handleServicePress("Encomendas"),
    });
    
    baseServices.push({
      title: "Reuniões",
      description: "Veja as reuniões agendadas",
      icon: <Calendar size={24} color={Colors.primary} />,
      color: Colors.primary,
      onPress: () => router.push('/meetings'),
    });
    
    baseServices.push({
      title: "Reunião Virtual",
      description: "Participe de reuniões online com o condomínio",
      icon: <Video size={24} color={Colors.tertiary} />,
      color: Colors.tertiary,
      onPress: () => handleServicePress("Reunião Virtual"),
    });
    
    // Adicionar "Notícias" para residentes
    baseServices.push({
      title: "Notícias",
      description: "Veja as notícias do condomínio",
      icon: <Newspaper size={24} color="#10B981" />,
      color: "#10B981",
      onPress: () => router.push('/news'),
    });

    // Combinar todos os serviços
    console.log('Total de serviços admin:', adminServices.length);
    console.log('Total de serviços gerente:', managerServices.length);
    console.log('Total de serviços base:', baseServices.length);
    
    return [...adminServices, ...managerServices, ...baseServices];
  };

  const services = getServices();

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
          title="Atualizando..."
          titleColor={Colors.gray[600]}
        />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.welcomeTitle}>
              Olá, {user?.name?.split(' ')[0] || 'Morador'}!
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Bem-vindo ao Condomínio Santa Cecília
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={refreshData}
            disabled={refreshing}
          >
            <RefreshCcw size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* News Carousel - Mostrar apenas se houver notícias recentes visíveis */}
      {visibleNews.length > 0 && (
        <NewsCarousel 
          news={visibleNews}
          onPress={handleNewsPress}
          onClose={handleNewsClose}
        />
      )}
      
      {/* Botão para mostrar/ocultar notícias escondidas */}
      {recentNews.length > 0 && hiddenNewsIds.length > 0 && (
        <TouchableOpacity 
          style={styles.restoreNewsButton}
          onPress={handleRestoreNews}
        >
          <Text style={styles.restoreNewsText}>
            {showHiddenNews ? "Ocultar notícias escondidas" : "Mostrar todas as notícias"}
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Banner de Inadimplentes - Para todos os usuários */}
      {showDebtorBanner && debtorStats.pendingCount > 0 && (
        <View style={styles.debtorsBanner}>
          <View style={styles.debtorsBannerIcon}>
            <AlertTriangle size={24} color="white" />
          </View>
          <View style={styles.debtorsBannerContent}>
            <Text style={styles.debtorsBannerTitle}>Atenção</Text>
            <Text style={styles.debtorsBannerText}>
              Atualmente existem {debtorStats.pendingCount} moradores inadimplentes, 
              totalizando {new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              }).format(debtorStats.pendingAmount)}.
            </Text>
          </View>
          {isManager ? (
            <TouchableOpacity 
              onPress={() => router.push('/debtors')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronRight size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={() => setShowDebtorBanner(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeButton}
            >
              <X size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Reuniões Próximas - Mostrar apenas se houver reuniões agendadas */}
      {upcomingMeetings.length > 0 && (
        <View style={styles.meetingsAlertSection}>
          <Text style={styles.meetingsAlertTitle}>
            Próximas Reuniões
          </Text>
          
          {upcomingMeetings.slice(0, 2).map((meeting) => (
            <MeetingAlert key={meeting.id} meeting={meeting} />
          ))}
          
          {upcomingMeetings.length > 2 && (
            <TouchableOpacity 
              style={styles.viewAllMeetings}
              onPress={() => router.push('/meetings')}
            >
              <Text style={styles.viewAllMeetingsText}>
                Ver todas as reuniões ({upcomingMeetings.length})
              </Text>
              <ChevronRight size={16} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Topics Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pautas Recentes</Text>
          <View style={styles.headerButtons}>
            {isManager && (
              <TouchableOpacity onPress={handleCreateTopic} style={styles.addButton}>
                <Plus size={20} color={Colors.primary} />
                <Text style={styles.addButtonText}>Nova Pauta</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.push('/topics')} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>Ver Todas</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Ocorreu um erro ao carregar as pautas. Tente novamente.
            </Text>
            <TouchableOpacity onPress={fetchTopics} style={styles.retryButton}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : topics.length === 0 ? (
          <EmptyState
            title="Nenhuma pauta criada"
            description="Não há pautas cadastradas no momento."
            icon={<ClipboardList size={48} color={Colors.gray[400]} />}
            actionLabel={isManager ? "Criar Pauta" : undefined}
            onAction={isManager ? handleCreateTopic : undefined}
            style={styles.emptyState}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicsContainer}
            decelerationRate="fast"
            snapToInterval={292}
            snapToAlignment="start"
            scrollEventThrottle={16}
          >
            {topics.map((topic) => (
              <TopicCard 
                key={topic.id} 
                topic={{
                  ...topic,
                  createdBy: typeof topic.createdBy === 'string'
                    ? { id: topic.createdBy, name: 'Usuário' }
                    : topic.createdBy
                }}
                onPress={() => handleTopicPress(topic)}
                style={styles.horizontalTopicCard}
              />
            ))}
          </ScrollView>
        )}
      </View>
      
      {/* Quick Actions Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: Colors.error + '15' }]}
            onPress={() => router.push('/problems')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.error + '20' }]}>
              <AlertTriangle size={24} color={Colors.error} />
            </View>
            <Text style={styles.actionTitle}>Reportar Problema</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: Colors.warning + '15' }]}
            onPress={() => router.push('/suggestions')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.warning + '20' }]}>
              <Lightbulb size={24} color={Colors.warning} />
            </View>
            <Text style={styles.actionTitle}>Enviar Sugestão</Text>
          </TouchableOpacity>
          
          {isManager && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: Colors.primary + '15' }]}
              onPress={() => router.push('/users')}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Users size={24} color={Colors.primary} />
              </View>
              <Text style={styles.actionTitle}>Gerenciar Usuários</Text>
            </TouchableOpacity>
          )}
          
          {isManager && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: Colors.success + '15' }]}
              onPress={() => router.push('/financials')}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.success + '20' }]}>
                <DollarSign size={24} color={Colors.success} />
              </View>
              <Text style={styles.actionTitle}>Financeiro</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Services Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Serviços</Text>
        <View style={styles.servicesGrid}>
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              title={service.title}
              description={service.description}
              icon={service.icon}
              color={service.color}
              onPress={service.onPress}
              style={styles.serviceCard}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.gray[500],
    marginTop: 4,
  },
  meetingsAlertSection: {
    marginBottom: 24,
  },
  meetingsAlertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  viewAllMeetings: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  viewAllMeetingsText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 4,
  },
  topicsContainer: {
    paddingRight: 16,
    paddingBottom: 12,
    paddingLeft: 4,
  },
  horizontalTopicCard: {
    width: 280,
    marginRight: 12,
    minHeight: 150,
    marginBottom: 4,
    marginTop: 4,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '48%',
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: Colors.error + '10',
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.error + '20',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.error,
  },
  emptyState: {
    height: 200,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  debtorsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  debtorsBannerIcon: {
    marginRight: 12,
  },
  debtorsBannerContent: {
    flex: 1,
  },
  debtorsBannerTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  debtorsBannerText: {
    color: 'white',
    fontSize: 14,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: Colors.primary + '10',
  },
  restoreNewsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  restoreNewsText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});