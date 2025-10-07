import { Text, View, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current; // texto do splash

  useEffect(() => {
    // Fade-in inicial do texto
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: true,
    }).start();

    // Depois de 4s, faz fade-out e navega para entrada
    const timeout = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }).start(() => {
        // Se modo dev, vai para /entrada normalmente
        // Se modo prod, vai para /entrada normalmente
        // (Aqui pode customizar para pular etapas no dev)
        router.replace("/entrada");
      });
  }, 4000); // Splash padrão

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
      <Animated.Text
        style={{
          color: "#fff",
          fontSize: 24,
          fontWeight: "bold",
          textAlign: "center",
          opacity: fadeAnim,
        }}
      >
        DevAssist presents...
      </Animated.Text>
    </View>
  );
}
