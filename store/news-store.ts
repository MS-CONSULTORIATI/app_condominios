import { create } from 'zustand';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  getDoc,
  where,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { News } from '@/types';
import { createNotification } from '@/lib/firebase';
import { createNotificationOnce } from '@/lib/createNotification';

interface NewsState {
  news: News[];
  isLoading: boolean;
  error: string | null;
  fetchNews: () => Promise<void>;
  getNewsItem: (newsId: string) => News | undefined;
  createNews: (news: Omit<News, 'id' | 'createdAt' | 'createdBy' | 'viewCount' | 'viewedBy'>, coverImageUri?: string, images?: string[], documents?: { uri: string; name: string }[]) => Promise<string | null>;
  updateNews: (news: Pick<News, 'id'> & Partial<Omit<News, 'createdAt' | 'createdBy'>>, coverImageUri?: string, images?: string[], removedImages?: string[], documents?: { uri: string; name: string }[], removedDocuments?: { uri: string }[]) => Promise<boolean>;
  removeNews: (newsId: string) => Promise<boolean>;
  publishNews: (newsId: string) => Promise<boolean>;
  archiveNews: (newsId: string) => Promise<boolean>;
  incrementViews: (newsId: string) => Promise<boolean>;
  getPublishedNews: () => News[];
  getDraftNews: () => News[];
  getArchivedNews: () => News[];
  getFeaturedNews: () => News[];
  getRecentNews: () => News[];
  getVisiblePublishedNews: () => News[];
}

