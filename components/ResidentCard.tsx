import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, Phone, Mail } from 'lucide-react-native';
import { Resident } from '@/types';
import Colors from '@/constants/colors';

interface ResidentCardProps {
  resident: Resident;
  onPress: (resident: Resident) => void;
}

export default function ResidentCard({ resident, onPress }: ResidentCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(resident)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{resident.name}</Text>
        <View style={[
          styles.badge, 
          { backgroundColor: resident.isOwner ? Colors.primary + '20' : Colors.gray[200] }
        ]}>
          <Text style={[
            styles.badgeText, 
            { color: resident.isOwner ? Colors.primary : Colors.gray[600] }
          ]}>
            {resident.isOwner ? 'Proprietário' : 'Inquilino'}
          </Text>
        </View>
      </View>
      
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Home size={16} color={Colors.gray[500]} />
          <Text style={styles.infoText}>
            Bloco {resident.block}, Apto {resident.apartment}
          </Text>
        </View>
        
        {resident.phone && (
          <View style={styles.infoItem}>
            <Phone size={16} color={Colors.gray[500]} />
            <Text style={styles.infoText}>{resident.phone}</Text>
          </View>
        )}
        
        <View style={styles.infoItem}>
          <Mail size={16} color={Colors.gray[500]} />
          <Text style={styles.infoText}>{resident.email}</Text>
        </View>
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
    marginBottom: 12,
  },
  name: {
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
  infoContainer: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.gray[700],
  },
});