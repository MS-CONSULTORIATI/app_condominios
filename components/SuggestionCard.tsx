import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ThumbsUp, Clock, User, Eye, MessageCircle } from 'lucide-react-native';
import { Suggestion } from '@/types';
import Colors from '@/constants/colors';
import { formatDate, formatDateTime } from '@/utils/date';
import { useAuthStore } from '@/store/auth-store';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onPress: (suggestion: Suggestion) => void;
  onLike?: (suggestion: Suggestion) => void;
}

export default function SuggestionCard({ 
  suggestion, 
  onPress, 
  onLike 
}: SuggestionCardProps) {
  const { user } = useAuthStore();
  const userHasLiked = !!user && !!suggestion.votedBy && suggestion.votedBy.includes(user.id);
  const commentsCount = suggestion.comments?.length || 0;

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
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      default:
        return suggestion.status;
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(suggestion)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {suggestion.title}
        </Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.badgeText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>
        {suggestion.description}
      </Text>
      
      <View style={styles.footer}>
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Clock size={14} color={Colors.gray[500]} />
            <Text style={styles.metaText}>{formatDateTime(suggestion.createdAt)}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Eye size={14} color={Colors.gray[500]} />
            <Text style={styles.metaText}>{suggestion.viewCount || 0}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <MessageCircle size={14} color={Colors.gray[500]} />
            <Text style={styles.metaText}>{commentsCount}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.likeButton,
            userHasLiked && styles.likeButtonActive
          ]}
          onPress={() => onLike && onLike(suggestion)}
          disabled={!onLike || userHasLiked}
        >
          <ThumbsUp 
            size={14} 
            color={userHasLiked ? Colors.success : Colors.primary} 
          />
          <Text 
            style={[
              styles.likeText,
              userHasLiked && styles.likeTextActive
            ]}
          >
            {suggestion.votes || 0}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  likeButtonActive: {
    backgroundColor: Colors.success + '20',
  },
  likeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
  },
  likeTextActive: {
    color: Colors.success,
  },
});