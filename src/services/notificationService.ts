// src/services/notificationService.ts
//
// Lembretes locais para chamados pendentes (ex.: "Pendente de Peça").
// Agenda uma notificação local que dispara depois de N dias.
//
// IMPORTANTE: o expo-notifications foi removido do Expo Go a partir do SDK 53.
// Por isso o módulo é carregado de forma preguiçosa (lazy) e só quando NÃO
// estamos no Expo Go — assim o app não quebra ao abrir no Expo Go; o recurso
// funciona plenamente em um development build.

import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { Atendimento } from '../types/atendimento';

// 'storeClient' = rodando dentro do Expo Go.
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export type ResultadoLembrete =
  | { ok: true; id: string }
  | { ok: false; motivo: 'expo-go' | 'permissao' };

let handlerConfigurado = false;
let canalConfigurado = false;

/**
 * Agenda um lembrete para daqui a `dias` dias.
 * Não suportado no Expo Go (retorna motivo 'expo-go').
 */
export const agendarLembretePendencia = async (
  at: Atendimento,
  dias: number
): Promise<ResultadoLembrete> => {
  if (isExpoGo) return { ok: false, motivo: 'expo-go' };

  // require preguiçoso: o módulo nativo só é tocado fora do Expo Go.
  const Notifications = require('expo-notifications');

  if (!handlerConfigurado) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigurado = true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return { ok: false, motivo: 'permissao' };

  if (Platform.OS === 'android' && !canalConfigurado) {
    await Notifications.setNotificationChannelAsync('lembretes', {
      name: 'Lembretes de pendências',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    canalConfigurado = true;
  }

  const detalhe = at.detalhePendencia ? ` — ${at.detalhePendencia}` : '';
  const id: string = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Lembrete: chamado ${at.numeroChamado}`,
      body: `${at.status}${detalhe} (Terminal ${at.numeroLogicoTerminal})`,
      data: { atendimentoId: at.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(dias * 24 * 60 * 60)),
      channelId: 'lembretes',
    },
  });

  return { ok: true, id };
};
