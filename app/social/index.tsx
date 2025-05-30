import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/store/auth-store';
import { getSocialPosts, subscribeToSocialPosts, createSocialPost, getUsers } from '@/lib/firebase';
import { SocialPost, User } from '@/types';
import Colors from '@/constants/colors';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';
import SocialPostCard from '@/components/SocialPostCard';

export default function SocialScreen() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para criação de post
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);

  useEffect(() => {
    loadPosts();
    loadUsers();
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToSocialPosts((updatedPosts) => {
      setPosts(updatedPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadPosts = async () => {
    try {
      const socialPosts = await getSocialPosts();
      setPosts(socialPosts);
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
      Alert.alert('Erro', 'Não foi possível carregar os posts');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const allUsers = await getUsers();
      const filteredUsers = allUsers.filter(u => u.id !== user?.id); // Excluir o próprio usuário
      setUsers(filteredUsers);
      console.log('Usuários carregados para menções:', filteredUsers.length);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Permissão da câmera é necessária');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Permissão da galeria é necessária');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    
    // Detectar se o usuário digitou @ para mostrar sugestões de menções
    const words = text.split(' ');
    const lastWord = words[words.length - 1];
    
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
    } else if (text.includes('@')) {
      // Manter sugestões abertas se ainda há @ no texto
      const hasIncompleteAt = words.some(word => word === '@' || (word.startsWith('@') && word.length === 1));
      setShowMentions(hasIncompleteAt);
    } else {
      setShowMentions(false);
    }
  };

  const handleMention = (userId: string) => {
    const mentionedUser = users.find(u => u.id === userId);
    if (!mentionedUser) return;

    // Encontrar a última posição do @
    const words = content.split(' ');
    const lastWordIndex = words.length - 1;
    const lastWord = words[lastWordIndex];
    
    if (lastWord.startsWith('@')) {
      // Substituir a palavra incompleta pela menção completa
      words[lastWordIndex] = `@${mentionedUser.name}`;
      setContent(words.join(' ') + ' ');
    } else {
      // Adicionar menção no final
      setContent(content + `@${mentionedUser.name} `);
    }
    
    // Adicionar à lista de menções se não estiver já
    if (!mentions.includes(userId)) {
      setMentions([...mentions, userId]);
    }
    
    setShowMentions(false);
  };

  const getFilteredUsers = () => {
    if (!showMentions) return [];
    
    const words = content.split(' ');
    const lastWord = words[words.length - 1];
    
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const searchTerm = lastWord.substring(1).toLowerCase();
      return users.filter(user => 
        user.name.toLowerCase().includes(searchTerm)
      );
    }
    
    return users;
  };

  const toggleMentions = () => {
    setShowMentions(!showMentions);
    if (!showMentions && !content.endsWith('@')) {
      setContent(content + '@');
    }
  };

  const handleCreatePost = async () => {
    if (!content.trim()) {
      Alert.alert('Erro', 'Digite o conteúdo do post');
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'Usuário não encontrado');
      return;
    }

    setCreating(true);
    try {
      await createSocialPost({
        content: content.trim(),
        images,
        userName: user.name,
        userAvatar: user.profileImage || user.photoURL,
        userUnit: user.apartment || user.house,
        createdBy: user.id,
        mentions,
      });

      // Limpar formulário
      setContent('');
      setImages([]);
      setMentions([]);
      setShowMentions(false);
      
      Alert.alert('Sucesso', 'Post criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar post:', error);
      Alert.alert('Erro', 'Não foi possível criar o post');
    } finally {
      setCreating(false);
    }
  };

  const renderCreatePostForm = () => (
    <View style={styles.createPostContainer}>
      <View style={styles.userInfo}>
        {user?.profileImage || user?.photoURL ? (
          <Image 
            source={{ uri: user.profileImage || user.photoURL }} 
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userUnit}>
            {user?.apartment || user?.house || 'Unidade não informada'}
          </Text>
        </View>
      </View>

      <TextInput
        style={styles.textInput}
        placeholder="O que você gostaria de compartilhar?"
        placeholderTextColor={Colors.gray[400]}
        multiline
        value={content}
        onChangeText={handleContentChange}
        maxLength={500}
      />

      <Text style={styles.characterCount}>{content.length}/500</Text>

      {/* Sugestões de menções */}
      {showMentions && (
        <View style={styles.mentionsDropdown}>
          <Text style={styles.mentionsTitle}>Mencionar usuários:</Text>
          {getFilteredUsers().length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {getFilteredUsers().map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.mentionSuggestion}
                  onPress={() => handleMention(u.id)}
                >
                  <Text style={styles.mentionSuggestionText}>@{u.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noUsersText}>
              {users.length === 0 ? 'Carregando usuários...' : 'Nenhum usuário encontrado'}
            </Text>
          )}
        </View>
      )}

      {/* Imagens selecionadas */}
      {images.length > 0 && (
        <View style={styles.imagesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.selectedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Text style={styles.removeImageText}>❌</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Ações do formulário */}
      <View style={styles.formActions}>
        <View style={styles.mediaButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={openCamera}>
            <Text style={styles.iconText}>📷</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={openGallery}>
            <Text style={styles.iconText}>🖼️</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={toggleMentions}
          >
            <Text style={styles.iconText}>@</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.publishButton, (!content.trim() || creating) && styles.publishButtonDisabled]}
          onPress={handleCreatePost}
          disabled={!content.trim() || creating}
        >
          {creating ? (
            <LoadingIndicator size="small" />
          ) : (
            <Text style={styles.publishIconText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPost = ({ item }: { item: SocialPost }) => (
    <SocialPostCard post={item} currentUserId={user?.id || ''} />
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={user ? renderCreatePostForm() : null}
        ListEmptyComponent={
          <EmptyState
            title="Nenhum post ainda"
            description="Seja o primeiro a compartilhar algo com a comunidade!"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  createPostContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userInfo: {
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
  userDetails: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  userUnit: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  textInput: {
    fontSize: 16,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 8,
    padding: 12,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.gray[400],
    textAlign: 'right',
    marginBottom: 12,
  },
  mentionsDropdown: {
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  mentionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  mentionSuggestion: {
    backgroundColor: Colors.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  mentionSuggestionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  imagesContainer: {
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  publishButton: {
    backgroundColor: Colors.tertiary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  noUsersText: {
    color: Colors.gray[500],
    fontSize: 14,
    textAlign: 'center',
  },
  iconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  publishIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
}); 