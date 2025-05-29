import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getPackageById, updatePackage, deliverPackage } from '@/lib/firebase';
import { Package } from '@/types';
import { useAuthStore } from '@/store/auth-store';

const { width: screenWidth } = Dimensions.get('window');

export default function PackageDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [packageData, setPackageData] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (id) {
      loadPackage();
    }
  }, [id]);

  const loadPackage = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getPackageById(id);
      setPackageData(data);
    } catch (error) {
      console.error('Erro ao carregar encomenda:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes da encomenda.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelivery = () => {
    if (!packageData || !user) return;

    Alert.alert(
      'Confirmar Entrega',
      'Deseja marcar esta encomenda como entregue?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Entregar',
          onPress: () => {
            router.push({
              pathname: '/(app)/packages/signature' as any,
              params: { 
                packageId: packageData.id,
                recipientName: packageData.recipientName,
                deliveredBy: user.id,
                deliveredByName: user.name,
              }
            });
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    if (!packageData) return;
    
    // For now, just show an alert. In a full implementation, 
    // you would navigate to an edit screen
    Alert.alert('Editar', 'Funcionalidade de edição será implementada em breve.');
  };

  const handleReturn = () => {
    if (!packageData || !user) return;

    Alert.prompt(
      'Devolver Encomenda',
      'Por que esta encomenda está sendo devolvida?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Devolver',
          onPress: async (reason) => {
            if (!reason?.trim()) {
              Alert.alert('Erro', 'Por favor, informe o motivo da devolução.');
              return;
            }

            try {
              await updatePackage(packageData.id, {
                status: 'returned',
                returnedAt: Date.now(),
                returnReason: reason.trim(),
              });

              Alert.alert('Sucesso', 'Encomenda marcada como devolvida.', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Erro ao devolver encomenda:', error);
              Alert.alert('Erro', 'Não foi possível devolver a encomenda.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'delivered':
        return '#34C759';
      case 'returned':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'delivered':
        return 'Entregue';
      case 'returned':
        return 'Devolvida';
      default:
        return status;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderImageModal = () => (
    <Modal
      visible={selectedImageIndex !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedImageIndex(null)}
    >
      <View style={styles.imageModalContainer}>
        <TouchableOpacity
          style={styles.imageModalOverlay}
          onPress={() => setSelectedImageIndex(null)}
        >
          <View style={styles.imageModalContent}>
            {selectedImageIndex !== null && packageData?.photos && (
              <>
                <Image
                  source={{ uri: packageData.photos[selectedImageIndex] }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
                <View style={styles.imageModalHeader}>
                  <Text style={styles.imageCounter}>
                    {selectedImageIndex + 1} de {packageData.photos.length}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedImageIndex(null)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                {packageData.photos.length > 1 && (
                  <View style={styles.imageNavigation}>
                    <TouchableOpacity
                      style={[
                        styles.navButton,
                        selectedImageIndex === 0 && styles.navButtonDisabled,
                      ]}
                      onPress={() => {
                        if (selectedImageIndex > 0) {
                          setSelectedImageIndex(selectedImageIndex - 1);
                        }
                      }}
                      disabled={selectedImageIndex === 0}
                    >
                      <Text style={styles.navButtonText}>‹</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.navButton,
                        (!packageData.photos || selectedImageIndex === packageData.photos.length - 1) && styles.navButtonDisabled,
                      ]}
                      onPress={() => {
                        if (packageData.photos && selectedImageIndex < packageData.photos.length - 1) {
                          setSelectedImageIndex(selectedImageIndex + 1);
                        }
                      }}
                      disabled={!packageData.photos || selectedImageIndex === packageData.photos.length - 1}
                    >
                      <Text style={styles.navButtonText}>›</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!packageData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Encomenda não encontrada</Text>
      </View>
    );
  }

  const isDoorman = user?.role === 'doorman' || user?.role === 'admin';
  const isRecipient = user?.id === packageData.recipientId;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(packageData.status) }]}>
            <Text style={styles.statusText}>{getStatusText(packageData.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações do Destinatário</Text>
        <Text style={styles.infoText}>Nome: {packageData.recipientName}</Text>
        <Text style={styles.infoText}>Unidade: {packageData.recipientUnit}</Text>
        {packageData.recipientPhone && (
          <Text style={styles.infoText}>Telefone: {packageData.recipientPhone}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detalhes da Encomenda</Text>
        <Text style={styles.infoText}>Descrição: {packageData.description}</Text>
        {packageData.senderName && (
          <Text style={styles.infoText}>Remetente: {packageData.senderName}</Text>
        )}
        {packageData.observations && (
          <Text style={styles.infoText}>Observações: {packageData.observations}</Text>
        )}
        <Text style={styles.infoText}>
          Registrada em: {formatDate(packageData.createdAt)}
        </Text>
        <Text style={styles.infoText}>
          Por: {packageData.createdByName}
        </Text>
      </View>

      {packageData.status === 'delivered' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações de Entrega</Text>
          {packageData.deliveredAt && (
            <Text style={styles.infoText}>
              Entregue em: {formatDate(packageData.deliveredAt)}
            </Text>
          )}
          {packageData.deliveredByName && (
            <Text style={styles.infoText}>
              Entregue por: {packageData.deliveredByName}
            </Text>
          )}
          {packageData.signedBy && (
            <Text style={styles.infoText}>
              Assinado por: {packageData.signedBy}
            </Text>
          )}
        </View>
      )}

      {packageData.status === 'returned' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações de Devolução</Text>
          {packageData.returnedAt && (
            <Text style={styles.infoText}>
              Devolvida em: {formatDate(packageData.returnedAt)}
            </Text>
          )}
          {packageData.returnReason && (
            <Text style={styles.infoText}>
              Motivo: {packageData.returnReason}
            </Text>
          )}
        </View>
      )}

      {packageData.photos && packageData.photos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photosContainer}>
              {packageData.photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedImageIndex(index)}
                >
                  <Image source={{ uri: photo }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {isDoorman && packageData.status === 'pending' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.deliverButton} onPress={handleDelivery}>
            <Text style={styles.deliverButtonText}>✓ Entregar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>✏️ Editar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.returnButton} onPress={handleReturn}>
            <Text style={styles.returnButtonText}>↩️ Devolver</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderImageModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 24,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  deliverButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  deliverButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  returnButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  imageModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: screenWidth,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: screenWidth - 32,
    height: '70%',
  },
  imageModalHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  imageCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imageNavigation: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    gap: 20,
  },
  navButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 