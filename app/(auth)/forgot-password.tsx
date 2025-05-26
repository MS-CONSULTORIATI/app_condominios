import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as firebase from '@/lib/firebase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Por favor, insira seu email.');
      return;
    }

    // Validação simples de email
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email inválido. Por favor, verifique e tente novamente.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await firebase.sendPasswordResetEmail(email.trim());
      setIsSuccess(true);
    } catch (err: any) {
      // Determinar a causa do erro
      let errorMessage = 'Falha ao enviar email de redefinição. Tente novamente.';
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'Não existe usuário com este email.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Endereço de email inválido.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
      }
      
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
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
        <Text style={styles.title}>Esqueceu a senha?</Text>
        <Text style={styles.subtitle}>
          {isSuccess 
            ? 'Email enviado! Verifique sua caixa de entrada para redefinir sua senha.' 
            : 'Informe seu email para receber um link de redefinição de senha.'}
        </Text>
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
        
        {isSuccess ? (
          <Animated.View 
            entering={FadeInDown.duration(400)}
            style={styles.successContainer}
          >
            <CheckCircle size={48} color={Colors.success} />
            <Text style={styles.successText}>
              Um link para redefinição de senha foi enviado para {email}
            </Text>
          </Animated.View>
        ) : (
          <>
            <Input
              label="Email"
              placeholder="Seu email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={Colors.gray[500]} />}
            />
            
            <Button
              title="Enviar link de redefinição"
              onPress={handleResetPassword}
              isLoading={isLoading}
              style={styles.resetButton}
            />
          </>
        )}
        
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.loginButton}
        >
          <Text style={styles.loginText}>Voltar para login</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    marginBottom: 30,
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
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginVertical: 20,
  },
  successText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 20,
  },
  resetButton: {
    marginTop: 20,
  },
  loginButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
}); 