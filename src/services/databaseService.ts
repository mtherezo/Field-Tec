// src/services/databaseService.ts

import * as SQLite from 'expo-sqlite';
import { Atendimento } from '../types/atendimento';
import { getAtendimentos as getAtendimentosFromAsyncStorage } from './storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ABERTURA DO BANCO DE DADOS É ASSÍNCRONA
const dbPromise = SQLite.openDatabaseAsync('atendimentos.db');
const MIGRATION_KEY = '@atm-assistente:migration_completed_v2';

// Versão atual do schema. Incrementar ao adicionar colunas novas.
const SCHEMA_VERSION = 1;

// Linha "crua" como vem do SQLite (fotos é TEXT/JSON).
type AtendimentoRow = Omit<Atendimento, 'fotos'> & { fotos: string | null };

/** Converte uma linha do banco para o tipo Atendimento da aplicação. */
const rowToAtendimento = (row: AtendimentoRow): Atendimento => {
  let fotos: string[] = [];
  if (row.fotos) {
    try {
      const parsed = JSON.parse(row.fotos);
      if (Array.isArray(parsed)) fotos = parsed;
    } catch {
      fotos = [];
    }
  }
  return { ...row, fotos };
};

/** Serializa o array de fotos para armazenar como TEXT. */
const serializeFotos = (fotos?: string[]): string | null =>
  fotos && fotos.length > 0 ? JSON.stringify(fotos) : null;

/**
 * Inicializa o banco: cria a tabela, os índices e roda as migrações de schema.
 */
export const initDatabase = async (): Promise<void> => {
  try {
    const db = await dbPromise;
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
        detalhePendencia TEXT,
        fotos TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_atendimentos_terminal ON atendimentos (numeroLogicoTerminal);
      CREATE INDEX IF NOT EXISTS idx_atendimentos_dataInicio ON atendimentos (dataInicio);
    `);

    await runSchemaMigrations(db);
    console.log("Banco de dados 'atendimentos' pronto (schema v" + SCHEMA_VERSION + ").");
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados', error);
    throw error;
  }
};

/**
 * Migrações incrementais para bancos criados por versões anteriores do app.
 * Usa PRAGMA user_version para saber em que versão o banco está.
 */
const runSchemaMigrations = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    // v1: garante a coluna 'fotos' em bancos antigos (a tabela pode já existir sem ela).
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(atendimentos)');
    if (!columns.some(c => c.name === 'fotos')) {
      await db.execAsync('ALTER TABLE atendimentos ADD COLUMN fotos TEXT;');
    }
  }

  if (currentVersion !== SCHEMA_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }
};

/**
 * Migra os dados do AsyncStorage para o SQLite, se ainda não foi feito.
 */
export const migrateAsyncStorageToSQLite = async (): Promise<void> => {
  try {
    const migrationCompleted = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrationCompleted) return;

    const oldData = await getAtendimentosFromAsyncStorage();
    if (oldData.length === 0) {
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }

    const db = await dbPromise;
    await db.withTransactionAsync(async () => {
      for (const at of oldData) {
        await db.runAsync(
          `INSERT OR REPLACE INTO atendimentos (id, numeroChamado, numeroLogicoTerminal, solicitacao, dataInicio, diagnosticoSolucao, dataFim, causaReal, status, detalhePendencia, fotos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [at.id, at.numeroChamado, at.numeroLogicoTerminal, at.solicitacao, at.dataInicio, at.diagnosticoSolucao, at.dataFim, at.causaReal, at.status, at.detalhePendencia || null, serializeFotos(at.fotos)]
        );
      }
    });

    console.log(`Migração AsyncStorage concluída! ${oldData.length} registros movidos.`);
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  } catch (error) {
    console.error('Falha crítica no processo de migração.', error);
    throw error;
  }
};

/**
 * Busca todos os atendimentos já ordenados do mais recente para o mais antigo.
 */
export const getAtendimentosFromDB = async (): Promise<Atendimento[]> => {
  try {
    const db = await dbPromise;
    const rows = await db.getAllAsync<AtendimentoRow>(
      'SELECT * FROM atendimentos ORDER BY dataInicio DESC'
    );
    return rows.map(rowToAtendimento);
  } catch (error) {
    console.error('Erro ao buscar atendimentos do SQLite', error);
    return [];
  }
};

export const addAtendimentoToDB = async (at: Atendimento): Promise<void> => {
  try {
    const db = await dbPromise;
    await db.runAsync(
      `INSERT INTO atendimentos (id, numeroChamado, numeroLogicoTerminal, solicitacao, dataInicio, diagnosticoSolucao, dataFim, causaReal, status, detalhePendencia, fotos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [at.id, at.numeroChamado, at.numeroLogicoTerminal, at.solicitacao, at.dataInicio, at.diagnosticoSolucao, at.dataFim, at.causaReal, at.status, at.detalhePendencia || null, serializeFotos(at.fotos)]
    );
  } catch (error) {
    console.error('Erro ao adicionar atendimento ao DB', error);
    throw error;
  }
};

/**
 * Insere vários atendimentos numa única transação (usado por importação/restauração).
 * INSERT OR REPLACE evita quebrar se um id já existir.
 */
export const bulkUpsertAtendimentosToDB = async (lista: Atendimento[]): Promise<void> => {
  if (lista.length === 0) return;
  try {
    const db = await dbPromise;
    await db.withTransactionAsync(async () => {
      for (const at of lista) {
        await db.runAsync(
          `INSERT OR REPLACE INTO atendimentos (id, numeroChamado, numeroLogicoTerminal, solicitacao, dataInicio, diagnosticoSolucao, dataFim, causaReal, status, detalhePendencia, fotos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [at.id, at.numeroChamado, at.numeroLogicoTerminal, at.solicitacao, at.dataInicio, at.diagnosticoSolucao, at.dataFim, at.causaReal, at.status, at.detalhePendencia || null, serializeFotos(at.fotos)]
        );
      }
    });
  } catch (error) {
    console.error('Erro na inserção em lote no DB', error);
    throw error;
  }
};

export const updateAtendimentoInDB = async (at: Atendimento): Promise<void> => {
  try {
    const db = await dbPromise;
    await db.runAsync(
      `UPDATE atendimentos SET numeroChamado = ?, numeroLogicoTerminal = ?, solicitacao = ?, dataInicio = ?, diagnosticoSolucao = ?, dataFim = ?, causaReal = ?, status = ?, detalhePendencia = ?, fotos = ? WHERE id = ?;`,
      [at.numeroChamado, at.numeroLogicoTerminal, at.solicitacao, at.dataInicio, at.diagnosticoSolucao, at.dataFim, at.causaReal, at.status, at.detalhePendencia || null, serializeFotos(at.fotos), at.id]
    );
  } catch (error) {
    console.error('Erro ao atualizar atendimento no DB', error);
    throw error;
  }
};

export const deleteAtendimentoFromDB = async (id: string): Promise<void> => {
  try {
    const db = await dbPromise;
    await db.runAsync(`DELETE FROM atendimentos WHERE id = ?;`, [id]);
  } catch (error) {
    console.error('Erro ao deletar atendimento do DB', error);
    throw error;
  }
};

export const deleteAllAtendimentosFromDB = async (): Promise<void> => {
  try {
    const db = await dbPromise;
    await db.runAsync(`DELETE FROM atendimentos;`);
  } catch (error) {
    console.error('Erro ao excluir todos os atendimentos do DB', error);
    throw error;
  }
};
