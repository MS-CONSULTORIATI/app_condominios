import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useServiceProvidersStore } from '@/store/service-providers-store';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/colors';
import { ArrowLeft, Camera, X, Hammer, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ServiceProvider } from '@/types';
import LoadingIndicator from '@/components/LoadingIndicator';

export default function EditServiceProviderScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  
  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);

  const { 
    serviceProviders, 
    fetchServiceProviders, 
    updateServiceProvider, 
    uploadProviderPhoto, 
    isLoading 
  } = useServiceProvidersStore();

  useEffect(() => {
    if (!id) {
      Alert.alert('Erro', 'ID do prestador não encontrado');
      router.back();
      return;
    }
    
    const loadProvider = async () => {
      await fetchServiceProviders();
      setLoading(false);
    };
    
    loadProvider();
  }, [id]);
  
  useEffect(() => {
    if (!loading && serviceProviders.length > 0) {
      const provider = serviceProviders.find(p => p.id === id);
      
      if (provider) {
        setName(provider.name);
        setServiceType(provider.serviceType);
        setDescription(provider.description);
        setPhone(provider.phone);
        setWhatsapp(provider.whatsapp);
        setPhoto(provider.photo || null);
      } else {
        Alert.alert('Erro', 'Prestador não encontrado');
        router.back();
      }
    }
  }, [serviceProviders, loading, id]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!serviceType.trim()) {
      newErrors.serviceType = 'Tipo de serviço é obrigatório';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }
    
    if (!phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    }
    
    if (!whatsapp.trim()) {
      newErrors.whatsapp = 'WhatsApp é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImageFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permissão necessária", 
        "É necessário conceder permissão para acessar sua galeria de fotos."
      );
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };
  
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permissão necessária", 
        "É necessário conceder permissão para acessar sua câmera."
      );
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };
  
  const showImageOptions = () => {
    Alert.alert(
      "Alterar foto",
      "Escolha uma opção",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Tirar foto",
          onPress: takePhoto
        },
        {
          text: "Escolher da galeria",
          onPress: pickImageFromGallery
        }
      ]
    );
  };
  
  const handleBackPress = () => {
    router.replace('/service-providers');
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      let photoUrl = photo;
      
      // Se a foto foi alterada (não começa com http ou https), fazer upload
      if (photo && !photo.startsWith('http')) {
        photoUrl = await uploadProviderPhoto(id, photo);
      }
      
      const success = await updateServiceProvider(id, {
        name,
        serviceType,
        description,
        phone,
        whatsapp,
        ...(photoUrl ? { photo: photoUrl } : {})
      });
      
      if (!success) {
        throw new Error('Erro ao atualizar prestador de serviço');
      }
      
      Alert.alert(
        "Sucesso",
        "Prestador de serviço atualizado com sucesso!",
        [{ text: "OK", onPress: () => router.replace('/service-providers') }]
      );
    } catch (error) {
      console.error('Erro ao atualizar prestador:', error);
      Alert.alert(
        "Erro",
        "Ocorreu um erro ao atualizar o prestador de serviço. Tente novamente.",
        [{ text: "OK" }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingIndicator fullScreen text="Carregando prestador..." />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            disabled={submitting}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Prestador</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.formContainer}>
          {/* Foto do prestador */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              style={styles.photoContainer}
              onPress={showImageOptions}
              disabled={submitting}
            >
              {photo ? (
                <>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setPhoto(null)}
                    disabled={submitting}
                  >
                    <X size={16} color="white" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={32} color={Colors.gray[400]} />
                  <Text style={styles.photoText}>Adicionar foto</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Formulário */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Prestador *</Text>
            <TextInput
              style={[
                styles.input,
                errors.name ? styles.inputError : null
              ]}
              placeholder="Digite o nome do prestador"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: '' }));
                }
              }}
              editable={!submitting}
            />
            {errors.name ? (
              <Text style={styles.errorText}>{errors.name}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de Serviço *</Text>
            <TextInput
              style={[
                styles.input,
                errors.serviceType ? styles.inputError : null
              ]}
              placeholder="Ex: Eletricista, Encanador, Pintor"
              value={serviceType}
              onChangeText={(text) => {
                setServiceType(text);
                if (errors.serviceType) {
                  setErrors(prev => ({ ...prev, serviceType: '' }));
                }
              }}
              editable={!submitting}
            />
            {errors.serviceType ? (
              <Text style={styles.errorText}>{errors.serviceType}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição *</Text>
            <TextInput
              style={[
                styles.textArea,
                errors.description ? styles.inputError : null
              ]}
              placeholder="Descreva os serviços oferecidos pelo prestador"
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (errors.description) {
                  setErrors(prev => ({ ...prev, description: '' }));
                }
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!submitting}
            />
            {errors.description ? (
              <Text style={styles.errorText}>{errors.description}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone *</Text>
            <TextInput
              style={[
                styles.input,
                errors.phone ? styles.inputError : null
              ]}
              placeholder="(00) 00000-0000"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) {
                  setErrors(prev => ({ ...prev, phone: '' }));
                }
              }}
              keyboardType="phone-pad"
              editable={!submitting}
            />
            {errors.phone ? (
              <Text style={styles.errorText}>{errors.phone}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp *</Text>
            <TextInput
              style={[
                styles.input,
                errors.whatsapp ? styles.inputError : null
              ]}
              placeholder="(00) 00000-0000"
              value={whatsapp}
              onChangeText={(text) => {
                setWhatsapp(text);
                if (errors.whatsapp) {
                  setErrors(prev => ({ ...prev, whatsapp: '' }));
                }
              }}
              keyboardType="phone-pad"
              editable={!submitting}
            />
            {errors.whatsapp ? (
              <Text style={styles.errorText}>{errors.whatsapp}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting ? styles.submitButtonDisabled : null
            ]}
            onPress={handleSubmit}
            disabled={submitting || isLoading}
          >
            {submitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <View style={styles.submitButtonContent}>
                <Hammer size={20} color="white" />
                <Text style={styles.submitButtonText}>Salvar Alterações</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    backgroundColor: Colors.card,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  formContainer: {
    padding: 16,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.gray[500],
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    minHeight: 120,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 