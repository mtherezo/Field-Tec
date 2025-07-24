// src/store/atendimentoStore.ts

import { create } from 'zustand';
import { Atendimento } from '../types/atendimento';
// ✅ 1. IMPORTAR TODAS AS FUNÇÕES DO BANCO DE DADOS
import {
  initDatabase,
  migrateAsyncStorageToSQLite,
  getAtendimentosFromDB,
  addAtendimentoToDB,
  updateAtendimentoInDB,
  deleteAtendimentoFromDB,
} from '../services/databaseService';

interface AtendimentoState {
  atendimentos: Atendimento[];
  isLoading: boolean;
  initializeAtendimentos: () => Promise<void>; // O nome que estamos usando no app
  addAtendimento: (novoAtendimento: Atendimento) => Promise<void>;
  updateAtendimento: (atendimentoAtualizado: Atendimento) => Promise<void>;
  removeAtendimento: (atendimentoId: string) => Promise<void>;
}

export const useAtendimentoStore = create<AtendimentoState>((set, get) => ({
  atendimentos: [],
  isLoading: true,

  // ✅ 2. FUNÇÃO DE INICIALIZAÇÃO CORRIGIDA E COMPLETA
  initializeAtendimentos: async () => {
    try {
      if (!get().isLoading) set({ isLoading: true });
      
      // Garante que a tabela exista ANTES de qualquer outra operação
      await initDatabase();
      // Migra os dados antigos do AsyncStorage (só roda uma vez)
      await migrateAsyncStorageToSQLite();
      // AGORA, com a tabela pronta, busca os dados
      const dadosDoDB = await getAtendimentosFromDB();
      
      dadosDoDB.sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());
      
      set({ atendimentos: dadosDoDB, isLoading: false });
    } catch (error) {
      console.error("Falha ao inicializar a store:", error);
      set({ isLoading: false });
    }
  },

  addAtendimento: async (novoAtendimento) => {
    await addAtendimentoToDB(novoAtendimento);
    // Recarrega tudo do DB para garantir que a lista esteja sempre atualizada
    await get().initializeAtendimentos();
  },

  updateAtendimento: async (atendimentoAtualizado) => {
    await updateAtendimentoInDB(atendimentoAtualizado);
    await get().initializeAtendimentos();
  },

  removeAtendimento: async (atendimentoId) => {
    await deleteAtendimentoFromDB(atendimentoId);
    await get().initializeAtendimentos();
  },
}));
