import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SocialPost, SocialComment } from '@/types';
import { 
  toggleSocialPostLike, 
  addSocialPostComment, 
  toggleSocialCommentLike 
} from '@/lib/firebase';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SocialPostCardProps {
  post: SocialPost;
  currentUserId: string;
}

export default function SocialPostCard({ post, currentUserId }: SocialPostCardProps) {
  const { user } = useAuthStore();
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(post.likes.includes(currentUserId));
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState<SocialComment[]>(post.comments || []);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleLike = async () => {
    try {
      const liked = await toggleSocialPostLike(post.id, currentUserId);
      setIsLiked(liked);
      setLikeCount(liked ? likeCount + 1 : likeCount - 1);
    } catch (error) {
      console.error('Erro ao dar like:', error);
      Alert.alert('Erro', 'Não foi possível dar like no post');
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      const commentId = await addSocialPostComment(post.id, {
        text: newComment.trim(),
        createdBy: currentUserId,
        userName: user.name,
        userAvatar: user.profileImage || user.photoURL,
        userUnit: user.apartment || user.house,
      });

      const newCommentObj: SocialComment = {
        id: commentId,
        text: newComment.trim(),
        createdAt: Date.now(),
        createdBy: currentUserId,
        userName: user.name,
        userAvatar: user.profileImage || user.photoURL,
        userUnit: user.apartment || user.house,
        likes: [],
        likeCount: 0,
      };

      setComments([...comments, newCommentObj]);
      setCommentCount(commentCount + 1);
      setNewComment('');
    } catch (error) {
      console.error('Erro ao comentar:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o comentário');
    }
  };

  const handleCommentLike = async (commentId: string) => {
    try {
      const liked = await toggleSocialCommentLike(post.id, commentId, currentUserId);
      
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          const currentLikes = comment.likes || [];
          const newLikes = liked 
            ? [...currentLikes, currentUserId]
            : currentLikes.filter(id => id !== currentUserId);
          
          return {
            ...comment,
            likes: newLikes,
            likeCount: newLikes.length,
          };
        }
        return comment;
      }));
    } catch (error) {
      console.error('Erro ao dar like no comentário:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Agora há pouco';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
    setImageModalVisible(true);
  };

  const closeImageModal = () => {
    setImageModalVisible(false);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!post.images) return;
    
    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : post.images.length - 1);
    } else {
      setSelectedImageIndex(selectedImageIndex < post.images.length - 1 ? selectedImageIndex + 1 : 0);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header do Post */}
      <View style={styles.header}>
        {post.userAvatar ? (
          <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{post.userName}</Text>
          <View style={styles.postMeta}>
            {post.userUnit && (
              <Text style={styles.userUnit}>{post.userUnit}</Text>
            )}
            <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* Conteúdo do Post */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Imagens do Post */}
      {post.images && post.images.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.imagesContainer}
        >
          {post.images.map((imageUri, index) => (
            <TouchableOpacity 
              key={index} 
              onPress={() => openImageModal(index)}
              activeOpacity={0.8}
            >
              <Image 
                source={{ uri: imageUri }} 
                style={styles.postImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Estatísticas do Post */}
      <View style={styles.stats}>
        <Text style={styles.statsText}>
          {likeCount} {likeCount === 1 ? 'curtida' : 'curtidas'}
        </Text>
        <Text style={styles.statsText}>
          {commentCount} {commentCount === 1 ? 'comentário' : 'comentários'}
        </Text>
      </View>

      {/* Ações do Post */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleLike}
        >
          <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
            {isLiked ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>💬</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* Seção de Comentários - Sempre visível */}
      <View style={styles.commentsSection}>
        {/* Input para novo comentário */}
        <View style={styles.commentInput}>
          {user?.profileImage || user?.photoURL ? (
            <Image source={{ uri: user.profileImage || user.photoURL }} style={styles.commentAvatar} />
          ) : (
            <View style={styles.commentAvatarPlaceholder}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
          )}
          <TextInput
            style={styles.textInput}
            placeholder="Escreva um comentário..."
            placeholderTextColor={Colors.gray[400]}
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
            onPress={handleComment}
            disabled={!newComment.trim()}
          >
            <Text style={[
              styles.sendIcon, 
              { color: newComment.trim() ? Colors.tertiary : Colors.gray[400] }
            ]}>
              ➤
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Comentários */}
        {comments.map((comment) => (
          <View key={comment.id} style={styles.comment}>
            <View style={styles.commentHeader}>
              {comment.userAvatar ? (
                <Image source={{ uri: comment.userAvatar }} style={styles.commentAvatar} />
              ) : (
                <View style={styles.commentAvatarPlaceholder}>
                  <Text style={styles.avatarText}>👤</Text>
                </View>
              )}
              <View style={styles.commentContent}>
                <View style={styles.commentBubble}>
                  <Text style={styles.commentUserName}>{comment.userName}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
                <View style={styles.commentActions}>
                  <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                  <TouchableOpacity 
                    style={styles.commentLikeButton}
                    onPress={() => handleCommentLike(comment.id)}
                  >
                    <Text style={[
                      styles.commentActionText,
                      comment.likes?.includes(currentUserId) && styles.commentLikedText
                    ]}>
                      Curtir
                    </Text>
                  </TouchableOpacity>
                  {comment.likeCount > 0 && (
                    <Text style={styles.commentLikeCount}>
                      {comment.likeCount} {comment.likeCount === 1 ? 'curtida' : 'curtidas'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Modal de Visualização de Imagem */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalBackground}
            onPress={closeImageModal}
            activeOpacity={1}
          >
            <View style={styles.modalContent}>
              {/* Botão Fechar */}
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeImageModal}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              {/* Imagem */}
              {post.images && post.images[selectedImageIndex] && (
                <Image
                  source={{ uri: post.images[selectedImageIndex] }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}

              {/* Navegação (se houver múltiplas imagens) */}
              {post.images && post.images.length > 1 && (
                <>
                  <TouchableOpacity 
                    style={[styles.navButton, styles.prevButton]}
                    onPress={() => navigateImage('prev')}
                  >
                    <Text style={styles.navButtonText}>‹</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.navButton, styles.nextButton]}
                    onPress={() => navigateImage('next')}
                  >
                    <Text style={styles.navButtonText}>›</Text>
                  </TouchableOpacity>

                  {/* Indicador de posição */}
                  <View style={styles.imageIndicator}>
                    <Text style={styles.imageIndicatorText}>
                      {selectedImageIndex + 1} de {post.images.length}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userUnit: {
    fontSize: 14,
    color: Colors.gray[500],
    marginRight: 8,
  },
  postDate: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  content: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  postImage: {
    width: 250,
    height: 200,
    borderRadius: 8,
    marginRight: 8,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  likedText: {
    color: Colors.error,
  },
  commentsSection: {
    marginTop: 12,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    backgroundColor: Colors.gray[100],
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  commentAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    maxHeight: 80,
  },
  sendButton: {
    marginLeft: 8,
    padding: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  comment: {
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentContent: {
    flex: 1,
    marginLeft: 8,
  },
  commentBubble: {
    backgroundColor: Colors.gray[100],
    borderRadius: 16,
    padding: 12,
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  commentDate: {
    fontSize: 12,
    color: Colors.gray[500],
    marginRight: 16,
  },
  commentLikeButton: {
    marginRight: 16,
  },
  commentActionText: {
    fontSize: 12,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  commentLikedText: {
    color: Colors.error,
  },
  commentLikeCount: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  actionIcon: {
    fontSize: 18,
    color: Colors.gray[600],
  },
  likedIcon: {
    color: Colors.error,
  },
  sendIcon: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'black',
    padding: 20,
    borderRadius: 12,
    width: screenWidth * 0.95,
    height: screenHeight * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
  },
  prevButton: {
    left: 10,
  },
  nextButton: {
    right: 10,
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
}); 