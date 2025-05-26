/**
 * Import function triggers from their respective submodules:
 */
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";
const axios = require("axios");

// Inicializar o app do Firebase Admin
admin.initializeApp();

// Função executada quando uma nova notificação é criada no Firestore
export const sendPushNotification = onDocumentCreated(
  "notifications/{notificationId}",
  async (event) => {
    try {
      // Obter os dados da notificação
      const snapshot: QueryDocumentSnapshot = event.data!;
      const notificationData = snapshot.data();

      if (!notificationData) {
        logger.info("Nenhum dado de notificação encontrado");
        return;
      }

      // Log para debug
      logger.info("Nova notificação criada:", notificationData);

      // Coletar tokens de push
      const tokens: string[] = [];

      // Método 1: Obter tokens da coleção users
      const usersSnapshot = await admin.firestore().collection("users").get();

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.pushToken) {
          tokens.push(userData.pushToken);
          logger.info(`Token obtido do usuário: ${doc.id}`);
        }
      });

      // Método 2: Obter tokens da coleção push_tokens (mais confiável)
      const tokensSnapshot = await admin.firestore().collection("push_tokens").get();
      
      tokensSnapshot.forEach((doc) => {
        const tokenData = doc.data();
        if (tokenData.token && !tokens.includes(tokenData.token)) {
          tokens.push(tokenData.token);
          logger.info(`Token obtido da coleção push_tokens: ${tokenData.token.substr(0, 10)}...`);
        }
      });

      if (tokens.length === 0) {
        logger.info("Nenhum token de push encontrado para enviar notificação");
        return;
      }

      logger.info(`Enviando notificação para ${tokens.length} dispositivos`);

      // Enviar notificação diretamente através da API do Firebase Cloud Messaging
      // Obter a chave do servidor FCM da configuração
      const firebaseAPIKey = functions.config().messaging?.server_key || "";
      
      if (!firebaseAPIKey) {
        logger.error("Chave de servidor FCM não configurada. Configure através de 'firebase functions:config:set messaging.server_key=SUA_CHAVE_AQUI'");
        return;
      }

      logger.info("Usando chave de servidor FCM para enviar notificações");

      // Separar tokens FCM e tokens Expo
      const fcmTokens = tokens.filter((token) => !token.startsWith("ExponentPushToken"));
      const expoTokens = tokens.filter((token) => token.startsWith("ExponentPushToken"));
      
      logger.info(`Tokens categorizados: ${fcmTokens.length} FCM, ${expoTokens.length} Expo`);

      // Processar tokens FCM
      if (fcmTokens.length > 0) {
        // Preparar o payload para o FCM
        const fcmMessages = fcmTokens.map((token) => ({
          to: token,
          notification: {
            title: notificationData.title,
            body: notificationData.message,
            sound: "default",
            android_channel_id: "default",
          },
          data: {
            type: notificationData.type,
            relatedItemId: notificationData.relatedItemId,
          },
          android: {
            priority: "high" as const,
            notification: {
              channel_id: "default",
              priority: "high" as const,
              default_sound: true,
              default_vibrate_timings: true,
              icon: "notification_icon",
              color: "#1E3A8A",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
                content_available: true,
              },
            },
          },
        }));

        // Enviar as mensagens em lotes para o FCM
        const chunkSize = 500; // FCM permite até 500 mensagens por requisição
        const chunks = [];

        for (let i = 0; i < fcmMessages.length; i += chunkSize) {
          chunks.push(fcmMessages.slice(i, i + chunkSize));
        }

        // Enviar cada lote para a API do FCM
        const sendPromises = chunks.map(async (chunk) => {
          try {
            logger.info(`Enviando lote de ${chunk.length} notificações via FCM`);
            const response = await axios.post(
              "https://fcm.googleapis.com/fcm/send",
              chunk.length === 1 ? chunk[0] : { registration_ids: chunk.map((msg) => msg.to) },
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `key=${firebaseAPIKey}`,
                },
              }
            );

            logger.info("Resposta do FCM:", response.data);
            return response.data;
          } catch (error) {
            logger.error("Erro ao enviar notificação via FCM:", error);
            throw error;
          }
        });

        // Aguardar todas as requisições FCM
        await Promise.all(sendPromises);
        logger.info("Notificações FCM enviadas com sucesso");
      }
      
      // Processar tokens Expo
      if (expoTokens.length > 0) {
        // Preparar mensagens para o Expo Push Service
        const expoMessages = expoTokens.map((token) => ({
          to: token,
          sound: "default", 
          title: notificationData.title,
          body: notificationData.message,
          data: { 
            type: notificationData.type,
            relatedItemId: notificationData.relatedItemId,
          },
          priority: "high",
          channelId: "default",
        }));
        
        // Dividir em lotes de 100 (limite do Expo)
        const expoChunks = [];
        const expoChunkSize = 100;
        
        for (let i = 0; i < expoMessages.length; i += expoChunkSize) {
          expoChunks.push(expoMessages.slice(i, i + expoChunkSize));
        }
        
        // Enviar cada lote para o serviço Expo
        const expoPromises = expoChunks.map(async (chunk) => {
          try {
            logger.info(`Enviando lote de ${chunk.length} notificações via Expo Push Service`);
            const response = await axios.post(
              "https://exp.host/--/api/v2/push/send",
              chunk,
              {
                headers: {
                  "Accept": "application/json",
                  "Content-Type": "application/json", 
                },
              }
            );
            
            logger.info("Resposta do Expo:", response.data);
            return response.data;
          } catch (error) {
            logger.error("Erro ao enviar notificação via Expo:", error);
            throw error;
          }
        });
        
        // Aguardar todas as requisições Expo
        await Promise.all(expoPromises);
        logger.info("Notificações Expo enviadas com sucesso");
      }
      
      logger.info(`Notificações enviadas: ${fcmTokens.length} via FCM, ${expoTokens.length} via Expo`);
    } catch (error) {
      logger.error("Erro ao processar e enviar notificação:", error);
    }
  }
);

