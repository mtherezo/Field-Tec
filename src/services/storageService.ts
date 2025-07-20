// src/services/storageService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Atendimento } from '../types/atendimento';

// Uma chave única para identificar nossos dados no armazenamento do celular
const STORAGE_KEY = '@atm-assistente:atendimentos';

/**
 * Busca todos os atendimentos salvos no dispositivo.
 * @returns Uma Promise que resolve para um array de Atendimentos.
 */
export const getAtendimentos = async (): Promise<Atendimento[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    // Se encontrarmos dados, transformamos a string de volta em um objeto/array.
    // Se não houver nada (ex: primeiro uso do app), retornamos um array vazio.
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    // Se der um erro na leitura, logamos o erro e retornamos um array vazio.
    console.error('Falha ao buscar os atendimentos do armazenamento.', e);
    return [];
  }
};

/**
 * Salva a lista completa de atendimentos no dispositivo.
 * @param atendimentos O array completo de atendimentos a ser salvo.
 */
export const saveAtendimentos = async (atendimentos: Atendimento[]): Promise<void> => {
  try {
    // O AsyncStorage só armazena texto (string), então convertemos nosso array para o formato JSON.
    const jsonValue = JSON.stringify(atendimentos);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (e) {
    // Se der um erro no salvamento, logamos o erro.
    console.error('Falha ao salvar os atendimentos no armazenamento.', e);
  }
};