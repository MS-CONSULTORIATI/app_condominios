import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Send } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import { addNewsComment, getUserProfile } from '@/lib/firebase';

interface NewsCommentFormProps {
  newsId: string;
  onCommentSubmit: () => void;
}

export default function NewsCommentForm({ newsId, onCommentSubmit }: NewsCommentFormProps) {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuthStore();
  const { users, getUserById } = useUsersStore();
  const [userData, setUserData] = useState<any>(null);

  // Get user data if not already available
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      // Try to get from store first
      let currentUserData = getUserById(user.id);
      
      // If not in store, get from Firebase
      if (!currentUserData) {
        try {
          currentUserData = await getUserProfile(user.id);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      
      setUserData(currentUserData);
    };
    
    fetchUserData();
  }, [user, users]);

  const handleSubmit = async () => {
    if (!commentText.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // Create comment data
      const commentData = {
        text: commentText.trim(),
        createdAt: Date.now(),
        createdBy: user.id,
        userName: userData?.name || user.name || 'Usuário',
        userRole: userData?.role || user.role || 'resident',
        userUnit: userData?.unit || user.unit || '',
        userAvatar: userData?.profileImage || userData?.photoURL || '',
      };

      // Add comment to Firebase
      await addNewsComment(newsId, commentData);
      
      // Clear input and trigger refresh
      setCommentText('');
      onCommentSubmit();
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      alert('Erro ao adicionar comentário: ' + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={commentText}
        onChangeText={setCommentText}
        placeholder="Adicione um comentário..."
        placeholderTextColor={Colors.gray[400]}
        multiline
        maxLength={500}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={!commentText.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Send size={20} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  input: {
    flex: 1,
    backgroundColor: Colors.gray[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray[400],
  },
}); 