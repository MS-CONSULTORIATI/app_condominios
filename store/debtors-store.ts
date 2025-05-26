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
  where
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Debtor } from '@/types';

interface DebtorsState {
  debtors: Debtor[];
  isLoading: boolean;
  error: string | null;
  fetchDebtors: () => Promise<void>;
  getDebtor: (debtorId: string) => Debtor | undefined;
  createDebtor: (debtor: Omit<Debtor, 'id' | 'createdAt' | 'createdBy'>) => Promise<string | null>;
  updateDebtor: (debtor: Pick<Debtor, 'id'> & Partial<Omit<Debtor, 'createdAt' | 'createdBy'>>) => Promise<boolean>;
  removeDebtor: (debtorId: string) => Promise<boolean>;
  getStats: () => { total: number, amount: number, pendingCount: number, pendingAmount: number };
  canViewFullDetails: boolean;
}

export const useDebtorsStore = create<DebtorsState>((set, get) => ({
  debtors: [],
  isLoading: false,
  error: null,
  canViewFullDetails: false,

  fetchDebtors: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        console.log('Usuário não autenticado - retornando lista vazia');
        set({ 
          debtors: [], 
          isLoading: false,
          canViewFullDetails: false
        });
        return;
      }
      
      // Buscar dados do usuário para verificar a role
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      // Verificar se é admin/manager para permissão de detalhes completos
      const isAdminOrManager = userSnap.exists() && 
        (userSnap.data().role === 'manager' || userSnap.data().role === 'admin');
      
      // Buscar inadimplentes do Firestore
      console.log('Buscando dados de inadimplentes do Firestore');
      const debtorsQuery = query(
        collection(db, 'debtors'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(debtorsQuery);
      
      if (querySnapshot.empty) {
        console.log('Nenhum inadimplente encontrado no Firestore');
        set({ 
          debtors: [], 
          isLoading: false,
          canViewFullDetails: isAdminOrManager
        });
        return;
      }
      
      const debtorsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Converter timestamp do Firestore para número
        const createdAt = data.createdAt instanceof Timestamp 
          ? data.createdAt.toMillis() 
          : data.createdAt || Date.now();
          
        const updatedAt = data.updatedAt instanceof Timestamp 
          ? data.updatedAt.toMillis() 
          : data.updatedAt;
          
        const dueDate = data.dueDate instanceof Timestamp
          ? data.dueDate.toMillis()
          : data.dueDate;
          
        return { 
          id: doc.id,
          ...data,
          createdAt,
          updatedAt,
          dueDate
        } as Debtor;
      });
      
      console.log(`Encontrados ${debtorsData.length} inadimplentes no Firestore`);
      
      // Se não for admin/manager, definir array vazio para debtors
      // mas permitir que os stats ainda possam ser calculados
      if (!isAdminOrManager) {
        set({
          // Para residentes comuns, armazenamos os dados apenas para estatísticas
          // mas não os expomos diretamente na interface
          debtors: debtorsData,
          isLoading: false,
          canViewFullDetails: false
        });
      } else {
        set({ 
          debtors: debtorsData, 
          isLoading: false,
          canViewFullDetails: true
        });
      }
      
    } catch (error) {
      console.error('Erro ao buscar inadimplentes:', error);
      set({ 
        error: 'Falha ao carregar os inadimplentes. Tente novamente.', 
        isLoading: false
      });
    }
  },

  getDebtor: (debtorId: string) => {
    return get().debtors.find(debtor => debtor.id === debtorId);
  },

  getStats: () => {
    const debtors = get().debtors;
    const total = debtors.length;
    const amount = debtors.reduce((sum, debtor) => sum + debtor.amount, 0);
    
    const pendingDebtors = debtors.filter(debtor => debtor.status === 'pending');
    const pendingCount = pendingDebtors.length;
    const pendingAmount = pendingDebtors.reduce((sum, debtor) => sum + debtor.amount, 0);
    
    return { total, amount, pendingCount, pendingAmount };
  },

  createDebtor: async (debtorData) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Verificar se o usuário está autenticado
      if (!auth.currentUser) {
        console.log('Usuário não autenticado');
        set({ 
          error: 'Você precisa estar autenticado para cadastrar inadimplentes.', 
          isLoading: false 
        });
        return null;
      }
      
      // Verificar se o usuário é manager ou admin
      const db = getFirestore();
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists() || 
          (userSnap.data().role !== 'manager' && userSnap.data().role !== 'admin')) {
        console.log('Usuário sem permissão');
        set({ 
          error: 'Você não tem permissão para cadastrar inadimplentes.', 
          isLoading: false 
        });
        return null;
      }
      
      // Salvar no Firestore
      console.log('Criando inadimplente no Firestore');
      const debtorsRef = collection(db, 'debtors');
      
      const docRef = await addDoc(debtorsRef, {
        ...debtorData,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      
      console.log('Inadimplente criado com ID:', docRef.id);
      
      // Refetch para sincronizar
      get().fetchDebtors();
      
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar inadimplente:', error);
      set({ 
        error: 'Falha ao cadastrar o inadimplente. Tente novamente.', 
        isLoading: false 
      });
      return null;
    }
  },

  updateDebtor: async (debtor) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      const debtorId = debtor.id;
      
      // Verificar permissões
      if (!auth.currentUser) {
        console.log('Usuário não autenticado');
        set({ 
          error: 'Você precisa estar autenticado para atualizar inadimplentes.', 
          isLoading: false 
        });
        return false;
      }
      
      // Verificar se o usuário é manager ou admin
      const db = getFirestore();
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists() || 
          (userSnap.data().role !== 'manager' && userSnap.data().role !== 'admin')) {
        console.log('Usuário sem permissão');
        set({ 
          error: 'Você não tem permissão para atualizar inadimplentes.', 
          isLoading: false 
        });
        return false;
      }
      
      // Verificar se o inadimplente existe
      const debtorRef = doc(db, 'debtors', debtorId);
      const debtorSnap = await getDoc(debtorRef);
      
      if (!debtorSnap.exists()) {
        set({ 
          error: 'Inadimplente não encontrado.', 
          isLoading: false 
        });
        return false;
      }
      
      // Removendo o id antes de enviar para o Firestore
      const { id, ...debtorData } = debtor;
      
      // Atualizar no Firestore
      await updateDoc(debtorRef, {
        ...debtorData,
        updatedAt: serverTimestamp()
      });
      
      console.log('Inadimplente atualizado com sucesso');
      
      // Refetch para sincronizar
      get().fetchDebtors();
      
      set({ isLoading: false });
      return true;
      
    } catch (error) {
      console.error('Erro ao atualizar inadimplente:', error);
      set({ 
        error: 'Falha ao atualizar o inadimplente. Tente novamente.', 
        isLoading: false 
      });
      return false;
    }
  },

  removeDebtor: async (debtorId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Verificar permissões
      if (!auth.currentUser) {
        console.log('Usuário não autenticado');
        set({ 
          error: 'Você precisa estar autenticado para remover inadimplentes.', 
          isLoading: false 
        });
        return false;
      }
      
      // Verificar se o usuário é manager ou admin
      const db = getFirestore();
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists() || 
          (userSnap.data().role !== 'manager' && userSnap.data().role !== 'admin')) {
        console.log('Usuário sem permissão');
        set({ 
          error: 'Você não tem permissão para remover inadimplentes.', 
          isLoading: false 
        });
        return false;
      }
      
      // Verificar se o inadimplente existe
      const debtorRef = doc(db, 'debtors', debtorId);
      const debtorSnap = await getDoc(debtorRef);
      
      if (!debtorSnap.exists()) {
        set({ 
          error: 'Inadimplente não encontrado.', 
          isLoading: false 
        });
        return false;
      }
      
      // Remover do Firestore
      await deleteDoc(debtorRef);
      
      console.log('Inadimplente removido com sucesso');
      
      // Atualizar o estado local
      const updatedDebtors = get().debtors.filter(debtor => debtor.id !== debtorId);
      
      set({ 
        debtors: updatedDebtors, 
        isLoading: false 
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao remover inadimplente:', error);
      set({ 
        error: 'Falha ao remover o inadimplente. Tente novamente.', 
        isLoading: false 
      });
      return false;
    }
  }
})); 