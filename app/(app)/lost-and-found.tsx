import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { router, useFocusEffect, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getLostAndFoundItems, getUserProfile } from '@/lib/firebase';
import { LostAndFoundItem } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Colors from '@/constants/colors';
import { ArrowLeft, Search, User, CheckCircle } from 'lucide-react-native';

export default function LostAndFoundScreen() {
  const [items, setItems] = useState<LostAndFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'lost' | 'found' | 'resolved'>('all');
  const [userNames, setUserNames] = useState<{[key: string]: string}>({});

  const loadItems = async () => {
    try {
      setLoading(true);
      const fetchedItems = await getLostAndFoundItems();
      setItems(fetchedItems);
      
      // Carregar nomes de usuários de maneira eficiente
      const userIds = [...new Set(fetchedItems.map(item => item.createdBy))];
      const userPromises = userIds.map(async (userId) => {
        if (typeof userId !== 'string') return { userId: 'unknown', name: 'Usuário desconhecido' };
        
        try {
          const user = await getUserProfile(userId);
          return { userId, name: user?.name || 'Usuário desconhecido' };
        } catch (error) {
          console.error(`Erro ao carregar usuário ${userId}:`, error);
          return { userId, name: 'Usuário desconhecido' };
        }
      });
      
      const users = await Promise.all(userPromises);
      const userNameMap = users.reduce((map, user) => {
        map[user.userId] = user.name;
        return map;
      }, {} as {[key: string]: string});
      
      setUserNames(userNameMap);
      
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      console.log('Tela de achados e perdidos recebeu foco, recarregando itens...');
      loadItems();
      return () => {
        // Função de limpeza se necessário
      };
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadItems();
  };

  const navigateToDetails = (item: LostAndFoundItem) => {
    router.push({
      pathname: '/(app)/lost-and-found/[id]',
      params: { id: item.id }
    });
  };

  const navigateToCreate = () => {
    router.push('/(app)/lost-and-found/create');
  };

  const handleGoBack = () => {
    router.back();
  };

  const filteredItems = React.useMemo(() => {
    if (filter === 'all') {
      return items;
    } else if (filter === 'resolved') {
      return items.filter(item => item.status === 'resolved');
    } else {
      // Para 'lost' e 'found', mostrar apenas itens ativos (não resolvidos)
      return items.filter(item => item.category === filter && item.status === 'active');
    }
  }, [items, filter]);

  const renderItem = ({ item }: { item: LostAndFoundItem }) => {
    const date = new Date(item.date);
    const timeAgo = formatDistanceToNow(date, { locale: ptBR, addSuffix: true });
    const creatorId = typeof item.createdBy === 'string' ? item.createdBy : 'unknown';
    const userName = userNames[creatorId] || 'Carregando...';
    
    return (
      <TouchableOpacity 
        style={styles.itemCard}
        onPress={() => navigateToDetails(item)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardContent}>
            <View style={styles.tagContainer}>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>
                  {item.category === 'lost' ? 'Perdido' : 'Encontrado'}
                </Text>
              </View>
              
              {item.status === 'resolved' && (
                <View style={styles.statusTag}>
                  <Text style={styles.statusText}>Devolvido</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
            
            <View style={styles.locationContainer}>
              <FontAwesome name="map-marker" size={16} color={Colors.primary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
            
            <Text style={styles.itemInfo}>
              <Text style={styles.timeIcon}>🕒</Text> {timeAgo}
            </Text>
            <Text style={styles.itemInfo}>
              <User size={14} color="#666" /> {userName}
            </Text>
          </View>
          
          {item.images && item.images.length > 0 ? (
            <Image 
              source={{ uri: item.images[0] }} 
              style={styles.itemImage} 
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.itemImage, styles.noImage]}>
              <FontAwesome 
                name={item.category === 'lost' ? 'search' : 'question'} 
                size={24} 
                color="#ccc" 
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Achados e Perdidos',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={handleGoBack}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          )
        }} 
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Achados e Perdidos</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={navigateToCreate}
          >
            <FontAwesome name="plus" size={20} color="white" />
            <Text style={styles.addButtonText}>Adicionar Item</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScrollContent}>
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
              onPress={() => setFilter('all')}
            >
              <FontAwesome name="list" size={16} color={filter === 'all' ? Colors.primary : '#666'} style={styles.filterIcon} />
              <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>Todos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'lost' && styles.activeFilter]}
              onPress={() => setFilter('lost')}
            >
              <FontAwesome name="search" size={16} color={filter === 'lost' ? Colors.primary : '#666'} style={styles.filterIcon} />
              <Text style={[styles.filterText, filter === 'lost' && styles.activeFilterText]}>Perdidos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'found' && styles.activeFilter]}
              onPress={() => setFilter('found')}
            >
              <FontAwesome name="question" size={16} color={filter === 'found' ? Colors.primary : '#666'} style={styles.filterIcon} />
              <Text style={[styles.filterText, filter === 'found' && styles.activeFilterText]}>Encontrados</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'resolved' && styles.activeFilter]}
              onPress={() => setFilter('resolved')}
            >
              <CheckCircle size={16} color={filter === 'resolved' ? Colors.success : '#666'} style={styles.filterIcon} />
              <Text style={[styles.filterText, filter === 'resolved' && styles.activeFilterText]}>Devolvidos</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Carregando itens...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Search size={50} color="#ccc" />
            <Text style={styles.emptyText}>Nenhum item encontrado</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all' 
                ? 'Perdeu ou encontrou algo? Clique no botão acima para registrar.' 
                : filter === 'lost' 
                  ? 'Nenhum item perdido registrado.'
                  : filter === 'found'
                    ? 'Nenhum item encontrado registrado.'
                    : 'Nenhum item foi devolvido ainda.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                colors={[Colors.primary]}
              />
            }
          />
        )}
        
        <TouchableOpacity 
          style={styles.fab} 
          onPress={navigateToCreate}
        >
          <FontAwesome name="plus" size={24} color="#fff" />
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 4,
  },
  filters: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filtersScrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: Colors.gray[100],
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  activeFilter: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    padding: 16,
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: Colors.primary + '20',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  itemInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  noImage: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.gray[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  statusTag: {
    backgroundColor: Colors.success + '20',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: Colors.primary + '10',
    padding: 8,
    borderRadius: 6,
  },
  locationText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
  },
  timeIcon: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
}); 