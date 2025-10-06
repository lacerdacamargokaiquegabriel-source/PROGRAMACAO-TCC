import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";

export default function Entrada() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isTransitioning = useRef(false);

  useEffect(() => {
    // Fade-in da tela de entrada
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    // Animação de pulsação
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleEnter = () => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 1500,
      useNativeDriver: true,
    }).start(() => {
      router.replace("/jogo");
    });
  };

  return (
    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleEnter}> 
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}> 
        {/* Área da animação futura */}
        <View style={styles.neonBox}>
          {/* Conteúdo da animação será aqui */}
        </View>
        <Animated.View style={[styles.bottom, { opacity: pulseAnim }]}> 
          <Text style={styles.text}>Clique para entrar!</Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  neonBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,0,50,0.25)',
    borderColor: '#ff0033',
    borderWidth: 4,
    borderRadius: 24,
    boxShadow: '0 0 30px 0 #ff0033',
    zIndex: 0,
  },
  bottom: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 48,
    zIndex: 1,
  },
  text: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textShadow: '0 0 12px #ff0033',
  },
});
