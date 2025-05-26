import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useProblemsStore } from '@/store/problems-store';
import { useAuthStore } from '@/store/auth-store';
import ProblemCard from '@/components/ProblemCard';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import Colors from '@/constants/colors';
import { AlertTriangle, Plus, ArrowLeft, Search, Filter, X } from 'lucide-react-native';
import { Problem } from '@/types';

export default function ProblemsScreen() {
  const { problems, fetchProblems, isLoading, error } = useProblemsStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Status tabs
  const tabs = [
    { id: 'all', label: 'Todos' },
    { id: 'pending', label: 'Pendentes' },
    { id: 'in_progress', label: 'Em Progresso' },
    { id: 'resolved', label: 'Resolvidos' },
  ];

  useEffect(() => {
    fetchProblems();
  }, []);

  const handleProblemPress = (problem: Problem) => {
    console.log('Navegando para o problema:', problem.id, problem.title);
    router.push({
      pathname: '/problem/[id]',
      params: { id: problem.id }
    });
  };

  const handleCreateProblem = () => {
    router.push('/problem/create');
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
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  // Filter problems based on active tab, search query, and sort order
  const filteredProblems = problems
    .filter(problem => {
      // Filter by status tab
      if (activeTab !== 'all' && problem.status !== activeTab) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          problem.title.toLowerCase().includes(query) ||
          problem.description.toLowerCase().includes(query) ||
          problem.location.toLowerCase().includes(query)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by creation date
      if (sortOrder === 'newest') {
        return b.createdAt - a.createdAt;
      } else {
        return a.createdAt - b.createdAt;
      }
    });

  if (isLoading && problems.length === 0) {
    return <LoadingIndicator fullScreen text="Carregando problemas..." />;
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
              placeholder="Pesquisar problemas..."
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
            <Text style={styles.title}>Problemas</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={toggleSearch} style={styles.actionButton}>
                <Search size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleSortOrder} style={styles.actionButton}>
                <Filter size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateProblem} style={styles.addButton}>
                <Plus size={20} color={Colors.primary} />
                <Text style={styles.addButtonText}>Reportar</Text>
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
          Ordenado por: {sortOrder === 'newest' ? 'Mais recentes' : 'Mais antigos'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Ocorreu um erro ao carregar os problemas. Tente novamente.
          </Text>
          <TouchableOpacity onPress={fetchProblems} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProblems.length === 0 ? (
        <EmptyState
          title={searchQuery ? "Nenhum resultado encontrado" : "Nenhum problema reportado"}
          description={
            searchQuery
              ? `Não encontramos problemas para "${searchQuery}"`
              : activeTab !== 'all'
                ? `Não há problemas com status "${tabs.find(tab => tab.id === activeTab)?.label}"`
                : "Não há problemas reportados no momento."
          }
          icon={<AlertTriangle size={48} color={Colors.gray[400]} />}
          actionLabel={activeTab !== 'all' ? "Voltar para Todos" : "Reportar Problema"}
          onAction={activeTab !== 'all' ? () => setActiveTab('all') : handleCreateProblem}
        />
      ) : (
        <FlatList
          data={filteredProblems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProblemCard problem={item} onPress={() => handleProblemPress(item)} />
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