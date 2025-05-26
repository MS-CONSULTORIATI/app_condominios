import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as firebase from '@/lib/firebase';
import { FirebaseNotification } from '@/types';

interface NotificationsState {
  notifications: FirebaseNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  fetchNotifications: () => Promise<void>;
  subscribeToNotifications: () => void;
  unsubscribeFromNotifications: () => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => {
      let unsubscribe: (() => void) | null = null;
      
      return {
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        
        fetchNotifications: async () => {
          set({ isLoading: true, error: null });
          try {
            const userId = firebase.auth.currentUser?.uid;
            if (!userId) {
              set({ notifications: [], unreadCount: 0, isLoading: false });
              return;
            }
            
            const notifications = await firebase.getNotifications(userId);
            const unreadCount = notifications.filter(n => !n.read).length;
            
            set({ 
              notifications, 
              unreadCount,
              isLoading: false 
            });
          } catch (error: any) {
            set({ 
              error: error.message || "Failed to fetch notifications", 
              isLoading: false 
            });
          }
        },
        
        subscribeToNotifications: () => {
          // Unsubscribe from previous subscription if exists
          if (unsubscribe) {
            unsubscribe();
          }
          
          // Subscribe to notifications
          unsubscribe = firebase.subscribeToNotifications((notifications) => {
            const unreadCount = notifications.filter(n => !n.read).length;
            set({ notifications, unreadCount });
          });
        },
        
        unsubscribeFromNotifications: () => {
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
        },
        
        markAsRead: async (notificationId) => {
          try {
            await firebase.markNotificationAsRead(notificationId);
            
            // Update local state
            set((state) => {
              const updatedNotifications = state.notifications.map((notification) => 
                notification.id === notificationId 
                  ? { ...notification, read: true } 
                  : notification
              );
              
              const unreadCount = updatedNotifications.filter(n => !n.read).length;
              
              return {
                notifications: updatedNotifications,
                unreadCount,
              };
            });
          } catch (error: any) {
            set({ 
              error: error.message || "Failed to mark notification as read" 
            });
          }
        },
        
        markAllAsRead: async () => {
          try {
            const { notifications } = get();
            const unreadNotifications = notifications.filter(n => !n.read);
            
            // Mark all as read in Firebase
            await Promise.all(
              unreadNotifications.map(notification => 
                firebase.markNotificationAsRead(notification.id)
              )
            );
            
            // Update local state
            set((state) => ({
              notifications: state.notifications.map((notification) => ({
                ...notification,
                read: true,
              })),
              unreadCount: 0,
            }));
          } catch (error: any) {
            set({ 
              error: error.message || "Failed to mark all notifications as read" 
            });
          }
        },
        
        deleteNotification: async (notificationId) => {
          try {
            await firebase.deleteNotification(notificationId);
            
            // Update local state
            set((state) => {
              const updatedNotifications = state.notifications.filter(
                (notification) => notification.id !== notificationId
              );
              
              const unreadCount = updatedNotifications.filter(n => !n.read).length;
              
              return {
                notifications: updatedNotifications,
                unreadCount,
              };
            });
          } catch (error: any) {
            set({ 
              error: error.message || "Failed to delete notification" 
            });
          }
        },
        
        clearAllNotifications: async () => {
          try {
            const { notifications } = get();
            
            // Delete all notifications in Firebase
            await Promise.all(
              notifications.map(notification => 
                firebase.deleteNotification(notification.id)
              )
            );
            
            // Update local state
            set({
              notifications: [],
              unreadCount: 0,
            });
          } catch (error: any) {
            set({ 
              error: error.message || "Failed to clear all notifications" 
            });
          }
        },
      };
    },
    {
      name: 'notifications-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    }
  )
);