export const useNewsStore = create<NewsState>((set, get) => ({
  news: [],
  isLoading: false,
  error: null,

  fetchNews: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        set({ 
          news: [], 
          isLoading: false 
        });
        return;
      }
      
      // Buscar notícias do Firestore
      const newsQuery = query(
        collection(db, 'news'),
        orderBy('publishDate', 'desc')
      );
      
      const querySnapshot = await getDocs(newsQuery);
      
      if (querySnapshot.empty) {
        set({ 
          news: [], 
          isLoading: false 
        });
        return;
      }
      
      const newsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Converter timestamp do Firestore para número
        const createdAt = data.createdAt instanceof Timestamp 
          ? data.createdAt.toMillis() 
          : data.createdAt || Date.now();
        
        const publishDate = data.publishDate instanceof Timestamp 
          ? data.publishDate.toMillis() 
          : data.publishDate || Date.now();
          
        return { 
          id: doc.id,
          ...data,
          createdAt,
          publishDate,
          viewCount: data.viewCount || 0,
          viewedBy: data.viewedBy || []
        } as News;
      });
      
      set({ 
        news: newsData, 
        isLoading: false 
      });
      
    } catch (error) {
      console.error('Erro ao buscar notícias:', error);
      set({ 
        error: 'Falha ao carregar as notícias. Tente novamente.', 
        isLoading: false 
      });
    }
  },

  getNewsItem: (newsId: string) => {
    return get().news.find(item => item.id === newsId);
  },

  createNews: async (newsData, coverImageUri, images = [], documents = []) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Verificar se o usuário está autenticado e tem permissão (manager)
      if (!auth.currentUser) {
        set({ 
          error: 'Você precisa estar autenticado para criar notícias.', 
          isLoading: false 
        });
        return null;
      }
      
      // Inicializar dados da notícia
      let newsDataToSave = {
        ...newsData,
        createdBy: auth.currentUser.uid,
        viewCount: 0,
        viewedBy: [],
        status: newsData.status || 'draft',
        publishDate: newsData.publishDate || Date.now(),
        images: [],
        documents: []
      } as any;
      
      // Upload da imagem de capa, se houver
      if (coverImageUri) {
        try {
          const storage = getStorage();
          const fileExtension = coverImageUri.split('.').pop();
          const fileName = `news/covers/${auth.currentUser.uid}_${Date.now()}.${fileExtension}`;
          const storageRef = ref(storage, fileName);
          
          // Converter URI para blob
          const response = await fetch(coverImageUri);
          const blob = await response.blob();
          
          // Upload para o Firebase Storage
          await uploadBytes(storageRef, blob);
          
          // Obter URL da imagem
          const photoURL = await getDownloadURL(storageRef);
          newsDataToSave.coverImage = photoURL;
          
        } catch (error) {
          console.error('Erro ao fazer upload da imagem de capa:', error);
        }
      }
      
      // Upload de imagens adicionais
      if (images.length > 0) {
        const imageUrls = [];
        
        for (const imageUri of images) {
          try {
            const storage = getStorage();
            const fileExtension = imageUri.split('.').pop();
            const fileName = `news/images/${auth.currentUser.uid}_${Date.now()}_${imageUrls.length}.${fileExtension}`;
            const storageRef = ref(storage, fileName);
            
            // Converter URI para blob
            const response = await fetch(imageUri);
            const blob = await response.blob();
            
            // Upload para o Firebase Storage
            await uploadBytes(storageRef, blob);
            
            // Obter URL da imagem
            const photoURL = await getDownloadURL(storageRef);
            imageUrls.push(photoURL);
            
          } catch (error) {
            console.error('Erro ao fazer upload de imagem adicional:', error);
          }
        }
        
        newsDataToSave.images = imageUrls;
      }
      
      // Upload de documentos
      if (documents.length > 0) {
        const docData = [];
        
        for (const doc of documents) {
          try {
            const storage = getStorage();
            const fileExtension = doc.uri.split('.').pop();
            const fileName = `news/documents/${auth.currentUser.uid}_${Date.now()}_${doc.name}.${fileExtension}`;
            const storageRef = ref(storage, fileName);
            
            // Converter URI para blob
            const response = await fetch(doc.uri);
            const blob = await response.blob();
            
            // Upload para o Firebase Storage
            await uploadBytes(storageRef, blob);
            
            // Obter URL do documento
            const docURL = await getDownloadURL(storageRef);
            docData.push({
              name: doc.name,
              uri: docURL
            });
            
          } catch (error) {
            console.error('Erro ao fazer upload de documento:', error);
          }
        }
        
        newsDataToSave.documents = docData;
      }
      
      // Salvar no Firestore
      const db = getFirestore();
      const newsRef = collection(db, 'news');
      
      // Converter todos os campos undefined para null
      const firestoreSafeData = Object.fromEntries(
        Object.entries(newsDataToSave).map(([key, value]) => [key, value === undefined ? null : value])
      );
      
      const docRef = await addDoc(newsRef, {
        ...firestoreSafeData,
        createdAt: serverTimestamp()
      });
      
      // Se for publicado, criar notificação para todos os usuários
      if (newsDataToSave.status === 'published') {
        await createNotificationOnce(
          {
            title: 'Nova Notícia Publicada',
            message: `Uma nova notícia foi publicada: "${newsDataToSave.title}"`,
            type: 'system',
            relatedItemId: docRef.id,
          },
          createNotification,
          auth.currentUser.uid
        );
      }
      
      // Refetch para sincronizar
      get().fetchNews();
      
      set({ isLoading: false });
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar notícia:', error);
      set({ 
        error: 'Falha ao criar a notícia. Tente novamente.', 
        isLoading: false 
      });
      return null;
    }
  },

  updateNews: async (news, coverImageUri, images = [], removedImages = [], documents = [], removedDocuments = []) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      const newsId = news.id;
      const existingNews = get().getNewsItem(newsId);
      
      // Verificar se a notícia existe
      if (!existingNews) {
        set({ 
          error: 'Notícia não encontrada.', 
          isLoading: false 
        });
        return false;
      }
      
      // Verificar permissões
      if (!auth.currentUser) {
        set({ 
          error: 'Você precisa estar autenticado para editar notícias.', 
          isLoading: false 
        });
        return false;
      }
      
      // Preparar objeto com os dados a serem atualizados
      const updateData: any = { ...news };
      updateData.updatedAt = Date.now();
      updateData.updatedBy = auth.currentUser.uid;
      
      if (news.status === 'published' && existingNews.status !== 'published') {
        updateData.publishDate = Date.now();
      }
      
      // Excluir imagens removidas do Storage
      if (removedImages.length > 0) {
        const storage = getStorage();
        
        for (const imageUrl of removedImages) {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('Erro ao excluir imagem:', error);
          }
        }
        
        // Atualizar array de imagens
        updateData.images = existingNews.images?.filter(url => !removedImages.includes(url)) || [];
      }
      
      // Excluir documentos removidos do Storage
      if (removedDocuments.length > 0) {
        const storage = getStorage();
        
        for (const docObj of removedDocuments) {
          try {
            const docRef = ref(storage, docObj.uri);
            await deleteObject(docRef);
          } catch (error) {
            console.error('Erro ao excluir documento:', error);
          }
        }
        
        // Atualizar array de documentos
        const removedUris = removedDocuments.map(doc => doc.uri);
        updateData.documents = existingNews.documents?.filter(doc => !removedUris.includes(doc.uri)) || [];
      }
      
      // Upload da nova imagem de capa, se houver
      if (coverImageUri) {
        // Se já existir uma imagem de capa, excluí-la
        if (existingNews.coverImage) {
          try {
            const storage = getStorage();
            const coverImageRef = ref(storage, existingNews.coverImage);
            await deleteObject(coverImageRef);
          } catch (error) {
            console.error('Erro ao excluir imagem de capa existente:', error);
          }
        }
        
        try {
          const storage = getStorage();
          const fileExtension = coverImageUri.split('.').pop();
          const fileName = `news/covers/${auth.currentUser.uid}_${Date.now()}.${fileExtension}`;
          const storageRef = ref(storage, fileName);
          
          // Converter URI para blob
          const response = await fetch(coverImageUri);
          const blob = await response.blob();
          
          // Upload para o Firebase Storage
          await uploadBytes(storageRef, blob);
          
          // Obter URL da imagem
          const photoURL = await getDownloadURL(storageRef);
          updateData.coverImage = photoURL;
          
        } catch (error) {
          console.error('Erro ao fazer upload da nova imagem de capa:', error);
        }
      }
      
      // Upload de novas imagens adicionais
      if (images.length > 0) {
        const imageUrls = [...(updateData.images || [])];
        
        for (const imageUri of images) {
          try {
            const storage = getStorage();
            const fileExtension = imageUri.split('.').pop();
            const fileName = `news/images/${auth.currentUser.uid}_${Date.now()}_${imageUrls.length}.${fileExtension}`;
            const storageRef = ref(storage, fileName);
            
            // Converter URI para blob
            const response = await fetch(imageUri);
            const blob = await response.blob();
            
            // Upload para o Firebase Storage
            await uploadBytes(storageRef, blob);
            
            // Obter URL da imagem
            const photoURL = await getDownloadURL(storageRef);
            imageUrls.push(photoURL);
            
          } catch (error) {
            console.error('Erro ao fazer upload de nova imagem adicional:', error);
          }
        }
        
        updateData.images = imageUrls;
      }
      
      // Upload de novos documentos
      if (documents.length > 0) {
        const docData = [...(updateData.documents || [])];
        
        for (const doc of documents) {
          try {
            const storage = getStorage();
            const fileExtension = doc.uri.split('.').pop();
            const fileName = `news/documents/${auth.currentUser.uid}_${Date.now()}_${doc.name}.${fileExtension}`;
            const storageRef = ref(storage, fileName);
            
            // Converter URI para blob
            const response = await fetch(doc.uri);
            const blob = await response.blob();
            
            // Upload para o Firebase Storage
            await uploadBytes(storageRef, blob);
            
            // Obter URL do documento
            const docURL = await getDownloadURL(storageRef);
            docData.push({
              name: doc.name,
              uri: docURL
            });
            
          } catch (error) {
            console.error('Erro ao fazer upload de novo documento:', error);
          }
        }
        
        updateData.documents = docData;
      }
      
      // Atualizar no Firestore
      const db = getFirestore();
      const newsRef = doc(db, 'news', newsId);
      
      // Remover campos que não devem ser atualizados
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.createdBy;
      
      // Converter todos os campos undefined para null
      const firestoreSafeData = Object.fromEntries(
        Object.entries(updateData).map(([key, value]) => [key, value === undefined ? null : value])
      );
      
      await updateDoc(newsRef, firestoreSafeData);
      
      // Se passou de draft para published, criar notificação
      if (news.status === 'published' && existingNews.status !== 'published') {
        await createNotificationOnce(
          {
            title: 'Nova Notícia Publicada',
            message: `Uma nova notícia foi publicada: "${updateData.title || existingNews.title}"`,
            type: 'system',
            relatedItemId: newsId,
          },
          createNotification,
          auth.currentUser.uid
        );
      }
      
      // Refetch para sincronizar
      get().fetchNews();
      
      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar notícia:', error);
      set({ 
        error: 'Falha ao atualizar a notícia. Tente novamente.', 
        isLoading: false 
      });
      return false;
    }
  },

  removeNews: async (newsId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      const db = getFirestore();
      const existingNews = get().getNewsItem(newsId);
      
      // Verificar se a notícia existe
      if (!existingNews) {
        set({ 
          error: 'Notícia não encontrada.', 
          isLoading: false 
        });
        return false;
      }
      
      // Verificar permissões
      if (!auth.currentUser) {
        set({ 
          error: 'Você precisa estar autenticado para remover notícias.', 
          isLoading: false 
        });
        return false;
      }
      
      // Remover imagens e documentos do Storage
      const storage = getStorage();
      
      // Remover imagem de capa, se houver
      if (existingNews.coverImage) {
        try {
          const imageRef = ref(storage, existingNews.coverImage);
          await deleteObject(imageRef);
        } catch (error) {
          console.error('Erro ao excluir imagem de capa:', error);
        }
      }
      
      // Remover imagens adicionais, se houver
      if (existingNews.images && existingNews.images.length > 0) {
        for (const imageUrl of existingNews.images) {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('Erro ao excluir imagem:', error);
          }
        }
      }
      
      // Remover documentos, se houver
      if (existingNews.documents && existingNews.documents.length > 0) {
        for (const docObj of existingNews.documents) {
          try {
            const docRef = ref(storage, docObj.uri);
            await deleteObject(docRef);
          } catch (error) {
            console.error('Erro ao excluir documento:', error);
          }
        }
      }
      
      // Remover do Firestore
      const newsRef = doc(db, 'news', newsId);
      await deleteDoc(newsRef);
      
      // Refetch para sincronizar
      get().fetchNews();
      
      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('Erro ao remover notícia:', error);
      set({ 
        error: 'Falha ao remover a notícia. Tente novamente.', 
        isLoading: false 
      });
      return false;
    }
  },

  publishNews: async (newsId: string) => {
    try {
      const existingNews = get().getNewsItem(newsId);
      
      if (!existingNews) {
        set({ error: 'Notícia não encontrada.' });
        return false;
      }
      
      if (existingNews.status === 'published') {
        return true; // Já está publicada
      }
      
      return await get().updateNews({
        id: newsId,
        status: 'published',
        publishDate: Date.now()
      });
      
    } catch (error) {
      console.error('Erro ao publicar notícia:', error);
      set({ error: 'Falha ao publicar a notícia. Tente novamente.' });
      return false;
    }
  },

  archiveNews: async (newsId: string) => {
    try {
      const existingNews = get().getNewsItem(newsId);
      
      if (!existingNews) {
        set({ error: 'Notícia não encontrada.' });
        return false;
      }
      
      if (existingNews.status === 'archived') {
        return true; // Já está arquivada
      }
      
      return await get().updateNews({
        id: newsId,
        status: 'archived'
      });
      
    } catch (error) {
      console.error('Erro ao arquivar notícia:', error);
      set({ error: 'Falha ao arquivar a notícia. Tente novamente.' });
      return false;
    }
  },

  incrementViews: async (newsId: string) => {
    try {
      const auth = getAuth();
      
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        return false;
      }
      
      const existingNews = get().getNewsItem(newsId);
      
      if (!existingNews) {
        return false;
      }
      
      // Verificar se o usuário já visualizou esta notícia
      if (existingNews.viewedBy && existingNews.viewedBy.includes(auth.currentUser.uid)) {
        return true; // Já foi visualizado por este usuário
      }
      
      const db = getFirestore();
      const newsRef = doc(db, 'news', newsId);
      
      await updateDoc(newsRef, {
        viewCount: (existingNews.viewCount || 0) + 1,
        viewedBy: arrayUnion(auth.currentUser.uid)
      });
      
      // Refetch para sincronizar
      get().fetchNews();
      
      return true;
    } catch (error) {
      console.error('Erro ao incrementar visualizações:', error);
      return false;
    }
  },

  getPublishedNews: () => {
    // Return all news with 'published' status (regardless of visibility)
    return get().news.filter(item => item.status === 'published');
  },

  getVisiblePublishedNews: () => {
    // Return only published news that are visible
    return get().news.filter(item => item.status === 'published' && item.visible !== false);
  },

  getDraftNews: () => {
    return get().news.filter(item => item.status === 'draft');
  },

  getArchivedNews: () => {
    return get().news.filter(item => item.status === 'archived');
  },

  getFeaturedNews: () => {
    return get().news.filter(item => item.status === 'published' && item.featured);
  },
  
  getRecentNews: () => {
    // Return all published news where visible !== false, sorted by publishDate (newest first)
    return get().news
      .filter(item => item.status === 'published' && item.visible !== false)
      .sort((a, b) => b.publishDate - a.publishDate);
  }
})); 