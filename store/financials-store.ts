import { create } from 'zustand';
import { Financial } from '@/types';
import * as firebase from '@/lib/firebase';

interface FinancialsState {
  financials: Financial[];
  selectedFinancial: Financial | null;
  isLoading: boolean;
  error: string | null;
  
  fetchFinancials: () => Promise<void>;
  getFinancialById: (financialId: string) => Financial | null;
  getFinancialByIdFromFirebase: (financialId: string) => Promise<Financial | null>;
  setSelectedFinancial: (financial: Financial | null) => void;
  createFinancial: (financialData: Omit<Financial, 'id' | 'createdAt'>) => Promise<void>;
  updateFinancial: (financialId: string, financialData: Partial<Financial>) => Promise<void>;
  deleteFinancial: (financialId: string) => Promise<void>;
  clearError: () => void;
}

export const useFinancialsStore = create<FinancialsState>((set, get) => ({
  financials: [],
  selectedFinancial: null,
  isLoading: false,
  error: null,
  
  fetchFinancials: async () => {
    set({ isLoading: true, error: null });
    try {
      const financials = await firebase.getFinancials();
      set({ financials, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Falha ao buscar registros financeiros", 
        isLoading: false 
      });
    }
  },
  
  getFinancialById: (financialId: string) => {
    return get().financials.find(financial => financial.id === financialId) || null;
  },
  
  getFinancialByIdFromFirebase: async (financialId: string) => {
    set({ isLoading: true, error: null });
    try {
      const financial = await firebase.getFinancialById(financialId);
      set({ isLoading: false });
      return financial;
    } catch (error: any) {
      set({ 
        error: error.message || "Falha ao buscar registro financeiro", 
        isLoading: false 
      });
      return null;
    }
  },
  
  setSelectedFinancial: (financial: Financial | null) => {
    set({ selectedFinancial: financial });
  },
  
  createFinancial: async (financialData: Omit<Financial, 'id' | 'createdAt'>) => {
    set({ isLoading: true, error: null });
    try {
      // Criar o registro financeiro
      await firebase.createFinancial(financialData);
      
      // Buscar registros atualizados
      const financials = await firebase.getFinancials();
      
      // Atualizar o estado com os novos dados e finalizar o carregamento
      set({ financials, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Falha ao criar registro financeiro", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  updateFinancial: async (financialId: string, financialData: Partial<Financial>) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.updateFinancial(financialId, financialData);
      
      // Buscar registros atualizados
      const financials = await firebase.getFinancials();
      
      // Atualizar o estado uma única vez
      set({ financials, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Falha ao atualizar registro financeiro", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  deleteFinancial: async (financialId: string) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.deleteFinancial(financialId);
      
      // Atualizar estado local para remover o registro excluído
      const updatedFinancials = get().financials.filter(financial => financial.id !== financialId);
      set({ financials: updatedFinancials, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Falha ao excluir registro financeiro", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  clearError: () => set({ error: null }),
})); 