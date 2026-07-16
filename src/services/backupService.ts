// src/services/backupService.ts
//
// Backup completo (todos os atendimentos) em formato JSON.
// Permite exportar/compartilhar um arquivo e restaurá-lo depois — protegendo
// contra perda de dados ou troca de aparelho.

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Atendimento, statusOptions, Status } from '../types/atendimento';
import { getFormattedDate } from '../utils/format';

const BACKUP_VERSION = 1;

type BackupFile = {
  app: 'field-tec';
  version: number;
  exportadoEm: string;
  atendimentos: Atendimento[];
};

/** Gera o arquivo de backup e abre o menu de compartilhamento. */
export const exportBackup = async (atendimentos: Atendimento[]): Promise<void> => {
  const payload: BackupFile = {
    app: 'field-tec',
    version: BACKUP_VERSION,
    exportadoEm: new Date().toISOString(),
    atendimentos,
  };

  const filename = `${FileSystem.documentDirectory}Backup_FieldTec_${getFormattedDate()}.json`;
  await FileSystem.writeAsStringAsync(filename, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filename, {
      mimeType: 'application/json',
      dialogTitle: 'Salvar backup dos atendimentos',
    });
  }
};

/** Valida (de forma tolerante) um objeto vindo do backup e o normaliza. */
const normalizarAtendimento = (raw: any): Atendimento | null => {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.id || !raw.numeroChamado || !raw.numeroLogicoTerminal) return null;

  const status: Status = statusOptions.includes(raw.status) ? raw.status : 'Em andamento';

  return {
    id: String(raw.id),
    numeroChamado: String(raw.numeroChamado),
    numeroLogicoTerminal: String(raw.numeroLogicoTerminal),
    solicitacao: String(raw.solicitacao ?? ''),
    diagnosticoSolucao: String(raw.diagnosticoSolucao ?? ''),
    causaReal: String(raw.causaReal ?? ''),
    status,
    detalhePendencia: raw.detalhePendencia ? String(raw.detalhePendencia) : '',
    dataInicio: raw.dataInicio ? String(raw.dataInicio) : new Date().toISOString(),
    dataFim: raw.dataFim ? String(raw.dataFim) : null,
    fotos: Array.isArray(raw.fotos) ? raw.fotos.map(String) : [],
  };
};

/**
 * Abre o seletor de arquivos, lê o backup e devolve os atendimentos válidos.
 * Retorna null se o usuário cancelar.
 */
export const pickAndReadBackup = async (): Promise<Atendimento[] | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const conteudo = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const parsed = JSON.parse(conteudo);
  const lista: any[] = Array.isArray(parsed)
    ? parsed // aceita também um array puro de atendimentos
    : parsed?.atendimentos;

  if (!Array.isArray(lista)) {
    throw new Error('Formato de backup inválido.');
  }

  const validos = lista
    .map(normalizarAtendimento)
    .filter((at): at is Atendimento => at !== null);

  return validos;
};
