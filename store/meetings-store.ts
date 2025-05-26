import { create } from 'zustand';
import { Meeting } from '@/types';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc,
  addDoc,
  serverTimestamp,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { createNotification } from '@/lib/firebase'; // Importar a função de criação de notificações
import { createNotificationOnce } from '@/lib/createNotification'; // Importar a versão com deduplicação

// Manter os dados mock apenas para testes e desenvolvimento
const mockMeetings: Meeting[] = [
  {
    id: 'meeting1',
    title: 'Assembleia Geral Ordinária',
    description: 'Discussão sobre prestação de contas, eleição de síndico e conselho, e planejamento anual.',
    date: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 dias a partir de agora
    location: 'Salão de Festas do Condomínio',
    status: 'scheduled',
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    createdBy: 'admin',
    confirmedAttendees: ['user1', 'user2', 'user3'],
  },
  {
    id: 'meeting2',
    title: 'Reunião de Emergência',
    description: 'Discussão sobre vazamento no 3º andar e medidas a serem tomadas.',
    date: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 dias a partir de agora
    location: 'Sala de Reuniões',
    status: 'scheduled',
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    createdBy: 'admin',
    confirmedAttendees: ['user1'],
  },
  {
    id: 'meeting3',
    title: 'Reunião de Moradores',
    description: 'Discussão sobre regras de convivência e uso de áreas comuns.',
    date: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 dias atrás
    location: 'Salão de Festas do Condomínio',
    status: 'completed',
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    createdBy: 'admin',
    confirmedAttendees: ['user1', 'user2', 'user3', 'user4', 'user5'],
  },
];

interface MeetingsState {
  meetings: Meeting[];
  upcomingMeetings: Meeting[];
  isLoading: boolean;
  error: string | null;
  fetchMeetings: () => Promise<void>;
  getUpcomingMeetings: () => Meeting[];
  removeMeeting: (meetingId: string) => Promise<boolean>;
  createMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt'>) => Promise<string | null>;
  confirmAttendance: (meetingId: string) => Promise<boolean>;
  cancelAttendance: (meetingId: string) => Promise<boolean>;
}

