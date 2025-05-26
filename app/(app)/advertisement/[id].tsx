import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Share, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useAdvertisementsStore } from '@/store/advertisements-store';
import Colors from '@/constants/colors';
import { ArrowLeft, Heart, Edit, Trash2, Share2, Tag, Clock, Phone, ShoppingBag, Check, Gavel, Timer, Award, TrendingUp, Eye, MessageCircle, Send, CornerDownRight } from 'lucide-react-native';
import LoadingIndicator from '@/components/LoadingIndicator';
import { formatCurrency, formatDate } from '@/utils/format';
import { formatRelativeTime } from '@/utils/format';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { Comment } from '@/types';
import Svg, { Path } from 'react-native-svg';
import AdvertisementImageGallery from '../../components/AdvertisementImageGallery';

// Componente personalizado para o ícone do WhatsApp
const WhatsAppIcon = ({ size, color }: { size: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M17.6 6.3C16.2 4.9 14.2 4 12.1 4C7.8 4 4.3 7.5 4.3 11.8C4.3 13.4 4.8 15 5.6 16.3L4.2 20L8 18.7C9.3 19.5 10.7 19.9 12.1 19.9C16.4 19.9 19.9 16.4 19.9 12.1C20 10 19.1 8 17.6 6.3ZM12.1 18.5C10.8 18.5 9.6 18.1 8.5 17.5L8.2 17.3L6 18.1L6.8 16L6.6 15.7C5.9 14.5 5.6 13.2 5.6 11.9C5.6 8.3 8.5 5.4 12.1 5.4C13.8 5.4 15.5 6.1 16.7 7.3C17.9 8.5 18.6 10.1 18.6 11.9C18.6 15.4 15.7 18.5 12.1 18.5ZM15.8 13.7C15.6 13.6 14.6 13.1 14.4 13.1C14.2 13 14.1 13 14 13.2C13.9 13.4 13.5 13.8 13.4 14C13.3 14.1 13.2 14.1 13 14C12.3 13.7 11.6 13.2 11.1 12.7C10.7 12.2 10.3 11.6 10 11C10 10.9 10 10.7 10.2 10.6C10.3 10.5 10.4 10.3 10.5 10.2C10.6 10.1 10.6 10 10.7 9.8C10.8 9.7 10.7 9.6 10.7 9.5C10.7 9.4 10.3 8.4 10.1 8C10 7.5 9.9 7.5 9.7 7.5C9.6 7.5 9.5 7.5 9.3 7.5C9.1 7.5 8.9 7.6 8.7 7.7C8.5 7.9 8 8.4 8 9.4C8 10.3 8.6 11.2 8.7 11.4C8.8 11.5 10.2 13.8 12.5 14.7C14.2 15.4 14.7 15.2 15.2 15.1C15.7 15 16.5 14.6 16.7 14.1C16.9 13.6 16.9 13.1 16.8 13.1C16.7 13.1 16.6 13 16.4 13C16.2 13.4 16 13.5 15.8 13.7Z" 
      fill={color || "#25D366"}
    />
  </Svg>
);

export default function AdvertisementDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { 
    getAdvertisement, 
    fetchAdvertisements, 
    toggleLike, 
    removeAdvertisement, 
    markAsSold,
    placeBid,
    getAuctionBids,
    checkAuctionStatus,
    isLoading,
    incrementViews,
    addComment,
    replyToComment,
    getComments
  } = useAdvertisementsStore();
  
  const [advertisement, setAdvertisement] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bids, setBids] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isAuctionEnded, setIsAuctionEnded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  
  // Buscar anúncio e verificar status inicial
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      const ad = await getAdvertisement(id as string);
      
      if (ad) {
        // Atualizar o estado local com os dados do anúncio
        setAdvertisement(ad);
        
        // Verificar se o usuário curtiu o anúncio
        if (user) {
          setIsLiked(ad.likes.includes(user.id));
        }
        
        await checkAuctionStatus(ad.id);
        
        if (ad.isAuction) {
          const auctionBids = await getAuctionBids(ad.id);
          setBids(auctionBids.sort((a, b) => b.createdAt - a.createdAt));
          
          // Verificar se o leilão já terminou
          if (ad.auctionEndDate && ad.auctionEndDate < Date.now()) {
            setIsAuctionEnded(true);
          } else {
            setIsAuctionEnded(false);
          }
        }
        
        // Incrementar contagem de visualizações apenas se:
        // 1. O usuário estiver logado
        // 2. O usuário não for o dono do anúncio
        if (user && user.id !== ad.createdBy) {
          incrementViews(ad.id);
        }
      }
    };
    
    fetchData();
  }, [id, user, getAdvertisement, getAuctionBids, checkAuctionStatus, incrementViews]);
  
  // Atualizar tempo restante do leilão
  useEffect(() => {
    if (!advertisement || !advertisement.isAuction || !advertisement.auctionEndDate) {
      return;
    }
    
    const updateTimeLeft = () => {
      const now = Date.now();
      const endTime = advertisement.auctionEndDate;
      
      if (now >= endTime) {
        setTimeLeft('Encerrado');
        setIsAuctionEnded(true);
        // Verificar status do leilão quando terminar
        checkAuctionStatus(advertisement.id);
        return;
      }
      
      const diff = endTime - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };
    
    updateTimeLeft();
    const intervalId = setInterval(updateTimeLeft, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [advertisement]);
  
  const refreshAdvertisement = useCallback(async () => {
    const ad = getAdvertisement(id as string);
    setAdvertisement(ad || null);
    
    if (ad) {
      if (user) {
        setIsLiked(ad.likes.includes(user.id));
      }
      
      // Se for leilão, carregar os lances
      if (ad.isAuction) {
        const auctionBids = await getAuctionBids(ad.id);
        // Ordenar do lance mais recente para o mais antigo
        setBids(auctionBids.sort((a, b) => b.createdAt - a.createdAt));
        
        // Verificar se o leilão já terminou
        if (ad.auctionEndDate && ad.auctionEndDate < Date.now()) {
          setIsAuctionEnded(true);
        } else {
          setIsAuctionEnded(false);
        }
      }
      
      // Incrementar contagem de visualizações, apenas se o usuário não for o dono do anúncio
      if (user && user.id !== ad.createdBy) {
        incrementViews(ad.id);
      }
    }
  }, [id, user, getAdvertisement, getAuctionBids, incrementViews]);
  
  const isOwner = advertisement && user && advertisement.createdBy === user.id;
  
  const handleBackPress = () => {
    router.push('/advertisements');
  };
  
  const handleEditPress = () => {
    router.push({
      pathname: `/advertisement/edit/[id]` as any,
      params: { id: advertisement.id }
    });
  };
  
  const handleDeletePress = () => {
    Alert.alert(
      'Remover Anúncio',
      'Tem certeza que deseja remover este anúncio? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const success = await removeAdvertisement(advertisement.id);
              if (success) {
                Alert.alert(
                  'Sucesso',
                  'Anúncio removido com sucesso',
                  [{ text: 'OK', onPress: () => router.push('/advertisements') }]
                );
              } else {
                Alert.alert('Erro', 'Não foi possível remover o anúncio. Tente novamente.');
                setIsDeleting(false);
              }
            } catch (error) {
              console.error('Erro ao remover anúncio:', error);
              Alert.alert('Erro', 'Ocorreu um erro ao remover o anúncio.');
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };
  
  const handleLikePress = async () => {
    if (!user) {
      Alert.alert('Atenção', 'Você precisa estar logado para curtir um anúncio.');
      return;
    }
    
    try {
      await toggleLike(advertisement.id);
      refreshAdvertisement();
    } catch (error) {
      console.error('Erro ao curtir/descurtir:', error);
    }
  };
  
  const handleContactPress = () => {
    if (advertisement.ownerContact) {
      Alert.alert(
        'Contato', 
        'Como deseja entrar em contato?',
        [
          {
            text: 'Ligar',
            onPress: () => Linking.openURL(`tel:${advertisement.ownerContact}`)
          },
          {
            text: 'WhatsApp',
            onPress: () => Linking.openURL(`https://wa.me/55${advertisement.ownerContact.replace(/\D/g, '')}?text=Olá! Vi seu anúncio "${advertisement.title}" no app do Condomínio Santa Cecília e tenho interesse.`)
          },
          {
            text: 'Cancelar',
            style: 'cancel'
          }
        ]
      );
    } else {
      Alert.alert('Contato', `Entre em contato com ${advertisement.ownerName} na unidade ${advertisement.ownerUnit}.`);
    }
  };
  
  const handleWhatsAppPress = () => {
    if (advertisement.ownerContact) {
      // Remover todos os caracteres não numéricos do número de telefone
      const phoneNumber = advertisement.ownerContact.replace(/\D/g, '');
      // Criar mensagem pré-formatada
      const message = `Olá! Vi seu anúncio "${advertisement.title}" no app do Condomínio Santa Cecília e tenho interesse.`;
      // Abrir WhatsApp com o número e mensagem
      Linking.openURL(`https://wa.me/55${phoneNumber}?text=${encodeURIComponent(message)}`);
    } else {
      Alert.alert('WhatsApp indisponível', `O vendedor ${advertisement.ownerName} não forneceu um número de contato.`);
    }
  };
  
  const handleSharePress = async () => {
    try {
      await Share.share({
        message: `Confira este anúncio: ${advertisement.title} - ${formatCurrency(advertisement.price)}`,
        title: `Anúncio: ${advertisement.title}`
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };
  
  const handleMarkAsSold = async () => {
    if (!isOwner) return;
    
    Alert.alert(
      'Marcar como Vendido',
      'Deseja marcar este item como vendido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar',
          onPress: async () => {
            setIsUpdating(true);
            try {
              const success = await markAsSold(advertisement.id);
              if (success) {
                refreshAdvertisement();
                Alert.alert('Sucesso', 'Anúncio marcado como vendido!');
              } else {
                Alert.alert('Erro', 'Não foi possível atualizar o status do anúncio.');
              }
            } catch (error) {
              console.error('Erro ao marcar como vendido:', error);
              Alert.alert('Erro', 'Ocorreu um erro ao atualizar o status.');
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };
  
  // Função para dar um lance
  const handlePlaceBid = async () => {
    if (!user) {
      Alert.alert('Atenção', 'Você precisa estar logado para dar um lance.');
      return;
    }
    
    if (isOwner) {
      Alert.alert('Atenção', 'Você não pode dar lance em seu próprio leilão.');
      return;
    }
    
    if (isAuctionEnded) {
      Alert.alert('Leilão encerrado', 'Este leilão já foi encerrado.');
      return;
    }
    
    const bidValue = parseFloat(bidAmount.replace(',', '.'));
    
    if (isNaN(bidValue) || bidValue <= 0) {
      Alert.alert('Valor inválido', 'Por favor, informe um valor válido para o lance.');
      return;
    }
    
    if (advertisement.currentBid && bidValue <= advertisement.currentBid) {
      Alert.alert('Lance insuficiente', `Seu lance deve ser maior que o atual: ${formatCurrency(advertisement.currentBid)}`);
      return;
    }
    
    try {
      setBidLoading(true);
      const success = await placeBid(advertisement.id, bidValue);
      
      if (success) {
        Alert.alert('Sucesso', 'Seu lance foi registrado!');
        setBidAmount('');
        refreshAdvertisement();
      } else {
        Alert.alert('Erro', 'Não foi possível registrar seu lance. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao dar lance:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao processar seu lance.');
    } finally {
      setBidLoading(false);
    }
  };
  
  // Obter nome do vencedor do leilão
  const getWinnerName = () => {
    if (!advertisement || !advertisement.isAuction || !isAuctionEnded || !bids.length) {
      return null;
    }
    
    // Ordenar por valor do lance (maior para menor)
    const sortedBids = [...bids].sort((a, b) => b.amount - a.amount);
    if (sortedBids.length > 0) {
      return sortedBids[0].userName;
    }
    
    return null;
  };
  
  // Função para adicionar um comentário
  const handleAddComment = async () => {
    if (!user) {
      Alert.alert('Atenção', 'Você precisa estar logado para comentar.');
      return;
    }
    
    if (!commentText.trim()) {
      Alert.alert('Atenção', 'O comentário não pode estar vazio.');
      return;
    }
    
    setCommentLoading(true);
    try {
      const success = await addComment(advertisement.id, commentText.trim());
      if (success) {
        setCommentText('');
        // Pequeno atraso para garantir que a atualização do Firestore seja concluída
        setTimeout(() => {
          refreshAdvertisement();
        }, 500);
      } else {
        Alert.alert('Erro', 'Não foi possível adicionar o comentário. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao adicionar o comentário.');
    } finally {
      setCommentLoading(false);
    }
  };
  
  // Função para iniciar uma resposta
  const handleStartReply = (commentId: string) => {
    setReplyingTo(commentId);
    setReplyText('');
  };
  
  // Função para cancelar uma resposta
  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };
  
  // Função para responder a um comentário
  const handleReplyToComment = async () => {
    if (!user) {
      Alert.alert('Atenção', 'Você precisa estar logado para responder.');
      return;
    }
    
    if (!replyText.trim()) {
      Alert.alert('Atenção', 'A resposta não pode estar vazia.');
      return;
    }
    
    if (!replyingTo) {
      Alert.alert('Erro', 'Não foi possível identificar o comentário para responder.');
      return;
    }
    
    // Verificar se o usuário é o dono do anúncio
    if (user.id !== advertisement.createdBy) {
      Alert.alert('Atenção', 'Apenas o dono do anúncio pode responder aos comentários.');
      return;
    }
    
    setCommentLoading(true);
    try {
      const success = await replyToComment(advertisement.id, replyingTo, replyText.trim());
      if (success) {
        setReplyText('');
        setReplyingTo(null);
        // Pequeno atraso para garantir que a atualização do Firestore seja concluída
        setTimeout(() => {
          refreshAdvertisement();
        }, 500);
      } else {
        Alert.alert('Erro', 'Não foi possível responder ao comentário. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao responder comentário:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao responder ao comentário.');
    } finally {
      setCommentLoading(false);
    }
  };
  
  // Renderizar um comentário
  const renderComment = (comment: Comment) => {
    const isReply = !!comment.replyTo;
    const isOwnerComment = comment.isOwnerResponse;
    
    // Encontrar o comentário original se for uma resposta
    let originalComment = null;
    if (isReply && advertisement.comments) {
      originalComment = advertisement.comments.find((c: Comment) => c.id === comment.replyTo);
    }
    
    return (
      <View style={[
        styles.commentContainer, 
        isReply && styles.replyContainer,
        isOwnerComment && styles.ownerCommentContainer
      ]} key={comment.id}>
        {isReply && (
          <View style={styles.replyIndicator}>
            <CornerDownRight size={16} color={Colors.gray[400]} />
          </View>
        )}
        
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>
            {comment.userName}
            {isOwnerComment && <Text style={styles.ownerBadge}> (Dono)</Text>}
          </Text>
          {comment.userUnit && (
            <Text style={styles.commentUserUnit}>{comment.userUnit}</Text>
          )}
          <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
        </View>
        
        {isReply && originalComment && (
          <Text style={styles.replyingToText}>
            Respondendo a {originalComment.userName}
          </Text>
        )}
        
        <Text style={styles.commentText}>{comment.text}</Text>
        
        {user && 
         user.id === advertisement.createdBy && 
         !isReply && 
         !isOwnerComment && 
         replyingTo !== comment.id && (
          <TouchableOpacity 
            style={styles.replyButton}
            onPress={() => handleStartReply(comment.id)}
          >
            <MessageCircle size={14} color={Colors.primary} />
            <Text style={styles.replyButtonText}>Responder</Text>
          </TouchableOpacity>
        )}
        
        {replyingTo === comment.id && (
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Escreva sua resposta..."
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />
            <View style={styles.replyActions}>
              <TouchableOpacity 
                style={styles.cancelReplyButton}
                onPress={handleCancelReply}
              >
                <Text style={styles.cancelReplyText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.sendReplyButton,
                  (!replyText.trim() || commentLoading) && styles.disabledButton
                ]}
                onPress={handleReplyToComment}
                disabled={!replyText.trim() || commentLoading}
              >
                <Text style={styles.sendReplyText}>Responder</Text>
                {commentLoading ? (
                  <ActivityIndicator size="small" color="white" style={{ marginLeft: 8 }} />
                ) : (
                  <Send size={16} color="white" style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };
  
  // Renderizar o item de lance na lista
  const renderBidItem = ({ item, index }: { item: any, index: number }) => {
    const isHighestBid = index === 0; // Primeiro item é o lance mais recente
    const isYourBid = user && item.userId === user.id;
    
    return (
      <View style={[
        styles.bidItem, 
        isHighestBid && styles.highestBidItem,
        isYourBid && styles.yourBidItem
      ]}>
        <View style={styles.bidHeader}>
          <Text style={styles.bidUser}>
            {isYourBid ? 'Seu lance' : item.userName}
            {isHighestBid && !isAuctionEnded && <Text style={styles.leadingText}> (Liderando)</Text>}
          </Text>
          <Text style={styles.bidAmount}>{formatCurrency(item.amount)}</Text>
        </View>
        <Text style={styles.bidTime}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
    );
  };
  
  if (isLoading && !advertisement) {
    return <LoadingIndicator fullScreen text="Carregando anúncio..." />;
  }
  
  if (!advertisement) {
    return (
      <View style={styles.notFoundContainer}>
        <ShoppingBag size={48} color={Colors.gray[400]} />
        <Text style={styles.notFoundTitle}>Anúncio não encontrado</Text>
        <Text style={styles.notFoundDescription}>
          O anúncio que você está procurando não existe ou foi removido.
        </Text>
        <TouchableOpacity 
          style={styles.backToListButton}
          onPress={() => router.push('/advertisements')}
        >
          <Text style={styles.backToListText}>Voltar para Anúncios</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const winnerName = getWinnerName();
  
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Detalhes do Anúncio',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={handleBackPress}
              style={{ marginRight: 16, marginLeft: 8 }}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          )
        }}
      />
      
      <ScrollView style={styles.container}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.title}>{advertisement.title}</Text>
          
          {advertisement.isAuction ? (
            <View style={styles.auctionPriceContainer}>
              <Gavel size={18} color={Colors.primary} style={styles.auctionIcon} />
              <Text style={styles.auctionLabel}>
                {isAuctionEnded ? 'Lance vencedor:' : 'Lance atual:'}
              </Text>
              <Text style={styles.price}>
                {formatCurrency(advertisement.currentBid || advertisement.price)}
              </Text>
            </View>
          ) : (
            <Text style={styles.price}>{formatCurrency(advertisement.price)}</Text>
          )}
          
          {advertisement.status === 'sold' && (
            <View style={styles.soldBadge}>
              <Text style={styles.soldText}>VENDIDO</Text>
            </View>
          )}
          
          {advertisement.isAuction && (
            <View style={[
              styles.auctionBadge,
              isAuctionEnded && styles.auctionEndedBadge
            ]}>
              <Text style={styles.auctionBadgeText}>
                {isAuctionEnded ? 'LEILÃO ENCERRADO' : 'LEILÃO'}
              </Text>
            </View>
          )}
        </View>
        
        {/* Contador de tempo para leilão */}
        {advertisement.isAuction && !isAuctionEnded && (
          <View style={styles.timerContainer}>
            <Timer size={18} color={Colors.warning} />
            <Text style={styles.timerText}>
              Termina em: <Text style={styles.timerValue}>{timeLeft}</Text>
            </Text>
          </View>
        )}
        
        {/* Imagem - Substituída pelo novo componente */}
        <AdvertisementImageGallery
          images={advertisement.photos || []}
          defaultImage={advertisement.photoURL}
        />
        
        {/* Ações */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, isLiked && styles.likedButton]}
            onPress={handleLikePress}
          >
            <Heart 
              size={20} 
              color={isLiked ? Colors.error : Colors.gray[600]} 
              fill={isLiked ? Colors.error : 'transparent'}
            />
            <Text style={[styles.actionText, isLiked && styles.likedText]}>
              {advertisement.likes.length} {advertisement.likes.length === 1 ? 'Curtida' : 'Curtidas'}
            </Text>
          </TouchableOpacity>
          
          {advertisement.status === 'available' && (
            <>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleContactPress}
              >
                <Phone size={20} color={Colors.primary} />
                <Text style={[styles.actionText, { color: Colors.primary }]}>
                  Contato
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.whatsappButton]}
                onPress={handleWhatsAppPress}
              >
                <WhatsAppIcon size={20} color="#25D366" />
                <Text style={[styles.actionText, { color: '#25D366' }]}>
                  WhatsApp
                </Text>
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleSharePress}
          >
            <Share2 size={20} color={Colors.gray[600]} />
            <Text style={styles.actionText}>Compartilhar</Text>
          </TouchableOpacity>
        </View>
        
        {/* Seção de Lances para Leilão */}
        {advertisement.isAuction && (
          <View style={styles.auctionContainer}>
            <View style={styles.auctionHeader}>
              <Gavel size={24} color={Colors.primary} />
              <Text style={styles.auctionTitle}>
                {isAuctionEnded ? 'Leilão Encerrado' : 'Leilão em Andamento'}
              </Text>
            </View>
            
            {/* Informações do leilão */}
            <View style={styles.auctionInfo}>
              <View style={styles.auctionInfoRow}>
                <Text style={styles.auctionInfoLabel}>Preço inicial:</Text>
                <Text style={styles.auctionInfoValue}>{formatCurrency(advertisement.price)}</Text>
              </View>
              
              <View style={styles.auctionInfoRow}>
                <Text style={styles.auctionInfoLabel}>Lance atual:</Text>
                <Text style={styles.auctionInfoValue}>
                  {formatCurrency(advertisement.currentBid || advertisement.price)}
                </Text>
              </View>
              
              <View style={styles.auctionInfoRow}>
                <Text style={styles.auctionInfoLabel}>
                  {isAuctionEnded ? 'Encerrado em:' : 'Encerra em:'}
                </Text>
                <Text style={styles.auctionInfoValue}>
                  {isAuctionEnded 
                    ? new Date(advertisement.auctionEndDate).toLocaleString('pt-BR')
                    : timeLeft
                  }
                </Text>
              </View>
              
              {isAuctionEnded && winnerName && (
                <View style={styles.winnerContainer}>
                  <Award size={24} color={Colors.success} />
                  <Text style={styles.winnerLabel}>Vencedor do leilão:</Text>
                  <Text style={styles.winnerName}>{winnerName}</Text>
                </View>
              )}
            </View>
            
            {/* Dar lance (apenas se não for o dono e o leilão não terminou) */}
            {!isOwner && advertisement.status === 'available' && !isAuctionEnded && (
              <View style={styles.placeBidContainer}>
                <Text style={styles.placeBidTitle}>Dar um lance</Text>
                <Text style={styles.placeBidDescription}>
                  Valor mínimo: {formatCurrency((advertisement.currentBid || advertisement.price) + 1)}
                </Text>
                
                <View style={styles.bidInputContainer}>
                  <Input
                    label="Seu lance (R$)"
                    placeholder={`Ex: ${Math.ceil((advertisement.currentBid || advertisement.price) * 1.1)}`}
                    value={bidAmount}
                    onChangeText={setBidAmount}
                    keyboardType="numeric"
                  />
                  
                  <Button
                    title="Dar Lance"
                    onPress={handlePlaceBid}
                    isLoading={bidLoading}
                    style={styles.bidButton}
                  />
                </View>
              </View>
            )}
            
            {/* Histórico de lances */}
            <View style={styles.bidsHistoryContainer}>
              <View style={styles.bidsHistoryHeader}>
                <TrendingUp size={18} color={Colors.text} />
                <Text style={styles.bidsHistoryTitle}>Histórico de Lances</Text>
              </View>
              
              {bids.length === 0 ? (
                <Text style={styles.noBidsText}>
                  Nenhum lance registrado ainda. Seja o primeiro a dar um lance!
                </Text>
              ) : (
                <FlatList
                  data={bids}
                  renderItem={renderBidItem}
                  keyExtractor={(item, index) => `bid-${index}-${item.createdAt}`}
                  style={styles.bidsList}
                  scrollEnabled={false}
                />
              )}
            </View>
          </View>
        )}
        
        {/* Informações */}
        <View style={styles.infoCard}>
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Detalhes</Text>
            
            <View style={styles.infoRow}>
              <Tag size={16} color={Colors.gray[500]} />
              <Text style={styles.infoLabel}>Categoria:</Text>
              <Text style={styles.infoValue}>{advertisement.category}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Clock size={16} color={Colors.gray[500]} />
              <Text style={styles.infoLabel}>Publicado:</Text>
              <Text style={styles.infoValue}>{formatRelativeTime(advertisement.createdAt)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Heart size={16} color={Colors.gray[500]} />
              <Text style={styles.infoLabel}>Curtidas:</Text>
              <Text style={styles.infoValue}>{advertisement.likes.length}</Text>
            </View>
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Descrição</Text>
            <Text style={styles.description}>{advertisement.description}</Text>
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Vendedor</Text>
            <Text style={styles.sellerName}>{advertisement.ownerName}</Text>
            {advertisement.house && (
              <Text style={styles.sellerInfo}>Casa: {advertisement.house}</Text>
            )}
            {advertisement.ownerContact && (
              <Text style={styles.sellerInfo}>Contato: {advertisement.ownerContact}</Text>
            )}
          </View>
        </View>

        {/* Seção de Comentários - Movida para cima */}
        <View style={styles.commentsSection}>
          <View style={styles.sectionHeader}>
            <MessageCircle size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Comentários</Text>
          </View>
          
          {/* Formulário para adicionar comentário */}
          {user && (
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Escreva um comentário..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  (!commentText.trim() || commentLoading) && styles.disabledButton
                ]}
                onPress={handleAddComment}
                disabled={!commentText.trim() || commentLoading}
              >
                {commentLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Send size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          )}
          
          {/* Lista de comentários */}
          {advertisement.comments && advertisement.comments.length > 0 ? (
            <View style={styles.commentsList}>
              {advertisement.comments
                .filter((comment: Comment) => !comment.replyTo) // Primeiro mostrar comentários que não são respostas
                .map((comment: Comment) => {
                  // Renderizar o comentário
                  const element = renderComment(comment);
                  
                  // Encontrar e renderizar as respostas a este comentário logo abaixo
                  const replies = advertisement.comments
                    .filter((reply: Comment) => reply.replyTo === comment.id)
                    .map(renderComment);
                  
                  return (
                    <React.Fragment key={comment.id}>
                      {element}
                      {replies}
                    </React.Fragment>
                  );
                })}
            </View>
          ) : (
            <View style={styles.noCommentsContainer}>
              <Text style={styles.noCommentsText}>
                Nenhum comentário ainda. Seja o primeiro a comentar!
              </Text>
            </View>
          )}
        </View>
        
        {/* Ações do dono - Movida para baixo */}
        {isOwner && (
          <View style={styles.ownerActionsContainer}>
            {advertisement.status === 'available' && !advertisement.isAuction && (
              <TouchableOpacity 
                style={[styles.ownerActionButton, styles.soldButton]}
                onPress={handleMarkAsSold}
                disabled={isUpdating}
              >
                <Check size={20} color="white" />
                <Text style={styles.ownerActionText}>Marcar como Vendido</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.ownerActionButton, styles.editButton]}
              onPress={handleEditPress}
            >
              <Edit size={20} color="white" />
              <Text style={styles.ownerActionText}>Editar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.ownerActionButton, styles.deleteButton]}
              onPress={handleDeletePress}
              disabled={isDeleting}
            >
              <Trash2 size={20} color="white" />
              <Text style={styles.ownerActionText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Botão voltar */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/advertisements')}
        >
          <Text style={styles.backButtonText}>Voltar para Anúncios</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    position: 'relative',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    paddingRight: 72,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  soldBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: Colors.error,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  soldText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  likedButton: {
    backgroundColor: Colors.error + '10',
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    color: Colors.gray[600],
    marginLeft: 8,
  },
  likedText: {
    color: Colors.error,
  },
  whatsappButton: {
    marginHorizontal: 10,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: Colors.gray[600],
    marginLeft: 8,
    marginRight: 4,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  sellerInfo: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 4,
  },
  ownerActionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  soldButton: {
    backgroundColor: Colors.success,
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  ownerActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: 'white',
    padding: 16,
    alignItems: 'center',
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 32,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  notFoundDescription: {
    fontSize: 16,
    color: Colors.gray[600],
    textAlign: 'center',
    marginBottom: 24,
  },
  backToListButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backToListText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  auctionPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  auctionIcon: {
    marginRight: 4,
  },
  auctionLabel: {
    fontSize: 16,
    color: Colors.primary,
    marginRight: 4,
  },
  auctionBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  auctionEndedBadge: {
    backgroundColor: Colors.gray[500],
  },
  auctionBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  timerText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text,
  },
  timerValue: {
    fontWeight: 'bold',
    color: Colors.warning,
  },
  auctionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  auctionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    paddingBottom: 8,
  },
  auctionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: 8,
  },
  auctionInfo: {
    marginBottom: 16,
    backgroundColor: Colors.gray[100],
    padding: 12,
    borderRadius: 8,
  },
  auctionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  auctionInfoLabel: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  auctionInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  winnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  winnerLabel: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500',
    marginLeft: 8,
  },
  winnerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.success,
    marginLeft: 4,
  },
  placeBidContainer: {
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  placeBidTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  placeBidDescription: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  bidInputContainer: {
    marginTop: 8,
  },
  bidButton: {
    marginTop: 8,
  },
  bidsHistoryContainer: {
    marginTop: 8,
  },
  bidsHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bidsHistoryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 8,
  },
  noBidsText: {
    fontSize: 14,
    color: Colors.gray[500],
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  bidsList: {
    maxHeight: 300,
  },
  bidItem: {
    backgroundColor: Colors.gray[100],
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gray[300],
  },
  highestBidItem: {
    borderLeftColor: Colors.success,
    backgroundColor: Colors.success + '10',
  },
  yourBidItem: {
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bidUser: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  leadingText: {
    color: Colors.success,
    fontWeight: 'bold',
  },
  bidAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  bidTime: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  // Estilos para a seção de comentários
  commentsSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    overflow: 'hidden',
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    padding: 8,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.gray[400],
  },
  commentsList: {
    marginTop: 8,
  },
  commentContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
  },
  replyContainer: {
    marginLeft: 24,
    marginTop: -8,
    marginBottom: 16,
    backgroundColor: Colors.gray[100],
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
  },
  ownerCommentContainer: {
    backgroundColor: Colors.primary + '15', // Cor primária com 15% de opacidade
  },
  replyIndicator: {
    position: 'absolute',
    left: -18,
    top: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
  ownerBadge: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  commentUserUnit: {
    fontSize: 12,
    color: Colors.gray[600],
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  replyingToText: {
    fontSize: 12,
    color: Colors.gray[600],
    fontStyle: 'italic',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  replyButtonText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
  },
  replyInputContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  replyInput: {
    minHeight: 40,
    maxHeight: 80,
    padding: 8,
    fontSize: 14,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  cancelReplyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  cancelReplyText: {
    color: Colors.gray[600],
    fontSize: 12,
  },
  sendReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  sendReplyText: {
    color: 'white',
    fontSize: 12,
  },
  noCommentsContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCommentsText: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
  },
}); 