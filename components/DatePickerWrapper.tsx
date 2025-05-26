import React, { useState } from 'react';
import { TouchableOpacity, Platform, Text, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '@/constants/colors';

interface DatePickerWrapperProps {
  value: Date;
  onChange: (event: any, date?: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
  label: string;
  placeholder?: string;
}

export default function DatePickerWrapper({
  value,
  onChange,
  mode = 'date',
  display = 'default',
  label,
  placeholder = 'Selecione uma data'
}: DatePickerWrapperProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handlePress = () => {
    setTempDate(value);
    setShowPicker(true);
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      
      if (selectedDate) {
        if (mode === 'datetime') {
          // No modo datetime, primeiro selecionamos a data, depois o horário
          const newDate = new Date(selectedDate);
          setTempDate(newDate);
          // Mostrar o seletor de horário após selecionar a data
          setTimeout(() => {
            setShowTimePicker(true);
          }, 100);
        } else {
          // Para modos date e time, concluímos diretamente
          onChange(event, selectedDate);
        }
      }
    } else {
      // iOS: atualiza diretamente
      onChange(event, selectedDate);
    }
  };

  // Handler para seleção de horário (Android/datetime)
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    
    if (selectedTime && tempDate) {
      // Combinar a data já selecionada com o novo horário
      const combinedDate = new Date(tempDate);
      combinedDate.setHours(selectedTime.getHours());
      combinedDate.setMinutes(selectedTime.getMinutes());
      
      // Agora sim, chamar o callback com a data+hora combinados
      onChange(event, combinedDate);
    }
  };

  const formatDate = (date: Date) => {
    if (mode === 'date') {
      return date.toLocaleDateString('pt-BR');
    } else if (mode === 'time') {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={handlePress}
      >
        <Text style={styles.buttonText}>
          {formatDate(value)}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={value}
          mode={mode === 'datetime' ? 'date' : mode}
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : display}
          onChange={handleChange}
        />
      )}

      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          is24Hour={true}
          display={display}
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
    color: Colors.text,
  },
  button: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  buttonText: {
    fontSize: 16,
    color: Colors.text,
  }
}); 