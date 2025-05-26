import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useResidentsStore } from '@/store/residents-store';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { Save, User, Mail, Phone, Home, Calendar } from 'lucide-react-native';

export default function CreateResidentScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [apartment, setApartment] = useState('');
  const [block, setBlock] = useState('');
  const [isOwner, setIsOwner] = useState(true);
  
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [apartmentError, setApartmentError] = useState('');
  const [blockError, setBlockError] = useState('');
  
  const { createResident, isLoading, error } = useResidentsStore();

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setNameError('');
    setEmailError('');
    setApartmentError('');
    setBlockError('');
    
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
    
    // Validate apartment
    if (!apartment.trim()) {
      setApartmentError('O apartamento é obrigatório');
      isValid = false;
    }
    
    // Validate block
    if (!block.trim()) {
      setBlockError('O bloco é obrigatório');
      isValid = false;
    }
    
    return isValid;
  };

  const handleCreateResident = async () => {
    if (validateForm()) {
      try {
        await createResident({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          apartment: apartment.trim(),
          block: block.trim(),
          isOwner,
          moveInDate: Date.now(),
        });
        
        if (Platform.OS === 'web') {
          router.back();
        } else {
          Alert.alert(
            'Sucesso',
            'Morador cadastrado com sucesso!',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } catch (error) {
        console.error('Error creating resident:', error);
      }
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Input
        label="Nome Completo"
        placeholder="Digite o nome completo do morador"
        value={name}
        onChangeText={setName}
        error={nameError}
        leftIcon={<User size={20} color={Colors.gray[400]} />}
      />
      
      <Input
        label="Email"
        placeholder="Digite o email do morador"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={emailError}
        leftIcon={<Mail size={20} color={Colors.gray[400]} />}
      />
      
      <Input
        label="Telefone"
        placeholder="Digite o telefone do morador"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        leftIcon={<Phone size={20} color={Colors.gray[400]} />}
      />
      
      <View style={styles.row}>
        <Input
          label="Bloco"
          placeholder="Bloco"
          value={block}
          onChangeText={setBlock}
          error={blockError}
          style={styles.blockInput}
        />
        
        <Input
          label="Apartamento"
          placeholder="Número"
          value={apartment}
          onChangeText={setApartment}
          keyboardType="numeric"
          error={apartmentError}
          style={styles.apartmentInput}
        />
      </View>
      
      <Text style={styles.label}>Tipo de Ocupação</Text>
      <View style={styles.typeContainer}>
        <Button
          title="Proprietário"
          onPress={() => setIsOwner(true)}
          variant={isOwner ? 'primary' : 'outline'}
          style={styles.typeButton}
        />
        <Button
          title="Inquilino"
          onPress={() => setIsOwner(false)}
          variant={!isOwner ? 'primary' : 'outline'}
          style={styles.typeButton}
        />
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      <Button
        title="Cadastrar Morador"
        onPress={handleCreateResident}
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
  typeContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  typeButton: {
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