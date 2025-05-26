import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { usePetsStore, Pet } from '@/store/pets-store';
import Colors from '@/constants/colors';
import { PawPrint, Edit, Trash2, ArrowLeft, Home, Cake, Palette } from 'lucide-react-native';
import LoadingIndicator from '@/components/LoadingIndicator';
import Button from '@/components/Button';

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { getPet, fetchPets, removePet, isLoading } = usePetsStore();
  
  const [pet, setPet] = useState<Pet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isOwner = user?.id === pet?.ownerId;
  const isAdmin = user?.role === 'admin';
  const canEdit = isOwner || isAdmin;
  
  useEffect(() => {
    fetchPets().then(() => {
      if (id) {
        const foundPet = getPet(id as string);
        setPet(foundPet || null);
      }
    });
  }, [id, fetchPets, getPet]);
  
  const handleEditPet = () => {
    router.push({
      pathname: '/pet/edit/[id]',
      params: { id: pet?.id }
    });
  };
  
  const handleRemovePet = () => {
    Alert.alert(
      'Remover Pet',
      `Tem certeza que deseja remover ${pet?.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover', 
          style: 'destructive',
          onPress: async () => {
            if (!pet) return;
            
            setIsDeleting(true);
            try {
              const success = await removePet(pet.id);
              if (success) {
                Alert.alert(
                  'Sucesso',
                  'Pet removido com sucesso.',
                  [{ text: 'OK', onPress: () => router.push('/pets') }]
                );
              } else {
                Alert.alert('Erro', 'Não foi possível remover o pet. Tente novamente.');
                setIsDeleting(false);
              }
            } catch (error) {
              console.error('Erro ao remover pet:', error);
              Alert.alert('Erro', 'Ocorreu um erro ao remover o pet.');
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };
  
  if (isLoading && !pet) {
    return <LoadingIndicator fullScreen text="Carregando informações do pet..." />;
  }
  
  if (!pet) {
    return (
      <View style={styles.notFoundContainer}>
        <PawPrint size={48} color={Colors.gray[400]} />
        <Text style={styles.notFoundTitle}>Pet não encontrado</Text>
        <Text style={styles.notFoundDescription}>
          O pet que você está procurando não existe ou foi removido.
        </Text>
        <Button
          title="Voltar para a lista"
          onPress={() => router.push('/pets')}
          style={styles.backButton}
        />
      </View>
    );
  }
  
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: pet.name,
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
      
      <ScrollView style={styles.container}>
        <View style={styles.photoContainer}>
          {pet.photoURL ? (
            <Image source={{ uri: pet.photoURL }} style={styles.petImage} />
          ) : (
            <View style={styles.petImagePlaceholder}>
              <PawPrint size={48} color={Colors.gray[400]} />
            </View>
          )}
        </View>
        
        <View style={styles.infoCard}>
          <View style={styles.header}>
            <Text style={styles.petName}>{pet.name}</Text>
            <View style={styles.speciesTag}>
              <Text style={styles.speciesText}>
                {pet.species === 'dog' ? 'Cachorro' : 
                 pet.species === 'cat' ? 'Gato' : 
                 pet.species === 'bird' ? 'Pássaro' : 'Outro'}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailsContainer}>
            {pet.breed && (
              <View style={styles.detailItem}>
                <PawPrint size={20} color={Colors.primary} />
                <Text style={styles.detailText}>Raça: {pet.breed}</Text>
              </View>
            )}
            
            {pet.age !== undefined && (
              <View style={styles.detailItem}>
                <Cake size={20} color={Colors.primary} />
                <Text style={styles.detailText}>
                  {pet.age} {pet.age === 1 ? 'ano' : 'anos'}
                </Text>
              </View>
            )}
            
            {pet.color && (
              <View style={styles.detailItem}>
                <Palette size={20} color={Colors.primary} />
                <Text style={styles.detailText}>Cor: {pet.color}</Text>
              </View>
            )}
          </View>
          
          {pet.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>Sobre</Text>
              <Text style={styles.descriptionText}>{pet.description}</Text>
            </View>
          )}
          
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerTitle}>Informações do Dono</Text>
            
            <View style={styles.ownerDetail}>
              <Text style={styles.ownerLabel}>Nome:</Text>
              <Text style={styles.ownerValue}>{pet.ownerName}</Text>
            </View>
            
            <View style={styles.ownerDetail}>
              <Home size={18} color={Colors.gray[600]} />
              <Text style={styles.ownerValue}>{pet.ownerUnit}</Text>
            </View>
          </View>
          
          {canEdit && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]}
                onPress={handleEditPet}
              >
                <Edit size={20} color="white" />
                <Text style={styles.actionButtonText}>Editar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleRemovePet}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Trash2 size={20} color="white" />
                    <Text style={styles.actionButtonText}>Remover</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
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
  photoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  petImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: 'white',
  },
  petImagePlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  infoCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    flex: 1,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  petName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  speciesTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  speciesText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
  },
  descriptionContainer: {
    marginBottom: 20,
    backgroundColor: Colors.gray[100],
    padding: 16,
    borderRadius: 12,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: Colors.gray[700],
    lineHeight: 22,
  },
  ownerInfo: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    paddingTop: 16,
    marginBottom: 24,
  },
  ownerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  ownerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ownerLabel: {
    fontSize: 16,
    color: Colors.gray[600],
    marginRight: 4,
  },
  ownerValue: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  notFoundDescription: {
    fontSize: 16,
    color: Colors.gray[600],
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 200,
  },
}); 