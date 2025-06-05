import React, { PropsWithChildren } from 'react';
import Animated, { 
  FadeIn, 
  FadeOut, 
  FadeInDown, 
  FadeInUp,
  SlideInLeft,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { View, ViewStyle } from 'react-native';

interface SafeAnimatedViewProps {
  entering?: any;
  exiting?: any;
  style?: ViewStyle | ViewStyle[];
  fallbackToView?: boolean;
}

const SafeAnimatedView: React.FC<PropsWithChildren<SafeAnimatedViewProps>> = ({ 
  children, 
  entering, 
  exiting, 
  style,
  fallbackToView = false
}) => {
  // Se fallbackToView é true ou se há problemas com reanimated, usa View normal
  if (fallbackToView) {
    return <View style={style}>{children}</View>;
  }

  try {
    return (
      <Animated.View 
        entering={entering}
        exiting={exiting}
        style={style}
      >
        {children}
      </Animated.View>
    );
  } catch (error) {
    console.warn('SafeAnimatedView fallback ativado devido ao erro:', error);
    return <View style={style}>{children}</View>;
  }
};

// Exported safe animation presets com configurações mais conservadoras
export const SafeAnimations = {
  FadeIn: FadeIn.duration(300),
  FadeOut: FadeOut.duration(300),
  FadeInDown: FadeInDown.duration(400),
  FadeInUp: FadeInUp.duration(400),
  SlideInLeft: SlideInLeft.duration(300),
  SlideOutLeft: SlideOutLeft.duration(300),
};

export default SafeAnimatedView; 