import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
  runOnJS
} from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { LogIn } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Cor de fundo branca
const BACKGROUND_COLOR = '#FFFFFF';

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onAnimationComplete }) => {
  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const textPosition = useSharedValue(0);
  const progressOpacity = useSharedValue(0);
  const splashOpacity = useSharedValue(1);
  const shadowRadius = useSharedValue(5);
  const iconRotation = useSharedValue(0);

  useEffect(() => {
    // Logo animation sequence - pulsar
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    
    // Efeito de pulsar mais pronunciado - crescer e diminuir repetidamente
    logoScale.value = withSequence(
      // Animação inicial para o tamanho 1
      withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }),
      // Começar o efeito de pulsar repetitivo mais intenso
      withRepeat(
        withSequence(
          // Pulsar expandindo mais
          withTiming(1.3, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          // Pulsar encolhendo mais
          withTiming(0.8, { duration: 700, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Repetir infinitamente até a transição final
        true // Bounce (efeito yoyo) para transição mais suave
      )
    );
    
    // Pequena rotação do ícone para adicionar mais dinamismo
    iconRotation.value = withRepeat(
      withSequence(
        withTiming(0.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-0.05, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    // Text animation sequence with delay - apenas fade, sem deslocamento
    setTimeout(() => {
      textOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
    }, 1200);
    
    // Progress bar fade in
    setTimeout(() => {
      progressOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
    }, 1800);
    
    // Efeito de pulsar da sombra mais intenso
    shadowRadius.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    // Complete the animation and notify parent - usando fade em vez de animação de altura
    setTimeout(() => {
      const completeCallback = () => {
        if (onAnimationComplete && typeof onAnimationComplete === 'function') {
          onAnimationComplete();
        }
      };
      
      // Interromper animações infinitas
      logoScale.value = withTiming(1, { duration: 400 });
      shadowRadius.value = withTiming(10, { duration: 400 });
      
      // Depois fazer o fade
      setTimeout(() => {
        splashOpacity.value = withTiming(0, { 
          duration: 800, 
          easing: Easing.inOut(Easing.ease) 
        }, (finished) => {
          if (finished) {
            runOnJS(completeCallback)();
          }
        });
      }, 500);
    }, 4000);
  }, []);

  // Criar estilos separados para evitar problemas de tipagem
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { rotate: `${iconRotation.value}rad` }
    ],
  }));

  const shadowAnimatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.3,
    shadowRadius: shadowRadius.value,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: shadowRadius.value / 2,
  }));
  
  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));
  
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progressOpacity.value,
  }));
  
  const containerStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle, shadowAnimatedStyle]}>
          <View style={styles.logoCircle}>
            <LogIn size={60} color={Colors.primary} />
          </View>
        </Animated.View>
        
        <Animated.Text style={[styles.title, textAnimatedStyle]}>
          Condomínio Fácil
        </Animated.Text>
        
        <Animated.Text style={[styles.subtitle, textAnimatedStyle]}>
          Gestão de condomínio simplificada
        </Animated.Text>
        
        <Animated.View 
          style={[styles.progressContainer, progressAnimatedStyle]}
        >
          <View style={styles.loadingBar}>
            <Animated.View 
              style={[styles.loadingProgress, progressAnimatedStyle]}
            />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BACKGROUND_COLOR, // Cor de fundo branca
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: width * 0.7,
    alignItems: 'center',
    marginTop: 20,
  },
  loadingBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
});

export default AnimatedSplash; 