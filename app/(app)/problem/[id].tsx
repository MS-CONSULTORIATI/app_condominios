import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert, Linking, TextInput, Modal, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useProblemsStore } from '@/store/problems-store';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import Colors from '@/constants/colors';
import { MapPin, Calendar, Clock, User, ArrowLeft, FileText, Download, Edit, Trash, CheckCircle, Eye, X } from 'lucide-react-native';
import { formatDate } from '@/utils/date';
import LoadingIndicator from '@/components/LoadingIndicator';
import { Problem, StatusComment } from '@/types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getUserProfile } from '@/lib/firebase';

export default function ProblemDetailScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const { problems, fetchProblems, updateProblem, deleteProblem, recordView, isLoading, error } = useProblemsStore();
  const { user } = useAuthStore();
  const { users, fetchUsers } = useUsersStore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  useEffect(() => {
    if (!id) {
      Alert.alert('Erro', 'ID do problema não encontrado');
      router.back();
      return;
    }
    
    const loadProblem = async () => {
      console.log('Carregando problema com ID:', id);
      await fetchProblems();
      await fetchUsers(); // Buscar usuários para obter informações do criador
      setLoading(false);
    };
    
    loadProblem();
  }, [id]);
  
  useEffect(() => {
    if (!loading && problems.length > 0 && id) {
      console.log('Procurando problema com ID:', id);
      console.log('Total de problemas:', problems.length);
      const foundProblem = problems.find(p => p.id === id);
      
      if (foundProblem) {
        console.log('Problema encontrado:', foundProblem.title);
        setProblem(foundProblem);
        
        // Registrar visualização se o usuário estiver logado
        if (user) {
          recordView(id, user.id);
        }
        
        // Buscar informações do criador se tivermos apenas o ID
        if (typeof foundProblem.createdBy === 'string') {
          const foundUser = users.find(u => u.id === foundProblem.createdBy);
          if (foundUser) {
            console.log('Usuário criador encontrado na store:', foundUser.name);
            setCreatorName(foundUser.name);
          } else {
            console.log('Buscando dados do criador via API:', foundProblem.createdBy);
            getUserProfile(foundProblem.createdBy as string)
              .then(userProfile => {
                if (userProfile) {
                  console.log('Perfil do criador encontrado via API:', userProfile.name);
                  setCreatorName(userProfile.name);
                } else {
                  console.log('Perfil do criador não encontrado');
                  setCreatorName('Usuário');
                }
              })
              .catch(error => {
                console.error('Erro ao buscar perfil do criador:', error);
                setCreatorName('Usuário');
              });
          }
        }
      } else {
        console.log('Problema não encontrado com ID:', id);
        setProblem(null);
      }
    }
  }, [problems, users, loading, id]);
  
  const handleDownloadDocument = async (docUrl: string, docName: string) => {
    try {
      setDownloading(true);
      
      if (Platform.OS === 'web') {
        // Para web, apenas abrir o link
        Linking.openURL(docUrl);
        setDownloading(false);
        return;
      }
      
      // Para dispositivos móveis, fazer download e compartilhar
      const fileUri = FileSystem.documentDirectory + docName;
      const downloadResult = await FileSystem.downloadAsync(docUrl, fileUri);
      
      if (downloadResult.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo');
        }
      } else {
        Alert.alert('Erro', 'Falha ao baixar o documento');
      }
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      Alert.alert('Erro', 'Não foi possível baixar o documento');
    } finally {
      setDownloading(false);
    }
  };
  
  const updateProblemStatus = async (status: 'pending' | 'in_progress' | 'resolved') => {
    if (problem) {
      try {
        const updateData: Partial<Problem> = { status };
        
        // Adicionar data de resolução e comentário se resolvido
        if (status === 'resolved') {
          updateData.resolvedAt = Date.now();
          
          // Adicionar comentário se fornecido
          if (statusComment.trim()) {
            updateData.statusComment = {
              comment: statusComment.trim(),
              updatedAt: Date.now(),
              updatedBy: user?.id || ''
            };
          }
        } else if (status === 'in_progress' && statusComment.trim()) {
          // Para problemas em progresso, adicionar comentário explicando as ações tomadas
          updateData.statusComment = {
            comment: statusComment.trim(),
            updatedAt: Date.now(),
            updatedBy: user?.id || ''
          };
        }
        
        await updateProblem(problem.id, updateData);
        await fetchProblems();
        setStatusComment('');
        Alert.alert('Sucesso', 'Status do problema atualizado com sucesso');
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        Alert.alert('Erro', 'Não foi possível atualizar o status do problema');
      }
    }
  };
  
  const handleDeleteProblem = () => {
    Alert.alert(
      'Excluir Problema',
      'Tem certeza que deseja excluir este problema? Esta ação não pode ser desfeita.',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProblem(id);
              Alert.alert('Sucesso', 'Problema excluído com sucesso!');
              router.push('/problems');
            } catch (error) {
              console.error('Erro ao excluir problema:', error);
              Alert.alert('Erro', 'Não foi possível excluir o problema. Tente novamente.');
            }
          }
        }
      ]
    );
  };
  
  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setModalVisible(true);
  };
  
  if (loading || !problem) {
    return <LoadingIndicator fullScreen text="Carregando problema..." />;
  }
  
  const getStatusColor = () => {
    switch (problem.status) {
      case 'pending':
        return Colors.warning;
      case 'in_progress':
        return Colors.primary;
      case 'resolved':
        return Colors.success;
      default:
        return Colors.gray[500];
    }
  };

  const getStatusText = () => {
    switch (problem.status) {
      case 'pending':
        return 'Pendente';
      case 'in_progress':
        return 'Em Progresso';
      case 'resolved':
        return 'Resolvido';
      default:
        return problem.status;
    }
  };
  
  // Verificar se o usuário atual é o criador do problema
  const isCreator = user && problem && 
    (typeof problem.createdBy === 'string' 
      ? problem.createdBy === user.id 
      : problem.createdBy.id === user.id);
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/problems')} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Problema</Text>
        {(user?.role === 'admin' || (typeof problem.createdBy === 'string' && user?.id === problem.createdBy) || 
            (typeof problem.createdBy !== 'string' && user?.id === problem.createdBy.id)) && (
          <TouchableOpacity onPress={handleDeleteProblem} style={styles.deleteButton}>
            <Trash size={20} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.card}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{problem.title}</Text>
          <View style={[styles.badge, { backgroundColor: getStatusColor() + '20' }]}>
            <Text style={[styles.badgeText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
        
        <Text style={styles.description}>{problem.description}</Text>
        
        <View style={styles.infoItem}>
          <MapPin size={18} color={Colors.gray[500]} />
          <Text style={styles.infoText}>{problem.location}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Calendar size={18} color={Colors.gray[500]} />
          <Text style={styles.infoText}>
            <Text>Reportado em </Text>
            <Text>{problem.createdAt ? formatDate(problem.createdAt) : 'data desconhecida'}</Text>
          </Text>
        </View>
        
        <View style={styles.infoItem}>
          <User size={18} color={Colors.gray[500]} />
          <Text style={styles.infoText}>
            <Text>Por </Text>
            <Text>{
              typeof problem.createdBy === 'string'
                ? (creatorName || 'Carregando...')
                : problem.createdBy && problem.createdBy.name
                  ? problem.createdBy.name
                  : 'Usuário'
            }</Text>
          </Text>
        </View>
        
        <View style={styles.infoItem}>
          <Eye size={18} color={Colors.gray[500]} />
          <Text style={styles.infoText}>
            <Text>{problem.viewCount || 0} visualizações</Text>
          </Text>
        </View>
        
        {problem.images && Array.isArray(problem.images) && problem.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Imagens</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesContainer}
            >
              {problem.images.map((imageUrl, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => handleImagePress(imageUrl)}
                >
                  <Image 
                    source={{ uri: imageUrl }} 
                    style={styles.image} 
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {problem.documents && Array.isArray(problem.documents) && problem.documents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documentos</Text>
            {problem.documents.map((doc, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.documentItem}
                onPress={() => doc && doc.uri && doc.name && handleDownloadDocument(doc.uri, doc.name)}
                disabled={downloading}
              >
                <FileText size={20} color={Colors.primary} />
                <Text style={styles.documentName}>{doc?.name || 'Documento'}</Text>
                <Download size={18} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Exibir comentário do status se existir */}
        {problem.statusComment && (
          <View style={styles.commentContainer}>
            <Text style={styles.commentTitle}>Comentário do Síndico:</Text>
            <Text style={styles.commentText}>{problem.statusComment.comment}</Text>
            <Text style={styles.commentMeta}>
              <Text>{typeof creatorName === 'string' && problem.statusComment.updatedBy === problem.createdBy 
                ? creatorName 
                : 'Síndico'}</Text>
              <Text> - </Text>
              <Text>{formatDate(problem.statusComment.updatedAt)}</Text>
            </Text>
          </View>
        )}
        
        {/* Exibir mensagem de resolução se resolvido */}
        {problem.status === 'resolved' && problem.resolvedAt && !problem.statusComment && (
          <View style={styles.resolvedContainer}>
            <CheckCircle size={20} color={Colors.success} />
            <Text style={styles.resolvedText}>
              <Text>Problema resolvido em </Text>
              <Text>{formatDate(problem.resolvedAt)}</Text>
            </Text>
          </View>
        )}
        
        {/* Ações do síndico apenas (agora só manager, não admin) */}
        {user && user.role === 'manager' && (
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>Ações do Síndico</Text>
            
            <View style={styles.commentInputContainer}>
              <Text style={styles.commentInputLabel}>Comentário sobre este problema:</Text>
              <TextInput
                style={styles.commentInput}
                value={statusComment}
                onChangeText={setStatusComment}
                placeholder="Digite um comentário sobre o problema ou resolução..."
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.statusButtons}>
              <TouchableOpacity 
                style={[
                  styles.statusButton, 
                  problem.status === 'pending' && styles.activeStatusButton,
                  { borderColor: Colors.warning }
                ]}
                onPress={() => updateProblemStatus('pending')}
              >
                <Text style={[
                  styles.statusButtonText,
                  problem.status === 'pending' && styles.activeStatusButtonText,
                  { color: Colors.warning }
                ]}>
                  Pendente
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.statusButton, 
                  problem.status === 'in_progress' && styles.activeStatusButton,
                  { borderColor: Colors.primary }
                ]}
                onPress={() => updateProblemStatus('in_progress')}
              >
                <Text style={[
                  styles.statusButtonText,
                  problem.status === 'in_progress' && styles.activeStatusButtonText,
                  { color: Colors.primary }
                ]}>
                  Em Progresso
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.statusButton, 
                  problem.status === 'resolved' && styles.activeStatusButton,
                  { borderColor: Colors.success }
                ]}
                onPress={() => updateProblemStatus('resolved')}
              >
                <Text style={[
                  styles.statusButtonText,
                  problem.status === 'resolved' && styles.activeStatusButtonText,
                  { color: Colors.success }
                ]}>
                  Resolvido
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Mensagem para usuários não síndicos */}
        {user && user.role !== 'manager' && problem.status !== 'pending' && !problem.statusComment && (
          <View style={styles.statusMessageContainer}>
            <Text style={styles.statusMessageText}>
              {problem.status === 'in_progress' 
                ? <Text>Este problema está sendo resolvido pela administração.</Text> 
                : <Text>Este problema foi marcado como resolvido.</Text>}
            </Text>
          </View>
        )}
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <X size={24} color="white" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    backgroundColor: Colors.card,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.gray[700],
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.gray[700],
  },
  section: {
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  imagesContainer: {
    paddingBottom: 8,
    gap: 12,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  actionsContainer: {
    marginTop: 24,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  activeStatusButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeStatusButtonText: {
    fontWeight: '700',
  },
  commentContainer: {
    backgroundColor: Colors.gray[100],
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  commentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  commentText: {
    fontSize: 14,
    color: Colors.gray[800],
    marginBottom: 8,
    lineHeight: 20,
  },
  commentMeta: {
    fontSize: 12,
    color: Colors.gray[500],
    textAlign: 'right',
  },
  commentInputContainer: {
    marginBottom: 16,
  },
  commentInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    textAlignVertical: 'top',
  },
  resolvedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  resolvedText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500',
  },
  statusMessageContainer: {
    backgroundColor: Colors.gray[100],
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  statusMessageText: {
    fontSize: 14,
    color: Colors.gray[700],
    textAlign: 'center',
  },
  deleteButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
}); 