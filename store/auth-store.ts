import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';
import * as LocalAuthentication from 'expo-local-authentication';
import * as firebase from '@/lib/firebase';

// Chaves para armazenamento das credenciais
const CREDS_KEY = 'auth-credentials';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricEnabled: boolean;
  lastLoggedInEmail: string | null;
  isAuthChecking: boolean;
  setAuthChecking: (checking: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string, cpf?: string, street?: string, house?: string, photoURI?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  updateProfileImage: (imageUri: string) => Promise<void>;
  enableBiometric: (enable: boolean) => Promise<void>;
  syncWithFirebase: () => Promise<boolean>;
  silentLogin: () => Promise<boolean>;
}

// Função para salvar credenciais no AsyncStorage
const saveCredentials = async (email: string, password: string) => {
  try {
    const credentials = { email, password };
    await AsyncStorage.setItem(CREDS_KEY, JSON.stringify(credentials));
    console.log('Credenciais salvas com sucesso');
  } catch (error) {
    console.error('Erro ao salvar credenciais:', error);
  }
};

// Função para recuperar credenciais do AsyncStorage
const getCredentials = async () => {
  try {
    const credentialsJson = await AsyncStorage.getItem(CREDS_KEY);
    if (credentialsJson) {
      return JSON.parse(credentialsJson) as { email: string; password: string };
    }
  } catch (error) {
    console.error('Erro ao recuperar credenciais:', error);
  }
  return null;
};

