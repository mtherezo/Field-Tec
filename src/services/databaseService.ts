// src/services/databaseService.ts

import * as SQLite from 'expo-sqlite';
import { Atendimento } from '../types/atendimento';
import { getAtendimentos as getAtendimentosFromAsyncStorage } from './storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MIGRATION_KEY = '@atm-assistente:migration_completed_v2';

// ✅ 1. SINGLETON INSTANCE
// Esta variável irá guardar a nossa conexão com o banco de dados depois de aberta.
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Garante que o banco de dados seja aberto e a tabela seja criada APENAS UMA VEZ.
 * Todas as outras funções irão chamar esta primeiro para garantir que o DB está pronto.
 * @returns A instância do banco de dados pronto para uso.
 */
const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  // Se o banco de dados já foi aberto, retorna a instância existente imediatamente.
  if (db !== null) {
    return db;
  }
  
  // Se for a primeira vez, abre e prepara o banco de dados.
  try {
    console.log("Abrindo e preparando o banco de dados pela primeira vez...");
    const localDb = await SQLite.openDatabaseAsync('atendimentos.db');
    
    await localDb.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS atendimentos (
        id TEXT PRIMARY KEY NOT NULL,
        numeroChamado TEXT NOT NULL,
        numeroLogicoTerminal TEXT NOT NULL,
        solicitacao TEXT,
        dataInicio TEXT NOT NULL,
        diagnosticoSolucao TEXT,
        dataFim TEXT,
        causaReal TEXT,
        status TEXT,
        detalhePendencia TEXT
      );
    `);
    console.log("Banco de dados e tabela estão prontos.");
    db = localDb; // Guarda a instância para uso futuro
    return db;
  } catch (error) {
    console.error("ERRO CRÍTICO: Falha ao abrir ou inicializar o banco de dados.", error);
    throw error;
  }
};

/**
 * Esta função é chamada uma vez no arranque do app para migrar os dados.
 * Ela primeiro garante que o banco de dados está pronto chamando getDatabase().
 */
export const performStartupDbTasks = async (): Promise<void> => {
  await getDatabase(); // Garante que o DB e a tabela existam antes de tentar migrar

  try {
    const migrationCompleted = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrationCompleted) {
      return;
    }

    console.log("Iniciando migração do AsyncStorage para o SQLite...");
    const oldData = await getAtendimentosFromAsyncStorage();

    if (oldData.length === 0) {
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }

    await db!.withTransactionAsync(async () => {
      for (const at of oldData) {
        await db!.runAsync(
          `INSERT OR REPLACE INTO atendimentos (id, numeroChamado, numeroLogicoTerminal, solicitacao, dataInicio, diagnosticoSolucao, dataFim, causaReal, status, detalhePendencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [at.id, at.numeroChamado, at.numeroLogicoTerminal, at.solicitacao, at.dataInicio, at.diagnosticoSolucao, at.dataFim, at.causaReal, at.status, at.detalhePendencia || null]
        );
      }
    });

    console.log(`Migração bem-sucedida! ${oldData.length} registos movidos.`);
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  } catch (error) {
    console.error("Falha crítica durante o processo de migração.", error);
    throw error;
  }
};


// ✅ 2. TODAS AS FUNÇÕES AGORA CHAMAM getDatabase() PRIMEIRO
export const getAtendimentosFromDB = async (): Promise<Atendimento[]> => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync<Atendimento>('SELECT * FROM atendimentos');
  } catch (error) {
    console.error("Erro ao buscar atendimentos do SQLite", error);
    return [];
  }
};

export const addAtendimentoToDB = async (at: Atendimento): Promise<void> => {
  try {
    const db = await getDatabase();
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
    const db = await getDatabase();
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
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM atendimentos WHERE id = ?;`, [id]);
  } catch (error) {
    console.error("Erro ao deletar atendimento do DB", error);
    throw error;
  }
};

export const deleteAllAtendimentosFromDB = async (): Promise<void> => {
  try {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM atendimentos;`);
  } catch (error) {
    console.error("Erro ao deletar todos os atendimentos do DB", error);
    throw error;
  }
};
