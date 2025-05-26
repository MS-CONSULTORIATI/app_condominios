import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform, Switch, Modal, FlatList } from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useAdvertisementsStore } from '@/store/advertisements-store';
import Colors from '@/constants/colors';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { ArrowLeft, Plus, Image as ImageIcon, Camera, Calendar, X, Eye } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import DatePickerWrapper from '@/components/DatePickerWrapper';

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

export default function CreateAdvertisementScreen() {
  const { user } = useAuthStore();
  const { createAdvertisement, isLoading } = useAdvertisementsStore();
  
  // Estados do formulário
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [contact, setContact] = useState('');
  const [house, setHouse] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isAuction, setIsAuction] = useState(false);
  const [auctionEndDate, setAuctionEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 dias por padrão
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  
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
        setPhotos([...photos, result.assets[0].uri]);
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
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto. Tente novamente.');
    }
  };
  
  // Remover foto
  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };
  
  // Visualizar foto em tela cheia
  const handlePreviewPhoto = (uri: string) => {
    setPreviewImage(uri);
    setShowImagePreview(true);
  };
  
  // Voltar para a tela anterior
  const handleBackPress = () => {
    router.push('/advertisements');
  };
  
  // Selecionar categoria
  const handleCategorySelect = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setShowCategories(false);
  };
  
  // Função para lidar com mudanças na data do leilão
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      // Garantir que a data seja pelo menos 1 dia no futuro
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 1);
      
      if (selectedDate < minDate) {
        Alert.alert('Data inválida', 'A data de término do leilão deve ser pelo menos 1 dia no futuro.');
        setAuctionEndDate(minDate);
      } else {
        setAuctionEndDate(selectedDate);
      }
    }
  };
  
  // Função para formatar a data para exibição
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    
    // Validação específica para leilão
    if (isAuction) {
      const now = new Date();
      if (auctionEndDate <= now) {
        Alert.alert('Erro', 'A data de término do leilão deve ser no futuro.');
        return;
      }
    }
    
    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado para criar um anúncio.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Formatar preço para número
      const priceValue = parseFloat(price.replace(',', '.'));
      
      // Verificar se contact está vazio e substituir por uma string vazia
      const contactValue = contact.trim() || "";
      
      // Garantir que auctionEndDate seja um número ou undefined (não null)
      const auctionEndDateValue = isAuction ? auctionEndDate.getTime() : undefined;
      
      // Criar objeto do anúncio
      const advertisementData = {
        title: title.trim(),
        description: description.trim(),
        price: priceValue,
        category: category.trim(),
        status: 'available' as const,
        ownerName: user.name,
        ownerUnit: user.unit || 'Não informada',
        ownerContact: contactValue,
        house: house.trim(),
        isAuction: isAuction,
        auctionEndDate: auctionEndDateValue,
        views: [],
        viewCount: 0
      };
      
      // Enviar para a API
      const adId = await createAdvertisement(advertisementData, photos.length > 0 ? photos : undefined);
      
      if (adId) {
        Alert.alert(
          'Sucesso',
          'Anúncio publicado com sucesso!',
          [{ text: 'OK', onPress: () => router.replace('/advertisements') }]
        );
      } else {
        Alert.alert('Erro', 'Não foi possível publicar o anúncio. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao criar anúncio:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao publicar o anúncio. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Renderizar item da lista de fotos
  const renderPhotoItem = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.photoItemContainer}>
      <Image source={{ uri: item }} style={styles.photoThumbnail} />
      <View style={styles.photoItemActions}>
        <TouchableOpacity
          style={styles.photoAction}
          onPress={() => handlePreviewPhoto(item)}
        >
          <Eye size={18} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.photoAction, styles.photoDeleteAction]}
          onPress={() => handleRemovePhoto(index)}
        >
          <X size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Novo Anúncio',
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
          Preencha os dados do anúncio. Os campos com * são obrigatórios.
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
          
          <View style={styles.toggleContainer}>
            <Text style={styles.label}>Leilão</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                Configurar como leilão {isAuction ? '(Lance inicial)' : '(Preço fixo)'}
              </Text>
              <Switch
                value={isAuction}
                onValueChange={setIsAuction}
                trackColor={{ false: Colors.gray[300], true: Colors.primary + '70' }}
                thumbColor={isAuction ? Colors.primary : Colors.gray[100]}
              />
            </View>
            
            {isAuction && (
              <View style={styles.formGroup}>
                <DatePickerWrapper
                  label="Data de término do leilão*"
                  value={auctionEndDate}
                  onChange={handleDateChange}
                  mode="datetime"
                />
              </View>
            )}
          </View>
          
          <Input
            label={isAuction ? "Lance inicial (R$)*" : "Preço (R$)*"}
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
              <View style={styles.categoriesListContainer}>
              <View style={styles.categoriesList}>
                  <ScrollView style={{ maxHeight: 200 }}>
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
                  </ScrollView>
                </View>
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
          
          <Text style={styles.label}>Fotos do produto (opcional)</Text>
          
          <View style={styles.photoContainer}>
            {photos.length > 0 && (
              <View style={styles.photosList}>
                <FlatList
                  data={photos}
                  renderItem={renderPhotoItem}
                  keyExtractor={(item, index) => `photo-${index}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosListContent}
                />
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
            title={isAuction ? "Publicar Leilão" : "Publicar Anúncio"}
            onPress={handleSubmit}
            isLoading={isSubmitting}
            style={styles.submitButton}
          />
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleBackPress}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Modal de pré-visualização de imagem */}
      <Modal
        visible={showImagePreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImagePreview(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowImagePreview(false)}
          >
            <X size={24} color="white" />
          </TouchableOpacity>
          
          {previewImage && (
            <Image 
              source={{ uri: previewImage }} 
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
  toggleContainer: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 14,
    color: Colors.gray[700],
  },
  formGroup: {
    marginTop: 8,
  },
  categoryContainer: {
    marginBottom: 16,
    zIndex: 10,
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
  categoriesListContainer: {
    position: 'relative',
    zIndex: 20,
  },
  categoriesList: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    padding: 8,
    maxHeight: 200,
    zIndex: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    marginBottom: 16,
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
  photosList: {
    marginBottom: 16,
  },
  photosListContent: {
    paddingVertical: 8,
  },
  photoItemContainer: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  photoItemActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
  },
  photoAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 4,
    borderRadius: 12,
    margin: 4,
  },
  photoDeleteAction: {
    backgroundColor: 'rgba(255, 200, 200, 0.8)',
  },
  submitButton: {
    marginTop: 8,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
}); 