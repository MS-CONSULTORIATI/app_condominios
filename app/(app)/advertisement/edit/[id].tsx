import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useAdvertisementsStore } from '@/store/advertisements-store';
import Colors from '@/constants/colors';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { ArrowLeft, Image as ImageIcon, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import LoadingIndicator from '@/components/LoadingIndicator';

// Categorias pré-definidas
const CATEGORIES = [
  'Eletrônicos',
  'Móveis',
  'Eletrodomésticos',
  'Esportes',
  'Roupas',
  'Livros',
  'Veículos',
  'Imóveis',
  'Serviços',
  'Outros'
];

export default function EditAdvertisementScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { getAdvertisement, updateAdvertisement, fetchAdvertisements, isLoading } = useAdvertisementsStore();
  
  // Estados do formulário
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [contact, setContact] = useState('');
  const [house, setHouse] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuction, setIsAuction] = useState(false);
  
  // Carregar os dados do anúncio
  useEffect(() => {
    const loadAdvertisement = async () => {
      setLoading(true);
      try {
        await fetchAdvertisements();
        const advertisement = getAdvertisement(id as string);
        
        if (!advertisement) {
          Alert.alert(
            'Erro',
            'Anúncio não encontrado.',
            [{ text: 'OK', onPress: () => router.push('/advertisements') }]
          );
          return;
        }
        
        // Verificar se o usuário é o dono do anúncio
        if (user?.id !== advertisement.createdBy) {
          Alert.alert(
            'Acesso Negado',
            'Você não tem permissão para editar este anúncio.',
            [{ text: 'OK', onPress: () => router.push('/advertisements') }]
          );
          return;
        }
        
        // Preencher o formulário com os dados do anúncio
        setTitle(advertisement.title);
        setDescription(advertisement.description);
        setPrice(advertisement.price.toString().replace('.', ','));
        setCategory(advertisement.category);
        setContact(advertisement.ownerContact || '');
        setHouse(advertisement.house || '');
        setIsAuction(advertisement.isAuction);
        setPhotoURL(advertisement.photoURL || null);
        
      } catch (error) {
        console.error('Erro ao carregar anúncio:', error);
        Alert.alert(
          'Erro',
          'Ocorreu um erro ao carregar os dados do anúncio.',
          [{ text: 'OK', onPress: () => router.push('/advertisements') }]
        );
      } finally {
        setLoading(false);
      }
    };
    
    loadAdvertisement();
  }, [id]);
  
  // Gerenciar permissões de câmera e galeria
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissões necessárias',
          'Precisamos de permissão para acessar sua câmera e galeria de fotos.'
        );
        return false;
      }
      return true;
    }
    return true;
  };
  
  // Selecionar foto da galeria
  const handlePickImage = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem. Tente novamente.');
    }
  };
  
  // Tirar foto com a câmera
  const handleTakePhoto = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto. Tente novamente.');
    }
  };
  
  // Voltar para a tela anterior
  const handleBackPress = () => {
    router.back();
  };
  
  // Selecionar categoria
  const handleCategorySelect = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setShowCategories(false);
  };
  
  // Enviar formulário
  const handleSubmit = async () => {
    // Validação
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, informe o título do anúncio.');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Erro', 'Por favor, informe a descrição do anúncio.');
      return;
    }
    
    if (!price.trim() || isNaN(parseFloat(price.replace(',', '.')))) {
      Alert.alert('Erro', 'Por favor, informe um preço válido.');
      return;
    }
    
    if (!category.trim()) {
      Alert.alert('Erro', 'Por favor, selecione uma categoria.');
      return;
    }
    
    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado para editar um anúncio.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Formatar preço para número
      const priceValue = parseFloat(price.replace(',', '.'));
      
      // Criar objeto do anúncio
      const advertisementData = {
        id: id as string,
        title: title.trim(),
        description: description.trim(),
        price: priceValue,
        category: category.trim(),
        ownerContact: contact.trim() || undefined,
        house: house.trim(),
        isAuction: isAuction,
      };
      
      // Enviar para a API
      const success = await updateAdvertisement(advertisementData, newPhoto || undefined);
      
      if (success) {
        Alert.alert(
          'Sucesso',
          'Anúncio atualizado com sucesso!',
          [{ text: 'OK', onPress: () => router.push(`/advertisement/${id}`) }]
        );
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar o anúncio. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao atualizar anúncio:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao atualizar o anúncio. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading || isLoading) {
    return <LoadingIndicator fullScreen text="Carregando anúncio..." />;
  }
  
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Editar Anúncio',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={handleBackPress}
              style={{ marginRight: 16, marginLeft: 8 }}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          )
        }}
      />
      
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.subtitle}>
          Edite os dados do anúncio. Os campos com * são obrigatórios.
        </Text>
        
        <View style={styles.formContainer}>
          <Input
            label="Título*"
            placeholder="Ex: Sofá de 3 lugares"
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
          
          <Input
            label="Descrição*"
            placeholder="Descreva o produto, estado de conservação, etc."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
          <Input
            label="Preço (R$)*"
            placeholder="Ex: 150,00"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          
          <View style={styles.categoryContainer}>
            <Text style={styles.label}>Categoria*</Text>
            <TouchableOpacity 
              style={styles.categorySelector}
              onPress={() => setShowCategories(!showCategories)}
            >
              <Text style={category ? styles.categoryText : styles.categoryPlaceholder}>
                {category || 'Selecione uma categoria'}
              </Text>
            </TouchableOpacity>
            
            {showCategories && (
              <View style={styles.categoriesList}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      category === cat && styles.categoryOptionSelected
                    ]}
                    onPress={() => handleCategorySelect(cat)}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      category === cat && styles.categoryOptionTextSelected
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          <Input
            label="Contato (opcional)"
            placeholder="Seu telefone para contato"
            value={contact}
            onChangeText={setContact}
            keyboardType="phone-pad"
          />
          
          <Input
            label="Casa (opcional)"
            placeholder="Número ou identificação da sua casa"
            value={house}
            onChangeText={setHouse}
          />
          
          <Text style={styles.label}>Foto do produto (opcional)</Text>
          
          <View style={styles.photoContainer}>
            {newPhoto ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: newPhoto }} style={styles.photoPreview} />
                <TouchableOpacity 
                  style={styles.removePhotoButton}
                  onPress={() => setNewPhoto(null)}
                >
                  <Text style={styles.removePhotoText}>Remover Nova Foto</Text>
                </TouchableOpacity>
              </View>
            ) : photoURL ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photoURL }} style={styles.photoPreview} />
                <Text style={styles.currentPhotoText}>Foto atual</Text>
                <Text style={styles.photoHint}>
                  Para alterar a foto, selecione uma nova imagem
                </Text>
              </View>
            ) : (
              <View style={styles.photoPreviewContainer}>
                <Text style={styles.noPhotoText}>Sem foto</Text>
              </View>
            )}
            
            <View style={styles.photoButtons}>
              <TouchableOpacity 
                style={styles.photoButton}
                onPress={handlePickImage}
              >
                <ImageIcon size={24} color={Colors.primary} />
                <Text style={styles.photoButtonText}>Galeria</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.photoButton}
                onPress={handleTakePhoto}
              >
                <Camera size={24} color={Colors.primary} />
                <Text style={styles.photoButtonText}>Câmera</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <Button
            title="Salvar Alterações"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            style={styles.submitButton}
          />
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.push(`/advertisement/${id}`)}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray[600],
    marginBottom: 24,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categorySelector: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    padding: 12,
    backgroundColor: Colors.gray[100],
  },
  categoryText: {
    fontSize: 16,
    color: Colors.text,
  },
  categoryPlaceholder: {
    fontSize: 16,
    color: Colors.gray[400],
  },
  categoriesList: {
    marginTop: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    padding: 8,
    maxHeight: 200,
  },
  categoryOption: {
    padding: 10,
    borderRadius: 4,
    marginBottom: 4,
  },
  categoryOptionSelected: {
    backgroundColor: Colors.primary + '20',
  },
  categoryOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  categoryOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  photoContainer: {
    marginBottom: 24,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  photoButton: {
    backgroundColor: Colors.gray[100],
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '45%',
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderStyle: 'dashed',
  },
  photoButtonText: {
    color: Colors.primary,
    marginTop: 8,
    fontWeight: '500',
  },
  photoPreviewContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  removePhotoButton: {
    backgroundColor: Colors.error + '20',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  removePhotoText: {
    color: Colors.error,
    fontWeight: '500',
  },
  currentPhotoText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    marginBottom: 4,
  },
  photoHint: {
    fontSize: 12,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  noPhotoText: {
    fontSize: 16,
    color: Colors.gray[500],
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 24,
  },
  cancelButton: {
    marginTop: 12,
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    color: Colors.gray[600],
    fontSize: 16,
  },
}); 