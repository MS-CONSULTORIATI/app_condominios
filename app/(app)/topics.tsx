import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTopicsStore } from '@/store/topics-store';
import { useAuthStore } from '@/store/auth-store';
import TopicCard from '@/components/TopicCard';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/colors';
import { PlusCircle, Archive, Flag, Clock, CheckCircle, XCircle, FilterX, ArrowLeft, Calendar } from 'lucide-react-native';
import { Topic } from '@/types';

// Constante para cor branca já que não existe no objeto Colors
const WHITE_COLOR = '#FFFFFF';

export default function TopicsScreen() {
  const { topics, fetchTopics, isLoading, error } = useTopicsStore();
  const { user } = useAuthStore();
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    fetchTopics();
  }, []);

  useEffect(() => {
    let filtered = [...topics];
    
    if (statusFilter) {
      filtered = filtered.filter(topic => topic.status === statusFilter);
    }
    
    if (priorityFilter) {
      filtered = filtered.filter(topic => topic.priority === priorityFilter);
    }
    
    // Sort by createdAt, newest first
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    
    setFilteredTopics(filtered);
  }, [topics, statusFilter, priorityFilter]);

  const handleTopicPress = (topic: Topic) => {
    router.push({
      pathname: '/topic/[id]',
      params: { id: topic.id }
    });
  };

  const handleCreateTopic = () => {
    router.push('/topic/create');
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => prev === status ? null : status);
  };

  const togglePriorityFilter = (priority: string) => {
    setPriorityFilter(prev => prev === priority ? null : priority);
  };

  const clearFilters = () => {
    setStatusFilter(null);
    setPriorityFilter(null);
  };

  const handleGoBack = () => {
    router.back();
  };

  if (isLoading && topics.length === 0) {
    return <LoadingIndicator fullScreen text="Carregando pautas..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
        <Text style={styles.title}>Pautas</Text>
        </View>
        {isManager && (
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={handleCreateTopic}
          >
            <PlusCircle size={20} color={Colors.primary} />
            <Text style={styles.createButtonText}>Nova Pauta</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Filtros:</Text>
        
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              statusFilter === 'active' && styles.filterButtonActive
            ]}
            onPress={() => toggleStatusFilter('active')}
          >
            <CheckCircle size={16} color={statusFilter === 'active' ? WHITE_COLOR : Colors.success} />
            <Text style={[
              styles.filterButtonText,
              statusFilter === 'active' && styles.filterButtonTextActive
            ]}>Ativas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              statusFilter === 'archived' && styles.filterButtonActive
            ]}
            onPress={() => toggleStatusFilter('archived')}
          >
            <Archive size={16} color={statusFilter === 'archived' ? WHITE_COLOR : Colors.gray[600]} />
            <Text style={[
              styles.filterButtonText,
              statusFilter === 'archived' && styles.filterButtonTextActive
            ]}>Arquivadas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              priorityFilter === 'high' && styles.filterButtonActiveHigh
            ]}
            onPress={() => togglePriorityFilter('high')}
          >
            <Flag size={16} color={priorityFilter === 'high' ? WHITE_COLOR : Colors.error} />
            <Text style={[
              styles.filterButtonText,
              priorityFilter === 'high' && styles.filterButtonTextActive
            ]}>Alta</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              priorityFilter === 'medium' && styles.filterButtonActiveMedium
            ]}
            onPress={() => togglePriorityFilter('medium')}
          >
            <Flag size={16} color={priorityFilter === 'medium' ? WHITE_COLOR : Colors.warning} />
            <Text style={[
              styles.filterButtonText,
              priorityFilter === 'medium' && styles.filterButtonTextActive
            ]}>Média</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              priorityFilter === 'low' && styles.filterButtonActiveLow
            ]}
            onPress={() => togglePriorityFilter('low')}
          >
            <Flag size={16} color={priorityFilter === 'low' ? WHITE_COLOR : Colors.success} />
            <Text style={[
              styles.filterButtonText,
              priorityFilter === 'low' && styles.filterButtonTextActive
            ]}>Baixa</Text>
          </TouchableOpacity>
          
          {(statusFilter || priorityFilter) && (
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={clearFilters}
            >
              <FilterX size={16} color={Colors.primary} />
              <Text style={styles.clearFiltersText}>Limpar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {error ? (
        <View style={styles.errorContainer}>
          <XCircle size={30} color={Colors.error} />
          <Text style={styles.errorText}>Erro ao carregar pautas</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchTopics()}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filteredTopics.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Clock size={50} color={Colors.gray[400]} />
          <Text style={styles.emptyTitle}>Nenhuma pauta encontrada</Text>
          <Text style={styles.emptyText}>
            {statusFilter || priorityFilter 
              ? "Tente remover os filtros para ver mais pautas" 
              : "Não há pautas cadastradas no momento"}
          </Text>
          {isManager && !statusFilter && !priorityFilter && (
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={handleCreateTopic}
            >
              <Text style={styles.emptyButtonText}>Criar Pauta</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredTopics}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              style={[
                styles.topicCard,
                index % 2 === 0 ? styles.evenCard : styles.oddCard
              ]}
              onPress={() => handleTopicPress(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardStatusContainer}>
                  {item.status === 'active' ? (
                    <CheckCircle size={14} color={Colors.success} />
                  ) : (
                    <Archive size={14} color={Colors.gray[600]} />
                  )}
                  <Text style={styles.cardStatusText}>
                    {item.status === 'active' ? 'Ativa' : 'Arquivada'}
                  </Text>
                </View>
                
                <View style={[
                  styles.cardPriorityContainer, 
                  { 
                    borderColor: item.priority === 'high' 
                      ? Colors.error 
                      : item.priority === 'medium' 
                        ? Colors.warning 
                        : Colors.success 
                  }
                ]}>
                  <Flag size={12} color={
                    item.priority === 'high' 
                      ? Colors.error 
                      : item.priority === 'medium' 
                        ? Colors.warning 
                        : Colors.success
                  } />
                  <Text style={[
                    styles.cardPriorityText, 
                    { 
                      color: item.priority === 'high' 
                        ? Colors.error 
                        : item.priority === 'medium' 
                          ? Colors.warning 
                          : Colors.success 
                    }
                  ]}>
                    {item.priority === 'high' 
                      ? 'Alta' 
                      : item.priority === 'medium' 
                        ? 'Média' 
                        : 'Baixa'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.cardDateContainer}>
                  <Calendar size={14} color={Colors.gray[500]} />
                  <Text style={styles.cardDateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                
                <Text style={styles.cardAuthor}>
                  Por: {typeof item.createdBy === 'string' 
                    ? 'Usuário' 
                    : item.createdBy.name}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  createButtonText: {
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
  },
  filterButtonActive: {
    backgroundColor: Colors.gray[700],
  },
  filterButtonActiveHigh: {
    backgroundColor: Colors.error,
  },
  filterButtonActiveMedium: {
    backgroundColor: Colors.warning,
  },
  filterButtonActiveLow: {
    backgroundColor: Colors.success,
  },
  filterButtonText: {
    fontSize: 12,
    color: Colors.gray[800],
    marginLeft: 4,
  },
  filterButtonTextActive: {
    color: WHITE_COLOR,
    fontWeight: '500',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
  },
  clearFiltersText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  topicCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
  },
  evenCard: {
    borderLeftColor: Colors.primary,
  },
  oddCard: {
    borderLeftColor: Colors.success,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cardStatusText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.gray[700],
    marginLeft: 4,
  },
  cardPriorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardPriorityText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.gray[700],
    marginBottom: 8,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    paddingTop: 8,
  },
  cardDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDateText: {
    fontSize: 11,
    color: Colors.gray[600],
    marginLeft: 4,
  },
  cardAuthor: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
  listContent: {
    padding: 10,
    paddingBottom: 100,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.error,
    marginTop: 12,
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: WHITE_COLOR,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: WHITE_COLOR,
    fontWeight: '500',
  },
}); 