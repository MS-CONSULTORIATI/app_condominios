import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { News } from '@/types';
import { formatDate } from '@/utils/format';
import Colors from '@/constants/colors';
import { Calendar, Newspaper, X } from 'lucide-react-native';

interface NewsBannerProps {
  news: News;
  onPress: () => void;
  onClose: () => void;
}

export default function NewsBanner({ news, onPress, onClose }: NewsBannerProps) {
  const formattedDate = formatDate(news.publishDate);
  
  const handleClosePress = (e: any) => {
    e.stopPropagation();
    onClose();
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.bannerContent}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {news.coverImage ? (
          <Image source={{ uri: news.coverImage }} style={styles.image} />
        ) : (
          <View style={styles.noImageContainer}>
            <Newspaper size={24} color={Colors.gray[400]} />
          </View>
        )}
        
        <View style={styles.overlay}>
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>
              {news.title}
            </Text>
            
            <View style={styles.dateContainer}>
              <Calendar size={12} color={Colors.gray[200]} />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          </View>
        </View>
        
        {news.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>DESTAQUE</Text>
          </View>
        )}
      </TouchableOpacity>
      
      {/* Botão de fechar separado do conteúdo do banner */}
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={handleClosePress}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <X size={16} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'visible', // Mantemos 'visible' para evitar corte do botão
    width: '100%',
  },
  bannerContent: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: Colors.gray[200],
    marginLeft: 4,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 5,
  },
}); 