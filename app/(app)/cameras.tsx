import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import { useCamerasStore } from '@/store/cameras-store';
import Colors from '@/constants/colors';
import { Camera, Play, Pause, Settings, Shield, Plus, Edit, Trash2, ArrowLeft } from 'lucide-react-native';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import Button from '@/components/Button';
import { Stack, useRouter } from 'expo-router';

export default function CamerasScreen() {
  const { user } = useAuthStore();
  const { cameras, fetchCameras, isLoading, error } = useCamerasStore();
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const router = useRouter();
  
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const hasManageAccess = isAdmin || isManager;

  useEffect(() => {
    fetchCameras();
  }, []);

  useEffect(() => {
    if (cameras.length > 0 && !selectedCamera) {
      setSelectedCamera(cameras[0]);
    }
  }, [cameras]);

  const handleCameraSelect = (camera) => {
    setSelectedCamera(camera);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleAddCamera = () => {
    Alert.alert(
      "Funcionalidade em desenvolvimento",
      "A adição de novas câmeras estará disponível em breve.",
      [{ text: "OK" }]
    );
  };

  const handleEditCamera = (camera) => {
    Alert.alert(
      "Funcionalidade em desenvolvimento",
      "A edição de câmeras estará disponível em breve.",
      [{ text: "OK" }]
    );
  };

  const handleDeleteCamera = (camera) => {
    Alert.alert(
      "Confirmar exclusão",
      `Tem certeza que deseja remover a câmera ${camera.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Remover", 
          style: "destructive",
          onPress: () => {
            Alert.alert("Funcionalidade em desenvolvimento", "A remoção de câmeras estará disponível em breve.");
          }
        }
      ]
    );
  };

  const handleBackPress = () => {
    router.back();
  };

  if (isLoading && cameras.length === 0) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            headerTitle: 'Câmeras',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={handleBackPress}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
            )
          }} 
        />
        <LoadingIndicator fullScreen text="Carregando câmeras..." />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            headerTitle: 'Câmeras',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={handleBackPress}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
            )
          }} 
        />
        <View style={styles.container}>
          <EmptyState
            title="Erro ao carregar câmeras"
            description="Ocorreu um erro ao carregar as câmeras. Tente novamente."
            icon={<Camera size={48} color={Colors.gray[400]} />}
            actionLabel="Tentar novamente"
            onAction={fetchCameras}
          />
        </View>
      </>
    );
  }

  if (cameras.length === 0) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            headerTitle: 'Câmeras',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={handleBackPress}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
            )
          }} 
        />
        <View style={styles.container}>
          <EmptyState
            title="Nenhuma câmera encontrada"
            description="Não há câmeras configuradas no sistema."
            icon={<Camera size={48} color={Colors.gray[400]} />}
            actionLabel={hasManageAccess ? "Adicionar Câmera" : undefined}
            onAction={hasManageAccess ? handleAddCamera : undefined}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Câmeras',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={handleBackPress}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          )
        }} 
      />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Câmeras de Segurança</Text>
          {hasManageAccess && (
            <TouchableOpacity onPress={handleAddCamera} style={styles.addButton}>
              <Plus size={20} color={Colors.primary} />
              <Text style={styles.addButtonText}>Nova Câmera</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {selectedCamera && (
          <View style={styles.mainCameraContainer}>
            <View style={styles.cameraHeader}>
              <Text style={styles.cameraName}>{selectedCamera.name}</Text>
              <View style={styles.cameraControls}>
                <TouchableOpacity 
                  onPress={togglePlayback}
                  style={[styles.controlButton, isPlaying ? styles.pauseButton : styles.playButton]}
                >
                  {isPlaying ? (
                    <Pause size={20} color="white" />
                  ) : (
                    <Play size={20} color="white" />
                  )}
                </TouchableOpacity>
                
                {hasManageAccess && (
                  <TouchableOpacity 
                    onPress={() => handleEditCamera(selectedCamera)}
                    style={[styles.controlButton, styles.settingsButton]}
                  >
                    <Settings size={20} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <View style={styles.cameraView}>
              <Image 
                source={{ uri: selectedCamera.thumbnailUrl }} 
                style={styles.cameraImage}
                resizeMode="cover"
              />
              {!isPlaying && (
                <View style={styles.playOverlay}>
                  <TouchableOpacity onPress={togglePlayback} style={styles.playOverlayButton}>
                    <Play size={40} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <Text style={styles.cameraLocation}>
              Localização: {selectedCamera.location}
            </Text>
          </View>
        )}
        
        <Text style={styles.sectionTitle}>Todas as Câmeras</Text>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.camerasListContainer}
        >
          {cameras.map((camera) => (
            <TouchableOpacity 
              key={camera.id}
              style={[
                styles.cameraCard,
                selectedCamera?.id === camera.id && styles.selectedCameraCard
              ]}
              onPress={() => handleCameraSelect(camera)}
            >
              <Image 
                source={{ uri: camera.thumbnailUrl }} 
                style={styles.cameraCardImage}
                resizeMode="cover"
              />
              <View style={styles.cameraCardContent}>
                <Text style={styles.cameraCardName}>{camera.name}</Text>
                <Text style={styles.cameraCardLocation}>{camera.location}</Text>
              </View>
              
              <View style={styles.cameraCardActions}>
                <TouchableOpacity 
                  onPress={() => handleEditCamera(camera)}
                  style={styles.cameraCardAction}
                >
                  <Edit size={16} color={Colors.primary} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => handleDeleteCamera(camera)}
                  style={styles.cameraCardAction}
                >
                  <Trash2 size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity 
            style={styles.addCameraCard}
            onPress={handleAddCamera}
          >
            <Plus size={32} color={Colors.primary} />
            <Text style={styles.addCameraText}>Adicionar Câmera</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 4,
  },
  mainCameraContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  cameraName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  cameraControls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: Colors.success,
  },
  pauseButton: {
    backgroundColor: Colors.warning,
  },
  settingsButton: {
    backgroundColor: Colors.gray[500],
  },
  cameraView: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  cameraImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLocation: {
    padding: 12,
    fontSize: 14,
    color: Colors.gray[600],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  camerasListContainer: {
    paddingBottom: 16,
  },
  cameraCard: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedCameraCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  cameraCardImage: {
    width: '100%',
    height: 120,
  },
  cameraCardContent: {
    padding: 12,
  },
  cameraCardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  cameraCardLocation: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  cameraCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  cameraCardAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addCameraCard: {
    width: 200,
    height: 200,
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCameraText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  backButton: {
    marginRight: 36,
    paddingLeft: 12,
  },
});