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
  getDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Definição do tipo Pet
export interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'other';
  breed?: string;
  age?: number;
  color?: string;
  photoURL?: string;
  description?: string;
  ownerName: string;
  ownerUnit: string;
  ownerId: string;
  createdAt: number;
  updatedAt?: number;
}

interface PetsState {
  pets: Pet[];
  isLoading: boolean;
  error: string | null;
  fetchPets: () => Promise<void>;
  getPet: (petId: string) => Pet | undefined;
  createPet: (pet: Omit<Pet, 'id' | 'createdAt' | 'ownerId'>, imageUri?: string) => Promise<string | null>;
  updatePet: (petId: string, pet: Partial<Omit<Pet, 'id' | 'createdAt' | 'ownerId'>>, imageUri?: string) => Promise<boolean>;
  removePet: (petId: string) => Promise<boolean>;
  getMyPets: () => Pet[];
}

export const usePetsStore = create<PetsState>((set, get) => ({
  pets: [],
  isLoading: false,
  error: null,

  fetchPets: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      // Para usuários não autenticados, retornar lista vazia
      if (!auth.currentUser || auth.currentUser.uid === 'anonymous-user') {
        console.log('Usuário anônimo ou não autenticado - retornando lista vazia');
        set({ 
          pets: [], 
          isLoading: false 
        });
        return;
      }
      
      // Buscar pets do Firestore
      console.log('Buscando pets do Firestore');
      const petsQuery = query(
        collection(db, 'pets'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(petsQuery);
      
      if (querySnapshot.empty) {
        console.log('Nenhum pet encontrado no Firestore');
        set({ 
          pets: [], 
          isLoading: false 
        });
        return;
      }
      
      const petsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Converter timestamp do Firestore para número
        const createdAt = data.createdAt instanceof Timestamp 
          ? data.createdAt.toMillis() 
          : data.createdAt || Date.now();
          
        const updatedAt = data.updatedAt instanceof Timestamp 
          ? data.updatedAt.toMillis() 
          : data.updatedAt;
          
        return { 
          id: doc.id,
          ...data,
          createdAt,
          updatedAt
        } as Pet;
      });
      
      console.log(`Encontrados ${petsData.length} pets no Firestore`);
      
      set({ 
        pets: petsData, 
        isLoading: false 
      });
      
    } catch (error) {
      console.error('Erro ao buscar pets:', error);
      set({ 
        error: 'Falha ao carregar os pets. Tente novamente.', 
        isLoading: false 
      });
    }
  },

  getPet: (petId: string) => {
    return get().pets.find(pet => pet.id === petId);
  },

  getMyPets: () => {
    const auth = getAuth();
    if (!auth.currentUser) return [];
    
    return get().pets.filter(pet => pet.ownerId === auth.currentUser!.uid);
  },

  createPet: async (petData, imageUri) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Usuário não autenticado, retornar erro
      if (!auth.currentUser || auth.currentUser.uid === 'anonymous-user') {
        console.log('Usuário anônimo, operação não permitida');
        set({ 
          error: 'Você precisa estar autenticado para cadastrar pets.', 
          isLoading: false 
        });
        return null;
      }
      
      let photoURL = undefined;
      
      // Upload da imagem para o Storage se existir
      if (imageUri) {
        try {
          // Referência para o arquivo no Storage
          const storage = getStorage();
          const imageName = `${Date.now()}_${auth.currentUser.uid}`;
          const imageRef = ref(storage, `pets/${imageName}`);
          
          // Converter uri para blob
          const response = await fetch(imageUri);
          const blob = await response.blob();
          
          // Fazer upload
          await uploadBytes(imageRef, blob);
          
          // Obter URL da imagem
          photoURL = await getDownloadURL(imageRef);
          console.log('Imagem enviada com sucesso:', photoURL);
          
        } catch (error) {
          console.error('Erro ao fazer upload da imagem:', error);
          set({ error: 'Falha ao enviar a imagem. O pet será salvo sem foto.', isLoading: false });
          // Continuar com o cadastro mesmo sem a imagem
        }
      }
      
      // Salvar no Firestore
      console.log('Criando pet no Firestore');
      const db = getFirestore();
      const petsRef = collection(db, 'pets');
      
      // Remover campos undefined
      const cleanPetData = Object.fromEntries(Object.entries({
        ...petData,
        photoURL,
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      }).filter(([_, v]) => v !== undefined));

      const docRef = await addDoc(petsRef, cleanPetData);
      
      console.log('Pet criado com ID:', docRef.id);
      
      // Refetch para garantir sincronização
      get().fetchPets();
      
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar pet:', error);
      set({ 
        error: 'Falha ao cadastrar o pet. Tente novamente.', 
        isLoading: false 
      });
      return null;
    }
  },

  updatePet: async (petId, petData, imageUri) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Usuário não autenticado, retornar erro
      if (!auth.currentUser || auth.currentUser.uid === 'anonymous-user') {
        console.log('Usuário anônimo, operação não permitida');
        set({ 
          error: 'Você precisa estar autenticado para atualizar pets.', 
          isLoading: false 
        });
        return false;
      }
      
      // Verificar se o pet existe
      const db = getFirestore();
      const petRef = doc(db, 'pets', petId);
      const petSnap = await getDoc(petRef);
      
      if (!petSnap.exists()) {
        set({ 
          error: 'Pet não encontrado.', 
          isLoading: false 
        });
        return false;
      }
      
      const petDoc = petSnap.data();
      
      // Verificar se o usuário é o dono do pet ou admin
      if (petDoc.ownerId !== auth.currentUser.uid && auth.currentUser.role !== 'admin') {
        set({ 
          error: 'Você não tem permissão para editar este pet.', 
          isLoading: false 
        });
        return false;
      }
      
      let photoURL = petData.photoURL || petDoc.photoURL;
      
      // Upload da nova imagem para o Storage se existir
      if (imageUri) {
        try {
          // Se já existe uma imagem, deletar a anterior
          if (petDoc.photoURL) {
            try {
              const storage = getStorage();
              // Extrair o path da URL
              const oldImagePath = petDoc.photoURL.split('pets%2F')[1].split('?')[0];
              const oldImageRef = ref(storage, `pets/${decodeURIComponent(oldImagePath)}`);
              await deleteObject(oldImageRef);
              console.log('Imagem anterior deletada com sucesso');
            } catch (error) {
              console.error('Erro ao deletar imagem anterior:', error);
              // Continuar mesmo se falhar a deleção
            }
          }
          
          // Referência para o novo arquivo no Storage
          const storage = getStorage();
          const imageName = `${Date.now()}_${auth.currentUser.uid}`;
          const imageRef = ref(storage, `pets/${imageName}`);
          
          // Converter uri para blob
          const response = await fetch(imageUri);
          const blob = await response.blob();
          
          // Fazer upload
          await uploadBytes(imageRef, blob);
          
          // Obter URL da imagem
          photoURL = await getDownloadURL(imageRef);
          console.log('Nova imagem enviada com sucesso:', photoURL);
          
        } catch (error) {
          console.error('Erro ao fazer upload da nova imagem:', error);
          set({ error: 'Falha ao enviar a nova imagem. O pet será atualizado com a foto anterior.', isLoading: false });
          // Continuar com a atualização mesmo sem a nova imagem
        }
      }
      
      // Atualizar no Firestore
      await updateDoc(petRef, {
        ...petData,
        photoURL,
        updatedAt: serverTimestamp()
      });
      
      console.log('Pet atualizado com sucesso');
      
      // Refetch para garantir sincronização
      get().fetchPets();
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar pet:', error);
      set({ 
        error: 'Falha ao atualizar o pet. Tente novamente.', 
        isLoading: false 
      });
      return false;
    }
  },

  removePet: async (petId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Usuário não autenticado, retornar erro
      if (!auth.currentUser || auth.currentUser.uid === 'anonymous-user') {
        console.log('Usuário anônimo, operação não permitida');
        set({ 
          error: 'Você precisa estar autenticado para remover pets.', 
          isLoading: false 
        });
        return false;
      }
      
      // Verificar se o pet existe
      const db = getFirestore();
      const petRef = doc(db, 'pets', petId);
      const petSnap = await getDoc(petRef);
      
      if (!petSnap.exists()) {
        set({ 
          error: 'Pet não encontrado.', 
          isLoading: false 
        });
        return false;
      }
      
      const petDoc = petSnap.data();
      
      // Verificar se o usuário é o dono do pet ou admin
      if (petDoc.ownerId !== auth.currentUser.uid && auth.currentUser.role !== 'admin') {
        set({ 
          error: 'Você não tem permissão para remover este pet.', 
          isLoading: false 
        });
        return false;
      }
      
      // Se existe uma imagem, deletar do Storage
      if (petDoc.photoURL) {
        try {
          const storage = getStorage();
          // Extrair o path da URL
          const imagePath = petDoc.photoURL.split('pets%2F')[1].split('?')[0];
          const imageRef = ref(storage, `pets/${decodeURIComponent(imagePath)}`);
          await deleteObject(imageRef);
          console.log('Imagem deletada com sucesso');
        } catch (error) {
          console.error('Erro ao deletar imagem:', error);
          // Continuar mesmo se falhar a deleção da imagem
        }
      }
      
      // Remover do Firestore
      await deleteDoc(petRef);
      
      console.log('Pet removido com sucesso');
      
      // Atualizar o estado local após a remoção bem-sucedida
      const updatedPets = get().pets.filter(pet => pet.id !== petId);
      
      set({ 
        pets: updatedPets, 
        isLoading: false 
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao remover pet:', error);
      set({ 
        error: 'Falha ao remover o pet. Tente novamente.', 
        isLoading: false 
      });
      return false;
    }
  }
})); 