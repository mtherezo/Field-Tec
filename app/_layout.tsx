// app/_layout.tsx

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
// ✅ 1. IMPORTAR AS FUNÇÕES DO BANCO DE DADOS
import { initDatabase, migrateAsyncStorageToSQLite } from '@/src/services/databaseService';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // ✅ 2. ADICIONAR O useEffect PARA INICIALIZAR E MIGRAR O BANCO DE DADOS
  useEffect(() => {
    async function setupDatabase() {
      try {
        await initDatabase();
        await migrateAsyncStorageToSQLite();
        console.log("Banco de dados pronto e migração verificada.");
      } catch (error) {
        console.error("Falha ao configurar o banco de dados na inicialização:", error);
      }
    }
    setupDatabase();
  }, []); // O array vazio garante que isso rode apenas uma vez

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* ✅ 3. ATUALIZAR AS ROTAS DO STACK NAVIGATOR */}
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
        {/* A rota "modal" foi removida pois não faz parte do nosso app */}
      </Stack>
    </ThemeProvider>
  );
}
