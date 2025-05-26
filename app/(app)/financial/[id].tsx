import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFinancialsStore } from '@/store/financials-store';
import { useAuthStore } from '@/store/auth-store';
import { ArrowLeft, Calendar, Trash2, Plus, Upload, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Financial } from '@/types';

const CATEGORIES = [
  'Taxas', 'Manutenção', 'Obras', 'Limpeza', 'Segurança', 
  'Salários', 'Água', 'Luz', 'Internet', 'Outros'
];

export default function FinancialDetailScreen({ forcedId }: { forcedId?: string }) {
  const params = useLocalSearchParams();
  // Usar o ID forçado (se fornecido) ou o ID do parâmetro de rota
  const { id } = forcedId ? { id: forcedId } : params;
  const isNew = id === 'new';
  
  const { user: currentUser } = useAuthStore();
  const { getFinancialByIdFromFirebase, updateFinancial, createFinancial, isLoading } = useFinancialsStore();
  
  // Estado do formulário
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<'paid' | 'pending' | 'overdue'>('pending');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; uri: string }[]>([]);
  
  // Estados para pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // Verificar se o usuário atual é gerente ou admin
  const isManagerOrAdmin = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  
  // Carregar dados se estiver editando
  useEffect(() => {
    // Evita chamadas desnecessárias
    if (!isNew && id && typeof id === 'string') {
      loadFinancialData();
    }
  }, [id, isNew]);
  
  const loadFinancialData = useCallback(async () => {
    try {
      const financial = await getFinancialByIdFromFirebase(id as string);
      if (financial) {
        setDescription(financial.description);
        setAmount(financial.amount.toString());
        setType(financial.type);
        setCategory(financial.category);
        setDate(new Date(financial.date));
        if (financial.dueDate) {
          setDueDate(new Date(financial.dueDate));
        }
        setStatus(financial.status);
        if (financial.notes) {
          setNotes(financial.notes);
        }
        if (financial.attachments) {
          setAttachments(financial.attachments);
        }
      } else {
        Alert.alert("Erro", "Registro financeiro não encontrado");
        router.back();
      }
    } catch (error) {
      console.error("Erro ao carregar registro financeiro:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados do registro financeiro");
      router.back();
    }
  }, [id, getFinancialByIdFromFirebase]);
  
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };
  
  const onDueDateChange = (event: any, selectedDate?: Date) => {
    setShowDueDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };
  
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled === false) {
        const newAttachment = {
          name: result.assets[0].name,
          uri: result.assets[0].uri,
        };
        setAttachments([...attachments, newAttachment]);
      }
    } catch (error) {
      console.error("Erro ao selecionar documento:", error);
      Alert.alert("Erro", "Não foi possível selecionar o documento");
    }
  };
  
  const takePicture = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permissão necessária", "É necessário conceder permissão para acessar a câmera");
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!result.canceled) {
        const newAttachment = {
          name: `foto_${Date.now()}.jpg`,
          uri: result.assets[0].uri,
        };
        setAttachments([...attachments, newAttachment]);
      }
    } catch (error) {
      console.error("Erro ao capturar imagem:", error);
      Alert.alert("Erro", "Não foi possível capturar a imagem");
    }
  };
  
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permissão necessária", "É necessário conceder permissão para acessar a galeria");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!result.canceled) {
        const newAttachment = {
          name: `imagem_${Date.now()}.jpg`,
          uri: result.assets[0].uri,
        };
        setAttachments([...attachments, newAttachment]);
      }
    } catch (error) {
      console.error("Erro ao selecionar imagem:", error);
      Alert.alert("Erro", "Não foi possível selecionar a imagem");
    }
  };
  
  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };
  
  const validateForm = () => {
    if (!description.trim()) {
      Alert.alert("Erro", "A descrição é obrigatória");
      return false;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Erro", "O valor deve ser um número maior que zero");
      return false;
    }
    return true;
  };
  
  const handleSave = async () => {
    if (!validateForm() || isLoading) return;
    
    const financialData: Omit<Financial, 'id' | 'createdAt'> = {
      description: description.trim(),
      amount: Number(amount),
      type,
      category,
      date: date.getTime(),
      status,
      createdBy: currentUser?.id || '',
      notes: notes.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    
    if (dueDate && type === 'expense' && status === 'pending') {
      financialData.dueDate = dueDate.getTime();
    }
    
    try {
      if (isNew) {
        await createFinancial(financialData);
        Alert.alert("Sucesso", "Registro financeiro criado com sucesso", [
          { text: "OK", onPress: () => router.push('/financials') }
        ]);
      } else {
        await updateFinancial(id as string, financialData);
        Alert.alert("Sucesso", "Registro financeiro atualizado com sucesso", [
          { text: "OK", onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error("Erro ao salvar registro financeiro:", error);
      Alert.alert("Erro", isNew 
        ? "Não foi possível criar o registro financeiro" 
        : "Não foi possível atualizar o registro financeiro"
      );
    }
  };
  
  // Redirecionar usuários sem permissão
  if (!isManagerOrAdmin) {
    router.back();
    return null;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/financials')}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isNew ? "Novo Registro Financeiro" : "Editar Registro Financeiro"}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formField}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Descreva o registro financeiro"
            maxLength={100}
          />
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.label}>Valor</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentedButton,
                type === 'income' && styles.segmentedButtonActive,
                type === 'income' && { backgroundColor: Colors.success + '20' }
              ]}
              onPress={() => setType('income')}
            >
              <Text
                style={[
                  styles.segmentedButtonText,
                  type === 'income' && { color: Colors.success, fontWeight: '500' }
                ]}
              >
                Receita
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentedButton,
                type === 'expense' && styles.segmentedButtonActive,
                type === 'expense' && { backgroundColor: Colors.error + '20' }
              ]}
              onPress={() => setType('expense')}
            >
              <Text
                style={[
                  styles.segmentedButtonText,
                  type === 'expense' && { color: Colors.error, fontWeight: '500' }
                ]}
              >
                Despesa
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.label}>Categoria</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text>{category}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.label}>Data</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.dateContainer}>
              <Calendar size={16} color={Colors.gray[500]} />
              <Text style={styles.dateText}>{formatDate(date)}</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {type === 'expense' && status === 'pending' && (
          <View style={styles.formField}>
            <Text style={styles.label}>Data de Vencimento</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDueDatePicker(true)}
            >
              <View style={styles.dateContainer}>
                <Calendar size={16} color={Colors.gray[500]} />
                <Text style={styles.dateText}>
                  {dueDate ? formatDate(dueDate) : 'Selecionar data'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.formField}>
          <Text style={styles.label}>Status</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowStatusModal(true)}
          >
            <Text>{status === 'paid' ? 'Pago' : status === 'pending' ? 'Pendente' : 'Vencido'}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.label}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Observações adicionais"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.formField}>
          <Text style={styles.label}>Anexos</Text>
          
          <View style={styles.attachmentActions}>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={pickDocument}
            >
              <Upload size={16} color={Colors.primary} />
              <Text style={styles.attachmentButtonText}>Arquivo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={takePicture}
            >
              <Upload size={16} color={Colors.primary} />
              <Text style={styles.attachmentButtonText}>Câmera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={pickImage}
            >
              <Upload size={16} color={Colors.primary} />
              <Text style={styles.attachmentButtonText}>Galeria</Text>
            </TouchableOpacity>
          </View>
          
          {attachments.length > 0 && (
            <View style={styles.attachmentList}>
              {attachments.map((attachment, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {attachment.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.attachmentRemoveButton}
                    onPress={() => removeAttachment(index)}
                  >
                    <X size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isNew ? "Criar Registro" : "Salvar Alterações"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
      
      {showDueDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display="default"
          onChange={onDueDateChange}
        />
      )}
      
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Selecionar Categoria</Text>
            <ScrollView>
              {CATEGORIES.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.modalItem}
                  onPress={() => {
                    setCategory(item);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    category === item && styles.selectedModalItemText
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Selecionar Status</Text>
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setStatus('paid');
                setShowStatusModal(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                status === 'paid' && styles.selectedModalItemText,
                status === 'paid' && { color: Colors.success }
              ]}>
                Pago
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setStatus('pending');
                setShowStatusModal(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                status === 'pending' && styles.selectedModalItemText,
                status === 'pending' && { color: Colors.warning }
              ]}>
                Pendente
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setStatus('overdue');
                setShowStatusModal(false);
              }}
            >
              <Text style={[
                styles.modalItemText,
                status === 'overdue' && styles.selectedModalItemText,
                status === 'overdue' && { color: Colors.error }
              ]}>
                Vencido
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowStatusModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  formField: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[200],
    borderRadius: 8,
    padding: 4,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentedButtonActive: {
    backgroundColor: Colors.card,
  },
  segmentedButtonText: {
    fontSize: 16,
    color: Colors.gray[600],
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
    color: Colors.text,
  },
  attachmentActions: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  attachmentButtonText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 4,
  },
  attachmentList: {
    marginTop: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  attachmentName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  attachmentRemoveButton: {
    padding: 4,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedModalItemText: {
    fontWeight: '600',
    color: Colors.primary,
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: Colors.gray[200],
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[700],
  },
}); 