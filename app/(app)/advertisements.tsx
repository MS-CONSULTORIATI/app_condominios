import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ScrollView, TextInput } from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useAdvertisementsStore } from '@/store/advertisements-store';
import Colors from '@/constants/colors';
import { Plus, ShoppingBag, ArrowLeft, Heart, Home, Tag, ExternalLink, ThumbsUp, Gavel, Timer, Eye, MessageCircle, Filter } from 'lucide-react-native';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import { formatCurrency } from '@/utils/format';
import { Advertisement } from '@/types';

const AdvertisementCard = ({ 
  advertisement, 
  onPress, 
  onLike,
  isLiked
}: { 
  advertisement: Advertisement; 
  onPress: () => void;
  onLike: () => void;
  isLiked: boolean;
}) => {
  const { user } = useAuthStore();
  const isOwner = user?.id === advertisement.createdBy;
  
  // Verificar se o leilão expirou
  const isAuctionEnded = advertisement.isAuction && 
    advertisement.auctionEndDate && 
    advertisement.auctionEndDate < Date.now();
    
  // Verificar se tem comentários
  const hasComments = advertisement.comments && advertisement.comments.length > 0;
  
  // Calcular tempo restante para o leilão
  const getTimeLeft = () => {
    if (!advertisement.isAuction || !advertisement.auctionEndDate || isAuctionEnded) {
      return null;
    }
    
    const now = Date.now();
    const endTime = advertisement.auctionEndDate;
    const diff = endTime - now;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes}m`;
    }
  };
  
  const timeLeft = getTimeLeft();
  
  // Verificar se tem comentários
  return (
    <TouchableOpacity
      style={[
        styles.adCard,
        advertisement.status === 'sold' && styles.soldCard
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {advertisement.status === 'sold' && (
        <View style={styles.soldBadge}>
          <Text style={styles.soldBadgeText}>VENDIDO</Text>
        </View>
      )}
      
      {advertisement.isAuction && (
        <View style={[
          styles.auctionBadge,
          isAuctionEnded ? styles.auctionEndedBadge : null
        ]}>
          <Gavel size={12} color="white" style={{ marginRight: 4 }} />
          <Text style={styles.auctionBadgeText}>
            {isAuctionEnded ? 'LEILÃO ENCERRADO' : 'LEILÃO'}
          </Text>
        </View>
      )}
      
      <View style={styles.adHeader}>
        <View style={styles.adInfo}>
          <Text style={styles.adTitle} numberOfLines={1}>{advertisement.title}</Text>
          <View style={styles.priceContainer}>
            {advertisement.isAuction && (
              <Gavel size={14} color={Colors.primary} style={{ marginRight: 4 }} />
            )}
            <Text style={styles.adPrice}>
              {formatCurrency(advertisement.isAuction ? (advertisement.currentBid || advertisement.price) : advertisement.price)}
            </Text>
            {advertisement.isAuction && (
              <Text style={styles.bidLabel}>
                {isAuctionEnded ? ' (Lance final)' : ' (Lance atual)'}
              </Text>
            )}
          </View>
          
          {advertisement.isAuction && !isAuctionEnded && timeLeft && (
            <View style={styles.timeLeftContainer}>
              <Timer size={12} color={Colors.warning} />
              <Text style={styles.timeLeftText}>
                Termina em: {timeLeft}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.metricsContainer}>
          <View style={styles.viewsContainer}>
            <Eye size={16} color={Colors.gray[500]} />
            <Text style={styles.viewsCount}>
              {advertisement.viewCount || 0}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.likeButton, isLiked && styles.likedButton]}
            onPress={onLike}
          >
            <Heart size={18} color={isLiked ? Colors.error : Colors.gray[400]} fill={isLiked ? Colors.error : 'transparent'} />
            <Text style={[styles.likeCount, isLiked && styles.likedCount]}>
              {advertisement.likes.length}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Imagem */}
      {advertisement.photoURL || (advertisement.photos && advertisement.photos.length > 0) ? (
        <Image 
          source={{ uri: advertisement.photos && advertisement.photos.length > 0 
            ? advertisement.photos[0] 
            : advertisement.photoURL 
          }} 
          style={styles.adImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.adImagePlaceholder}>
          <ShoppingBag size={48} color={Colors.gray[300]} />
          <Text style={{ color: Colors.gray[400], marginTop: 8 }}>Sem imagem</Text>
        </View>
      )}
      
      <View style={styles.adDetails}>
        <View style={styles.categoryTag}>
          <Tag size={14} color={Colors.primary} />
          <Text style={styles.categoryText}>{advertisement.category}</Text>
        </View>
        
        <Text style={styles.adDescription} numberOfLines={2}>
          {advertisement.description}
        </Text>
      </View>
      
      <View style={styles.adFooter}>
        <View style={styles.ownerInfo}>
          <Text style={styles.ownerName}>{advertisement.ownerName}</Text>
          {advertisement.house && (
            <View style={styles.unitContainer}>
              <Home size={12} color={Colors.gray[500]} />
              <Text style={styles.unitText}>
                Casa {advertisement.house}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.actionsContainer}>
          {hasComments ? (
            <View style={styles.commentsIndicator}>
              <MessageCircle size={14} color={Colors.primary} />
              <Text style={styles.commentsCount}>
                {advertisement.comments?.length}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.viewButton} onPress={onPress}>
            <Text style={styles.viewButtonText}>
              {advertisement.isAuction && !isAuctionEnded ? 'Dar lance' : 'Ver mais'}
            </Text>
            <ExternalLink size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function AdvertisementsScreen() {
  const { user } = useAuthStore();
  const { advertisements, fetchAdvertisements, toggleLike, isLoading } = useAdvertisementsStore();
  const [filter, setFilter] = useState<'all' | 'available' | 'mine' | 'auctions'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<{min: number | null, max: number | null}>({min: null, max: null});
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'price-asc' | 'price-desc'>('newest');
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  
  // Extract unique categories from advertisements
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set<string>();
    advertisements.forEach(ad => {
      if (ad.category) uniqueCategories.add(ad.category);
    });
    return ['all', ...Array.from(uniqueCategories)];
  }, [advertisements]);
  
  useEffect(() => {
    fetchAdvertisements();
  }, []);
  
  const handleBackPress = () => {
    router.push('/');
  };
  
  const handleAddAdvertisement = () => {
    router.push('/advertisement/create');
  };
  
  const handleAdvertisementPress = (adId: string) => {
    router.push({
      pathname: `/advertisement/[id]` as any,
      params: { id: adId }
    });
  };
  
  const handleLikePress = async (adId: string) => {
    if (!user) {
      Alert.alert('Atenção', 'Você precisa estar logado para curtir um anúncio.');
      return;
    }
    
    await toggleLike(adId);
  };
  
  // Filtrar anúncios com base no filtro selecionado
  const filteredAds = advertisements.filter(ad => {
    // Filter by status/type
    if (filter === 'available') {
      if (ad.status !== 'available') return false;
    } else if (filter === 'mine') {
      if (ad.createdBy !== user?.id) return false;
    } else if (filter === 'auctions') {
      if (!ad.isAuction) return false;
    }
    
    // Filter by category
    if (categoryFilter !== 'all' && ad.category !== categoryFilter) {
      return false;
    }
    
    // Filter by price range
    if (priceRange.min !== null && ad.price < priceRange.min) {
      return false;
    }
    if (priceRange.max !== null && ad.price > priceRange.max) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Apply sorting
    switch (sortOption) {
      case 'newest':
        return b.createdAt - a.createdAt;
      case 'oldest':
        return a.createdAt - b.createdAt;
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      default:
        return 0;
    }
  });
  
  // Function to apply price range filter
  const applyPriceFilter = () => {
    const min = minPriceInput ? Number(minPriceInput.replace(/[^0-9]/g, '')) : null;
    const max = maxPriceInput ? Number(maxPriceInput.replace(/[^0-9]/g, '')) : null;
    setPriceRange({min, max});
  };
  
  // Function to clear all filters
  const clearFilters = () => {
    setCategoryFilter('all');
    setPriceRange({min: null, max: null});
    setMinPriceInput('');
    setMaxPriceInput('');
    setSortOption('newest');
    setFilter('all');
  };
  
  // Verificar se o usuário curtiu o anúncio
  const isLiked = (adId: string) => {
    const ad = advertisements.find(a => a.id === adId);
    return ad ? ad.likes.includes(user?.id || '') : false;
  };
  
  if (isLoading && advertisements.length === 0) {
    return <LoadingIndicator fullScreen text="Carregando anúncios..." />;
  }
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerTitle: 'Classificados',
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Classificados</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddAdvertisement}
          >
            <Plus size={20} color="white" />
            <Text style={styles.addButtonText}>Novo Anúncio</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setFilter('all')}
          >
            <Text style={[
              styles.filterText,
              filter === 'all' && styles.filterTextActive
            ]}>
              Todos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'available' && styles.filterButtonActive
            ]}
            onPress={() => setFilter('available')}
          >
            <Text style={[
              styles.filterText,
              filter === 'available' && styles.filterTextActive
            ]}>
              Disponíveis
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'auctions' && styles.filterButtonActive
            ]}
            onPress={() => setFilter('auctions')}
          >
            <Text style={[
              styles.filterText,
              filter === 'auctions' && styles.filterTextActive
            ]}>
              Leilões
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'mine' && styles.filterButtonActive
            ]}
            onPress={() => setFilter('mine')}
          >
            <Text style={[
              styles.filterText,
              filter === 'mine' && styles.filterTextActive
            ]}>
              Meus
            </Text>
          </TouchableOpacity>
          
          {/* Advanced filters toggle button */}
          <TouchableOpacity
            style={styles.moreFiltersButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Advanced filters section */}
        {showFilters && (
          <View style={styles.advancedFiltersContainer}>
            {/* Category filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories.map(category => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      categoryFilter === category && styles.categoryButtonActive
                    ]}
                    onPress={() => setCategoryFilter(category)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      categoryFilter === category && styles.categoryButtonTextActive
                    ]}>
                      {category === 'all' ? 'Todas' : category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            {/* Price range filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Faixa de preço</Text>
              <View style={styles.priceInputsContainer}>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.priceInputLabel}>Min:</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={minPriceInput}
                    onChangeText={setMinPriceInput}
                    placeholder="R$ 0"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.gray[400]}
                  />
                </View>
                
                <View style={styles.priceInputDivider} />
                
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.priceInputLabel}>Max:</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={maxPriceInput}
                    onChangeText={setMaxPriceInput}
                    placeholder="R$ 9999"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.gray[400]}
                  />
                </View>
                
                <TouchableOpacity 
                  style={styles.applyPriceButton}
                  onPress={applyPriceFilter}
                >
                  <Text style={styles.applyPriceButtonText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Sort options */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Ordenar por</Text>
              <View style={styles.sortOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortOption === 'newest' && styles.sortButtonActive
                  ]}
                  onPress={() => setSortOption('newest')}
                >
                  <Text style={[
                    styles.sortButtonText,
                    sortOption === 'newest' && styles.sortButtonTextActive
                  ]}>
                    Mais recentes
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortOption === 'oldest' && styles.sortButtonActive
                  ]}
                  onPress={() => setSortOption('oldest')}
                >
                  <Text style={[
                    styles.sortButtonText,
                    sortOption === 'oldest' && styles.sortButtonTextActive
                  ]}>
                    Mais antigos
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortOption === 'price-asc' && styles.sortButtonActive
                  ]}
                  onPress={() => setSortOption('price-asc')}
                >
                  <Text style={[
                    styles.sortButtonText,
                    sortOption === 'price-asc' && styles.sortButtonTextActive
                  ]}>
                    Menor preço
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortOption === 'price-desc' && styles.sortButtonActive
                  ]}
                  onPress={() => setSortOption('price-desc')}
                >
                  <Text style={[
                    styles.sortButtonText,
                    sortOption === 'price-desc' && styles.sortButtonTextActive
                  ]}>
                    Maior preço
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Clear filters button */}
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearFiltersButtonText}>Limpar filtros</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {filteredAds.length === 0 ? (
          <EmptyState
            title={
              filter === 'all' 
                ? "Nenhum anúncio cadastrado" 
                : filter === 'available'
                  ? "Nenhum anúncio disponível"
                  : filter === 'auctions'
                    ? "Nenhum leilão disponível"
                    : "Você não possui anúncios"
            }
            description="Que tal criar seu primeiro anúncio? É rápido e fácil!"
            icon={<ShoppingBag size={48} color={Colors.gray[400]} />}
            actionLabel="Criar Anúncio"
            onAction={handleAddAdvertisement}
            style={styles.emptyState}
          />
        ) : (
          <FlatList
            data={filteredAds}
            renderItem={({ item }) => (
              <AdvertisementCard 
                advertisement={item}
                onPress={() => handleAdvertisementPress(item.id)}
                onLike={() => handleLikePress(item.id)}
                isLiked={isLiked(item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  backButton: {
    marginRight: 16,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: Colors.gray[100],
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  adCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  soldCard: {
    opacity: 0.8,
  },
  soldBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Colors.error,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    zIndex: 10,
  },
  soldBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  adInfo: {
    flex: 1,
    marginRight: 8,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  adPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  likedButton: {
    backgroundColor: Colors.error + '15',
  },
  likeCount: {
    fontSize: 12,
    color: Colors.gray[600],
    marginLeft: 4,
  },
  likedCount: {
    color: Colors.error,
  },
  adImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.gray[200],
  },
  adImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  adDetails: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
  },
  adDescription: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
  },
  adFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  unitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitText: {
    fontSize: 12,
    color: Colors.gray[600],
    marginLeft: 4,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  emptyState: {
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontStyle: 'italic',
  },
  timeLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeLeftText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500',
    marginLeft: 4,
  },
  auctionBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  auctionEndedBadge: {
    backgroundColor: Colors.gray[500],
  },
  auctionBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  viewsCount: {
    fontSize: 12,
    color: Colors.gray[600],
    marginLeft: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  commentsCount: {
    fontSize: 12,
    color: Colors.gray[600],
    marginLeft: 4,
  },
  moreFiltersButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  advancedFiltersContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  priceInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceInputLabel: {
    fontSize: 14,
    color: Colors.gray[500],
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 4,
  },
  priceInputDivider: {
    width: 16,
    height: 1,
    backgroundColor: Colors.gray[300],
    marginHorizontal: 8,
  },
  applyPriceButton: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  applyPriceButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  sortOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
    marginRight: 8,
    marginBottom: 8,
  },
  sortButtonActive: {
    backgroundColor: Colors.primary,
  },
  sortButtonText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  sortButtonTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  clearFiltersButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  clearFiltersButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
}); 