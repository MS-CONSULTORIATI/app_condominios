import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, Platform } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { usePetsStore, Pet } from '@/store/pets-store';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { PawPrint, Camera, ArrowLeft, X } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import LoadingIndicator from '@/components/LoadingIndicator';

export default function EditPetScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { getPet, fetchPets, updatePet, isLoading, error } = usePetsStore();
  
  const [pet, setPet] = useState<Pet | null>(null);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'dog' | 'cat' | 'bird' | 'other'>('dog');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [color, setColor] = useState('');
  const [description, setDescription] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerUnit, setOwnerUnit] = useState('');
  const [photoURI, setPhotoURI] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const isOwner = user?.id === pet?.ownerId;
  const isAdmin = user?.role === 'admin';
  const canEdit = isOwner || isAdmin;
  
  useEffect(() => {
    fetchPets().then(() => {
      if (id) {
        const foundPet = getPet(id as string);
        if (foundPet) {
          setPet(foundPet);
          setName(foundPet.name);
          setSpecies(foundPet.species);
          setBreed(foundPet.breed || '');
          setAge(foundPet.age !== undefined ? foundPet.age.toString() : '');
          setColor(foundPet.color || '');
          setDescription(foundPet.description || '');
          setOwnerName(foundPet.ownerName);
          setOwnerUnit(foundPet.ownerUnit);
          if (foundPet.photoURL) {
            setPhotoURI(foundPet.photoURL);
          }
        }
      }
      setInitialLoading(false);
    });
  }, [id, fetchPets, getPet]);
  
  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do pet.');
      return;
    }
    
    if (!ownerName.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do dono.');
      return;
    }
    
    if (!ownerUnit.trim()) {
      Alert.alert('Erro', 'Por favor, informe o apartamento/casa do dono.');
      return;
    }
    
    if (!pet) {
      Alert.alert('Erro', 'Pet não encontrado.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const petData = {
        name: name.trim(),
        species,
        breed: breed.trim() || undefined,
        age: age.trim() ? parseInt(age.trim(), 10) : undefined,
        color: color.trim() || undefined,
        description: description.trim() || undefined,
        ownerName: ownerName.trim(),
        ownerUnit: ownerUnit.trim(),
      };
      
      // Somente enviar nova foto se for diferente da anterior
      const isNewPhoto = photoURI && photoURI !== pet.photoURL;
      const photoToUpload = isNewPhoto ? photoURI : undefined;
      
      const success = await updatePet(pet.id, petData, photoToUpload);
      
      if (success) {
        Alert.alert(
          'Sucesso',
          'Pet atualizado com sucesso!',
          [{ 
            text: 'OK', 
            onPress: () => router.push({
              pathname: '/pet/[id]',
              params: { id: pet.id }
            }) 
          }]
        );
      } else {
        Alert.alert('Erro', error || 'Não foi possível atualizar o pet. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao atualizar pet:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao atualizar o pet. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled) {
        setPhotoURI(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao tirar a foto. Tente novamente.');
    }
  };
  
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled) {
        setPhotoURI(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao selecionar a imagem. Tente novamente.');
    }
  };
  
  const removeImage = () => {
    setPhotoURI(null);
  };
  
  if (initialLoading) {
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
  
  // Verificar permissão de edição
  if (!canEdit) {
    return (
      <View style={styles.notFoundContainer}>
        <PawPrint size={48} color={Colors.error} />
        <Text style={styles.notFoundTitle}>Acesso negado</Text>
        <Text style={styles.notFoundDescription}>
          Você não tem permissão para editar este pet.
        </Text>
        <Button
          title="Voltar para detalhes"
          onPress={() => router.push({
            pathname: '/pet/[id]',
            params: { id: pet.id }
          })}
          style={styles.backButton}
        />
      </View>
    );
  }
  
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: `Editar ${pet.name}`,
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
      >
        <View style={styles.imageSection}>
          {photoURI ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: photoURI }} style={styles.petImage} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={removeImage}
              >
                <X size={16} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imageUploadPlaceholder}>
              <PawPrint size={32} color={Colors.gray[400]} />
              <Text style={styles.imageUploadText}>Adicionar foto</Text>
            </View>
          )}
          
          <View style={styles.imageButtonsContainer}>
            <Button
              title="Tirar Foto"
              onPress={takePicture}
              variant="outline"
              size="small"
              leftIcon={<Camera size={18} color={Colors.primary} />}
              style={styles.imageButton}
            />
            <Button
              title="Galeria"
              onPress={pickImage}
              variant="outline"
              size="small"
              leftIcon={<PawPrint size={18} color={Colors.primary} />}
              style={styles.imageButton}
            />
          </View>
        </View>
        
        <View style={styles.formContainer}>
          <Input
            label="Nome do Pet*"
            placeholder="Ex: Rex"
            value={name}
            onChangeText={setName}
          />
          
          <Text style={styles.label}>Espécie*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={species}
              onValueChange={(value: string) => setSpecies(value as 'dog' | 'cat' | 'bird' | 'other')}
              style={styles.picker}
            >
              <Picker.Item label="Cachorro" value="dog" />
              <Picker.Item label="Gato" value="cat" />
              <Picker.Item label="Pássaro" value="bird" />
              <Picker.Item label="Outro" value="other" />
            </Picker>
          </View>
          
          <Input
            label="Raça"
            placeholder="Ex: Labrador"
            value={breed}
            onChangeText={setBreed}
          />
          
          <View style={styles.row}>
            <Input
              label="Idade (anos)"
              placeholder="Ex: 3"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              style={styles.halfInput}
            />
            
            <Input
              label="Cor"
              placeholder="Ex: Caramelo"
              value={color}
              onChangeText={setColor}
              style={styles.halfInput}
            />
          </View>
          
          <Input
            label="Descrição"
            placeholder="Algo especial sobre seu pet..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
          
          <Text style={styles.sectionTitle}>Informações do Dono</Text>
          
          <Input
            label="Nome do Dono*"
            placeholder="Seu nome"
            value={ownerName}
            onChangeText={setOwnerName}
          />
          
          <Input
            label="Apartamento/Casa*"
            placeholder="Ex: Apto 101 Bloco A"
            value={ownerUnit}
            onChangeText={setOwnerUnit}
          />
          
          <Button
            title="Salvar Alterações"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            style={styles.submitButton}
          />
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
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  petImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageUploadPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  imageUploadText: {
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: 8,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  imageButton: {
    marginHorizontal: 8,
  },
  formContainer: {
    backgroundColor: 'white',
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: Colors.gray[100],
  },
  picker: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 24,
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