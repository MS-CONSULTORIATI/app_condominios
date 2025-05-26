import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Dimensions,
  Text
} from 'react-native';
import { X, Plus, Minus, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { PinchGestureHandler, State, PinchGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

interface Props {
  images: string[];
  defaultImage?: string;
}

type PinchContext = {
  startScale: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_SIZE = 70;

export default function AdvertisementImageGallery({ images, defaultImage }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const allImages = images?.length > 0 ? images : defaultImage ? [defaultImage] : [];

  const onPinchGestureEvent = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent, PinchContext>({
    onStart: (_, ctx) => {
      ctx.startScale = scale.value;
    },
    onActive: (event, ctx) => {
      scale.value = Math.max(1, Math.min(4, ctx.startScale * event.scale));
    },
    onEnd: () => {
      savedScale.value = scale.value;
    },
  });

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePrevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      scale.value = withSpring(1);
    }
  };

  const handleNextImage = () => {
    if (currentIndex < allImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
      scale.value = withSpring(1);
    }
  };

  if (allImages.length === 0) {
    return (
      <View style={styles.noImageContainer}>
        <ImageIcon size={64} color={Colors.gray[300]} />
        <Text style={styles.noImageText}>Sem imagens disponíveis</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.mainImageContainer}
        onPress={() => setShowFullScreen(true)}
      >
        <Image
          source={{ uri: allImages[currentIndex] }}
          style={styles.mainImage}
          resizeMode="cover"
        />
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>
            {currentIndex + 1} / {allImages.length}
          </Text>
        </View>
      </TouchableOpacity>

      {allImages.length > 1 && (
        <View style={styles.thumbnailsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailsScroll}
          >
            {allImages.map((image, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentIndex(index)}
                style={[
                  styles.thumbnailButton,
                  currentIndex === index && styles.activeThumbnail
                ]}
              >
                <Image
                  source={{ uri: image }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Modal
        visible={showFullScreen}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullScreen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowFullScreen(false)}
            >
              <X size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.zoomControls}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  scale.value = withSpring(Math.max(1, scale.value - 0.5));
                }}
              >
                <Minus size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  scale.value = withSpring(Math.min(4, scale.value + 0.5));
                }}
              >
                <Plus size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {allImages.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.navButton, styles.prevButton]}
                onPress={handlePrevImage}
                disabled={currentIndex === 0}
              >
                <ChevronLeft
                  size={40}
                  color={currentIndex === 0 ? Colors.gray[400] : 'white'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, styles.nextButton]}
                onPress={handleNextImage}
                disabled={currentIndex === allImages.length - 1}
              >
                <ChevronRight
                  size={40}
                  color={currentIndex === allImages.length - 1 ? Colors.gray[400] : 'white'}
                />
              </TouchableOpacity>
            </>
          )}

          <PinchGestureHandler
            onGestureEvent={onPinchGestureEvent}
            onHandlerStateChange={({ nativeEvent }) => {
              if (nativeEvent.state === State.END) {
                savedScale.value = scale.value;
              }
            }}
          >
            <Animated.Image
              source={{ uri: allImages[currentIndex] }}
              style={[styles.fullScreenImage, imageAnimatedStyle]}
              resizeMode="contain"
            />
          </PinchGestureHandler>

          <View style={styles.modalCounter}>
            <Text style={styles.modalCounterText}>
              {currentIndex + 1} / {allImages.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mainImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.gray[100],
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  imageCounterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  thumbnailsContainer: {
    height: THUMBNAIL_SIZE + 20,
    backgroundColor: Colors.gray[100],
  },
  thumbnailsScroll: {
    padding: 10,
  },
  thumbnailButton: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnail: {
    borderColor: Colors.primary,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 10,
  },
  modalButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  zoomControls: {
    flexDirection: 'row',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    zIndex: 10,
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },
  modalCounter: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  modalCounterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  noImageContainer: {
    height: 300,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  noImageText: {
    marginTop: 16,
    color: Colors.gray[500],
    fontSize: 16,
  }
}); 