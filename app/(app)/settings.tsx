import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import Colors from '@/constants/colors';
import { Bell, Moon, Lock, Shield, HelpCircle, Fingerprint, ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import * as LocalAuthentication from 'expo-local-authentication';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Stack, useRouter } from 'expo-router';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [biometricAuth, setBiometricAuth] = useState(false);
  const [dataPrivacy, setDataPrivacy] = useState(true);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  
  const { biometricEnabled, enableBiometric } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Check if device supports biometric authentication
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricAvailable(compatible && enrolled);
      setBiometricAuth(biometricEnabled);
    })();
  }, [biometricEnabled]);

  const handleBiometricToggle = async (value: boolean) => {
    try {
      if (!isBiometricAvailable && value) {
        Alert.alert(
          "Biometria não disponível",
          "Seu dispositivo não suporta autenticação biométrica ou não há biometria cadastrada.",
          [{ text: "OK" }]
        );
        return;
      }
      
      await enableBiometric(value);
      setBiometricAuth(value);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Erro",
        "Não foi possível alterar as configurações de biometria.",
        [{ text: "OK" }]
      );
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Configurações',
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

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Animated.Text 
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.sectionTitle}
        >
          Preferências
        </Animated.Text>
        
        <Animated.View 
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.settingsGroup}
        >
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Bell size={24} color={Colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Notificações</Text>
                <Text style={styles.settingDescription}>Receber alertas e notificações</Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.gray[300], true: Colors.primary + '70' }}
              thumbColor={notifications ? Colors.primary : Colors.gray[100]}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Moon size={24} color={Colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Modo Escuro</Text>
                <Text style={styles.settingDescription}>Alterar para tema escuro</Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: Colors.gray[300], true: Colors.primary + '70' }}
              thumbColor={darkMode ? Colors.primary : Colors.gray[100]}
            />
          </View>
        </Animated.View>
        
        <Animated.Text 
          entering={FadeInDown.duration(400).delay(300)}
          style={styles.sectionTitle}
        >
          Segurança
        </Animated.Text>
        
        <Animated.View 
          entering={FadeInDown.duration(400).delay(400)}
          style={styles.settingsGroup}
        >
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Fingerprint size={24} color={Colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Autenticação Biométrica</Text>
                <Text style={styles.settingDescription}>Usar biometria para login</Text>
              </View>
            </View>
            <Switch
              value={biometricAuth}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: Colors.gray[300], true: Colors.primary + '70' }}
              thumbColor={biometricAuth ? Colors.primary : Colors.gray[100]}
              disabled={!isBiometricAvailable}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Lock size={24} color={Colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Bloqueio Automático</Text>
                <Text style={styles.settingDescription}>Bloquear app após inatividade</Text>
              </View>
            </View>
            <Switch
              value={false}
              onValueChange={() => {
                Alert.alert(
                  "Funcionalidade em Desenvolvimento",
                  "Esta funcionalidade estará disponível em breve.",
                  [{ text: "OK" }]
                );
              }}
              trackColor={{ false: Colors.gray[300], true: Colors.primary + '70' }}
              thumbColor={Colors.gray[100]}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Shield size={24} color={Colors.primary} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Privacidade de Dados</Text>
                <Text style={styles.settingDescription}>Compartilhar dados de uso</Text>
              </View>
            </View>
            <Switch
              value={dataPrivacy}
              onValueChange={setDataPrivacy}
              trackColor={{ false: Colors.gray[300], true: Colors.primary + '70' }}
              thumbColor={dataPrivacy ? Colors.primary : Colors.gray[100]}
            />
          </View>
        </Animated.View>
        
        <Animated.Text 
          entering={FadeInDown.duration(400).delay(500)}
          style={styles.sectionTitle}
        >
          Sobre
        </Animated.Text>
        
        <Animated.View 
          entering={FadeInDown.duration(400).delay(600)}
          style={styles.settingsGroup}
        >
          <View style={styles.infoItem}>
            <HelpCircle size={24} color={Colors.primary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Ajuda e Suporte</Text>
              <Text style={styles.settingDescription}>Entre em contato com nossa equipe</Text>
            </View>
          </View>
          
          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>Condomínio Fácil</Text>
            <Text style={styles.versionNumber}>Versão 1.0.0</Text>
          </View>
        </Animated.View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 16,
  },
  settingsGroup: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  versionInfo: {
    padding: 16,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  versionNumber: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 4,
  },
  backButton: {
    marginRight: 36,
    paddingLeft: 12,
  },
});