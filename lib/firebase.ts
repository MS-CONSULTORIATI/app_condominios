import { initializeApp } from 'firebase/app';
import { 
  getAuth as firebaseGetAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  User as FirebaseUser,
  signInAnonymously as firebaseSignInAnonymously,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { 
  getMessaging, 
  getToken, 
  onMessage,
  isSupported
} from 'firebase/messaging';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { Platform } from 'react-native';
import { User, Topic, Problem, Suggestion, Resident, FirebaseNotification, Financial, LostAndFoundItem, TopicComment, News, NewsComment, SocialPost, SocialComment } from '@/types';
import * as FileSystem from 'expo-file-system';
import { createNotificationOnce } from './createNotification'; // Adicionar esta linha no topo do arquivo

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxIDBnM_owGB07qBSGb58fWek_5vJjPbc",
  authDomain: "app-condominio-facil.firebaseapp.com",
  projectId: "app-condominio-facil",
  storageBucket: "app-condominio-facil.firebasestorage.app",
  messagingSenderId: "1038650648816",
  appId: "1:1038650648816:web:c60bd21ed6b12a3e793a35"
};

// Exportar configuração para reuso
export { firebaseConfig };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = firebaseGetAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Exportar instâncias do Firebase
export { app, auth, db, storage };

// Initialize Firebase Cloud Messaging (only on web)
let messaging: any = null;

// Initialize FCM if supported (web only)
const initializeMessaging = async () => {
  if (Platform.OS === 'web') {
    try {
      const isFCMSupported = await isSupported();
      if (isFCMSupported) {
        messaging = getMessaging(app);
        console.log('Firebase Cloud Messaging initialized');
      }
    } catch (error) {
      console.error('Error initializing Firebase Cloud Messaging:', error);
    }
  }
};

// Call the initialization function
initializeMessaging();

// Request permission for notifications (web only)
export const requestNotificationPermission = async () => {
  if (Platform.OS !== 'web' || !messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BMlGigbVAWwCU_NrfF2YwBZMeHoG4SnAoAvNznCo-zxGplo7F6GY2zWTmS2gLqHfmCp_HT8nCM2Dr7yZUJ9CwNo' // Replace with your VAPID key
      });
      return token;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
  return null;
};

// Listen for FCM messages in the foreground
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (Platform.OS !== 'web' || !messaging) return () => {};
  
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

// Auth functions
export const getAuth = () => {
  return firebaseGetAuth(app);
};

export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signInAnonymously = () => {
  return firebaseSignInAnonymously(auth);
};

export const signInWithGoogle = async () => {
  if (Platform.OS === 'web') {
    return signInWithPopup(auth, googleProvider);
  } else {
    // For mobile, we need to use redirect and handle it differently
    // This is a simplified version - in a real app you'd need to use
    // the Firebase React Native SDK with proper mobile Google sign-in
    console.warn("Google Sign-In on mobile requires additional setup");
    throw new Error("Google Sign-In not implemented for mobile");
  }
};

export const handleRedirectResult = async () => {
  if (Platform.OS === 'web') {
    return getRedirectResult(auth);
  }
  return null;
};

export const signOut = () => {
  return firebaseSignOut(auth);
};

export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// User functions
export const createUserProfile = async (userId: string, userData: Partial<User>) => {
  console.log('Criando/atualizando perfil para o usuário:', userId, 'com dados:', userData);
  
  // Verificar se já existe um perfil para preservar dados existentes
  const existingProfile = await getUserProfile(userId);
  
  // Dados mínimos para um perfil válido (usando Record para permitir índices dinâmicos)
  const completeUserData: Record<string, any> = {
    id: userId,
    createdAt: userData.createdAt || (existingProfile ? existingProfile.createdAt : Date.now()),
    updatedAt: Date.now()
  };
  
  // IMPORTANTE: Preservar dados existentes do perfil se existirem
  if (existingProfile) {
    // Manter o nome existente, não substituir
    completeUserData.name = userData.name || existingProfile.name;
    completeUserData.email = userData.email || existingProfile.email;
    completeUserData.role = userData.role || existingProfile.role;
    
    // Preservar outros campos do perfil existente
    // Tratando existingProfile como Record<string, any> para resolver o erro do TypeScript
    const existingProfileRecord = existingProfile as unknown as Record<string, any>;
    Object.keys(existingProfileRecord).forEach(key => {
      if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && !completeUserData[key]) {
        completeUserData[key] = existingProfileRecord[key];
      }
    });
    
    console.log('Preservando dados existentes do perfil:', existingProfile.name);
  } else {
    // Apenas usar fallbacks se não houver perfil existente
    const currentUser = getAuth().currentUser;
    
    // Adicionar nome, se não fornecido
    if (!completeUserData.name && userData.name) {
      completeUserData.name = userData.name;
    } else if (!completeUserData.name && currentUser?.displayName) {
      completeUserData.name = currentUser.displayName;
    } else if (!completeUserData.name && currentUser?.email) {
      completeUserData.name = currentUser.email.split('@')[0];
    } else if (!completeUserData.name) {
      completeUserData.name = 'Usuário';
    }
    
    // Adicionar email, se não fornecido
    if (!completeUserData.email && userData.email) {
      completeUserData.email = userData.email;
    } else if (!completeUserData.email && currentUser?.email) {
      completeUserData.email = currentUser.email;
    }
    
    // Garantir que role esteja definido
    if (!completeUserData.role && userData.role) {
      completeUserData.role = userData.role;
    } else if (!completeUserData.role) {
      completeUserData.role = 'resident';
    }
  }
  
  // Aplicar quaisquer campos específicos fornecidos na atualização
  // Tratando userData como Record<string, any> para resolver o erro do TypeScript
  const userDataRecord = userData as unknown as Record<string, any>;
  Object.keys(userData).forEach(key => {
    if (userDataRecord[key] !== undefined && key !== 'id') {
      completeUserData[key] = userDataRecord[key];
    }
  });
  
  const userRef = doc(db, 'users', userId);
  
  try {
    await setDoc(userRef, completeUserData, { merge: true });
    console.log('Perfil criado/atualizado com sucesso. Nome definido como:', completeUserData.name);
    
    // Verificar se o perfil foi realmente criado/atualizado
    const verifySnap = await getDoc(userRef);
    if (verifySnap.exists()) {
      console.log('Verificação: perfil existe no Firestore após criação/atualização');
    } else {
      console.error('ALERTA: O perfil não foi encontrado após tentativa de criação/atualização');
    }
  } catch (error) {
    console.error('Erro ao criar/atualizar perfil do usuário:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
  console.log(`[Firebase] Buscando perfil do usuário ${userId} no Firestore...`);
  const userRef = doc(db, 'users', userId);
  
  try {
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      console.log(`[Firebase] Perfil encontrado para ${userId}, dados:`, userData);
      
      if (!userData.name || !userData.email || !userData.role) {
        console.warn(`[Firebase] Perfil incompleto para ${userId}:`, 
          `nome=${userData.name || 'não definido'}, ` +
          `email=${userData.email || 'não definido'}, ` +
          `role=${userData.role || 'não definido'}`
        );
      }
      
      // Garantir que os campos obrigatórios estejam presentes
      const profile = { 
        ...userData,
        id: userId,
      } as User;
      
      return profile;
    }
    
    console.log(`[Firebase] Nenhum perfil encontrado para o usuário ${userId}`);
    return null;
  } catch (error) {
    console.error(`[Firebase] Erro ao buscar perfil para ${userId}:`, error);
    return null;
  }
};

// Enhanced mock data for anonymous mode
const mockTopics: Topic[] = [
  {
    id: 'topic1',
    title: 'Manutenção da Piscina',
    description: 'Discussão sobre a manutenção e limpeza da piscina do condomínio. Precisamos definir um novo cronograma de limpeza e verificar orçamentos com empresas especializadas.',
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    createdBy: 'admin',
    status: 'active',
    priority: 'high'
  },
  {
    id: 'topic2',
    title: 'Reforma do Playground',
    description: 'Proposta para reforma e modernização da área de playground. Vários equipamentos estão danificados e precisamos tornar o espaço mais seguro para as crianças.',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    createdBy: 'admin',
    status: 'active',
    priority: 'medium'
  },
  {
    id: 'topic3',
    title: 'Assembleia Geral',
    description: 'Convocação para assembleia geral ordinária do condomínio. Serão discutidos temas como prestação de contas, eleição de síndico e conselho, e planejamento anual.',
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    createdBy: 'admin',
    status: 'active',
    priority: 'high'
  },
  {
    id: 'topic4',
    title: 'Regras de Uso do Salão de Festas',
    description: 'Revisão das regras de uso e reserva do salão de festas. Precisamos atualizar as normas para evitar conflitos entre moradores e garantir a conservação do espaço.',
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000, // 14 days ago
    createdBy: 'admin',
    status: 'archived',
    priority: 'low'
  },
  {
    id: 'topic5',
    title: 'Instalação de Câmeras de Segurança',
    description: 'Proposta para instalação de um sistema de câmeras de segurança em áreas comuns do condomínio para aumentar a segurança de todos os moradores.',
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    createdBy: 'admin',
    status: 'active',
    priority: 'high'
  },
  {
    id: 'topic6',
    title: 'Economia de Água',
    description: 'Discussão sobre medidas para redução do consumo de água no condomínio, incluindo instalação de sistemas de reuso e conscientização dos moradores.',
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
    createdBy: 'admin',
    status: 'active',
    priority: 'medium'
  }
];

