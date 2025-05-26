import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  TextInput,
  ScrollView,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import { useFinancialsStore } from '@/store/financials-store';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Filter, 
  DollarSign, 
  Trash2, 
  Edit, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  FileText,
  Calendar
} from 'lucide-react-native';
import { Financial } from '@/types';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import { formatCurrency } from '@/utils/formatters';

const CATEGORIES = [
  'Taxas', 'Manutenção', 'Obras', 'Limpeza', 'Segurança', 
  'Salários', 'Água', 'Luz', 'Internet', 'Outros'
];

const FinancialCard = ({ 
  financial, 
  onPress, 
  onEdit, 
  onDelete 
}: { 
  financial: Financial; 
  onPress: (financial: Financial) => void;
  onEdit: (financial: Financial) => void;
  onDelete: (financial: Financial) => void;
}) => {
  const isExpense = financial.type === 'expense';
  const isPending = financial.status === 'pending';
  const isOverdue = financial.status === 'overdue';
  
  // Status color
  let statusColor = Colors.success;
  if (isPending) statusColor = Colors.warning;
  if (isOverdue) statusColor = Colors.error;
  
  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
  };
  
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(financial)}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          {isExpense ? (
            <ArrowDownCircle size={24} color={Colors.error} />
          ) : (
            <ArrowUpCircle size={24} color={Colors.success} />
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{financial.description}</Text>
          <Text style={styles.cardCategory}>{financial.category}</Text>
        </View>
        <View style={styles.cardAmount}>
          <Text style={[styles.amountText, { color: isExpense ? Colors.error : Colors.success }]}>
            {isExpense ? '-' : '+'}{formatCurrency(financial.amount)}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Calendar size={16} color={Colors.gray[500]} />
          <Text style={styles.detailText}>
            {formatDate(financial.date)}
          </Text>
        </View>
        
        {financial.dueDate && isPending && (
          <View style={styles.detailItem}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              Vencimento: {formatDate(financial.dueDate)}
            </Text>
          </View>
        )}
        
        <View style={styles.detailItem}>
          <Text style={[styles.statusBadge, { backgroundColor: statusColor + '20', color: statusColor }]}>
            {financial.status === 'paid' ? 'Pago' : 
             financial.status === 'pending' ? 'Pendente' : 'Vencido'}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onEdit(financial)}
        >
          <Edit size={16} color={Colors.primary} />
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: Colors.error + '15' }]}
          onPress={() => onDelete(financial)}
        >
          <Trash2 size={16} color={Colors.error} />
          <Text style={[styles.actionButtonText, { color: Colors.error }]}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function FinancialsScreen() {
  const { financials, fetchFinancials, deleteFinancial, isLoading, error, clearError } = useFinancialsStore();
  const { user: currentUser } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  // Verificar se o usuário atual é gerente ou admin
  const isManagerOrAdmin = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  
  useEffect(() => {
    fetchFinancials();
  }, []);
  
  // Filtragem de registros financeiros
  const filteredFinancials = financials.filter(financial => {
    // Filtragem por texto de busca
    const matchesSearch = !searchQuery ||
      financial.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      financial.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filtragem por tipo (receita/despesa)
    const matchesType = typeFilter === 'all' || financial.type === typeFilter;
    
    // Filtragem por status
    const matchesStatus = statusFilter === 'all' || financial.status === statusFilter;
    
    // Filtragem por categoria
    const matchesCategory = !categoryFilter || financial.category === categoryFilter;
    
    return matchesSearch && matchesType && matchesStatus && matchesCategory;
  });
  
  // Calcular totais
  const totals = financials.reduce((acc, financial) => {
    if (financial.type === 'income') {
      acc.income += financial.amount;
    } else {
      acc.expense += financial.amount;
    }
    return acc;
  }, { income: 0, expense: 0 });
  
  const balance = totals.income - totals.expense;
  
  const handleViewFinancial = (financial: Financial) => {
    // Implementar visualização detalhada do registro financeiro
    Alert.alert(
      financial.description,
      `Valor: ${formatCurrency(financial.amount)}\nCategoria: ${financial.category}\nStatus: ${financial.status}`
    );
  };
  
  const handleEditFinancial = (financial: Financial) => {
    // Navegar para a tela de edição
    router.push(`/financial/${financial.id}`);
  };
  
  const handleDeleteFinancial = (financial: Financial) => {
    Alert.alert(
      "Confirmar exclusão",
      `Tem certeza que deseja excluir o registro "${financial.description}"?`,
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        { 
          text: "Excluir", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFinancial(financial.id);
              Alert.alert("Sucesso", "Registro financeiro excluído com sucesso.");
            } catch (error) {
              Alert.alert("Erro", "Não foi possível excluir o registro financeiro.");
            }
          }
        }
      ]
    );
  };
  
  if (!isManagerOrAdmin) {
    // Redirecionar usuários sem permissão
    router.back();
    return null;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestão Financeira</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/financial/new')}
        >
          <Plus size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Receitas</Text>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            {formatCurrency(totals.income)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Despesas</Text>
          <Text style={[styles.summaryValue, { color: Colors.error }]}>
            {formatCurrency(totals.expense)}
          </Text>
        </View>
        <View style={[styles.summaryItem, styles.balanceItem]}>
          <Text style={styles.summaryLabel}>Saldo</Text>
          <Text style={[styles.summaryValue, { color: balance >= 0 ? Colors.success : Colors.error }]}>
            {formatCurrency(balance)}
          </Text>
        </View>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar registro..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              typeFilter === 'all' && styles.activeFilterChip
            ]}
            onPress={() => setTypeFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                typeFilter === 'all' && styles.activeFilterChipText
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterChip,
              typeFilter === 'income' && styles.activeFilterChip,
              typeFilter === 'income' && { backgroundColor: Colors.success + '20', borderColor: Colors.success }
            ]}
            onPress={() => setTypeFilter('income')}
          >
            <Text
              style={[
                styles.filterChipText,
                typeFilter === 'income' && { color: Colors.success, fontWeight: '500' }
              ]}
            >
              Receitas
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterChip,
              typeFilter === 'expense' && styles.activeFilterChip,
              typeFilter === 'expense' && { backgroundColor: Colors.error + '20', borderColor: Colors.error }
            ]}
            onPress={() => setTypeFilter('expense')}
          >
            <Text
              style={[
                styles.filterChipText,
                typeFilter === 'expense' && { color: Colors.error, fontWeight: '500' }
              ]}
            >
              Despesas
            </Text>
          </TouchableOpacity>
          
          <View style={styles.filterDivider} />
          
          <TouchableOpacity
            style={[
              styles.filterChip,
              statusFilter === 'all' && styles.activeFilterChip
            ]}
            onPress={() => setStatusFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'all' && styles.activeFilterChipText
              ]}
            >
              Todos status
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterChip,
              statusFilter === 'paid' && styles.activeFilterChip,
              statusFilter === 'paid' && { backgroundColor: Colors.success + '20', borderColor: Colors.success }
            ]}
            onPress={() => setStatusFilter('paid')}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'paid' && { color: Colors.success, fontWeight: '500' }
              ]}
            >
              Pagos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterChip,
              statusFilter === 'pending' && styles.activeFilterChip,
              statusFilter === 'pending' && { backgroundColor: Colors.warning + '20', borderColor: Colors.warning }
            ]}
            onPress={() => setStatusFilter('pending')}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'pending' && { color: Colors.warning, fontWeight: '500' }
              ]}
            >
              Pendentes
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterChip,
              statusFilter === 'overdue' && styles.activeFilterChip,
              statusFilter === 'overdue' && { backgroundColor: Colors.error + '20', borderColor: Colors.error }
            ]}
            onPress={() => setStatusFilter('overdue')}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'overdue' && { color: Colors.error, fontWeight: '500' }
              ]}
            >
              Vencidos
            </Text>
          </TouchableOpacity>
        </ScrollView>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              categoryFilter === null && styles.activeFilterChip
            ]}
            onPress={() => setCategoryFilter(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                categoryFilter === null && styles.activeFilterChipText
              ]}
            >
              Todas categorias
            </Text>
          </TouchableOpacity>
          
          {CATEGORIES.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterChip,
                categoryFilter === category && styles.activeFilterChip
              ]}
              onPress={() => setCategoryFilter(category)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  categoryFilter === category && styles.activeFilterChipText
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {isLoading && financials.length === 0 ? (
        <LoadingIndicator fullScreen text="Carregando registros..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Ocorreu um erro ao carregar os registros financeiros.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              clearError();
              fetchFinancials();
            }}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filteredFinancials.length === 0 ? (
        <EmptyState
          title={searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || categoryFilter
            ? "Nenhum registro encontrado" 
            : "Nenhum registro financeiro"
          }
          description={searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || categoryFilter
            ? "Tente alterar os filtros de busca"
            : "Não há registros financeiros cadastrados"
          }
          icon={<DollarSign size={48} color={Colors.gray[400]} />}
        />
      ) : (
        <FlatList
          data={filteredFinancials}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FinancialCard 
              financial={item} 
              onPress={handleViewFinancial}
              onEdit={handleEditFinancial}
              onDelete={handleDeleteFinancial}
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceItem: {
    flex: 1.5,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.text,
  },
  filterScrollContent: {
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  activeFilterChip: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.text,
  },
  activeFilterChipText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.gray[300],
    marginHorizontal: 4,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  cardCategory: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  cardAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: Colors.gray[700],
    marginLeft: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
}); 