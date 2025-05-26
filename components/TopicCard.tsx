import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Calendar, MessageCircle, Clock, Flag, Archive, CheckCircle, HelpCircle, ThumbsUp } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { formatDate, formatRelativeTime } from '@/utils/date';

interface TopicCardProps {
  topic: {
    id: string;
    title: string;
    description: string;
    createdAt: number;
    createdBy: {
      id: string;
      name: string;
    };
    commentsCount?: number;
    likesCount?: number;
    status: 'active' | 'archived';
    priority: 'low' | 'medium' | 'high';
    isVotingEnabled?: boolean;
    votes?: {
      yes: number;
      no: number;
      abstain: number;
    };
    votingEndDate?: number;
  };
  onPress: () => void;
  style?: ViewStyle;
}

export default function TopicCard({ topic, onPress, style }: TopicCardProps) {
  const getStatusColor = () => {
    switch (topic.status) {
      case 'active':
        return Colors.success;
      case 'archived':
        return Colors.gray[600];
      default:
        return Colors.success;
    }
  };

  const getBackgroundColor = () => {
    switch (topic.status) {
      case 'active':
        return '#E6F4EA'; // Verde claro
      case 'archived':
        return '#F5F5F5'; // Cinza claro
      default:
        return '#E6F4EA'; // Verde claro (padrão)
    }
  };

  const getStatusLabel = () => {
    switch (topic.status) {
      case 'active':
        return 'Ativa';
      case 'archived':
        return 'Arquivada';
      default:
        return 'Ativa';
    }
  };
  
  const getStatusIcon = () => {
    switch (topic.status) {
      case 'active':
        return <CheckCircle size={14} color={getStatusColor()} />;
      case 'archived':
        return <Archive size={14} color={getStatusColor()} />;
      default:
        return <CheckCircle size={14} color={getStatusColor()} />;
    }
  };
  
  const getPriorityColor = () => {
    switch (topic.priority) {
      case 'low':
        return Colors.success;
      case 'medium':
        return Colors.warning;
      case 'high':
        return Colors.error;
      default:
        return Colors.primary;
    }
  };
  
  const getPriorityLabel = () => {
    switch (topic.priority) {
      case 'low':
        return 'Baixa';
      case 'medium':
        return 'Média';
      case 'high':
        return 'Alta';
      default:
        return 'Média';
    }
  };

  // Função para calcular o total de votos
  const getTotalVotes = () => {
    if (!topic.votes) return 0;
    return topic.votes.yes + topic.votes.no + topic.votes.abstain;
  };

  // Verificar se tem votação ativa e já tem votos
  const hasVotes = topic.isVotingEnabled && topic.votes && getTotalVotes() > 0;

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: getBackgroundColor(),
          borderLeftWidth: 4,
          borderLeftColor: getStatusColor(),
        },
        style
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.headerRow}>
        <View style={styles.statusContainer}>
          {getStatusIcon()}
          <Text style={styles.statusText}>{getStatusLabel()}</Text>
        </View>
        
        <View style={[styles.priorityContainer, { borderColor: getPriorityColor() }]}>
          <Flag size={12} color={getPriorityColor()} />
          <Text style={[styles.priorityText, { color: getPriorityColor() }]}>
            {getPriorityLabel()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.title} numberOfLines={2}>{topic.title}</Text>
      <Text style={styles.description} numberOfLines={2}>{topic.description}</Text>
      
      <View style={styles.metaContainer}>
        <View style={styles.metaItem}>
          <Calendar size={14} color={Colors.gray[500]} />
          <Text style={styles.metaText}>{formatDate(topic.createdAt)}</Text>
        </View>
        
        {topic.commentsCount !== undefined && (
          <View style={styles.metaItem}>
            <MessageCircle size={14} color={Colors.gray[500]} />
            <Text style={styles.metaText}>{topic.commentsCount}</Text>
          </View>
        )}
        
        {/* Mostrar total de votos, se tiver votação habilitada e votos */}
        {hasVotes && (
          <View style={[styles.metaItem, styles.votingMetaItem]}>
            <ThumbsUp size={14} color={Colors.primary} />
            <Text style={[styles.metaText, styles.votingMetaText]}>
              {getTotalVotes()} {getTotalVotes() === 1 ? 'voto' : 'votos'}
            </Text>
          </View>
        )}
        
        {/* Mostrar que tem votação habilitada mas sem votos ainda */}
        {topic.isVotingEnabled && getTotalVotes() === 0 && (
          <View style={[styles.metaItem, styles.votingEnabledItem]}>
            <HelpCircle size={14} color={Colors.warning} />
            <Text style={[styles.metaText, styles.votingEnabledText]}>
              Votação aberta
            </Text>
          </View>
        )}
        
        <View style={styles.metaItem}>
          <Clock size={14} color={Colors.gray[500]} />
          <Text style={styles.metaText}>{formatRelativeTime(topic.createdAt)}</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.authorText}>
          Por: {topic.createdBy.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.gray[600],
    marginLeft: 6,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
    minHeight: 20,
  },
  description: {
    fontSize: 13,
    color: Colors.gray[700],
    marginBottom: 10,
    lineHeight: 17,
    minHeight: 34,
  },
  metaContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  metaText: {
    fontSize: 11,
    color: Colors.gray[500],
    marginLeft: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 6,
  },
  authorText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
  votingMetaItem: {
    backgroundColor: 'rgba(106, 81, 174, 0.1)',
  },
  votingMetaText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  votingEnabledItem: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  votingEnabledText: {
    color: Colors.warning,
    fontWeight: '500',
  },
});