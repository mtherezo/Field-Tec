// src/services/notificationService.ts
//
// Lembretes locais para chamados pendentes (ex.: "Pendente de Peça").
// Agenda uma notificação local que dispara depois de N dias.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Atendimento } from '../types/atendimento';

// Mostra a notificação mesmo com o app aberto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let canalConfigurado = false;
const garantirCanalAndroid = async () => {
  if (Platform.OS === 'android' && !canalConfigurado) {
    await Notifications.setNotificationChannelAsync('lembretes', {
      name: 'Lembretes de pendências',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    canalConfigurado = true;
  }
};

/**
 * Agenda um lembrete para daqui a `dias` dias.
 * Retorna o id do lembrete, ou null se a permissão for negada.
 */
export const agendarLembretePendencia = async (
  at: Atendimento,
  dias: number
): Promise<string | null> => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  await garantirCanalAndroid();

  const detalhe = at.detalhePendencia ? ` — ${at.detalhePendencia}` : '';
  return Notifications.scheduleNotificationAsync({
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
};
