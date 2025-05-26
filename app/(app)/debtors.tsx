import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useDebtorsStore } from '@/store/debtors-store';
import Colors from '@/constants/colors';
import { Plus, Ban, AlertTriangle, Edit, Trash2, ArrowRight, Clock, ArrowLeft } from 'lucide-react-native';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import { formatCurrency } from '@/utils/format';

// Formatar data para exibição
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('pt-BR');
};

const DebtorCard = ({ 
  debtor, 
  onPress, 
  onEdit, 
  onDelete 
}: { 
  debtor: any; 
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  // Determinar se está atrasado (data de vencimento < hoje)
  const isOverdue = debtor.dueDate < Date.now();
  
  // Definir cor com base no status
  const getStatusColor = () => {
    switch (debtor.status) {
      case 'resolved':
        return Colors.success;
      case 'negotiating':
        return Colors.warning;
      case 'pending':
      default:
        return Colors.error;
    }
  };

  // Texto do status
  const getStatusText = () => {
    switch (debtor.status) {
      case 'resolved':
        return 'Regularizado';
      case 'negotiating':
        return 'Em negociação';
      case 'pending':
      default:
        return 'Pendente';
    }
  };
  
  return (
    <TouchableOpacity
      style={styles.debtorCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.residentName}>{debtor.residentName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>
      
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Unidade:</Text>
          <Text style={styles.detailValue}>{debtor.unit}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Valor:</Text>
          <Text style={styles.amountText}>{formatCurrency(debtor.amount)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Vencimento:</Text>
          <View style={styles.dueDateContainer}>
            <Text style={[
              styles.detailValue,
              isOverdue && styles.overdueText
            ]}>
              {formatDate(debtor.dueDate)}
            </Text>
            {isOverdue && (
              <AlertTriangle size={14} color={Colors.error} style={styles.overdueIcon} />
            )}
          </View>
        </View>
        
        {debtor.months && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Meses em atraso:</Text>
            <Text style={styles.detailValue}>{debtor.months}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onEdit}
        >
          <Edit size={18} color={Colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onDelete}
        >
          <Trash2 size={18} color={Colors.error} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={onPress}
        >
          <Text style={styles.viewButtonText}>Detalhes</Text>
          <ArrowRight size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function DebtorsScreen() {
  const { user } = useAuthStore();
  const { debtors, fetchDebtors, removeDebtor, isLoading, error, getStats } = useDebtorsStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'negotiating' | 'resolved'>('all');
  
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  
  // Estatísticas
  const stats = getStats();
  
  useEffect(() => {
    fetchDebtors();
  }, []);

  const handleBackPress = () => {
    router.push('/');
  };
  
  // Verificação de permissão
  if (!isManager) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Ban size={64} color={Colors.error} />
        <Text style={styles.accessDeniedTitle}>Acesso Restrito</Text>
        <Text style={styles.accessDeniedText}>
          Esta seção é restrita a administradores e síndicos.
        </Text>
      </View>
    );
  }

  const handleAddDebtor = () => {
    router.push('/debtor/create');
  };
  
  const handleEditDebtor = (debtorId: string) => {
    router.push({
      pathname: `/debtor/edit/[id]` as any,
      params: { id: debtorId }
    });
  };
  
  const handleViewDebtor = (debtorId: string) => {
    router.push({
      pathname: `/debtor/[id]` as any,
      params: { id: debtorId }
    });
  };
  
  const handleDeleteDebtor = (debtorId: string, name: string) => {
    Alert.alert(
      "Remover Inadimplente",
      `Tem certeza que deseja remover ${name} da lista de inadimplentes?`,
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const success = await removeDebtor(debtorId);
            if (success) {
              Alert.alert("Sucesso", "Registro removido com sucesso.");
            }
          }
        }
      ]
    );
  };
  
  // Filtrar inadimplentes
  const filteredDebtors = filter === 'all' 
    ? debtors 
    : debtors.filter(debtor => debtor.status === filter);
  
  if (isLoading && debtors.length === 0) {
    return <LoadingIndicator fullScreen text="Carregando inadimplentes..." />;
  }
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Inadimplentes',
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Inadimplentes</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddDebtor}
          >
            <Plus size={20} color="white" />
            <Text style={styles.addButtonText}>Cadastrar</Text>
          </TouchableOpacity>
        </View>
        
        {/* Estatísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats.amount)}</Text>
            <Text style={styles.statLabel}>Valor Total</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pendingCount}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrency(stats.pendingAmount)}</Text>
            <Text style={styles.statLabel}>A Receber</Text>
          </View>
        </View>
        
        {/* Filtros */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'all' && styles.activeFilterButton
            ]}
            onPress={() => setFilter('all')}
          >
            <Text style={[
              styles.filterText,
              filter === 'all' && styles.activeFilterText
            ]}>
              Todos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'pending' && styles.activeFilterButton
            ]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[
              styles.filterText,
              filter === 'pending' && styles.activeFilterText
            ]}>
              Pendentes
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'negotiating' && styles.activeFilterButton
            ]}
            onPress={() => setFilter('negotiating')}
          >
            <Text style={[
              styles.filterText,
              filter === 'negotiating' && styles.activeFilterText
            ]}>
              Em Negociação
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'resolved' && styles.activeFilterButton
            ]}
            onPress={() => setFilter('resolved')}
          >
            <Text style={[
              styles.filterText,
              filter === 'resolved' && styles.activeFilterText
            ]}>
              Regularizados
            </Text>
          </TouchableOpacity>
        </View>
        
        {error ? (
          <View style={styles.errorContainer}>
            <AlertTriangle size={48} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchDebtors}
            >
              <Text style={styles.retryText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        ) : filteredDebtors.length === 0 ? (
          <EmptyState
            title={filter === 'all' 
              ? "Nenhum inadimplente cadastrado" 
              : `Nenhum inadimplente ${
                  filter === 'pending' ? 'pendente' : 
                  filter === 'negotiating' ? 'em negociação' : 'regularizado'
                }`
            }
            description="Clique no botão abaixo para cadastrar um novo inadimplente."
            icon={<Clock size={48} color={Colors.gray[400]} />}
            actionLabel="Cadastrar Inadimplente"
            onAction={handleAddDebtor}
            style={styles.emptyState}
          />
        ) : (
          <View style={styles.listContainer}>
            <FlatList
              data={filteredDebtors}
              renderItem={({ item }) => (
                <DebtorCard 
                  debtor={item}
                  onPress={() => handleViewDebtor(item.id)}
                  onEdit={() => handleEditDebtor(item.id)}
                  onDelete={() => handleDeleteDebtor(item.id, item.residentName)}
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
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
  backButton: {
    marginRight: 16,
    marginLeft: 8,
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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  statCard: {
    width: '50%',
    padding: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 4,
    backgroundColor: Colors.gray[100],
  },
  activeFilterButton: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  activeFilterText: {
    color: 'white',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  debtorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  residentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  amountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.error,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overdueText: {
    color: Colors.error,
  },
  overdueIcon: {
    marginLeft: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    paddingTop: 12,
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 14,
    color: Colors.primary,
    marginRight: 4,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: Colors.gray[600],
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: Colors.error + '20',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
}); 