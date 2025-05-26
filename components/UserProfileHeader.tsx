import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { User } from '@/types';
import Colors from '@/constants/colors';
import { User as UserIcon, Phone, MapPin } from 'lucide-react-native';

interface UserProfileHeaderProps {
  user: User | null;
  showFullInfo?: boolean;
  compact?: boolean;
}

export default function UserProfileHeader({ user, showFullInfo = false, compact = false }: UserProfileHeaderProps) {
  // Log para debug
  console.log('UserProfileHeader recebeu user:', user ? JSON.stringify(user, null, 2) : 'null');
  
  const handleProfilePress = () => {
    router.push('/profile');
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

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

  // Verificação mais robusta
  if (!user) {
    console.log('UserProfileHeader: user é null/undefined');
    return null;
  }
  
  // Garantir que temos um nome para exibir
  const displayName = user.name || user.email?.split('@')[0] || 'Usuário';

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        showFullInfo && styles.fullInfoContainer,
        compact && styles.compactContainer
      ]} 
      onPress={handleProfilePress} 
      activeOpacity={0.8}
    >
      {user.photoURL ? (
        <Image source={{ uri: user.photoURL }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.initials}>{getInitials(displayName)}</Text>
        </View>
      )}
      {!compact && (
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
            {showFullInfo ? displayName : displayName.split(' ')[0]}
          </Text>
          <Text style={styles.userRole}>{getRoleLabel(user.role || 'resident')}</Text>
          
          {showFullInfo && user.email && (
            <Text style={styles.userEmail}>{user.email}</Text>
          )}
          
          {showFullInfo && (user.street || user.house) && (
            <View style={styles.addressInfo}>
              <MapPin size={14} color={Colors.gray[500]} />
              <Text style={styles.addressText}>
                {user.street ? `Rua ${user.street}` : ''}{user.street && user.house ? ', ' : ''}{user.house ? `Casa ${user.house}` : ''}
              </Text>
            </View>
          )}
          
          {showFullInfo && user.phone && (
            <View style={styles.phoneInfo}>
              <Phone size={14} color={Colors.gray[500]} />
              <Text style={styles.phoneText}>{user.phone}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fullInfoContainer: {
    flex: 0,
    marginBottom: 8,
  },
  compactContainer: {
    flex: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray[200],
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  userRole: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  userEmail: {
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: 4,
  },
  apartmentInfo: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  apartmentText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  addressInfo: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 14,
    color: Colors.gray[600],
    marginLeft: 4,
  },
  phoneInfo: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 14,
    color: Colors.gray[600],
    marginLeft: 4,
  },
});