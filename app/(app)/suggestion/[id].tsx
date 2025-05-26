import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert, Linking, TextInput, KeyboardAvoidingView, Keyboard, Modal, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSuggestionsStore } from '@/store/suggestions-store';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import Colors from '@/constants/colors';
import { Calendar, Clock, User, ArrowLeft, FileText, Download, ThumbsUp, Check, X, Trash, SendHorizontal, Eye, MessageCircle } from 'lucide-react-native';
import { formatDate } from '@/utils/date';
import LoadingIndicator from '@/components/LoadingIndicator';
import CommentItem from '@/components/CommentItem';
import { Suggestion, SuggestionComment } from '@/types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getUserProfile } from '@/lib/firebase';

export interface UpdateComment {
  comment: string;
  updatedAt: number;
  updatedBy: string;
}

export default function SuggestionDetailScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [statusComment, setStatusComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const commentInputRef = React.useRef<TextInput>(null);
  const { suggestions, fetchSuggestions, updateSuggestion, deleteSuggestion, addComment, recordView, isLoading, error } = useSuggestionsStore();
  const { user } = useAuthStore();
  const { users, fetchUsers } = useUsersStore();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  useEffect(() => {
    if (!id) {
      Alert.alert('Erro', 'ID da sugestão não encontrado');
      router.back();
      return;
    }
    
    const loadSuggestion = async () => {
      console.log('Carregando sugestão com ID:', id);
      await fetchSuggestions();
      await fetchUsers(); // Buscar usuários para obter informações do criador
      setLoading(false);
    };
    
    loadSuggestion();
  }, [id]);
  
  useEffect(() => {
    if (!loading && suggestions.length > 0 && id) {
      console.log('Procurando sugestão com ID:', id);
      console.log('Total de sugestões:', suggestions.length);
      const foundSuggestion = suggestions.find(s => s.id === id);
      
      if (foundSuggestion) {
        console.log('Sugestão encontrada:', foundSuggestion.title);
        setSuggestion(foundSuggestion);
        
        // Registrar visualização se o usuário estiver logado
        if (user) {
          recordView(id, user.id);
        }
        
        // Buscar informações do criador se tivermos apenas o ID
        if (typeof foundSuggestion.createdBy === 'string') {
          const foundUser = users.find(u => u.id === foundSuggestion.createdBy);
          if (foundUser) {
            console.log('Usuário criador encontrado na store:', foundUser.name);
            setCreatorName(foundUser.name);
          } else {
            console.log('Buscando dados do criador via API:', foundSuggestion.createdBy);
            getUserProfile(foundSuggestion.createdBy as string)
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
        console.log('Sugestão não encontrada com ID:', id);
        setSuggestion(null);
      }
    }
  }, [suggestions, users, loading, id]);
  
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Rolar até o final quando o teclado aparecer
        if (scrollViewRef.current) {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
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
  
  const handleLike = async () => {
    if (suggestion && user) {
      try {
        // Verificar se o usuário já curtiu esta sugestão
        const userVoted = suggestion.votedBy && suggestion.votedBy.includes(user.id);
        
        if (userVoted) {
          Alert.alert('Já curtido', 'Você já curtiu esta sugestão anteriormente.');
          return;
        }
        
        const currentVotes = suggestion.votes || 0;
        const votedBy = suggestion.votedBy || [];
        
        // Adicionar o ID do usuário ao array de usuários que já curtiram
        await updateSuggestion(suggestion.id, { 
          votes: currentVotes + 1, 
          votedBy: [...votedBy, user.id] 
        });
        
        await fetchSuggestions();
        Alert.alert('Sucesso', 'Sua curtida foi registrada!');
      } catch (error) {
        console.error('Erro ao curtir a sugestão:', error);
        Alert.alert('Erro', 'Não foi possível registrar sua curtida');
      }
    }
  };

  const handleFocusCommentInput = () => {
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      Alert.alert('Acesso negado', 'Você precisa estar logado para comentar.');
      return;
    }
    
    if (!newComment.trim()) {
      Alert.alert('Erro', 'O comentário não pode estar vazio.');
      return;
    }
    
    try {
      await addComment(id, {
        text: newComment.trim(),
        userName: user.name,
        userRole: user.role,
        userUnit: user.apartment || user.unit,
        createdBy: user.id,
      });
      
      setNewComment('');
      Alert.alert('Sucesso', 'Comentário adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o comentário. Tente novamente.');
    }
  };
  
  const updateSuggestionStatus = async (status: 'pending' | 'approved' | 'rejected') => {
    if (suggestion) {
      try {
        const updateData: Partial<Suggestion> = { status };
        
        // Adicionar data de aprovação ou rejeição
        if (status === 'approved') {
          updateData.approvedAt = Date.now();
          
          // Adicionar comentário se fornecido
          if (statusComment.trim()) {
            updateData.statusComment = {
              comment: statusComment.trim(),
              updatedAt: Date.now(),
              updatedBy: user?.id || ''
            };
          }
        } else if (status === 'rejected') {
          updateData.rejectedAt = Date.now();
          
          // Adicionar comentário se fornecido
          if (statusComment.trim()) {
            updateData.statusComment = {
              comment: statusComment.trim(),
              updatedAt: Date.now(),
              updatedBy: user?.id || ''
            };
          }
        }
        
        await updateSuggestion(suggestion.id, updateData);
        await fetchSuggestions();
        setStatusComment('');
        Alert.alert('Sucesso', 'Status da sugestão atualizado com sucesso');
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        Alert.alert('Erro', 'Não foi possível atualizar o status da sugestão');
      }
    }
  };
  
  const handleDeleteSuggestion = () => {
    Alert.alert(
      'Excluir Sugestão',
      'Tem certeza que deseja excluir esta sugestão? Esta ação não pode ser desfeita.',
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
              await deleteSuggestion(id);
              Alert.alert('Sucesso', 'Sugestão excluída com sucesso!');
              router.push('/suggestions');
            } catch (error) {
              console.error('Erro ao excluir sugestão:', error);
              Alert.alert('Erro', 'Não foi possível excluir a sugestão. Tente novamente.');
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
  
  if (loading || !suggestion) {
    return <LoadingIndicator fullScreen text="Carregando sugestão..." />;
  }
  
  const getStatusColor = () => {
    switch (suggestion.status) {
      case 'pending':
        return Colors.warning;
      case 'approved':
        return Colors.success;
      case 'rejected':
        return Colors.error;
      default:
        return Colors.gray[500];
    }
  };

  const getStatusText = () => {
    switch (suggestion.status) {
      case 'pending':
        return 'Pendente';
      case 'approved':
        return 'Aprovada';
      case 'rejected':
        return 'Rejeitada';
      default:
        return suggestion.status;
    }
  };
  
  return loading ? (
    <LoadingIndicator fullScreen text="Carregando sugestão..." />
  ) : !suggestion ? (
    <View style={styles.container}>
      <Text style={styles.errorText}>Sugestão não encontrada</Text>
      <TouchableOpacity onPress={() => router.push('/suggestions')} style={styles.backButton}>
        <ArrowLeft size={24} color={Colors.text} />
        <Text style={styles.backButtonText}>Voltar para sugestões</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/suggestions')} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhes da Sugestão</Text>
          {(user?.role === 'admin' || (typeof suggestion.createdBy === 'string' && user?.id === suggestion.createdBy) || 
              (typeof suggestion.createdBy !== 'string' && user?.id === suggestion.createdBy.id)) && (
            <TouchableOpacity onPress={handleDeleteSuggestion} style={styles.deleteButton}>
              <Trash size={20} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={[
            styles.content,
            // Adicionar espaço extra no bottom para garantir visibilidade quando o teclado estiver aberto
            { paddingBottom: Platform.OS === 'ios' ? 100 : 150 }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{suggestion.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>
          
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <User size={16} color={Colors.gray[600]} />
              <Text style={styles.metaText}>
                {typeof suggestion.createdBy === 'string' 
                  ? creatorName || 'Usuário'
                  : suggestion.createdBy.name
                }
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Calendar size={16} color={Colors.gray[600]} />
              <Text style={styles.metaText}>
                {formatDate(suggestion.createdAt)}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <ThumbsUp size={16} color={Colors.gray[600]} />
              <Text style={styles.metaText}>
                {suggestion.votes || 0} curtidas
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Eye size={16} color={Colors.gray[600]} />
              <Text style={styles.metaText}>
                {suggestion.viewCount || 0} visualizações
              </Text>
            </View>
          </View>
          
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Descrição</Text>
            <Text style={styles.descriptionText}>{suggestion.description}</Text>
          </View>
          
          {/* Seção de Status (apenas para administradores e gerentes) */}
          {user && (user.role === 'admin' || user.role === 'manager') && suggestion.status === 'pending' && (
            <View style={styles.statusUpdateContainer}>
              <Text style={styles.sectionTitle}>Atualizar Status</Text>
              <TextInput 
                style={styles.commentInput}
                placeholder="Adicione um comentário sobre a decisão..."
                multiline
                value={statusComment}
                onChangeText={setStatusComment}
                ref={commentInputRef}
                onFocus={() => {
                  setIsFocused(true);
                  // Rolar até o final quando o campo receber foco
                  if (scrollViewRef.current) {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }
                }}
                onBlur={() => setIsFocused(false)}
              />
              
              <View style={styles.statusButtons}>
                <TouchableOpacity 
                  style={[styles.statusButton, styles.rejectButton]}
                  onPress={() => updateSuggestionStatus('rejected')}
                >
                  <X size={18} color="white" />
                  <Text style={styles.statusButtonText}>Rejeitar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.statusButton, styles.approveButton]}
                  onPress={() => updateSuggestionStatus('approved')}
                >
                  <Check size={18} color="white" />
                  <Text style={styles.statusButtonText}>Aprovar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* Comentário de status */}
          {suggestion.statusComment && (
            <View style={styles.statusCommentContainer}>
              <Text style={styles.statusCommentLabel}>
                Comentário do síndico:
              </Text>
              <Text style={styles.statusCommentText}>
                {suggestion.statusComment.comment}
              </Text>
            </View>
          )}
          
          {/* Documentos e imagens */}
          {suggestion.documents && suggestion.documents.length > 0 && (
            <View style={styles.documentsContainer}>
              <Text style={styles.sectionTitle}>Documentos</Text>
              {suggestion.documents.map((doc, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.documentItem}
                  onPress={() => handleDownloadDocument(doc.uri, doc.name)}
                  disabled={downloading}
                >
                  <View style={styles.documentInfo}>
                    <FileText size={20} color={Colors.primary} />
                    <Text style={styles.documentName}>{doc.name}</Text>
                  </View>
                  <Download size={20} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {suggestion.images && suggestion.images.length > 0 && (
            <View style={styles.imagesContainer}>
              <Text style={styles.sectionTitle}>Imagens</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imagesScroll}
              >
                {suggestion.images.map((image, index) => (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => handleImagePress(image)}
                  >
                    <Image 
                      source={{ uri: image }} 
                      style={styles.image}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Seção de comentários */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsSectionHeader}>
              <Text style={styles.sectionTitle}>Comentários</Text>
              <View style={styles.commentCount}>
                <MessageCircle size={16} color={Colors.gray[600]} />
                <Text style={styles.commentCountText}>{suggestion.comments?.length || 0}</Text>
              </View>
            </View>
            
            {suggestion.comments && suggestion.comments.length > 0 ? (
              <View style={styles.commentsList}>
                {suggestion.comments.map((comment, index) => (
                  <CommentItem key={index} comment={comment} />
                ))}
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.noCommentsContainer}
                onPress={user ? handleFocusCommentInput : undefined}
                activeOpacity={user ? 0.7 : 1}
              >
                <Text style={styles.noCommentsText}>
                  Não há comentários ainda. {user ? 'Toque para adicionar um comentário!' : 'Faça login para comentar.'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
        
        {/* Botão de curtir para moradores em sugestões pendentes */}
        {user?.role === 'resident' && suggestion.status === 'pending' && !suggestion.votedBy?.includes(user.id) && (
          <View style={styles.likeButtonSection}>
            <TouchableOpacity 
              style={styles.likeButton}
              onPress={handleLike}
            >
              <ThumbsUp 
                size={20} 
                color={Colors.primary}
              />
              <Text style={styles.likeButtonText}>
                Curtir
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Formulário para adicionar comentários */}
      {user ? (
        <View style={styles.addCommentContainer}>
          <TextInput
            style={styles.addCommentInput}
            placeholder="Adicione um comentário..."
            multiline
            value={newComment}
            onChangeText={setNewComment}
            editable={true}
            ref={commentInputRef}
            onFocus={() => {
              setIsFocused(true);
              // Rolar até o final quando o campo receber foco
              if (scrollViewRef.current) {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }
            }}
            onBlur={() => setIsFocused(false)}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              !newComment.trim() && styles.sendButtonDisabled
            ]}
            onPress={handleAddComment}
            disabled={!newComment.trim()}
          >
            <SendHorizontal size={20} color={newComment.trim() ? 'white' : Colors.gray[400]} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.loginPromptContainer}>
          <Text style={styles.loginPromptText}>
            Faça login para adicionar um comentário
          </Text>
        </View>
      )}

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
    </KeyboardAvoidingView>
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
  deleteButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80, // Espaço para o campo de comentário
  },
  titleContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  descriptionContainer: {
    marginBottom: 24,
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  statusUpdateContainer: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.48,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  approveButton: {
    backgroundColor: Colors.success,
  },
  statusButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusCommentContainer: {
    backgroundColor: Colors.warning + '15',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    marginBottom: 24,
  },
  statusCommentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning,
    marginBottom: 8,
  },
  statusCommentText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  documentsContainer: {
    marginBottom: 24,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  imagesContainer: {
    marginBottom: 24,
  },
  imagesScroll: {
    gap: 12,
    paddingBottom: 8,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  likeButtonSection: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '15',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  likeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  commentsSection: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  commentsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentCountText: {
    fontSize: 14,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  commentsList: {
    marginTop: 8,
  },
  noCommentsContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
  },
  noCommentsText: {
    fontSize: 14,
    color: Colors.gray[600],
    textAlign: 'center',
  },
  addCommentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    alignItems: 'center',
    zIndex: 2,
    elevation: 3,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  addCommentInput: {
    flex: 1,
    backgroundColor: Colors.gray[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  loginPromptContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    alignItems: 'center',
  },
  loginPromptText: {
    fontSize: 14,
    color: Colors.gray[600],
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
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