import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useDebtorsStore } from '@/store/debtors-store';
import { Debtor } from '@/types';
import Colors from '@/constants/colors';
import { ArrowLeft, Ban, Edit, Trash2, Clock, AlertTriangle } from 'lucide-react-native';
import LoadingIndicator from '@/components/LoadingIndicator';
import Button from '@/components/Button';
import { formatCurrency, formatDate } from '@/utils/format';

export default function DebtorDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { getDebtor, fetchDebtors, removeDebtor, isLoading } = useDebtorsStore();
  
  const [debtor, setDebtor] = useState<Debtor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  
  useEffect(() => {
    fetchDebtors().then(() => {
      if (id) {
        const foundDebtor = getDebtor(id as string);
        setDebtor(foundDebtor || null);
      }
    });
  }, [id, fetchDebtors, getDebtor]);
  
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
  
  const handleEditDebtor = () => {
    router.push({
      pathname: `/debtor/edit/[id]` as any,
      params: { id: debtor?.id }
    });
  };
  
  const handleRemoveDebtor = () => {
    if (!debtor) return;
    
    Alert.alert(
      "Remover Inadimplente",
      `Tem certeza que deseja remover ${debtor.residentName} da lista de inadimplentes?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Remover", 
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const success = await removeDebtor(debtor.id);
              if (success) {
                Alert.alert(
                  "Sucesso",
                  "Registro removido com sucesso.",
                  [{ text: "OK", onPress: () => router.push('/debtors') }]
                );
              } else {
                Alert.alert("Erro", "Não foi possível remover o registro. Tente novamente.");
                setIsDeleting(false);
              }
            } catch (error) {
              console.error('Erro ao remover inadimplente:', error);
              Alert.alert("Erro", "Ocorreu um erro ao remover o registro.");
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };
  
  if (isLoading && !debtor) {
    return <LoadingIndicator fullScreen text="Carregando dados..." />;
  }
  
  if (!debtor) {
    return (
      <View style={styles.notFoundContainer}>
        <Clock size={48} color={Colors.gray[400]} />
        <Text style={styles.notFoundTitle}>Registro não encontrado</Text>
        <Text style={styles.notFoundDescription}>
          O registro que você está procurando não existe ou foi removido.
        </Text>
        <Button
          title="Voltar para a lista"
          onPress={() => router.push('/debtors')}
          style={styles.backButton}
        />
      </View>
    );
  }
  
  // Status para exibição
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
  
  // Cor do status
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
  
  // Verificar se está vencido
  const isOverdue = debtor.dueDate < Date.now() && debtor.status !== 'resolved';
  
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Detalhes do Inadimplente',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ marginRight: 16, marginLeft: 8 }}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          )
        }}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.residentName}>{debtor.residentName}</Text>
          <Text style={styles.unitText}>{debtor.unit}</Text>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoCard}>
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Informações Financeiras</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Valor:</Text>
              <Text style={styles.amountText}>{formatCurrency(debtor.amount)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Data de Vencimento:</Text>
              <View style={styles.dueDateContainer}>
                <Text style={[styles.infoValue, isOverdue && styles.overdueText]}>
                  {formatDate(debtor.dueDate)}
                </Text>
                {isOverdue && (
                  <AlertTriangle size={16} color={Colors.error} style={styles.overdueIcon} />
                )}
              </View>
            </View>
            
            {debtor.months !== undefined && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Meses em Atraso:</Text>
                <Text style={styles.infoValue}>{debtor.months}</Text>
              </View>
            )}
          </View>
          
          {debtor.description && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Descrição</Text>
              <Text style={styles.descriptionText}>{debtor.description}</Text>
            </View>
          )}
          
          {debtor.paymentPlan && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Plano de Pagamento</Text>
              <Text style={styles.descriptionText}>{debtor.paymentPlan}</Text>
            </View>
          )}
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEditDebtor}
            >
              <Edit size={20} color="white" />
              <Text style={styles.actionButtonText}>Editar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleRemoveDebtor}
              disabled={isDeleting}
            >
              <Trash2 size={20} color="white" />
              <Text style={styles.actionButtonText}>Remover</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.backButtonContainer}
          onPress={() => router.push('/debtors')}
        >
          <Text style={styles.backButtonText}>Voltar para a lista</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  residentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  unitText: {
    fontSize: 16,
    color: Colors.gray[600],
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: Colors.gray[600],
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  amountText: {
    fontSize: 16,
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
  descriptionText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  backButtonContainer: {
    backgroundColor: 'white',
    padding: 16,
    alignItems: 'center',
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 32,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
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
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  notFoundDescription: {
    fontSize: 16,
    color: Colors.gray[600],
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 200,
  },
}); 