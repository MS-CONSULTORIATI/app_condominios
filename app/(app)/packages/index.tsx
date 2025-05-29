import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { getPackages, deletePackage, subscribeToPackages } from '@/lib/firebase';
import { Package } from '@/types';
import { useAuthStore } from '@/store/auth-store';

export default function PackagesScreen() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered' | 'returned'>('all');
  const { user } = useAuthStore();

  useEffect(() => {
    // Verificar se o usuário é porteiro, gerente ou admin
    if (user?.role !== 'doorman' && user?.role !== 'admin' && user?.role !== 'manager') {
      Alert.alert('Acesso Negado', 'Apenas porteiros, gerentes e administradores podem acessar esta tela.');
      router.back();
      return;
    }

    loadPackages();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToPackages((updatedPackages) => {
      setPackages(updatedPackages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    filterPackages();
  }, [packages, searchQuery, statusFilter]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const packagesData = await getPackages();
      setPackages(packagesData);
    } catch (error) {
      console.error('Erro ao carregar encomendas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as encomendas.');
    } finally {
      setLoading(false);
    }
  };

  const filterPackages = () => {
    let filtered = packages;

    // Filtrar por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(pkg => pkg.status === statusFilter);
    }

    // Filtrar por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pkg =>
        pkg.recipientName.toLowerCase().includes(query) ||
        pkg.recipientUnit.toLowerCase().includes(query) ||
        pkg.description.toLowerCase().includes(query) ||
        (pkg.senderName && pkg.senderName.toLowerCase().includes(query))
      );
    }

    setFilteredPackages(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPackages();
    setRefreshing(false);
  };

  const handleDeletePackage = (packageId: string) => {
    Alert.alert(
      'Excluir Encomenda',
      'Tem certeza que deseja excluir esta encomenda?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePackage(packageId);
              Alert.alert('Sucesso', 'Encomenda excluída com sucesso.');
            } catch (error) {
              console.error('Erro ao excluir encomenda:', error);
              Alert.alert('Erro', 'Não foi possível excluir a encomenda.');
            }
          },
        },
      ]
    );
  };

  const handleBackPress = () => {
    router.back();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'delivered':
        return '#34C759';
      case 'returned':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'delivered':
        return 'Entregue';
      case 'returned':
        return 'Devolvida';
      default:
        return status;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderPackageItem = ({ item }: { item: Package }) => (
    <TouchableOpacity
      style={styles.packageItem}
      onPress={() => router.push(`/(app)/packages/${item.id}` as any)}
    >
      <View style={styles.packageHeader}>
        <Text style={styles.recipientName}>{item.recipientName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.recipientUnit}>Unidade: {item.recipientUnit}</Text>
      <Text style={styles.packageDescription}>{item.description}</Text>

      {item.senderName && (
        <Text style={styles.senderName}>Remetente: {item.senderName}</Text>
      )}

      <View style={styles.packageFooter}>
        <Text style={styles.packageDate}>
          {formatDate(item.createdAt)}
        </Text>
        
        <View style={styles.packageActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/(app)/packages/${item.id}?edit=true` as any)}
          >
            <Text style={styles.editButtonText}>✏️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePackage(item.id)}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const pendingCount = packages.filter(pkg => pkg.status === 'pending').length;
  const deliveredCount = packages.filter(pkg => pkg.status === 'delivered').length;
  const returnedCount = packages.filter(pkg => pkg.status === 'returned').length;

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Encomendas',
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
        {/* Estatísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{deliveredCount}</Text>
            <Text style={styles.statLabel}>Entregues</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{returnedCount}</Text>
            <Text style={styles.statLabel}>Devolvidas</Text>
          </View>
        </View>

        {/* Filtros */}
        <View style={styles.filtersContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, unidade ou descrição..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.statusFilters}>
            {['all', 'pending', 'delivered', 'returned'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusFilterButton,
                  statusFilter === status && styles.statusFilterButtonActive
                ]}
                onPress={() => setStatusFilter(status as any)}
              >
                <Text style={[
                  styles.statusFilterText,
                  statusFilter === status && styles.statusFilterTextActive
                ]}>
                  {status === 'all' ? 'Todas' : getStatusText(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FlatList
          data={filteredPackages}
          renderItem={renderPackageItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>Nenhuma encomenda</Text>
              <Text style={styles.emptyText}>
                {loading ? 'Carregando...' : 'Não há encomendas para exibir.'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />

        {/* Botão de adicionar */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(app)/packages/create' as any)}
        >
          <Text style={styles.addButtonText}>➕ Nova Encomenda</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  backButton: {
    marginRight: 16,
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  statusFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  statusFilterButtonActive: {
    backgroundColor: '#4A90E2',
  },
  statusFilterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  statusFilterTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  packageItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recipientUnit: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  senderName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageDate: {
    fontSize: 12,
    color: '#999',
  },
  packageActions: {
    flexDirection: 'row',
  },
  editButton: {
    backgroundColor: '#FF9500',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButtonText: {
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4A90E2',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 