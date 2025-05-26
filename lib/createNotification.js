// Este arquivo implementa uma versão especializada da função createNotification
// que garante que apenas uma única notificação seja enviada mesmo em caso
// de múltiplas chamadas com os mesmos parâmetros em curto período de tempo.

import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Cache para armazenar notificações recentes e evitar duplicações
const recentNotifications = new Map();

// Tempo de expiração do cache em milissegundos (3 minutos)
const CACHE_EXPIRATION = 3 * 60 * 1000;

/**
 * Cria uma notificação no Firestore e envia push notifications para os usuários.
 * Implementa deduplicação para evitar notificações repetidas.
 * 
 * @param {Object} notificationData - Dados da notificação
 * @param {Function} createNotificationFn - Função original de criação de notificação
 * @param {string} creatorUserId - ID do usuário que criou a notificação
 * @returns {Promise<Object|null>} - Referência para a notificação criada ou null em caso de erro
 */
export const createNotificationOnce = async (
  notificationData,
  createNotificationFn,
  creatorUserId
) => {
  try {
    // Criar uma chave única para essa notificação
    const notificationKey = `${notificationData.type}:${notificationData.relatedItemId}:${creatorUserId || 'none'}`;
    
    // Verificar se uma notificação idêntica foi enviada recentemente
    const cachedNotification = recentNotifications.get(notificationKey);
    if (cachedNotification) {
      const timeSince = Date.now() - cachedNotification.timestamp;
      if (timeSince < CACHE_EXPIRATION) {
        console.log(`[Deduplicação] Notificação idêntica bloqueada (${timeSince}ms atrás): ${notificationData.title}`);
        return cachedNotification.reference;
      }
    }
    
    // Enviar a notificação usando a função original
    console.log(`[Deduplicação] Criando nova notificação: ${notificationData.title}`);
    const notificationRef = await createNotificationFn(notificationData, creatorUserId);
    
    // Armazenar no cache
    recentNotifications.set(notificationKey, {
      timestamp: Date.now(),
      reference: notificationRef
    });
    
    // Limpar entradas antigas do cache periodicamente
    cleanupCache();
    
    return notificationRef;
  } catch (error) {
    console.error('[Deduplicação] Erro ao criar notificação:', error);
    return null;
  }
};

/**
 * Remove entradas expiradas do cache
 */
const cleanupCache = () => {
  const now = Date.now();
  recentNotifications.forEach((value, key) => {
    if (now - value.timestamp > CACHE_EXPIRATION) {
      recentNotifications.delete(key);
    }
  });
}; 