import { create } from 'zustand';
import { Problem } from '@/types';
import * as firebase from '@/lib/firebase';
import { DocumentReference, DocumentData } from 'firebase/firestore';

interface ProblemsState {
  problems: Problem[];
  isLoading: boolean;
  error: string | null;
  
  fetchProblems: () => Promise<void>;
  createProblem: (problemData: Omit<Problem, 'id' | 'createdAt'>) => Promise<DocumentReference<DocumentData>>;
  updateProblem: (problemId: string, problemData: Partial<Problem>) => Promise<void>;
  deleteProblem: (problemId: string) => Promise<void>;
  recordView: (problemId: string, userId: string) => Promise<void>;
  clearError: () => void;
}

export const useProblemsStore = create<ProblemsState>((set, get) => ({
  problems: [],
  isLoading: false,
  error: null,
  
  fetchProblems: async () => {
    set({ isLoading: true, error: null });
    try {
      const problems = await firebase.getProblems();
      set({ problems, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to fetch problems", 
        isLoading: false 
      });
    }
  },
  
  createProblem: async (problemData) => {
    set({ isLoading: true, error: null });
    try {
      const problemRef = await firebase.createProblem(problemData);
      await get().fetchProblems();
      set({ isLoading: false });
      return problemRef;
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to create problem", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  updateProblem: async (problemId, problemData) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.updateProblem(problemId, problemData);
      await get().fetchProblems();
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to update problem", 
        isLoading: false 
      });
    }
  },
  
  deleteProblem: async (problemId) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.deleteProblem(problemId);
      await get().fetchProblems();
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to delete problem", 
        isLoading: false 
      });
    }
  },
  
  recordView: async (problemId, userId) => {
    try {
      // Obter o problema atual
      const problem = get().problems.find(p => p.id === problemId);
      if (!problem) return;
      
      // Verificar se o usuário já visualizou este problema
      const viewedBy = problem.viewedBy || [];
      if (viewedBy.includes(userId)) return; // Se já visualizou, não faz nada
      
      // Adicionar o usuário à lista de visualizações e incrementar a contagem
      const updatedViewedBy = [...viewedBy, userId];
      const viewCount = (problem.viewCount || 0) + 1;
      
      // Atualizar o problema com as novas visualizações
      await firebase.updateProblem(problemId, { 
        viewedBy: updatedViewedBy, 
        viewCount 
      });
      
      // Não precisamos recarregar todos os dados, podemos atualizar localmente
      const updatedProblems = get().problems.map(p => 
        p.id === problemId 
          ? { ...p, viewedBy: updatedViewedBy, viewCount } 
          : p
      );
      
      set({ problems: updatedProblems });
    } catch (error) {
      console.error("Erro ao registrar visualização:", error);
    }
  },
  
  clearError: () => set({ error: null }),
}));