import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Clock, AlertCircle, Eye } from 'lucide-react-native';
import { Problem } from '@/types';
import Colors from '@/constants/colors';
import { formatDate, formatDateTime } from '@/utils/date';

interface ProblemCardProps {
  problem: Problem;
  onPress: (problem: Problem) => void;
}

export default function ProblemCard({ problem, onPress }: ProblemCardProps) {
  const getStatusColor = () => {
    switch (problem.status) {
      case 'pending':
        return Colors.warning;
      case 'in_progress':
        return Colors.primary;
      case 'resolved':
        return Colors.success;
      default:
        return Colors.gray[500];
    }
  };

  const getStatusText = () => {
    switch (problem.status) {
      case 'pending':
        return 'Pendente';
      case 'in_progress':
        return 'Em Progresso';
      case 'resolved':
        return 'Resolvido';
      default:
        return problem.status;
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(problem)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {problem.title}
        </Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.badgeText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.description} numberOfLines={2}>
        {problem.description}
      </Text>
      
      <View style={styles.footer}>
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <MapPin size={14} color={Colors.gray[500]} />
            <Text style={styles.metaText} numberOfLines={1}>
              {problem.location}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <Clock size={14} color={Colors.gray[500]} />
            <Text style={styles.metaText}>{formatDateTime(problem.createdAt)}</Text>
          </View>
        </View>
        
        <View style={styles.viewsContainer}>
          <Eye size={14} color={Colors.gray[500]} />
          <Text style={styles.viewsText}>{problem.viewCount || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
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
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gray[200],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  viewsText: {
    fontSize: 12,
    color: Colors.gray[600],
    fontWeight: '500',
  },
});