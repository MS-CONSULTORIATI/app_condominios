import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState, useCallback } from "react";
import { Platform, View, StyleSheet, StatusBar, AppState, ActivityIndicator } from "react-native";
import { ErrorBoundary } from "./error-boundary";
import Colors from "@/constants/colors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeOut
} from "react-native-reanimated";
import { LogIn } from "lucide-react-native";
import '@/lib/firebase'; // Importar firebase para inicialização
import { initializeNotifications, registerForPushNotificationsAsync } from '@/lib/notifications'; // Importar o serviço de notificações
import * as Notifications from 'expo-notifications';
import { onAuthStateChange, getUserProfile, createUserProfile, getAuth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth-store';
import AnimatedSplash from '@/components/AnimatedSplash';

export const unstable_settings = {
  initialRouteName: "(auth)",
};

// Create a client
const queryClient = new QueryClient();

// Force immediate hide of native splash screen
SplashScreen.hideAsync().catch(() => {});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });
  const [showSplash, setShowSplash] = useState(true);
  const { syncWithFirebase, silentLogin, user } = useAuthStore();

  // Animation values
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const backgroundOpacity = useSharedValue(1);

  // Inicializar notificações
  useEffect(() => {
    // Configurar handler de notificações para quando o app está em segundo plano
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Inicializar as notificações primeiro, independente do login
    // Isso garante que o app possa receber notificações mesmo sem login
    const setupNotifications = async () => {
      try {
        console.log('Inicializando serviço de notificações...');
        
        // Forçar solicitação de permissão explicitamente na inicialização
        // Isso garante que o diálogo de permissão seja exibido em todas as versões
        const token = await registerForPushNotificationsAsync();
        
        if (token) {
          console.log('Token de notificação obtido:', token);
          // Inicializar notificações independente do login para garantir o registro
          initializeNotifications().catch(err => {
            console.error('Erro ao inicializar notificações:', err);
          });
        } else {
          console.log('Não foi possível obter o token de notificação');
        }
      } catch (err) {
        console.error('Erro na configuração inicial de notificações:', err);
      }
    };
    
    setupNotifications();

    // Escutar alterações de autenticação apenas para notificações
    // Este listener é diferente do usado para autenticação geral
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        console.log('Firebase Auth (notificações): Usuário autenticado');
        // Usuário está logado, associar o token ao usuário
        initializeNotifications().catch(err => {
          console.error('Erro ao inicializar notificações do usuário:', err);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
  
  // Mecanismo de verificação e reparo de perfis incompletos
  const verifyAndFixUserProfile = useCallback(async () => {
    try {
      // Verificar se há um usuário autenticado
      const currentUser = getAuth().currentUser;
      if (!currentUser) return;
      
      console.log('Verificando integridade do perfil do usuário:', currentUser.uid);
      
      // Obter perfil do usuário no Firestore
      const userProfile = await getUserProfile(currentUser.uid);
      
      // Se não encontrou o perfil, não tentamos reparar aqui
      // O login e silentLogin já cuidam disso
      if (!userProfile) {
        console.log('Perfil não encontrado, será tratado pelo login');
        return;
      }
      
      console.log('Perfil encontrado, não é necessário reparo automático');
    } catch (err) {
      console.error('Erro ao verificar perfil do usuário:', err);
    }
  }, []);

  // Verificar autenticação quando o app inicia, antes mesmo de mostrar a UI
  useEffect(() => {
    const checkInitialAuth = async () => {
      try {
        console.log('Verificando autenticação ao iniciar o app...');
        
        // Primeiro tentar login silencioso com credenciais salvas
        const silentLoginSuccess = await silentLogin();
        
        if (silentLoginSuccess) {
          console.log('Login silencioso bem-sucedido, usuário autenticado');
          // Após login bem-sucedido, verificar e reparar perfil se necessário
          await verifyAndFixUserProfile();
        } else {
          console.log('Login silencioso falhou, tentando sincronizar com Firebase');
          // Se falhar, verificar se há sessão ativa no Firebase
          const syncSuccess = await syncWithFirebase();
          
          if (syncSuccess) {
            // Se sincronização foi bem-sucedida, verificar e reparar perfil
            await verifyAndFixUserProfile();
          }
        }
      } catch (err) {
        console.error('Erro na verificação inicial de autenticação:', err);
      }
    };
    
    checkInitialAuth();
  }, [syncWithFirebase, silentLogin, verifyAndFixUserProfile]);

  // Handle splash screen hiding with error handling
  const onAnimationComplete = useCallback(() => {
    try {
      if (typeof setShowSplash === 'function') {
        setShowSplash(false);
      }
      
      // Esconder a splash screen nativa se ainda estiver visível
      SplashScreen.hideAsync().catch(err => console.error('Error hiding splash:', err));
    } catch (err) {
      console.error('Error in splash animation completion:', err);
    }
  }, [setShowSplash]);

  useEffect(() => {
    if (error) {
      console.error(error);
      throw error;
    }
  }, [error]);

  // Esconder a splash nativa imediatamente após inicialização e a cada mudança de estado do app
  useEffect(() => {
    // Função para esconder a splash nativa
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
        console.log('Splash nativa escondida com sucesso');
      } catch (e) {
        console.log('Erro ao esconder splash:', e);
      }
    };
    
    // Tentativa imediata
    hideSplash();
    
    // Esconder splash a cada troca de estado do app (ativo, background, inativo)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        hideSplash();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      // When fonts are loaded, hide the native splash screen to show our custom one
      try {
        SplashScreen.hideAsync().catch(err => console.error('Error hiding splash:', err));
      } catch (e) {
        console.log('Erro ao esconder splash:', e);
      }
    }
  }, [loaded]);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
      transform: [{ scale: logoScale.value }],
    };
  });

  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: backgroundOpacity.value,
    };
  });

  // Set status bar color to match app bar
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(Colors.primary);
    }
  }, []);

  if (!loaded || showSplash) {
    return (
      <AnimatedSplash onAnimationComplete={onAnimationComplete} />
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RootLayoutNav />
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Voltar",
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerShadowVisible: false,
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: Colors.card,
        },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  appSlogan: {
    fontSize: 18,
    color: Colors.gray[600],
    textAlign: 'center',
  },
});