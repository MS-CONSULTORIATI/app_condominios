import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useNotificationsStore } from '@/store/notifications-store';
import { formatRelativeTime } from '@/utils/date';
import Colors from '@/constants/colors';
import { Bell, Check, Trash2, ArrowLeft } from 'lucide-react-native';
import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import { FirebaseNotification } from '@/types';

export default function NotificationsScreen() {
  const { 
    notifications, 
    fetchNotifications,
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications,
    isLoading,
    error
  } = useNotificationsStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleBackPress = () => {
    router.push('/');
  };

  const handleNotificationPress = (notification: FirebaseNotification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.relatedItemId) {
      switch (notification.type) {
        case 'topic':
          router.push(`/topic/${notification.relatedItemId}`);
          break;
        case 'problem':
          router.push(`/problem/${notification.relatedItemId}`);
          break;
        case 'suggestion':
          router.push(`/suggestion/${notification.relatedItemId}`);
          break;
        default:
          break;
      }
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      "Limpar Notificações",
      "Tem certeza que deseja limpar todas as notificações?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Limpar", 
          style: "destructive",
          onPress: clearAllNotifications
        }
      ]
    );
  };

  const renderNotificationItem = ({ item }: { item: FirebaseNotification }) => {
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          item.read ? styles.readNotification : styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.notificationTime}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
        
        <View style={styles.notificationActions}>
          {!item.read && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => markAsRead(item.id)}
            >
              <Check size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteNotification(item.id)}
          >
            <Trash2 size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && notifications.length === 0) {
    return <LoadingIndicator fullScreen text="Carregando notificações..." />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Ocorreu um erro ao carregar as notificações. Tente novamente.
        </Text>
        <TouchableOpacity onPress={fetchNotifications} style={styles.retryButton}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity 
          onPress={handleBackPress}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        <View style={styles.rightPlaceholder} />
      </View>

      {notifications.length > 0 ? (
        <>
          <View style={styles.actionsHeader}>
            <View style={styles.headerActions}>
              <Button
                title="Marcar todas como lidas"
                onPress={markAllAsRead}
                variant="outline"
                size="small"
                style={styles.headerButton}
              />
              <Button
                title="Limpar todas"
                onPress={handleClearAll}
                variant="outline"
                size="small"
                style={styles.clearButton}
              />
            </View>
          </View>
          
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <EmptyState
          title="Nenhuma notificação"
          description="Você não tem notificações no momento."
          icon={<Bell size={48} color={Colors.gray[400]} />}
          style={styles.emptyState}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  rightPlaceholder: {
    width: 40,  // Para manter o título centralizado
  },
  actionsHeader: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  clearButton: {
    flex: 1,
    marginHorizontal: 4,
    borderColor: Colors.error,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  readNotification: {
    opacity: 0.8,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    backgroundColor: 'white',
  },
  errorContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.error + '20',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.error,
  },
});