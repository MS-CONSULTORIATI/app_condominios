import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Colors from '@/constants/colors';
import { User, Mail, Home, LogOut, ArrowLeft, Camera, Phone, CreditCard, MapPin } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import LoadingIndicator from '@/components/LoadingIndicator';
import { Picker } from '@react-native-picker/picker';

export default function ProfileScreen() {
  const { user, logout, updateProfile, updateProfileImage, isLoading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [cpf, setCpf] = useState(user?.cpf || '');
  const [street, setStreet] = useState(user?.street || '01');
  const [house, setHouse] = useState(user?.house || '');

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)');
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        name,
        phone,
        cpf,
        street,
        house
      });
      setIsEditing(false);
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar o perfil.");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Síndico';
      case 'resident':
        return 'Morador';
      default:
        return 'Usuário';
    }
  };

  const handleBackPress = () => {
    router.push('/');
  };

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
        // Fazer upload da imagem selecionada
        await updateProfileImage(result.assets[0].uri);
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
        // Fazer upload da imagem capturada
        await updateProfileImage(result.assets[0].uri);
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

  if (isLoading) {
    return <LoadingIndicator fullScreen text="Atualizando perfil..." />;
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Meu Perfil',
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

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleImagePicker} style={styles.profileImageContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                {user?.name ? (
                  <Text style={styles.profileInitials}>{getInitials(user.name)}</Text>
                ) : (
                  <User size={40} color="white" />
                )}
              </View>
            )}
            <View style={styles.cameraIconContainer}>
              <Camera size={20} color="white" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.profileName}>{user?.name || 'Usuário'}</Text>
          <Text style={styles.profileRole}>{getRoleLabel(user?.role || 'resident')}</Text>
        </View>

        <View style={styles.infoSection}>
          {isEditing ? (
            <View style={styles.editForm}>
              <Input
                label="Nome"
                value={name}
                onChangeText={setName}
                leftIcon={<User size={20} color={Colors.gray[400]} />}
              />
              
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                leftIcon={<Mail size={20} color={Colors.gray[400]} />}
                editable={false} // Email usually can't be changed
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
              
              <Text style={styles.label}>Rua</Text>
              <View style={styles.pickerContainer}>
                <MapPin size={20} color={Colors.gray[400]} style={styles.pickerIcon} />
                <Picker
                  selectedValue={street}
                  onValueChange={(value) => setStreet(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Rua 01" value="01" />
                  <Picker.Item label="Rua 02" value="02" />
                  <Picker.Item label="Rua 03" value="03" />
                  <Picker.Item label="Rua 04" value="04" />
                </Picker>
              </View>
              
              <Input
                label="Casa"
                placeholder="Número da sua casa"
                value={house}
                onChangeText={setHouse}
                keyboardType="numeric"
                leftIcon={<Home size={20} color={Colors.gray[400]} />}
              />
              
              <View style={styles.editButtons}>
                <Button
                  title="Cancelar"
                  onPress={() => setIsEditing(false)}
                  variant="outline"
                  style={styles.cancelButton}
                />
                
                <Button
                  title="Salvar"
                  onPress={handleSaveProfile}
                  style={styles.saveButton}
                />
              </View>
            </View>
          ) : (
            <View style={styles.infoList}>
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Informações Pessoais</Text>
                
                <View style={styles.infoItem}>
                  <View style={styles.iconContainer}>
                    <User size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Nome</Text>
                    <Text style={styles.infoValue}>{user?.name || 'Não informado'}</Text>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.infoItem}>
                  <View style={styles.iconContainer}>
                    <Mail size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{user?.email || 'Não informado'}</Text>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.infoItem}>
                  <View style={styles.iconContainer}>
                    <CreditCard size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>CPF</Text>
                    <Text style={styles.infoValue}>{user?.cpf || 'Não informado'}</Text>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.infoItem}>
                  <View style={styles.iconContainer}>
                    <Phone size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Telefone</Text>
                    <Text style={styles.infoValue}>{user?.phone || 'Não informado'}</Text>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.infoItem}>
                  <View style={styles.iconContainer}>
                    <Home size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Endereço</Text>
                    <Text style={styles.infoValue}>
                      {user?.street || user?.house 
                        ? `${user?.street ? `Rua ${user.street}` : ''}${user?.house ? `, Casa ${user.house}` : ''}`
                        : 'Não informado'}
                    </Text>
                  </View>
                </View>
              </View>
              
              <Button
                title="Editar Perfil"
                onPress={() => setIsEditing(true)}
                variant="outline"
                style={styles.editButton}
              />
            </View>
          )}
        </View>
        
        <Button
          title="Sair da Conta"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutButton}
          leftIcon={<LogOut size={20} color="white" />}
        />
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
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
  profileInitials: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: Colors.gray[600],
    marginBottom: 16,
  },
  backButton: {
    marginRight: 10,
    marginLeft: 16,
    backgroundColor: Colors.primary + '30',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    paddingBottom: 8,
  },
  infoList: {
    gap: 16,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '10', // 10% opacity
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray[200],
    marginVertical: 8,
  },
  editForm: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  editButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  editButton: {
    marginTop: 16,
  },
  logoutButton: {
    marginTop: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
    color: Colors.text,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border || Colors.gray[300],
    borderRadius: 8,
    marginBottom: 16,
    paddingLeft: 16,
  },
  pickerIcon: {
    marginRight: 10,
  },
  picker: {
    flex: 1,
    height: 50,
  },
});