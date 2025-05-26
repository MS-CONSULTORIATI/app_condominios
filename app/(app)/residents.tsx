import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useResidentsStore } from '@/store/residents-store';
import { useAuthStore } from '@/store/auth-store';
import ResidentCard from '@/components/ResidentCard';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import Colors from '@/constants/colors';
import { Users, Plus } from 'lucide-react-native';

export default function ResidentsScreen() {
  const { residents, fetchResidents, isLoading, error } = useResidentsStore();
  const { user } = useAuthStore();
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    fetchResidents();
  }, []);

  const handleResidentPress = (resident) => {
    router.push(`/resident/${resident.id}`);
  };

  const handleCreateResident = () => {
    router.push('/resident/create');
  };

  // If not a manager, redirect or show access denied
  if (!isManager) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Acesso Restrito"
          description="Você não tem permissão para acessar esta área."
          icon={<Users size={48} color={Colors.gray[400]} />}
        />
      </View>
    );
  }

  if (isLoading && residents.length === 0) {
    return <LoadingIndicator fullScreen text="Carregando moradores..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Moradores do Condomínio</Text>
        <TouchableOpacity onPress={handleCreateResident} style={styles.addButton}>
          <Plus size={20} color={Colors.primary} />
          <Text style={styles.addButtonText}>Novo Morador</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Ocorreu um erro ao carregar os moradores. Tente novamente.
          </Text>
          <TouchableOpacity onPress={fetchResidents} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : residents.length === 0 ? (
        <EmptyState
          title="Nenhum morador cadastrado"
          description="Não há moradores cadastrados no momento."
          icon={<Users size={48} color={Colors.gray[400]} />}
          actionLabel="Cadastrar Morador"
          onAction={handleCreateResident}
        />
      ) : (
        <FlatList
          data={residents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ResidentCard resident={item} onPress={() => handleResidentPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: Colors.error + '10',
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.error + '20',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.error,
  },
});