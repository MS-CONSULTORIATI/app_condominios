import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, ChevronRight, Clock, Users } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { Meeting } from '@/types';

interface MeetingAlertProps {
  meeting: Meeting;
  style?: object;
}

export default function MeetingAlert({ meeting, style }: MeetingAlertProps) {
  const handleViewMeeting = () => {
    // Navigate to the meeting detail page
    router.push(`/meeting/${meeting.id}` as any);
  };
  
  // Formatar a data para exibição
  const formattedDate = new Date(meeting.date).toLocaleDateString('pt-BR');
  const formattedTime = new Date(meeting.date).toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // Calcular dias restantes
  const daysLeft = Math.floor((meeting.date - Date.now()) / (1000 * 60 * 60 * 24));
  let timeText = '';
  
  if (daysLeft === 0) {
    timeText = 'Hoje';
  } else if (daysLeft === 1) {
    timeText = 'Amanhã';
  } else {
    timeText = `Em ${daysLeft} dias`;
  }

  // Get confirmed attendees count
  const confirmedAttendeesCount = meeting.confirmedAttendees 
    ? (meeting.confirmedAttendees as string[]).length 
    : 0;

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handleViewMeeting}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Calendar size={24} color={Colors.primary} />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {meeting.title}
        </Text>
        
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Calendar size={14} color={Colors.gray[500]} />
            <Text style={styles.infoText}>{formattedDate}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Clock size={14} color={Colors.gray[500]} />
            <Text style={styles.infoText}>{formattedTime}</Text>
          </View>
        </View>
        
        <View style={styles.bottomRow}>
          <Text style={styles.timeLeftText}>
            {timeText}
          </Text>
          
          <View style={styles.attendeesInfo}>
            <Users size={14} color={Colors.gray[500]} />
            <Text style={styles.infoText}>
              {confirmedAttendeesCount} {confirmedAttendeesCount === 1 ? 'confirmação' : 'confirmações'}
            </Text>
          </View>
        </View>
      </View>
      
      <ChevronRight size={20} color={Colors.gray[400]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  infoContainer: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: {
    fontSize: 12,
    color: Colors.gray[500],
    marginLeft: 4,
  },
  timeLeftText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendeesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 