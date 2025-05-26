import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { User } from 'lucide-react-native';
import { NewsComment } from '@/types';
import Colors from '@/constants/colors';
import { formatDate, formatTime } from '@/utils/date';
import { useUsersStore } from '@/store/users-store';
import { getUserProfile } from '@/lib/firebase';

interface NewsCommentItemProps {
  comment: NewsComment;
}

export default function NewsCommentItem({ comment }: NewsCommentItemProps) {
  const isManagerComment = comment.userRole === 'manager' || comment.userRole === 'admin';
  const { getUserById, users } = useUsersStore();
  const [userAvatar, setUserAvatar] = useState<string | null>(comment.userAvatar || null);

  // Try to get user data if not already in comment
  useEffect(() => {
    const fetchUserData = async () => {
      // If we already have the avatar, don't fetch it
      if (userAvatar) return;
      
      // Try to get user from store
      const userData = getUserById(comment.createdBy);
      if (userData?.profileImage || userData?.photoURL) {
        setUserAvatar(userData.profileImage || userData.photoURL || null);
        return;
      }
      
      // If not in store, try to fetch from Firebase
      try {
        const userProfile = await getUserProfile(comment.createdBy);
        if (userProfile?.profileImage || userProfile?.photoURL) {
          setUserAvatar(userProfile.profileImage || userProfile.photoURL || null);
        }
      } catch (e) {
        console.error('Error fetching user profile:', e);
      }
    };
    
    fetchUserData();
  }, [comment.createdBy, users]);

  // Generate a fallback avatar URL based on user name if no avatar is provided
  const getFallbackAvatarUrl = () => {
    const name = encodeURIComponent(comment.userName || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=random&size=100`;
  };
  
  return (
    <View style={[styles.container, isManagerComment && styles.managerContainer]}>
      <View style={styles.avatarContainer}>
        {userAvatar ? (
          <Image source={{ uri: userAvatar }} style={styles.avatar} />
        ) : (
          <Image source={{ uri: getFallbackAvatarUrl() }} style={styles.avatar} />
        )}
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.userName}>{comment.userName}</Text>
          {isManagerComment && (
            <View style={styles.managerBadge}>
              <Text style={styles.managerBadgeText}>
                {comment.userRole === 'admin' ? 'Síndico' : 'Administrador'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
        <Text style={styles.dateText}>
          {formatDate(comment.createdAt)} às {formatTime(comment.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
    marginBottom: 8,
  },
  managerContainer: {
    backgroundColor: Colors.primaryLight,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontWeight: 'bold',
    color: Colors.text,
    fontSize: 14,
    marginRight: 8,
  },
  managerBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  managerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  commentText: {
    color: Colors.text,
    fontSize: 14,
    marginBottom: 4,
  },
  dateText: {
    color: Colors.gray[600],
    fontSize: 12,
  },
}); 