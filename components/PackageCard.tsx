import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

interface PackageCardProps {
  pendingCount: number;
  userRole: string;
}

export default function PackageCard({ pendingCount, userRole }: PackageCardProps) {
  const handlePress = () => {
    if (userRole === 'doorman' || userRole === 'admin' || userRole === 'manager') {
      router.push('/(app)/packages' as any);
    } else {
      router.push('/(app)/packages/my-packages' as any);
    }
  };

  const isStaff = userRole === 'doorman' || userRole === 'admin' || userRole === 'manager';

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.header}>
        <Text style={styles.icon}>📦</Text>
        <Text style={styles.title}>Encomendas</Text>
      </View>
      
      <Text style={styles.description}>
        {isStaff 
          ? 'Gerencie as encomendas dos moradores'
          : 'Veja suas encomendas na portaria'
        }
      </Text>
      
      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 