// Topics functions
export const getTopics = async (): Promise<Topic[]> => {
  // For anonymous mode, return mock data
  if (auth.currentUser?.uid === 'anonymous-user' || !auth.currentUser) {
    // Add commentsCount to mockTopics
    return Promise.resolve(mockTopics.map(topic => ({
      ...topic,
      commentsCount: topic.comments ? topic.comments.length : 0
    })));
  }
  
  const topicsQuery = query(
    collection(db, 'topics'),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(topicsQuery);
  const topics = querySnapshot.docs.map(doc => {
    const topicData = doc.data();
    const commentsCount = topicData.comments ? topicData.comments.length : 0;
    
    return { 
      id: doc.id, 
      ...topicData,
      commentsCount
    } as Topic;
  });
  
  // Buscar dados dos usuários para cada tópico
  const topicsWithUserData = await Promise.all(
    topics.map(async (topic) => {
      if (typeof topic.createdBy === 'string') {
        try {
          const userProfile = await getUserProfile(topic.createdBy);
          if (userProfile) {
            return { ...topic, createdBy: userProfile };
          }
        } catch (error) {
          console.log('Error fetching user profile:', error);
        }
      }
      return topic;
    })
  );
  
  return topicsWithUserData;
};

export const getTopicById = async (topicId: string): Promise<Topic | null> => {
  // For anonymous mode, return mock data
  if (auth.currentUser?.uid === 'anonymous-user' || !auth.currentUser) {
    const mockTopic = mockTopics.find(topic => topic.id === topicId);
    if (mockTopic) {
      // Add commentsCount to the mock topic
      return Promise.resolve({
        ...mockTopic,
        commentsCount: mockTopic.comments ? mockTopic.comments.length : 0
      });
    }
    return Promise.resolve(null);
  }
  
  try {
    const topicRef = doc(db, 'topics', topicId);
    const topicSnap = await getDoc(topicRef);
    
    if (topicSnap.exists()) {
      const topicData = topicSnap.data() as Omit<Topic, 'id'>;
      const commentsCount = topicData.comments ? topicData.comments.length : 0;
      
      // Se o criador for um ID de usuário, recuperar dados do usuário
      let createdBy = topicData.createdBy;
      if (typeof createdBy === 'string') {
        try {
          const userProfile = await getUserProfile(createdBy);
          if (userProfile) {
            createdBy = userProfile;
          }
        } catch (error) {
          console.log('Error fetching user profile:', error);
        }
      }
      
      return { 
        id: topicSnap.id, 
        ...topicData, 
        createdBy,
        commentsCount
      } as Topic;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting topic:', error);
    return null;
  }
};

export const createTopic = async (topicData: Omit<Topic, 'id' | 'createdAt'>) => {
  try {
    // Salvamos as imagens e documentos originais para caso falhe o upload
    const originalImages = topicData.images || [];
    const originalDocuments = topicData.documents || [];
    
    console.log(`Criando tópico: "${topicData.title}" com ${originalImages.length} imagens e ${originalDocuments.length} documentos`);
    
    // Garantir que os campos relacionados à votação estejam inicializados corretamente
    const topicDataWithDefaults = {
      ...topicData,
      isVotingEnabled: topicData.isVotingEnabled || false,
      votingEndDate: topicData.votingEndDate || null,
      votes: topicData.votes || { yes: 0, no: 0, abstain: 0 },
      votedBy: topicData.votedBy || []
    };
    
    // Primeiro, criar o tópico para obter o ID
    const topicRef = await addDoc(collection(db, 'topics'), {
      ...topicDataWithDefaults,
      createdAt: Date.now(),
      images: [], // Inicialmente vazio, será atualizado após os uploads
      documents: [] // Inicialmente vazio, será atualizado após os uploads
    });
    
    const topicId = topicRef.id;
    console.log(`Tópico criado com ID: ${topicId}, iniciando uploads...`);
    
    const updatedData: Partial<Topic> = {};
    let hasUploadErrors = false;
    
    // Upload de imagens, se houver
    if (originalImages.length > 0) {
      console.log(`Iniciando upload de ${originalImages.length} imagens para o tópico ${topicId}`);
      
      try {
        const imagePromises = originalImages.map(imageUri => 
          uploadTopicImage(imageUri, topicId)
        );
        
        updatedData.images = await Promise.all(imagePromises);
        console.log(`Upload de imagens concluído para o tópico ${topicId}`);
      } catch (imageError) {
        console.error('Erro durante o upload de imagens:', imageError);
        // Em caso de erro, usar as URIs originais
        updatedData.images = originalImages;
        hasUploadErrors = true;
      }
    }
    
    // Upload de documentos, se houver
    if (originalDocuments.length > 0) {
      console.log(`Iniciando upload de ${originalDocuments.length} documentos para o tópico ${topicId}`);
      
      try {
        const documentPromises = originalDocuments.map(doc => 
          uploadTopicDocument(doc.uri, doc.name, topicId)
        );
        
        updatedData.documents = await Promise.all(documentPromises);
        console.log(`Upload de documentos concluído para o tópico ${topicId}`);
      } catch (docError) {
        console.error('Erro durante o upload de documentos:', docError);
        // Em caso de erro, usar os documentos originais
        updatedData.documents = originalDocuments;
        hasUploadErrors = true;
      }
    }
    
    // Atualizar o tópico com os URLs das imagens e documentos após o upload
    if (Object.keys(updatedData).length > 0) {
      await updateDoc(topicRef, updatedData);
      console.log(`Tópico ${topicId} atualizado com URLs de upload`);
    }
    
    // Create a notification for all users
    await createNotificationOnce(
      {
        title: 'Nova Pauta Criada',
        message: `Uma nova pauta "${topicData.title}" foi criada.`,
        type: 'topic',
        relatedItemId: topicId,
      },
      createNotification,
      topicData.createdBy as string
    );
    
    if (hasUploadErrors) {
      console.warn(`Tópico criado com sucesso, mas houve problemas no upload de alguns arquivos.`);
    } else {
      console.log(`Tópico ${topicId} criado com sucesso com todos os uploads.`);
    }
    
    return topicRef;
  } catch (error) {
    console.error('Erro ao criar tópico:', error);
    throw error;
  }
};

export const updateTopic = async (topicId: string, topicData: Partial<Topic>) => {
  const topicRef = doc(db, 'topics', topicId);
  return updateDoc(topicRef, topicData);
};

export const deleteTopic = async (topicId: string) => {
  const topicRef = doc(db, 'topics', topicId);
  return deleteDoc(topicRef);
};

export const addTopicComment = async (topicId: string, commentData: Omit<TopicComment, 'id'>) => {
  try {
    // Gerar um ID único para o comentário
    // Instead of crypto.randomUUID() which doesn't exist in React Native
    const commentId = `comment_${Date.now()}_${Math.floor(Math.random() * 1000000).toString()}`;
    
    // Referência do documento da pauta
    const topicRef = doc(db, 'topics', topicId);
    
    // Obter o documento atual
    const topicSnap = await getDoc(topicRef);
    
    if (!topicSnap.exists()) {
      throw new Error('Pauta não encontrada');
    }
    
    // Recuperar os comentários existentes ou inicializar um array vazio
    const topicData = topicSnap.data() as Topic;
    const comments = topicData.comments || [];
    
    // Adicionar o novo comentário com ID, garantindo que não haja campos undefined
    const newComment: TopicComment = {
      id: commentId,
      text: commentData.text || '',
      createdAt: commentData.createdAt || Date.now(),
      createdBy: commentData.createdBy || '',
      userName: commentData.userName || 'Usuário',
      userRole: commentData.userRole || 'resident',
      userUnit: commentData.userUnit || undefined // manter undefined se não existir
    };
    
    // Remove undefined fields
    const cleanComment = Object.fromEntries(
      Object.entries(newComment).filter(([_, value]) => value !== undefined)
    ) as TopicComment;
    
    // Atualizar o documento com o novo array de comentários
    await updateDoc(topicRef, {
      comments: [...comments, cleanComment]
    });
    
    return cleanComment;
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    throw error;
  }
};

// Mock data for problems
const mockProblems: Problem[] = [
  {
    id: 'problem1',
    title: 'Vazamento no 3º andar',
    description: 'Há um vazamento de água no corredor do 3º andar, próximo ao apartamento 302. A água está escorrendo pela parede e formando poças no chão.',
    location: 'Bloco A, 3º andar',
    status: 'pending',
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    createdBy: 'resident1',
  },
  {
    id: 'problem2',
    title: 'Lâmpada queimada na garagem',
    description: 'A lâmpada da vaga 15 na garagem está queimada há uma semana, dificultando o acesso ao veículo durante a noite.',
    location: 'Garagem, vaga 15',
    status: 'in_progress',
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    createdBy: 'resident2',
    assignedTo: 'maintenance1',
  },
  {
    id: 'problem3',
    title: 'Interfone com mau funcionamento',
    description: 'O interfone do apartamento 405 está com problemas, às vezes não toca quando alguém chama da portaria.',
    location: 'Bloco B, apartamento 405',
    status: 'pending',
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    createdBy: 'resident3',
  },
  {
    id: 'problem4',
    title: 'Portão da garagem travando',
    description: 'O portão da garagem está travando frequentemente, causando filas de carros e atrasos para os moradores.',
    location: 'Entrada da garagem',
    status: 'resolved',
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days ago
    createdBy: 'resident4',
  }
];

// Problems functions
export const getProblems = async (): Promise<Problem[]> => {
  // For anonymous mode, return mock data
  if (auth.currentUser?.uid === 'anonymous-user' || !auth.currentUser) {
    return Promise.resolve(mockProblems);
  }
  
  const problemsQuery = query(
    collection(db, 'problems'),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(problemsQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Problem));
};

export const createProblem = async (problemData: Omit<Problem, 'id' | 'createdAt'>) => {
  try {
    // Salvamos as imagens e documentos originais para caso falhe o upload
    const originalImages = problemData.images || [];
    const originalDocuments = problemData.documents || [];
    
    console.log(`Criando problema: "${problemData.title}" com ${originalImages.length} imagens e ${originalDocuments.length} documentos`);
    
    // Primeiro, criar o problema para obter o ID
  const problemRef = await addDoc(collection(db, 'problems'), {
    ...problemData,
    createdAt: Date.now(),
      images: [], // Inicialmente vazio, será atualizado após os uploads
      documents: [] // Inicialmente vazio, será atualizado após os uploads
    });
    
    const problemId = problemRef.id;
    console.log(`Problema criado com ID: ${problemId}, iniciando uploads...`);
    
    const updatedData: Partial<Problem> = {};
    let hasUploadErrors = false;
    
    // Upload de imagens, se houver
    if (originalImages.length > 0) {
      console.log(`Iniciando upload de ${originalImages.length} imagens para o problema ${problemId}`);
      
      try {
        const imagePromises = originalImages.map(imageUri => 
          uploadProblemImage(imageUri, problemId)
        );
        
        updatedData.images = await Promise.all(imagePromises);
        console.log(`Upload de imagens concluído para o problema ${problemId}`);
      } catch (imageError) {
        console.error('Erro durante o upload de imagens:', imageError);
        // Em caso de erro, usar as URIs originais
        updatedData.images = originalImages;
        hasUploadErrors = true;
      }
    }
    
    // Upload de documentos, se houver
    if (originalDocuments.length > 0) {
      console.log(`Iniciando upload de ${originalDocuments.length} documentos para o problema ${problemId}`);
      
      try {
        const documentPromises = originalDocuments.map(doc => 
          uploadProblemDocument(doc.uri, doc.name, problemId)
        );
        
        updatedData.documents = await Promise.all(documentPromises);
        console.log(`Upload de documentos concluído para o problema ${problemId}`);
      } catch (docError) {
        console.error('Erro durante o upload de documentos:', docError);
        // Em caso de erro, usar os documentos originais
        updatedData.documents = originalDocuments;
        hasUploadErrors = true;
      }
    }
    
    // Atualizar o problema com os URLs de download
    if (Object.keys(updatedData).length > 0) {
      try {
        await updateDoc(problemRef, updatedData);
        console.log(`Problema ${problemId} atualizado com sucesso com as URLs de upload`);
      } catch (updateError) {
        console.error('Erro ao atualizar problema com URLs:', updateError);
        hasUploadErrors = true;
      }
    }
  
  // Create a notification for all users
    try {
      await createNotificationOnce(
        {
          title: 'Novo Problema Reportado',
          message: `Um novo problema "${problemData.title}" foi reportado.`,
          type: 'problem',
          relatedItemId: problemId,
        },
        createNotification,
        problemData.createdBy as string
      );
    } catch (notificationError) {
      console.error('Erro ao criar notificação:', notificationError);
    }
    
    // Se houver erros de upload, ainda retornamos a referência do problema
    // mas também informamos sobre os erros
    if (hasUploadErrors) {
      console.warn(`Problema ${problemId} criado com erros de upload`);
    } else {
      console.log(`Problema ${problemId} criado e atualizado com sucesso`);
    }
  
  return problemRef;
  } catch (error) {
    console.error('Erro ao criar problema:', error);
    throw error;
  }
};

export const updateProblem = async (problemId: string, problemData: Partial<Problem>) => {
  try {
    const problemRef = doc(db, 'problems', problemId);
    
    // Verificar se há uma mudança de status
    if (problemData.status) {
      // Buscar o problema original para obter o status anterior
      const problemSnap = await getDoc(problemRef);
      
      if (problemSnap.exists()) {
        const originalProblem = problemSnap.data() as Problem;
        
        // Se o status foi alterado, notificar todos os usuários
        if (originalProblem.status !== problemData.status) {
          let statusText = '';
          switch (problemData.status) {
            case 'pending':
              statusText = 'Pendente';
              break;
            case 'in_progress':
              statusText = 'Em Andamento';
              break;
            case 'resolved':
              statusText = 'Resolvido';
              break;
          }
          
          // Notificar todos os usuários sobre a mudança de status
          await createNotification({
            title: 'Status do Problema Atualizado',
            message: `O status do problema "${originalProblem.title}" foi alterado para ${statusText}.`,
            type: 'problem',
            relatedItemId: problemId
          });
        }
      }
    }
    
    // Atualizar o documento
    return updateDoc(problemRef, problemData);
  } catch (error) {
    console.error('Erro ao atualizar problema:', error);
    throw error;
  }
};

export const deleteProblem = async (problemId: string) => {
  const problemRef = doc(db, 'problems', problemId);
  return deleteDoc(problemRef);
};

// Mock data for suggestions
const mockSuggestions: Suggestion[] = [
  {
    id: 'suggestion1',
    title: 'Instalação de bicicletário',
    description: 'Sugiro a instalação de um bicicletário na área comum para incentivar o uso de bicicletas e reduzir o uso de carros no condomínio.',
    status: 'pending',
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
    createdBy: 'resident3',
    votes: 8,
  },
  {
    id: 'suggestion2',
    title: 'Horta comunitária',
    description: 'Podemos criar uma horta comunitária no espaço vazio ao lado do playground. Isso promoveria interação entre moradores e alimentação saudável.',
    status: 'approved',
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000, // 20 days ago
    createdBy: 'resident4',
    votes: 15,
  },
  {
    id: 'suggestion3',
    title: 'Coleta seletiva de lixo',
    description: 'Implementação de um sistema eficiente de coleta seletiva, com lixeiras coloridas e orientação para os moradores sobre separação correta.',
    status: 'pending',
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    createdBy: 'resident5',
    votes: 12,
  },
  {
    id: 'suggestion4',
    title: 'Festa de confraternização',
    description: 'Organização de uma festa de confraternização entre os moradores para fortalecer os laços da comunidade do condomínio.',
    status: 'rejected',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    createdBy: 'resident6',
    votes: 5,
  }
];

// Suggestions functions
export const getSuggestions = async (): Promise<Suggestion[]> => {
  // For anonymous mode, return mock data
  if (auth.currentUser?.uid === 'anonymous-user' || !auth.currentUser) {
    return Promise.resolve(mockSuggestions);
  }
  
  const suggestionsQuery = query(
    collection(db, 'suggestions'),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(suggestionsQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Suggestion));
};

// Upload de imagem de sugestão para o Firebase Storage
export const uploadSuggestionImage = async (uri: string, suggestionId: string): Promise<string> => {
  try {
    console.log(`Iniciando upload da imagem: ${uri} para sugestão ${suggestionId}`);
    
    // Verificar se o URI é uma imagem local ou já é uma URL remota
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      console.log('A imagem já é uma URL remota, retornando diretamente:', uri);
      return uri;
    }
    
    // Gerar nome único para o arquivo
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;
    
    // Criar uma referência para o arquivo no Firebase Storage
    const imageRef = ref(storage, `documentos/sugestao/${suggestionId}/${fileName}`);
    
    try {
      if (Platform.OS === 'web') {
        // Para web, usar fetch para blob
        const response = await safeFetch(uri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
      } else if (Platform.OS === 'ios') {
        // Para iOS, verificar se arquivo existe e fazer upload
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        if (!fileInfo.exists) {
          console.warn(`Arquivo não encontrado: ${uri}`);
          return uri;
        }
        
          const response = await fetch(uri);
          const blob = await response.blob();
          await uploadBytes(imageRef, blob);
        } else {
        // Para Android, usar solução com arquivo temporário
        console.log('Android: Processando arquivo via FileSystem');
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        if (!fileInfo.exists) {
          console.warn(`Arquivo não encontrado: ${uri}`);
          return uri;
        }
        
        try {
          // Tentar usar fetch diretamente com o URI do arquivo
          console.log('Android: Tentando com fetch direto');
          const response = await fetch(uri);
          const blob = await response.blob();
          await uploadBytes(imageRef, blob);
        } catch (androidError) {
          console.error('Erro com fetch direto:', androidError);
          
          // Usar arquivo temporário como alternativa
          console.log('Android: Tentando solução alternativa com URL temporária');
          
          // Usar o sistema de arquivos temporários do React Native
          const tempUri = FileSystem.cacheDirectory + `temp_suggestion_${Date.now()}.jpg`;
          
          // Copiar o arquivo para o local temporário
          await FileSystem.copyAsync({
            from: uri,
            to: tempUri
          });
          
          // Verificar se o arquivo foi copiado com sucesso
          const tempFileInfo = await FileSystem.getInfoAsync(tempUri);
          if (!tempFileInfo.exists) {
            throw new Error('Falha ao criar arquivo temporário');
          }
          
          // Tentar novamente com o URI temporário
          const tempResponse = await fetch(tempUri);
          const tempBlob = await tempResponse.blob();
          await uploadBytes(imageRef, tempBlob);
          
          // Limpar o arquivo temporário
          await FileSystem.deleteAsync(tempUri, { idempotent: true });
        }
      }
      
      // Obter a URL de download
      const downloadURL = await getDownloadURL(imageRef);
      console.log(`Upload da imagem concluído com sucesso: ${downloadURL}`);
      
      return downloadURL;
    } catch (fetchError: any) {
      console.error('Erro durante o fetch ou upload da imagem:', fetchError);
      console.error('Detalhes adicionais:', JSON.stringify(fetchError, null, 2));
      
      // Em caso de falha, retornar a uri original
      console.log('Usando URI local como fallback:', uri);
      return uri;
    }
  } catch (error: any) {
    console.error('Erro ao fazer upload da imagem da sugestão:', error);
    console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
    
    // Retornar a URI original em caso de erro
    console.log('Usando URI local como fallback devido a erro no upload');
    return uri;
  }
};

// Upload de documento de sugestão para o Firebase Storage
export const uploadSuggestionDocument = async (uri: string, name: string, suggestionId: string): Promise<{name: string, uri: string}> => {
  try {
    console.log(`Iniciando upload do documento: ${name} para sugestão ${suggestionId}`);
    
    // Criar uma referência para o arquivo no Firebase Storage
    const filePath = `documentos/sugestao/${suggestionId}/${name}`;
    const docRef = ref(storage, filePath);
    
    try {
      // Buscar o documento
      const response = await safeFetch(uri);
      const blob = await response.blob();
      
      // Fazer o upload do blob para o Firebase Storage
      await uploadBytes(docRef, blob);
      
      // Obter a URL de download
      const downloadURL = await getDownloadURL(docRef);
      console.log(`Upload do documento concluído com sucesso: ${downloadURL}`);
      
      return {
        name: name,
        uri: downloadURL
      };
    } catch (fetchError) {
      console.error('Erro durante o fetch ou upload do documento:', fetchError);
      return {
        name: name,
        uri: uri
      };
    }
  } catch (error: any) {
    console.error('Erro ao fazer upload do documento da sugestão:', error);
    console.error('Detalhes do erro:', JSON.stringify(error));
    
    // Retornar o documento original em caso de erro
    return {
      name: name,
      uri: uri
    };
  }
};

export const createSuggestion = async (suggestionData: Omit<Suggestion, 'id' | 'createdAt'>) => {
  try {
    // Salvamos as imagens e documentos originais para caso falhe o upload
    const originalImages = suggestionData.images || [];
    const originalDocuments = suggestionData.documents || [];
    
    console.log(`Criando sugestão: "${suggestionData.title}" com ${originalImages.length} imagens e ${originalDocuments.length} documentos`);
    
    // Primeiro, criar a sugestão para obter o ID
  const suggestionRef = await addDoc(collection(db, 'suggestions'), {
    ...suggestionData,
    createdAt: Date.now(),
      images: [], // Inicialmente vazio, será atualizado após os uploads
      documents: [] // Inicialmente vazio, será atualizado após os uploads
    });
    
    const suggestionId = suggestionRef.id;
    console.log(`Sugestão criada com ID: ${suggestionId}, iniciando uploads...`);
    
    const updatedData: Partial<Suggestion> = {};
    let hasUploadErrors = false;
    
    // Upload de imagens, se houver
    if (originalImages.length > 0) {
      console.log(`Iniciando upload de ${originalImages.length} imagens para a sugestão ${suggestionId}`);
      
      try {
        const imagePromises = originalImages.map(imageUri => 
          uploadSuggestionImage(imageUri, suggestionId)
        );
        
        updatedData.images = await Promise.all(imagePromises);
        console.log(`Upload de imagens concluído para a sugestão ${suggestionId}`);
      } catch (imageError) {
        console.error('Erro durante o upload de imagens:', imageError);
        // Em caso de erro, usar as URIs originais
        updatedData.images = originalImages;
        hasUploadErrors = true;
      }
    }
    
    // Upload de documentos, se houver
    if (originalDocuments.length > 0) {
      console.log(`Iniciando upload de ${originalDocuments.length} documentos para a sugestão ${suggestionId}`);
      
      try {
        const documentPromises = originalDocuments.map(doc => 
          uploadSuggestionDocument(doc.uri, doc.name, suggestionId)
        );
        
        updatedData.documents = await Promise.all(documentPromises);
        console.log(`Upload de documentos concluído para a sugestão ${suggestionId}`);
      } catch (docError) {
        console.error('Erro durante o upload de documentos:', docError);
        // Em caso de erro, usar os documentos originais
        updatedData.documents = originalDocuments;
        hasUploadErrors = true;
      }
    }
    
    // Atualizar a sugestão com os URLs de download
    if (Object.keys(updatedData).length > 0) {
      try {
        await updateDoc(suggestionRef, updatedData);
        console.log(`Sugestão ${suggestionId} atualizada com sucesso com as URLs de upload`);
      } catch (updateError) {
        console.error('Erro ao atualizar sugestão com URLs:', updateError);
        hasUploadErrors = true;
      }
    }
  
  // Create a notification for all users
    try {
      await createNotificationOnce(
        {
          title: 'Nova Sugestão Enviada',
          message: `Uma nova sugestão "${suggestionData.title}" foi enviada.`,
          type: 'suggestion',
          relatedItemId: suggestionId,
        },
        createNotification,
        suggestionData.createdBy as string
      );
    } catch (notificationError) {
      console.error('Erro ao criar notificação:', notificationError);
    }
    
    // Se houver erros de upload, ainda retornamos a referência da sugestão
    // mas também informamos sobre os erros
    if (hasUploadErrors) {
      console.warn(`Sugestão ${suggestionId} criada com erros de upload`);
    } else {
      console.log(`Sugestão ${suggestionId} criada e atualizada com sucesso`);
    }
  
  return suggestionRef;
  } catch (error) {
    console.error('Erro ao criar sugestão:', error);
    throw error;
  }
};

export const updateSuggestion = async (suggestionId: string, suggestionData: Partial<Suggestion>) => {
  try {
    const suggestionRef = doc(db, 'suggestions', suggestionId);
    
    // Verificar se há uma mudança de status
    if (suggestionData.status) {
      // Buscar a sugestão original para obter o status anterior
      const suggestionSnap = await getDoc(suggestionRef);
      
      if (suggestionSnap.exists()) {
        const originalSuggestion = suggestionSnap.data() as Suggestion;
        
        // Se o status foi alterado, notificar todos os usuários
        if (originalSuggestion.status !== suggestionData.status) {
          let statusText = '';
          switch (suggestionData.status) {
            case 'pending':
              statusText = 'Pendente';
              break;
            case 'approved':
              statusText = 'Aprovada';
              break;
            case 'rejected':
              statusText = 'Rejeitada';
              break;
          }
          
          // Notificar todos os usuários sobre a mudança de status
          await createNotification({
            title: 'Status da Sugestão Atualizado',
            message: `O status da sugestão "${originalSuggestion.title}" foi alterado para ${statusText}.`,
            type: 'suggestion',
            relatedItemId: suggestionId
          });
        }
      }
    }
    
    // Atualizar o documento
    return updateDoc(suggestionRef, suggestionData);
  } catch (error) {
    console.error('Erro ao atualizar sugestão:', error);
    throw error;
  }
};

export const deleteSuggestion = async (suggestionId: string) => {
  const suggestionRef = doc(db, 'suggestions', suggestionId);
  return deleteDoc(suggestionRef);
};

// Enhanced mock data for residents
const mockResidents: Resident[] = [
  {
    id: 'resident1',
    name: 'João Silva',
    email: 'joao.silva@example.com',
    phone: '(11) 98765-4321',
    apartment: '101',
    block: 'A',
    isOwner: true,
    moveInDate: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
    createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'resident2',
    name: 'Maria Oliveira',
    email: 'maria.oliveira@example.com',
    phone: '(11) 91234-5678',
    apartment: '202',
    block: 'B',
    isOwner: false,
    moveInDate: Date.now() - 180 * 24 * 60 * 60 * 1000, // 6 months ago
    createdAt: Date.now() - 180 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'resident3',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@example.com',
    phone: '(11) 97777-8888',
    apartment: '303',
    block: 'A',
    isOwner: true,
    moveInDate: Date.now() - 90 * 24 * 60 * 60 * 1000, // 3 months ago
    createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'resident4',
    name: 'Ana Souza',
    email: 'ana.souza@example.com',
    phone: '(11) 96666-7777',
    apartment: '404',
    block: 'C',
    isOwner: false,
    moveInDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 1 month ago
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  }
];

// Residents functions
export const getResidents = async (): Promise<Resident[]> => {
  // For anonymous mode, return mock data
  if (auth.currentUser?.uid === 'anonymous-user' || !auth.currentUser) {
    return Promise.resolve(mockResidents);
  }
  
  const residentsQuery = query(
    collection(db, 'residents'),
    orderBy('name', 'asc')
  );
  
  const querySnapshot = await getDocs(residentsQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resident));
};

export const createResident = async (residentData: Omit<Resident, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, 'residents'), {
    ...residentData,
    createdAt: Date.now(),
  });
};

