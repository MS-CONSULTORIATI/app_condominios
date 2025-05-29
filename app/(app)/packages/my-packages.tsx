import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { getPackagesByRecipient, subscribeToUserPackages } from '@/lib/firebase';
import { Package } from '@/types';
import { useAuthStore } from '@/store/auth-store';

export default function MyPackagesScreen() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    loadPackages();

    // Subscribe to real-time updates for user's packages
    const unsubscribe = subscribeToUserPackages(user.id, (updatedPackages) => {
      setPackages(updatedPackages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const loadPackages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const packagesData = await getPackagesByRecipient(user.id);
      setPackages(packagesData);
    } catch (error) {
      console.error('Erro ao carregar encomendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPackages();
    setRefreshing(false);
  };

  const handleBackPress = () => {
    router.push('/(app)/' as any);
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
        <Text style={styles.packageDescription}>{item.description}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      {item.senderName && (
        <Text style={styles.senderName}>Remetente: {item.senderName}</Text>
      )}
      
      {item.observations && (
        <Text style={styles.observations}>Obs: {item.observations}</Text>
      )}
      
      <View style={styles.packageFooter}>
        <Text style={styles.packageDate}>Recebido em: {formatDate(item.createdAt)}</Text>
        {item.deliveredAt && (
          <Text style={styles.deliveredDate}>
            Entregue em: {formatDate(item.deliveredAt)}
          </Text>
        )}
      </View>
      
      {item.status === 'delivered' && item.signedBy && (
        <Text style={styles.signedBy}>Assinado por: {item.signedBy}</Text>
      )}
    </TouchableOpacity>
  );

  const renderStats = () => {
    const pending = packages.filter(p => p.status === 'pending').length;
    const delivered = packages.filter(p => p.status === 'delivered').length;
    const returned = packages.filter(p => p.status === 'returned').length;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{pending}</Text>
          <Text style={styles.statLabel}>Pendentes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{delivered}</Text>
          <Text style={styles.statLabel}>Entregues</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{returned}</Text>
          <Text style={styles.statLabel}>Devolvidas</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Minhas Encomendas',
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
        {renderStats()}
        
        <FlatList
          data={packages}
          renderItem={renderPackageItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {loading ? 'Carregando...' : 'Você não tem encomendas'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  packageDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
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
  senderName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  observations: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  packageFooter: {
    marginTop: 8,
  },
  packageDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  deliveredDate: {
    fontSize: 12,
    color: '#34C759',
    marginBottom: 2,
  },
  signedBy: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
}); 