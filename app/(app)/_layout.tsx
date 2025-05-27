import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationsStore } from '@/store/notifications-store';
import Colors from '@/constants/colors';
import { 
  Home, 
  AlertTriangle, 
  Lightbulb, 
  Users, 
  User, 
  Settings, 
  LogOut,
  Menu,
  Bell,
  Calendar,
  Shield,
  Camera,
  FileText,
  DollarSign,
  Search
} from 'lucide-react-native';
import UserProfileHeader from '@/components/UserProfileHeader';
import NotificationBadge from '@/components/NotificationBadge';
import { DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';
import React from 'react';
import * as firebase from '@/lib/firebase';

// Custom drawer content component
function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  
  // Log para debug
  console.log('CustomDrawerContent: user =', user ? `${user.name} (${user.id})` : 'null');

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)');
  };

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  // Em vez de filtrar as rotas, vamos renderizar uma lista personalizada de itens do drawer
  // para evitar problemas com o acesso à propriedade 'key' de undefined
  const drawerItems = [
    { name: 'index', label: 'Início', icon: <Home size={24} color={Colors.gray[600]} /> },
    { name: 'problems', label: 'Problemas', icon: <AlertTriangle size={24} color={Colors.gray[600]} /> },
    { name: 'suggestions', label: 'Sugestões', icon: <Lightbulb size={24} color={Colors.gray[600]} /> },
    { name: 'notifications', label: 'Notificações', icon: <Bell size={24} color={Colors.gray[600]} /> },
    { name: 'meetings', label: 'Reuniões', icon: <Calendar size={24} color={Colors.gray[600]} /> },
    { name: 'boletos', label: 'Boletos', icon: <FileText size={24} color={Colors.gray[600]} /> },
    { name: '/lost-and-found', label: 'Achados e Perdidos', icon: <Search size={24} color={Colors.gray[600]} /> },
    // Mostrar item Financeiro apenas para administradores e gerentes
    ...(isManager ? [{ name: 'financials', label: 'Financeiro', icon: <DollarSign size={24} color={Colors.gray[600]} /> }] : []),
    { name: 'profile', label: 'Meu Perfil', icon: <User size={24} color={Colors.gray[600]} /> },
    { name: 'settings', label: 'Configurações', icon: <Settings size={24} color={Colors.gray[600]} /> },
  ];

  const handleNavigate = (routeName: string) => {
    // Usar um objeto de navegação em vez de string direta para resolver problema de tipagem
    if (routeName === 'index') {
      router.navigate('/');
    } else {
      router.navigate({
        pathname: `/${routeName}` as any
      });
    }
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      {/* User profile section at the top of drawer */}
      <View style={styles.drawerHeader}>
        <UserProfileHeader user={user} showFullInfo={true} />
      </View>
      
      {/* Custom drawer items */}
      <View style={styles.drawerItemsContainer}>
        {drawerItems.map((item) => (
          <TouchableOpacity 
            key={item.name}
            style={styles.customDrawerItem}
            onPress={() => handleNavigate(item.name)}
          >
            {item.icon}
            <Text style={styles.drawerItemText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Logout button at the bottom */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={24} color={Colors.error} style={styles.logoutIcon} />
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

// Header right component with user profile and notifications
function HeaderRight() {
  const { user } = useAuthStore();
  const router = useRouter();
  
  // Log para debug
  console.log('HeaderRight: user =', user ? `${user.name} (${user.id})` : 'null');
  
  const handleProfilePress = () => {
    router.push('/profile');
  };
  
  const handleNotificationsPress = () => {
    router.push('/notifications');
  };
  
  return (
    <View style={styles.headerRight}>
      <NotificationBadge onPress={handleNotificationsPress} />
      
      <TouchableOpacity 
        style={styles.headerProfile} 
        onPress={handleProfilePress}
        activeOpacity={0.7}
      >
        <UserProfileHeader 
          user={user} 
          showFullInfo={false} 
          compact={true}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function AppLayout() {
  const { isAuthenticated, user, syncWithFirebase, silentLogin } = useAuthStore();
  const { subscribeToNotifications, unsubscribeFromNotifications, fetchNotifications } = useNotificationsStore();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const router = useRouter();

  // Verificar integridade do perfil e repará-lo se necessário
  const checkAndRepairProfile = useCallback(async () => {
    // Desativamos esse mecanismo automático para evitar loops
    console.log('Verificação automática de perfil desativada para evitar loops');
    return;
  }, []);

  // Verificar o estado de autenticação com o Firebase apenas uma vez ao montar
  useEffect(() => {
    let isMounted = true;
    
    const checkAuthState = async () => {
      if (!isMounted) return;
      
      try {
        console.log('AppLayout: Verificando autenticação com Firebase...');
        
        // Primeiro tentar login silencioso
        const silentLoginSuccess = await silentLogin();
        if (silentLoginSuccess) {
          console.log('AppLayout: Login silencioso bem-sucedido');
          if (isMounted) {
            await checkAndRepairProfile();
            setIsAuthChecking(false);
          }
          return;
        }
        
        console.log('AppLayout: Login silencioso falhou, tentando sincronizar com Firebase');
        // Se login silencioso falhar, verificar estado atual no Firebase
        const isAuth = await syncWithFirebase();
        console.log('AppLayout: Estado de autenticação após sincronização:', isAuth ? 'Autenticado' : 'Não autenticado');
        
        if (isAuth && isMounted) {
          await checkAndRepairProfile();
        }
      } catch (error) {
        console.error('AppLayout: Erro ao verificar autenticação:', error);
      } finally {
        if (isMounted) {
          console.log('AppLayout: Verificação concluída, atualizando estado...');
          setIsAuthChecking(false);
        }
      }
    };

    checkAuthState();
    
    return () => {
      isMounted = false;
    };
  }, [syncWithFirebase, silentLogin, checkAndRepairProfile]);

  // Subscribe to notifications only when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('Configurando notificações para usuário autenticado');
      fetchNotifications();
      subscribeToNotifications();
      
      return () => {
        unsubscribeFromNotifications();
      };
    }
  }, [isAuthenticated, user, fetchNotifications, subscribeToNotifications, unsubscribeFromNotifications]);

  // Em vez disso, usamos um useEffect para verificar autenticação e redirecionar
  useEffect(() => {
    if (!isAuthChecking && (!isAuthenticated || !user)) {
      console.log('AppLayout: Usuário não autenticado, redirecionando para login...');
      // Se não estiver mais verificando e não houver usuário autenticado, redirecionar para login
      setTimeout(() => {
        router.replace('/(auth)');
      }, 100);
    } else if (!isAuthChecking && isAuthenticated && user) {
      console.log('AppLayout: Usuário autenticado:', user.name, 'com ID:', user.id);
      console.log('AppLayout: Objeto completo do usuário:', JSON.stringify(user, null, 2));
    }
  }, [isAuthenticated, user, isAuthChecking, router]);

  // Se estiver verificando autenticação, mostrar loading
  if (isAuthChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.card }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Se não estiver autenticado, mostrar uma tela de carregamento enquanto redirecionamos
  if (!isAuthenticated || !user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.card }}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 10, color: Colors.gray[600] }}>Redirecionando...</Text>
      </View>
    );
  }

  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ navigation }) => ({
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerShadowVisible: false,
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            textAlign: 'center',
          },
          headerTitleAlign: 'center',
          drawerActiveTintColor: Colors.primary,
          drawerInactiveTintColor: Colors.gray[600],
          drawerLabelStyle: {
            marginLeft: -5,
            fontSize: 16,
          },
          drawerItemStyle: {
            paddingLeft: 5,
          },
          drawerStyle: {
            backgroundColor: 'white',
            width: 280,
          },
          sceneContainerStyle: {
            backgroundColor: Colors.card,
          },
          headerLeft: ({ canGoBack }) => {
            // Se não puder voltar (estamos na tela inicial) ou estamos em '/'
            // mostrar o menu drawer, caso contrário mostrar o botão voltar
            return (
            <TouchableOpacity 
              onPress={() => navigation.openDrawer()}
              style={styles.menuButton}
            >
              <Menu size={24} color="white" />
            </TouchableOpacity>
            );
          },
          headerRight: () => <HeaderRight />,
        })}
      >
        <Drawer.Screen
          name="index"
          options={{
            title: 'Início',
            drawerIcon: ({ color }) => <Home size={24} color={color} />,
            headerTitle: 'Fácil',
          }}
        />
        
        <Drawer.Screen
          name="problems"
          options={{
            title: 'Problemas',
            drawerIcon: ({ color }) => <AlertTriangle size={24} color={color} />,
          }}
        />
        
        <Drawer.Screen
          name="suggestions"
          options={{
            title: 'Sugestões',
            drawerIcon: ({ color }) => <Lightbulb size={24} color={color} />,
          }}
        />
        
        <Drawer.Screen
          name="notifications"
          options={{
            title: 'Notificações',
            drawerIcon: ({ color }) => <Bell size={24} color={color} />,
          }}
        />
        
        <Drawer.Screen
          name="meetings"
          options={{
            title: 'Reuniões',
            drawerIcon: ({ color }) => <Calendar size={24} color={color} />,
          }}
        />
        
        <Drawer.Screen
          name="boletos"
          options={{
            title: 'Boletos',
            drawerIcon: ({ color }) => <FileText size={24} color={color} />,
          }}
        />
        
        {isManager && (
          <Drawer.Screen
            name="financials"
            options={{
              title: 'Financeiro',
              drawerIcon: ({ color }) => <DollarSign size={24} color={color} />,
            }}
          />
        )}
        
        {isManager && (
          <Drawer.Screen
            name="residents"
            options={{
              title: 'Moradores',
              drawerItemStyle: { display: 'none' },
              drawerLabel: () => null,
              swipeEnabled: false,
            }}
          />
        )}
        
        {isAdmin && (
          <Drawer.Screen
            name="admin"
            options={{
              title: 'Administração',
              drawerItemStyle: { display: 'none' },
              drawerLabel: () => null,
              swipeEnabled: false,
            }}
          />
        )}
        
        {(isAdmin || isManager) && (
          <Drawer.Screen
            name="cameras"
            options={{
              title: 'Câmeras',
              drawerItemStyle: { display: 'none' },
              drawerLabel: () => null,
              swipeEnabled: false,
            }}
          />
        )}
        
        {(isAdmin || isManager) && (
          <Drawer.Screen
            name="meeting/create"
            options={{
              title: 'Nova Reunião',
              drawerItemStyle: { display: 'none' },
              drawerLabel: () => null,
              swipeEnabled: false,
            }}
          />
        )}
        
        <Drawer.Screen
          name="profile"
          options={{
            title: 'Meu Perfil',
            drawerIcon: ({ color }) => <User size={24} color={color} />,
          }}
        />
        
        <Drawer.Screen
          name="settings"
          options={{
            title: 'Configurações',
            drawerIcon: ({ color }) => <Settings size={24} color={color} />,
          }}
        />
        
        <Drawer.Screen
          name="topic/[id]"
          options={{
            title: 'Detalhes da Pauta',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="topic/create"
          options={{
            title: 'Nova Pauta',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="topic/edit/[id]"
          options={{
            title: 'Editar Pauta',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="problem/[id]"
          options={{
            title: 'Detalhes do Problema',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="problem/create"
          options={{
            title: 'Reportar Problema',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="suggestion/[id]"
          options={{
            title: 'Detalhes da Sugestão',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="suggestion/create"
          options={{
            title: 'Nova Sugestão',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="resident/[id]"
          options={{
            title: 'Detalhes do Morador',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="resident/create"
          options={{
            title: 'Novo Morador',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="meeting/[id]"
          options={{
            title: 'Detalhes da Reunião',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="admin/users"
          options={{
            title: 'Gerenciar Usuários',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="admin/user/create"
          options={{
            title: 'Novo Usuário',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="admin/user/[id]"
          options={{
            title: 'Editar Usuário',
            drawerItemStyle: { display: 'none' },
          }}
        />
        
        <Drawer.Screen
          name="financial/[id]"
          options={{
            title: 'Registro Financeiro',
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer>
    </>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    marginBottom: 8,
  },
  drawerItemsContainer: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    marginTop: 8,
  },
  logoutIcon: {
    marginRight: 16,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '500',
  },
  menuButton: {
    marginLeft: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    maxWidth: 120,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    maxWidth: 80,
  },
  customDrawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  drawerItemText: {
    fontSize: 16,
    color: Colors.gray[600],
    marginLeft: 32,
  },
});