export const updateResident = async (residentId: string, residentData: Partial<Resident>) => {
  const residentRef = doc(db, 'residents', residentId);
  return updateDoc(residentRef, residentData);
};

export const deleteResident = async (residentId: string) => {
  const residentRef = doc(db, 'residents', residentId);
  return deleteDoc(residentRef);
};

// Mock users data
const mockUsers: User[] = [
  {
    id: 'user1',
    name: 'João Silva',
    email: 'joao.silva@example.com',
    role: 'resident',
    block: 'A',
    apartment: '101',
    phone: '(11) 98765-4321',
    createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'user2',
    name: 'Maria Oliveira',
    email: 'maria.oliveira@example.com',
    role: 'resident',
    block: 'B',
    apartment: '202',
    phone: '(11) 91234-5678',
    createdAt: Date.now() - 180 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'user3',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@example.com',
    role: 'manager',
    block: 'A',
    apartment: '303',
    phone: '(11) 97777-8888',
    createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'user4',
    name: 'Ana Souza',
    email: 'ana.souza@example.com',
    role: 'admin',
    block: 'C',
    apartment: '404',
    phone: '(11) 96666-7777',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  }
];

// Users functions
export const getUsers = async (): Promise<User[]> => {
  // For anonymous mode, return mock data
  if (auth.currentUser?.uid === 'anonymous-user' || !auth.currentUser) {
    return Promise.resolve(mockUsers);
  }
  
  const usersQuery = query(
    collection(db, 'users'),
    orderBy('name', 'asc')
  );
  
  const querySnapshot = await getDocs(usersQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const createUser = async (userData: { 
  name: string; 
  email: string; 
  password: string; 
  role: 'resident' | 'manager' | 'admin';
  phone?: string;
  cpf?: string;
  apartment?: string;
  block?: string;
}) => {
  // Create user in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
  const firebaseUser = userCredential.user;
  
  // Create user profile in Firestore
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userProfile = {
    id: firebaseUser.uid,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    phone: userData.phone || null,
    cpf: userData.cpf || null,
    apartment: userData.apartment || null,
    block: userData.block || null,
    createdAt: Date.now(),
  };
  
  await setDoc(userRef, userProfile);
  
  return userProfile;
};

export const updateUser = async (userId: string, userData: Partial<User>) => {
  const userRef = doc(db, 'users', userId);
  
  try {
    // Primeiro, obter o perfil atual para verificar se existe
    const currentProfileSnap = await getDoc(userRef);
    
    if (currentProfileSnap.exists()) {
      // Se o documento existe, atualize-o com os novos dados
      await updateDoc(userRef, {
        ...userData,
        updatedAt: Date.now() // Adicionar campo de atualização
      });
      
      console.log(`Perfil atualizado com sucesso para o usuário ${userId}`);
    } else {
      // Se não existe, criar um novo documento
      console.log(`Perfil não encontrado para o usuário ${userId}, criando novo`);
      await setDoc(userRef, {
        ...userData,
        id: userId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    
    // Retornar o perfil atualizado
    return getUserProfile(userId);
  } catch (error) {
    console.error(`Erro ao atualizar perfil do usuário ${userId}:`, error);
    throw error;
  }
};

export const deleteUser = async (userId: string) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For mock purposes, remove from the mock array
  const userIndex = mockUsers.findIndex(user => user.id === userId);
  if (userIndex !== -1) {
    mockUsers.splice(userIndex, 1);
  }
  
  return true;
};

// Firebase Notifications
export const createNotification = async (notificationData: Omit<FirebaseNotification, 'id' | 'createdAt' | 'read'>, creatorUserId?: string) => {
  try {
    console.log(`[Notificação] Criando notificação: "${notificationData.title}" - criador: ${creatorUserId || 'não especificado'}`);
    
    // Add to Firestore notifications collection
    const notificationRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      createdAt: Date.now(),
      read: false,
      creatorUserId: creatorUserId || null, // Armazenar o criador como metadado da notificação
    });
    
    console.log(`[Notificação] Notificação adicionada ao Firestore com ID: ${notificationRef.id}`);

    // Verificar se a notificação é direcionada a um usuário específico
    if (notificationData.targetUserId) {
      console.log(`[Notificação] Enviando notificação específica para usuário: ${notificationData.targetUserId}`);
      
      // Não enviar se o alvo for o próprio criador
      if (notificationData.targetUserId === creatorUserId) {
        console.log(`[Notificação] Ignorando notificação para o criador (mesmo usuário)`);
        return notificationRef;
      }
      
      // Enviar notificação push apenas para o usuário específico
      await sendPushNotificationToSpecificUser(
        notificationData.targetUserId,
        notificationData.title, 
        notificationData.message
      );
    } else {
      console.log(`[Notificação] Enviando notificação para todos os usuários, exceto criador: ${creatorUserId || 'não especificado'}`);
      
      // Enviar notificação push para todos os usuários, exceto o criador
      await sendPushNotificationToAllUsers(
        notificationData.title, 
        notificationData.message, 
        creatorUserId
      );
    }
    
    return notificationRef;
  } catch (error) {
    console.error('[Notificação] Erro ao criar notificação:', error);
    // Em caso de erro, ainda retornamos uma referência para que o código cliente não falhe
    return null;
  }
};

// Função para enviar notificação push para um usuário específico
export const sendPushNotificationToSpecificUser = async (userId: string, title: string, message: string) => {
  try {
    console.log(`[Push] Enviando notificação específica para usuário: ${userId}`);
    
    // Obter o documento do usuário
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      console.log(`[Push] Usuário ${userId} não encontrado`);
      return;
    }
    
    const userData = userDoc.data();
    const pushToken = userData.pushToken;
    
    if (!pushToken) {
      console.log(`[Push] Usuário ${userId} não tem token de push`);
      return;
    }
    
    console.log(`[Push] Token encontrado para usuário ${userId}: ${pushToken.substring(0, 15)}...`);
    
    // Determinar tipo de token (Expo ou FCM)
    if (pushToken.startsWith('ExponentPushToken')) {
      // Token Expo, enviar via API Expo
      try {
        console.log(`[Push] Enviando via Expo para token: ${pushToken.substring(0, 15)}...`);
        const messagePayload = {
          to: pushToken,
          sound: 'default',
          title: title,
          body: message,
          data: { title, message },
        };
        
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messagePayload),
        });
        
        const result = await response.json();
        console.log('[Push] Resposta do serviço Expo Push:', result);
      } catch (error) {
        console.error('[Push] Erro ao enviar notificação Expo específica:', error);
      }
    } else {
      // Token FCM, enviar via Cloud Function
      try {
        console.log(`[Push] Enviando via FCM para token: ${pushToken.substring(0, 15)}...`);
        await addDoc(collection(db, 'pendingNotifications'), {
          title,
          message,
          tokens: [pushToken],
          type: 'fcm',
          createdAt: Date.now(),
          processed: false
        });
        
        console.log(`[Push] Token FCM do usuário ${userId} armazenado para processamento pela Cloud Function`);
      } catch (error) {
        console.error('[Push] Erro ao armazenar notificação FCM específica:', error);
      }
    }
  } catch (error) {
    console.error('[Push] Erro ao enviar notificação direcionada:', error);
  }
};

