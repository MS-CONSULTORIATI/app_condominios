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
  arrayUnion,
  arrayRemove,
  where,
  limit
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Advertisement, Comment } from '@/types';
import { createNotification } from '@/lib/firebase';
import { createNotificationOnce } from '@/lib/createNotification';

interface AdvertisementsState {
  advertisements: Advertisement[];
  isLoading: boolean;
  error: string | null;
  fetchAdvertisements: () => Promise<void>;
  getAdvertisement: (advertisementId: string) => Advertisement | undefined;
  createAdvertisement: (advertisement: Omit<Advertisement, 'id' | 'createdAt' | 'createdBy' | 'likes' | 'isAuction' | 'bids' | 'currentBid'>, photoUris?: string[]) => Promise<string | null>;
  updateAdvertisement: (advertisement: Pick<Advertisement, 'id'> & Partial<Omit<Advertisement, 'createdAt' | 'createdBy' | 'likes' | 'bids' | 'currentBid'>>, photoUris?: string[]) => Promise<boolean>;
  removeAdvertisement: (advertisementId: string) => Promise<boolean>;
  toggleLike: (advertisementId: string) => Promise<boolean>;
  markAsSold: (advertisementId: string) => Promise<boolean>;
  getMyAdvertisements: () => Advertisement[];
  placeBid: (advertisementId: string, bidAmount: number) => Promise<boolean>;
  getAuctionBids: (advertisementId: string) => Promise<any[]>;
  checkAuctionStatus: (advertisementId: string) => Promise<boolean>;
  incrementViews: (advertisementId: string) => Promise<boolean>;
  addComment: (advertisementId: string, text: string) => Promise<boolean>;
  replyToComment: (advertisementId: string, commentId: string, text: string) => Promise<boolean>;
  getComments: (advertisementId: string) => Comment[];
}

