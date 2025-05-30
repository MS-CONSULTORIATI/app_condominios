import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useNewsStore } from '@/store/news-store';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera } from 'expo-camera';
import Colors from '@/constants/colors';
import { 
  ArrowLeft,
  Camera as CameraIcon,
  Image as ImageIcon,
  FilePlus,
  X,
  Send,
  Save,
  Star,
  Eye,
  EyeOff
} from 'lucide-react-native';

export default function CreateNewsScreen() {
  const { user } = useAuthStore();
  const { createNews, isLoading } = useNewsStore();
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('');
  const [featured, setFeatured] = useState(false);
  const [visible, setVisible] = useState(true);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [documents, setDocuments] = useState<{uri: string; name: string}[]>([]);
  
  // Verificar permissões
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  
  useEffect(() => {
    if (!isManager) {
      Alert.alert(
        "Permissão negada", 
        "Apenas gerentes podem criar notícias.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [isManager, router]);
  
  const handleBackPress = () => {
    router.push('/news');
  };
  
  const handleCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        "Permissão negada",
        "Precisamos de permissão para acessar a câmera."
      );
      return false;
    }
    return true;
  };
  
  const handleTakePhoto = async () => {
    const hasPermission = await handleCameraPermission();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        if (!coverImage) {
          setCoverImage(result.assets[0].uri);
        } else {
          setAdditionalImages(prev => [...prev, result.assets[0].uri]);
        }
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert("Erro", "Não foi possível tirar a foto.");
    }
  };
  
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        if (!coverImage) {
          setCoverImage(result.assets[0].uri);
        } else {
          setAdditionalImages(prev => [...prev, result.assets[0].uri]);
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert("Erro", "Não foi possível selecionar a imagem.");
    }
  };
  
  const handleRemoveCoverImage = () => {
    setCoverImage(null);
  };
  
  const handleRemoveAdditionalImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        // Aceitar qualquer tipo de documento
        type: '*/*',
      });
      
      if (result.canceled) return;
      
      const docAsset = result.assets[0];
      
      // Verificar o tamanho do arquivo (limite de 5MB)
      if (docAsset.size > 5 * 1024 * 1024) {
        Alert.alert(
          "Arquivo muito grande",
          "O documento não pode ter mais de 5MB."
        );
        return;
      }
      
      setDocuments(prev => [...prev, {
        uri: docAsset.uri,
        name: docAsset.name
      }]);
    } catch (error) {
      console.error('Erro ao selecionar documento:', error);
      Alert.alert("Erro", "Não foi possível selecionar o documento.");
    }
  };
  
  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleToggleFeatured = () => {
    setFeatured(prev => !prev);
  };
  
  const handleToggleVisible = () => {
    setVisible(prev => !prev);
  };
  
  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert("Campo obrigatório", "Título é obrigatório.");
      return false;
    }
    
    if (!content.trim()) {
      Alert.alert("Campo obrigatório", "Conteúdo é obrigatório.");
      return false;
    }
    
    return true;
  };
  
  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    
    try {
      const newsId = await createNews(
        {
          title,
          content,
          summary: summary.trim() || undefined,
          category: category.trim() || undefined,
          featured,
          visible,
          status: 'draft',
          publishDate: Date.now()
        },
        coverImage || undefined,
        additionalImages,
        documents
      );
      
      if (newsId) {
        Alert.alert(
          "Sucesso",
          "Rascunho salvo com sucesso!",
          [{ text: "OK", onPress: () => router.push('/news') }]
        );
      }
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      Alert.alert("Erro", "Não foi possível salvar o rascunho.");
    }
  };
  
  const handlePublish = async () => {
    if (!validateForm()) return;
    
    try {
      const newsId = await createNews(
        {
          title,
          content,
          summary: summary.trim() || undefined,
          category: category.trim() || undefined,
          featured,
          visible,
          status: 'published',
          publishDate: Date.now()
        },
        coverImage || undefined,
        additionalImages,
        documents
      );
      
      if (newsId) {
        Alert.alert(
          "Sucesso",
          "Notícia publicada com sucesso!",
          [{ text: "OK", onPress: () => router.push('/news') }]
        );
      }
    } catch (error) {
      console.error('Erro ao publicar notícia:', error);
      Alert.alert("Erro", "Não foi possível publicar a notícia.");
    }
  };
  
  if (!isManager) {
    return null;
  }
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Nova Notícia',
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: 'white',
          headerTitleAlign: 'center',
        }} 
      />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackPress}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nova Notícia</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={[
                  styles.starButton,
                  featured && styles.starButtonActive
                ]}
                onPress={handleToggleFeatured}
              >
                <Star 
                  size={20} 
                  color={featured ? 'white' : Colors.warning} 
                  fill={featured ? 'white' : 'transparent'} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleButton, featured && styles.toggleButtonActive]}
                onPress={handleToggleFeatured}
              >
                <Star 
                  size={18} 
                  color={featured ? "#FFFFFF" : Colors.warning} 
                  fill={featured ? "#FFFFFF" : "transparent"} 
                />
                <Text 
                  style={[
                    styles.toggleButtonText, 
                    featured && styles.toggleButtonTextActive
                  ]}
                >
                  {featured ? "Destacada" : "Destacar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Título*</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Digite o título da notícia"
                placeholderTextColor={Colors.gray[400]}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Resumo</Text>
              <TextInput
                style={styles.input}
                value={summary}
                onChangeText={setSummary}
                placeholder="Breve resumo da notícia (opcional)"
                placeholderTextColor={Colors.gray[400]}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Categoria</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="Ex: Eventos, Comunicados, Manutenção (opcional)"
                placeholderTextColor={Colors.gray[400]}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Conteúdo*</Text>
              <TextInput
                style={[styles.input, styles.contentInput]}
                value={content}
                onChangeText={setContent}
                placeholder="Digite o conteúdo completo da notícia"
                placeholderTextColor={Colors.gray[400]}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Imagem de capa</Text>
              <View style={styles.imageControls}>
                <TouchableOpacity 
                  style={styles.imageButton}
                  onPress={handleTakePhoto}
                >
                  <CameraIcon size={20} color={Colors.primary} />
                  <Text style={styles.buttonText}>Câmera</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.imageButton}
                  onPress={handlePickImage}
                >
                  <ImageIcon size={20} color={Colors.primary} />
                  <Text style={styles.buttonText}>Galeria</Text>
                </TouchableOpacity>
              </View>
              
              {coverImage && (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: coverImage }}
                    style={styles.coverImagePreview}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={handleRemoveCoverImage}
                  >
                    <X size={20} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Imagens adicionais</Text>
              <View style={styles.imageControls}>
                <TouchableOpacity 
                  style={styles.imageButton}
                  onPress={handleTakePhoto}
                >
                  <CameraIcon size={20} color={Colors.primary} />
                  <Text style={styles.buttonText}>Câmera</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.imageButton}
                  onPress={handlePickImage}
                >
                  <ImageIcon size={20} color={Colors.primary} />
                  <Text style={styles.buttonText}>Galeria</Text>
                </TouchableOpacity>
              </View>
              
              {additionalImages.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.imagesPreviewContainer}
                >
                  {additionalImages.map((uri, index) => (
                    <View key={`img-${index}`} style={styles.additionalImageContainer}>
                      <Image
                        source={{ uri }}
                        style={styles.additionalImagePreview}
                      />
                      <TouchableOpacity
                        style={styles.removeAdditionalImageButton}
                        onPress={() => handleRemoveAdditionalImage(index)}
                      >
                        <X size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Documentos</Text>
              <TouchableOpacity 
                style={styles.documentButton}
                onPress={handlePickDocument}
              >
                <FilePlus size={20} color={Colors.primary} />
                <Text style={styles.buttonText}>Adicionar documento</Text>
              </TouchableOpacity>
              
              {documents.length > 0 && (
                <View style={styles.documentsContainer}>
                  {documents.map((doc, index) => (
                    <View key={`doc-${index}`} style={styles.documentItem}>
                      <Text style={styles.documentName} numberOfLines={1}>
                        {doc.name}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeDocumentButton}
                        onPress={() => handleRemoveDocument(index)}
                      >
                        <X size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
          
          <View style={styles.actionButtons}>
            {isLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
              <>
                {/* Toggle Visible */}
                <TouchableOpacity 
                  style={[styles.visibilityButton, { backgroundColor: visible ? Colors.success : Colors.gray[200] }]}
                  onPress={handleToggleVisible}
                >
                  {visible ? (
                    <Eye size={18} color="#FFFFFF" />
                  ) : (
                    <EyeOff size={18} color={Colors.gray[600]} />
                  )}
                  <Text style={styles.visibilityButtonText}>
                    {visible ? "Visível" : "Oculta"}
                  </Text>
                </TouchableOpacity>
              
                {/* Save Draft Button */}
                <TouchableOpacity 
                  style={styles.draftButton}
                  onPress={handleSaveDraft}
                  disabled={isLoading}
                >
                  <Save size={20} color={Colors.gray[700]} />
                  <Text style={styles.draftButtonText}>Rascunho</Text>
                </TouchableOpacity>
                
                {/* Publish Button */}
                <TouchableOpacity 
                  style={styles.publishButton}
                  onPress={handlePublish}
                  disabled={isLoading}
                >
                  <Send size={20} color="#FFFFFF" />
                  <Text style={styles.publishButtonText}>Publicar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
  },
  starButtonActive: {
    backgroundColor: Colors.warning,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  contentInput: {
    minHeight: 150,
  },
  imageControls: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  buttonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  coverImagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagesPreviewContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  additionalImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  additionalImagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeAdditionalImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  documentsContainer: {
    marginTop: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray[100],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentName: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  removeDocumentButton: {
    padding: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    backgroundColor: Colors.white,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginRight: 8,
  },
  draftButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  publishButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  publishButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
  },
  toggleButtonActive: {
    backgroundColor: Colors.warning,
  },
  toggleButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  toggleButtonTextActive: {
    fontWeight: 'bold',
  },
  visibilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.gray[200],
    marginRight: 8,
  },
  visibilityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
}); 