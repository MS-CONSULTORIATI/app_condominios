import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { usePetsStore, Pet } from '@/store/pets-store';
import Colors from '@/constants/colors';
import { Plus, PawPrint, Edit, Home, ArrowLeft } from 'lucide-react-native';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';

const PetCard = ({ pet, onPress }: { pet: Pet; onPress: () => void }) => {
  const { user } = useAuthStore();
  const isOwner = user?.id === pet.ownerId;
  
  return (
    <TouchableOpacity
      style={styles.petCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.petHeader}>
        {pet.photoURL ? (
          <Image source={{ uri: pet.photoURL }} style={styles.petImage} />
        ) : (
          <View style={styles.petImagePlaceholder}>
            <PawPrint size={32} color={Colors.gray[400]} />
          </View>
        )}
        
        <View style={styles.petInfo}>
          <Text style={styles.petName}>{pet.name}</Text>
          <View style={styles.speciesTag}>
            <Text style={styles.speciesText}>
              {pet.species === 'dog' ? 'Cachorro' : 
               pet.species === 'cat' ? 'Gato' : 
               pet.species === 'bird' ? 'Pássaro' : 'Outro'}
            </Text>
          </View>
          
          {pet.breed && (
            <Text style={styles.petBreed}>{pet.breed}</Text>
          )}
        </View>
        
        {isOwner && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push({
                pathname: '/pet/edit/[id]',
                params: { id: pet.id }
              });
            }}
          >
            <Edit size={16} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.ownerInfo}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Dono:</Text>
          <Text style={styles.infoValue}>{pet.ownerName}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Home size={14} color={Colors.gray[500]} />
          <Text style={styles.infoValue}>{pet.ownerUnit}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function PetsScreen() {
  const { user } = useAuthStore();
  const { pets, fetchPets, isLoading } = usePetsStore();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  
  useEffect(() => {
    fetchPets();
  }, []);
  
  const handleAddPet = () => {
    router.push('/pet/create');
  };
  
  const handlePetPress = (petId: string) => {
    router.push({
      pathname: '/pet/[id]',
      params: { id: petId }
    });
  };

  const handleBackPress = () => {
    router.push('/');
  };
  
  const filteredPets = filter === 'mine' 
    ? pets.filter(pet => pet.ownerId === user?.id)
    : pets;
  
  if (isLoading && pets.length === 0) {
    return <LoadingIndicator fullScreen text="Carregando pets..." />;
  }
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Pets do Condomínio',
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
          <Text style={styles.headerTitle}>Pets do Condomínio</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddPet}
          >
            <Plus size={20} color="white" />
            <Text style={styles.addButtonText}>Cadastrar Pet</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setFilter('all')}
          >
            <Text style={[
              styles.filterText,
              filter === 'all' && styles.filterTextActive
            ]}>
              Todos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'mine' && styles.filterButtonActive
            ]}
            onPress={() => setFilter('mine')}
          >
            <Text style={[
              styles.filterText,
              filter === 'mine' && styles.filterTextActive
            ]}>
              Meus Pets
            </Text>
          </TouchableOpacity>
        </View>
        
        {filteredPets.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? "Nenhum pet cadastrado" : "Você não possui pets cadastrados"}
            description={filter === 'all' 
              ? "Seja o primeiro a cadastrar seu pet no condomínio!"
              : "Cadastre seu pet para que todos conheçam!"
            }
            icon={<PawPrint size={48} color={Colors.gray[400]} />}
            actionLabel="Cadastrar Pet"
            onAction={handleAddPet}
            style={styles.emptyState}
          />
        ) : (
          <FlatList
            data={filteredPets}
            renderItem={({ item }) => (
              <PetCard 
                pet={item} 
                onPress={() => handlePetPress(item.id)} 
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  backButton: {
    marginRight: 16,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: Colors.gray[100],
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  petCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  petImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  petImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  petInfo: {
    flex: 1,
    marginLeft: 12,
  },
  petName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  speciesTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  speciesText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  petBreed: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  editButton: {
    padding: 8,
  },
  ownerInfo: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    paddingTop: 12,
    marginTop: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.gray[600],
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
  },
}); 