// Função para enviar manualmente uma notificação push (teste)
export const testPushNotification = functions.https.onRequest(
  async (request, response) => {
    try {
      const { title, message, tokens } = request.body;

      if (!title || !message || !tokens || !Array.isArray(tokens)) {
        response.status(400).send({
          error: "Requisição inválida. Forneça title, message e tokens",
        });
        return;
      }

      // Obter a chave do servidor FCM da configuração
      const firebaseAPIKey = functions.config().messaging?.server_key || "";
      
      if (!firebaseAPIKey) {
        logger.error("Chave de servidor FCM não configurada");
        response.status(500).send({
          success: false,
          error: "Chave de servidor FCM não configurada. Configure através de 'firebase functions:config:set messaging.server_key=SUA_CHAVE_AQUI'",
        });
        return;
      }
      
      // Separar tokens FCM e tokens Expo
      const fcmTokens = tokens.filter((token) => !token.startsWith("ExponentPushToken"));
      const expoTokens = tokens.filter((token) => token.startsWith("ExponentPushToken"));
      
      logger.info(`Tokens categorizados: ${fcmTokens.length} FCM, ${expoTokens.length} Expo`);
      
      // Enviando notificações FCM
      let fcmResult = null;
      if (fcmTokens.length > 0) {
        // Preparar o payload para o FCM
        const fcmPayload = fcmTokens.length === 1 ?
          {
            to: fcmTokens[0],
            notification: {
              title,
              body: message,
              sound: "default",
              android_channel_id: "default",
            },
            data: { title, message },
            android: {
              priority: "high" as const,
              notification: {
                channel_id: "default",
                priority: "high" as const,
                default_sound: true,
                default_vibrate_timings: true,
                icon: "notification_icon",
                color: "#1E3A8A",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: 1,
                  content_available: true,
                },
              },
            },
          } :
          {
            registration_ids: fcmTokens,
            notification: {
              title,
              body: message,
              sound: "default",
              android_channel_id: "default",
            },
            data: { title, message },
            android: {
              priority: "high" as const,
              notification: {
                channel_id: "default",
                priority: "high" as const,
                default_sound: true,
                default_vibrate_timings: true,
                icon: "notification_icon",
                color: "#1E3A8A",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: 1,
                  content_available: true,
                },
              },
            },
          };

        // Enviar ao serviço do FCM
        try {
          fcmResult = await axios.post(
            "https://fcm.googleapis.com/fcm/send",
            fcmPayload,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `key=${firebaseAPIKey}`,
              },
            }
          );
          logger.info("Notificação de teste FCM enviada:", fcmResult.data);
        } catch (fcmError) {
          logger.error("Erro ao enviar notificação FCM:", fcmError);
        }
      }
      
      // Enviando notificações Expo
      let expoResult = null;
      if (expoTokens.length > 0) {
        try {
          // Preparar mensagens para o Expo Push Service
          const expoMessages = expoTokens.map((token) => ({
            to: token,
            sound: "default", 
            title,
            body: message,
            data: { title, message },
            priority: "high",
            channelId: "default",
          }));
          
          expoResult = await axios.post(
            "https://exp.host/--/api/v2/push/send",
            expoMessages,
            {
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json", 
              },
            }
          );
          
          logger.info("Notificação de teste Expo enviada:", expoResult.data);
        } catch (expoError) {
          logger.error("Erro ao enviar notificação Expo:", expoError);
        }
      }

      response.status(200).send({
        success: true,
        message: `Notificações enviadas: ${fcmTokens.length} via FCM, ${expoTokens.length} via Expo`,
        fcmResult: fcmResult?.data || null,
        expoResult: expoResult?.data || null,
      });
    } catch (error) {
      logger.error("Erro ao enviar notificação de teste:", error);

      response.status(500).send({
        success: false,
        error: "Erro ao enviar notificação",
        details: error,
      });
    }
  }
);

