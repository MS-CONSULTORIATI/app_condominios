import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { createPackage, getUsers } from '@/lib/firebase';
import { User } from '@/types';
import { useAuthStore } from '@/store/auth-store';

export default function CreatePackageScreen() {
  const [recipientId, setRecipientId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientUnit, setRecipientUnit] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [senderName, setSenderName] = useState('');
  const [description, setDescription] = useState('');
  const [observations, setObservations] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    // Verificar se o usuário é porteiro, gerente ou admin
    if (user?.role !== 'doorman' && user?.role !== 'admin' && user?.role !== 'manager') {
      Alert.alert('Acesso Negado', 'Apenas porteiros, gerentes e administradores podem registrar encomendas.');
      router.back();
      return;
    }

    loadUsers();
  }, [user]);

  const loadUsers = async () => {
    try {
      const usersData = await getUsers();
      setUsers(usersData.filter(u => u.role === 'resident'));
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const selectRecipient = (selectedUser: User) => {
    setRecipientId(selectedUser.id);
    setRecipientName(selectedUser.name);
    
    // Priorizar street/house, mas usar unit/apartment como fallback
    const unitInfo = selectedUser.street && selectedUser.house 
      ? `Rua ${selectedUser.street}, Casa ${selectedUser.house}`
      : selectedUser.unit || selectedUser.apartment || '';
    
    setRecipientUnit(unitInfo);
    setRecipientPhone(selectedUser.phone || '');
    setShowUserModal(false);
    setUserSearchQuery('');
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'É necessário permitir o acesso à câmera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'É necessário permitir o acesso à galeria.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!recipientId || !description.trim()) {
      Alert.alert('Erro', 'Por favor, selecione um destinatário e adicione uma descrição.');
      return;
    }

    try {
      setLoading(true);

      // Criar objeto base sem campos undefined
      const packageData: any = {
        recipientId,
        recipientName,
        recipientUnit,
        description: description.trim(),
        photos,
        status: 'pending' as const,
        createdBy: user!.id,
        createdByName: user!.name,
      };

      // Adicionar campos opcionais apenas se tiverem valor
      if (recipientPhone?.trim()) {
        packageData.recipientPhone = recipientPhone.trim();
      }
      
      if (senderName?.trim()) {
        packageData.senderName = senderName.trim();
      }
      
      if (observations?.trim()) {
        packageData.observations = observations.trim();
      }

      await createPackage(packageData);
      
      Alert.alert('Sucesso', 'Encomenda registrada com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erro ao criar encomenda:', error);
      Alert.alert('Erro', 'Não foi possível registrar a encomenda.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const searchTerm = userSearchQuery.toLowerCase().trim();
    if (!searchTerm) return true;
    
    return (
      u.name.toLowerCase().includes(searchTerm) ||
      (u.email && u.email.toLowerCase().includes(searchTerm)) ||
      (u.unit && u.unit.toLowerCase().includes(searchTerm)) ||
      (u.apartment && u.apartment.toLowerCase().includes(searchTerm)) ||
      (u.street && u.street.toLowerCase().includes(searchTerm)) ||
      (u.house && u.house.toLowerCase().includes(searchTerm)) ||
      (u.block && u.block.toLowerCase().includes(searchTerm)) ||
      (u.phone && u.phone.includes(searchTerm))
    );
  });

  const renderUserItem = ({ item }: { item: User }) => {
    // Determinar a informação de endereço a ser exibida
    const addressInfo = item.street && item.house 
      ? `Rua ${item.street}, Casa ${item.house}`
      : item.unit || item.apartment || 'Não informado';
    
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => selectRecipient(item)}
      >
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userUnit}>
          Endereço: {addressInfo}
          {item.block && ` - Bloco ${item.block}`}
        </Text>
        {item.email && (
          <Text style={styles.userEmail}>Email: {item.email}</Text>
        )}
        {item.phone && (
          <Text style={styles.userPhone}>Telefone: {item.phone}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Destinatário *</Text>
        <TouchableOpacity
          style={styles.recipientButton}
          onPress={() => setShowUserModal(true)}
        >
          <Text style={[styles.recipientButtonText, !recipientName && styles.placeholder]}>
            {recipientName || 'Selecionar destinatário'}
          </Text>
        </TouchableOpacity>

        {recipientName && (
          <View style={styles.recipientInfo}>
            <Text style={styles.recipientDetail}>Unidade: {recipientUnit}</Text>
            {recipientPhone && (
              <Text style={styles.recipientDetail}>Telefone: {recipientPhone}</Text>
            )}
          </View>
        )}

        <Text style={styles.label}>Remetente</Text>
        <TextInput
          style={styles.input}
          value={senderName}
          onChangeText={setSenderName}
          placeholder="Nome do remetente ou empresa"
        />

        <Text style={styles.label}>Descrição *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descreva a encomenda"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Observações</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={observations}
          onChangeText={setObservations}
          placeholder="Observações adicionais"
          multiline
          numberOfLines={2}
        />

        <Text style={styles.label}>Fotos</Text>
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
            <Text style={styles.photoButtonText}>📷 Câmera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
            <Text style={styles.photoButtonText}>🖼️ Galeria</Text>
          </TouchableOpacity>
        </View>

        {photos.length > 0 && (
          <View style={styles.photosContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Registrando...' : 'Registrar Encomenda'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showUserModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar Destinatário</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowUserModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            value={userSearchQuery}
            onChangeText={setUserSearchQuery}
            placeholder="Buscar por nome, email, rua, casa, unidade, bloco ou telefone..."
          />

          {userSearchQuery.trim() && (
            <View style={styles.searchResults}>
              <Text style={styles.searchResultsText}>
                {filteredUsers.length} usuário(s) encontrado(s)
              </Text>
            </View>
          )}

          <FlatList
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            style={styles.usersList}
            ListEmptyComponent={
              userSearchQuery.trim() ? (
                <View style={styles.emptyResults}>
                  <Text style={styles.emptyResultsText}>
                    Nenhum usuário encontrado para "{userSearchQuery}"
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  recipientButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  recipientButtonText: {
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  recipientInfo: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  recipientDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  photoItem: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#666',
  },
  searchInput: {
    margin: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchResults: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  searchResultsText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  emptyResults: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  usersList: {
    flex: 1,
  },
  userItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userUnit: {
    fontSize: 14,
    color: '#666',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
}); 