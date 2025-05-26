import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal,
  TextInput,
  Linking,
  Platform
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { 
  getLostAndFoundItemById, 
  updateLostAndFoundItem, 
  deleteLostAndFoundItem,
  uploadLostAndFoundImage
} from '@/lib/firebase';
import { LostAndFoundItem } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import Colors from '@/constants/colors';
import { ArrowLeft } from 'lucide-react-native';

export default function LostAndFoundDetailScreen() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<LostAndFoundItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState(getAuth().currentUser);
  
  // Campos editáveis
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<'lost' | 'found'>('lost');
  const [house, setHouse] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(new Date());
  const [status, setStatus] = useState<'active' | 'resolved'>('active');
  const [images, setImages] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);

  const loadItem = async () => {
    if (typeof id !== 'string') return;
    
    try {
      setLoading(true);
      const fetchedItem = await getLostAndFoundItemById(id);
      setItem(fetchedItem);
      
      if (fetchedItem) {
        // Inicializar campos editáveis
        setTitle(fetchedItem.title);
        setDescription(fetchedItem.description);
        setLocation(fetchedItem.location);
        setCategory(fetchedItem.category);
        setHouse(fetchedItem.house);
        setPhone(fetchedItem.phone);
        setDate(new Date(fetchedItem.date));
        setStatus(fetchedItem.status);
        setImages(fetchedItem.images || []);
      }
    } catch (error) {
      console.error('Erro ao carregar item:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do item.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItem();
  }, [id]);

  const formatDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const handleContactOwner = () => {
    if (!item) return;
    
    const phoneNumber = item.phone.replace(/[^\d]/g, '');
    const url = `https://wa.me/55${phoneNumber}`;
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
        }
      })
      .catch(err => console.error('Erro ao abrir WhatsApp:', err));
  };

  const handleDeleteItem = async () => {
    if (typeof id !== 'string') return;
    
    try {
      setDeleting(true);
      await deleteLostAndFoundItem(id);
      Alert.alert(
        'Sucesso', 
        'Item excluído com sucesso!',
        [{ text: 'OK', onPress: () => router.push('/(app)/lost-and-found') }]
      );
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      Alert.alert('Erro', 'Não foi possível excluir o item. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este item?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', onPress: handleDeleteItem, style: 'destructive' }
      ]
    );
  };
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permissão negada', 'Precisamos de permissão para acessar suas fotos');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };
  
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permissão negada', 'Precisamos de permissão para acessar sua câmera');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };
  
  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };
  
  const handleSaveChanges = async () => {
    if (!validateForm() || !item) return;
    
    try {
      setSavingChanges(true);
      
      // Preparar dados atualizados
      const updatedItem: LostAndFoundItem = {
        ...item,
        title,
        description,
        category,
        location,
        date: date.getTime(),
        house,
        phone,
        status,
        images
      };
      
      await updateLostAndFoundItem(item.id, updatedItem);
      
      Alert.alert(
        'Sucesso', 
        'Item atualizado com sucesso!',
        [{ text: 'OK', onPress: () => setEditing(false) }]
      );
      
      // Recarregar item
      loadItem();
      
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o item. Tente novamente.');
    } finally {
      setSavingChanges(false);
    }
  };
  
  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'O título é obrigatório');
      return false;
    }
    
    if (!description.trim()) {
      Alert.alert('Erro', 'A descrição é obrigatória');
      return false;
    }
    
    if (!location.trim()) {
      Alert.alert('Erro', 'O local é obrigatório');
      return false;
    }
    
    if (!house.trim()) {
      Alert.alert('Erro', 'O número da casa/apartamento é obrigatório');
      return false;
    }
    
    if (!phone.trim()) {
      Alert.alert('Erro', 'O telefone (WhatsApp) é obrigatório');
      return false;
    }
    
    return true;
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: item ? 
            (item.category === 'lost' ? 'Item Perdido' : 'Item Encontrado') : 
            'Detalhes do Item',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(app)/lost-and-found')}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          )
        }} 
      />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Carregando detalhes...</Text>
          </View>
        ) : item ? (
          <>
            {editing ? (
              <ScrollView style={styles.scrollContainer}>
                <View style={styles.card}>
                  <View style={styles.header}>
                    <Text style={styles.editingTitle}>Editando Item</Text>
                    <TouchableOpacity 
                      style={styles.closeButton}
                      onPress={() => setEditing(false)}
                    >
                      <FontAwesome name="times" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Categoria</Text>
                    <View style={styles.categorySelector}>
                      <TouchableOpacity 
                        style={[
                          styles.categoryButton, 
                          category === 'lost' && styles.categoryButtonActive
                        ]}
                        onPress={() => setCategory('lost')}
                      >
                        <FontAwesome 
                          name="search" 
                          size={20} 
                          color={category === 'lost' ? '#fff' : '#666'} 
                        />
                        <Text style={[
                          styles.categoryButtonText,
                          category === 'lost' && styles.categoryButtonTextActive
                        ]}>Perdi algo</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[
                          styles.categoryButton, 
                          category === 'found' && styles.categoryButtonActive
                        ]}
                        onPress={() => setCategory('found')}
                      >
                        <FontAwesome 
                          name="question" 
                          size={20} 
                          color={category === 'found' ? '#fff' : '#666'} 
                        />
                        <Text style={[
                          styles.categoryButtonText,
                          category === 'found' && styles.categoryButtonTextActive
                        ]}>Encontrei algo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Título *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Chaves perdidas, Óculos encontrado..."
                      value={title}
                      onChangeText={setTitle}
                      maxLength={100}
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Descrição *</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Descreva o objeto com detalhes..."
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Local *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Onde foi perdido/encontrado?"
                      value={location}
                      onChangeText={setLocation}
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Data *</Text>
                    <TouchableOpacity 
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.dateText}>{formatDate(date)}</Text>
                      <FontAwesome name="calendar" size={18} color="#666" />
                    </TouchableOpacity>
                    
                    {showDatePicker && (
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                      />
                    )}
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Casa/Apartamento *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Seu número de casa/apartamento"
                      value={house}
                      onChangeText={setHouse}
                      keyboardType="number-pad"
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Telefone (WhatsApp) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Seu número com DDD"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Fotos</Text>
                    <View style={styles.imageButtons}>
                      <TouchableOpacity 
                        style={styles.imageButton}
                        onPress={pickImage}
                      >
                        <FontAwesome name="image" size={18} color="#666" />
                        <Text style={styles.imageButtonText}>Galeria</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.imageButton}
                        onPress={takePhoto}
                      >
                        <FontAwesome name="camera" size={18} color="#666" />
                        <Text style={styles.imageButtonText}>Câmera</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {images.length > 0 && (
                      <View style={styles.imagePreviewContainer}>
                        {images.map((uri, index) => (
                          <View key={index} style={styles.imagePreview}>
                            <Image source={{ uri }} style={styles.previewImage} />
                            <TouchableOpacity 
                              style={styles.removeImageButton}
                              onPress={() => removeImage(index)}
                            >
                              <FontAwesome name="times-circle" size={20} color="#ff4c4c" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.formActions}>
                    <TouchableOpacity 
                      style={styles.cancelButton} 
                      onPress={() => setEditing(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.saveButton} 
                      onPress={handleSaveChanges}
                      disabled={savingChanges}
                    >
                      {savingChanges ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <FontAwesome name="check" size={18} color="#fff" />
                          <Text style={styles.saveButtonText}>Salvar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            ) : (
              <ScrollView style={styles.scrollContainer}>
                <View style={styles.card}>
                  <View style={styles.header}>
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryText}>
                        {item.category === 'lost' ? 'Perdido' : 'Encontrado'}
                      </Text>
                    </View>
                    
                    {item.status === 'resolved' && (
                      <View style={styles.statusTag}>
                        <Text style={styles.statusText}>Devolvido</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.title}>{title}</Text>
                  
                  <View style={styles.infoContainer}>
                    <View style={styles.infoItem}>
                      <FontAwesome name="map-marker" size={16} color="#666" />
                      <Text style={styles.infoText}>{location}</Text>
                    </View>
                    
                    <View style={styles.infoItem}>
                      <FontAwesome name="calendar" size={16} color="#666" />
                      <Text style={styles.infoText}>{formatDate(date)}</Text>
                    </View>
                    
                    <View style={styles.infoItem}>
                      <FontAwesome name="home" size={16} color="#666" />
                      <Text style={styles.infoText}>Ap/Casa: {house}</Text>
                    </View>
                  </View>
                  
                  {/* Imagens */}
                  {images.length > 0 && (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.imagesContainer}
                    >
                      {images.map((image, index) => (
                        <Image 
                          key={index}
                          source={{ uri: image }} 
                          style={styles.image}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  )}
                  
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionTitle}>Descrição</Text>
                    <Text style={styles.descriptionText}>{description}</Text>
                  </View>
                  
                  {/* Botões de ação */}
                  <View style={styles.actionButtons}>
                    {item.status === 'active' && (
                      <TouchableOpacity 
                        style={styles.contactButton}
                        onPress={handleContactOwner}
                      >
                        <FontAwesome name="whatsapp" size={20} color="#fff" />
                        <Text style={styles.contactButtonText}>Contatar</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Se o item é do usuário atual */}
                    {currentUser && item.createdBy === currentUser.uid && (
                      <View style={styles.ownerActions}>
                        {item.status === 'active' && (
                          <TouchableOpacity 
                            style={styles.resolveButton}
                            onPress={() => {
                              Alert.alert(
                                "Marcar como devolvido",
                                "Deseja marcar este item como devolvido?",
                                [
                                  { text: "Cancelar", style: "cancel" },
                                  { 
                                    text: "Confirmar", 
                                    onPress: async () => {
                                      try {
                                        await updateLostAndFoundItem(item.id, {
                                          ...item,
                                          status: 'resolved'
                                        });
                                        loadItem();
                                      } catch (error) {
                                        console.error('Erro ao atualizar item:', error);
                                        Alert.alert('Erro', 'Não foi possível atualizar o item');
                                      }
                                    } 
                                  }
                                ]
                              );
                            }}
                          >
                            <FontAwesome name="check-circle" size={18} color="#fff" />
                            <Text style={styles.resolveButtonText}>Devolvido</Text>
                          </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={() => setEditing(true)}
                        >
                          <FontAwesome name="edit" size={18} color="#fff" />
                          <Text style={styles.editButtonText}>Editar</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={confirmDelete}
                        >
                          <FontAwesome name="trash" size={18} color="#fff" />
                          <Text style={styles.deleteButtonText}>Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Item não encontrado</Text>
            <TouchableOpacity 
              style={styles.backButtonFallback}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  backButton: {
    marginRight: 16,
    marginLeft: 8,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    color: Colors.error,
    marginBottom: 16,
  },
  backButtonFallback: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryTag: {
    backgroundColor: Colors.primary + '20',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  statusTag: {
    backgroundColor: Colors.success + '20',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  infoContainer: {
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginRight: 8,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionButtons: {
    marginTop: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366', // WhatsApp green
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  contactButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  ownerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  resolveButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 6,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warning,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 6,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 6,
  },
  editingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 100,
  },
  categorySelector: {
    flexDirection: 'row',
    marginTop: 8,
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
  },
  categoryButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  imagePreview: {
    width: 100,
    height: 100,
    margin: 4,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
}); 