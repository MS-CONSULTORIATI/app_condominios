import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSuggestionsStore } from '@/store/suggestions-store';
import { useAuthStore } from '@/store/auth-store';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { Save, Camera, File, ArrowLeft, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Suggestion } from '@/types';

export default function CreateSuggestionScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [documents, setDocuments] = useState<{name: string, uri: string}[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdSuggestion, setCreatedSuggestion] = useState<any>(null);
  
  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  
  const { createSuggestion, isLoading, error } = useSuggestionsStore();
  const { user } = useAuthStore();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setTitleError('');
    setDescriptionError('');
    
    // Validate title
    if (!title.trim()) {
      setTitleError('O título é obrigatório');
      isValid = false;
    }
    
    // Validate description
    if (!description.trim()) {
      setDescriptionError('A descrição é obrigatória');
      isValid = false;
    }
    
    return isValid;
  };

  const handleCreateSuggestion = async () => {
    if (validateForm()) {
      try {
        const newSuggestion: Omit<Suggestion, 'id' | 'createdAt'> = {
          title: title.trim(),
          description: description.trim(),
          status: 'pending',
          createdBy: user?.id || '',
          votes: 0,
          images: images,
          documents: documents.map(doc => ({ name: doc.name, uri: doc.uri })),
        };
        
        try {
          const suggestionRef = await createSuggestion(newSuggestion);
          console.log('Sugestão criada com sucesso, ID:', suggestionRef.id);
          
          // Criar objeto para exibição com ID
          const createdSuggestionWithId = {
            ...newSuggestion,
            id: suggestionRef.id,
            createdAt: Date.now()
          };
          
          setCreatedSuggestion(createdSuggestionWithId);
          setShowSuccess(true);
        } catch (uploadError) {
          console.error('Erro no upload ou criação:', uploadError);
          Alert.alert(
            'Erro no Upload', 
            'A sugestão foi enviada, mas houve um erro ao fazer upload das imagens. Tente novamente mais tarde.'
          );
        }
      } catch (error) {
        console.error('Error creating suggestion:', error);
        Alert.alert('Erro', 'Ocorreu um erro ao enviar a sugestão. Tente novamente.');
      }
    }
  };

  const takePicture = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Precisamos da permissão da câmera para tirar fotos.');
        return;
      }
    }
    
    setShowCamera(true);
  };

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
        
        if (!photo.canceled) {
          setImages([...images, photo.assets[0].uri]);
        }
        setShowCamera(false);
      } catch (error) {
        console.error('Error taking picture:', error);
        setShowCamera(false);
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!result.canceled) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled === false) {
        setDocuments([...documents, { name: result.assets[0].name, uri: result.assets[0].uri }]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const removeDocument = (index: number) => {
    const newDocuments = [...documents];
    newDocuments.splice(index, 1);
    setDocuments(newDocuments);
  };

  if (showSuccess) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successTitle}>Sugestão Enviada com Sucesso!</Text>
        <View style={styles.successCard}>
          <Text style={styles.successCardTitle}>{createdSuggestion.title}</Text>
          <Text style={styles.successCardDescription}>{createdSuggestion.description}</Text>
          
          {images.length > 0 && (
            <View style={styles.successImagesContainer}>
              <Text style={styles.successSectionTitle}>Imagens:</Text>
              <Text style={styles.successNote}>
                Suas imagens foram enviadas e armazenadas com segurança.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {images.map((image, index) => (
                  <Image key={index} source={{ uri: image }} style={styles.successImage} />
                ))}
              </ScrollView>
            </View>
          )}
          
          {documents.length > 0 && (
            <View style={styles.successDocumentsContainer}>
              <Text style={styles.successSectionTitle}>Documentos:</Text>
              <Text style={styles.successNote}>
                Seus documentos foram enviados e armazenados com segurança.
              </Text>
              {documents.map((doc, index) => (
                <View key={index} style={styles.successDocument}>
                  <File size={16} color={Colors.primary} />
                  <Text style={styles.successDocumentName}>{doc.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        
        <Button
          title="Criar nova sugestão"
          onPress={() => {
            // Resetar o formulário e voltar para a tela de criação
            setTitle('');
            setDescription('');
            setImages([]);
            setDocuments([]);
            setShowSuccess(false);
          }}
          style={{ marginBottom: 8 }}
          variant="primary"
        />
        
        <Button
          title="Ver detalhes da sugestão"
          onPress={() => router.push({
            pathname: "/suggestion/[id]",
            params: { id: createdSuggestion.id }
          })}
          style={{ marginBottom: 8 }}
          variant="secondary"
        />
        
        <Button
          title="Voltar para a lista"
          onPress={() => router.push('/suggestions')}
          style={styles.backButton}
          variant="outline"
        />
      </View>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={cameraType}
          ref={cameraRef}
        >
          <View style={styles.cameraControls}>
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={() => setCameraType(cameraType === 'back' ? 'front' : 'back')}
            >
              <Text style={styles.cameraButtonText}>Virar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.cameraButton, styles.takePictureButton]}
              onPress={handleTakePicture}
            >
              <Text style={styles.cameraButtonText}>Tirar Foto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={() => setShowCamera(false)}
            >
              <Text style={styles.cameraButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/suggestions')} style={styles.backButtonIcon}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enviar Sugestão</Text>
        <View style={styles.headerRight} />
      </View>
      
      <Input
        label="Título"
        placeholder="Digite o título da sugestão"
        value={title}
        onChangeText={setTitle}
        error={titleError}
      />
      
      <Input
        label="Descrição"
        placeholder="Descreva sua sugestão detalhadamente"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={6}
        error={descriptionError}
      />
      
      <Text style={styles.sectionTitle}>Adicionar Mídia</Text>
      <View style={styles.mediaButtonsContainer}>
        <Button
          title="Tirar Foto"
          onPress={takePicture}
          variant="outline"
          size="small"
          leftIcon={<Camera size={18} color={Colors.primary} />}
          style={styles.mediaButton}
        />
        <Button
          title="Galeria"
          onPress={pickImage}
          variant="outline"
          size="small"
          leftIcon={<Camera size={18} color={Colors.primary} />}
          style={styles.mediaButton}
        />
        <Button
          title="Documento"
          onPress={pickDocument}
          variant="outline"
          size="small"
          leftIcon={<File size={18} color={Colors.primary} />}
          style={styles.mediaButton}
        />
      </View>
      
      {images.length > 0 && (
        <View style={styles.imagesContainer}>
          <Text style={styles.mediaTitle}>Imagens ({images.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.image} />
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      
      {documents.length > 0 && (
        <View style={styles.documentsContainer}>
          <Text style={styles.mediaTitle}>Documentos ({documents.length})</Text>
          {documents.map((doc, index) => (
            <View key={index} style={styles.documentItem}>
              <File size={20} color={Colors.primary} />
              <Text style={styles.documentName} numberOfLines={1} ellipsizeMode="middle">
                {doc.name}
              </Text>
              <TouchableOpacity 
                style={styles.removeDocumentButton}
                onPress={() => removeDocument(index)}
              >
                <X size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      <Button
        title="Enviar Sugestão"
        onPress={handleCreateSuggestion}
        isLoading={isLoading}
        style={styles.saveButton}
        leftIcon={<Save size={20} color="white" />}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerRight: {
    width: 24,
  },
  backButtonIcon: {
    padding: 4,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  mediaButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mediaButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentsContainer: {
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  documentName: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text,
  },
  removeDocumentButton: {
    padding: 4,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cameraButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  takePictureButton: {
    backgroundColor: Colors.primary,
  },
  cameraButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  successCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  successCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  successCardDescription: {
    fontSize: 14,
    color: Colors.gray[700],
    marginBottom: 12,
  },
  successSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  successImagesContainer: {
    marginBottom: 16,
  },
  successImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  successDocumentsContainer: {
    marginBottom: 8,
  },
  successDocument: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  successDocumentName: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text,
  },
  backButton: {
    marginTop: 8,
  },
  successNote: {
    fontSize: 14,
    color: Colors.gray[700],
    marginBottom: 8,
  },
});