import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Image,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import Colors from '@/constants/colors';
import { Star, Camera, X, Plus, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useServiceProvidersStore } from '@/store/service-providers-store';
import { useAuthStore } from '@/store/auth-store';

interface ServiceProviderRatingFormProps {
  providerId: string;
  onRatingSubmitted: () => void;
}

const ServiceProviderRatingForm = ({ providerId, onRatingSubmitted }: ServiceProviderRatingFormProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addRating, uploadRatingPhoto } = useServiceProvidersStore();
  const { user } = useAuthStore();

  const handleStarPress = (starRating: number) => {
    setRating(starRating);
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          "Permissão necessária", 
          "Precisamos de permissão para acessar sua galeria de fotos."
        );
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem. Tente novamente.');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          "Permissão necessária", 
          "Precisamos de permissão para acessar sua câmera."
        );
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto. Tente novamente.');
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado para enviar uma avaliação.');
      return;
    }

    if (rating === 0) {
      Alert.alert('Erro', 'Por favor, selecione uma classificação de 1 a 5 estrelas.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload photos if any
      const photoUrls: string[] = [];
      
      if (photos.length > 0) {
        const tempRatingId = `temp_${Date.now()}`;
        
        for (const photoUri of photos) {
          const photoUrl = await uploadRatingPhoto(providerId, tempRatingId, photoUri);
          if (photoUrl) {
            photoUrls.push(photoUrl);
          }
        }
      }

      // Submit rating
      const success = await addRating(providerId, {
        userId: user.id,
        userName: user.name,
        rating,
        comment: comment.trim() || undefined,
        photos: photoUrls.length > 0 ? photoUrls : undefined
      });

      if (success) {
        setRating(0);
        setComment('');
        setPhotos([]);
        onRatingSubmitted();
        Alert.alert('Sucesso', 'Sua avaliação foi enviada com sucesso!');
      } else {
        throw new Error('Não foi possível salvar a avaliação');
      }
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao enviar sua avaliação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          disabled={isSubmitting}
        >
          <Star
            size={32}
            color={i <= rating ? Colors.warning : Colors.gray[300]}
            fill={i <= rating ? Colors.warning : 'transparent'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Avaliar Prestador</Text>
      
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Deixe um comentário sobre o serviço (opcional)"
          placeholderTextColor={Colors.gray[400]}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          editable={!isSubmitting}
        />
      </View>
      
      {photos.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.photosContainer}
          contentContainerStyle={styles.photosContent}
        >
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image source={{ uri: photo }} style={styles.photo} />
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={() => removePhoto(index)}
                disabled={isSubmitting}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      
      <View style={styles.photoActionsContainer}>
        <TouchableOpacity
          style={[styles.photoButton, styles.galleryButton]}
          onPress={pickImage}
          disabled={isSubmitting}
        >
          <Plus size={16} color={Colors.primary} />
          <Text style={styles.photoButtonText}>Galeria</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.photoButton, styles.cameraButton]}
          onPress={takePhoto}
          disabled={isSubmitting}
        >
          <Camera size={16} color={Colors.primary} />
          <Text style={styles.photoButtonText}>Câmera</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[
          styles.submitButton,
          (rating === 0 || isSubmitting) && styles.submitButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={rating === 0 || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Upload size={16} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Enviar Avaliação</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.text,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    padding: 12,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  photosContainer: {
    marginBottom: 16,
  },
  photosContent: {
    gap: 8,
    paddingVertical: 8,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 8,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  galleryButton: {
    borderColor: Colors.primary,
  },
  cameraButton: {
    borderColor: Colors.primary,
  },
  photoButtonText: {
    color: Colors.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.gray[400],
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default ServiceProviderRatingForm; 