// Função para enviar notificação push para todos os usuários
export const sendPushNotificationToAllUsers = async (title: string, message: string, excludeUserId?: string) => {
  try {
    console.log(`[Push] Iniciando envio para todos os usuários. Título: "${title}". Excluindo usuário: ${excludeUserId || 'nenhum'}`);
    
    // Obter todos os usuários
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    // Arrays para armazenar tokens e IDs dos usuários
    const pushTokens: string[] = [];
    const expoTokens: string[] = [];
    const fcmTokens: string[] = [];
    const includedUserIds: string[] = []; // Para logging/debug
    
    // Contador para depuração
    let totalUsers = 0;
    let skippedUsers = 0;
    let usersWithToken = 0;
    
    usersSnapshot.forEach((doc) => {
      totalUsers++;
      const userData = doc.data();
      const userId = doc.id;
      
      // Verificar explicitamente se o usuário deve ser excluído
      if (excludeUserId && userId === excludeUserId) {
        console.log(`[Push] Excluindo usuário: ${userId} (criador da notificação)`);
        skippedUsers++;
        return; // Skip this user
      }
      
      // Verificar se o usuário tem um token de push
      if (!userData.pushToken) {
        console.log(`[Push] Usuário ${userId} não tem token de push`);
        skippedUsers++;
        return; // Skip this user
      }
      
      // Adicionar o token aos arrays apropriados
      usersWithToken++;
      includedUserIds.push(userId);
      
      // Determinar o tipo de token
      const pushToken = userData.pushToken;
      pushTokens.push(pushToken);
      
      if (pushToken.startsWith('ExponentPushToken')) {
        expoTokens.push(pushToken);
      } else {
        fcmTokens.push(pushToken);
      }
    });
    
    console.log(`[Push] Estatísticas: Total=${totalUsers}, Com Token=${usersWithToken}, Ignorados=${skippedUsers}`);
    console.log(`[Push] Usuários incluídos: ${includedUserIds.join(', ')}`);
    console.log(`[Push] Tokens encontrados: ${pushTokens.length} total (${expoTokens.length} Expo, ${fcmTokens.length} FCM)`);
    
    // Se não houver tokens, sair da função
    if (pushTokens.length === 0) {
      console.log('[Push] Nenhum token válido encontrado, abortando envio');
      return;
    }
    
    // 1. Para tokens FCM, usar Cloud Function armazenando no Firestore
    if (fcmTokens.length > 0) {
      try {
        console.log(`[Push] Enviando ${fcmTokens.length} notificações via FCM`);
        
        // Criar registro em 'pendingNotifications' que será processado pela Cloud Function
        const pendingNotifRef = await addDoc(collection(db, 'pendingNotifications'), {
          title,
          message,
          tokens: fcmTokens,
          type: 'fcm',
          createdAt: Date.now(),
          processed: false
        });
        
        console.log(`[Push] ${fcmTokens.length} tokens FCM armazenados para processamento pela Cloud Function (ID: ${pendingNotifRef.id})`);
      } catch (error) {
        console.error('[Push] Erro ao armazenar notificações FCM:', error);
      }
    }
    
    // 2. Para tokens Expo, enviar diretamente via API Expo
    if (expoTokens.length > 0) {
      try {
        console.log(`[Push] Enviando ${expoTokens.length} notificações via Expo`);
        
        // Preparar mensagens para o serviço Expo
        const messages = expoTokens.map(token => ({
          to: token,
          sound: 'default',
          title: title,
          body: message,
          data: { title, message },
        }));
        
        // Enviar em lotes para evitar limites da API
        const chunks = [];
        const chunkSize = 100; // Expo limita a 100 mensagens por requisição
        
        for (let i = 0; i < messages.length; i += chunkSize) {
          chunks.push(messages.slice(i, i + chunkSize));
        }
        
        console.log(`[Push] Enviando ${chunks.length} lotes de notificações Expo`);
        
        // Enviar cada lote
        await Promise.all(
          chunks.map(async (chunk, index) => {
            try {
              console.log(`[Push] Enviando lote ${index + 1}/${chunks.length} com ${chunk.length} mensagens`);
              
              const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(chunk),
              });
              
              const result = await response.json();
              console.log(`[Push] Resposta do serviço Expo Push para lote ${index + 1}:`, result);
            } catch (error) {
              console.error(`[Push] Erro ao enviar lote ${index + 1} de notificações Expo:`, error);
            }
          })
        );
        
        console.log(`[Push] ${expoTokens.length} notificações Expo enviadas com sucesso`);
      } catch (error) {
        console.error('[Push] Erro ao processar notificações Expo:', error);
      }
    }
    
    console.log(`[Push] Processo de envio de notificações para todos os usuários concluído`);
  } catch (error) {
    console.error('[Push] Erro ao enviar notificações push:', error);
  }
};