export const useMeetingsStore = create<MeetingsState>((set, get) => ({
  meetings: [],
  upcomingMeetings: [],
  isLoading: false,
  error: null,

  fetchMeetings: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      // Para usuários não autenticados, retornar lista vazia
      if (!auth.currentUser || auth.currentUser.uid === 'anonymous-user') {
        console.log('Usuário anônimo ou não autenticado - retornando lista vazia');
        set({ 
          meetings: [], 
          upcomingMeetings: [],
          isLoading: false 
        });
        return;
      }
      
      // Buscar reuniões do Firestore
      console.log('Buscando reuniões do Firestore');
      const meetingsQuery = query(
        collection(db, 'meetings'),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(meetingsQuery);
      
      if (querySnapshot.empty) {
        console.log('Nenhuma reunião encontrada no Firestore');
        set({ 
          meetings: [], 
          upcomingMeetings: [],
          isLoading: false 
        });
        return;
      }
      
      const meetingsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Converter timestamp do Firestore para número
        const date = data.date instanceof Timestamp ? data.date.toMillis() : data.date;
        const createdAt = data.createdAt instanceof Timestamp 
          ? data.createdAt.toMillis() 
          : data.createdAt || Date.now();
          
        return { 
          id: doc.id,
          ...data,
          date,
          createdAt
        } as Meeting;
      });
      
      console.log(`Encontradas ${meetingsData.length} reuniões no Firestore`);
      
      const now = Date.now();
      const upcomingMeetings = meetingsData.filter(meeting => 
        meeting.status === 'scheduled' && meeting.date > now
      );
      
      set({ 
        meetings: meetingsData, 
        upcomingMeetings,
        isLoading: false 
      });
      
    } catch (error) {
      console.error('Erro ao buscar reuniões:', error);
      set({ 
        error: 'Falha ao carregar as reuniões. Tente novamente.', 
        isLoading: false 
      });
    }
  },

  getUpcomingMeetings: () => {
    const { meetings } = get();
    const now = Date.now();
    
    return meetings.filter(meeting => 
      meeting.status === 'scheduled' && meeting.date > now
    );
  },

  removeMeeting: async (meetingId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Usuário não autenticado, retornar erro
      if (!auth.currentUser || auth.currentUser.uid === 'anonymous-user') {
        console.log('Usuário anônimo, operação não permitida');
        set({ 
          error: 'Você precisa estar autenticado para remover reuniões.',
          isLoading: false 
        });
        return false;
      }
      
      // Remover do Firestore
      console.log('Removendo reunião do Firestore:', meetingId);
      const db = getFirestore();
      await deleteDoc(doc(db, 'meetings', meetingId));
      
      // Atualizar o estado local após a remoção bem-sucedida
      const updatedMeetings = get().meetings.filter(meeting => meeting.id !== meetingId);
      const now = Date.now();
      const upcomingMeetings = updatedMeetings.filter(meeting => 
        meeting.status === 'scheduled' && meeting.date > now
      );
      
      set({ 
        meetings: updatedMeetings, 
        upcomingMeetings,
        isLoading: false 
      });
      
      console.log('Reunião removida com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao remover reunião:', error);
      set({ 
        error: 'Falha ao remover a reunião. Tente novamente.', 
        isLoading: false 
      });
      return false;
    }
  },
  
  createMeeting: async (meetingData) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Usuário não autenticado, retornar erro
      if (!auth.currentUser || auth.currentUser.uid === 'anonymous-user') {
        console.log('Usuário anônimo, operação não permitida');
        set({ 
          error: 'Você precisa estar autenticado para criar reuniões.',
          isLoading: false 
        });
        return null;
      }
      
      // Salvar no Firestore
      console.log('Criando reunião no Firestore');
      const db = getFirestore();
      const meetingsRef = collection(db, 'meetings');
      
      const docRef = await addDoc(meetingsRef, {
        ...meetingData,
        createdAt: serverTimestamp()
      });
      
      console.log('Reunião criada com ID:', docRef.id);
      
      // Criar notificação para todos os usuários
      await createNotificationOnce(
        {
          title: 'Nova Reunião Agendada',
          message: `Uma nova reunião "${meetingData.title}" foi agendada.`,
          type: 'system',
          relatedItemId: docRef.id,
        },
        createNotification,
        meetingData.createdBy as string
      );
      
      // Refetch para garantir sincronização
      get().fetchMeetings();
      
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar reunião:', error);
      set({ 
        error: 'Falha ao criar a reunião. Tente novamente.', 
        isLoading: false 
      });
      return null;
    }
  },

  confirmAttendance: async (meetingId) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Usuário não autenticado, retornar erro
      if (!auth.currentUser || auth.currentUser.uid === 'anonymous-user') {
        console.log('Usuário anônimo, operação não permitida');
        set({ 
          error: 'Você precisa estar autenticado para confirmar presença.',
          isLoading: false 
        });
        return false;
      }

      const userId = auth.currentUser.uid;
      const db = getFirestore();
      const meetingRef = doc(db, 'meetings', meetingId);
      
      // Get the current meeting data
      const currentMeeting = get().meetings.find(m => m.id === meetingId);
      if (!currentMeeting) {
        set({ 
          error: 'Reunião não encontrada.', 
          isLoading: false 
        });
        return false;
      }
      
      // Create the confirmedAttendees array if it doesn't exist
      const confirmedAttendees = currentMeeting.confirmedAttendees 
        ? [...(currentMeeting.confirmedAttendees as string[])] 
        : [];

      // Check if user already confirmed
      if (confirmedAttendees.includes(userId)) {
        set({ isLoading: false });
        return true; // Already confirmed
      }
      
      // Add user to confirmed attendees
      confirmedAttendees.push(userId);
      
      // Update Firestore
      await updateDoc(meetingRef, {
        confirmedAttendees
      });
      
      // Update local state
      const updatedMeetings = get().meetings.map(meeting => 
        meeting.id === meetingId 
          ? { ...meeting, confirmedAttendees } 
          : meeting
      );
      
      set({ 
        meetings: updatedMeetings,
        isLoading: false 
      });
      
      console.log('Presença confirmada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao confirmar presença:', error);
      set({ 
        error: 'Falha ao confirmar presença. Tente novamente.', 
        isLoading: false 
      });
      return false;
    }
  },
  
  cancelAttendance: async (meetingId) => {
    try {
      set({ isLoading: true, error: null });
      
      const auth = getAuth();
      
      // Usuário não autenticado, retornar erro
      if (!auth.currentUser || auth.currentUser.uid === 'anonymous-user') {
        console.log('Usuário anônimo, operação não permitida');
        set({ 
          error: 'Você precisa estar autenticado para cancelar presença.',
          isLoading: false 
        });
        return false;
      }

      const userId = auth.currentUser.uid;
      const db = getFirestore();
      const meetingRef = doc(db, 'meetings', meetingId);
      
      // Get the current meeting data
      const currentMeeting = get().meetings.find(m => m.id === meetingId);
      if (!currentMeeting || !currentMeeting.confirmedAttendees) {
        set({ isLoading: false });
        return true; // Nothing to cancel
      }
      
      // Check if user is in confirmed attendees
      const confirmedAttendees = [...(currentMeeting.confirmedAttendees as string[])];
      const userIndex = confirmedAttendees.indexOf(userId);
      
      if (userIndex === -1) {
        set({ isLoading: false });
        return true; // User not in confirmed attendees
      }
      
      // Remove user from confirmed attendees
      confirmedAttendees.splice(userIndex, 1);
      
      // Update Firestore
      await updateDoc(meetingRef, {
        confirmedAttendees
      });
      
      // Update local state
      const updatedMeetings = get().meetings.map(meeting => 
        meeting.id === meetingId 
          ? { ...meeting, confirmedAttendees } 
          : meeting
      );
      
      set({ 
        meetings: updatedMeetings,
        isLoading: false 
      });
      
      console.log('Presença cancelada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao cancelar presença:', error);
      set({ 
        error: 'Falha ao cancelar presença. Tente novamente.', 
        isLoading: false 
      });
      return false;
    }
  }
})); 