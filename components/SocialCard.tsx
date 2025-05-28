import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

export default function SocialCard() {
  const handlePress = () => {
    router.push('/social');
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>👥</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Rede Social</Text>
        <Text style={styles.description}>
          Conecte-se com seus vizinhos, compartilhe momentos e participe da comunidade
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.tertiaryLight,
    marginBottom: 12,
  },
  iconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.tertiary,
  },
  content: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 12,
  },
}); 