export const getNotifications = async (userId: string): Promise<FirebaseNotification[]> => {
  // For anonymous mode, return empty array
  if (auth.currentUser?.uid === 'anonymous-user' || !auth.currentUser) {
    return Promise.resolve([]);
  }
  
  // Get all notifications (in a real app, you'd filter by user or user groups)
  const notificationsQuery = query(
    collection(db, 'notifications'),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(notificationsQuery);
  return querySnapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as FirebaseNotification));
};

export const markNotificationAsRead = async (notificationId: string) => {
  const notificationRef = doc(db, 'notifications', notificationId);
  return updateDoc(notificationRef, { read: true });
};

export const deleteNotification = async (notificationId: string) => {
  const notificationRef = doc(db, 'notifications', notificationId);
  return deleteDoc(notificationRef);
};

export const subscribeToNotifications = (callback: (notifications: FirebaseNotification[]) => void) => {
  // For anonymous mode, don't subscribe
  if (auth.currentUser?.uid === 'anonymous-user' || !auth.currentUser) {
    return () => {};
  }
  
  const notificationsQuery = query(
    collection(db, 'notifications'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(notificationsQuery, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as FirebaseNotification));
    
    callback(notifications);
  });
};

// Upload da imagem de avatar para o Firebase Storage (versão de depuração)
export const uploadAvatar = async (uri: string, userId: string): Promise<string> => {
  try {
    console.log(`[UPLOAD] Iniciando upload do avatar para o usuário ${userId}`);
    
    // Verificar se o usuário está autenticado
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuário não está autenticado. Faça login para fazer upload do avatar.');
    }
    
    // Verificar se o URI é uma URL remota
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      console.log('[UPLOAD] O avatar já é uma URL remota, retornando diretamente.');
      return uri;
    }
    
    // Gerar nome único para o arquivo
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;
    
    // IMPORTANTE: Usar um caminho mais simples para testar se é um problema de permissão específica
    // em vez de usar avatars/userId/..., usar um caminho na raiz temporariamente
    const destinationPath = `avatars/${fileName}`;
    
    console.log('[UPLOAD] Caminho de destino:', destinationPath);
    
    // Verificar se o arquivo existe
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      console.log('[UPLOAD] Arquivo não encontrado:', uri);
      throw new Error('Arquivo não encontrado');
    }
    
    console.log(`[UPLOAD] Arquivo encontrado, tamanho: ${fileInfo.size} bytes, iniciando upload...`);
    
    // Método de upload baseado na plataforma
    if (Platform.OS === 'web') {
      // Para web, usar o SDK JavaScript normal
      console.log('[UPLOAD] Web: Usando SDK JavaScript para upload');
      const imageRef = ref(storage, destinationPath);
      const response = await fetch(uri);
      const blob = await response.blob();
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      
      // Atualizar perfil do usuário
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { photoURL: downloadURL });
      
      return downloadURL;
    } else {
      // Testar se o usuário consegue salvar no caminho público
      console.log('[UPLOAD] Mobile: Testando upload para caminho público...');
      
      try {
        // Método mais simples e direto
        const imageRef = ref(storage, destinationPath);
        console.log('[UPLOAD] Referência criada para', destinationPath);
        
        // Ler o arquivo como blob
        const response = await fetch(uri);
        const blob = await response.blob();
        console.log('[UPLOAD] Blob criado, tamanho:', blob.size);
        
        // Upload direto
        console.log('[UPLOAD] Iniciando upload direto...');
        await uploadBytes(imageRef, blob);
        
        // Obter URL
        const downloadURL = await getDownloadURL(imageRef);
        console.log('[UPLOAD] Upload bem-sucedido! URL:', downloadURL);
        
        // Atualizar perfil do usuário
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { photoURL: downloadURL });
        
        return downloadURL;
      } catch (uploadError: any) {
        console.error('[UPLOAD] Erro no upload para caminho público:', uploadError?.message || uploadError);
        
        // Se o erro for de permissão, tentar uma imagem estática muito pequena
        if (uploadError?.code === 'storage/unauthorized') {
          console.log('[UPLOAD] Erro de permissão detectado, tentando método alternativo...');
          
          // Usar uma imagem estática muito pequena (1x1 pixel transparente)
          const tinyImageRef = ref(storage, 'public/tiny-avatar.png');
          
          try {
            // Tenta obter URL de uma imagem que já existe no storage
            const tinyURL = await getDownloadURL(tinyImageRef);
            console.log('[UPLOAD] Usando imagem estática:', tinyURL);
            
            // Atualizar perfil do usuário com a URL estática
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { photoURL: tinyURL });
            
            // Informar o usuário sobre o problema
            console.warn('[UPLOAD] Upload de avatar falhou devido a permissões. Usando avatar padrão.');
            
            return tinyURL;
          } catch (error: any) {
            // Corrigido o tipo de 'finalError' para 'error: any'
            console.error('[UPLOAD] Falha ao usar imagem estática:', error?.message || String(error));
            
            // Se tudo falhar, retornar uma URL pública de um avatar de placeholder
            const placeholderURL = 'https://via.placeholder.com/150';
            
            // Atualizar perfil do usuário com o placeholder
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { photoURL: placeholderURL });
            
            return placeholderURL;
          }
        } else {
          // Se for outro tipo de erro, relançar
          throw uploadError;
        }
      }
    }
  } catch (error: any) {
    console.error('[UPLOAD] Erro ao fazer upload do avatar:', error?.message || String(error));
    throw error;
  }
};

// Convertendo http para https se necessário para evitar problemas de segurança
const ensureHttps = (url: string): string => {
  return url.replace(/^http:\/\//i, 'https://');
};

// Função para tratar o fetch com segurança
const safeFetch = async (uri: string): Promise<Response> => {
  try {
    const safeUri = ensureHttps(uri);
    console.log(`Fazendo fetch de: ${safeUri}`);
    
    // Adicionar um timeout de 30 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(safeUri, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error(`Erro no fetch: ${error}`);
    throw error;
  }
};

// Upload de imagem de problema para o Firebase Storage
export const uploadProblemImage = async (uri: string, problemId: string): Promise<string> => {
  try {
    console.log(`Iniciando upload da imagem: ${uri} para problema ${problemId}`);
    
    // Verificar se o URI é uma imagem local ou já é uma URL remota
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      console.log('A imagem já é uma URL remota, retornando diretamente:', uri);
      return uri;
    }
    
    // Gerar nome único para o arquivo
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;
    
    // Criar uma referência para o arquivo no Firebase Storage
    const imageRef = ref(storage, `documentos/problemas/${problemId}/${fileName}`);
    
    try {
      if (Platform.OS === 'web') {
        // Para web, usar fetch para blob
        const response = await safeFetch(uri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
      } else if (Platform.OS === 'ios') {
        // Para iOS, verificar se arquivo existe e fazer upload
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        if (!fileInfo.exists) {
          console.warn(`Arquivo não encontrado: ${uri}`);
          return uri;
        }
        
          const response = await fetch(uri);
          const blob = await response.blob();
          await uploadBytes(imageRef, blob);
        } else {
        // Para Android, usar solução com arquivo temporário
        console.log('Android: Processando arquivo via FileSystem');
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        if (!fileInfo.exists) {
          console.warn(`Arquivo não encontrado: ${uri}`);
          return uri;
        }
        
        try {
          // Tentar usar fetch diretamente com o URI do arquivo
          console.log('Android: Tentando com fetch direto');
          const response = await fetch(uri);
          const blob = await response.blob();
          await uploadBytes(imageRef, blob);
        } catch (androidError) {
          console.error('Erro com fetch direto:', androidError);
          
          // Usar arquivo temporário como alternativa
          console.log('Android: Tentando solução alternativa com URL temporária');
          
          // Usar o sistema de arquivos temporários do React Native
          const tempUri = FileSystem.cacheDirectory + `temp_problem_${Date.now()}.jpg`;
          
          // Copiar o arquivo para o local temporário
          await FileSystem.copyAsync({
            from: uri,
            to: tempUri
          });
          
          // Verificar se o arquivo foi copiado com sucesso
          const tempFileInfo = await FileSystem.getInfoAsync(tempUri);
          if (!tempFileInfo.exists) {
            throw new Error('Falha ao criar arquivo temporário');
          }
          
          // Tentar novamente com o URI temporário
          const tempResponse = await fetch(tempUri);
          const tempBlob = await tempResponse.blob();
          await uploadBytes(imageRef, tempBlob);
          
          // Limpar o arquivo temporário
          await FileSystem.deleteAsync(tempUri, { idempotent: true });
        }
      }
      
      // Obter a URL de download
      const downloadURL = await getDownloadURL(imageRef);
      console.log(`Upload da imagem concluído com sucesso: ${downloadURL}`);
      
      return downloadURL;
    } catch (fetchError) {
      console.error('Erro durante o fetch ou upload da imagem:', fetchError);
      console.error('Detalhes adicionais:', JSON.stringify(fetchError, null, 2));
      
      // Em caso de falha, retornar a uri original
      console.log('Usando URI local como fallback:', uri);
      return uri;
    }
  } catch (error: any) {
    console.error('Erro ao fazer upload da imagem do problema:', error);
    console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
    
    // Retornar a URI original em caso de erro
    console.log('Usando URI local como fallback devido a erro no upload');
    return uri;
  }
};

// Upload de documento de problema para o Firebase Storage
export const uploadProblemDocument = async (uri: string, name: string, problemId: string): Promise<{name: string, uri: string}> => {
  try {
    console.log(`Iniciando upload do documento: ${name} para problema ${problemId}`);
    
    // Criar uma referência para o arquivo no Firebase Storage
    const filePath = `documentos/problemas/${problemId}/${name}`;
    const docRef = ref(storage, filePath);
    
    try {
      // Buscar o documento
      const response = await safeFetch(uri);
      const blob = await response.blob();
      
      // Fazer o upload do blob para o Firebase Storage
      await uploadBytes(docRef, blob);
      
      // Obter a URL de download
      const downloadURL = await getDownloadURL(docRef);
      console.log(`Upload do documento concluído com sucesso: ${downloadURL}`);
      
      return {
        name: name,
        uri: downloadURL
      };
    } catch (fetchError) {
      console.error('Erro durante o fetch ou upload do documento:', fetchError);
      return {
        name: name,
        uri: uri
      };
    }
  } catch (error: any) {
    console.error('Erro ao fazer upload do documento do problema:', error);
    console.error('Detalhes do erro:', JSON.stringify(error));
    
    // Retornar o documento original em caso de erro
    return {
      name: name,
      uri: uri
    };
  }
};

// Função para obter a URL do avatar de um usuário
export const getAvatarURL = async (userId: string): Promise<string | null> => {
  try {
    console.log(`Buscando avatar do usuário ${userId}`);
    
    // Tentar na nova estrutura (pasta com subpasta por usuário)
    try {
      const newAvatarRef = ref(storage, `avatars/${userId}`);
      const downloadURL = await getDownloadURL(newAvatarRef);
      console.log(`Avatar encontrado para o usuário ${userId}: ${downloadURL}`);
      return downloadURL;
    } catch (e) {
      console.log(`Erro ao buscar avatar para ${userId}:`, e);
      return null;
    }
  } catch (error) {
    console.error(`Erro ao buscar avatar para ${userId}:`, error);
    return null;
  }
};

export const updateUserProfile = async (userId: string, userData: Partial<User>) => {
  const userRef = doc(db, 'users', userId);
  
  try {
    // Primeiro, obter o perfil atual para verificar se existe
    const currentProfileSnap = await getDoc(userRef);
    
    if (currentProfileSnap.exists()) {
      // Se o documento existe, atualize-o com os novos dados
      await updateDoc(userRef, {
        ...userData,
        updatedAt: Date.now() // Adicionar campo de atualização
      });
      
      console.log(`Perfil atualizado com sucesso para o usuário ${userId}`);
    } else {
      // Se não existe, criar um novo documento
      console.log(`Perfil não encontrado para o usuário ${userId}, criando novo`);
      await setDoc(userRef, {
        ...userData,
        id: userId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    
    // Retornar o perfil atualizado
    return getUserProfile(userId);
  } catch (error) {
    console.error(`Erro ao atualizar perfil do usuário ${userId}:`, error);
    throw error;
  }
};

// Função para upload de imagens para tópicos (pautas)
export const uploadTopicImage = async (uri: string, topicId: string): Promise<string> => {
  try {
    // Nome único do arquivo
    const filename = `image_${Date.now()}.jpg`;
    const storageRef = ref(storage, `documentos/pautas/${topicId}/images/${filename}`);
    
    if (Platform.OS === 'web') {
      // Web - Usar fetch para blob
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
      } catch (error) {
        console.warn("Erro no upload da imagem web:", error);
        return uri;
      }
    } else if (Platform.OS === 'ios') {
      // iOS - Converter URI para blob
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          
          if (!fileInfo.exists) {
            console.warn("Arquivo de imagem não existe, usando URI original");
            return uri;
          }
          
          const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        } catch (error) {
        console.warn("Erro no upload da imagem iOS:", error);
        return uri;
      }
    } else {
      // Android - Usar solução com arquivo temporário
      try {
        console.log('Android: Processando arquivo via FileSystem');
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        if (!fileInfo.exists) {
          console.warn(`Arquivo não encontrado: ${uri}`);
        return uri;
      }
      
      try {
          // Tentar usar fetch diretamente com o URI do arquivo
          console.log('Android: Tentando com fetch direto');
        const response = await fetch(uri);
        const blob = await response.blob();
          await uploadBytes(storageRef, blob);
        } catch (androidError) {
          console.error('Erro com fetch direto:', androidError);
          
          // Usar arquivo temporário como alternativa
          console.log('Android: Tentando solução alternativa com URL temporária');
          
          // Usar o sistema de arquivos temporários do React Native
          const tempUri = FileSystem.cacheDirectory + `temp_topic_${Date.now()}.jpg`;
          
          // Copiar o arquivo para o local temporário
          await FileSystem.copyAsync({
            from: uri,
            to: tempUri
          });
          
          // Verificar se o arquivo foi copiado com sucesso
          const tempFileInfo = await FileSystem.getInfoAsync(tempUri);
          if (!tempFileInfo.exists) {
            throw new Error('Falha ao criar arquivo temporário');
          }
          
          // Tentar novamente com o URI temporário
          const tempResponse = await fetch(tempUri);
          const tempBlob = await tempResponse.blob();
          await uploadBytes(storageRef, tempBlob);
          
          // Limpar o arquivo temporário
          await FileSystem.deleteAsync(tempUri, { idempotent: true });
        }
      } catch (error) {
        console.warn("Erro no upload da imagem Android:", error);
        return uri;
      }
    }
    
    // Obter URL para download
    try {
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.warn("Erro ao obter URL de download da imagem:", error);
      return uri;
    }
  } catch (error) {
    console.error('Erro ao fazer upload da imagem do tópico:', error);
    // Retornar a URI original em vez de lançar erro
    return uri;
  }
};

// Função para upload de documentos para tópicos (pautas)
export const uploadTopicDocument = async (uri: string, name: string, topicId: string): Promise<{name: string, uri: string}> => {
  try {
    // Garantir que o nome do arquivo tenha a extensão correta
    const extension = name.split('.').pop() || 'pdf';
    const filename = `document_${Date.now()}.${extension}`;
    const storageRef = ref(storage, `documentos/pautas/${topicId}/documents/${filename}`);
    
    if (Platform.OS === 'web') {
      // Web - Usar fetch para blob
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
      } catch (error) {
        console.warn("Erro no upload do documento web:", error);
        return { name, uri };
      }
    } else if (Platform.OS === 'ios') {
      // iOS - Converter URI para blob
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          
          if (!fileInfo.exists) {
            console.warn("Arquivo de documento não existe");
          return { name, uri };
          }
          
          const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        } catch (error) {
        console.warn("Erro no upload do documento iOS:", error);
        return { name, uri };
      }
    } else {
      // Android - Usar solução com arquivo temporário
      try {
        console.log('Android: Processando documento via FileSystem');
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        if (!fileInfo.exists) {
          console.warn(`Arquivo não encontrado: ${uri}`);
        return { name, uri };
      }
      
      try {
          // Tentar usar fetch diretamente com o URI do arquivo
          console.log('Android: Tentando com fetch direto');
        const response = await fetch(uri);
        const blob = await response.blob();
          await uploadBytes(storageRef, blob);
        } catch (androidError) {
          console.error('Erro com fetch direto:', androidError);
          
          // Usar arquivo temporário como alternativa
          console.log('Android: Tentando solução alternativa com URL temporária');
          
          // Usar o sistema de arquivos temporários do React Native
          const tempUri = FileSystem.cacheDirectory + `temp_doc_${Date.now()}.${extension}`;
          
          // Copiar o arquivo para o local temporário
          await FileSystem.copyAsync({
            from: uri,
            to: tempUri
          });
          
          // Verificar se o arquivo foi copiado com sucesso
          const tempFileInfo = await FileSystem.getInfoAsync(tempUri);
          if (!tempFileInfo.exists) {
            throw new Error('Falha ao criar arquivo temporário');
          }
          
          // Tentar novamente com o URI temporário
          const tempResponse = await fetch(tempUri);
          const tempBlob = await tempResponse.blob();
          await uploadBytes(storageRef, tempBlob);
          
          // Limpar o arquivo temporário
          await FileSystem.deleteAsync(tempUri, { idempotent: true });
        }
      } catch (error) {
        console.warn("Erro no upload do documento Android:", error);
        return { name, uri };
      }
    }
    
    // Obter URL para download
    try {
      const downloadURL = await getDownloadURL(storageRef);
      return { name, uri: downloadURL };
    } catch (error) {
      console.warn("Erro ao obter URL de download do documento:", error);
      return { name, uri };
    }
  } catch (error) {
    console.error('Erro ao fazer upload do documento do tópico:', error);
    // Retornar o documento original em vez de lançar erro
    return { name, uri };
  }
};

