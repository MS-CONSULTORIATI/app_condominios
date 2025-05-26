import { create } from 'zustand';

// Camera type definition
interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  type: 'indoor' | 'outdoor';
  thumbnailUrl: string;
  streamUrl: string;
  createdAt: number;
}

interface CamerasState {
  cameras: Camera[];
  isLoading: boolean;
  error: string | null;
  
  fetchCameras: () => Promise<void>;
  addCamera: (camera: Omit<Camera, 'id' | 'createdAt'>) => Promise<void>;
  updateCamera: (id: string, data: Partial<Camera>) => Promise<void>;
  deleteCamera: (id: string) => Promise<void>;
}

// Mock camera data
const mockCameras: Camera[] = [
  {
    id: '1',
    name: 'Entrada Principal',
    location: 'Portaria',
    status: 'online',
    type: 'outdoor',
    thumbnailUrl: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?q=80&w=2829&auto=format&fit=crop',
    streamUrl: 'https://example.com/stream/1',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  },
  {
    id: '2',
    name: 'Hall de Entrada',
    location: 'Térreo',
    status: 'online',
    type: 'indoor',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=2940&auto=format&fit=crop',
    streamUrl: 'https://example.com/stream/2',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  },
  {
    id: '3',
    name: 'Estacionamento',
    location: 'Subsolo',
    status: 'online',
    type: 'indoor',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470224114660-3f6686c562eb?q=80&w=2940&auto=format&fit=crop',
    streamUrl: 'https://example.com/stream/3',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  },
  {
    id: '4',
    name: 'Piscina',
    location: 'Área de Lazer',
    status: 'offline',
    type: 'outdoor',
    thumbnailUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?q=80&w=2940&auto=format&fit=crop',
    streamUrl: 'https://example.com/stream/4',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  },
  {
    id: '5',
    name: 'Playground',
    location: 'Área de Lazer',
    status: 'maintenance',
    type: 'outdoor',
    thumbnailUrl: 'https://images.unsplash.com/photo-1596900779744-2bdc4a90509a?q=80&w=2938&auto=format&fit=crop',
    streamUrl: 'https://example.com/stream/5',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  },
];

export const useCamerasStore = create<CamerasState>((set, get) => ({
  cameras: [],
  isLoading: false,
  error: null,
  
  fetchCameras: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock data
      set({ cameras: mockCameras, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to fetch cameras", 
        isLoading: false 
      });
    }
  },
  
  addCamera: async (camera) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newCamera: Camera = {
        ...camera,
        id: Date.now().toString(),
        createdAt: Date.now(),
      };
      
      set(state => ({ 
        cameras: [...state.cameras, newCamera],
        isLoading: false 
      }));
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to add camera", 
        isLoading: false 
      });
    }
  },
  
  updateCamera: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      set(state => ({
        cameras: state.cameras.map(camera => 
          camera.id === id ? { ...camera, ...data } : camera
        ),
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to update camera", 
        isLoading: false 
      });
    }
  },
  
  deleteCamera: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      set(state => ({
        cameras: state.cameras.filter(camera => camera.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.message || "Failed to delete camera", 
        isLoading: false 
      });
    }
  },
}));