import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, Platform } from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useTopicsStore } from '@/store/topics-store';
import { useMeetingsStore } from '@/store/meetings-store';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { Calendar, Clock, MapPin, FileText, Users, Camera, File, ArrowLeft, X, Shield } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DatePickerWrapper from '@/components/DatePickerWrapper';

export default function CreateMeetingScreen() {
  const { user } = useAuthStore();
  const { topics } = useTopicsStore();
  const { createMeeting } = useMeetingsStore();
  
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const hasPermission = isAdmin || isManager;
  
  // Redirecionar usuários não autorizados
  useEffect(() => {
    if (!hasPermission) {
      // Permitir que a tela seja carregada antes de mostrar o estado restrito
      // para evitar flash de conteúdo não autorizado
    }
  }, [hasPermission]);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [documents, setDocuments] = useState<{name: string, uri: string}[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    
    // Keep the time from the current date, but update the day, month, year
    const newDate = new Date(date);
    newDate.setFullYear(currentDate.getFullYear());
    newDate.setMonth(currentDate.getMonth());
    newDate.setDate(currentDate.getDate());
    
    setDate(newDate);
  };
  
  const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    const currentTime = selectedTime || date;
    
    // Keep the date from the current date, but update the time
    const newDate = new Date(date);
    newDate.setHours(currentTime.getHours());
    newDate.setMinutes(currentTime.getMinutes());
    
    setDate(newDate);
  };

  // Função para fazer upload de arquivos para o Firebase Storage
  const uploadFileToStorage = async (uri: string, path: string): Promise<string> => {
    // Converter uri para blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Referência para o arquivo no Storage
    const storage = getStorage();
    const fileRef = ref(storage, path);
    
    // Fazer upload
    await uploadBytes(fileRef, blob);
    
    // Pegar a URL do arquivo
    const downloadURL = await getDownloadURL(fileRef);
    return downloadURL;
  };
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, informe o título da reunião.');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Erro', 'Por favor, informe a descrição da reunião.');
      return;
    }
    
    if (!location.trim()) {
      Alert.alert('Erro', 'Por favor, informe o local da reunião.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Array para armazenar URLs das imagens no Firebase Storage
      let imageUrls: string[] = [];
      let documentUrls: { name: string, uri: string }[] = [];
      
      // Upload de imagens para o Firebase Storage
      if (images.length > 0) {
        setUploadProgress(10);
        const totalFiles = images.length + documents.length;
        let processedFiles = 0;
        
        for (const imageUri of images) {
          const filename = imageUri.split('/').pop() || `meeting_image_${Date.now()}`;
          const path = `meetings/${user?.id || 'anonymous'}/${Date.now()}_${filename}`;
          
          const downloadURL = await uploadFileToStorage(imageUri, path);
          imageUrls.push(downloadURL);
          
          processedFiles++;
          setUploadProgress(Math.round((processedFiles / totalFiles) * 50));
        }
      }
      
      // Upload de documentos para o Firebase Storage
      if (documents.length > 0) {
        for (const doc of documents) {
          const filename = doc.name || doc.uri.split('/').pop() || `meeting_doc_${Date.now()}`;
          const path = `meetings/${user?.id || 'anonymous'}/docs/${Date.now()}_${filename}`;
          
          const downloadURL = await uploadFileToStorage(doc.uri, path);
          documentUrls.push({ name: doc.name, uri: downloadURL });
          
          const totalFiles = images.length + documents.length;
          const processedFiles = imageUrls.length + documentUrls.length;
          setUploadProgress(Math.round((processedFiles / totalFiles) * 50) + 50);
        }
      }
      
      // Criar objeto com dados da reunião
      const meetingData = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        date: date.getTime(),
        status: 'scheduled' as 'scheduled' | 'canceled' | 'completed',
        createdBy: user?.id || 'anonymous',
        images: imageUrls,
        documents: documentUrls,
      };
      
      // Chamar função do store para salvar no Firebase
      const meetingId = await createMeeting(meetingData);
      
      if (meetingId) {
        setCreatedMeeting({
          ...meetingData,
          id: meetingId,
          createdAt: Date.now(),
        });
        setShowSuccess(true);
      } else {
        Alert.alert('Erro', 'Não foi possível criar a reunião. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao criar reunião:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao criar a reunião. Tente novamente.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  // Acesso restrito para usuários sem permissão
  if (!hasPermission) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: 'Acesso Restrito',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => router.back()}
                style={{ marginRight: 16 }}
              >
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
            )
          }}
        />
        <View style={styles.restrictedContainer}>
          <Shield size={48} color={Colors.error} />
          <Text style={styles.restrictedTitle}>Acesso Restrito</Text>
          <Text style={styles.restrictedDescription}>
            Apenas Síndicos e Administradores podem criar novas reuniões.
          </Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToHome}
          >
            <Text style={styles.backButtonText}>Voltar para a tela inicial</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const takePicture = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permissão necessária', 'Precisamos da permissão da câmera para tirar fotos.');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!result.canceled) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao tirar a foto. Tente novamente.');
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
      Alert.alert('Erro', 'Ocorreu um erro ao selecionar a imagem. Tente novamente.');
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
      Alert.alert('Erro', 'Ocorreu um erro ao selecionar o documento. Tente novamente.');
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

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setDate(new Date());
    setImages([]);
    setDocuments([]);
    setShowSuccess(false);
    setUploadProgress(0);
  };

  if (showSuccess) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: 'Reunião Criada',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => router.back()}
                style={{ marginRight: 16 }}
              >
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
            )
          }}
        />
        <View style={styles.successContainer}>
          <Text style={styles.successTitle}>Reunião Criada com Sucesso!</Text>
          <View style={styles.successCard}>
            <Text style={styles.successCardTitle}>{createdMeeting.title}</Text>
            <Text style={styles.successCardDescription}>{createdMeeting.description}</Text>
            
            <View style={styles.successDetailItem}>
              <MapPin size={16} color={Colors.gray[500]} />
              <Text style={styles.successDetailText}>{createdMeeting.location}</Text>
            </View>
            
            <View style={styles.successDetailItem}>
              <Calendar size={16} color={Colors.gray[500]} />
              <Text style={styles.successDetailText}>
                {new Date(createdMeeting.date).toLocaleDateString('pt-BR')}
              </Text>
            </View>
            
            <View style={styles.successDetailItem}>
              <Clock size={16} color={Colors.gray[500]} />
              <Text style={styles.successDetailText}>
                {new Date(createdMeeting.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            
            {images.length > 0 && (
              <View style={styles.successImagesContainer}>
                <Text style={styles.successSectionTitle}>Imagens:</Text>
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
                {documents.map((doc, index) => (
                  <View key={index} style={styles.successDocument}>
                    <File size={16} color={Colors.primary} />
                    <Text style={styles.successDocumentName}>{doc.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.buttonContainer}>
            <Button
              title="Voltar para a lista"
              onPress={() => router.back()}
              style={styles.backButton}
            />
            <Button
              title="Criar outra reunião"
              onPress={resetForm}
              variant="outline"
              style={styles.newMeetingButton}
            />
          </View>
        </View>
      </>
    );
  }
  
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Nova Reunião',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
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
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Preencha os dados abaixo para agendar uma nova reunião de condomínio.
        </Text>
        
        <View style={styles.formContainer}>
          <Input
            label="Título da Reunião"
            placeholder="Ex: Assembleia Geral Ordinária"
            value={title}
            onChangeText={setTitle}
            leftIcon={<FileText size={20} color={Colors.gray[500]} />}
          />
          
          <Input
            label="Descrição"
            placeholder="Descreva o objetivo e pauta da reunião"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            leftIcon={<FileText size={20} color={Colors.gray[500]} />}
          />
          
          <Input
            label="Local"
            placeholder="Ex: Salão de Festas do Condomínio"
            value={location}
            onChangeText={setLocation}
            leftIcon={<MapPin size={20} color={Colors.gray[500]} />}
          />
          
          <Text style={styles.label}>Data e Hora</Text>
          <View style={styles.dateTimeContainer}>
            <View style={styles.formGroup}>
              <DatePickerWrapper
                label="Data da Reunião*"
                value={date}
                onChange={handleDateChange}
                mode="date"
              />
            </View>
            
            <View style={styles.formGroup}>
              <DatePickerWrapper
                label="Horário da Reunião*"
                value={date}
                onChange={handleTimeChange}
                mode="time"
              />
            </View>
          </View>
          
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
          
          <View style={styles.buttonContainer}>
            <Button
              title="Cancelar"
              onPress={() => router.back()}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title="Criar Reunião"
              onPress={handleSubmit}
              isLoading={isSubmitting}
              style={styles.submitButton}
            />
          </View>
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
  subtitle: {
    fontSize: 16,
    color: Colors.gray[500],
    marginBottom: 24,
  },
  formContainer: {
    backgroundColor: Colors.card,
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
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  formGroup: {
    flex: 1,
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
    backgroundColor: Colors.gray[100],
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
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
  successDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  successDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.gray[700],
  },
  successSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
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
    flex: 1,
    marginRight: 8,
  },
  newMeetingButton: {
    flex: 1,
    marginLeft: 8,
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  restrictedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.error,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  restrictedDescription: {
    fontSize: 14,
    color: Colors.gray[700],
    textAlign: 'center',
    marginBottom: 24,
  },
  backButtonText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
});