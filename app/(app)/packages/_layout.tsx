import { Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { Alert } from 'react-native';

export default function PackagesLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Encomendas',
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: 'white',
          headerTitleAlign: 'center',
        }} 
      />
      <Stack.Screen 
        name="create" 
        options={{ 
          title: 'Nova Encomenda',
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: 'white',
          headerTitleAlign: 'center',
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: 'Detalhes da Encomenda',
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: 'white',
          headerTitleAlign: 'center',
        }} 
      />
      <Stack.Screen 
        name="my-packages" 
        options={{ 
          title: 'Minhas Encomendas',
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: 'white',
          headerTitleAlign: 'center',
        }} 
      />
      <Stack.Screen 
        name="signature" 
        options={{ 
          title: 'Assinatura',
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: 'white',
          headerTitleAlign: 'center',
        }} 
      />
    </Stack>
  );
} 