// app/_layout.tsx

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
// ✅ 1. IMPORTAR useState
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
// ✅ 2. IMPORTAR A NOSSA STORE
import { useAtendimentoStore } from '@/src/store/atendimentoStore';

export { ErrorBoundary } from 'expo-router';
export const unstable_settings = { initialRouteName: '(tabs)' };

// Mantém a tela de splash visível
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // ✅ 3. NOVO ESTADO PARA CONTROLAR SE O APP ESTÁ PRONTO
  const [appIsReady, setAppIsReady] = useState(false);
  const initializeAtendimentos = useAtendimentoStore(s => s.initializeAtendimentos);

  useEffect(() => {
    async function prepareApp() {
      try {
        // Inicia o banco de dados e a migração
        console.log("Iniciando preparação do app...");
        await initializeAtendimentos();
        console.log("Banco de dados e store prontos.");
      } catch (e) {
        console.warn("Erro na preparação do app:", e);
      } finally {
        // Avisa que o app está pronto para ser exibido
        setAppIsReady(true);
        console.log("App está pronto.");
      }
    }

    prepareApp();
  }, []); // Roda apenas uma vez

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // ✅ 4. A TELA DE SPLASH AGORA ESPERA TUDO ESTAR PRONTO
  useEffect(() => {
    if (loaded && appIsReady) {
      console.log("Escondendo a tela de splash.");
      SplashScreen.hideAsync();
    }
  }, [loaded, appIsReady]);

  // Se as fontes OU o app não estiverem prontos, continua mostrando a splash screen
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
        {/* A rota "modal" de exemplo foi removida para limpar o código */}
      </Stack>
    </ThemeProvider>
  );
}
