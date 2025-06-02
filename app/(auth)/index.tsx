import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { router, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { Mail, Lock, LogIn, Fingerprint, Info, Menu } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import Animated, { 
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';
import CondominiumInfoDrawer from '@/components/CondominiumInfoDrawer';
import { initializeNotifications } from '@/lib/notifications';

export default function LoginScreen() {
  const { 
    login, 
    loginWithBiometric, 
    isLoading, 
    error, 
    biometricEnabled, 
    syncWithFirebase,
    isAuthenticated,
    user,
    silentLogin,
    isAuthChecking,
  } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const router = useRouter();

  // Animation values
  const logoScale = useSharedValue(1);
  const formOpacity = useSharedValue(0);

  // Verificar autenticação com Firebase ao montar o componente
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        console.log('LoginScreen: Verificando autenticação inicial com Firebase...');
        
        // Primeiro tentar login silencioso
        const silentLoginSuccess = await silentLogin();
        if (silentLoginSuccess) {
          console.log('LoginScreen: Login silencioso bem-sucedido');
          // Login silencioso funcionou, não precisa continuar verificando
          return;
        }
        
        console.log('LoginScreen: Login silencioso falhou, tentando sincronizar com Firebase');
        // Se o login silencioso falhar, verificar estado atual no Firebase
        const isAuth = await syncWithFirebase();
        console.log('LoginScreen: Estado após verificação:', isAuth ? 'Autenticado' : 'Não autenticado');
      } catch (err) {
        console.error('LoginScreen: Erro verificando autenticação inicial:', err);
      }
    };
    
    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [syncWithFirebase, silentLogin]);

  // Verificar se já está autenticado
  useEffect(() => {
    if (!isAuthChecking && isAuthenticated && user) {
      console.log('LoginScreen: Já autenticado como', user.name, 'redirecionando para home');
      setTimeout(() => {
        router.replace('/(app)');
      }, 100);
    }
  }, [isAuthenticated, user, isAuthChecking, router]);

  // Verificar disponibilidade de biometria
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        
        // Usuário precisa de hardware compatível + biometria cadastrada + ter ativado no app
        setIsBiometricAvailable(compatible && enrolled && biometricEnabled);
      } catch (err) {
        console.error('Erro ao verificar biometria:', err);
        setIsBiometricAvailable(false);
      }
    };
    
    checkBiometricAvailability();
  }, [biometricEnabled]);

  // Iniciar animações
  useEffect(() => {
    // Start animations
    logoScale.value = withSequence(
      withTiming(1.1, { duration: 800, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
    );
    
    formOpacity.value = withDelay(
      400, 
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) })
    );
  }, []);

  // Animated styles definidos antes de qualquer retorno condicional
  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: logoScale.value }],
    };
  });

  const formAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: formOpacity.value,
    };
  });

  // Funções de manipuladores de eventos
  const handleLogin = async () => {
    if (!email || !password) {
      setLocalError('Por favor, preencha todos os campos.');
      return;
    }
    
    setLocalLoading(true);
    setLocalError('');
    
    try {
      await login(email, password);
      await initializeNotifications();
      // Usar setTimeout para garantir a navegação correta
      setTimeout(() => {
        router.replace('/(app)');
      }, 100);
    } catch (err) {
      setLocalError('Falha no login. Usuário ou Senha incorretos.');
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setLocalLoading(true);
      setLocalError('');
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticar com biometria',
        fallbackLabel: 'Use sua senha',
      });
      
      if (result.success) {
        await loginWithBiometric();
        await initializeNotifications();
        // Usar setTimeout para garantir a navegação correta
        setTimeout(() => {
          router.replace('/(app)');
        }, 100);
      } else {
        setLocalError('Autenticação biométrica falhou. Tente novamente ou use email/senha.');
      }
    } catch (err) {
      setLocalError('Erro na autenticação biométrica.');
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRegister = () => {
    router.push('/register');
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const toggleDrawer = () => {
    setIsDrawerVisible(!isDrawerVisible);
  };

  // Mostrar loading enquanto verifica autenticação inicial
  if (isAuthChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <TouchableOpacity 
        style={styles.infoButton}
        onPress={toggleDrawer}
        activeOpacity={0.7}
      >
        <Menu size={24} color={Colors.primary} />
      </TouchableOpacity>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logoCircle}>
            <LogIn size={40} color={Colors.primary} />
          </View>
          <Animated.Text 
            entering={FadeIn.duration(800).delay(300)}
            style={styles.appName}
          >
            Condomínio Fácil
          </Animated.Text>
          <Animated.Text 
            entering={FadeIn.duration(800).delay(500)}
            style={styles.appSlogan}
          >
            Gestão de condomínio simplificada
          </Animated.Text>
        </Animated.View>
        
        <Animated.View 
          style={[styles.formContainer, formAnimatedStyle]}
          entering={FadeIn.duration(800).delay(300)}
        >
          <Animated.Text 
            entering={FadeIn.duration(600).delay(600)}
            style={styles.title}
          >
            Login
          </Animated.Text>
          
          {localError ? (
            <Animated.View 
              entering={FadeIn.duration(400)}
              style={styles.errorContainer}
            >
              <Text style={styles.errorText}>{localError}</Text>
            </Animated.View>
          ) : null}
          
          <Animated.View entering={FadeIn.duration(600).delay(700)}>
            <Input
              label="Email"
              placeholder="Seu email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={Colors.gray[500]} />}
            />
          </Animated.View>
          
          <Animated.View entering={FadeIn.duration(600).delay(800)}>
            <Input
              label="Senha"
              placeholder="Sua senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.gray[500]} />}
            />
          </Animated.View>
          
          <Animated.View entering={FadeIn.duration(600).delay(900)}>
            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>
          </Animated.View>
          
          <Animated.View entering={FadeIn.duration(600).delay(1000)}>
            <Button
              title="Entrar"
              onPress={handleLogin}
              isLoading={localLoading}
              style={styles.loginButton}
            />
          </Animated.View>
          
          {isBiometricAvailable && (
            <Animated.View entering={FadeIn.duration(600).delay(1100)}>
              <Button
                title="Entrar com Biometria"
                onPress={handleBiometricLogin}
                variant="secondary"
                isLoading={localLoading}
                style={styles.biometricButton}
                leftIcon={<Fingerprint size={20} color="white" />}
              />
            </Animated.View>
          )}
        </Animated.View>
        
        <Animated.View 
          style={styles.footer}
          entering={FadeIn.duration(800).delay(1400)}
        >
          <Text style={styles.footerText}>Não tem uma conta?</Text>
          <TouchableOpacity onPress={handleRegister}>
            <Text style={styles.footerLink}>Cadastre-se</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Condominium Info Drawer */}
      <CondominiumInfoDrawer 
        isVisible={isDrawerVisible} 
        onClose={toggleDrawer} 
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  appSlogan: {
    fontSize: 16,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: Colors.error + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
  },
  loginButton: {
    marginBottom: 16,
  },
  biometricButton: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: Colors.gray[600],
    fontSize: 14,
    marginRight: 4,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 100,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});