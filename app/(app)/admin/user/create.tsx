import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { useUsersStore } from '@/store/users-store';
import { useAuthStore } from '@/store/auth-store';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { Save, User, Mail, Phone, Shield, Home, CreditCard, Camera } from 'lucide-react-native';
import EmptyState from '@/components/EmptyState';
import * as ImagePicker from 'expo-image-picker';

export default function CreateUserScreen() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [apartment, setApartment] = useState('');
  const [block, setBlock] = useState('');
  const [role, setRole] = useState<'resident' | 'manager' | 'admin'>('resident');
  const [photoURI, setPhotoURI] = useState<string | null>(null);
  
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const { createUser, isLoading, error } = useUsersStore();

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Acesso Restrito"
          description="Você não tem permissão para acessar esta área."
          icon={<Shield size={48} color={Colors.gray[400]} />}
        />
      </View>
    );
  }

  // Funções para lidar com a foto de perfil
  const handleImagePicker = async () => {
    const options = ['Tirar foto', 'Escolher da galeria', 'Cancelar'];
    
    Alert.alert(
      'Foto de perfil',
      'Escolha uma opção',
      [
        {
          text: options[0],
          onPress: () => takePhoto()
        },
        {
          text: options[1],
          onPress: () => pickImage()
        },
        {
          text: options[2],
          style: 'cancel'
        }
      ]
    );
  };

  const pickImage = async () => {
    try {
      // Solicitar permissão para acessar a galeria
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de permissão para acessar suas fotos');
        return;
      }
      
      // Abrir o seletor de imagens
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoURI(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const takePhoto = async () => {
    try {
      // Solicitar permissão para acessar a câmera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de permissão para acessar sua câmera');
        return;
      }
      
      // Abrir a câmera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoURI(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Erro ao capturar foto:', error);
      Alert.alert('Erro', 'Não foi possível capturar a foto');
    }
  };

  // Função para formatar CPF enquanto digita
  const formatCPF = (text: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = text.replace(/\D/g, '');
    
    // Aplica a máscara: 000.000.000-00
    return numbers
      .replace(/(\d{3})(?=\d)/, '$1.')
      .replace(/(\d{3})(?=\d)/, '$1.')
      .replace(/(\d{3})(?=\d)/, '$1-');
  };
  
  // Função para formatar telefone enquanto digita
  const formatPhone = (text: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = text.replace(/\D/g, '');
    
    // Aplica a máscara: (00) 00000-0000 para celular ou (00) 0000-0000 para fixo
    if (numbers.length > 10) {
      return numbers
        .replace(/(\d{2})(?=\d)/, '($1) ')
        .replace(/(\d{5})(?=\d)/, '$1-');
    } else {
      return numbers
        .replace(/(\d{2})(?=\d)/, '($1) ')
        .replace(/(\d{4})(?=\d)/, '$1-');
    }
  };
  
  const handleCPFChange = (text: string) => {
    setCpf(formatCPF(text));
  };
  
  const handlePhoneChange = (text: string) => {
    setPhone(formatPhone(text));
  };

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setNameError('');
    setEmailError('');
    setPasswordError('');
    
    // Validate name
    if (!name.trim()) {
      setNameError('O nome é obrigatório');
      isValid = false;
    }
    
    // Validate email
    if (!email.trim()) {
      setEmailError('O email é obrigatório');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email inválido');
      isValid = false;
    }
    
    // Validate password
    if (!password.trim()) {
      setPasswordError('A senha é obrigatória');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres');
      isValid = false;
    }
    
    return isValid;
  };

  const handleCreateUser = async () => {
    if (validateForm()) {
      try {
        await createUser({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          phone: phone.trim(),
          cpf: cpf.trim(),
          apartment: apartment.trim(),
          block: block.trim(),
          role,
          photoURI: photoURI,
        });
        
        if (Platform.OS === 'web') {
          router.back();
        } else {
          Alert.alert(
            "Sucesso",
            "Usuário criado com sucesso!",
            [{ text: "OK", onPress: () => router.back() }]
          );
        }
      } catch (error) {
        console.error('Error creating user:', error);
        Alert.alert("Erro", "Não foi possível criar o usuário.");
      }
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={handleImagePicker} style={styles.profileImageContainer}>
        {photoURI ? (
          <Image source={{ uri: photoURI }} style={styles.profileImage} />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <User size={40} color="white" />
          </View>
        )}
        <View style={styles.cameraIconContainer}>
          <Camera size={20} color="white" />
        </View>
      </TouchableOpacity>
      
      <Input
        label="Nome Completo"
        placeholder="Digite o nome completo do usuário"
        value={name}
        onChangeText={setName}
        error={nameError}
        leftIcon={<User size={20} color={Colors.gray[400]} />}
      />
      
      <Input
        label="Email"
        placeholder="Digite o email do usuário"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={emailError}
        leftIcon={<Mail size={20} color={Colors.gray[400]} />}
      />
      
      <Input
        label="Senha"
        placeholder="Digite a senha do usuário"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={passwordError}
      />
      
      <Input
        label="CPF"
        placeholder="000.000.000-00"
        value={cpf}
        onChangeText={handleCPFChange}
        keyboardType="numeric"
        maxLength={14}
        leftIcon={<CreditCard size={20} color={Colors.gray[400]} />}
      />
      
      <Input
        label="Telefone"
        placeholder="(00) 00000-0000"
        value={phone}
        onChangeText={handlePhoneChange}
        keyboardType="phone-pad"
        maxLength={15}
        leftIcon={<Phone size={20} color={Colors.gray[400]} />}
      />
      
      <View style={styles.row}>
        <Input
          label="Bloco"
          placeholder="Bloco"
          value={block}
          onChangeText={setBlock}
          style={styles.blockInput}
        />
        
        <Input
          label="Apartamento"
          placeholder="Número"
          value={apartment}
          onChangeText={setApartment}
          keyboardType="numeric"
          style={styles.apartmentInput}
        />
      </View>
      
      <Text style={styles.label}>Função do Usuário</Text>
      <View style={styles.roleContainer}>
        <Button
          title="Morador"
          onPress={() => setRole('resident')}
          variant={role === 'resident' ? 'primary' : 'outline'}
          style={styles.roleButton}
        />
        <Button
          title="Síndico"
          onPress={() => setRole('manager')}
          variant={role === 'manager' ? 'primary' : 'outline'}
          style={styles.roleButton}
        />
        <Button
          title="Admin"
          onPress={() => setRole('admin')}
          variant={role === 'admin' ? 'primary' : 'outline'}
          style={styles.roleButton}
        />
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      <Button
        title="Cadastrar Usuário"
        onPress={handleCreateUser}
        isLoading={isLoading}
        style={styles.saveButton}
        leftIcon={<Save size={20} color={Colors.white} />}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  profileImageContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.gray[600],
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  blockInput: {
    flex: 1,
    marginRight: 10,
  },
  apartmentInput: {
    flex: 1,
    marginLeft: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 16,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  saveButton: {
    marginTop: 8,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
});