// Função para processar notificações FCM pendentes
export const processPendingFcmNotifications = onDocumentCreated(
  "pendingNotifications/{notificationId}",
  async (event) => {
    try {
      // Obter os dados da notificação
      const snapshot = event.data!;
      const notificationData = snapshot.data();

      // Se já foi processada ou não tem dados válidos, ignorar
      if (!notificationData || notificationData.processed) {
        logger.info("Notificação já processada ou dados inválidos");
        return;
      }

      const { title, message, tokens } = notificationData;
      
      if (!title || !message || !tokens || !Array.isArray(tokens) || tokens.length === 0) {
        logger.error("Dados de notificação pendente inválidos", notificationData);
        // Marcar como processada para não tentar novamente
        await admin.firestore().doc(`pendingNotifications/${snapshot.id}`).update({
          processed: true,
          error: "Dados inválidos",
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      logger.info(`Processando ${tokens.length} tokens FCM para notificação: "${title}"`);

      // Processar em lotes de 500 (limite FCM)
      const batchSize = 500;
      const batches: string[][] = [];
      
      for (let i = 0; i < tokens.length; i += batchSize) {
        batches.push(tokens.slice(i, i + batchSize));
      }
      
      // Status para acompanhamento
      let successCount = 0;
      let failureCount = 0;
      
      // Processar cada lote
      for (const [index, batch] of batches.entries()) {
        try {
          // Criar mensagem multicast para FCM
          const fcmMessage = {
            tokens: batch,
            notification: {
              title,
              body: message,
            },
            android: {
              priority: "high" as const,
              notification: {
                channelId: "default",
                priority: "high" as const,
                defaultSound: true,
                defaultVibrateTimings: true,
                icon: "notification_icon",
                color: "#1E3A8A",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: 1,
                  contentAvailable: true,
                },
              },
            },
            data: { 
              title, 
              body: message,
              source: "pendingNotification",
            },
          };
          
          // Enviar via Admin SDK
          const batchResponse = await admin.messaging().sendEachForMulticast(fcmMessage);
          
          successCount += batchResponse.successCount;
          failureCount += batchResponse.failureCount;
          
          logger.info(`Lote ${index+1}/${batches.length}: ${batchResponse.successCount} sucesso, ${batchResponse.failureCount} falhas`);
          
          // Registrar tokens com falha para depuração
          if (batchResponse.failureCount > 0) {
            const failedTokens: {token: string, error?: string}[] = [];
            batchResponse.responses.forEach((resp: any, idx: number) => {
              if (!resp.success) {
                failedTokens.push({
                  token: batch[idx],
                  error: resp.error?.message,
                });
              }
            });
            
            logger.warn(`Tokens com falha no lote ${index+1}:`, failedTokens);
            
            // Opcional: remover tokens inválidos
            // Isso poderia ser implementado atualizando a coleção de usuários
          }
        } catch (batchError) {
          logger.error(`Erro ao processar lote ${index+1}:`, batchError);
          failureCount += batch.length;
        }
      }
      
      // Atualizar o documento com resultado do processamento
      await admin.firestore().doc(`pendingNotifications/${snapshot.id}`).update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        stats: {
          total: tokens.length,
          success: successCount,
          failure: failureCount,
        },
      });
      
      logger.info(`Notificação processada: ${successCount} enviadas com sucesso, ${failureCount} falhas`);
    } catch (error) {
      logger.error("Erro ao processar notificação pendente:", error);
      
      // Tentar marcar como erro, mas não falhar se isso também der erro
      try {
        await admin.firestore().doc(`pendingNotifications/${event.data!.id}`).update({
          processed: true,
          error: "Erro de processamento",
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (updateError) {
        logger.error("Erro ao atualizar status de notificação com falha:", updateError);
      }
    }
  }
);
