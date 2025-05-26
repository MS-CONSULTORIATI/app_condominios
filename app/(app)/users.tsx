import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Image
} from 'react-native';
import { router } from 'expo-router';
import { useUsersStore } from '@/store/users-store';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { 
  ArrowLeft, 
  Search, 
  User, 
  UserCog, 
  Users, 
  Shield, 
  Phone, 
  Home,
  Mail,
  Filter,
  Trash2
} from 'lucide-react-native';
import { User as UserType } from '@/types';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';

// Tipos de papéis de usuário
const USER_ROLES = [
  { id: 'resident', name: 'Morador', color: Colors.gray[600], icon: <User size={18} color="white" /> },
  { id: 'manager', name: 'Síndico/Sub', color: Colors.primary, icon: <UserCog size={18} color="white" /> },
  { id: 'admin', name: 'Administrador', color: Colors.tertiary, icon: <Shield size={18} color="white" /> },
];

const UserCard = ({ 
  user, 
  onRoleChange,
  onDeleteUser,
  canChangeRole = false
}: { 
  user: UserType; 
  onRoleChange: (userId: string, role: 'resident' | 'manager' | 'admin' | 'visitor') => void;
  onDeleteUser: (userId: string, userName: string) => void;
  canChangeRole?: boolean;
}) => {
  const roleInfo = USER_ROLES.find(r => r.id === user.role) || USER_ROLES[0];
  // Verificar se o usuário tem imagem de perfil
  const hasProfileImage = user.profileImage || user.photoURL;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          {hasProfileImage ? (
            <Image 
              source={{ uri: user.profileImage || user.photoURL }}
              style={styles.userAvatar}
              // Fallback para quando a imagem não carrega
              defaultSource={{ uri: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) }}
            />
          ) : (
            <View 
              style={[
                styles.userIcon, 
                { backgroundColor: roleInfo.color }
              ]}
            >
              {roleInfo.icon}
            </View>
          )}
          <View style={styles.nameContainer}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userRole}>{roleInfo.name}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.userDetails}>
        {user.email && (
          <View style={styles.detailItem}>
            <Mail size={16} color={Colors.gray[500]} />
            <Text style={styles.detailText}>{user.email}</Text>
          </View>
        )}
        
        {user.phone && (
          <View style={styles.detailItem}>
            <Phone size={16} color={Colors.gray[500]} />
            <Text style={styles.detailText}>{user.phone}</Text>
          </View>
        )}
        
        {(user.apartment || user.block) && (
          <View style={styles.detailItem}>
            <Home size={16} color={Colors.gray[500]} />
            <Text style={styles.detailText}>
              {user.block ? `Bloco ${user.block}` : ''}
              {user.block && user.apartment ? ', ' : ''}
              {user.apartment ? `Apto ${user.apartment}` : ''}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.cardFooter}>
        {canChangeRole && (
          <>
            <TouchableOpacity 
              style={styles.changeRoleButton}
              onPress={() => onRoleChange(user.id, user.role)}
            >
              <UserCog size={16} color={Colors.primary} />
              <Text style={styles.changeRoleText}>Alterar Perfil</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => onDeleteUser(user.id, user.name)}
            >
              <Trash2 size={16} color={Colors.error} />
              <Text style={styles.deleteButtonText}>Remover</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const RoleSelectionModal = ({
  visible,
  user,
  onClose,
  onSelect,
}: {
  visible: boolean;
  user: UserType | null;
  onClose: () => void;
  onSelect: (role: 'resident' | 'manager' | 'admin' | 'visitor') => void;
}) => {
  if (!user) return null;
  
  const [selectedRole, setSelectedRole] = useState<string>(user.role);
  
  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
    }
  }, [user]);
  
  const handleConfirm = () => {
    onSelect(selectedRole as 'resident' | 'manager' | 'admin' | 'visitor');
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Alterar perfil de usuário</Text>
          <Text style={styles.modalSubtitle}>{user.name}</Text>
          
          <ScrollView style={styles.rolesList}>
            {USER_ROLES.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleItem,
                  selectedRole === role.id && styles.selectedRoleItem
                ]}
                onPress={() => setSelectedRole(role.id)}
              >
                <View 
                  style={[
                    styles.roleIcon, 
                    { backgroundColor: role.color }
                  ]}
                >
                  {role.icon}
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleName}>{role.name}</Text>
                  <Text style={styles.roleDescription}>
                    {role.id === 'resident' && 'Acesso básico ao aplicativo'}
                    {role.id === 'manager' && 'Gerencia informações e conteúdos'}
                    {role.id === 'admin' && 'Acesso completo de administrador'}
                  </Text>
                </View>
                {selectedRole === role.id && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function UsersScreen() {
  const { users, fetchUsers, updateUser, deleteUser, isLoading, error, clearError } = useUsersStore();
  const { user: currentUser } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  
  // Verificar se o usuário atual é gerente ou admin
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const isAdmin = currentUser?.role === 'admin';
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  // Filtragem de usuários
  const filteredUsers = users.filter(user => {
    // Não exibir o usuário atual na lista (não pode alterar seu próprio perfil)
    if (user.id === currentUser?.id) return false;
    
    // Filtragem por texto de busca
    const matchesSearch = !searchQuery ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filtragem por tipo de perfil
    const matchesRole = !roleFilter || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });
  
  const handleRoleChange = (userId: string, currentRole: 'resident' | 'manager' | 'admin' | 'visitor') => {
    const userToUpdate = users.find(u => u.id === userId);
    if (userToUpdate) {
      // Verifica se o usuário atual tem permissão para alterar perfis (apenas manager e admin)
      if (!isManager) {
        Alert.alert(
          "Permissão negada",
          "Apenas síndicos e administradores podem alterar perfis de usuários."
        );
        return;
      }
      
      setSelectedUser(userToUpdate);
      setModalVisible(true);
    }
  };
  
  const handleRoleSelect = async (newRole: 'resident' | 'manager' | 'admin' | 'visitor') => {
    if (!selectedUser) return;
    
    // Verificar permissões (apenas admin pode definir perfil admin)
    if (newRole === 'admin' && !isAdmin) {
      Alert.alert(
        "Permissão negada",
        "Somente administradores podem promover usuários a administradores."
      );
      setModalVisible(false);
      return;
    }
    
    // Confirmar a mudança
    if (selectedUser.role !== newRole) {
      try {
        await updateUser(selectedUser.id, { role: newRole });
        Alert.alert(
          "Sucesso",
          `Perfil do usuário ${selectedUser.name} alterado para ${
            USER_ROLES.find(r => r.id === newRole)?.name || newRole
          }.`
        );
      } catch (err) {
        Alert.alert(
          "Erro",
          "Não foi possível alterar o perfil do usuário. Tente novamente."
        );
      }
    }
    
    setModalVisible(false);
    setSelectedUser(null);
  };
  
  const handleDeleteUser = (userId: string, userName: string) => {
    // Verificar se o usuário atual tem permissão para remover usuários
    if (!isManager) {
      Alert.alert(
        "Permissão negada",
        "Apenas síndicos e administradores podem remover usuários."
      );
      return;
    }
    
    // Confirmar a ação antes de prosseguir
    Alert.alert(
      "Confirmar exclusão",
      `Tem certeza que deseja remover o usuário ${userName}?`,
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUser(userId);
              Alert.alert(
                "Sucesso",
                `Usuário ${userName} removido com sucesso.`
              );
            } catch (err) {
              Alert.alert(
                "Erro",
                "Não foi possível remover o usuário. Tente novamente."
              );
            }
          }
        }
      ]
    );
  };
  
  if (!isManager) {
    // Redirecionar usuários sem permissão
    router.back();
    return null;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gerenciar Usuários</Text>
        <View style={{ width: 40 }} /> {/* Espaçador para centralizar o título */}
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuário..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filtersContainer}>
          <View style={styles.filterHeader}>
            <Filter size={16} color={Colors.text} />
            <Text style={styles.filterHeaderText}>Filtrar por perfil:</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                roleFilter === null && styles.activeFilterChip
              ]}
              onPress={() => setRoleFilter(null)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  roleFilter === null && styles.activeFilterChipText
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>
            {USER_ROLES.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.filterChip,
                  roleFilter === role.id && styles.activeFilterChip
                ]}
                onPress={() => setRoleFilter(role.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    roleFilter === role.id && styles.activeFilterChipText
                  ]}
                >
                  {role.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
      
      {isLoading && users.length === 0 ? (
        <LoadingIndicator fullScreen text="Carregando usuários..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Ocorreu um erro ao carregar os usuários. Tente novamente.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              clearError();
              fetchUsers();
            }}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title={searchQuery || roleFilter 
            ? "Nenhum usuário encontrado" 
            : "Nenhum usuário cadastrado"
          }
          description={searchQuery || roleFilter
            ? "Tente alterar os filtros de busca"
            : "Não há usuários cadastrados no sistema"
          }
          icon={<Users size={48} color={Colors.gray[400]} />}
        />
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={({ item }) => (
            <UserCard 
              user={item} 
              onRoleChange={handleRoleChange}
              onDeleteUser={handleDeleteUser}
              canChangeRole={isManager}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      <RoleSelectionModal
        visible={modalVisible}
        user={selectedUser}
        onClose={() => {
          setModalVisible(false);
          setSelectedUser(null);
        }}
        onSelect={handleRoleSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.text,
  },
  filtersContainer: {
    marginTop: 12,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 6,
  },
  filtersScrollContent: {
    paddingRight: 16,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  activeFilterChip: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.text,
  },
  activeFilterChipText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  userIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nameContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  userRole: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  userDetails: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.gray[700],
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 12,
  },
  changeRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  changeRoleText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    color: Colors.error,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.gray[600],
    marginBottom: 16,
  },
  rolesList: {
    maxHeight: 300,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.background,
    position: 'relative',
  },
  selectedRoleItem: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  roleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  roleDescription: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    position: 'absolute',
    right: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: Colors.gray[200],
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[700],
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  listContent: {
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
}); 