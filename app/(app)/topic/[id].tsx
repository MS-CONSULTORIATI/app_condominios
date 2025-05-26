import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Alert,
  Linking
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTopicsStore } from '@/store/topics-store';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { 
  Calendar, 
  Clock, 
  User, 
  AlertTriangle, 
  ArrowLeft,
  FileText,
  Download,
  Image as ImageIcon,
  Trash,
  Edit2,
  Edit,
  Archive,
  File
} from 'lucide-react-native';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import { formatDate, formatRelativeTime } from '@/utils/date';
import VotingPanel from '../../components/VotingPanel';
import * as ImagePicker from 'expo-image-picker';
import TopicCommentItem from '@/components/TopicCommentItem';
import TopicCommentForm from '@/components/TopicCommentForm';

export default function TopicDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentTopic, fetchTopicById, isLoading, error, updateTopic, deleteTopic } = useTopicsStore();
  const { user } = useAuthStore();
  const [updatingImage, setUpdatingImage] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Verificar se o usuário é residente
  const isResident = user?.role === 'resident';
  
  // Verificar se o usuário é o criador do tópico ou um administrador
  const isOwnerOrAdmin = user && (
    (currentTopic && typeof currentTopic.createdBy === 'string' && currentTopic.createdBy === user.id) || 
    user.role === 'admin' || 
    user.role === 'manager'
  );
  
  // Obter o nome do criador da pauta
  const creatorName = currentTopic 
    ? (typeof currentTopic.createdBy === 'string' 
      ? 'Usuário' 
      : currentTopic.createdBy.name)
    : '';
  
  useEffect(() => {
    if (id) {
      fetchTopicById(id);
    }
    
    // Limpar o tópico atual quando desmonta
    return () => {
      useTopicsStore.getState().clearCurrentTopic();
    };
  }, [id]);
  
  const handleDocumentPress = async (documentUri: string) => {
    try {
      const supported = await Linking.canOpenURL(documentUri);
      if (supported) {
        await Linking.openURL(documentUri);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir este documento.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao tentar abrir o documento.');
    }
  };
  
  const handleBackPress = () => {
    router.back();
  };

  const handleEditPress = () => {
    if (currentTopic && id) {
      router.push(`/topic/edit/${id}`);
    }
  };
  
  const handleArchivePress = () => {
    if (!currentTopic || !id) return;
    
    const newStatus = currentTopic.status === 'archived' ? 'active' : 'archived';
    const actionText = newStatus === 'archived' ? 'arquivar' : 'reativar';
    const confirmText = newStatus === 'archived' ? 'Arquivar' : 'Reativar';
    
    Alert.alert(
      `${confirmText} pauta`,
      `Tem certeza que deseja ${actionText} esta pauta?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: confirmText,
          onPress: async () => {
            try {
              await updateTopic(id, { status: newStatus });
              fetchTopicById(id);
              
              Alert.alert(
                'Sucesso', 
                `Pauta ${newStatus === 'archived' ? 'arquivada' : 'reativada'} com sucesso!`
              );
            } catch (error) {
              Alert.alert(
                'Erro', 
                `Não foi possível ${actionText} a pauta. Tente novamente.`
              );
            }
          }
        }
      ]
    );
  };
  
  const handleDeletePress = () => {
    if (!currentTopic || !id) return;
    
    Alert.alert(
      "Excluir pauta",
      "Tem certeza que deseja excluir esta pauta? Esta ação não pode ser desfeita.",
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
              await deleteTopic(id);
              Alert.alert(
                'Sucesso', 
                'Pauta excluída com sucesso!'
              );
              router.back();
            } catch (error) {
              Alert.alert(
                'Erro', 
                'Não foi possível excluir a pauta. Tente novamente.'
              );
            }
          }
        }
      ]
    );
  };
  
  const handleImageEdit = async (imageUri: string, index: number) => {
    try {
      setUpdatingImage(true);
      
      // Solicitar permissão para acessar a galeria
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de permissão para acessar suas fotos.',
          [{ text: 'OK' }]
        );
        setUpdatingImage(false);
        return;
      }
      
      // Abrir seletor de imagem
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (result.canceled) {
        setUpdatingImage(false);
        return;
      }
      
      if (!currentTopic) {
        setUpdatingImage(false);
        return;
      }
      
      // Criar uma cópia das imagens atuais
      const updatedImages = [...(currentTopic.images || [])];
      
      // Substituir a imagem no índice especificado
      updatedImages[index] = result.assets[0].uri;
      
      // Atualizar o tópico com as novas imagens
      await updateTopic(id, { images: updatedImages });
      
      // Recarregar os dados do tópico
      await fetchTopicById(id);
      
      Alert.alert('Sucesso', 'Imagem atualizada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar a imagem. Tente novamente.');
      console.error('Erro ao atualizar imagem:', error);
    } finally {
      setUpdatingImage(false);
    }
  };
  
  const handleImagePress = (imageUri: string) => {
    if (!currentTopic?.images) return;
    
    const index = currentTopic.images.findIndex(img => img === imageUri);
    if (index !== -1) {
      setSelectedImageIndex(index);
      setGalleryVisible(true);
    }
  };
  
  if (isLoading) {
    return <LoadingIndicator fullScreen text="Carregando detalhes da pauta..." />;
  }
  
  if (error) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            headerTitle: 'Detalhes da Pauta',
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
            onPress={() => fetchTopicById(id)}
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
            headerTitle: 'Detalhes da Pauta',
            headerLeft: () => (
              <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
            )
          }} 
        />
        <EmptyState
          title="Pauta não encontrada"
          description="A pauta que você está procurando não existe ou foi removida."
          icon={<AlertTriangle size={48} color={Colors.error} />}
          actionLabel="Voltar"
          onAction={handleBackPress}
          style={styles.emptyState}
        />
      </>
    );
  }
  
  const getStatusColor = () => {
    switch (currentTopic.status) {
      case 'active':
        return Colors.success;
      case 'archived':
        return Colors.error;
      default:
        return Colors.success;
    }
  };
  
  const getStatusLabel = () => {
    switch (currentTopic.status) {
      case 'active':
        return 'Ativa';
      case 'archived':
        return 'Arquivada';
      default:
        return 'Ativa';
    }
  };
  
  const getPriorityColor = () => {
    switch (currentTopic.priority) {
      case 'low':
        return Colors.primary;
      case 'medium':
        return Colors.warning;
      case 'high':
        return Colors.error;
      default:
        return Colors.primary;
    }
  };
  
  const getPriorityLabel = () => {
    switch (currentTopic.priority) {
      case 'low':
        return 'Baixa';
      case 'medium':
        return 'Média';
      case 'high':
        return 'Alta';
      default:
        return 'Média';
    }
  };
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Detalhes da Pauta',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          )
        }} 
      />
      
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{currentTopic.title}</Text>
          
          <View style={styles.statusContainer}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
              <Text style={styles.statusText}>{getStatusLabel()}</Text>
            </View>
            
            <View style={styles.statusBadge}>
              <Text style={[styles.priorityText, { color: getPriorityColor() }]}>
                Prioridade: {getPriorityLabel()}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.metaInfoContainer}>
          <View style={styles.metaInfoItem}>
            <Calendar size={16} color={Colors.gray[600]} />
            <Text style={styles.metaInfoText}>{formatDate(currentTopic.createdAt)}</Text>
          </View>
          
          <View style={styles.metaInfoItem}>
            <Clock size={16} color={Colors.gray[600]} />
            <Text style={styles.metaInfoText}>{formatRelativeTime(currentTopic.createdAt)}</Text>
          </View>
          
          <View style={styles.metaInfoItem}>
            <User size={16} color={Colors.gray[600]} />
            <Text style={styles.metaInfoText}>Por: {creatorName}</Text>
          </View>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Descrição</Text>
          <Text style={styles.description}>{currentTopic.description}</Text>
        </View>
        
        {/* Componente de votação - exibe para residentes e managers em pautas ativas */}
        {(isResident || user?.role === 'manager') && currentTopic.status === 'active' && (
          <VotingPanel 
            topicId={id} 
            onVoteSubmit={() => fetchTopicById(id)}
          />
        )}
        
        {/* Seção de Comentários */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Comentários</Text>
          
          {/* Lista de comentários */}
          {currentTopic.comments && currentTopic.comments.length > 0 ? (
            <View style={styles.commentsList}>
              {currentTopic.comments.map((comment) => (
                <TopicCommentItem key={comment.id} comment={comment} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyCommentsContainer}>
              <Text style={styles.emptyCommentsText}>
                Nenhum comentário ainda. Seja o primeiro a comentar!
              </Text>
            </View>
          )}
        </View>
        
        {currentTopic.images && currentTopic.images.length > 0 && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Imagens</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.imagesContainer}>
                {currentTopic.images.map((image, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.imageContainer}
                    onPress={() => handleImagePress(image)}
                    onLongPress={() => isOwnerOrAdmin && handleImageEdit(image, index)}
                    delayLongPress={500}
                  >
                    <Image source={{ uri: image }} style={styles.image} />
                    {isOwnerOrAdmin && (
                      <View style={styles.editImageOverlay}>
                        <Text style={styles.editImageText}>Toque longo para editar</Text>
              </View>
            )}
                    </TouchableOpacity>
                ))}
                </View>
            </ScrollView>
          </View>
        )}
        
        {currentTopic.documents && currentTopic.documents.length > 0 && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Documentos</Text>
            <View style={styles.documentsList}>
              {currentTopic.documents.map((doc, index) => (
              <TouchableOpacity 
                  key={index}
                style={styles.documentItem}
                  onPress={() => handleDocumentPress(doc.uri)}
              >
                  <File size={20} color={Colors.primary} />
                  <Text style={styles.documentName}>{doc.name}</Text>
              </TouchableOpacity>
            ))}
            </View>
          </View>
        )}
        
        {isOwnerOrAdmin && (
        <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEditPress}
            >
              <Edit size={20} color="white" />
              <Text style={styles.actionButtonText}>Editar</Text>
            </TouchableOpacity>
          
            <TouchableOpacity 
              style={[styles.actionButton, styles.archiveButton]}
              onPress={handleArchivePress}
            >
              <Archive size={20} color="white" />
              <Text style={styles.actionButtonText}>
                {currentTopic.status === 'archived' ? 'Reativar' : 'Arquivar'}
              </Text>
            </TouchableOpacity>
          
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeletePress}
            >
              <Trash size={20} color="white" />
              <Text style={styles.actionButtonText}>Excluir</Text>
            </TouchableOpacity>
          </View>
          )}
        
        {/* Espaço para o formulário de comentários fixo */}
        <View style={styles.commentFormSpace} />
      </ScrollView>
      
      {/* Formulário de comentários fixo no rodapé */}
      <View style={styles.commentFormContainer}>
        <TopicCommentForm 
          topicId={id} 
          onCommentSubmit={() => fetchTopicById(id)}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[700],
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    flexWrap: 'wrap',
  },
  metaInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaInfoText: {
    fontSize: 12,
    color: Colors.gray[600],
    marginLeft: 4,
  },
  contentSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: Colors.gray[700],
    lineHeight: 20,
  },
  imagesContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  imageContainer: {
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray[200],
    position: 'relative',
  },
  image: {
    width: 200,
    height: 150,
  },
  editImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 8,
  },
  editImageText: {
    color: 'white',
    fontSize: 14,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    marginHorizontal: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: 'white',
    marginTop: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    minWidth: 100,
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  archiveButton: {
    backgroundColor: Colors.warning,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
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
  backButton: {
    marginRight: 36,
    paddingLeft: 12,
  },
  commentsList: {
    marginTop: 12,
    marginBottom: 16,
  },
  emptyCommentsContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  emptyCommentsText: {
    color: Colors.gray[500],
    fontSize: 14,
    textAlign: 'center',
  },
  commentFormContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  commentFormSpace: {
    height: 70, // Altura estimada do form de comentários
  },
  documentsList: {
    marginTop: 12,
  },
}); 