export const useAdvertisementsStore = create<AdvertisementsState>((set, get) => ({
  advertisements: [],
  isLoading: false,
  error: null,

  fetchAdvertisements: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        console.log('Usuário não autenticado - retornando lista vazia');
        set({ 
          advertisements: [], 
          isLoading: false 
        });
        return;
      }
      
      // Buscar anúncios do Firestore
      console.log('Buscando anúncios do Firestore');
      const advertisementsQuery = query(
        collection(db, 'advertisements'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(advertisementsQuery);
      
      if (querySnapshot.empty) {
        console.log('Nenhum anúncio encontrado no Firestore');
        set({ 
          advertisements: [], 
          isLoading: false 
        });
        return;
      }
      
      const advertisementsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Converter timestamp do Firestore para número
        const createdAt = data.createdAt instanceof Timestamp 
          ? data.createdAt.toMillis() 
          : data.createdAt || Date.now();
          
        return { 
          id: doc.id,
          ...data,
          createdAt,
          likes: data.likes || []
        } as Advertisement;
      });
      
      console.log(`Encontrados ${advertisementsData.length} anúncios no Firestore`);
      
      set({ 
        advertisements: advertisementsData, 
        isLoading: false 
      });
      
    } catch (error) {
      console.error('Erro ao buscar anúncios:', error);
      set({ 
        error: 'Falha ao carregar os anúncios. Tente novamente.', 
        isLoading: false 
      });
    }
  },

  getAdvertisement: (advertisementId: string) => {
    return get().advertisements.find(ad => ad.id === advertisementId);
  },

  getMyAdvertisements: () => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    
    if (!userId) return [];
    
    return get().advertisements.filter(ad => ad.createdBy === userId);
  },

  createAdvertisement: async (advertisementData, photoUris) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        console.log('Usuário não autenticado');
        set({ 
          error: 'Você precisa estar autenticado para criar anúncios.', 
          isLoading: false 
        });
        return null;
      }
      
      // Inicializar dados do anúncio
      // NOTA: Todos os campos undefined causarão erro no Firestore
      // Garanta que advertisementData não contenha valores undefined
      const inputData = advertisementData as any; // Usar asserção de tipo para evitar erros
      
      let adData = {
        ...advertisementData,
        createdBy: auth.currentUser.uid,
        likes: [],
        status: advertisementData.status || 'available',
        isAuction: inputData.isAuction || false,
        bids: [],
        // Garantir que estes campos específicos nunca sejam undefined
        ownerContact: advertisementData.ownerContact || "",
        auctionEndDate: inputData.isAuction ? inputData.auctionEndDate || null : null
      } as any; // Usar asserção de tipo para evitar erros
      
      // Se for leilão, inicializar propriedades específicas
      if (adData.isAuction) {
        adData = { 
          ...adData, 
          currentBid: adData.price, // Preço inicial como lance inicial
          bids: []
        };
      }
      
      // Upload de fotos se fornecidas
      if (photoUris && photoUris.length > 0) {
        try {
          const storage = getStorage();
          const photoURLs = [];
          
          // Upload each photo
          for (let i = 0; i < photoUris.length; i++) {
            const photoUri = photoUris[i];
            const fileExtension = photoUri.split('.').pop();
            const fileName = `advertisements/${auth.currentUser.uid}/${Date.now()}_${i}.${fileExtension}`;
            const storageRef = ref(storage, fileName);
            
            // Converter URI para blob
            const response = await fetch(photoUri);
            const blob = await response.blob();
            
            // Upload para o Firebase Storage
            await uploadBytes(storageRef, blob);
            
            // Obter URL da imagem
            const photoURL = await getDownloadURL(storageRef);
            photoURLs.push(photoURL);
          }
          
          // Set the first photo as the main photoURL for backward compatibility
          if (photoURLs.length > 0) {
            adData.photoURL = photoURLs[0];
          }
          
          // Add all photos to the photos array
          adData.photos = photoURLs;
          
        } catch (error) {
          console.error('Erro ao fazer upload das imagens:', error);
        }
      }
      
      // Salvar no Firestore
      const db = getFirestore();
      const advertisementsRef = collection(db, 'advertisements');
      
      // Converter todos os campos undefined para null
      const firestoreSafeData = Object.fromEntries(
        Object.entries(adData).map(([key, value]) => [key, value === undefined ? null : value])
      );
      
      const docRef = await addDoc(advertisementsRef, {
        ...firestoreSafeData,
        createdAt: serverTimestamp()
      });
      
      console.log('Anúncio criado com ID:', docRef.id);
      
      // Criar notificação para todos os usuários
      await createNotificationOnce(
        {
          title: 'Novo Anúncio Publicado',
          message: `Um novo anúncio "${adData.title}" foi publicado.`,
          type: 'advertisement',
          relatedItemId: docRef.id,
        },
        createNotification,
        auth.currentUser.uid
      );
      
      // Refetch para sincronizar
      get().fetchAdvertisements();
      
      set({ isLoading: false });
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar anúncio:', error);
      set({ 
        error: 'Falha ao criar o anúncio. Tente novamente.', 
        isLoading: false 
      });
      return null;
    }
  },

  updateAdvertisement: async (advertisement, photoUris) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      const advertisementId = advertisement.id;
      
      // Verificar permissões
      if (!auth.currentUser) {
        console.log('Usuário não autenticado');
        set({ 
          error: 'Você precisa estar autenticado para atualizar anúncios.', 
          isLoading: false 
        });
        return false;
      }
      
      // Verificar se o anúncio existe
      const db = getFirestore();
      const adRef = doc(db, 'advertisements', advertisementId);
      const adSnap = await getDoc(adRef);
      
      if (!adSnap.exists()) {
        set({ 
          error: 'Anúncio não encontrado.', 
          isLoading: false 
        });
        return false;
      }
      
      // Verificar se o usuário é o dono do anúncio
      const adData = adSnap.data();
      if (adData.createdBy !== auth.currentUser.uid) {
        set({ 
          error: 'Você não tem permissão para editar este anúncio.', 
          isLoading: false 
        });
        return false;
      }
      
      // Remover o id antes de enviar para o Firestore
      const { id, ...updateData } = advertisement;
      
      // Upload de novas fotos se fornecidas
      if (photoUris && photoUris.length > 0) {
        try {
          const storage = getStorage();
          
          // Se já existirem fotos, excluir as antigas
          if (adData.photos && adData.photos.length > 0) {
            for (let i = 0; i < adData.photos.length; i++) {
              try {
                // Extrair o caminho do storage da URL
                const oldPhotoPath = adData.photos[i].split('advertisements%2F')[1].split('?')[0];
                const oldPhotoRef = ref(storage, `advertisements/${oldPhotoPath}`);
                await deleteObject(oldPhotoRef);
              } catch (error) {
                console.error(`Erro ao excluir imagem antiga ${i}:`, error);
              }
            }
          }
          
          // Upload das novas imagens
          const photoURLs = [];
          for (let i = 0; i < photoUris.length; i++) {
            const photoUri = photoUris[i];
            const fileExtension = photoUri.split('.').pop();
            const fileName = `advertisements/${auth.currentUser.uid}/${Date.now()}_${i}.${fileExtension}`;
            const storageRef = ref(storage, fileName);
            
            // Converter URI para blob
            const response = await fetch(photoUri);
            const blob = await response.blob();
            
            // Upload para o Firebase Storage
            await uploadBytes(storageRef, blob);
            
            // Obter URL da imagem
            const photoURL = await getDownloadURL(storageRef);
            photoURLs.push(photoURL);
          }
          
          // Set the first photo as the main photoURL for backward compatibility
          if (photoURLs.length > 0) {
            updateData.photoURL = photoURLs[0];
          }
          
          // Add all photos to the photos array
          updateData.photos = photoURLs;
          
        } catch (error) {
          console.error('Erro ao fazer upload das novas imagens:', error);
        }
      }
      
      // Atualizar no Firestore
      await updateDoc(adRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      
      console.log('Anúncio atualizado com sucesso');
      
      // Refetch para sincronizar
      get().fetchAdvertisements();
      
      set({ isLoading: false });
      return true;
      
    } catch (error) {
      console.error('Erro ao atualizar anúncio:', error);
      set({ 
        error: 'Falha ao atualizar o anúncio. Tente novamente.', 
        isLoading: false 
      });
      return false;
    }
  },

  removeAdvertisement: async (advertisementId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Verificar permissões
      if (!auth.currentUser) {
        console.log('Usuário não autenticado');
        set({ 
          error: 'Você precisa estar autenticado para remover anúncios.', 
          isLoading: false 
        });
        return false;
      }
      
      // Verificar se o anúncio existe
      const db = getFirestore();
      const adRef = doc(db, 'advertisements', advertisementId);
      const adSnap = await getDoc(adRef);
      
      if (!adSnap.exists()) {
        set({ 
          error: 'Anúncio não encontrado.', 
          isLoading: false 
        });
        return false;
      }
      
      // Verificar se o usuário é o dono do anúncio
      const adData = adSnap.data();
      if (adData.createdBy !== auth.currentUser.uid) {
        set({ 
          error: 'Você não tem permissão para remover este anúncio.', 
          isLoading: false 
        });
        return false;
      }
      
      // Se existirem fotos, excluir do storage
      if (adData.photos && adData.photos.length > 0) {
        for (let i = 0; i < adData.photos.length; i++) {
          try {
            const storage = getStorage();
            // Extrair o caminho do storage da URL
            const photoPath = adData.photos[i].split('advertisements%2F')[1].split('?')[0];
            const photoRef = ref(storage, `advertisements/${photoPath}`);
            await deleteObject(photoRef);
          } catch (error) {
            console.error(`Erro ao excluir imagem ${i}:`, error);
          }
        }
      }
      
      // Remover do Firestore
      await deleteDoc(adRef);
      
      console.log('Anúncio removido com sucesso');
      
      // Atualizar o estado local
      const updatedAds = get().advertisements.filter(ad => ad.id !== advertisementId);
      
      set({ 
        advertisements: updatedAds, 
        isLoading: false 
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao remover anúncio:', error);
      set({ 
        error: 'Falha ao remover o anúncio. Tente novamente.', 
        isLoading: false 
      });
      return false;
    }
  },

  toggleLike: async (advertisementId: string) => {
    try {
      const auth = getAuth();
      
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        set({ error: 'Você precisa estar autenticado para curtir anúncios.' });
        return false;
      }
      
      const userId = auth.currentUser.uid;
      const db = getFirestore();
      const adRef = doc(db, 'advertisements', advertisementId);
      
      // Verificar se o anúncio existe
      const adSnap = await getDoc(adRef);
      if (!adSnap.exists()) {
        set({ error: 'Anúncio não encontrado.' });
        return false;
      }
      
      // Verificar se o usuário já curtiu o anúncio
      const adData = adSnap.data();
      const likes = adData.likes || [];
      const hasLiked = likes.includes(userId);
      
      // Adicionar ou remover o like
      if (hasLiked) {
        await updateDoc(adRef, {
          likes: arrayRemove(userId)
        });
      } else {
        await updateDoc(adRef, {
          likes: arrayUnion(userId)
        });
      }
      
      // Atualizar estado local
      const updatedAds = get().advertisements.map(ad => {
        if (ad.id === advertisementId) {
          const updatedLikes = hasLiked
            ? ad.likes.filter(id => id !== userId)
            : [...ad.likes, userId];
          
          return { ...ad, likes: updatedLikes };
        }
        return ad;
      }) as Advertisement[]; // Adicionar asserção de tipo aqui
      
      set({ advertisements: updatedAds });
      
      return true;
    } catch (error) {
      console.error('Erro ao curtir/descurtir anúncio:', error);
      set({ error: 'Falha ao processar sua curtida. Tente novamente.' });
      return false;
    }
  },

  markAsSold: async (advertisementId: string) => {
    try {
      const auth = getAuth();
      
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        set({ error: 'Você precisa estar autenticado para marcar anúncios como vendidos.' });
        return false;
      }
      
      const userId = auth.currentUser.uid;
      const db = getFirestore();
      const adRef = doc(db, 'advertisements', advertisementId);
      
      // Verificar se o anúncio existe
      const adSnap = await getDoc(adRef);
      if (!adSnap.exists()) {
        set({ error: 'Anúncio não encontrado.' });
        return false;
      }
      
      // Verificar se o usuário é o dono do anúncio
      const adData = adSnap.data();
      if (adData.createdBy !== userId) {
        set({ error: 'Você não tem permissão para marcar este anúncio como vendido.' });
        return false;
      }
      
      // Atualizar o status
      await updateDoc(adRef, {
        status: 'sold',
        updatedAt: serverTimestamp()
      });
      
      // Atualizar estado local
      const updatedAds = get().advertisements.map(ad => {
        if (ad.id === advertisementId) {
          return { ...ad, status: 'sold' };
        }
        return ad;
      }) as Advertisement[]; // Adicionar asserção de tipo aqui
      
      set({ advertisements: updatedAds });
      
      return true;
    } catch (error) {
      console.error('Erro ao marcar anúncio como vendido:', error);
      set({ error: 'Falha ao atualizar o status do anúncio. Tente novamente.' });
      return false;
    }
  },

  placeBid: async (advertisementId: string, bidAmount: number) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        set({ error: 'Você precisa estar autenticado para dar um lance.' });
        set({ isLoading: false });
        return false;
      }
      
      const userId = auth.currentUser.uid;
      const db = getFirestore();
      const adRef = doc(db, 'advertisements', advertisementId);
      
      // Verificar se o anúncio existe
      const adSnap = await getDoc(adRef);
      if (!adSnap.exists()) {
        set({ error: 'Anúncio não encontrado.' });
        set({ isLoading: false });
        return false;
      }
      
      // Obter dados do anúncio
      const adData = adSnap.data() as Advertisement;
      
      // Verificar se é um leilão
      if (!adData.isAuction) {
        set({ error: 'Este anúncio não é um leilão.' });
        set({ isLoading: false });
        return false;
      }
      
      // Verificar se o leilão ainda está ativo
      if (adData.auctionEndDate && adData.auctionEndDate < Date.now()) {
        set({ error: 'Este leilão já foi encerrado.' });
        set({ isLoading: false });
        return false;
      }
      
      // Verificar se o lance é maior que o atual
      if (adData.currentBid && bidAmount <= adData.currentBid) {
        set({ error: 'Seu lance deve ser maior que o lance atual.' });
        set({ isLoading: false });
        return false;
      }
      
      // Obter informações do usuário
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      
      // Criar objeto do lance
      const bid = {
        userId,
        userName: userData?.name || 'Usuário Anônimo',
        amount: bidAmount,
        createdAt: Date.now()
      };
      
      // Atualizar o anúncio com o novo lance
      await updateDoc(adRef, {
        currentBid: bidAmount,
        bids: arrayUnion(bid)
      });
      
      // Atualizar o estado local
      const updatedAds = get().advertisements.map(ad => {
        if (ad.id === advertisementId) {
          return { 
            ...ad, 
            currentBid: bidAmount,
            bids: [...(ad.bids || []), bid]
          };
        }
        return ad;
      });
      
      set({ 
        advertisements: updatedAds,
        isLoading: false
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao dar lance:', error);
      set({ 
        error: 'Falha ao processar seu lance. Tente novamente.', 
        isLoading: false 
      });
      return false;
    }
  },
  
  getAuctionBids: async (advertisementId: string) => {
    try {
      const ad = get().advertisements.find(ad => ad.id === advertisementId);
      if (!ad || !ad.isAuction) {
        return [];
      }
      
      return ad.bids || [];
    } catch (error) {
      console.error('Erro ao obter lances do leilão:', error);
      return [];
    }
  },
  
  checkAuctionStatus: async (advertisementId: string) => {
    try {
      const ad = get().getAdvertisement(advertisementId);
      
      if (!ad || !ad.isAuction) {
        return false;
      }
      
      // Verificar se o leilão já encerrou
      if (ad.auctionEndDate && ad.auctionEndDate < Date.now()) {
        // Se o leilão terminou e ainda não foi marcado como vendido
        if (ad.status !== 'sold') {
          const db = getFirestore();
          const adRef = doc(db, 'advertisements', advertisementId);
          
          // Marcar como vendido
          await updateDoc(adRef, {
            status: 'sold',
            updatedAt: serverTimestamp()
          });
          
          // Atualizar localmente
          const updatedAds = get().advertisements.map(a => {
            if (a.id === advertisementId) {
              return { ...a, status: 'sold' as const };
            }
            return a;
          }) as Advertisement[]; // Adicionar asserção de tipo aqui
          
          set({ advertisements: updatedAds });
        }
        
        return true; // Leilão encerrado
      }
      
      return false; // Leilão ainda ativo
    } catch (error) {
      console.error('Erro ao verificar status do leilão:', error);
      return false;
    }
  },

  incrementViews: async (advertisementId: string) => {
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        console.log('Usuário não autenticado - não é possível registrar visualização');
        return false;
      }
      
      const userId = auth.currentUser.uid;
      const adRef = doc(db, 'advertisements', advertisementId);
      
      // Obter anúncio atual para verificar se o usuário já visualizou
      const adDoc = await getDoc(adRef);
      
      if (!adDoc.exists()) {
        console.log('Anúncio não encontrado');
        return false;
      }
      
      const adData = adDoc.data();
      const views = adData.views || [];
      const viewCount = adData.viewCount || 0;
      
      // Verificar se o usuário já visualizou este anúncio
      if (views.includes(userId)) {
        console.log('Usuário já visualizou este anúncio');
        return true; // Não adiciona visualização duplicada
      }
      
      // Atualizar o documento com a nova visualização
      await updateDoc(adRef, {
        views: arrayUnion(userId),
        viewCount: viewCount + 1
      });
      
      // Atualizar o estado local
      set(state => ({
        advertisements: state.advertisements.map(ad => 
          ad.id === advertisementId 
            ? { 
                ...ad, 
                views: [...(ad.views || []), userId],
                viewCount: (ad.viewCount || 0) + 1
              } 
            : ad
        )
      }));
      
      return true;
    } catch (error) {
      console.error('Erro ao incrementar visualizações:', error);
      return false;
    }
  },

  addComment: async (advertisementId: string, text: string) => {
    try {
      const auth = getAuth();
      
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        set({ error: 'Você precisa estar autenticado para comentar em anúncios.' });
        return false;
      }
      
      const userId = auth.currentUser.uid;
      const db = getFirestore();
      const adRef = doc(db, 'advertisements', advertisementId);
      
      // Verificar se o anúncio existe
      const adSnap = await getDoc(adRef);
      if (!adSnap.exists()) {
        set({ error: 'Anúncio não encontrado.' });
        return false;
      }
      
      const adData = adSnap.data();
      const advertisement = get().getAdvertisement(advertisementId);
      
      if (!advertisement) {
        set({ error: 'Anúncio não encontrado no estado local.' });
        return false;
      }
      
      // Buscar informações do usuário 
      const user = auth.currentUser;
      const userCollection = collection(db, 'users');
      const userSnapshot = await getDoc(doc(userCollection, userId));
      const userData = userSnapshot.data();
      
      // Criar o comentário
      const newComment: Comment = {
        id: `comment_${Date.now()}`,
        text,
        createdAt: Date.now(),
        createdBy: userId,
        userName: userData?.name || user.displayName || user.email || 'Usuário',
        userUnit: userData?.unit || '',
        isOwnerResponse: userId === adData.createdBy
      };
      
      // Adicionar o comentário ao anúncio
      const comments = adData.comments || [];
      
      // Converter para um formato seguro para o Firestore
      // O Firestore não aceita valores undefined
      const firestoreSafeComment = Object.fromEntries(
        Object.entries(newComment).map(([key, value]) => [key, value === undefined ? null : value])
      );
      
      await updateDoc(adRef, {
        comments: [...comments, firestoreSafeComment]
      });
      
      // Atualizar estado local
      const updatedAds = get().advertisements.map(ad => {
        if (ad.id === advertisementId) {
          return { 
            ...ad, 
            comments: [...(ad.comments || []), newComment]
          };
        }
        return ad;
      }) as Advertisement[];
      
      set({ advertisements: updatedAds });
      
      // Enviar notificação para o proprietário do anúncio (se não for ele mesmo quem comentou)
      if (userId !== adData.createdBy) {
        // Buscar informações do proprietário do anúncio
        const ownerSnapshot = await getDoc(doc(userCollection, adData.createdBy));
        const ownerData = ownerSnapshot.data();
        const ownerName = ownerData?.name || 'Proprietário';
        
        await createNotification({
          title: 'Novo Comentário no seu Anúncio',
          message: `${newComment.userName} comentou no seu anúncio "${advertisement.title}".`,
          type: 'advertisement',
          relatedItemId: advertisementId,
          // Enviar apenas para o proprietário do anúncio
          targetUserId: adData.createdBy
        });
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      set({ error: 'Falha ao adicionar comentário. Tente novamente.' });
      return false;
    }
  },
  
  replyToComment: async (advertisementId: string, commentId: string, text: string) => {
    try {
      const auth = getAuth();
      
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        set({ error: 'Você precisa estar autenticado para responder a comentários.' });
        return false;
      }
      
      const userId = auth.currentUser.uid;
      const db = getFirestore();
      const adRef = doc(db, 'advertisements', advertisementId);
      
      // Verificar se o anúncio existe
      const adSnap = await getDoc(adRef);
      if (!adSnap.exists()) {
        set({ error: 'Anúncio não encontrado.' });
        return false;
      }
      
      const adData = adSnap.data();
      
      // Verificar se o usuário é o dono do anúncio (apenas o dono pode responder)
      if (adData.createdBy !== userId) {
        set({ error: 'Apenas o dono do anúncio pode responder aos comentários.' });
        return false;
      }
      
      const advertisement = get().getAdvertisement(advertisementId);
      
      if (!advertisement) {
        set({ error: 'Anúncio não encontrado no estado local.' });
        return false;
      }
      
      // Verificar se o comentário original existe
      const comments = adData.comments || [];
      const originalComment = comments.find((c: Comment) => c.id === commentId);
      
      if (!originalComment) {
        set({ error: 'Comentário não encontrado.' });
        return false;
      }
      
      // Buscar informações do usuário 
      const user = auth.currentUser;
      const userCollection = collection(db, 'users');
      const userSnapshot = await getDoc(doc(userCollection, userId));
      const userData = userSnapshot.data();
      
      // Criar a resposta
      const newReply: Comment = {
        id: `reply_${Date.now()}`,
        text,
        createdAt: Date.now(),
        createdBy: userId,
        userName: userData?.name || user.displayName || user.email || 'Usuário',
        userUnit: userData?.unit || '',
        isOwnerResponse: true,
        replyTo: commentId
      };
      
      // Adicionar a resposta ao anúncio
      // Converter para um formato seguro para o Firestore
      // O Firestore não aceita valores undefined
      const firestoreSafeReply = Object.fromEntries(
        Object.entries(newReply).map(([key, value]) => [key, value === undefined ? null : value])
      );
      
      await updateDoc(adRef, {
        comments: [...comments, firestoreSafeReply]
      });
      
      // Atualizar estado local
      const updatedAds = get().advertisements.map(ad => {
        if (ad.id === advertisementId) {
          return { 
            ...ad, 
            comments: [...(ad.comments || []), newReply]
          };
        }
        return ad;
      }) as Advertisement[];
      
      set({ advertisements: updatedAds });
      
      // Enviar notificação para o autor do comentário original
      if (originalComment.createdBy !== userId) {
        await createNotification({
          title: 'Resposta ao seu Comentário',
          message: `O proprietário respondeu ao seu comentário no anúncio "${advertisement.title}".`,
          type: 'advertisement',
          relatedItemId: advertisementId,
          // Enviar apenas para o autor do comentário original
          targetUserId: originalComment.createdBy
        });
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao responder comentário:', error);
      set({ error: 'Falha ao responder ao comentário. Tente novamente.' });
      return false;
    }
  },
  
  getComments: (advertisementId: string) => {
    const advertisement = get().getAdvertisement(advertisementId);
    return advertisement?.comments || [];
  }
})); 