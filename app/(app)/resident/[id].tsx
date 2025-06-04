import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { getUserProfile } from '@/lib/firebase';
import Colors from '@/constants/colors';
import { User } from '@/types';

export default function ResidentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const [resident, setResident] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResident = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const residentData = await getUserProfile(id);
        setResident(residentData);
      } catch (error) {
        console.error('Error fetching resident:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados do morador.');
      } finally {
        setLoading(false);
      }
    };

    fetchResident();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Carregando dados do morador...</Text>
      </View>
    );
  }

  if (!resident) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Morador não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.title}>Informações do Morador</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Nome:</Text>
          <Text style={styles.value}>{resident.name}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{resident.email}</Text>
        </View>
        
        {resident.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Telefone:</Text>
            <Text style={styles.value}>{resident.phone}</Text>
          </View>
        )}
        
        {resident.cpf && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>CPF:</Text>
            <Text style={styles.value}>{resident.cpf}</Text>
          </View>
        )}
        
        {resident.street && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Rua:</Text>
            <Text style={styles.value}>{resident.street}</Text>
          </View>
        )}
        
        {resident.house && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Casa:</Text>
            <Text style={styles.value}>{resident.house}</Text>
          </View>
        )}
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Papel:</Text>
          <Text style={[styles.value, styles.roleValue]}>
            {resident.role === 'admin' ? 'Administrador' : 
             resident.role === 'manager' ? 'Gerente' : 
             resident.role === 'doorman' ? 'Porteiro' : 'Morador'}
          </Text>
        </View>
        
        {resident.createdAt && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Membro desde:</Text>
            <Text style={styles.value}>
              {new Date(resident.createdAt).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.card,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.card,
  },
  errorText: {
    fontSize: 18,
    color: Colors.error,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[700],
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: Colors.text,
    flex: 2,
    textAlign: 'right',
  },
  roleValue: {
    fontWeight: '600',
    color: Colors.primary,
  },
}); 