// app/_layout.tsx

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { useAtendimentoStore } from '@/src/store/atendimentoStore';

export { ErrorBoundary } from 'expo-router';
export const unstable_settings = { initialRouteName: '(tabs)' };

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [appIsReady, setAppIsReady] = useState(false);
  // ✅ NOME DA CONSTANTE CORRIGIDO PARA CONSISTÊNCIA
  const initializeAtendimentos = useAtendimentoStore(s => s.initializeAtendimentos);

  useEffect(() => {
    async function prepareApp() {
      try {
        console.log("Iniciando preparação do app...");
        // ✅ CHAMANDO A FUNÇÃO COM O NOME CORRETO
        await initializeAtendimentos();
        console.log("Banco de dados e store prontos.");
      } catch (e) {
        console.warn("Erro na preparação do app:", e);
      } finally {
        setAppIsReady(true);
        console.log("App está pronto.");
      }
    }

    prepareApp();
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && appIsReady) {
      console.log("Escondendo a tela de splash.");
      SplashScreen.hideAsync();
    }
  }, [loaded, appIsReady]);

  if (!loaded || !appIsReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="atendimento/[id]" 
          options={{ 
            animation: 'slide_from_right',
            headerBackTitle: 'Voltar'
          }} 
        />
        <Stack.Screen 
          name="novoAtendimento" 
          options={{ 
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerBackTitle: 'Cancelar'
          }} 
        />
      </Stack>
    </ThemeProvider>
  );
}
