import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User as UserType } from '@/types';
import Colors from '@/constants/colors';
import { User, Mail, Home, Shield, UserCog, Trash2, Phone } from 'lucide-react-native';

interface UserCardProps {
  user: UserType;
  onPress: (user: UserType) => void;
  onDelete?: (user: UserType) => void;
  currentUser?: UserType | null;
}

export default function UserCard({ user, onPress, onDelete, currentUser }: UserCardProps) {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Síndico';
      case 'resident':
        return 'Morador';
      default:
        return 'Usuário';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield size={16} color={Colors.primary} />;
      case 'manager':
        return <UserCog size={16} color="#8B5CF6" />;
      case 'resident':
        return <User size={16} color={Colors.gray[500]} />;
      default:
        return <User size={16} color={Colors.gray[500]} />;
    }
  };

  // Don't allow deleting yourself
  const canDelete = onDelete && currentUser?.id !== user.id;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(user)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{user.name}</Text>
        <View style={styles.roleBadge}>
          {getRoleIcon(user.role)}
          <Text style={styles.roleText}>{getRoleLabel(user.role)}</Text>
        </View>
      </View>
      
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Mail size={16} color={Colors.gray[500]} />
          <Text style={styles.infoText}>{user.email}</Text>
        </View>
        
        {user.phone && (
          <View style={styles.infoItem}>
            <Phone size={16} color={Colors.gray[500]} />
            <Text style={styles.infoText}>{user.phone}</Text>
          </View>
        )}
        
        {(user.block || user.apartment) && (
          <View style={styles.infoItem}>
            <Home size={16} color={Colors.gray[500]} />
            <Text style={styles.infoText}>
              {user.block && `Bloco ${user.block}`}{user.block && user.apartment ? ', ' : ''}
              {user.apartment && `Apto ${user.apartment}`}
            </Text>
          </View>
        )}
      </View>
      
      {canDelete && (
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => onDelete(user)}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Trash2 size={20} color={Colors.error} />
        </TouchableOpacity>
      )}
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
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[700],
    marginLeft: 4,
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
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.error + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
});