// Função para votar em uma pauta
export const voteOnTopic = async (topicId: string, userId: string, vote: 'yes' | 'no' | 'abstain') => {
  try {
    // Primeiro, verificar se o tópico existe e se a votação está ativa
    const topicRef = doc(db, 'topics', topicId);
    const topicSnap = await getDoc(topicRef);
    
    if (!topicSnap.exists()) {
      throw new Error('Pauta não encontrada');
    }
    
    const topicData = topicSnap.data() as Topic;
    
    // Verificar se a votação está ativa
    if (!topicData.isVotingEnabled) {
      throw new Error('Votação não está habilitada para esta pauta');
    }
    
    // Verificar se a votação ainda está aberta
    const now = Date.now();
    if (topicData.votingEndDate && topicData.votingEndDate < now) {
      throw new Error('Votação encerrada');
    }
    
    // Verificar se o usuário já votou
    const hasVoted = topicData.votedBy?.some(v => v.userId === userId);
    if (hasVoted) {
      throw new Error('Você já votou nesta pauta');
    }
    
    // Atualizar contagem de votos
    const votes = topicData.votes || { yes: 0, no: 0, abstain: 0 };
    votes[vote]++;
    
    // Adicionar usuário à lista de votantes
    const votedBy = topicData.votedBy || [];
    votedBy.push({
      userId,
      vote,
      votedAt: now
    });
    
    // Atualizar o documento
    await updateDoc(topicRef, {
      votes,
      votedBy
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao votar na pauta:', error);
    throw error;
  }
};

// Função para verificar status de votação
export const getTopicVotingStatus = async (topicId: string, userId: string) => {
  try {
    const topicRef = doc(db, 'topics', topicId);
    const topicSnap = await getDoc(topicRef);
    
    if (!topicSnap.exists()) {
      throw new Error('Pauta não encontrada');
    }
    
    const topicData = topicSnap.data() as Topic;
    
    // Determinar se o usuário já votou
    const userVote = topicData.votedBy?.find(v => v.userId === userId);
    
    // Verificar se a votação ainda está aberta
    const now = Date.now();
    const isVotingOpen = topicData.isVotingEnabled && 
                        (!topicData.votingEndDate || topicData.votingEndDate > now);
    
    // Calcular total de votos
    const votes = topicData.votes || { yes: 0, no: 0, abstain: 0 };
    const totalVotes = votes.yes + votes.no + votes.abstain;
    
    return {
      isVotingEnabled: topicData.isVotingEnabled || false,
      isVotingOpen,
      votingEndDate: topicData.votingEndDate,
      userHasVoted: !!userVote,
      userVote: userVote?.vote,
      votes,
      totalVotes
    };
  } catch (error: any) {
    console.error('Erro ao obter status de votação:', error);
    throw error;
  }
};

// Mock data for financial records
const mockFinancials: Financial[] = [
  {
    id: 'financial1',
    description: 'Manutenção da piscina',
    type: 'expense',
    amount: 1500.00,
    category: 'Manutenção',
    date: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    status: 'paid',
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    createdBy: 'admin'
  },
  {
    id: 'financial2',
    description: 'Taxas condominiais - Junho',
    type: 'income',
    amount: 25000.00,
    category: 'Taxas',
    date: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days ago
    status: 'paid',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    createdBy: 'admin'
  },
  {
    id: 'financial3',
    description: 'Reforma do playground',
    type: 'expense',
    amount: 8500.00,
    category: 'Obras',
    date: Date.now() + 10 * 24 * 60 * 60 * 1000, // 10 days in future
    dueDate: Date.now() + 10 * 24 * 60 * 60 * 1000,
    status: 'pending',
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    createdBy: 'manager'
  }
];

// Financial functions
export const getFinancials = async (): Promise<Financial[]> => {
  // For anonymous mode, return mock data
  if (auth.currentUser?.uid === 'anonymous-user' || !auth.currentUser) {
    return Promise.resolve(mockFinancials);
  }
  
  const financialsQuery = query(
    collection(db, 'financials'),
    orderBy('date', 'desc')
  );
  
  const querySnapshot = await getDocs(financialsQuery);
  const financials = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Financial));
  
  // Buscar dados dos usuários para cada registro
  const financialsWithUserData = await Promise.all(
    financials.map(async (financial) => {
      if (typeof financial.createdBy === 'string') {
        try {
          const userProfile = await getUserProfile(financial.createdBy);
          if (userProfile) {
            return { ...financial, createdBy: userProfile };
          }
        } catch (error) {
          console.log('Error fetching user profile:', error);
        }
      }
      return financial;
    })
  );
  
  return financialsWithUserData;
};

export const getFinancialById = async (financialId: string): Promise<Financial | null> => {
  // For anonymous mode, return mock data
  if (auth.currentUser?.uid === 'anonymous-user' || !auth.currentUser) {
    const mockFinancial = mockFinancials.find(financial => financial.id === financialId);
    return Promise.resolve(mockFinancial || null);
  }
  
  try {
    const financialRef = doc(db, 'financials', financialId);
    const financialSnap = await getDoc(financialRef);
    
    if (financialSnap.exists()) {
      const financialData = financialSnap.data() as Omit<Financial, 'id'>;
      
      // Se o criador for um ID de usuário, recuperar dados do usuário
      let createdBy = financialData.createdBy;
      if (typeof createdBy === 'string') {
        try {
          const userProfile = await getUserProfile(createdBy);
          if (userProfile) {
            createdBy = userProfile;
          }
        } catch (error) {
          console.log('Error fetching user profile:', error);
        }
      }
      
      return { id: financialSnap.id, ...financialData, createdBy } as Financial;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting financial record:', error);
    return null;
  }
};

export const uploadFinancialDocument = async (uri: string, name: string, financialId: string): Promise<{name: string, uri: string}> => {
  try {
    // Garantir que o nome do arquivo tenha a extensão correta
    const extension = name.split('.').pop() || 'pdf';
    const filename = `document_${Date.now()}.${extension}`;
    const storageRef = ref(storage, `documentos/financeiro/${financialId}/${filename}`);
    
    // Upload process similar to other document uploads
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
      } catch (error) {
        console.warn("Erro no upload do documento web:", error);
        return { name, uri };
      }
    } else if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        if (!fileInfo.exists) {
          console.warn("Arquivo de documento não existe");
          return { name, uri };
        }
        
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
      } catch (error) {
        console.warn(`Erro no upload do documento ${Platform.OS}:`, error);
        return { name, uri };
      }
    }
    
    // Obter URL para download
    try {
      const downloadURL = await getDownloadURL(storageRef);
      return { name, uri: downloadURL };
    } catch (error) {
      console.warn("Erro ao obter URL de download do documento:", error);
      return { name, uri };
    }
  } catch (error) {
    console.error('Erro ao fazer upload do documento financeiro:', error);
    return { name, uri };
  }
};

