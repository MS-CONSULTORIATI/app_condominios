import { Stack } from 'expo-router';

export default function SocialLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Rede Social',
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="create" 
        options={{ 
          title: 'Criar Post',
          headerShown: false,
          presentation: 'modal'
        }} 
      />
    </Stack>
  );
} 