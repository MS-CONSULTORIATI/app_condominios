import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTopicsStore } from '@/store/topics-store';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { ArrowLeft, AlertTriangle } from 'lucide-react-native';
import Input from '@/components/Input';
import Button from '@/components/Button';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import { Topic } from '@/types';

type PriorityOption = 'low' | 'medium' | 'high';

export default function EditTopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchTopicById, currentTopic, isLoading, error, updateTopic } = useTopicsStore();
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityOption>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  
  useEffect(() => {
    if (!isManager) {
      // Redirect non-managers back to the home screen
      Alert.alert('Acesso negado', 'Você não tem permissão para editar pautas.');
      router.replace('/');
      return;
    }
    
    if (id) {
      fetchTopicById(id);
    }
  }, [id, isManager]);
  
  useEffect(() => {
    if (currentTopic) {
      setTitle(currentTopic.title || '');
      setDescription(currentTopic.description || '');
      setPriority((currentTopic.priority as PriorityOption) || 'medium');
    }
  }, [currentTopic]);
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, informe o título da pauta.');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Erro', 'Por favor, informe a descrição da pauta.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const updatedData: Partial<Topic> = {
        title: title.trim(),
        description: description.trim(),
        priority,
      };
      
      await updateTopic(id as string, updatedData);
      
      setIsSubmitting(false);
      Alert.alert(
        'Sucesso',
        'Pauta atualizada com sucesso!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Erro', 'Não foi possível atualizar a pauta. Tente novamente.');
    }
  };
  
  const handleBackPress = () => {
    router.back();
  };
  
  if (isLoading) {
    return <LoadingIndicator fullScreen text="Carregando pauta..." />;
  }
  
  if (error) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            headerTitle: 'Editar Pauta',
            headerLeft: () => (
              <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
            )
          }} 
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchTopicById(id as string)}
          >
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }
  
  if (!currentTopic) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            headerTitle: 'Editar Pauta',
            headerLeft: () => (
              <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
            )
          }} 
        />
        <EmptyState
          title="Pauta não encontrada"
          description="A pauta que você está tentando editar não existe ou foi removida."
          icon={<AlertTriangle size={48} color={Colors.error} />}
          actionLabel="Voltar"
          onAction={handleBackPress}
          style={styles.emptyState}
        />
      </>
    );
  }
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Editar Pauta',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          )
        }} 
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Text style={styles.headerTitle}>Editar Pauta</Text>
            
            <View style={styles.formGroup}>
              <Input
                label="Título"
                value={title}
                onChangeText={setTitle}
                placeholder="Digite o título da pauta"
                maxLength={100}
              />
              
              <Input
                label="Descrição"
                value={description}
                onChangeText={setDescription}
                placeholder="Descreva a pauta detalhadamente"
                multiline
                numberOfLines={4}
                style={styles.textArea}
              />
              
              <Text style={styles.label}>Prioridade</Text>
              <View style={styles.priorityContainer}>
                <TouchableOpacity 
                  style={[
                    styles.priorityOption,
                    priority === 'low' && styles.prioritySelected,
                    priority === 'low' && { borderColor: Colors.primary }
                  ]}
                  onPress={() => setPriority('low')}
                >
                  <Text 
                    style={[
                      styles.priorityText,
                      priority === 'low' && styles.priorityTextSelected,
                      priority === 'low' && { color: Colors.primary }
                    ]}
                  >
                    Baixa
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.priorityOption,
                    priority === 'medium' && styles.prioritySelected,
                    priority === 'medium' && { borderColor: Colors.warning }
                  ]}
                  onPress={() => setPriority('medium')}
                >
                  <Text 
                    style={[
                      styles.priorityText,
                      priority === 'medium' && styles.priorityTextSelected,
                      priority === 'medium' && { color: Colors.warning }
                    ]}
                  >
                    Média
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.priorityOption,
                    priority === 'high' && styles.prioritySelected,
                    priority === 'high' && { borderColor: Colors.error }
                  ]}
                  onPress={() => setPriority('high')}
                >
                  <Text 
                    style={[
                      styles.priorityText,
                      priority === 'high' && styles.priorityTextSelected,
                      priority === 'high' && { color: Colors.error }
                    ]}
                  >
                    Alta
                  </Text>
                </TouchableOpacity>
              </View>
              
              <Button
                title="Atualizar Pauta"
                onPress={handleSubmit}
                loading={isSubmitting}
                style={styles.submitButton}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
  },
  formGroup: {
    gap: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    alignItems: 'center',
    backgroundColor: 'white',
  },
  prioritySelected: {
    borderWidth: 2,
  },
  priorityText: {
    fontSize: 14,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  priorityTextSelected: {
    fontWeight: 'bold',
  },
  submitButton: {
    marginTop: 24,
  },
  backButton: {
    marginRight: 16,
    marginLeft: 16,
    backgroundColor: Colors.primary + '30',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    backgroundColor: Colors.card,
  },
}); 