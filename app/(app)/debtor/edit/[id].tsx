import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useDebtorsStore } from '@/store/debtors-store';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { ArrowLeft, Ban } from 'lucide-react-native';
import DatePickerWrapper from '@/components/DatePickerWrapper';
import LoadingIndicator from '@/components/LoadingIndicator';

export default function EditDebtorScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { getDebtor, updateDebtor, isLoading, error, fetchDebtors } = useDebtorsStore();
  
  const [residentName, setResidentName] = useState('');
  const [unit, setUnit] = useState('');
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState('');
  const [description, setDescription] = useState('');
  const [paymentPlan, setPaymentPlan] = useState('');
  const [status, setStatus] = useState<'pending' | 'negotiating' | 'resolved'>('pending');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  
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
  
  // Carregar dados do devedor
  useEffect(() => {
    const loadDebtor = async () => {
      try {
        await fetchDebtors();
        
        if (id) {
          const debtor = getDebtor(id as string);
          
          if (debtor) {
            setResidentName(debtor.residentName);
            setUnit(debtor.unit);
            setAmount(debtor.amount.toString());
            setMonths(debtor.months ? debtor.months.toString() : '');
            setDescription(debtor.description || '');
            setPaymentPlan(debtor.paymentPlan || '');
            setStatus(debtor.status);
            setDueDate(new Date(debtor.dueDate));
          } else {
            Alert.alert('Erro', 'Devedor não encontrado');
            router.back();
          }
        }
        
        setInitialLoading(false);
      } catch (error) {
        console.error('Erro ao carregar devedor:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados do devedor');
        setInitialLoading(false);
      }
    };
    
    loadDebtor();
  }, [id]);
  
  const handleSubmit = async () => {
    // Validação
    if (!residentName.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do morador.');
      return;
    }
    
    if (!unit.trim()) {
      Alert.alert('Erro', 'Por favor, informe a unidade (apartamento/casa).');
      return;
    }
    
    if (!amount.trim() || isNaN(parseFloat(amount.replace(',', '.')))) {
      Alert.alert('Erro', 'Por favor, informe um valor válido.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Converter valores
      const amountValue = parseFloat(amount.replace(',', '.'));
      const monthsValue = months.trim() ? parseInt(months, 10) : undefined;
      
      const debtorData = {
        id: id as string,
        residentName: residentName.trim(),
        unit: unit.trim(),
        amount: amountValue,
        dueDate: dueDate.getTime(),
        status,
        description: description.trim() || undefined,
        months: monthsValue,
        paymentPlan: paymentPlan.trim() || undefined,
      };
      
      const success = await updateDebtor(debtorData);
      
      if (success) {
        Alert.alert(
          'Sucesso',
          'Registro de inadimplência atualizado com sucesso!',
          [{ text: 'OK', onPress: () => router.push('/debtors') }]
        );
      } else {
        Alert.alert('Erro', error || 'Não foi possível atualizar o registro. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao atualizar inadimplente:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao atualizar o registro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };
  
  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };
  
  // Funções para alternar o status
  const handleStatusChange = (newStatus: 'pending' | 'negotiating' | 'resolved') => {
    setStatus(newStatus);
  };
  
  if (initialLoading) {
    return <LoadingIndicator fullScreen text="Carregando dados..." />;
  }
  
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Editar Inadimplente',
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
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.subtitle}>
          Edite os dados do morador inadimplente.
        </Text>
        
        <View style={styles.formContainer}>
          <Input
            label="Nome do Morador*"
            placeholder="Ex: João da Silva"
            value={residentName}
            onChangeText={setResidentName}
          />
          
          <Input
            label="Unidade*"
            placeholder="Ex: Apto 101 Bloco A"
            value={unit}
            onChangeText={setUnit}
          />
          
          <Input
            label="Valor (R$)*"
            placeholder="Ex: 350,00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          
          <Input
            label="Meses em Atraso"
            placeholder="Ex: 2"
            value={months}
            onChangeText={setMonths}
            keyboardType="numeric"
          />
          
          
          <DatePickerWrapper
            label="Data de Vencimento*"
            value={dueDate}
            onChange={onDateChange}
            mode="date"
          />
          
          <Text style={styles.label}>Status*</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === 'pending' && styles.statusButtonActive,
                { backgroundColor: status === 'pending' ? Colors.error + '20' : Colors.gray[100] }
              ]}
              onPress={() => handleStatusChange('pending')}
            >
              <Text style={[
                styles.statusButtonText,
                status === 'pending' && { color: Colors.error }
              ]}>
                Pendente
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === 'negotiating' && styles.statusButtonActive,
                { backgroundColor: status === 'negotiating' ? Colors.warning + '20' : Colors.gray[100] }
              ]}
              onPress={() => handleStatusChange('negotiating')}
            >
              <Text style={[
                styles.statusButtonText,
                status === 'negotiating' && { color: Colors.warning }
              ]}>
                Em Negociação
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === 'resolved' && styles.statusButtonActive,
                { backgroundColor: status === 'resolved' ? Colors.success + '20' : Colors.gray[100] }
              ]}
              onPress={() => handleStatusChange('resolved')}
            >
              <Text style={[
                styles.statusButtonText,
                status === 'resolved' && { color: Colors.success }
              ]}>
                Regularizado
              </Text>
            </TouchableOpacity>
          </View>
          
          <Input
            label="Descrição"
            placeholder="Ex: Taxa condominial mês 01/2023"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />
          
          <Input
            label="Plano de Pagamento"
            placeholder="Ex: Parcelamento em 3x"
            value={paymentPlan}
            onChangeText={setPaymentPlan}
            multiline
            numberOfLines={2}
          />
          
          <Button
            title="Salvar Alterações"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            style={styles.submitButton}
          />
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/debtors')}
          >
            <Text style={styles.backButtonText}>Voltar para a lista</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray[600],
    marginBottom: 24,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  datePickerButton: {
    backgroundColor: Colors.gray[100],
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  datePickerText: {
    fontSize: 16,
    color: Colors.text,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statusButtonActive: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[600],
  },
  submitButton: {
    marginTop: 24,
  },
  backButton: {
    marginTop: 12,
    alignItems: 'center',
    padding: 12,
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
}); 