export const createFinancial = async (financialData: Omit<Financial, 'id' | 'createdAt'>) => {
  try {
    // Salvamos os documentos originais para caso falhe o upload
    const originalAttachments = financialData.attachments || [];
    
    console.log(`Criando registro financeiro: "${financialData.description}" com ${originalAttachments.length} documentos`);
    
    // Primeiro, criar o registro para obter o ID
    const financialRef = await addDoc(collection(db, 'financials'), {
      ...financialData,
      createdAt: Date.now(),
      attachments: [] // Inicialmente vazio, será atualizado após os uploads
    });
    
    const financialId = financialRef.id;
    console.log(`Registro financeiro criado com ID: ${financialId}, iniciando uploads...`);
    
    const updatedData: Partial<Financial> = {};
    let hasUploadErrors = false;
    
    // Upload de documentos, se houver
    if (originalAttachments.length > 0) {
      console.log(`Iniciando upload de ${originalAttachments.length} documentos para o registro financeiro ${financialId}`);
      
      try {
        const documentPromises = originalAttachments.map(doc => 
          uploadFinancialDocument(doc.uri, doc.name, financialId)
        );
        
        updatedData.attachments = await Promise.all(documentPromises);
        console.log(`Upload de documentos concluído para o registro financeiro ${financialId}`);
      } catch (docError) {
        console.error('Erro durante o upload de documentos:', docError);
        // Em caso de erro, usar os documentos originais
        updatedData.attachments = originalAttachments;
        hasUploadErrors = true;
      }
    }
    
    // Atualizar o registro com os URLs de download
    if (Object.keys(updatedData).length > 0) {
      try {
        await updateDoc(financialRef, updatedData);
        console.log(`Registro financeiro ${financialId} atualizado com sucesso com as URLs de upload`);
      } catch (updateError) {
        console.error('Erro ao atualizar registro financeiro com URLs:', updateError);
        hasUploadErrors = true;
      }
    }
    
    // Create a notification for manager/admin users
    try {
      await createNotification({
        title: 'Novo Registro Financeiro',
        message: `Um novo registro financeiro "${financialData.description}" foi criado.`,
        type: 'financial',
        relatedItemId: financialId,
      });
    } catch (notificationError) {
      console.error('Erro ao criar notificação:', notificationError);
    }
    
    if (hasUploadErrors) {
      console.warn(`Registro financeiro ${financialId} criado com erros de upload`);
    } else {
      console.log(`Registro financeiro ${financialId} criado e atualizado com sucesso`);
    }
    
    return financialRef;
  } catch (error) {
    console.error('Erro ao criar registro financeiro:', error);
    throw error;
  }
};

export const updateFinancial = async (financialId: string, financialData: Partial<Financial>) => {
  try {
    const financialRef = doc(db, 'financials', financialId);
    
    // Se houver novos attachments, fazer upload
    if (financialData.attachments) {
      const originalAttachments = financialData.attachments;
      const updatedAttachments = [];
      
      for (const attachment of originalAttachments) {
        // Se o attachment já tiver uma URL remota, mantê-lo como está
        if (attachment.uri.startsWith('http://') || attachment.uri.startsWith('https://')) {
          updatedAttachments.push(attachment);
        } else {
          // Caso contrário, fazer upload
          const uploadedAttachment = await uploadFinancialDocument(attachment.uri, attachment.name, financialId);
          updatedAttachments.push(uploadedAttachment);
        }
      }
      
      // Atualizar a lista de attachments
      financialData.attachments = updatedAttachments;
    }
    
    // Adicionar campo updatedAt
    const updatedData = {
      ...financialData,
      updatedAt: Date.now()
    };
    
    await updateDoc(financialRef, updatedData);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar registro financeiro:', error);
    throw error;
  }
};

export const deleteFinancial = async (financialId: string) => {
  try {
    const financialRef = doc(db, 'financials', financialId);
    await deleteDoc(financialRef);
    return true;
  } catch (error) {
    console.error('Erro ao excluir registro financeiro:', error);
    throw error;
  }
};

// Funções para Achados e Perdidos
export const getLostAndFoundItems = async () => {
  try {
    const itemsCollection = collection(db, 'lostAndFoundItems');
    const q = query(itemsCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const items = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
        date: data.date?.toMillis ? data.date.toMillis() : data.date
      } as LostAndFoundItem;
    });
    
    return items;
  } catch (error) {
    console.error('Erro ao buscar itens de achados e perdidos:', error);
    throw error;
  }
};

export const getLostAndFoundItemById = async (itemId: string) => {
  try {
    const itemRef = doc(db, 'lostAndFoundItems', itemId);
    const itemSnap = await getDoc(itemRef);
    
    if (!itemSnap.exists()) {
      return null;
    }
    
    const data = itemSnap.data();
    
    return {
      id: itemSnap.id,
      ...data,
      createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
      date: data.date?.toMillis ? data.date.toMillis() : data.date
    } as LostAndFoundItem;
  } catch (error) {
    console.error(`Erro ao buscar item de achados e perdidos ${itemId}:`, error);
    throw error;
  }
};

export const uploadLostAndFoundImage = async (uri: string, itemId: string): Promise<string> => {
  if (!uri) {
    console.log('URL de imagem vazia, retornando string vazia');
    return '';
  }

  // Se a URI já for uma URL remota, retorná-la diretamente
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    console.log('Imagem já é uma URL remota, retornando diretamente:', uri);
    return uri;
  }

  const MAX_RETRIES = 3;
  let retryCount = 0;
  
  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`Tentativa ${retryCount + 1} de upload da imagem para achados e perdidos`);
      
      // Caminho para o arquivo no Storage
      const filename = `item_image_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
      const path = `lostAndFound/${itemId}/${filename}`;
      const storageRef = ref(storage, path);
      
      console.log('Caminho de armazenamento:', path);
      
      let imageBlob;
      
      if (Platform.OS === 'web') {
        // Para Web, precisamos buscar o arquivo como Blob
        console.log('Processando upload via Web');
        const response = await fetch(uri);
        imageBlob = await response.blob();
        console.log('Blob criado para web, tamanho:', imageBlob.size);
      } else if (uri.startsWith('file://') || uri.startsWith('content://')) {
        // Para dispositivos móveis
        try {
          console.log('Verificando arquivo via FileSystem');
          const fileInfo = await FileSystem.getInfoAsync(uri);
          
          if (!fileInfo.exists) {
            console.warn('Arquivo não encontrado:', uri);
            throw new Error('Arquivo de imagem não encontrado');
          }
          
          console.log('Arquivo encontrado, tamanho:', fileInfo.size);
          
          // Usar método direto de blob que funciona em iOS e Android
          console.log('Processando upload via blob (método universal)');
          const response = await fetch(uri);
          imageBlob = await response.blob();
          console.log('Blob criado, tamanho:', imageBlob.size);
        } catch (fileError) {
          console.error('Erro ao processar arquivo:', fileError);
          
          // Última tentativa usando fetch direto
          console.log('Tentando método direto como último recurso');
          const response = await fetch(uri);
          imageBlob = await response.blob();
        }
      } else {
        // URI em formato desconhecido, tentar fetch direto
        console.log('Formato URI desconhecido, tentando fetch direto');
        const response = await fetch(uri);
        imageBlob = await response.blob();
      }
      
      // Verificar se temos um blob válido
      if (!imageBlob || imageBlob.size === 0) {
        throw new Error('Falha ao criar um blob válido da imagem');
      }
      
      // Upload do blob para o Firebase Storage
      console.log('Iniciando upload do blob, tamanho:', imageBlob.size);
      await uploadBytes(storageRef, imageBlob);
      console.log('Upload do blob concluído com sucesso');
      
      // Obter a URL da imagem
      const downloadURL = await getDownloadURL(storageRef);
      console.log('URL obtida após upload:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      retryCount++;
      console.error(`Erro na tentativa ${retryCount} de upload:`, error);
      
      if (retryCount >= MAX_RETRIES) {
        console.error('Número máximo de tentativas excedido.');
        
        // Como último recurso, retornar a URI original
        console.log('Retornando URI original como fallback:', uri);
        return uri;
      }
      
      // Esperar antes de tentar novamente (espera exponencial)
      const waitTime = 1000 * Math.pow(2, retryCount);
      console.log(`Aguardando ${waitTime}ms antes de tentar novamente...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Não deveria chegar aqui, mas caso aconteça, retornar a URI original
  return uri;
};

export const createLostAndFoundItem = async (itemData: Omit<LostAndFoundItem, 'id' | 'createdAt'>) => {
  try {
    // Definir dados padrão
    const data = {
      ...itemData,
      createdAt: serverTimestamp(),
      status: itemData.status || 'active'
    };
    
    // Criar o documento no Firestore
    const docRef = await addDoc(collection(db, 'lostAndFoundItems'), data);
    const itemId = docRef.id;
    console.log(`Item de achados e perdidos criado com ID: ${itemId}, iniciando uploads...`);
    
    // Fazer upload das imagens, se houver
    let imageUrls: string[] = [];
    let hasUploadErrors = false;
    
    if (itemData.images && itemData.images.length > 0) {
      const originalImages = [...itemData.images];
      console.log(`Iniciando upload de ${originalImages.length} imagens para o item ${itemId}`);
      
      try {
        const uploadPromises = originalImages.map(uri => 
          uploadLostAndFoundImage(uri, itemId)
        );
        
        imageUrls = await Promise.all(uploadPromises);
        console.log(`Upload de imagens concluído para o item ${itemId}`, imageUrls);
        
        // Filtrar URLs vazias
        imageUrls = imageUrls.filter(url => url && url.length > 0);
        
        if (imageUrls.length !== originalImages.length) {
          console.warn(`Alguns uploads falharam: ${imageUrls.length}/${originalImages.length} bem-sucedidos`);
          hasUploadErrors = true;
        }
      } catch (uploadError) {
        console.error('Erro durante o upload de imagens:', uploadError);
        // Em caso de erro geral, mantenha as URIs originais que funcionaram
        hasUploadErrors = true;
      }
      
      // Atualizar o documento com as URLs das imagens, mesmo que incompletas
      if (imageUrls.length > 0) {
        try {
          await updateDoc(docRef, { images: imageUrls });
          console.log(`Documento atualizado com ${imageUrls.length} URLs de imagens`);
        } catch (updateError) {
          console.error('Erro ao atualizar documento com URLs de imagens:', updateError);
        }
      }
    }
    
    // Criar notificação para todos os usuários
    const itemType = itemData.category === 'lost' ? 'perdido' : 'encontrado';
    await createNotificationOnce(
      {
        title: `Novo Item ${itemData.category === 'lost' ? 'Perdido' : 'Encontrado'}`,
        message: `Um novo item foi ${itemType}: "${itemData.title}"`,
        type: 'lostandfound',
        relatedItemId: itemId,
      },
      createNotification,
      itemData.createdBy as string
    );
    
    if (hasUploadErrors) {
      console.warn('Item criado com alguns erros no upload de imagens');
    } else {
      console.log('Item criado com sucesso com todos os uploads');
    }
    
    return {
      id: docRef.id,
      ...data,
      images: imageUrls
    };
  } catch (error) {
    console.error('Erro ao criar item de achados e perdidos:', error);
    throw error;
  }
};

