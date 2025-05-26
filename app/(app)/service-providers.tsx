import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView, Image, Linking } from 'react-native';
import { router } from 'expo-router';
import { useServiceProvidersStore } from '@/store/service-providers-store';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { ArrowLeft, Plus, Search, Hammer, Phone, Users, Filter, Star, Edit, Trash, X } from 'lucide-react-native';
import EmptyState from '@/components/EmptyState';
import LoadingIndicator from '@/components/LoadingIndicator';
import { ServiceProvider } from '@/types';

const ServiceProviderCard = ({
  provider,
  onPress,
  onEdit,
  onDelete
}: {
  provider: ServiceProvider;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) => {
  const renderRatingStars = () => {
    const stars = [];
    // Use provider.avgRating or default to 0 if undefined
    const rating = provider.avgRating || 0;
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={16}
          color={i <= rating ? Colors.warning : Colors.gray[300]}
          fill={i <= rating ? Colors.warning : 'transparent'}
          style={{ marginRight: 2 }}
        />
      );
    }
    return stars;
  };

  const handlePhonePress = (e: any) => {
    e.stopPropagation(); // Prevent card tap from triggering
    Linking.openURL(`tel:${provider.phone}`).catch(err => {
      Alert.alert('Erro', 'Não foi possível fazer a chamada telefônica.');
    });
  };
  
  const handleEditPress = (e: any) => {
    e.stopPropagation(); // Prevent card tap from triggering
    if (onEdit) onEdit();
  };
  
  const handleDeletePress = (e: any) => {
    e.stopPropagation(); // Prevent card tap from triggering
    if (onDelete) onDelete();
  };

  return (
  <TouchableOpacity
    style={styles.card}
    onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Card Header with photo and name */}
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatarContainer}>
        {provider.photo ? (
          <Image source={{ uri: provider.photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
              <Hammer size={28} color={Colors.gray[400]} />
          </View>
        )}
      </View>
      
        <View style={styles.nameContainer}>
          <Text style={styles.cardTitle} numberOfLines={1}>{provider.name}</Text>
          <View style={styles.typeWrapper}>
            <Text style={styles.cardType}>{provider.serviceType}</Text>
          </View>
        </View>
      </View>
      
      {/* Service info */}
        <Text style={styles.cardDescription} numberOfLines={2}>
          {provider.description}
        </Text>
      
      {/* Rating section */}
      {provider.avgRating !== undefined && provider.avgRating > 0 && (
        <View style={styles.ratingSection}>
          <View style={styles.starsContainer}>
            {renderRatingStars()}
            <Text style={styles.ratingValue}>
              {provider.avgRating.toFixed(1)}
            </Text>
          </View>
          {provider.reviewCount !== undefined && provider.reviewCount > 0 && (
            <Text style={styles.reviewsCount}>
              {provider.reviewCount} {provider.reviewCount === 1 ? 'avaliação' : 'avaliações'}
            </Text>
          )}
        </View>
      )}
      
      {/* Card footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.phoneButton}
          onPress={handlePhonePress}
          >
          <Phone size={16} color="#FFFFFF" />
            <Text style={styles.phoneText}>Ligar</Text>
          </TouchableOpacity>
          
        {(onEdit || onDelete) && (
          <View style={styles.adminButtons}>
            {onEdit && (
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={handleEditPress}
              >
                <Edit size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
            
            {onDelete && (
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={handleDeletePress}
              >
                <Trash size={16} color={Colors.error} />
              </TouchableOpacity>
            )}
            </View>
          )}
    </View>
  </TouchableOpacity>
);
};

export default function ServiceProvidersScreen() {
  const { 
    serviceProviders, 
    fetchServiceProviders, 
    deleteServiceProvider, 
    isLoading, 
    error 
  } = useServiceProvidersStore();
  const { user } = useAuthStore();
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilter, setCurrentFilter] = useState<string | null>(null);
  
  useEffect(() => {
    fetchServiceProviders();
  }, []);
  
  // Obter tipos de serviço únicos para o filtro
  const serviceTypes = Array.from(
    new Set(serviceProviders.map(provider => provider.serviceType))
  ).sort();
  
  // Filtrar prestadores com base na pesquisa e filtro de tipo
  const filteredProviders = serviceProviders.filter(provider => {
    const matchesSearch = 
      searchQuery === '' || 
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      currentFilter === null || 
      provider.serviceType === currentFilter;
    
    return matchesSearch && matchesFilter;
  });
  
  const handleAddProvider = () => {
    router.push('/service-provider/create');
  };
  
  const handleEditProvider = (providerId: string) => {
    router.push({
      pathname: `/service-provider/edit/[id]`,
      params: { id: providerId }
    });
  };
  
  const handleViewProvider = (providerId: string) => {
    router.push({
      pathname: `/service-provider/[id]`,
      params: { id: providerId }
    });
  };
  
  const handleDeleteProvider = (providerId: string, name: string) => {
    Alert.alert(
      "Remover Prestador",
      `Tem certeza que deseja remover ${name} da lista de prestadores?`,
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const success = await deleteServiceProvider(providerId);
            if (success) {
              Alert.alert("Sucesso", "Prestador removido com sucesso.");
            }
          }
        }
      ]
    );
  };
  
  if (isLoading && serviceProviders.length === 0) {
    return <LoadingIndicator fullScreen text="Carregando prestadores de serviços..." />;
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prestadores de Serviços</Text>
        {isManager && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddProvider}
          >
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar prestador de serviço..."
            placeholderTextColor={Colors.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={Colors.gray[400]} />
            </TouchableOpacity>
          )}
        </View>
        
        {serviceTypes.length > 0 && (
          <View style={styles.filtersContainer}>
            <View style={styles.filterHeader}>
              <Filter size={16} color={Colors.primary} />
              <Text style={styles.filterHeaderText}>Filtrar por tipo:</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScrollContent}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  currentFilter === null && styles.activeFilterChip
                ]}
                onPress={() => setCurrentFilter(null)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    currentFilter === null && styles.activeFilterChipText
                  ]}
                >
                  Todos
                </Text>
              </TouchableOpacity>
              {serviceTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    currentFilter === type && styles.activeFilterChip
                  ]}
                  onPress={() => setCurrentFilter(type)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      currentFilter === type && styles.activeFilterChipText
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      
      {/* Main Content - Error, Empty or List */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Ocorreu um erro ao carregar os prestadores de serviços. Tente novamente.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchServiceProviders}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProviders.length === 0 ? (
        <EmptyState
          title={searchQuery || currentFilter 
            ? "Nenhum prestador encontrado" 
            : "Nenhum prestador cadastrado"
          }
          description={searchQuery || currentFilter
            ? "Tente alterar os filtros de busca"
            : "Cadastre prestadores de serviço para o condomínio"
          }
          icon={<Hammer size={48} color={Colors.gray[400]} />}
          actionLabel={isManager ? "Adicionar Prestador" : undefined}
          onAction={isManager ? handleAddProvider : undefined}
        />
      ) : (
        <FlatList
          data={filteredProviders}
          renderItem={({ item }) => (
            <ServiceProviderCard
              provider={item}
              onPress={() => handleViewProvider(item.id)}
              onEdit={isManager ? () => handleEditProvider(item.id) : undefined}
              onDelete={isManager ? () => handleDeleteProvider(item.id, item.name) : undefined}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text,
  },
  filtersContainer: {
    marginTop: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  filtersScrollContent: {
    paddingBottom: 4,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.gray[100],
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  activeFilterChip: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.gray[700],
  },
  activeFilterChipText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  cardAvatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.gray[200],
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.gray[300],
  },
  nameContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  typeWrapper: {
    alignSelf: 'flex-start',
  },
  cardType: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.gray[700],
    marginBottom: 12,
    lineHeight: 20,
  },
  ratingSection: {
    marginBottom: 16,
    backgroundColor: Colors.gray[100],
    padding: 10,
    borderRadius: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.warning,
    marginLeft: 6,
  },
  reviewsCount: {
    fontSize: 12,
    color: Colors.gray[600],
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  adminButtons: {
    flexDirection: 'row',
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: Colors.error + '15',
    borderRadius: 8,
  },
  listContent: {
    padding: 16,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
}); 