// src/services/databaseService.ts

import * as SQLite from 'expo-sqlite';
import { Atendimento } from '../types/atendimento';
import { getAtendimentos as getAtendimentosFromAsyncStorage } from './storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ 1. A ABERTURA DO BANCO DE DADOS AGORA É ASSÍNCRONA
const dbPromise = SQLite.openDatabaseAsync('atendimentos.db');
const MIGRATION_KEY = '@atm-assistente:migration_completed_v2'; // Chave atualizada

/**
 * Inicializa o banco de dados. Cria a tabela se ela não existir.
 */
export const initDatabase = async (): Promise<void> => {
  try {
    const db = await dbPromise;
    // O método execAsync é ideal para rodar comandos de setup
    await db.execAsync(`
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
    console.log("Banco de dados e tabela 'atendimentos' prontos (API v2).");
  } catch (error) {
    console.error("Erro ao inicializar o banco de dados", error);
    throw error;
  }
};

/**
 * Executa a migração dos dados do AsyncStorage para o SQLite, se necessário.
 */
export const migrateAsyncStorageToSQLite = async (): Promise<void> => {
  try {
    const migrationCompleted = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrationCompleted) {
      console.log("Migração para SQLite (API v2) já foi concluída.");
      return;
    }

    console.log("Iniciando migração de dados do AsyncStorage para SQLite (API v2)...");
    const oldData = await getAtendimentosFromAsyncStorage();

    if (oldData.length === 0) {
      console.log("Nenhum dado encontrado no AsyncStorage para migrar.");
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }

    const db = await dbPromise;
    // ✅ 2. A TRANSAÇÃO AGORA É FEITA COM 'withTransactionAsync'
    await db.withTransactionAsync(async () => {
      for (const at of oldData) {
        // O método runAsync é usado para INSERT, UPDATE, DELETE
        await db.runAsync(
          `INSERT OR REPLACE INTO atendimentos (id, numeroChamado, numeroLogicoTerminal, solicitacao, dataInicio, diagnosticoSolucao, dataFim, causaReal, status, detalhePendencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            at.id,
            at.numeroChamado,
            at.numeroLogicoTerminal,
            at.solicitacao,
            at.dataInicio,
            at.diagnosticoSolucao,
            at.dataFim,
            at.causaReal,
            at.status,
            at.detalhePendencia || null,
          ]
        );
      }
    });

    console.log(`Migração concluída com sucesso! ${oldData.length} registros movidos.`);
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');

  } catch (error) {
    console.error("Falha crítica no processo de migração.", error);
    throw error;
  }
};

/**
 * Busca todos os atendimentos salvos no banco de dados SQLite.
 */
export const getAtendimentosFromDB = async (): Promise<Atendimento[]> => {
  try {
    const db = await dbPromise;
    // ✅ 3. O MÉTODO 'getAllAsync' É USADO PARA BUSCAR DADOS (SELECT)
    const allRows = await db.getAllAsync<Atendimento>('SELECT * FROM atendimentos');
    return allRows;
  } catch (error) {
    console.error("Erro ao buscar atendimentos do SQLite", error);
    return [];
  }
};

/**
 * Adiciona um novo atendimento ao banco de dados SQLite.
 */
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

/**
 * Atualiza um atendimento existente no banco de dados SQLite.
 */
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

/**
 * Deleta um atendimento do banco de dados SQLite pelo seu ID.
 */
export const deleteAtendimentoFromDB = async (id: string): Promise<void> => {
  try {
    const db = await dbPromise;
    await db.runAsync(`DELETE FROM atendimentos WHERE id = ?;`, [id]);
  } catch (error) {
    console.error("Erro ao deletar atendimento do DB", error);
    throw error;
  }
};
