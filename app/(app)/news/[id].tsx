import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useNewsStore } from '@/store/news-store';
import Colors from '@/constants/colors';
import { 
  ArrowLeft, 
  Calendar, 
  Eye, 
  Edit, 
  Trash2,
  Send,
  Archive,
  Download,
  Image as ImageIcon,
  BookMarked,
  ThumbsUp,
  MessageCircle
} from 'lucide-react-native';
import { formatDate } from '@/utils/format';
import LoadingIndicator from '@/components/LoadingIndicator';
import NewsCommentItem from '@/components/NewsCommentItem';
import NewsCommentForm from '@/components/NewsCommentForm';
import { toggleNewsLike } from '@/lib/firebase';

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { 
    getNewsItem, 
    incrementViews, 
    publishNews, 
    archiveNews, 
    removeNews, 
    fetchNews,
    isLoading 
  } = useNewsStore();
  const router = useRouter();
  const [newsItem, setNewsItem] = useState(getNewsItem(id));
  const [actionLoading, setActionLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  
  // Verificar permissões
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isLiked = user && newsItem?.likes?.includes(user.id);
  
  useEffect(() => {
    // Atualizar o item de notícia quando mudar no store
    setNewsItem(getNewsItem(id));
  }, [id, getNewsItem]);

  useEffect(() => {
    // Incrementar contagem de visualizações ao abrir a notícia
    if (newsItem && newsItem.status === 'published') {
      incrementViews(id);
    }
  }, [id, incrementViews, newsItem]);

  if (!newsItem) {
    return <LoadingIndicator fullScreen text="Carregando notícia..." />;
  }

  const handleBackPress = () => {
    router.push('/news');
  };

  const handleEditPress = () => {
    if (!isManager) {
      Alert.alert("Permissão negada", "Apenas gerentes podem editar notícias.");
      return;
    }
    
    router.push({
      pathname: `/news/edit`,
      params: { id: newsItem.id }
    });
  };

  const handleDeletePress = () => {
    if (!isManager) {
      Alert.alert("Permissão negada", "Apenas gerentes podem excluir notícias.");
      return;
    }
    
    Alert.alert(
      "Confirmar exclusão",
      "Tem certeza que deseja excluir esta notícia? Esta ação não pode ser desfeita.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            const success = await removeNews(newsItem.id);
            setActionLoading(false);
            
            if (success) {
              router.push('/news');
            } else {
              Alert.alert("Erro", "Não foi possível excluir a notícia. Tente novamente.");
            }
          }
        }
      ]
    );
  };

  const handlePublishPress = async () => {
    if (!isManager) {
      Alert.alert("Permissão negada", "Apenas gerentes podem publicar notícias.");
      return;
    }
    
    if (newsItem.status === 'published') {
      return;
    }
    
    setActionLoading(true);
    const success = await publishNews(newsItem.id);
    setActionLoading(false);
    
    if (!success) {
      Alert.alert("Erro", "Não foi possível publicar a notícia. Tente novamente.");
    }
  };

  const handleArchivePress = async () => {
    if (!isManager) {
      Alert.alert("Permissão negada", "Apenas gerentes podem arquivar notícias.");
      return;
    }
    
    if (newsItem.status === 'archived') {
      return;
    }
    
    setActionLoading(true);
    const success = await archiveNews(newsItem.id);
    setActionLoading(false);
    
    if (!success) {
      Alert.alert("Erro", "Não foi possível arquivar a notícia. Tente novamente.");
    }
  };

  const handleDocumentPress = (uri: string) => {
    Linking.openURL(uri)
      .catch(err => {
        console.error('Erro ao abrir documento:', err);
        Alert.alert("Erro", "Não foi possível abrir o documento.");
      });
  };

  const handleToggleLike = async () => {
    if (!user) {
      Alert.alert("Login necessário", "Você precisa estar logado para curtir esta notícia.");
      return;
    }
    
    setLikeLoading(true);
    try {
      await toggleNewsLike(newsItem.id, user.id);
      // Refresh news to get updated like status
      await fetchNews();
      setNewsItem(getNewsItem(id));
    } catch (error) {
      console.error('Erro ao curtir/descurtir:', error);
      Alert.alert("Erro", "Não foi possível processar sua ação. Tente novamente.");
    } finally {
      setLikeLoading(false);
    }
  };
  
  const handleCommentSubmit = async () => {
    await fetchNews();
    setNewsItem(getNewsItem(id));
  };

  const renderStatusIcon = () => {
    switch (newsItem.status) {
      case 'published':
        return <Send size={16} color={Colors.success} />;
      case 'draft':
        return <BookMarked size={16} color={Colors.warning} />;
      case 'archived':
        return <Archive size={16} color={Colors.gray[500]} />;
      default:
        return null;
    }
  };

  const renderStatusBadge = () => {
    if (newsItem.status === 'published') {
      return null;
    }
    
    return (
      <View style={[
        styles.statusBadge,
        newsItem.status === 'draft' ? styles.draftBadge : styles.archivedBadge
      ]}>
        <Text style={styles.statusBadgeText}>
          {newsItem.status === 'draft' ? 'RASCUNHO' : 'ARQUIVADO'}
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: '',
          headerShown: false
        }} 
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            {renderStatusIcon()}
            <Text style={styles.headerTitle} numberOfLines={1}>
              {newsItem.title}
            </Text>
          </View>
          {isManager && (
            <View style={styles.headerActions}>
              {actionLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.headerActionButton}
                    onPress={handleEditPress}
                  >
                    <Edit size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.headerActionButton}
                    onPress={handleDeletePress}
                  >
                    <Trash2 size={20} color={Colors.error} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderStatusBadge()}
          
          {newsItem.coverImage && (
            <Image 
              source={{ uri: newsItem.coverImage }} 
              style={styles.coverImage}
              resizeMode="cover"
            />
          )}
          
          <View style={styles.contentContainer}>
            <Text style={styles.newsTitle}>{newsItem.title}</Text>
            
            <View style={styles.metaInfo}>
              <View style={styles.metaItem}>
                <Calendar size={16} color={Colors.gray[500]} />
                <Text style={styles.metaText}>
                  {formatDate(newsItem.publishDate)}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Eye size={16} color={Colors.gray[500]} />
                <Text style={styles.metaText}>
                  {newsItem.viewCount || 0} visualizações
                </Text>
              </View>
              
              {/* Like button */}
              <TouchableOpacity 
                style={[styles.likeButton, isLiked && styles.likedButton]}
                onPress={handleToggleLike}
                disabled={likeLoading}
              >
                {likeLoading ? (
                  <ActivityIndicator size="small" color={isLiked ? "#FFFFFF" : Colors.primary} />
                ) : (
                  <>
                    <ThumbsUp 
                      size={16} 
                      color={isLiked ? "#FFFFFF" : Colors.primary} 
                      fill={isLiked ? "#FFFFFF" : "transparent"} 
                    />
                    <Text style={[styles.likeText, isLiked && styles.likedText]}>
                      {isLiked ? "Curtido" : "Curtir"} {newsItem.likeCount ? `(${newsItem.likeCount})` : ""}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              {/* Comments indicator */}
              <View style={styles.commentButton}>
                <MessageCircle size={16} color={Colors.gray[600]} />
                <Text style={styles.commentText}>
                  Comentários {newsItem.comments?.length ? `(${newsItem.comments.length})` : ""}
                </Text>
                </View>
            </View>
            
            {newsItem.category && (
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>{newsItem.category}</Text>
              </View>
            )}
            
            <Text style={styles.newsContent}>{newsItem.content}</Text>
            
            {/* Galeria de imagens, se houver */}
            {newsItem.images && newsItem.images.length > 0 && (
              <View style={styles.gallerySection}>
                <Text style={styles.sectionTitle}>Imagens</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.galleryContainer}
                >
                  {newsItem.images.map((imageUri, index) => (
                    <Image
                      key={`img-${index}`}
                      source={{ uri: imageUri }}
                      style={styles.galleryImage}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
            
            {/* Documentos, se houver */}
            {newsItem.documents && newsItem.documents.length > 0 && (
              <View style={styles.documentsSection}>
                <Text style={styles.sectionTitle}>Documentos</Text>
                <View style={styles.documentsList}>
                  {newsItem.documents.map((doc, index) => (
                    <TouchableOpacity
                      key={`doc-${index}`}
                      style={styles.documentItem}
                      onPress={() => handleDocumentPress(doc.uri)}
                    >
                      <Download size={20} color={Colors.primary} />
                      <Text style={styles.documentName}>{doc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
          
          {/* Comments section - Always visible now */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>
                Comentários ({newsItem.comments?.length || 0})
              </Text>
            </View>
            
            {newsItem.comments && newsItem.comments.length > 0 ? (
              <View style={styles.commentsList}>
                {newsItem.comments.map(comment => (
                  <NewsCommentItem key={comment.id} comment={comment} />
                ))}
              </View>
            ) : (
              <Text style={styles.noCommentsText}>
                Nenhum comentário ainda. Seja o primeiro a comentar!
              </Text>
            )}
          </View>
        </ScrollView>
        
        {/* Comment form - Always visible now if the user is logged in */}
        {user && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <NewsCommentForm 
              newsId={newsItem.id} 
              onCommentSubmit={handleCommentSubmit} 
            />
          </KeyboardAvoidingView>
        )}
        
        {isManager && newsItem.status !== 'published' && (
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={styles.publishButton}
              onPress={handlePublishPress}
              disabled={actionLoading}
            >
              <Send size={20} color="white" />
              <Text style={styles.publishButtonText}>Publicar</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {isManager && newsItem.status === 'published' && (
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              style={styles.archiveButton}
              onPress={handleArchivePress}
              disabled={actionLoading}
            >
              <Archive size={20} color="white" />
              <Text style={styles.archiveButtonText}>Arquivar</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    marginLeft: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 16,
    marginLeft: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  draftBadge: {
    backgroundColor: Colors.warning,
  },
  archivedBadge: {
    backgroundColor: Colors.gray[500],
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  coverImage: {
    width: '100%',
    height: 200,
    marginBottom: 16,
  },
  contentContainer: {
    padding: 16,
  },
  newsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 14,
    color: Colors.gray[600],
    marginLeft: 8,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '20',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    color: Colors.primary,
  },
  newsContent: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  gallerySection: {
    marginBottom: 24,
  },
  galleryContainer: {
    paddingRight: 16,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  documentsSection: {
    marginBottom: 24,
  },
  documentsList: {
    gap: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
  },
  documentName: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
    flex: 1,
  },
  actionButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  publishButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingVertical: 12,
    borderRadius: 8,
  },
  publishButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  archiveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[500],
    paddingVertical: 12,
    borderRadius: 8,
  },
  archiveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
    marginRight: 8,
  },
  likedButton: {
    backgroundColor: Colors.primary,
  },
  likeText: {
    fontSize: 14,
    color: Colors.gray[700],
    marginLeft: 6,
    fontWeight: '500',
  },
  likedText: {
    color: '#FFFFFF',
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
  },
  commentText: {
    fontSize: 14,
    color: Colors.gray[700],
    marginLeft: 6,
    fontWeight: '500',
  },
  commentsSection: {
    marginBottom: 24,
  },
  commentsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  commentsList: {
    padding: 16,
  },
  noCommentsText: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
    padding: 16,
  },
}); 