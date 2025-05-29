import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { deliverPackage } from '@/lib/firebase';

export default function SignatureScreen() {
  const { packageId, recipientName, deliveredBy, deliveredByName } = useLocalSearchParams<{
    packageId: string;
    recipientName: string;
    deliveredBy: string;
    deliveredByName: string;
  }>();
  
  const [signedBy, setSignedBy] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirmDelivery = async () => {
    if (!signedBy.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome de quem está recebendo a encomenda.');
      return;
    }

    if (!packageId || !deliveredBy || !deliveredByName) {
      Alert.alert('Erro', 'Informações de entrega incompletas.');
      return;
    }

    try {
      setLoading(true);

      // For simplicity, we're using the name as signature
      // In a real app, you might want to implement actual signature capture
      const signature = `Assinado por: ${signedBy.trim()}`;

      await deliverPackage(
        packageId,
        signature,
        signedBy.trim(),
        deliveredBy,
        deliveredByName
      );

      Alert.alert(
        'Sucesso',
        'Encomenda entregue com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to packages list
              router.replace('/(app)/packages' as any);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao confirmar entrega:', error);
      Alert.alert('Erro', 'Não foi possível confirmar a entrega.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Confirmar Entrega</Text>
        
        <Text style={styles.subtitle}>
          Encomenda para: {recipientName}
        </Text>
        
        <Text style={styles.label}>Nome de quem está recebendo:</Text>
        <TextInput
          style={styles.input}
          value={signedBy}
          onChangeText={setSignedBy}
          placeholder="Digite o nome completo"
          autoCapitalize="words"
          autoFocus
        />
        
        <Text style={styles.note}>
          Ao confirmar, a encomenda será marcada como entregue e o destinatário será notificado.
        </Text>
        
        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
          onPress={handleConfirmDelivery}
          disabled={loading}
        >
          <Text style={styles.confirmButtonText}>
            {loading ? 'Confirmando...' : 'Confirmar Entrega'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
}); 