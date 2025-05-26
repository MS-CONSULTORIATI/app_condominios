import { create } from 'zustand';
import { 
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp, 
  Timestamp,
  arrayUnion 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db } from '@/lib/firebase';
import { ServiceProvider, ServiceProviderRating } from '@/types';
import { useAuthStore } from './auth-store';

interface ServiceProvidersState {
  serviceProviders: ServiceProvider[];
  isLoading: boolean;
  error: string | null;
  fetchServiceProviders: () => Promise<void>;
  addServiceProvider: (serviceProvider: Omit<ServiceProvider, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<string>;
  updateServiceProvider: (id: string, data: Partial<Omit<ServiceProvider, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>) => Promise<boolean>;
  deleteServiceProvider: (id: string) => Promise<boolean>;
  uploadProviderPhoto: (id: string, uri: string) => Promise<string | null>;
  getServiceProviderById: (id: string) => ServiceProvider | null;
  addRating: (providerId: string, rating: Omit<ServiceProviderRating, 'id' | 'createdAt'>) => Promise<boolean>;
  uploadRatingPhoto: (providerId: string, ratingId: string, uri: string) => Promise<string | null>;
  uploadAdditionalPhoto: (providerId: string, uri: string) => Promise<string | null>;
}

export const useServiceProvidersStore = create<ServiceProvidersState>((set, get) => ({
  serviceProviders: [],
  isLoading: false,
  error: null,

  fetchServiceProviders: async () => {
    set({ isLoading: true, error: null });
    try {
      const serviceProvidersRef = collection(db, 'serviceProviders');
      const q = query(serviceProvidersRef, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const serviceProviders: ServiceProvider[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const ratings = data.ratings || [];
        
        // Calculate average rating if ratings exist
        let avgRating = 0;
        let reviewCount = 0;
        
        if (ratings && ratings.length > 0) {
          reviewCount = ratings.length;
          const totalRating = ratings.reduce((sum: number, rating: any) => sum + (rating.rating || 0), 0);
          avgRating = totalRating / reviewCount;
        }
        
        serviceProviders.push({
          id: doc.id,
          name: data.name,
          serviceType: data.serviceType,
          description: data.description,
          phone: data.phone,
          whatsapp: data.whatsapp,
          photo: data.photo,
          photos: data.photos || [],
          ratings: ratings,
          avgRating,
          reviewCount,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          updatedAt: data.updatedAt?.toMillis() || Date.now(),
          createdBy: data.createdBy,
          updatedBy: data.updatedBy
        });
      });
      
      set({ serviceProviders, isLoading: false });
      console.log(`Carregados ${serviceProviders.length} prestadores de serviço`);
    } catch (error: any) {
      console.error('Erro ao buscar prestadores de serviço:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  addServiceProvider: async (serviceProviderData) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const serviceProvidersRef = collection(db, 'serviceProviders');
      const newServiceProvider = {
        ...serviceProviderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.id
      };
      
      const docRef = await addDoc(serviceProvidersRef, newServiceProvider);
      
      await get().fetchServiceProviders();
      set({ isLoading: false });
      
      return docRef.id;
    } catch (error: any) {
      console.error('Erro ao adicionar prestador de serviço:', error);
      set({ error: error.message, isLoading: false });
      return '';
    }
  },

  updateServiceProvider: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const serviceProviderRef = doc(db, 'serviceProviders', id);
      
      await updateDoc(serviceProviderRef, {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: user.id
      });
      
      await get().fetchServiceProviders();
      set({ isLoading: false });
      
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar prestador de serviço:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  deleteServiceProvider: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Verificar se há foto para excluir
      const serviceProvider = get().getServiceProviderById(id);
      if (serviceProvider?.photo) {
        try {
          const storage = getStorage();
          const photoRef = ref(storage, serviceProvider.photo);
          await deleteObject(photoRef);
          console.log('Foto do prestador excluída com sucesso');
        } catch (photoError) {
          console.error('Erro ao excluir foto do prestador:', photoError);
          // Continuar mesmo se falhar a exclusão da foto
        }
      }

      const serviceProviderRef = doc(db, 'serviceProviders', id);
      await deleteDoc(serviceProviderRef);
      
      await get().fetchServiceProviders();
      set({ isLoading: false });
      
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir prestador de serviço:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  uploadProviderPhoto: async (id, uri) => {
    set({ isLoading: true, error: null });
    try {
      const storage = getStorage();
      
      // Criar nome único para o arquivo
      const fileName = `service-provider-${id}-${Date.now()}.jpg`;
      const storageRef = ref(storage, `service-providers/${fileName}`);
      
      // Converter a URI para blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Fazer upload do blob
      const uploadTask = await uploadBytes(storageRef, blob);
      
      // Obter a URL de download
      const downloadURL = await getDownloadURL(uploadTask.ref);
      
      // Atualizar o documento com a URL da foto
      await get().updateServiceProvider(id, { photo: downloadURL });
      
      set({ isLoading: false });
      return downloadURL;
    } catch (error: any) {
      console.error('Erro ao fazer upload da foto:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  getServiceProviderById: (id) => {
    return get().serviceProviders.find(provider => provider.id === id) || null;
  },

  // Adicionar avaliação a um prestador de serviço
  addRating: async (providerId, ratingData) => {
    set({ isLoading: true, error: null });
    try {
      // Generate a unique ID for the rating
      const ratingId = `rating_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      
      const serviceProviderRef = doc(db, 'serviceProviders', providerId);
      
      const newRating: ServiceProviderRating = {
        ...ratingData,
        id: ratingId,
        createdAt: Date.now(),
        photos: ratingData.photos || []
      };

      // Add the rating to the array
      await updateDoc(serviceProviderRef, {
        ratings: arrayUnion(newRating)
      });
      
      // Fetch updated data
      await get().fetchServiceProviders();
      
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      console.error('Erro ao adicionar avaliação:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  // Upload de foto para uma avaliação
  uploadRatingPhoto: async (providerId, ratingId, uri) => {
    set({ isLoading: true, error: null });
    try {
      const storage = getStorage();
      
      // Criar nome único para o arquivo
      const fileName = `rating-photo-${providerId}-${ratingId}-${Date.now()}.jpg`;
      const storageRef = ref(storage, `service-providers/ratings/${fileName}`);
      
      // Converter a URI para blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Fazer upload do blob
      const uploadTask = await uploadBytes(storageRef, blob);
      
      // Obter a URL de download
      const downloadURL = await getDownloadURL(uploadTask.ref);
      
      set({ isLoading: false });
      return downloadURL;
    } catch (error: any) {
      console.error('Erro ao fazer upload da foto da avaliação:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  // Upload de foto adicional para um prestador de serviço
  uploadAdditionalPhoto: async (providerId, uri) => {
    set({ isLoading: true, error: null });
    try {
      const storage = getStorage();
      
      // Criar nome único para o arquivo
      const fileName = `provider-photo-${providerId}-${Date.now()}.jpg`;
      const storageRef = ref(storage, `service-providers/photos/${fileName}`);
      
      // Converter a URI para blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Fazer upload do blob
      const uploadTask = await uploadBytes(storageRef, blob);
      
      // Obter a URL de download
      const downloadURL = await getDownloadURL(uploadTask.ref);
      
      // Get the current provider
      const currentProvider = get().getServiceProviderById(providerId);
      const currentPhotos = currentProvider?.photos || [];
      
      // Update the provider document with the new photo URL
      await updateDoc(doc(db, 'serviceProviders', providerId), {
        photos: [...currentPhotos, downloadURL]
      });
      
      // Refresh data
      await get().fetchServiceProviders();
      
      set({ isLoading: false });
      return downloadURL;
    } catch (error: any) {
      console.error('Erro ao fazer upload da foto adicional:', error);
      set({ error: error.message, isLoading: false });
      return null;
    }
  }
})); 