export const updateLostAndFoundItem = async (itemId: string, itemData: Partial<LostAndFoundItem>) => {
  try {
    const itemRef = doc(db, 'lostAndFoundItems', itemId);
    
    // Verificar se o item existe
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) {
      throw new Error('Item não encontrado');
    }
    
    // Preparar dados para atualização
    const updateData = {
      ...itemData,
      updatedAt: serverTimestamp()
    };
    
    // Fazer upload de novas imagens, se houver
    if (itemData.images && itemData.images.length > 0) {
      // Filtrar apenas as URLs que começam com "file:" ou "content:" ou "blob:" (novas imagens)
      const newImageUris = itemData.images.filter(uri => 
        uri && (uri.startsWith('file:') || uri.startsWith('content:') || uri.startsWith('blob:'))
      );
      
      // Manter URLs existentes que não são novos uploads
      const existingImageUrls = itemData.images.filter(uri => 
        uri && !uri.startsWith('file:') && !uri.startsWith('content:') && !uri.startsWith('blob:')
      );
      
      console.log(`Atualizando item ${itemId}: ${newImageUris.length} novas imagens, ${existingImageUrls.length} imagens existentes`);
      
      if (newImageUris.length > 0) {
        try {
          const uploadPromises = newImageUris.map(uri => 
            uploadLostAndFoundImage(uri, itemId)
          );
          
          const newImageUrls = await Promise.all(uploadPromises);
          console.log('Novas URLs de imagens após upload:', newImageUrls);
          
          // Filtrar URLs vazias e combinar com as existentes
          const validNewUrls = newImageUrls.filter(url => url && url.length > 0);
          updateData.images = [...existingImageUrls, ...validNewUrls];
          
          console.log(`Total de ${updateData.images.length} imagens após combinar existentes e novas`);
        } catch (uploadError) {
          console.error('Erro durante o upload de novas imagens na atualização:', uploadError);
          // Em caso de erro, manter apenas as URLs existentes
          updateData.images = existingImageUrls;
        }
      } else {
        // Se não houver novas imagens, manter apenas as existentes
        updateData.images = existingImageUrls;
      }
    }
    
    // Atualizar o documento no Firestore
    await updateDoc(itemRef, updateData);
    console.log(`Item ${itemId} atualizado com sucesso`);
    
    return {
      id: itemId,
      ...updateData
    };
  } catch (error) {
    console.error(`Erro ao atualizar item de achados e perdidos ${itemId}:`, error);
    throw error;
  }
};

export const deleteLostAndFoundItem = async (itemId: string) => {
  try {
    await deleteDoc(doc(db, 'lostAndFoundItems', itemId));
    
    // Nota: Poderíamos também deletar as imagens do Storage,
    // mas mantê-las pode ser útil para referência futura
    
    return { success: true };
  } catch (error) {
    console.error(`Erro ao deletar item de achados e perdidos ${itemId}:`, error);
    throw error;
  }
};

// Função para enviar email de redefinição de senha
export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
    console.log(`Email de redefinição de senha enviado para: ${email}`);
    return Promise.resolve();
  } catch (error: any) {
    console.error('Erro ao enviar email de redefinição de senha:', error);
    throw error;
  }
};

// Add these functions within the existing file

export const addNewsComment = async (newsId: string, commentData: Omit<NewsComment, 'id'>) => {
  try {
    // Generate a unique ID for the comment
    const commentId = `comment_${Date.now()}_${Math.floor(Math.random() * 1000000).toString()}`;
    
    // Reference to the news document
    const newsRef = doc(db, 'news', newsId);
    
    // Get the current document
    const newsSnap = await getDoc(newsRef);
    
    if (!newsSnap.exists()) {
      throw new Error('Notícia não encontrada');
    }
    
    // Get existing comments or initialize an empty array
    const newsData = newsSnap.data() as News;
    const comments = newsData.comments || [];
    
    // Add the new comment
    const newComment: NewsComment = {
      id: commentId,
      text: commentData.text,
      createdAt: commentData.createdAt,
      createdBy: commentData.createdBy,
      userName: commentData.userName,
      userRole: commentData.userRole,
      userUnit: commentData.userUnit,
      userAvatar: commentData.userAvatar
    };
    
    // Update the document with the new comments array
    await updateDoc(newsRef, {
      comments: [...comments, newComment]
    });
    
    return newComment;
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    throw new Error('Erro ao adicionar comentário: ' + error);
  }
};

export const toggleNewsLike = async (newsId: string, userId: string) => {
  try {
    // Reference to the news document
    const newsRef = doc(db, 'news', newsId);
    
    // Get the current document
    const newsSnap = await getDoc(newsRef);
    
    if (!newsSnap.exists()) {
      throw new Error('Notícia não encontrada');
    }
    
    // Get current likes
    const newsData = newsSnap.data() as News;
    const likes = newsData.likes || [];
    
    let updatedLikes;
    let isLiked = false;
    
    // Check if user already liked
    if (likes.includes(userId)) {
      // Remove like
      updatedLikes = likes.filter(id => id !== userId);
    } else {
      // Add like
      updatedLikes = [...likes, userId];
      isLiked = true;
    }
    
    // Update the document with the new likes array and count
    await updateDoc(newsRef, {
      likes: updatedLikes,
      likeCount: updatedLikes.length
    });
    
    return { 
      isLiked, 
      likeCount: updatedLikes.length 
    };
  } catch (error) {
    console.error('Erro ao processar like:', error);
    throw new Error('Erro ao processar like: ' + error);
  }
};

// Interface para as informações do condomínio
export interface CondominiumInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Função para obter as informações do condomínio
export const getCondominiumInfo = async (): Promise<CondominiumInfo | null> => {
  try {
    const docRef = doc(db, 'condominiumInfo', 'main');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as CondominiumInfo;
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar informações do condomínio:', error);
    return null;
  }
};

// Função para atualizar as informações do condomínio
export const updateCondominiumInfo = async (data: Partial<CondominiumInfo>) => {
  try {
    const docRef = doc(db, 'condominiumInfo', 'main');
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar informações do condomínio:', error);
    throw error;
  }
};

// Social Posts functions
export const getSocialPosts = async (): Promise<SocialPost[]> => {
  try {
    const postsRef = collection(db, 'socialPosts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const posts: SocialPost[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        comments: data.comments || [],
        likes: data.likes || [],
        likeCount: data.likeCount || 0,
        commentCount: data.commentCount || 0,
      } as SocialPost);
    });
    
    return posts;
  } catch (error) {
    console.error('Erro ao buscar posts sociais:', error);
    throw error;
  }
};

export const createSocialPost = async (postData: Omit<SocialPost, 'id' | 'createdAt' | 'likes' | 'likeCount' | 'comments' | 'commentCount'>) => {
  try {
    const postsRef = collection(db, 'socialPosts');
    
    // Primeiro, criar o post para obter o ID
    const tempPost = {
      ...postData,
      createdAt: Date.now(),
      likes: [],
      likeCount: 0,
      comments: [],
      commentCount: 0,
      images: [], // Inicialmente vazio
    };
    
    const docRef = await addDoc(postsRef, tempPost);
    const postId = docRef.id;
    
    // Upload das imagens se houver
    let uploadedImages: string[] = [];
    if (postData.images && postData.images.length > 0) {
      try {
        const imagePromises = postData.images.map(imageUri => 
          uploadSocialPostImage(imageUri, postId)
        );
        uploadedImages = await Promise.all(imagePromises);
        
        // Atualizar o post com as URLs das imagens
        await updateDoc(docRef, { images: uploadedImages });
      } catch (uploadError) {
        console.error('Erro durante o upload de imagens:', uploadError);
        // Manter o post mesmo se o upload falhar
      }
    }
    
    // Criar notificação para usuários mencionados
    if (postData.mentions && postData.mentions.length > 0) {
      for (const mentionedUserId of postData.mentions) {
        await createNotification({
          title: 'Você foi mencionado',
          message: `${postData.userName} mencionou você em um post`,
          type: 'system',
          targetUserId: mentionedUserId,
          relatedItemId: postId,
        });
      }
    }
    
    return postId;
  } catch (error) {
    console.error('Erro ao criar post social:', error);
    throw error;
  }
};

export const toggleSocialPostLike = async (postId: string, userId: string) => {
  try {
    const postRef = doc(db, 'socialPosts', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('Post não encontrado');
    }
    
    const postData = postDoc.data() as SocialPost;
    const likes = postData.likes || [];
    const hasLiked = likes.includes(userId);
    
    let updatedLikes: string[];
    if (hasLiked) {
      updatedLikes = likes.filter(id => id !== userId);
    } else {
      updatedLikes = [...likes, userId];
    }
    
    await updateDoc(postRef, {
      likes: updatedLikes,
      likeCount: updatedLikes.length,
    });
    
    return !hasLiked;
  } catch (error) {
    console.error('Erro ao dar like no post:', error);
    throw error;
  }
};

export const addSocialPostComment = async (postId: string, commentData: Omit<SocialComment, 'id' | 'createdAt' | 'likes' | 'likeCount'>) => {
  try {
    const postRef = doc(db, 'socialPosts', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('Post não encontrado');
    }
    
    const postData = postDoc.data() as SocialPost;
    const comments = postData.comments || [];
    
    const newComment: SocialComment = {
      ...commentData,
      id: Date.now().toString(),
      createdAt: Date.now(),
      likes: [],
      likeCount: 0,
    };
    
    const updatedComments = [...comments, newComment];
    
    await updateDoc(postRef, {
      comments: updatedComments,
      commentCount: updatedComments.length,
    });
    
    // Criar notificação para o autor do post
    if (commentData.createdBy !== postData.createdBy) {
      await createNotification({
        title: 'Novo comentário',
        message: `${commentData.userName} comentou no seu post`,
        type: 'system',
        targetUserId: postData.createdBy,
        relatedItemId: postId,
      });
    }
    
    // Criar notificação para usuários mencionados no comentário
    if (commentData.mentions && commentData.mentions.length > 0) {
      for (const mentionedUserId of commentData.mentions) {
        if (mentionedUserId !== commentData.createdBy) {
          await createNotification({
            title: 'Você foi mencionado',
            message: `${commentData.userName} mencionou você em um comentário`,
            type: 'system',
            targetUserId: mentionedUserId,
            relatedItemId: postId,
          });
        }
      }
    }
    
    return newComment.id;
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    throw error;
  }
};

export const toggleSocialCommentLike = async (postId: string, commentId: string, userId: string) => {
  try {
    const postRef = doc(db, 'socialPosts', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('Post não encontrado');
    }
    
    const postData = postDoc.data() as SocialPost;
    const comments = postData.comments || [];
    
    const updatedComments = comments.map(comment => {
      if (comment.id === commentId) {
        const likes = comment.likes || [];
        const hasLiked = likes.includes(userId);
        
        let updatedLikes: string[];
        if (hasLiked) {
          updatedLikes = likes.filter(id => id !== userId);
        } else {
          updatedLikes = [...likes, userId];
        }
        
        return {
          ...comment,
          likes: updatedLikes,
          likeCount: updatedLikes.length,
        };
      }
      return comment;
    });
    
    await updateDoc(postRef, {
      comments: updatedComments,
    });
    
    const comment = comments.find(c => c.id === commentId);
    return comment ? !comment.likes?.includes(userId) : false;
  } catch (error) {
    console.error('Erro ao dar like no comentário:', error);
    throw error;
  }
};

export const uploadSocialPostImage = async (uri: string, postId: string): Promise<string> => {
  try {
    console.log('Iniciando upload da imagem do post social:', uri);
    
    // Para mobile e web, usar fetch para obter o blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Upload para Firebase Storage usando o blob diretamente
    const imageRef = ref(storage, `socialPosts/${postId}/${Date.now()}.jpg`);
    await uploadBytes(imageRef, blob);
    
    // Obter URL de download
    const downloadURL = await getDownloadURL(imageRef);
    console.log('Upload da imagem do post social concluído:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Erro ao fazer upload da imagem do post social:', error);
    throw error;
  }
};

export const deleteSocialPost = async (postId: string) => {
  try {
    const postRef = doc(db, 'socialPosts', postId);
    await deleteDoc(postRef);
  } catch (error) {
    console.error('Erro ao deletar post social:', error);
    throw error;
  }
};

export const subscribeToSocialPosts = (callback: (posts: SocialPost[]) => void) => {
  const postsRef = collection(db, 'socialPosts');
  const q = query(postsRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const posts: SocialPost[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        comments: data.comments || [],
        likes: data.likes || [],
        likeCount: data.likeCount || 0,
        commentCount: data.commentCount || 0,
      } as SocialPost);
    });
    callback(posts);
  });
};