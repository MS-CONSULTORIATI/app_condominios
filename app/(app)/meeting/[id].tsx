import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Platform, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useMeetingsStore } from '@/store/meetings-store';
import Colors from '@/constants/colors';
import { 
  Calendar, 
  Clock, 
  MapPin,
  Users,
  File,
  ArrowLeft,
  ExternalLink,
  Trash2,
  Check,
  X
} from 'lucide-react-native';
import LoadingIndicator from '@/components/LoadingIndicator';
import { Meeting } from '@/types';

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { meetings, fetchMeetings, isLoading, removeMeeting, confirmAttendance, cancelAttendance } = useMeetingsStore();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingAttendance, setIsConfirmingAttendance] = useState(false);
  
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const hasAdminPermission = isAdmin || isManager;
  
  // Check if current user has confirmed attendance
  const hasConfirmedAttendance = user && meeting?.confirmedAttendees 
    ? (meeting.confirmedAttendees as string[]).includes(user.id)
    : false;
    
  // Number of confirmed attendees
  const confirmedAttendeesCount = meeting?.confirmedAttendees 
    ? (meeting.confirmedAttendees as string[]).length 
    : 0;

  useEffect(() => {
    // Buscar reuniões se ainda não estiverem carregadas
    if (meetings.length === 0) {
      fetchMeetings();
    } else {
      // Encontrar a reunião pelo ID
      const foundMeeting = meetings.find(m => m.id === id);
      setMeeting(foundMeeting || null);
    }
  }, [id, meetings]);
  
  useEffect(() => {
    if (meetings.length > 0) {
      const foundMeeting = meetings.find(m => m.id === id);
      setMeeting(foundMeeting || null);
    }
  }, [meetings, id]);
  
  const handleOpenLocation = () => {
    if (!meeting) return;
    
    const query = encodeURIComponent(meeting.location);
    let url = '';
    
    if (Platform.OS === 'ios') {
      url = `maps://?q=${query}`;
    } else {
      url = `https://maps.google.com/?q=${query}`;
    }
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          console.log(`Don't know how to open URI: ${url}`);
        }
      })
      .catch(err => console.error('An error occurred', err));
  };

  const handleRemoveMeeting = () => {
    if (!meeting) return;

    Alert.alert(
      "Remover Reunião",
      `Tem certeza que deseja remover a reunião "${meeting.title}"? Esta ação não pode ser desfeita.`,
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            if (!meeting) return;
            
            setIsDeleting(true);
            const success = await removeMeeting(meeting.id);
            setIsDeleting(false);
            
            if (success) {
              Alert.alert(
                "Sucesso",
                "Reunião removida com sucesso!",
                [
                  {
                    text: "OK",
                    onPress: () => router.push('/meetings')
                  }
                ]
              );
            } else {
              Alert.alert(
                "Erro",
                "Ocorreu um erro ao remover a reunião. Tente novamente."
              );
            }
          }
        }
      ]
    );
  };
  
  const handleConfirmAttendance = async () => {
    if (!meeting) return;
    
    setIsConfirmingAttendance(true);
    
    if (hasConfirmedAttendance) {
      // Cancel attendance
      const success = await cancelAttendance(meeting.id);
      setIsConfirmingAttendance(false);
      
      if (success) {
        Alert.alert(
          "Sucesso",
          "Sua presença foi cancelada com sucesso!"
        );
      } else {
        Alert.alert(
          "Erro",
          "Ocorreu um erro ao cancelar sua presença. Tente novamente."
        );
      }
    } else {
      // Confirm attendance
      const success = await confirmAttendance(meeting.id);
      setIsConfirmingAttendance(false);
      
      if (success) {
        Alert.alert(
          "Sucesso",
          "Sua presença foi confirmada com sucesso!"
        );
      } else {
        Alert.alert(
          "Erro",
          "Ocorreu um erro ao confirmar sua presença. Tente novamente."
        );
      }
    }
  };
  
  if (isLoading) {
    return <LoadingIndicator fullScreen text="Carregando detalhes da reunião..." />;
  }
  
  if (!meeting) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: 'Reunião não encontrada',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => router.back()}
                style={{ marginRight: 16, marginLeft: 8 }}
              >
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
            )
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Reunião não encontrada</Text>
          <Text style={styles.errorDescription}>
            A reunião que você está procurando não existe ou foi removida.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/meetings')}
          >
            <Text style={styles.backButtonText}>Voltar para Reuniões</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }
  
  // Formatar data e hora
  const formattedDate = new Date(meeting.date).toLocaleDateString('pt-BR');
  const formattedTime = new Date(meeting.date).toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const isUpcoming = new Date(meeting.date) > new Date();
  
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Detalhes da Reunião',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ marginRight: 16, marginLeft: 8 }}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          )
        }}
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={[
            styles.statusBadge,
            meeting.status === 'scheduled' ? styles.scheduledBadge : 
            meeting.status === 'canceled' ? styles.canceledBadge : 
            styles.completedBadge
          ]}>
            <Text style={[
              styles.statusText,
              meeting.status === 'canceled' && styles.canceledText
            ]}>
              {meeting.status === 'scheduled' ? 'Agendada' : 
               meeting.status === 'canceled' ? 'Cancelada' : 
               'Concluída'}
            </Text>
          </View>
          
          <Text style={styles.title}>{meeting.title}</Text>
        </View>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Calendar size={20} color={Colors.primary} />
            <Text style={styles.infoText}>{formattedDate}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Clock size={20} color={Colors.primary} />
            <Text style={styles.infoText}>{formattedTime}</Text>
          </View>
          
          <TouchableOpacity style={styles.infoRow} onPress={handleOpenLocation}>
            <MapPin size={20} color={Colors.primary} />
            <Text style={[styles.infoText, styles.locationText]}>{meeting.location}</Text>
            <ExternalLink size={16} color={Colors.primary} style={styles.linkIcon} />
          </TouchableOpacity>
          
          <View style={styles.infoRow}>
            <Users size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              {confirmedAttendeesCount} {confirmedAttendeesCount === 1 ? 'pessoa confirmada' : 'pessoas confirmadas'}
            </Text>
          </View>
        </View>
        
        {isUpcoming && meeting.status === 'scheduled' && (
          <TouchableOpacity 
            style={[
              styles.attendanceButton,
              hasConfirmedAttendance ? styles.cancelAttendanceButton : styles.confirmAttendanceButton
            ]}
            onPress={handleConfirmAttendance}
            disabled={isConfirmingAttendance}
          >
            {isConfirmingAttendance ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                {hasConfirmedAttendance ? (
                  <>
                    <X size={20} color="white" />
                    <Text style={styles.attendanceButtonText}>Cancelar Presença</Text>
                  </>
                ) : (
                  <>
                    <Check size={20} color="white" />
                    <Text style={styles.attendanceButtonText}>Confirmar Presença</Text>
                  </>
                )}
              </>
            )}
          </TouchableOpacity>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descrição</Text>
          <Text style={styles.description}>{meeting.description}</Text>
        </View>
        
        {meeting.images && meeting.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Imagens</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesContainer}
            >
              {meeting.images.map((image, index) => (
                <Image 
                  key={index}
                  source={{ uri: image }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}
        
        {meeting.documents && meeting.documents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documentos</Text>
            {meeting.documents.map((doc, index) => (
              <TouchableOpacity key={index} style={styles.documentItem}>
                <File size={20} color={Colors.primary} />
                <Text style={styles.documentName} numberOfLines={1} ellipsizeMode="middle">
                  {doc.name}
                </Text>
                <ExternalLink size={16} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Botão de remover reunião (visível apenas para managers e admins) */}
        {hasAdminPermission && (
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={handleRemoveMeeting}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Trash2 size={20} color="white" />
                <Text style={styles.removeButtonText}>Remover Reunião</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 12,
  },
  scheduledBadge: {
    backgroundColor: Colors.primary + '20',
  },
  completedBadge: {
    backgroundColor: Colors.gray[300],
  },
  canceledBadge: {
    backgroundColor: Colors.error + '20',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  canceledText: {
    color: Colors.error,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },
  locationText: {
    textDecorationLine: 'underline',
    color: Colors.primary,
  },
  linkIcon: {
    marginLeft: 8,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: Colors.gray[700],
    lineHeight: 24,
  },
  imagesContainer: {
    paddingVertical: 8,
  },
  image: {
    width: 240,
    height: 160,
    borderRadius: 8,
    marginRight: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  documentName: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.card,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.error,
  },
  errorDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: Colors.gray[600],
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  attendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 24,
  },
  confirmAttendanceButton: {
    backgroundColor: Colors.success,
  },
  cancelAttendanceButton: {
    backgroundColor: Colors.error,
  },
  attendanceButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
}); 