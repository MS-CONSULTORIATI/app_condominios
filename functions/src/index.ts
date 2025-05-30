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
      const eventId = event.id;
      logger.info(`[${eventId}] Nova notificação recebida. Evento ID: ${eventId}`);

      const snapshot: QueryDocumentSnapshot | undefined = event.data;
      if (!snapshot) {
        logger.warn(`[${eventId}] Evento sem dados (event.data é undefined). Abortando.`);
        return;
      }

      const notificationData = snapshot.data();
      if (!notificationData) {
        logger.warn(`[${eventId}] Dados da notificação não encontrados (snapshot.data() é undefined ou null). Snapshot ID: ${snapshot.id}. Abortando.`);
        return;
      }

      logger.info(`[${eventId}] Processando notificação ID: ${snapshot.id}, Título: "${notificationData.title}", Tipo: ${notificationData.type}, Item Relacionado: ${notificationData.relatedItemId || "N/A"}`);

      const creatorUserId = notificationData.creatorUserId; // ID do usuário que criou a notificação original
      logger.info(`[${eventId}] Criador original da notificação (creatorUserId): ${creatorUserId || "Não especificado"}`);

      // Coletar tokens de push
      const tokens: string[] = [];
      const userTokensMap = new Map<string, string>(); // Para evitar tokens duplicados e associar token ao usuário

      // Método 1: Obter tokens da coleção users
      logger.info(`[${eventId}] Coletando tokens da coleção 'users'`);
      const usersSnapshot = await admin.firestore().collection("users").get();
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const userId = doc.id;
        // Excluir o criador da notificação da lista de destinatários
        if (creatorUserId && userId === creatorUserId) {
          logger.info(`[${eventId}] Usuário ${userId} é o criador da notificação, será ignorado.`);
          return;
        }
        if (userData.pushToken) {
          if (!userTokensMap.has(userData.pushToken)) {
            tokens.push(userData.pushToken);
            userTokensMap.set(userData.pushToken, userId);
            logger.info(`[${eventId}] Token ${userData.pushToken.substring(0, 15)}... (de users/${userId}) adicionado.`);
          } else {
            logger.info(`[${eventId}] Token ${userData.pushToken.substring(0, 15)}... (de users/${userId}) já existe (associado a users/${userTokensMap.get(userData.pushToken)}), ignorando duplicata.`);
          }
        } else {
          logger.info(`[${eventId}] Usuário ${userId} não possui pushToken.`);
        }
      });
      logger.info(`[${eventId}] ${tokens.length} tokens únicos coletados da coleção 'users' (excluindo criador se aplicável).`);

      // NOTA: A busca na coleção 'push_tokens' foi removida conforme sua implementação original em lib/firebase.ts.
      // Se você tem uma coleção 'push_tokens' separada e funcional, pode reativar essa lógica.
      // Por ora, vamos confiar apenas nos tokens da coleção 'users'.
      /*
      logger.info(`[${eventId}] Coletando tokens da coleção 'push_tokens'`);
      const tokensSnapshot = await admin.firestore().collection("push_tokens").get();
      let pushTokensCollectionCount = 0;
      tokensSnapshot.forEach((doc) => {
        const tokenData = doc.data();
        if (tokenData.token && !userTokensMap.has(tokenData.token)) {
            // Aqui, precisaríamos saber a qual usuário este token pertence para aplicar a lógica de exclusão do criador.
            // Se a coleção 'push_tokens' não tiver uma referência ao userId, a exclusão do criador pode não funcionar corretamente para estes tokens.
            // Considerar adicionar userId à coleção 'push_tokens' ou confiar apenas nos tokens de 'users'.
          tokens.push(tokenData.token);
          userTokensMap.set(tokenData.token, tokenData.userId || 'unknown_user_from_push_tokens'); // Supondo que haja um campo userId
          pushTokensCollectionCount++;
          logger.info(`[${eventId}] Token ${tokenData.token.substring(0,15)}... (de push_tokens/${doc.id}) adicionado.`);
        } else if (tokenData.token && userTokensMap.has(tokenData.token)) {
            logger.info(`[${eventId}] Token ${tokenData.token.substring(0,15)}... (de push_tokens/${doc.id}) já existe, ignorando duplicata.`);
        }
      });
      if(pushTokensCollectionCount > 0) {
        logger.info(`[${eventId}] ${pushTokensCollectionCount} tokens adicionais coletados da coleção 'push_tokens'. Total atual: ${tokens.length}`);
      }
      */

      if (tokens.length === 0) {
        logger.warn(`[${eventId}] Nenhum token de push válido encontrado após todas as coletas. Notificação não será enviada.`);
        return;
      }

      logger.info(`[${eventId}] Total de ${tokens.length} tokens únicos selecionados para envio.`);

      // Separar tokens FCM e tokens Expo
      const fcmTokens = tokens.filter((token) => !token.startsWith("ExponentPushToken"));
      const expoTokens = tokens.filter((token) => token.startsWith("ExponentPushToken"));
      
      logger.info(`[${eventId}] Tokens categorizados: ${fcmTokens.length} FCM, ${expoTokens.length} Expo`);

      // Processar tokens FCM usando firebase-admin
      if (fcmTokens.length > 0) {
        // Preparar a mensagem multicast
        const multicastMessage = {
          tokens: fcmTokens,
          notification: {
            title: notificationData.title,
            body: notificationData.message,
          },
          data: {
            eventId: eventId, // Adicionando eventId para rastreamento
            notificationId: snapshot.id,
            type: notificationData.type || "",
            relatedItemId: notificationData.relatedItemId || "",
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
        };

        try {
          logger.info(`[${eventId}] Enviando ${fcmTokens.length} notificações FCM via firebase-admin. Tokens: ${fcmTokens.join(", ")}`);
          const response = await admin.messaging().sendEachForMulticast(multicastMessage);
          logger.info(`[${eventId}] Notificações FCM enviadas: ${response.successCount} sucesso, ${response.failureCount} falhas.`);
          if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                logger.warn(`[${eventId}] Falha ao enviar FCM para token: ${fcmTokens[idx]}, Erro: ${resp.error?.code}, Mensagem: ${resp.error?.message}`);
              }
            });
          }
        } catch (error: any) {
          logger.error(`[${eventId}] ERRO ao enviar notificações FCM via firebase-admin:`, error.code, error.message, error.stack);
        }
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
            eventId: eventId, // Adicionando eventId para rastreamento
            notificationId: snapshot.id,
            type: notificationData.type,
            relatedItemId: notificationData.relatedItemId,
          },
          priority: "high" as const, // Adicionado "as const" para tipagem mais precisa
          channelId: "default", // Canal padrão para Android
        }));
        
        // Dividir em lotes de 100 (limite do Expo)
        const expoChunks = [];
        const expoChunkSize = 100;
        
        for (let i = 0; i < expoMessages.length; i += expoChunkSize) {
          expoChunks.push(expoMessages.slice(i, i + expoChunkSize));
        }
        
        // Enviar cada lote para o serviço Expo
        const expoPromises = expoChunks.map(async (chunk, chunkIndex) => {
          try {
            logger.info(`[${eventId}] Enviando lote ${chunkIndex + 1}/${expoChunks.length} de ${chunk.length} notificações via Expo Push Service. Tokens: ${chunk.map((c) => c.to.substring(0, 15) + "...").join(", ")}`);
            const response = await axios.post(
              "https://exp.host/--/api/v2/push/send",
              chunk,
              {
                headers: {
                  "Accept": "application/json",
                  "Content-Type": "application/json", 
                  "Accept-Encoding": "gzip, deflate", // Adicionado por recomendação da Expo
                },
              }
            );
            
            logger.info(`[${eventId}] Resposta do Expo para lote ${chunkIndex + 1}:`, JSON.stringify(response.data, null, 2));
            // Verificar se há erros individuais nos tickets do Expo
            if (response.data && Array.isArray(response.data.data)) {
              response.data.data.forEach((ticket: any) => {
                if (ticket.status === "error") {
                  logger.warn(`[${eventId}] Erro no ticket Expo para token ${ticket.to ? ticket.to.substring(0, 15) + "..." : "TOKEN_DESCONHECIDO"}: ${ticket.message}`, ticket.details);
                }
              });
            }
            return response.data;
          } catch (error: any) {
            const errorMessage = `[${eventId}] ERRO ao enviar lote ${chunkIndex + 1} de notificações Expo:`;
            if (error.response) {
              // O servidor respondeu com um status fora da faixa 2xx
              logger.error(errorMessage, `Data: ${JSON.stringify(error.response.data, null, 2)}, Status: ${error.response.status}, Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
            } else if (error.request) {
              // A requisição foi feita mas nenhuma resposta foi recebida
              logger.error(errorMessage, `Nenhuma resposta recebida: ${error.request}`);
            } else {
              // Algo aconteceu ao configurar a requisição que acionou um erro
              logger.error(errorMessage, `Erro na configuração: ${error.message}`);
            }
            // logger.error(`Stack: ${error.stack}`); // Pode ser muito verboso
            // Não relançar o erro aqui para permitir que outros lotes sejam processados, mas o erro já foi logado.
            return null; // Retornar null para que Promise.all não rejeite imediatamente
          }
        });
        
        // Aguardar todas as requisições Expo
        try {
          const results = await Promise.all(expoPromises);
          logger.info(`[${eventId}] Todos os lotes Expo processados. Resultados:`, results.filter((r) => r !== null).length > 0 ? JSON.stringify(results.filter((r) => r !== null), null, 2) : "Nenhuma resposta bem-sucedida ou todos os lotes falharam.");
          logger.info(`[${eventId}] Notificações Expo potencialmente enviadas.`);
        } catch (batchError) {
            // Este catch é mais para o caso de Promise.all() em si falhar, 
            // embora os erros de lote individuais sejam tratados e logados acima.
            logger.error(`[${eventId}] ERRO CRÍTICO no processamento de lotes Expo:`, batchError);
        }
      }
      
      logger.info(`[${eventId}] Processamento da notificação ID: ${snapshot.id} concluído. ${fcmTokens.length} FCM e ${expoTokens.length} Expo processados.`);
    } catch (error: any) {
      const eventId = event?.id || "ID_EVENTO_DESCONHECIDO";
      logger.error(`[${eventId}] ERRO GERAL ao processar notificação na Cloud Function:`, error.message, error.stack);
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

      // Separar tokens FCM e tokens Expo
      const fcmTokens = tokens.filter((token) => !token.startsWith("ExponentPushToken"));
      const expoTokens = tokens.filter((token) => token.startsWith("ExponentPushToken"));
      
      logger.info(`Tokens categorizados: ${fcmTokens.length} FCM, ${expoTokens.length} Expo`);
      
      // Enviando notificações FCM usando firebase-admin
      let fcmResult = null;
      if (fcmTokens.length > 0) {
        const multicastMessage = {
          tokens: fcmTokens,
          notification: {
            title,
            body: message,
          },
          data: { title, message },
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
        };
        try {
          logger.info(`Enviando notificações FCM via firebase-admin para ${fcmTokens.length} tokens`);
          fcmResult = await admin.messaging().sendEachForMulticast(multicastMessage);
          logger.info(`Notificações FCM enviadas: ${fcmResult.successCount} sucesso, ${fcmResult.failureCount} falhas`);
          if (fcmResult.failureCount > 0) {
            fcmResult.responses.forEach((resp, idx) => {
              if (!resp.success) {
                logger.warn(`Falha ao enviar para token: ${fcmTokens[idx]}, erro: ${resp.error?.message}`);
              }
            });
          }
        } catch (error) {
          logger.error("Erro ao enviar notificações FCM via firebase-admin:", error);
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
        fcmResult: fcmResult || null,
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
