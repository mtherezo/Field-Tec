// src/services/locationService.ts
//
// Captura da localização atual (GPS) para registrar onde o atendimento foi feito.

import * as Location from 'expo-location';

export type Coordenadas = { latitude: number; longitude: number };

/**
 * Pede permissão e retorna as coordenadas atuais.
 * Retorna null se a permissão for negada.
 */
export const getCurrentLocation = async (): Promise<Coordenadas | null> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
};
