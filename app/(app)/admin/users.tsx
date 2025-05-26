import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useUsersStore } from '@/store/users-store';
import { useAuthStore } from '@/store/auth-store';
import UserCard from '@/components/UserCard';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import Colors from '@/constants/colors';
import { Users, Plus, Search, Filter, Shield } from 'lucide-react-native';
import Input from '@/components/Input';

export default function UsersScreen() {
  const { users, fetchUsers, isLoading, error, deleteUser } = useUsersStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserPress = (selectedUser) => {
    router.push(`/admin/user/${selectedUser.id}`);
  };

  const handleCreateUser = () => {
    router.push('/admin/user/create');
  };

  const handleDeleteUser = (selectedUser) => {
    Alert.alert(
      "Confirmar exclusão",
      `Tem certeza que deseja excluir o usuário ${selectedUser.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUser(selectedUser.id);
              Alert.alert("Sucesso", "Usuário excluído com sucesso!");
            } catch (error) {
              Alert.alert("Erro", "Não foi possível excluir o usuário.");
            }
          }
        }
      ]
    );
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Acesso Restrito"
          description="Você não tem permissão para acessar esta área."
          icon={<Shield size={48} color={Colors.gray[400]} />}
        />
      </View>
    );
  }

  if (isLoading && users.length === 0) {
    return <LoadingIndicator fullScreen text="Carregando usuários..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gerenciar Usuários</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={toggleSearch} style={styles.iconButton}>
            <Search size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreateUser} style={styles.addButton}>
            <Plus size={20} color={Colors.primary} />
            <Text style={styles.addButtonText}>Novo Usuário</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showSearch && (
        <Input
          placeholder="Buscar por nome, email ou função..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Search size={20} color={Colors.gray[400]} />}
          style={styles.searchInput}
        />
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Ocorreu um erro ao carregar os usuários. Tente novamente.
          </Text>
          <TouchableOpacity onPress={fetchUsers} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title={searchQuery ? "Nenhum resultado encontrado" : "Nenhum usuário cadastrado"}
          description={searchQuery 
            ? "Tente buscar com outros termos." 
            : "Não há usuários cadastrados no momento."}
          icon={<Users size={48} color={Colors.gray[400]} />}
          actionLabel={!searchQuery ? "Cadastrar Usuário" : undefined}
          onAction={!searchQuery ? handleCreateUser : undefined}
        />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserCard 
              user={item} 
              onPress={() => handleUserPress(item)}
              onDelete={() => handleDeleteUser(item)}
              currentUser={user}
            />
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
    marginRight: 8,
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
  searchInput: {
    marginBottom: 16,
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