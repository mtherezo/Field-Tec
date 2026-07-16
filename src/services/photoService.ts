// src/services/photoService.ts
//
// Captura/seleção de fotos e persistência local. As imagens escolhidas ficam
// em cache temporário; aqui copiamos para um diretório permanente do app para
// que continuem existindo após fechar/reabrir.

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

const PHOTO_DIR = `${FileSystem.documentDirectory}fotos/`;

const ensureDir = async (): Promise<void> => {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
};

/** Copia uma imagem do cache para o diretório permanente e devolve o novo URI. */
const persistir = async (uri: string): Promise<string> => {
  await ensureDir();
  const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const destino = `${PHOTO_DIR}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: destino });
  return destino;
};

/** Abre a galeria. Retorna o URI persistido ou null se cancelado/negado. */
export const pickFromLibrary = async (): Promise<string | null> => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return persistir(result.assets[0].uri);
};

/** Abre a câmera. Retorna o URI persistido ou null se cancelado/negado. */
export const takePhoto = async (): Promise<string | null> => {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.6,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return persistir(result.assets[0].uri);
};

/** Remove o arquivo de uma foto (ignora erro se já não existir). */
export const deletePhotoFile = async (uri: string): Promise<void> => {
  try {
    if (uri.startsWith(PHOTO_DIR)) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // silencioso: não bloquear o fluxo por causa de limpeza de arquivo
  }
};
