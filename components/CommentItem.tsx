import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { User } from 'lucide-react-native';
import { SuggestionComment } from '@/types';
import Colors from '@/constants/colors';
import { formatDate } from '@/utils/date';
import { useUsersStore } from '@/store/users-store';

interface CommentItemProps {
  comment: SuggestionComment;
}

export default function CommentItem({ comment }: CommentItemProps) {
  const isManagerComment = comment.userRole === 'manager' || comment.userRole === 'admin';
  const { getUserById } = useUsersStore();
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  
  useEffect(() => {
    // Buscar dados do usuário que fez o comentário
    if (comment.createdBy) {
      const user = getUserById(comment.createdBy);
      if (user) {
        const avatar = user.profileImage || user.photoURL || null;
        setUserAvatar(avatar);
      }
    }
  }, [comment.createdBy, getUserById]);

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
              defaultSource={{ uri: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(comment.userName) }}
            />
          ) : (
            <User size={16} color={isManagerComment ? Colors.primary : Colors.gray[500]} />
          )}
          <Text style={[
            styles.userName,
            isManagerComment && styles.managerName
          ]}>
            {comment.userName}
            {comment.userUnit ? ` - ${comment.userUnit}` : ''}
          </Text>
        </View>
        <Text style={styles.date}>{formatDate(comment.createdAt)}</Text>
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
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  managerName: {
    color: Colors.primary,
  },
  date: {
    fontSize: 12,
    color: Colors.gray[500],
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