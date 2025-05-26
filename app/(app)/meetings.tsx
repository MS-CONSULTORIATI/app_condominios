import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { Calendar, Clock, MapPin, Users, Plus, AlertTriangle, Shield, ArrowLeft } from 'lucide-react-native';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import { useMeetingsStore } from '@/store/meetings-store';
import { Meeting } from '@/types';

// Mock data for meetings
const mockMeetings: Meeting[] = [
  {
    id: 'meeting1',
    title: 'Assembleia Geral Ordinária',
    description: 'Discussão sobre prestação de contas, eleição de síndico e conselho, e planejamento anual.',
    date: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
    location: 'Salão de Festas do Condomínio',
    status: 'scheduled' as const,
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    createdBy: 'admin',
  },
  {
    id: 'meeting2',
    title: 'Reunião de Emergência',
    description: 'Discussão sobre vazamento no 3º andar e medidas a serem tomadas.',
    date: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days from now
    location: 'Sala de Reuniões',
    status: 'scheduled' as const,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    createdBy: 'admin',
  },
  {
    id: 'meeting3',
    title: 'Reunião de Moradores',
    description: 'Discussão sobre regras de convivência e uso de áreas comuns.',
    date: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
    location: 'Salão de Festas do Condomínio',
    status: 'completed' as const,
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    createdBy: 'admin',
  },
];

export default function MeetingsScreen() {
  const { user } = useAuthStore();
  const { meetings: storeMeetings, fetchMeetings, isLoading: storeLoading } = useMeetingsStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const hasAdminPermission = isAdmin || isManager;
  
  useEffect(() => {
    // Fetch real data from the store
    fetchMeetings().then(() => {
      setIsLoading(false);
    });
  }, [fetchMeetings]);
  
  useEffect(() => {
    // Update local state when store data changes
    setMeetings(storeMeetings);
  }, [storeMeetings]);
  
  const handleCreateMeeting = () => {
    router.push('/meeting/create');
  };
  
  const handleMeetingPress = (meetingId: string) => {
    router.push(`/meeting/${meetingId}` as any);
  };

  const handleBackPress = () => {
    router.push('/');
  };
  
  const renderMeetingItem = ({ item }: { item: Meeting }) => {
    const isUpcoming = new Date(item.date) > new Date();
    const confirmedAttendeesCount = item.confirmedAttendees ? (item.confirmedAttendees as string[]).length : 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.meetingCard,
          !isUpcoming && styles.pastMeetingCard
        ]}
        onPress={() => handleMeetingPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.meetingHeader}>
          <Text style={styles.meetingTitle}>{item.title}</Text>
          <View style={[
            styles.statusBadge,
            item.status === 'scheduled' ? styles.scheduledBadge : styles.completedBadge
          ]}>
            <Text style={styles.statusText}>
              {item.status === 'scheduled' ? 'Agendada' : 'Concluída'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.meetingDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.meetingDetails}>
          <View style={styles.detailItem}>
            <Calendar size={16} color={Colors.gray[500]} />
            <Text style={styles.detailText}>
              {new Date(item.date).toLocaleDateString('pt-BR')}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Clock size={16} color={Colors.gray[500]} />
            <Text style={styles.detailText}>
              {new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <MapPin size={16} color={Colors.gray[500]} />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
          
          {isUpcoming && item.status === 'scheduled' && (
            <View style={styles.detailItem}>
              <Users size={16} color={Colors.gray[500]} />
              <Text style={styles.detailText}>
                {confirmedAttendeesCount} {confirmedAttendeesCount === 1 ? 'confirmação' : 'confirmações'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  if (isLoading || storeLoading) {
    return <LoadingIndicator fullScreen text="Carregando reuniões..." />;
  }
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Reuniões',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={handleBackPress}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          )
        }} 
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reuniões</Text>
          {hasAdminPermission && (
            <TouchableOpacity 
              style={styles.createButton}
              onPress={handleCreateMeeting}
            >
              <Plus size={20} color="white" />
              <Text style={styles.createButtonText}>Nova Reunião</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {meetings.length === 0 ? (
          <EmptyState
            title="Nenhuma reunião encontrada"
            description="Não há reuniões agendadas no momento."
            icon={<Calendar size={48} color={Colors.gray[400]} />}
            actionLabel={hasAdminPermission ? "Agendar Reunião" : undefined}
            onAction={hasAdminPermission ? handleCreateMeeting : undefined}
            style={styles.emptyState}
          />
        ) : (
          <FlatList
            data={meetings}
            renderItem={renderMeetingItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  backButton: {
    marginRight: 16,
    marginLeft: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  meetingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  pastMeetingCard: {
    borderLeftColor: Colors.gray[400],
    opacity: 0.8,
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  scheduledBadge: {
    backgroundColor: Colors.primary + '20',
  },
  completedBadge: {
    backgroundColor: Colors.gray[300],
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
  },
  meetingDescription: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 16,
  },
  meetingDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.gray[600],
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
  },
  restrictedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.card,
  },
  restrictedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: Colors.error,
  },
  restrictedDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: Colors.gray[600],
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});