import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { User, Star, Calendar } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { ServiceProviderRating } from '@/types';
import { formatDate } from '@/utils/date';

interface ServiceProviderRatingItemProps {
  rating: ServiceProviderRating;
  onPhotoPress?: (photoUrl: string) => void;
}

const ServiceProviderRatingItem = ({ rating, onPhotoPress }: ServiceProviderRatingItemProps) => {
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={16}
          color={i <= rating.rating ? Colors.warning : Colors.gray[300]}
          fill={i <= rating.rating ? Colors.warning : 'transparent'}
        />
      );
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <User size={20} color={Colors.gray[400]} />
          <Text style={styles.userName}>{rating.userName}</Text>
        </View>
        <View style={styles.dateContainer}>
          <Calendar size={14} color={Colors.gray[500]} />
          <Text style={styles.dateText}>{formatDate(rating.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.ratingContainer}>
        <View style={styles.starsContainer}>{renderStars()}</View>
      </View>

      {rating.comment && (
        <Text style={styles.comment}>{rating.comment}</Text>
      )}

      {rating.photos && rating.photos.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.photosContainer}
          contentContainerStyle={styles.photosContent}
        >
          {rating.photos.map((photo, index) => (
            <TouchableOpacity
              key={index}
              style={styles.photoContainer}
              onPress={() => onPhotoPress && onPhotoPress(photo)}
            >
              <Image source={{ uri: photo }} style={styles.photo} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: Colors.gray[500],
    marginLeft: 4,
  },
  ratingContainer: {
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  comment: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  photosContainer: {
    marginTop: 8,
  },
  photosContent: {
    gap: 8,
  },
  photoContainer: {
    marginRight: 8,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
});

export default ServiceProviderRatingItem; 