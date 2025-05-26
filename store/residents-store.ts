import { create } from 'zustand';
import { Resident } from '@/types';
import * as firebase from '@/lib/firebase';

interface ResidentsState {
  residents: Resident[];
  isLoading: boolean;
  error: string | null;
  
  fetchResidents: () => Promise<void>;
  createResident: (residentData: Omit<Resident, 'id' | 'createdAt'>) => Promise<void>;
  updateResident: (residentId: string, residentData: Partial<Resident>) => Promise<void>;
  deleteResident: (residentId: string) => Promise<void>;
  clearError: () => void;
}

export const useResidentsStore = create<ResidentsState>((set, get) => ({
  residents: [],
  isLoading: false,
  error: null,
  
  fetchResidents: async () => {
    set({ isLoading: true, error: null });
    try {
      const residents = await firebase.getResidents();
      set({ residents, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to fetch residents", 
        isLoading: false 
      });
    }
  },
  
  createResident: async (residentData) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.createResident(residentData);
      await get().fetchResidents();
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to create resident", 
        isLoading: false 
      });
    }
  },
  
  updateResident: async (residentId, residentData) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.updateResident(residentId, residentData);
      await get().fetchResidents();
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to update resident", 
        isLoading: false 
      });
    }
  },
  
  deleteResident: async (residentId) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.deleteResident(residentId);
      await get().fetchResidents();
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to delete resident", 
        isLoading: false 
      });
    }
  },
  
  clearError: () => set({ error: null }),
}));