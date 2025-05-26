import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  SafeAreaView
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useNewsStore } from '@/store/news-store';
import Colors from '@/constants/colors';
import { 
  ArrowLeft, 
  Plus, 
  Newspaper, 
  Calendar, 
  Eye, 
  Filter,
  BookMarked,
  Archive,
  Send,
  ThumbsUp
} from 'lucide-react-native';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import { formatDate } from '@/utils/format';
import { News } from '@/types';

type StatusFilter = 'all' | 'published' | 'draft' | 'archived';

const NewsCard = ({ 
  news, 
  onPress 
}: { 
  news: News; 
  onPress: () => void;
}) => {
  // Calcular data formatada
  const formattedDate = formatDate(news.publishDate);
  
  return (
    <TouchableOpacity
      style={[
        styles.card,
        news.status === 'draft' && styles.draftCard,
        news.status === 'archived' && styles.archivedCard
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {news.status !== 'published' && (
        <View style={[
          styles.statusBadge,
          news.status === 'draft' ? styles.draftBadge : styles.archivedBadge
        ]}>
          <Text style={styles.statusBadgeText}>
            {news.status === 'draft' ? 'RASCUNHO' : 'ARQUIVADO'}
          </Text>
        </View>
      )}
      
      {news.featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>DESTAQUE</Text>
        </View>
      )}
      
      <View style={styles.cardContent}>
        {news.coverImage ? (
          <Image source={{ uri: news.coverImage }} style={styles.cardImage} />
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Newspaper size={40} color={Colors.gray[300]} />
          </View>
        )}
        
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {news.title}
          </Text>
          
          {news.summary ? (
            <Text style={styles.cardSummary} numberOfLines={2}>
              {news.summary}
            </Text>
          ) : (
            <Text style={styles.cardSummary} numberOfLines={2}>
              {news.content.substring(0, 100)}
              {news.content.length > 100 ? '...' : ''}
            </Text>
          )}
          
          <View style={styles.cardFooter}>
            <View style={styles.dateContainer}>
              <Calendar size={14} color={Colors.gray[500]} />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            
            <View style={styles.statsContainer}>
            {news.viewCount !== undefined && (
              <View style={styles.viewsContainer}>
                <Eye size={14} color={Colors.gray[500]} />
                <Text style={styles.viewsText}>{news.viewCount}</Text>
              </View>
            )}
              
              {news.likeCount !== undefined && news.likeCount > 0 && (
                <View style={styles.likesContainer}>
                  <ThumbsUp size={14} color={Colors.gray[500]} />
                  <Text style={styles.likesText}>{news.likeCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function NewsScreen() {
  const { user } = useAuthStore();
  const { 
    news, 
    isLoading, 
    fetchNews,
    getPublishedNews,
    getDraftNews,
    getArchivedNews
  } = useNewsStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Verificar se o usuário é gerente
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  };
  
  const handleBackPress = () => {
    router.back();
  };
  
  const handleAddNews = () => {
    if (!isManager) {
      Alert.alert("Permissão negada", "Apenas gerentes podem criar notícias.");
      return;
    }
    
    router.push('/news/create');
  };
  
  const handleNewsPress = (newsId: string) => {
    router.push({
      pathname: `/news/[id]`,
      params: { id: newsId }
    });
  };
  
  // Filtrar notícias com base no filtro selecionado
  const getFilteredNews = () => {
    switch (statusFilter) {
      case 'published':
        return getPublishedNews();
      case 'draft':
        return isManager ? getDraftNews() : [];
      case 'archived':
        return isManager ? getArchivedNews() : [];
      default:
        return isManager ? news : getPublishedNews();
    }
  };
  
  const filteredNews = getFilteredNews();
  
  if (isLoading && news.length === 0) {
    return <LoadingIndicator fullScreen text="Carregando notícias..." />;
  }
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Notícias',
          headerShown: false
        }} 
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notícias</Text>
          {isManager && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddNews}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        
        {isManager && (
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === 'all' && styles.filterButtonActive
              ]}
              onPress={() => setStatusFilter('all')}
            >
              <Newspaper size={16} color={statusFilter === 'all' ? 'white' : Colors.gray[600]} />
              <Text style={[
                styles.filterText,
                statusFilter === 'all' && styles.filterTextActive
              ]}>
                Todos
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === 'published' && styles.filterButtonActive
              ]}
              onPress={() => setStatusFilter('published')}
            >
              <Send size={16} color={statusFilter === 'published' ? 'white' : Colors.gray[600]} />
              <Text style={[
                styles.filterText,
                statusFilter === 'published' && styles.filterTextActive
              ]}>
                Publicados
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === 'draft' && styles.filterButtonActive
              ]}
              onPress={() => setStatusFilter('draft')}
            >
              <BookMarked size={16} color={statusFilter === 'draft' ? 'white' : Colors.gray[600]} />
              <Text style={[
                styles.filterText,
                statusFilter === 'draft' && styles.filterTextActive
              ]}>
                Rascunhos
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                statusFilter === 'archived' && styles.filterButtonActive
              ]}
              onPress={() => setStatusFilter('archived')}
            >
              <Archive size={16} color={statusFilter === 'archived' ? 'white' : Colors.gray[600]} />
              <Text style={[
                styles.filterText,
                statusFilter === 'archived' && styles.filterTextActive
              ]}>
                Arquivados
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {filteredNews.length === 0 ? (
          <EmptyState
            icon={<Newspaper size={48} color={Colors.gray[400]} />}
            title={
              statusFilter === 'all' 
                ? "Nenhuma notícia encontrada" 
                : statusFilter === 'published'
                  ? "Nenhuma notícia publicada"
                  : statusFilter === 'draft'
                    ? "Nenhum rascunho disponível"
                    : "Nenhuma notícia arquivada"
            }
            description={
              isManager 
                ? "Clique no botão + para criar uma nova notícia."
                : "Ainda não há notícias publicadas."
            }
            actionLabel={isManager ? "Criar Notícia" : undefined}
            onAction={isManager ? handleAddNews : undefined}
          />
        ) : (
          <FlatList
            data={filteredNews}
            renderItem={({ item }) => (
              <NewsCard
                news={item}
                onPress={() => handleNewsPress(item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[Colors.primary]}
              />
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    justifyContent: 'space-between'
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: Colors.gray[600],
    marginLeft: 4,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  draftCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  archivedCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.gray[400],
    opacity: 0.8,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    zIndex: 10,
  },
  draftBadge: {
    backgroundColor: Colors.warning,
  },
  archivedBadge: {
    backgroundColor: Colors.gray[500],
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    zIndex: 10,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    flexDirection: 'row',
  },
  cardImage: {
    width: 100,
    height: 'auto',
    aspectRatio: 1,
    borderRadius: 8,
    margin: 12,
  },
  noImagePlaceholder: {
    width: 100,
    height: 'auto',
    aspectRatio: 1,
    borderRadius: 8,
    margin: 12,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    padding: 12,
    paddingLeft: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  cardSummary: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 8,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: Colors.gray[500],
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  viewsText: {
    fontSize: 12,
    color: Colors.gray[500],
    marginLeft: 4,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likesText: {
    fontSize: 12,
    color: Colors.gray[500],
    marginLeft: 4,
  },
}); 