import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Linking, 
  Alert,
  Modal
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useServiceProvidersStore } from '@/store/service-providers-store';
import { useAuthStore } from '@/store/auth-store';
import { useUsersStore } from '@/store/users-store';
import Colors from '@/constants/colors';
import { 
  ArrowLeft, 
  Phone, 
  MessageCircle, 
  Hammer, 
  Edit, 
  Trash, 
  Calendar, 
  User,
  Info,
  Star,
  Image as ImageIcon,
  Camera,
  X
} from 'lucide-react-native';
import { formatDate } from '@/utils/date';
import LoadingIndicator from '@/components/LoadingIndicator';
import { ServiceProvider } from '@/types';
import { getUserProfile } from '@/lib/firebase';
import ServiceProviderRatingForm from '@/components/ServiceProviderRatingForm';
import ServiceProviderRatingItem from '@/components/ServiceProviderRatingItem';
import * as ImagePicker from 'expo-image-picker';

export default function ServiceProviderDetailScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  const { 
    serviceProviders, 
    fetchServiceProviders, 
    deleteServiceProvider, 
    uploadAdditionalPhoto,
    isLoading, 
    error 
  } = useServiceProvidersStore();
  const { user } = useAuthStore();
  const { users, fetchUsers } = useUsersStore();
  
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isResident = user?.role === 'resident';
  const canAddPhotosAndRatings = isResident || isManager;
  
  useEffect(() => {
    if (!id) {
      Alert.alert('Erro', 'ID do prestador não encontrado');
      router.back();
      return;
    }
    
    const loadProvider = async () => {
      await fetchServiceProviders();
      await fetchUsers();
      setLoading(false);
    };
    
    loadProvider();
  }, [id]);
  
  useEffect(() => {
    if (!loading && serviceProviders.length > 0 && id) {
      const foundProvider = serviceProviders.find(p => p.id === id);
      
      if (foundProvider) {
        setProvider(foundProvider);
        
        // Buscar informações do criador se tivermos apenas o ID
        if (typeof foundProvider.createdBy === 'string') {
          const foundUser = users.find(u => u.id === foundProvider.createdBy);
          if (foundUser) {
            setCreatorName(foundUser.name);
          } else {
            getUserProfile(foundProvider.createdBy as string)
              .then(userProfile => {
                if (userProfile) {
                  setCreatorName(userProfile.name);
                } else {
                  setCreatorName('Usuário');
                }
              })
              .catch(error => {
                console.error('Erro ao buscar perfil do criador:', error);
                setCreatorName('Usuário');
              });
          }
        }
      } else {
        setProvider(null);
      }
    }
  }, [serviceProviders, users, loading, id]);
  
  const handleCall = () => {
    if (provider?.phone) {
      Linking.openURL(`tel:${provider.phone}`);
    }
  };
  
  const handleWhatsApp = () => {
    if (provider?.whatsapp) {
      const phoneNumber = provider.whatsapp.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${phoneNumber}`).catch(err => {
        Alert.alert(
          "WhatsApp não instalado",
          "Por favor, instale o WhatsApp para enviar mensagens para este prestador.",
          [{ text: "OK" }]
        );
      });
    }
  };
  
  const handleEditProvider = () => {
    if (provider) {
      router.push({
        pathname: `/service-provider/edit/[id]`,
        params: { id: provider.id }
      });
    }
  };
  
  const handleBackPress = () => {
    router.replace('/service-providers');
  };
  
  const handleDeleteProvider = () => {
    if (provider) {
      Alert.alert(
        "Remover Prestador",
        `Tem certeza que deseja remover ${provider.name} da lista de prestadores? Esta ação não pode ser desfeita.`,
        [
          {
            text: "Cancelar",
            style: "cancel"
          },
          {
            text: "Remover",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteServiceProvider(id);
                Alert.alert('Sucesso', 'Prestador removido com sucesso!');
                router.replace('/service-providers');
              } catch (error) {
                console.error('Erro ao excluir prestador:', error);
                Alert.alert('Erro', 'Não foi possível excluir o prestador. Tente novamente.');
              }
            }
          }
        ]
      );
    }
  };

  const handleAddPhoto = async () => {
    if (!provider || !canAddPhotosAndRatings) return;
    
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
        // Upload the photo
        const photoUrl = await uploadAdditionalPhoto(provider.id, result.assets[0].uri);
        
        if (photoUrl) {
          Alert.alert('Sucesso', 'Foto adicionada com sucesso!');
          await fetchServiceProviders(); // Refresh data
        } else {
          Alert.alert('Erro', 'Não foi possível adicionar a foto. Tente novamente.');
        }
      }
    } catch (error) {
      console.error('Erro ao adicionar foto:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao adicionar a foto. Tente novamente.');
    }
  };

  const handleTakePhoto = async () => {
    if (!provider || !canAddPhotosAndRatings) return;
    
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
        // Upload the photo
        const photoUrl = await uploadAdditionalPhoto(provider.id, result.assets[0].uri);
        
        if (photoUrl) {
          Alert.alert('Sucesso', 'Foto adicionada com sucesso!');
          await fetchServiceProviders(); // Refresh data
        } else {
          Alert.alert('Erro', 'Não foi possível adicionar a foto. Tente novamente.');
        }
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao tirar a foto. Tente novamente.');
    }
  };
  
  const handlePhotoPress = (photoUrl: string) => {
    setSelectedPhoto(photoUrl);
    setModalVisible(true);
  };
  
  const renderRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={20}
          color={i <= rating ? Colors.warning : Colors.gray[300]}
          fill={i <= rating ? Colors.warning : 'transparent'}
        />
      );
    }
    return (
      <View style={styles.starsRow}>{stars}</View>
    );
  };
  
  if (loading || !provider) {
    return <LoadingIndicator fullScreen text="Carregando prestador..." />;
  }
  
  const hasPhotos = provider.photo || (provider.photos && provider.photos.length > 0);
  const hasRatings = provider.ratings && provider.ratings.length > 0;
  
  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhes do Prestador</Text>
          <View style={{ width: 24 }} /> {/* Espaçador para centralizar o título */}
        </View>
        
        <View style={styles.card}>
          <View style={styles.profileSection}>
            {provider.photo ? (
              <TouchableOpacity onPress={() => handlePhotoPress(provider.photo!)}>
                <Image 
                  source={{ uri: provider.photo }} 
                  style={styles.profileImage} 
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Hammer size={48} color={Colors.gray[400]} />
              </View>
            )}
            
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{provider.name}</Text>
              <View style={styles.typeContainer}>
                <Hammer size={14} color={Colors.primary} />
                <Text style={styles.type}>{provider.serviceType}</Text>
              </View>
              
              {provider.avgRating !== undefined && provider.avgRating > 0 && (
                <View style={styles.ratingContainer}>
                  {renderRatingStars(provider.avgRating)}
                  <Text style={styles.ratingText}>
                    {provider.avgRating.toFixed(1)} ({provider.reviewCount || 0} {(provider.reviewCount || 0) === 1 ? 'avaliação' : 'avaliações'})
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.callButton]}
              onPress={handleCall}
            >
              <Phone size={20} color="white" />
              <Text style={styles.actionButtonText}>Ligar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.whatsappButton]}
              onPress={handleWhatsApp}
            >
              <MessageCircle size={20} color="white" />
              <Text style={styles.actionButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações</Text>
            
            <View style={styles.infoItem}>
              <Info size={18} color={Colors.gray[500]} />
              <Text style={styles.infoText}>{provider.description}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Phone size={18} color={Colors.gray[500]} />
              <Text style={styles.infoText}>{provider.phone}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <MessageCircle size={18} color={Colors.gray[500]} />
              <Text style={styles.infoText}>{provider.whatsapp}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Calendar size={18} color={Colors.gray[500]} />
              <Text style={styles.infoText}>
                Cadastrado em {formatDate(provider.createdAt)}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <User size={18} color={Colors.gray[500]} />
              <Text style={styles.infoText}>
                Adicionado por {
                  typeof provider.createdBy === 'string'
                    ? (creatorName || 'Usuário')
                    : provider.createdBy.name || 'Usuário'
                }
              </Text>
            </View>
          </View>
          
          {/* Photos Section */}
          {hasPhotos && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Fotos</Text>
                {canAddPhotosAndRatings && (
                  <View style={styles.addPhotoButtons}>
                    <TouchableOpacity
                      style={styles.addPhotoButton}
                      onPress={handleAddPhoto}
                    >
                      <ImageIcon size={16} color={Colors.primary} />
                      <Text style={styles.addPhotoText}>Galeria</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addPhotoButton}
                      onPress={handleTakePhoto}
                    >
                      <Camera size={16} color={Colors.primary} />
                      <Text style={styles.addPhotoText}>Câmera</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photosContainer}
                contentContainerStyle={styles.photosContent}
              >
                {provider.photo && (
                  <TouchableOpacity 
                    onPress={() => handlePhotoPress(provider.photo!)}
                    style={styles.photoItem}
                  >
                    <Image
                      source={{ uri: provider.photo }}
                      style={styles.photoThumb}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                
                {provider.photos && provider.photos.map((photo, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handlePhotoPress(photo)}
                    style={styles.photoItem}
                  >
                    <Image
                      source={{ uri: photo }}
                      style={styles.photoThumb}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Ratings Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Avaliações {hasRatings && `(${provider.ratings?.length})`}
              </Text>
            </View>
            
            {/* Rating Form for residents */}
            {canAddPhotosAndRatings && (
              <ServiceProviderRatingForm
                providerId={provider.id}
                onRatingSubmitted={() => fetchServiceProviders()}
              />
            )}
            
            {/* Display ratings */}
            {hasRatings ? (
              <View style={styles.ratingsList}>
                {provider.ratings?.map((rating) => (
                  <ServiceProviderRatingItem
                    key={rating.id}
                    rating={rating}
                    onPhotoPress={handlePhotoPress}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyRatings}>
                <Text style={styles.emptyRatingsText}>
                  Nenhuma avaliação disponível. {canAddPhotosAndRatings ? 'Seja o primeiro a avaliar!' : ''}
                </Text>
              </View>
            )}
          </View>
          
          {isManager && (
            <View style={styles.adminActions}>
              <TouchableOpacity 
                style={[styles.adminButton, styles.editButton]}
                onPress={handleEditProvider}
              >
                <Edit size={20} color={Colors.primary} />
                <Text style={styles.editButtonText}>Editar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.adminButton, styles.deleteButton]}
                onPress={handleDeleteProvider}
              >
                <Trash size={20} color={Colors.error} />
                <Text style={styles.deleteButtonText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Photo Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeModalButton}
            onPress={() => setModalVisible(false)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.modalImage}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  type: {
    fontSize: 14,
    color: Colors.gray[700],
    marginLeft: 6,
  },
  ratingContainer: {
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  callButton: {
    backgroundColor: Colors.primary,
  },
  whatsappButton: {
    backgroundColor: '#25D366', // WhatsApp color
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },
  adminActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    paddingTop: 16,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  editButton: {
    backgroundColor: Colors.gray[100],
  },
  editButtonText: {
    color: Colors.primary,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: Colors.gray[100],
  },
  deleteButtonText: {
    color: Colors.error,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  addPhotoButtons: {
    flexDirection: 'row',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
    marginLeft: 8,
  },
  addPhotoText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
  },
  photosContainer: {
    marginTop: 8,
  },
  photosContent: {
    paddingRight: 16,
  },
  photoItem: {
    marginRight: 8,
  },
  photoThumb: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  emptyRatings: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
  },
  emptyRatingsText: {
    color: Colors.gray[500],
    textAlign: 'center',
  },
  ratingsList: {
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  closeModalButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
}); 