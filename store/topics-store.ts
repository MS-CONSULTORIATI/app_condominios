import { create } from 'zustand';
import { Topic } from '@/types';
import * as firebase from '@/lib/firebase';

interface TopicsState {
  topics: Topic[];
  currentTopic: Topic | null;
  isLoading: boolean;
  error: string | null;
  
  fetchTopics: () => Promise<void>;
  fetchTopicById: (topicId: string) => Promise<Topic | null>;
  createTopic: (topicData: Omit<Topic, 'id' | 'createdAt'>) => Promise<void>;
  updateTopic: (topicId: string, topicData: Partial<Topic>) => Promise<void>;
  deleteTopic: (topicId: string) => Promise<void>;
  clearError: () => void;
  clearCurrentTopic: () => void;
}

export const useTopicsStore = create<TopicsState>((set, get) => ({
  topics: [],
  currentTopic: null,
  isLoading: false,
  error: null,
  
  fetchTopics: async () => {
    set({ isLoading: true, error: null });
    try {
      const topics = await firebase.getTopics();
      set({ topics, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to fetch topics", 
        isLoading: false 
      });
    }
  },
  
  fetchTopicById: async (topicId) => {
    set({ isLoading: true, error: null });
    try {
      const topic = await firebase.getTopicById(topicId);
      set({ currentTopic: topic, isLoading: false });
      return topic;
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to fetch topic", 
        isLoading: false 
      });
      return null;
    }
  },
  
  createTopic: async (topicData) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.createTopic(topicData);
      await get().fetchTopics();
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to create topic", 
        isLoading: false 
      });
    }
  },
  
  updateTopic: async (topicId, topicData) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.updateTopic(topicId, topicData);
      await get().fetchTopics();
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to update topic", 
        isLoading: false 
      });
    }
  },
  
  deleteTopic: async (topicId) => {
    set({ isLoading: true, error: null });
    try {
      await firebase.deleteTopic(topicId);
      
      // Update local state by removing the deleted topic
      const updatedTopics = get().topics.filter(topic => topic.id !== topicId);
      set({ topics: updatedTopics, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to delete topic", 
        isLoading: false 
      });
    }
  },
  
  clearError: () => set({ error: null }),
  
  clearCurrentTopic: () => set({ currentTopic: null }),
}));