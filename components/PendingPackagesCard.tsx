import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Package } from 'lucide-react-native';

interface PendingPackagesCardProps {
  pendingCount: number;
}

export default function PendingPackagesCard({ pendingCount }: PendingPackagesCardProps) {
  const handlePress = () => {
    router.push('/(app)/packages/my-packages' as any);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.iconContainer}>
        <Package size={32} color="#fff" />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Encomendas Pendentes</Text>
        <Text style={styles.description}>
          Você tem {pendingCount} {pendingCount === 1 ? 'encomenda' : 'encomendas'} aguardando retirada na portaria
        </Text>
      </View>
      
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{pendingCount}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  badge: {
    backgroundColor: '#fff',
    borderRadius: 20,
    minWidth: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  badgeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
}); 