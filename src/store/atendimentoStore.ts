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
  deleteAllAtendimentosFromDB, // ✅ 1. IMPORTAR A NOVA FUNÇÃO
} from '../services/databaseService';

interface AtendimentoState {
  atendimentos: Atendimento[];
  isLoading: boolean;
  initializeAtendimentos: () => Promise<void>;
  addAtendimento: (novoAtendimento: Atendimento) => Promise<void>;
  updateAtendimento: (atendimentoAtualizado: Atendimento) => Promise<void>;
  removeAtendimento: (atendimentoId: string) => Promise<void>;
  // ✅ 2. ADICIONAR A NOVA AÇÃO À INTERFACE
  clearAllAtendimentos: () => Promise<void>; 
}

export const useAtendimentoStore = create<AtendimentoState>((set, get) => ({
  atendimentos: [],
  isLoading: true,

  initializeAtendimentos: async () => {
    try {
      if (!get().isLoading) set({ isLoading: true });
      await initDatabase();
      await migrateAsyncStorageToSQLite();
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

  // ✅ 3. IMPLEMENTAR A NOVA AÇÃO
  clearAllAtendimentos: async () => {
    await deleteAllAtendimentosFromDB();
    // Limpa o estado na memória para refletir a mudança instantaneamente
    set({ atendimentos: [] });
  },
}));
