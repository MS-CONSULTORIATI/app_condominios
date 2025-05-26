import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { User } from 'lucide-react-native';
import { TopicComment } from '@/types';
import Colors from '@/constants/colors';
import { formatDate, formatTime } from '@/utils/date';
import { useUsersStore } from '@/store/users-store';
import { getUserProfile } from '@/lib/firebase';

interface TopicCommentItemProps {
  comment: TopicComment;
}

export default function TopicCommentItem({ comment }: TopicCommentItemProps) {
  const isManagerComment = comment.userRole === 'manager' || comment.userRole === 'admin';
  const { getUserById, users } = useUsersStore();
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  
  // Generate a default avatar URL using UI Avatars service
  const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName)}&background=random&color=fff&size=128`;
  
  useEffect(() => {
    // Função para buscar os dados do avatar
    const fetchUserAvatar = async () => {
      // Primeiro, tentar obter do Zustand store
      if (comment.createdBy) {
        const user = getUserById(comment.createdBy);
        
        if (user && (user.profileImage || user.photoURL)) {
          setUserAvatar(user.profileImage || user.photoURL || null);
          return;
        }
        
        // Se não encontrar no store ou não tiver avatar, buscar diretamente do Firebase
        if (!user || (!user.profileImage && !user.photoURL)) {
          try {
            const userProfile = await getUserProfile(comment.createdBy);
            if (userProfile && (userProfile.profileImage || userProfile.photoURL)) {
              setUserAvatar(userProfile.profileImage || userProfile.photoURL || null);
              return;
            }
          } catch (error) {
            console.log('Erro ao buscar perfil do usuário:', error);
          }
        }
      }
      
      // Se chegou aqui, usar o avatar padrão
      setUserAvatar(defaultAvatarUrl);
    };
    
    fetchUserAvatar();
  }, [comment.createdBy, comment.userName, getUserById, users]);

  // Formatar a data e hora do comentário
  const formattedDate = formatDate(comment.createdAt);
  const formattedTime = formatTime(comment.createdAt);

  return (
    <View style={[
      styles.container,
      isManagerComment && styles.managerContainer
    ]}>
      {isManagerComment && (
        <View style={styles.managerBadge}>
          <Text style={styles.managerBadgeText}>Síndico</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {userAvatar ? (
            <Image 
              source={{ uri: userAvatar }}
              style={styles.userAvatar}
              defaultSource={{ uri: defaultAvatarUrl }}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={16} color={isManagerComment ? Colors.primary : Colors.gray[500]} />
            </View>
          )}
          <Text style={[
            styles.userName,
            isManagerComment && styles.managerName
          ]}>
            {comment.userName}
            {comment.userUnit ? ` - ${comment.userUnit}` : ''}
          </Text>
        </View>
        <View style={styles.dateTimeContainer}>
          <Text style={styles.date}>{formattedDate}</Text>
          <Text style={styles.time}>{formattedTime}</Text>
        </View>
      </View>
      
      <Text style={styles.commentText}>{comment.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.gray[100],
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gray[300],
  },
  managerContainer: {
    backgroundColor: Colors.primary + '10',
    borderLeftColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  managerName: {
    color: Colors.primary,
  },
  dateTimeContainer: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  time: {
    fontSize: 11,
    color: Colors.gray[400],
    marginTop: 2,
  },
  commentText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  managerBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  managerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
}); 