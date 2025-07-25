// src/services/databaseService.ts

import * as SQLite from 'expo-sqlite';
import { Atendimento } from '../types/atendimento';
import { getAtendimentos as getAtendimentosFromAsyncStorage } from './storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const dbPromise = SQLite.openDatabaseAsync('atendimentos.db');
const MIGRATION_KEY = '@atm-assistente:migration_completed_v2';

export const initDatabase = async (): Promise<void> => {
  try {
    const db = await dbPromise;
    await db.withTransactionAsync(async () => {
      await db.runAsync('PRAGMA journal_mode = WAL;');
      await db.runAsync(
        `CREATE TABLE IF NOT EXISTS atendimentos (
          id TEXT PRIMARY KEY NOT NULL, numeroChamado TEXT NOT NULL, numeroLogicoTerminal TEXT NOT NULL,
          solicitacao TEXT, dataInicio TEXT NOT NULL, diagnosticoSolucao TEXT, dataFim TEXT,
          causaReal TEXT, status TEXT, detalhePendencia TEXT
        );`
      );
    });
    console.log("Banco de dados e tabela 'atendimentos' prontos (API v2).");
  } catch (error) {
    console.error("Erro ao inicializar o banco de dados", error);
    throw error;
  }
};

export const migrateAsyncStorageToSQLite = async (): Promise<void> => {
  try {
    const migrationCompleted = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrationCompleted) {
      return;
    }
    const oldData = await getAtendimentosFromAsyncStorage();
    if (oldData.length === 0) {
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }
    const db = await dbPromise;
    await db.withTransactionAsync(async () => {
      for (const at of oldData) {
        await db.runAsync(
          `INSERT OR REPLACE INTO atendimentos (id, numeroChamado, numeroLogicoTerminal, solicitacao, dataInicio, diagnosticoSolucao, dataFim, causaReal, status, detalhePendencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [ at.id, at.numeroChamado, at.numeroLogicoTerminal, at.solicitacao, at.dataInicio, at.diagnosticoSolucao, at.dataFim, at.causaReal, at.status, at.detalhePendencia || null ]
        );
      }
    });
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  } catch (error) {
    console.error("Falha crítica no processo de migração.", error);
    throw error;
  }
};

export const getAtendimentosFromDB = async (): Promise<Atendimento[]> => {
  try {
    const db = await dbPromise;
    return await db.getAllAsync<Atendimento>('SELECT * FROM atendimentos');
  } catch (error) {
    console.error("Erro ao buscar atendimentos do SQLite", error);
    return [];
  }
};

export const addAtendimentoToDB = async (at: Atendimento): Promise<void> => {
  try {
    const db = await dbPromise;
    await db.runAsync(
      `INSERT INTO atendimentos (id, numeroChamado, numeroLogicoTerminal, solicitacao, dataInicio, diagnosticoSolucao, dataFim, causaReal, status, detalhePendencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [at.id, at.numeroChamado, at.numeroLogicoTerminal, at.solicitacao, at.dataInicio, at.diagnosticoSolucao, at.dataFim, at.causaReal, at.status, at.detalhePendencia || null]
    );
  } catch (error) {
    console.error("Erro ao adicionar atendimento ao DB", error);
    throw error;
  }
};

export const updateAtendimentoInDB = async (at: Atendimento): Promise<void> => {
  try {
    const db = await dbPromise;
    await db.runAsync(
      `UPDATE atendimentos SET numeroChamado = ?, numeroLogicoTerminal = ?, solicitacao = ?, dataInicio = ?, diagnosticoSolucao = ?, dataFim = ?, causaReal = ?, status = ?, detalhePendencia = ? WHERE id = ?;`,
      [at.numeroChamado, at.numeroLogicoTerminal, at.solicitacao, at.dataInicio, at.diagnosticoSolucao, at.dataFim, at.causaReal, at.status, at.detalhePendencia || null, at.id]
    );
  } catch (error) {
    console.error("Erro ao atualizar atendimento no DB", error);
    throw error;
  }
};

export const deleteAtendimentoFromDB = async (id: string): Promise<void> => {
  try {
    const db = await dbPromise;
    await db.runAsync(`DELETE FROM atendimentos WHERE id = ?;`, [id]);
  } catch (error) {
    console.error("Erro ao deletar atendimento do DB", error);
    throw error;
  }
};

// ✅ FUNÇÃO ADICIONADA
/**
 * Deleta TODOS os atendimentos da tabela.
 */
export const deleteAllAtendimentosFromDB = async (): Promise<void> => {
  try {
    const db = await dbPromise;
    await db.runAsync(`DELETE FROM atendimentos;`);
    console.log("Todos os atendimentos foram deletados do banco de dados.");
  } catch (error) {
    console.error("Erro ao deletar todos os atendimentos do DB", error);
    throw error;
  }
};
