// src/store/atendimentoStore.ts

import { create } from 'zustand';
import { Atendimento } from '../types/atendimento';
import {
  initDatabase,
  migrateAsyncStorageToSQLite,
  getAtendimentosFromDB,
  addAtendimentoToDB,
  updateAtendimentoInDB,
  deleteAtendimentoFromDB,
  deleteAllAtendimentosFromDB,
  bulkUpsertAtendimentosToDB,
} from '../services/databaseService';

// Ordena do mais recente para o mais antigo (mesma regra do SELECT do banco).
const ordenar = (lista: Atendimento[]): Atendimento[] =>
  [...lista].sort(
    (a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()
  );

interface AtendimentoState {
  atendimentos: Atendimento[];
  isLoading: boolean;
  initializeAtendimentos: () => Promise<void>;
  addAtendimento: (novoAtendimento: Atendimento) => Promise<void>;
  updateAtendimento: (atendimentoAtualizado: Atendimento) => Promise<void>;
  removeAtendimento: (atendimentoId: string) => Promise<void>;
  clearAllAtendimentos: () => Promise<void>;
  importAtendimentos: (lista: Atendimento[]) => Promise<void>;
}

export const useAtendimentoStore = create<AtendimentoState>((set, get) => ({
  atendimentos: [],
  isLoading: true,

  // Roda uma vez na abertura do app: prepara o DB, migra dados antigos e carrega tudo.
  initializeAtendimentos: async () => {
    try {
      if (!get().isLoading) set({ isLoading: true });

      await initDatabase();
      await migrateAsyncStorageToSQLite();
      const dados = await getAtendimentosFromDB(); // já vem ordenado do banco

      set({ atendimentos: dados, isLoading: false });
    } catch (error) {
      console.error('Falha ao inicializar a store:', error);
      set({ isLoading: false });
    }
  },

  // As mutações abaixo atualizam o estado em memória em vez de recarregar o
  // banco inteiro — muito mais rápido e sem re-executar init/migração.
  addAtendimento: async (novo) => {
    await addAtendimentoToDB(novo);
    set(state => ({ atendimentos: ordenar([novo, ...state.atendimentos]) }));
  },

  updateAtendimento: async (atualizado) => {
    await updateAtendimentoInDB(atualizado);
    set(state => ({
      atendimentos: ordenar(
        state.atendimentos.map(at => (at.id === atualizado.id ? atualizado : at))
      ),
    }));
  },

  removeAtendimento: async (id) => {
    await deleteAtendimentoFromDB(id);
    set(state => ({ atendimentos: state.atendimentos.filter(at => at.id !== id) }));
  },

  clearAllAtendimentos: async () => {
    await deleteAllAtendimentosFromDB();
    set({ atendimentos: [] });
  },

  // Importação/restauração em lote (backup JSON ou planilha).
  importAtendimentos: async (lista) => {
    await bulkUpsertAtendimentosToDB(lista);
    const dados = await getAtendimentosFromDB();
    set({ atendimentos: dados });
  },
}));
