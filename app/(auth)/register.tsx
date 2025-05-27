import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Image,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { Mail, Lock, User, ArrowLeft, Phone, CreditCard, Home, MapPin, Camera } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('01');
  const [house, setHouse] = useState('');
  const [photoURI, setPhotoURI] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { register } = useAuthStore();

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword || !street || !house) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    const fullName = `${firstName} ${lastName}`;
    
    try {
      await register(email, password, fullName, phone, cpf, street, house, photoURI);
      router.replace('/(app)');
    } catch (err) {
      setError('Falha no registro. Tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };
  
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

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View 
          entering={FadeInDown.duration(600).delay(200)}
          style={styles.titleContainer}
        >
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Preencha os dados para se registrar no Condomínio Fácil</Text>
        </Animated.View>
        
        <Animated.View 
          entering={FadeInUp.duration(800).delay(300)}
          style={styles.formContainer}
        >
          {error ? (
            <Animated.View 
              entering={FadeInDown.duration(400)}
              style={styles.errorContainer}
            >
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}
          
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

          <View style={styles.rowContainer}>
            <View style={styles.halfInput}>
              <Input
                label="Nome*"
                placeholder="Seu nome"
                value={firstName}
                onChangeText={setFirstName}
                leftIcon={<User size={20} color={Colors.gray[500]} />}
              />
            </View>
            
            <View style={styles.halfInput}>
              <Input
                label="Sobrenome*"
                placeholder="Seu sobrenome"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>
          
          <Input
            label="Email*"
            placeholder="Seu email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Mail size={20} color={Colors.gray[500]} />}
          />
          
          <Input
            label="CPF*"
            placeholder="000.000.000-00"
            value={cpf}
            onChangeText={handleCPFChange}
            keyboardType="numeric"
            maxLength={14}
            leftIcon={<CreditCard size={20} color={Colors.gray[500]} />}
          />
          
          <Input
            label="Telefone"
            placeholder="(00) 00000-0000"
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            leftIcon={<Phone size={20} color={Colors.gray[500]} />}
          />
          
          <View style={styles.rowContainer}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Rua*</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={street}
                  onValueChange={(itemValue) => setStreet(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Rua 1" value="01" />
                  <Picker.Item label="Rua 2" value="02" />
                  <Picker.Item label="Rua 3" value="03" />
                  <Picker.Item label="Rua 4" value="04" />
                  <Picker.Item label="Rua 5" value="05" />
                  <Picker.Item label="Rua 6" value="06" />
                  <Picker.Item label="Rua 7" value="07" />
                  <Picker.Item label="Rua 8" value="08" />
                  <Picker.Item label="Rua 9" value="09" />
                  <Picker.Item label="Rua 10" value="10" />
                </Picker>
              </View>
            </View>
            
            <View style={styles.halfInput}>
              <Input
                label="Casa*"
                placeholder="Número"
                value={house}
                onChangeText={setHouse}
                keyboardType="numeric"
                leftIcon={<Home size={20} color={Colors.gray[500]} />}
              />
            </View>
          </View>
          
          <View style={styles.rowContainer}>
            <View style={styles.halfInput}>
              <Input
                label="Senha*"
                placeholder="Sua senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                leftIcon={<Lock size={20} color={Colors.gray[500]} />}
              />
            </View>
            
            <View style={styles.halfInput}>
              <Input
                label="Confirmar*"
                placeholder="Confirme"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                leftIcon={<Lock size={20} color={Colors.gray[500]} />}
              />
            </View>
          </View>
          
          <Button
            title="Registrar"
            onPress={handleRegister}
            isLoading={isLoading}
            style={styles.registerButton}
          />
        </Animated.View>
        
        <Animated.View 
          entering={FadeInUp.duration(800).delay(900)}
          style={styles.footer}
        >
          <Text style={styles.footerText}>Já tem uma conta?</Text>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.loginText}>Entrar</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray[600],
  },
  formContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  halfInput: {
    width: '48%',
  },
  errorContainer: {
    backgroundColor: Colors.error + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  pickerContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    backgroundColor: Colors.white,
    height: 50,
    justifyContent: 'center',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  registerButton: {
    marginTop: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  footerText: {
    fontSize: 14,
    color: Colors.gray[600],
    marginRight: 5,
  },
  loginText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
});