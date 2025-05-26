import { create } from 'zustand';
import { Suggestion, SuggestionComment } from '@/types';
import * as firebase from '@/lib/firebase';
import { DocumentReference, DocumentData } from 'firebase/firestore';

interface SuggestionsState {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;
  
  fetchSuggestions: () => Promise<void>;
  createSuggestion: (suggestionData: Omit<Suggestion, 'id' | 'createdAt'>) => Promise<DocumentReference<DocumentData>>;
  updateSuggestion: (suggestionId: string, suggestionData: Partial<Suggestion>) => Promise<void>;
  deleteSuggestion: (suggestionId: string) => Promise<void>;
  addComment: (suggestionId: string, commentData: Omit<SuggestionComment, 'id' | 'createdAt'>) => Promise<void>;
  recordView: (suggestionId: string, userId: string) => Promise<void>;
  clearError: () => void;
}

export const useSuggestionsStore = create<SuggestionsState>((set, get) => ({
  suggestions: [],
  isLoading: false,
  error: null,
  
  fetchSuggestions: async () => {
    set({ isLoading: true, error: null });
    try {
      const suggestions = await firebase.getSuggestions();
      set({ suggestions, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to fetch suggestions", 
        isLoading: false 
      });
    }
  },
  
  createSuggestion: async (suggestionData) => {
    set({ isLoading: true, error: null });
    try {
      const suggestionRef = await firebase.createSuggestion(suggestionData);
      await get().fetchSuggestions();
      set({ isLoading: false });
      return suggestionRef;
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to create suggestion", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  updateSuggestion: async (suggestionId, suggestionData) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.updateSuggestion(suggestionId, suggestionData);
      await get().fetchSuggestions();
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to update suggestion", 
        isLoading: false 
      });
    }
  },
  
  deleteSuggestion: async (suggestionId) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.deleteSuggestion(suggestionId);
      await get().fetchSuggestions();
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to delete suggestion", 
        isLoading: false 
      });
    }
  },
  
  addComment: async (suggestionId, commentData) => {
    set({ isLoading: true, error: null });
    try {
      // Obter a sugestão atual
      const suggestion = get().suggestions.find(s => s.id === suggestionId);
      if (!suggestion) throw new Error("Sugestão não encontrada");
      
      const comment: SuggestionComment = {
        ...commentData,
        id: Date.now().toString(), // Gera um ID único baseado no timestamp
        createdAt: Date.now()
      };
      
      // Adicionar o comentário à lista de comentários existentes ou criar nova lista
      const existingComments = suggestion.comments || [];
      const updatedComments = [...existingComments, comment];
      
      // Atualizar a sugestão com o novo comentário
      await firebase.updateSuggestion(suggestionId, { comments: updatedComments });
      await get().fetchSuggestions();
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Falha ao adicionar comentário", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  recordView: async (suggestionId, userId) => {
    try {
      // Obter a sugestão atual
      const suggestion = get().suggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;
      
      // Verificar se o usuário já visualizou esta sugestão
      const viewedBy = suggestion.viewedBy || [];
      if (viewedBy.includes(userId)) return; // Se já visualizou, não faz nada
      
      // Adicionar o usuário à lista de visualizações e incrementar a contagem
      const updatedViewedBy = [...viewedBy, userId];
      const viewCount = (suggestion.viewCount || 0) + 1;
      
      // Atualizar a sugestão com as novas visualizações
      await firebase.updateSuggestion(suggestionId, { 
        viewedBy: updatedViewedBy, 
        viewCount 
      });
      
      // Não precisamos recarregar todos os dados, podemos atualizar localmente
      const updatedSuggestions = get().suggestions.map(s => 
        s.id === suggestionId 
          ? { ...s, viewedBy: updatedViewedBy, viewCount } 
          : s
      );
      
      set({ suggestions: updatedSuggestions });
    } catch (error) {
      console.error("Erro ao registrar visualização:", error);
    }
  },
  
  clearError: () => set({ error: null }),
}));