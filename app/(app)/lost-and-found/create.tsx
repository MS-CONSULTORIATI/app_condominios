import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { createLostAndFoundItem } from '@/lib/firebase';
import { LostAndFoundItem } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import Colors from '@/constants/colors';
import { ArrowLeft } from 'lucide-react-native';

export default function CreateLostAndFoundScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<'lost' | 'found'>('lost');
  const [house, setHouse] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Limpar os dados ao entrar na tela
  useFocusEffect(
    React.useCallback(() => {
      console.log('Limpando formulário de criação de item perdido/encontrado');
      resetForm();
      return () => {
        // Cleanup function if needed
      };
    }, [])
  );

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setCategory('lost');
    setHouse('');
    setPhone('');
    setDate(new Date());
    setImages([]);
    setShowDatePicker(false);
  };

  const formatDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
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

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        Alert.alert('Erro', 'Você precisa estar logado para criar um anúncio');
        return;
      }
      
      const newItem: Omit<LostAndFoundItem, 'id' | 'createdAt'> = {
        title,
        description,
        category,
        location,
        date: date.getTime(),
        house,
        phone,
        status: 'active',
        images,
        createdBy: currentUser.uid
      };
      
      await createLostAndFoundItem(newItem);
      
      Alert.alert(
        'Sucesso', 
        'Item registrado com sucesso!',
        [{ text: 'OK', onPress: () => router.push('/(app)/lost-and-found') }]
      );
    } catch (error) {
      console.error('Erro ao criar item:', error);
      Alert.alert('Erro', 'Não foi possível registrar o item. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    // Navegar de volta para a lista de Achados e Perdidos
    router.push('/(app)/lost-and-found');
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Novo Item',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={handleGoBack}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          )
        }} 
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.formContainer}>
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
                styles.categoryText,
                category === 'lost' && styles.categoryTextActive
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
                styles.categoryText,
                category === 'found' && styles.categoryTextActive
              ]}>Encontrei algo</Text>
            </TouchableOpacity>
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
          
          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <FontAwesome name="check" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Registrar Item</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 50,
  },
  backButton: {
    marginRight: 16,
    marginLeft: 8,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categorySelector: {
    flexDirection: 'row',
    marginBottom: 20,
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
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  categoryTextActive: {
    color: 'white',
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 