import { create } from 'zustand';
import { User } from '@/types';
import * as firebase from '@/lib/firebase';

interface UsersState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  
  fetchUsers: () => Promise<void>;
  getUserById: (userId: string) => User | null;
  createUser: (userData: { 
    name: string; 
    email: string; 
    password: string; 
    role: 'resident' | 'manager' | 'admin';
    phone?: string;
    cpf?: string;
    apartment?: string;
    block?: string;
    photoURI?: string | null;
  }) => Promise<void>;
  updateUser: (userId: string, userData: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  clearError: () => void;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,
  
  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await firebase.getUsers();
      set({ users, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to fetch users", 
        isLoading: false 
      });
    }
  },
  
  getUserById: (userId: string) => {
    return get().users.find(user => user.id === userId) || null;
  },
  
  createUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const { photoURI, ...userDataWithoutPhoto } = userData;
      const createdUser = await firebase.createUser(userDataWithoutPhoto);
      
      // Upload da foto se foi fornecida
      if (photoURI && createdUser.id) {
        await firebase.uploadAvatar(photoURI, createdUser.id);
      }
      
      await get().fetchUsers();
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to create user", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  updateUser: async (userId: string, userData: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.updateUser(userId, userData);
      await get().fetchUsers();
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to update user", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  deleteUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.deleteUser(userId);
      
      // Update local state to remove the deleted user
      const updatedUsers = get().users.filter(user => user.id !== userId);
      set({ users: updatedUsers, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to delete user", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  clearError: () => set({ error: null }),
}));