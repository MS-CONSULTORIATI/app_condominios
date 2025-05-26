import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useUsersStore } from '@/store/users-store';
import { useAuthStore } from '@/store/auth-store';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { Save, User as UserIcon, Mail, Phone, Shield, Home, ArrowLeft, CreditCard } from 'lucide-react-native';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import { User } from '@/types';

export default function EditUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const { users, getUserById, updateUser, isLoading, error } = useUsersStore();
  
  const isAdmin = currentUser?.role === 'admin';
  const [user, setUser] = useState<User | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [apartment, setApartment] = useState('');
  const [block, setBlock] = useState('');
  const [role, setRole] = useState<'resident' | 'manager' | 'admin' | 'visitor'>('resident');
  
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  
  useEffect(() => {
    if (id) {
      const foundUser = getUserById(id);
      if (foundUser) {
        setUser(foundUser);
        setName(foundUser.name || '');
        setEmail(foundUser.email || '');
        setPhone(foundUser.phone || '');
        setCpf(foundUser.cpf || '');
        setApartment(foundUser.apartment || '');
        setBlock(foundUser.block || '');
        setRole(foundUser.role || 'resident');
      }
    }
  }, [id, users]);

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

  if (!user && isLoading) {
    return <LoadingIndicator fullScreen text="Carregando usuário..." />;
  }

  if (!user && !isLoading) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Usuário não encontrado"
          description="O usuário que você está procurando não existe ou foi removido."
          icon={<UserIcon size={48} color={Colors.gray[400]} />}
          actionLabel="Voltar"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setNameError('');
    setEmailError('');
    
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
    
    return isValid;
  };

  const handleUpdateUser = async () => {
    if (validateForm()) {
      try {
        await updateUser(id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          cpf: cpf.trim(),
          apartment: apartment.trim(),
          block: block.trim(),
          role,
        });
        
        if (Platform.OS === 'web') {
          router.back();
        } else {
          Alert.alert(
            "Sucesso",
            "Usuário atualizado com sucesso!",
            [{ text: "OK", onPress: () => router.back() }]
          );
        }
      } catch (error) {
        console.error('Error updating user:', error);
      }
    }
  };

  const handleGoBack = () => {
    router.back();
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
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Button
        title="Voltar"
        onPress={handleGoBack}
        variant="outline"
        style={styles.backButton}
        leftIcon={<ArrowLeft size={20} color={Colors.primary} />}
      />
      
      <Text style={styles.title}>Editar Usuário</Text>
      
      <Input
        label="Nome Completo"
        placeholder="Digite o nome completo do usuário"
        value={name}
        onChangeText={setName}
        error={nameError}
        leftIcon={<UserIcon size={20} color={Colors.gray[400]} />}
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
        title="Salvar Alterações"
        onPress={handleUpdateUser}
        isLoading={isLoading}
        style={styles.saveButton}
        leftIcon={<Save size={20} color="white" />}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  blockInput: {
    flex: 1,
  },
  apartmentInput: {
    flex: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: Colors.text,
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  roleButton: {
    flex: 1,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
  },
});