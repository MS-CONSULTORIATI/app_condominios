import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Send } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { addTopicComment, getUserProfile } from '@/lib/firebase';

interface TopicCommentFormProps {
  topicId: string;
  onCommentSubmit: () => void;
}

export default function TopicCommentForm({ topicId, onCommentSubmit }: TopicCommentFormProps) {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuthStore();
  const { users, fetchUsers } = useUsersStore();
  
  // Effect to ensure users are loaded
  useEffect(() => {
    if (users.length === 0) {
      fetchUsers();
    }
  }, [users.length, fetchUsers]);
  
  const handleSubmit = async () => {
    if (!commentText.trim() || !user) return;
    
    setIsSubmitting(true);
    try {
      // Ensure we have complete user data by fetching directly from Firebase if needed
      let userData = user;
      
      try {
        // Get fresh user data directly from Firebase
        const freshUserData = await getUserProfile(user.id);
        if (freshUserData) {
          userData = freshUserData;
        }
      } catch (error) {
        console.warn('Não foi possível obter dados atualizados do usuário:', error);
        // Continue with existing user data
      }
      
      // Estrutura do comentário a ser adicionado
      const newComment = {
        text: commentText.trim(),
        createdAt: Date.now(),
        createdBy: userData.id,
        userName: userData.name,
        userRole: userData.role,
        userUnit: userData.unit || userData.apartment // Try both unit and apartment fields
      };
      
      // Adicionar o comentário
      await addTopicComment(topicId, newComment);
      
      // Limpar o campo após envio bem-sucedido
      setCommentText('');
      
      // Notificar o componente pai para atualizar a lista de comentários
      onCommentSubmit();
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Adicione um comentário..."
          placeholderTextColor={Colors.gray[400]}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={500}
        />
        {commentText.length > 0 && (
          <Text style={styles.charCount}>
            {commentText.length}/500
          </Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={[
          styles.sendButton,
          (!commentText.trim() || isSubmitting) && styles.disabledButton
        ]}
        onPress={handleSubmit}
        disabled={!commentText.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Send size={20} color="white" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  inputContainer: {
    flex: 1,
    marginRight: 12,
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.gray[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 40,
    fontSize: 14,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.gray[300],
  },
  charCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 10,
    color: Colors.gray[500],
  },
}); 