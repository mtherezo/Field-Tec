// app/(tabs)/busca.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  FlatList,
  Keyboard,
} from 'react-native';
import { Atendimento } from '@/src/types/atendimento';
import { useAtendimentoStore } from '@/src/store/atendimentoStore';
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AtendimentoCard } from '@/components/AtendimentoCard';

type AnaliseProblemas = {
  [problema: string]: number;
};

export default function BuscaScreen() {
  const { atendimentos } = useAtendimentoStore();
  const params = useLocalSearchParams<{ terminalId?: string }>();
  const router = useRouter(); // Adicionado para limpar os parâmetros

  const [terminalId, setTerminalId] = useState('');
  const [resultados, setResultados] = useState<Atendimento[]>([]);
  const [analise, setAnalise] = useState<AnaliseProblemas>({});
  const [pesquisaFeita, setPesquisaFeita] = useState(false);

  const handleSearch = (idParaBuscar?: string) => {
    Keyboard.dismiss();
    setPesquisaFeita(true);

    const termoBusca = (idParaBuscar || terminalId).trim();

    // Compara os dois lados sem espaços para evitar falha por espaços acidentais.
    const filtrados = atendimentos.filter(
      (at) => at.numeroLogicoTerminal.trim() === termoBusca
    );
    filtrados.sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());
    setResultados(filtrados);

    const contagem: AnaliseProblemas = {};
    for (const atendimento of filtrados) {
      const problema = atendimento.causaReal || 'Causa não informada';
      contagem[problema] = (contagem[problema] || 0) + 1;
    }
    setAnalise(contagem);
  };

  // ✅ NOVA FUNÇÃO PARA LIMPAR A BUSCA
  const handleClear = () => {
    Keyboard.dismiss();
    setTerminalId('');
    setResultados([]);
    setAnalise({});
    setPesquisaFeita(false);
    // Limpa os parâmetros da rota para não re-buscar ao focar novamente
    router.setParams({ terminalId: undefined });
  };

  // ✅ useFocusEffect MODIFICADO (SEM LIMPEZA AUTOMÁTICA)
  useFocusEffect(
    React.useCallback(() => {
      // Se um terminalId foi passado como parâmetro E é diferente do que já está na tela
      if (params.terminalId && params.terminalId !== terminalId) {
        setTerminalId(params.terminalId);
        handleSearch(params.terminalId);
      }
    }, [params.terminalId])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Busca por Terminal' }} />
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Digite o Nº Lógico do Terminal"
          value={terminalId}
          onChangeText={setTerminalId}
          keyboardType="numeric"
          onSubmitEditing={() => handleSearch()}
        />
        {/* ✅ BOTÃO DE LIMPAR ADICIONADO */}
        <View style={styles.buttonContainer}>
          {pesquisaFeita && <Button title="Limpar" onPress={handleClear} color="#DC3545" />}
          <Button title="Buscar" onPress={() => handleSearch()} />
        </View>
      </View>

      {pesquisaFeita && resultados.length === 0 && (
          <Text style={styles.emptyText}>Nenhum histórico encontrado para este terminal.</Text>
      )}

      {resultados.length > 0 && (
        <FlatList
          data={resultados}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AtendimentoCard item={item} variant="busca" />}
          ListHeaderComponent={() => (
            <View style={styles.analiseContainer}>
              <Text style={styles.analiseTitle}>Problemas Recorrentes</Text>
              {Object.entries(analise)
                .sort(([, a], [, b]) => b - a)
                .map(([problema, count]) => (
                <Text key={problema} style={styles.analiseItem}>
                  • {problema}: <Text style={{fontWeight: 'bold'}}>{count} vez(es)</Text>
                </Text>
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3e2961ff' },
  searchContainer: { flexDirection: 'row', padding: 16, marginHorizontal: 16, marginTop: 8, backgroundColor: '#c7d8c4ff', alignItems: 'center' },
  input: { flex: 1, height: 40, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, marginRight: 10, backgroundColor: 'white' },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: 'white', fontWeight: 'bold' },
  analiseContainer: { padding: 16, backgroundColor: '#c7d8c4', marginHorizontal: 16, marginTop: 8, borderRadius: 8 },
  analiseTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  analiseItem: { fontSize: 15, marginBottom: 4 },
});
