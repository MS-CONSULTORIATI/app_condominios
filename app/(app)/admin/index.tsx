import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { 
  Users, 
  Camera, 
  Settings, 
  Bell, 
  Shield, 
  Database, 
  BarChart, 
  FileText 
} from 'lucide-react-native';
import EmptyState from '@/components/EmptyState';

export default function AdminScreen() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Acesso Restrito"
          description="Você não tem permissão para acessar esta área."
          icon={<Shield size={48} color={Colors.gray[400]} />}
        />
      </View>
    );
  }

  const adminFeatures = [
    {
      title: 'Gerenciar Usuários',
      description: 'Adicionar, editar e remover usuários do sistema',
      icon: <Users size={32} color={Colors.primary} />,
      onPress: () => router.push('/admin/users'),
      color: Colors.primary,
    },
    {
      title: 'Gerenciar Câmeras',
      description: 'Configurar e monitorar câmeras de segurança',
      icon: <Camera size={32} color="#0EA5E9" />,
      onPress: () => router.push('/cameras'),
      color: "#0EA5E9",
    },
    {
      title: 'Configurações do Sistema',
      description: 'Ajustar configurações gerais do aplicativo',
      icon: <Settings size={32} color="#8B5CF6" />,
      onPress: () => router.push('/settings'),
      color: "#8B5CF6",
    },
    {
      title: 'Notificações em Massa',
      description: 'Enviar notificações para todos os usuários',
      icon: <Bell size={32} color="#F59E0B" />,
      onPress: () => router.push('/admin/notifications'),
      color: "#F59E0B",
    },
    {
      title: 'Backup de Dados',
      description: 'Gerenciar backups do sistema',
      icon: <Database size={32} color="#10B981" />,
      onPress: () => alert('Funcionalidade em desenvolvimento'),
      color: "#10B981",
    },
    {
      title: 'Relatórios',
      description: 'Visualizar estatísticas e relatórios',
      icon: <BarChart size={32} color="#EC4899" />,
      onPress: () => alert('Funcionalidade em desenvolvimento'),
      color: "#EC4899",
    },
    {
      title: 'Logs do Sistema',
      description: 'Visualizar logs de atividades',
      icon: <FileText size={32} color="#6B7280" />,
      onPress: () => alert('Funcionalidade em desenvolvimento'),
      color: "#6B7280",
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Shield size={32} color={Colors.primary} />
        <Text style={styles.headerTitle}>Painel de Administração</Text>
      </View>
      
      <Text style={styles.subtitle}>
        Bem-vindo ao painel de administração. Aqui você pode gerenciar todos os aspectos do sistema.
      </Text>
      
      <View style={styles.featuresGrid}>
        {adminFeatures.map((feature, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.featureCard}
            onPress={feature.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: feature.color + '15' }]}>
              {feature.icon}
            </View>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDescription}>{feature.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray[600],
    marginBottom: 24,
    lineHeight: 22,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
  },
});