import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Animated, ViewToken } from 'react-native';
import { News } from '@/types';
import NewsBanner from './NewsBanner';

interface NewsCarouselProps {
  news: News[];
  onPress: (newsId: string) => void;
  onClose: (newsId: string) => void;
}

interface ViewableItemsChangedInfo {
  viewableItems: ViewToken[];
  changed: ViewToken[];
}

const { width: screenWidth } = Dimensions.get('window');

export default function NewsCarousel({ news, onPress, onClose }: NewsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<News>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // Auto-scroll timer
  useEffect(() => {
    if (news.length <= 1) return;
    
    const timer = setInterval(() => {
      if (activeIndex === news.length - 1) {
        flatListRef.current?.scrollToIndex({
          index: 0,
          animated: true
        });
      } else {
        flatListRef.current?.scrollToIndex({
          index: activeIndex + 1,
          animated: true
        });
      }
    }, 5000); // Change slide every 5 seconds
    
    return () => clearInterval(timer);
  }, [activeIndex, news.length]);
  
  // Handle viewable items change
  const onViewableItemsChanged = useRef((info: ViewableItemsChangedInfo) => {
    if (info.viewableItems.length > 0) {
      setActiveIndex(info.viewableItems[0].index || 0);
    }
  }).current;
  
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;
  
  // Render dots indicator
  const renderDots = () => {
    if (news.length <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        {news.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activeIndex ? styles.activeDot : {}
            ]}
          />
        ))}
      </View>
    );
  };
  
  const renderItem = ({ item }: { item: News }) => {
    return (
      <View style={styles.slideCenter}>
        <View style={styles.slideContent}>
          <NewsBanner
            news={item}
            onPress={() => onPress(item.id)}
            onClose={() => onClose(item.id)}
          />
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={news}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={screenWidth}
        snapToAlignment="center"
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
      {renderDots()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  slideCenter: {
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    width: '85%',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#000',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
}); 