import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import Colors from '@/constants/colors';
import { MapPin, Mail, Phone, Globe, Navigation, X, Info, Home, Video, PlayCircle } from 'lucide-react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInLeft, 
  SlideOutLeft 
} from 'react-native-reanimated';
import * as Location from 'expo-location';
import { getCondominiumInfo, type CondominiumInfo } from '@/lib/firebase';

type Props = {
  isVisible: boolean;
  onClose: () => void;
};

export default function CondominiumInfoDrawer({ isVisible, onClose }: Props) {
  const [imageError, setImageError] = useState(false);
  const [condoInfo, setCondoInfo] = useState<CondominiumInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCondoInfo();
  }, []);

  const loadCondoInfo = async () => {
    try {
      setIsLoading(true);
      const info = await getCondominiumInfo();
      if (info) {
        setCondoInfo(info);
      }
    } catch (error) {
      console.error('Erro ao carregar informações do condomínio:', error);
      Alert.alert('Erro', 'Não foi possível carregar as informações do condomínio.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const openMaps = async () => {
    if (!condoInfo) return;

    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Precisamos da sua localização para mostrar a rota até o condomínio.'
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude: currentLat, longitude: currentLng } = location.coords;
      const { latitude: destLat, longitude: destLng } = condoInfo.coordinates;
      const label = encodeURIComponent(condoInfo.name);
      
      // Handle different platforms
      if (Platform.OS === 'ios') {
        const url = `maps://?saddr=${currentLat},${currentLng}&daddr=${destLat},${destLng}&q=${label}`;
        Linking.openURL(url).catch(err => console.error('Error opening maps:', err));
      } else {
        // Android
        const url = `google.navigation:q=${destLat},${destLng}`;
        Linking.openURL(url).catch(err => console.error('Error opening maps:', err));
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Erro',
        'Não foi possível obter sua localização. Por favor, tente novamente.'
      );
    }
  };

  const openWebsite = () => {
    if (!condoInfo) return;
    // Make sure URL has http prefix
    const url = condoInfo.website.startsWith('http') 
      ? condoInfo.website 
      : `https://${condoInfo.website}`;
    
    Linking.openURL(url).catch(err => console.error('Error opening website:', err));
  };

  const openEmail = () => {
    if (!condoInfo) return;
    Linking.openURL(`mailto:${condoInfo.email}`)
      .catch(err => console.error('Error opening email:', err));
  };

  const openPhone = () => {
    if (!condoInfo) return;
    const phoneNumber = condoInfo.phone.replace(/\D/g, '');
    Linking.openURL(`tel:${phoneNumber}`)
      .catch(err => console.error('Error opening phone:', err));
  };

  if (!isVisible) return null;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Carregando informações...</Text>
      </View>
    );
  }

  if (!condoInfo) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Não foi possível carregar as informações do condomínio.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCondoInfo}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Animated.View 
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(300)}
        style={styles.backdrop}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropTouchable} />
        </TouchableWithoutFeedback>
      </Animated.View>
      
      <Animated.View 
        style={styles.container}
        entering={SlideInLeft.duration(300)}
        exiting={SlideOutLeft.duration(300)}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Menu</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={22} color="white" />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <Image 
              source={{ uri: condoInfo.imageUrl }}
              style={styles.condoImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
            {imageError && (
              <View style={styles.logoCircle}>
                <Home size={28} color="#263B80" />
              </View>
            )}
            <Text style={styles.title}>{condoInfo.name}</Text>
            <Text style={styles.subtitle}>Informações do Condomínio</Text>
          </View>

          {/* Description */}
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeader}>
              <Info size={18} color="#263B80" />
              <Text style={styles.sectionTitle}>Sobre</Text>
            </View>
            <Text style={styles.description}>{condoInfo.description}</Text>
          </View>

          {/* Address */}
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeader}>
              <MapPin size={18} color="#263B80" />
              <Text style={styles.sectionTitle}>Endereço</Text>
            </View>
            <Text style={styles.infoText}>{condoInfo.address}</Text>
            <Text style={styles.infoText}>
              {condoInfo.city}, {condoInfo.state} - {condoInfo.postalCode}
            </Text>
            <TouchableOpacity style={styles.actionButton} onPress={openMaps}>
              <Navigation size={18} color="white" />
              <Text style={styles.actionButtonText}>Como Chegar</Text>
            </TouchableOpacity>
          </View>
          
          {/* Video Section */}
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeader}>
              <Video size={18} color="#263B80" />
              <Text style={styles.sectionTitle}>Vídeo do Local</Text>
            </View>
            <TouchableOpacity 
              style={styles.videoContainer}
              onPress={() => {
                if (condoInfo?.videoUrl) {
                  Linking.openURL(condoInfo.videoUrl)
                    .catch(err => {
                      console.error('Erro ao abrir vídeo:', err);
                      Alert.alert('Erro', 'Não foi possível abrir o vídeo.');
                    });
                }
              }}
            >
              <View style={styles.videoPreview}>
                <PlayCircle size={48} color="white" />
                <Text style={styles.videoPreviewText}>Toque para assistir o vídeo</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Contact */}
          <View style={styles.sectionCompact}>
            <View style={styles.sectionHeader}>
              <Phone size={18} color="#263B80" />
              <Text style={styles.sectionTitle}>Contato</Text>
            </View>
            <TouchableOpacity style={styles.contactRow} onPress={openPhone}>
              <Phone size={16} color="#263B80" />
              <Text style={styles.contactText}>{condoInfo.phone}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactRow} onPress={openEmail}>
              <Mail size={16} color="#263B80" />
              <Text style={styles.contactText}>{condoInfo.email}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactRow} onPress={openWebsite}>
              <Globe size={16} color="#263B80" />
              <Text style={styles.contactText}>{condoInfo.website}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 999,
  },
  backdropTouchable: {
    width: '100%',
    height: '100%',
  },
  container: {
    position: 'absolute',
    width: '85%',
    height: '100%',
    left: 0,
    top: 0,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 1000,
  },
  drawerHeader: {
    backgroundColor: '#263B80',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 30,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 6,
    paddingBottom: 6,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF1F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  condoImage: {
    width: Dimensions.get('window').width * 0.7,
    height: 150,
    borderRadius: 12,
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionCompact: {
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#263B80',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  actionButton: {
    backgroundColor: '#263B80',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 4,
    marginTop: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  videoContainer: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 6,
    backgroundColor: '#000',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewText: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
}); 