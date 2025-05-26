import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { auth, db } from './firebase';
import { getMessaging, getToken } from 'firebase/messaging';

// Verificar se está em ambiente onde Firebase Messaging é suportado
let firebaseMessaging: any = null;
try {
  // Em vez de importação dinâmica, usar uma verificação em tempo de execução
  if (Constants.executionEnvironment !== 'storeClient' && 
      Constants.executionEnvironment !== 'standalone' && 
      Platform.OS !== 'web') {
    // Isto será ignorado no Expo Go, evitando erros de importação
    firebaseMessaging = require('@react-native-firebase/messaging').default;
  }
} catch (error) {
  console.log('Firebase Messaging não disponível:', error);
}

// Configuração das notificações expo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Verificação para determinar se estamos em Expo Go ou em um desenvolvimento/produção build
const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.executionEnvironment === 'standalone';

// Definir tipo para mensagens remotas do Firebase
interface RemoteMessage {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, string>;
  from?: string;
  messageId?: string;
  sentTime?: number;
}

// Registrar para notificações push usando abordagem híbrida
export async function registerForPushNotificationsAsync() {
  let token: string | undefined;
  
  if (Platform.OS === 'android') {
    // Configure o canal de notificação para Android
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E3A8A',
      enableVibrate: true,
      showBadge: true,
    });
  }

  // Verificar se é um dispositivo físico
  if (Device.isDevice) {
    try {
      if (isExpoGo || Platform.OS === 'web' || !firebaseMessaging) {
        // Usar Expo Notifications quando estiver no Expo Go ou web
        // Sempre solicitar permissão explicitamente, independente do ambiente
        const { status } = await Notifications.requestPermissionsAsync();
        
        if (status !== 'granted') {
          console.log('Permissão para notificações não concedida');
          return undefined;
        }
        
        // Obter o token do Expo notification
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || "7044994c-90b5-499b-b341-68f4506494c2";
        const expoPushToken = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });
        
        console.log('Token Expo obtido:', expoPushToken.data);
        return expoPushToken.data;
      } else {
        // Usar Firebase Cloud Messaging em builds nativos
        // Para iOS: Solicitar permissão para notificações
        if (Platform.OS === 'ios') {
          const authStatus = await firebaseMessaging().requestPermission();
          const enabled =
            authStatus === firebaseMessaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === firebaseMessaging.AuthorizationStatus.PROVISIONAL;
            
          if (!enabled) {
            console.log('Permissão de notificação não concedida');
            return undefined;
          }
        } 
        // Para Android: Sempre solicitar permissão explicitamente
        else if (Platform.OS === 'android') {
          try {
            // Solicitar permissão via Firebase Messaging
            await firebaseMessaging().requestPermission();
            
            // Como precaução adicional, também solicitar via Expo Notifications
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
              console.log('Permissão para notificações via Expo não concedida');
            }
          } catch (error) {
            console.error('Erro ao solicitar permissão para notificações:', error);
          }
        }
        
        // Obter o token FCM diretamente
        token = await firebaseMessaging().getToken();
        console.log('Token FCM obtido:', token);
        return token;
      }
    } catch (error) {
      console.error('Erro ao obter token de notificação:', error);
      return undefined;
    }
  } else {
    console.log('Notificações push requerem um dispositivo físico');
    return undefined;
  }
}

// Salvar o token do usuário no Firestore
export async function saveUserPushToken(userId: string, token: string | undefined) {
  if (!token) {
    console.log('Token não fornecido para salvar');
    return;
  }
  
  try {
    const userRef = doc(db, 'users', userId);
    
    // Verificar se o documento do usuário existe
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // Atualizar o token de push do usuário
      await setDoc(userRef, { pushToken: token }, { merge: true });
      console.log('Token de push salvo para o usuário:', userId);
    } else {
      console.log('Usuário não encontrado no Firestore');
    }
  } catch (error) {
    console.error('Erro ao salvar token de push:', error);
  }
}

// Inicializar notificações para o usuário atual
export async function initializeNotifications() {
  try {
    const token = await registerForPushNotificationsAsync();
    
    if (token) {
      // Adicionar o token ao usuário atual
      const userId = auth.currentUser?.uid;
      if (userId) {
        await saveUserPushToken(userId, token);
      } else {
        console.log('Usuário não autenticado, não foi possível salvar o token');
      }
    } else {
      console.log('Não foi possível obter o token de notificação');
    }
    
    if (isExpoGo || Platform.OS === 'web' || !firebaseMessaging) {
      // Configurar handlers para Expo Notifications
      const subscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notificação recebida!', notification);
      });
      
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Resposta de notificação recebida!', response);
        // Aqui você pode adicionar lógica para navegar para telas específicas
      });
      
      return () => {
        subscription.remove();
        responseSubscription.remove();
      };
    } else {
      // Configurar handlers para Firebase Cloud Messaging em builds nativos
      // Handler para mensagens em foreground
      const unsubscribeForeground = firebaseMessaging().onMessage(async (remoteMessage: RemoteMessage) => {
        console.log('Mensagem FCM recebida em foreground:', remoteMessage);
        
        // Mostrar notificação usando expo-notifications quando o app está em foreground
        await Notifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification?.title || 'Nova notificação',
            body: remoteMessage.notification?.body || '',
            data: remoteMessage.data,
          },
          trigger: null, // Mostrar imediatamente
        });
      });
      
      // Handler para quando o app é aberto por uma notificação
      firebaseMessaging().onNotificationOpenedApp((remoteMessage: RemoteMessage) => {
        console.log('Notificação abriu o app de background:', remoteMessage);
        // Aqui você pode adicionar lógica para navegar para telas específicas
      });
      
      // Verificar se o app foi aberto a partir de uma notificação quando estava fechado
      firebaseMessaging()
        .getInitialNotification()
        .then((remoteMessage: RemoteMessage | null) => {
          if (remoteMessage) {
            console.log('App aberto a partir de notificação quando fechado:', remoteMessage);
            // Aqui você pode adicionar lógica para navegar para telas específicas
          }
        });
        
      return unsubscribeForeground;
    }
  } catch (error) {
    console.error('Erro ao inicializar notificações:', error);
    return () => {};
  }
} 