// Função para limpar credenciais do AsyncStorage
const clearCredentials = async () => {
  try {
    await AsyncStorage.removeItem(CREDS_KEY);
    console.log('Credenciais removidas com sucesso');
  } catch (error) {
    console.error('Erro ao remover credenciais:', error);
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      biometricEnabled: false,
      lastLoggedInEmail: null,
      isAuthChecking: true,
      setAuthChecking: (checking: boolean) => set({ isAuthChecking: checking }),
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Use Firebase Authentication
          const userCredential = await firebase.signInWithEmail(email, password);
          const firebaseUser = userCredential.user;
          
          console.log('Login bem-sucedido com Firebase Auth, ID:', firebaseUser.uid);
          
          // Aumentar o atraso para dar mais tempo ao Firebase
          console.log('Aguardando sincronização inicial...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Primeiro tente obter o perfil existente
          let userProfile = await firebase.getUserProfile(firebaseUser.uid);
          
          // Verificar se precisa criar um perfil básico
          if (!userProfile) {
            console.log('Perfil não encontrado no primeiro login, criando perfil básico');
            
            // Criar dados básicos para o perfil
            const basicUserData: Partial<User> = {
              id: firebaseUser.uid,
              email: email,
              name: firebaseUser.displayName || email.split('@')[0],
              role: 'resident',
              createdAt: Date.now(),
            };
            
            // Criar perfil no Firestore
            await firebase.createUserProfile(firebaseUser.uid, basicUserData);
            console.log('Perfil básico criado, aguardando sincronização...');
            
            // Dar tempo para o Firestore processar a criação
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Tentar recuperar o perfil novamente
            userProfile = await firebase.getUserProfile(firebaseUser.uid);
            
            // Se ainda não encontrou o perfil, tentar uma última vez com mais espera
            if (!userProfile) {
              console.log('Perfil ainda não encontrado após criação, última tentativa...');
              await new Promise(resolve => setTimeout(resolve, 1500));
              userProfile = await firebase.getUserProfile(firebaseUser.uid);
              
              // Se ainda não encontrou, usar os dados básicos como último recurso
              if (!userProfile) {
                console.log('Usando dados básicos como último recurso');
                userProfile = {
                  id: firebaseUser.uid,
                  email: email,
                  name: firebaseUser.displayName || email.split('@')[0],
                  role: 'resident',
                  createdAt: Date.now(),
                } as User;
              }
            }
          }
          
          console.log('Perfil final recuperado para login:', userProfile);
          
          // Salvar credenciais para login automático futuro
          await saveCredentials(email, password);
          
          // Atualizar estado com os dados do usuário
          set({ 
            user: userProfile, 
            isAuthenticated: true, 
            isLoading: false,
            lastLoggedInEmail: email 
          });
          
          console.log('Login finalizado com sucesso como:', userProfile.name);
        } catch (error) {
          console.error('Login failed:', error);
          set({ error: 'Failed to login', isLoading: false });
          throw error;
        }
      },
      
      loginWithBiometric: async () => {
        set({ isLoading: true, error: null });
        try {
          const { biometricEnabled, lastLoggedInEmail } = get();
          
          if (!biometricEnabled || !lastLoggedInEmail) {
            throw new Error('Biometric authentication not enabled or no previous login');
          }
          
          // Check biometric
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Verificar biometria',
            fallbackLabel: 'Use sua senha',
          });
          
          if (!result.success) {
            throw new Error('Biometric verification failed');
          }
          
          // Use the current Firebase Auth user if available
          const currentUser = firebase.getAuth().currentUser;
          
          if (!currentUser) {
            throw new Error('No authenticated user found');
          }
          
          // Get user profile from Firestore
          const userProfile = await firebase.getUserProfile(currentUser.uid);
          
          if (!userProfile) {
            throw new Error('User profile not found');
          }
          
          set({ user: userProfile, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to login with biometric', isLoading: false });
          throw error;
        }
      },
      
      loginAnonymously: async () => {
        set({ isLoading: true, error: null });
        try {
          // Use Firebase Anonymous Auth
          await firebase.signInAnonymously();
          
          // Create a simple user object for anonymous users
          const user: User = {
            id: 'anonymous',
            email: 'anonymous@example.com',
            name: 'Visitante',
            role: 'resident',
            createdAt: Date.now(),
          };
          
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to login anonymously', isLoading: false });
          throw error;
        }
      },
      
      register: async (email: string, password: string, name: string, phone?: string, cpf?: string, street?: string, house?: string, photoURI?: string | null) => {
        set({ isLoading: true, error: null });
        try {
          // Create user in Firebase Auth
          const userCredential = await firebase.signUpWithEmail(email, password);
          const firebaseUser = userCredential.user;
          
          // Create user profile in Firestore
          const userData: Partial<User> = {
            name,
            email,
            role: 'resident',
            createdAt: Date.now(),
            phone: phone || undefined,
            cpf: cpf || undefined,
            street: street || undefined,
            house: house || undefined,
          };
          
          await firebase.createUserProfile(firebaseUser.uid, userData);
          
          // Upload de foto se foi fornecida
          if (photoURI) {
            await firebase.uploadAvatar(photoURI, firebaseUser.uid);
          }
          
          // Get the complete user profile
          const userProfile = await firebase.getUserProfile(firebaseUser.uid);
          
          if (!userProfile) {
            throw new Error('Failed to create user profile');
          }
          
          set({ 
            user: userProfile, 
            isAuthenticated: true, 
            isLoading: false,
            lastLoggedInEmail: email 
          });
        } catch (error) {
          set({ error: 'Failed to register', isLoading: false });
          throw error;
        }
      },
      
      logout: async () => {
        set({ isLoading: true });
        try {
          // Sign out from Firebase
          await firebase.signOut();
          
          // Limpar credenciais salvas
          await clearCredentials();
          
          // Explicitamente limpar o estado
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            // Manter lastLoggedInEmail e biometricEnabled para permitir login biométrico futuro
          });
        } catch (error) {
          set({ error: 'Failed to logout', isLoading: false });
          throw error;
        }
      },
      
      updateProfile: async (userData: Partial<User>) => {
        if (!get().user) {
          set({ error: "No user logged in" });
          return;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const userId = get().user!.id;
          await firebase.updateUser(userId, userData);
          
          // Atualiza o estado local
          set({ 
            user: { ...get().user!, ...userData },
            isLoading: false
          });
        } catch (error: any) {
          set({ 
            error: error.message || "Failed to update profile", 
            isLoading: false 
          });
        }
      },
      
      updateProfileImage: async (imageUri: string) => {
        if (!get().user) {
          set({ error: "No user logged in" });
          return;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const userId = get().user!.id;
          const downloadURL = await firebase.uploadAvatar(imageUri, userId);
          
          // Atualiza o estado local
          set({ 
            user: { ...get().user!, photoURL: downloadURL },
            isLoading: false 
          });
        } catch (error: any) {
          set({ 
            error: error.message || "Failed to update profile image", 
            isLoading: false 
          });
        }
      },
      
      enableBiometric: async (enable: boolean) => {
        try {
          if (enable) {
            // Check if device supports biometric authentication
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            
            if (!compatible || !enrolled) {
              throw new Error('Biometric authentication not available on this device');
            }
            
            // Verify biometric before enabling
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Verificar biometria',
              fallbackLabel: 'Use sua senha',
            });
            
            if (!result.success) {
              throw new Error('Biometric verification failed');
            }
          }
          
          set({ biometricEnabled: enable });
        } catch (error) {
          console.error(error);
          throw error;
        }
      },
      
      syncWithFirebase: async () => {
        console.log('Sincronizando com Firebase Auth...');
        try {
          // Obter usuário atual do Firebase
          const currentUser = firebase.getAuth().currentUser;
          console.log('Estado atual do Firebase Auth:', currentUser ? `Usuário ${currentUser.uid} autenticado` : 'Nenhum usuário autenticado');
          
          if (currentUser) {
            // Dar tempo para sincronização antes de tentar buscar o perfil
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Tentar obter o perfil do usuário do Firestore
            let userProfile = await firebase.getUserProfile(currentUser.uid);
            
            // Se não encontrou o perfil, criar um básico
            if (!userProfile) {
              console.log('Perfil não encontrado durante sincronização, criando perfil básico');
              
              // Criar um perfil básico com dados mínimos
              const basicProfile: Partial<User> = {
                id: currentUser.uid,
                email: currentUser.email || '',
                name: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Usuário'),
                role: 'resident',
                createdAt: Date.now()
              };
              
              // Criar o perfil no Firestore
              await firebase.createUserProfile(currentUser.uid, basicProfile);
              console.log('Perfil básico criado, aguardando sincronização...');
              
              // Esperar a criação ser processada
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Tentar recuperar o perfil criado
              userProfile = await firebase.getUserProfile(currentUser.uid);
              
              // Se ainda não encontrou, tentar uma última vez
              if (!userProfile) {
                console.log('Perfil ainda não encontrado, tentando uma última vez...');
                await new Promise(resolve => setTimeout(resolve, 1500));
                userProfile = await firebase.getUserProfile(currentUser.uid);
                
                // Se ainda não encontrou, usar os dados básicos
                if (!userProfile) {
                  console.log('Usando dados básicos como último recurso para sincronização');
                  userProfile = basicProfile as User;
                }
              }
            }
            
            console.log('Sincronização bem-sucedida, perfil:', userProfile.name);
            set({ 
              user: userProfile, 
              isAuthenticated: true,
              error: null
            });
            return true;
          }
          
          // Não há usuário autenticado no Firebase
          console.log('Nenhum usuário autenticado no Firebase, limpando estado local');
          set({ 
            user: null, 
            isAuthenticated: false, 
            error: null 
          });
          return false;
        } catch (error) {
          console.error('Erro ao sincronizar com Firebase:', error);
          set({ error: 'Failed to sync with Firebase' });
          return false;
        }
      },
      
      // Nova função para tentar login automático usando credenciais salvas
      silentLogin: async () => {
        console.log('Tentando login silencioso com credenciais salvas...');
        try {
          // Aguardar um pouco para garantir que o layout está pronto
          await new Promise(resolve => setTimeout(resolve, 100));
          // Verificar se já está autenticado no Firebase
          const currentUser = firebase.getAuth().currentUser;
          if (currentUser) {
            console.log('Já existe um usuário autenticado no Firebase:', currentUser.uid);
            
            // Dar tempo para sincronização antes de tentar obter o perfil
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Obter perfil do Firestore
            let userProfile = await firebase.getUserProfile(currentUser.uid);
            
            // Se não encontrou o perfil, tentar criar um básico
            if (!userProfile) {
              console.log('Perfil não encontrado no login silencioso, criando perfil básico');
              
              // Criar dados básicos para o perfil
              const basicProfile: Partial<User> = {
                id: currentUser.uid,
                email: currentUser.email || 'usuário@exemplo.com',
                name: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Usuário'),
                role: 'resident',
                createdAt: Date.now()
              };
              
              // Criar perfil no Firestore
              await firebase.createUserProfile(currentUser.uid, basicProfile);
              console.log('Perfil básico criado para login silencioso, aguardando sincronização...');
              
              // Esperar a criação ser processada pelo Firestore
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Tentar recuperar o perfil novamente
              userProfile = await firebase.getUserProfile(currentUser.uid);
              
              // Se ainda não encontrou, tentar uma última vez
              if (!userProfile) {
                console.log('Perfil ainda não encontrado, última tentativa...');
                await new Promise(resolve => setTimeout(resolve, 1500));
                userProfile = await firebase.getUserProfile(currentUser.uid);
                
                // Se ainda não encontrou, usar os dados básicos
                if (!userProfile) {
                  console.log('Usando dados básicos como último recurso para login silencioso');
                  userProfile = basicProfile as User;
                }
              }
            }
            
            console.log('Login silencioso bem-sucedido:', userProfile.name);
            set({
              user: userProfile,
              isAuthenticated: true,
              lastLoggedInEmail: currentUser.email || null,
              error: null
            });
            return true;
          }
          
          // Tentar recuperar credenciais salvas
          const credentials = await getCredentials();
          if (!credentials) {
            console.log('Nenhuma credencial salva encontrada');
            return false;
          }
          
          console.log('Credenciais encontradas, tentando login automático');
          
          // Tentar autenticar com as credenciais
          const userCredential = await firebase.signInWithEmail(
            credentials.email,
            credentials.password
          );
          
          const firebaseUser = userCredential.user;
          console.log('Autenticação bem-sucedida com credenciais salvas, ID:', firebaseUser.uid);
          
          // Esperar sincronização
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Obter perfil do Firestore
          let userProfile = await firebase.getUserProfile(firebaseUser.uid);
          
          // Se não encontrou o perfil, criar um básico
          if (!userProfile) {
            console.log('Perfil não encontrado após login com credenciais salvas, criando perfil básico');
            
            // Criar dados básicos
            const basicProfile: Partial<User> = {
              id: firebaseUser.uid,
              email: firebaseUser.email || credentials.email,
              name: firebaseUser.displayName || credentials.email.split('@')[0] || 'Usuário',
              role: 'resident',
              createdAt: Date.now()
            };
            
            // Criar perfil no Firestore
            await firebase.createUserProfile(firebaseUser.uid, basicProfile);
            console.log('Perfil básico criado, aguardando sincronização...');
            
            // Esperar a criação ser processada
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Tentar recuperar o perfil novamente
            userProfile = await firebase.getUserProfile(firebaseUser.uid);
            
            // Se ainda não encontrou, tentar uma última vez
            if (!userProfile) {
              console.log('Perfil ainda não encontrado, última tentativa...');
              await new Promise(resolve => setTimeout(resolve, 1500));
              userProfile = await firebase.getUserProfile(firebaseUser.uid);
              
              // Se ainda não encontrou, usar os dados básicos
              if (!userProfile) {
                console.log('Usando dados básicos como último recurso');
                userProfile = basicProfile as User;
              }
            }
          }
          
          console.log('Login silencioso bem-sucedido:', userProfile.name);
          set({
            user: userProfile,
            isAuthenticated: true,
            lastLoggedInEmail: credentials.email,
            error: null
          });
          
          return true;
        } catch (error) {
          console.log('Falha no login silencioso:', error);
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        console.log('Rehydrate: Estado de autenticação carregado do AsyncStorage');
        // Não fazemos verificações ou modificações aqui para evitar loops
      },
    }
  )
);