import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSuggestionsStore } from '@/store/suggestions-store';
import { useAuthStore } from '@/store/auth-store';
import SuggestionCard from '@/components/SuggestionCard';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import Colors from '@/constants/colors';
import { Lightbulb, Plus, ArrowLeft, Search, Filter, X } from 'lucide-react-native';
import { Suggestion } from '@/types';

export default function SuggestionsScreen() {
  const { suggestions, fetchSuggestions, updateSuggestion, isLoading, error } = useSuggestionsStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'most_voted'>('newest');
  
  // Status tabs
  const tabs = [
    { id: 'all', label: 'Todas' },
    { id: 'pending', label: 'Pendentes' },
    { id: 'approved', label: 'Aprovadas' },
    { id: 'rejected', label: 'Rejeitadas' },
  ];

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleSuggestionPress = (suggestion: Suggestion) => {
    router.push({
      pathname: "/suggestion/[id]",
      params: { id: suggestion.id }
    });
  };

  const handleCreateSuggestion = () => {
    router.push('/suggestion/create');
  };
  
  const handleGoBack = () => {
    router.back();
  };
  
  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'newest' ? 'most_voted' : 'newest');
  };
  
  const handleLike = async (suggestion: Suggestion) => {
    if (!user) {
      Alert.alert('Acesso negado', 'Você precisa estar logado para curtir uma sugestão.');
      return;
    }
    
    if (user.role !== 'resident') {
      Alert.alert('Acesso restrito', 'Apenas moradores podem curtir sugestões.');
      return;
    }
    
    if (suggestion.status !== 'pending') {
      Alert.alert('Não disponível', 'Apenas sugestões pendentes podem receber curtidas.');
      return;
    }
    
    // Verificar se o usuário já curtiu esta sugestão
    const userVoted = suggestion.votedBy && suggestion.votedBy.includes(user.id);
    
    if (userVoted) {
      Alert.alert('Já curtido', 'Você já curtiu esta sugestão anteriormente.');
      return;
    }
    
    try {
      const currentVotes = suggestion.votes || 0;
      const votedBy = suggestion.votedBy || [];
      
      // Adicionar o ID do usuário ao array de usuários que já curtiram
      await updateSuggestion(suggestion.id, { 
        votes: currentVotes + 1,
        votedBy: [...votedBy, user.id]
      });
      
      await fetchSuggestions();
      Alert.alert('Sucesso', 'Sua curtida foi registrada!');
    } catch (error) {
      console.error('Erro ao curtir a sugestão:', error);
      Alert.alert('Erro', 'Não foi possível registrar sua curtida.');
    }
  };

  // Filter suggestions based on active tab, search query, and sort order
  const filteredSuggestions = suggestions
    .filter(suggestion => {
      // Filter by status tab
      if (activeTab !== 'all' && suggestion.status !== activeTab) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          suggestion.title.toLowerCase().includes(query) ||
          suggestion.description.toLowerCase().includes(query)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by creation date or votes
      if (sortOrder === 'newest') {
        return b.createdAt - a.createdAt;
      } else {
        return (b.votes || 0) - (a.votes || 0);
      }
    });

  if (isLoading && suggestions.length === 0) {
    return <LoadingIndicator fullScreen text="Carregando sugestões..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        {showSearch ? (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar sugestões..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={toggleSearch} style={styles.searchIconButton}>
              <X size={18} color={Colors.gray[500]} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Sugestões</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={toggleSearch} style={styles.actionButton}>
                <Search size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleSortOrder} style={styles.actionButton}>
                <Filter size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateSuggestion} style={styles.addButton}>
                <Plus size={20} color={Colors.primary} />
                <Text style={styles.addButtonText}>Nova Sugestão</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Status tabs */}
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          data={tabs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === item.id && styles.activeTab
              ]}
              onPress={() => setActiveTab(item.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === item.id && styles.activeTabText
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsList}
        />
      </View>

      {/* Sort order indicator */}
      <View style={styles.filterInfo}>
        <Text style={styles.filterInfoText}>
          Ordenado por: {sortOrder === 'newest' ? 'Mais recentes' : 'Mais votadas'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Ocorreu um erro ao carregar as sugestões. Tente novamente.
          </Text>
          <TouchableOpacity onPress={fetchSuggestions} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filteredSuggestions.length === 0 ? (
        <EmptyState
          title={searchQuery ? "Nenhum resultado encontrado" : "Nenhuma sugestão encontrada"}
          description={
            searchQuery
              ? `Não encontramos sugestões para "${searchQuery}"`
              : activeTab !== 'all'
                ? `Não há sugestões com status "${tabs.find(tab => tab.id === activeTab)?.label}"`
                : "Não há sugestões cadastradas no momento."
          }
          icon={<Lightbulb size={48} color={Colors.gray[400]} />}
          actionLabel={activeTab !== 'all' ? "Voltar para Todas" : "Nova Sugestão"}
          onAction={activeTab !== 'all' ? () => setActiveTab('all') : handleCreateSuggestion}
        />
      ) : (
        <FlatList
          data={filteredSuggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SuggestionCard 
              suggestion={item} 
              onPress={() => handleSuggestionPress(item)}
              onLike={user?.role === 'resident' && item.status === 'pending' && 
                (!item.votedBy || !item.votedBy.includes(user.id)) ? handleLike : undefined}
            />
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
    padding: 16,
    backgroundColor: Colors.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[200],
    borderRadius: 8,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: Colors.text,
    fontSize: 16,
  },
  searchIconButton: {
    padding: 8,
  },
  tabsContainer: {
    marginBottom: 12,
  },
  tabsList: {
    paddingRight: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: Colors.gray[200],
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  filterInfo: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  filterInfoText: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  listContent: {
    paddingBottom: 20,
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
});