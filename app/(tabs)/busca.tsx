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

  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<Atendimento[]>([]);
  const [analise, setAnalise] = useState<AnaliseProblemas>({});
  const [pesquisaFeita, setPesquisaFeita] = useState(false);

  // Busca em vários campos: terminal, chamado, motivo, causa, solução, status e pendência.
  // Parcial e sem diferenciar maiúsculas/minúsculas.
  const handleSearch = (termoParam?: string) => {
    Keyboard.dismiss();
    setPesquisaFeita(true);

    const alvo = (termoParam ?? termo).trim().toLowerCase();
    if (!alvo) {
      setResultados([]);
      setAnalise({});
      return;
    }

    const camposBusca = (at: Atendimento) => [
      at.numeroLogicoTerminal,
      at.numeroChamado,
      at.solicitacao,
      at.causaReal,
      at.diagnosticoSolucao,
      at.status,
      at.detalhePendencia,
    ];

    const filtrados = atendimentos
      .filter((at) => camposBusca(at).some(c => (c || '').toLowerCase().includes(alvo)))
      .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());
    setResultados(filtrados);

    const contagem: AnaliseProblemas = {};
    for (const at of filtrados) {
      const problema = at.causaReal || 'Causa não informada';
      contagem[problema] = (contagem[problema] || 0) + 1;
    }
    setAnalise(contagem);
  };

  const handleClear = () => {
    Keyboard.dismiss();
    setTermo('');
    setResultados([]);
    setAnalise({});
    setPesquisaFeita(false);
    router.setParams({ terminalId: undefined });
  };

  // Busca automática quando chega da tela de Relatórios com um terminal.
  useFocusEffect(
    React.useCallback(() => {
      if (params.terminalId && params.terminalId !== termo) {
        setTermo(params.terminalId);
        handleSearch(params.terminalId);
      }
    }, [params.terminalId])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Buscar Atendimentos' }} />
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Terminal, chamado, causa, status..."
          value={termo}
          onChangeText={setTermo}
          autoCapitalize="none"
          onSubmitEditing={() => handleSearch()}
          returnKeyType="search"
        />
        {/* ✅ BOTÃO DE LIMPAR ADICIONADO */}
        <View style={styles.buttonContainer}>
          {pesquisaFeita && <Button title="Limpar" onPress={handleClear} color="#DC3545" />}
          <Button title="Buscar" onPress={() => handleSearch()} />
        </View>
      </View>

      {pesquisaFeita && resultados.length === 0 && (
          <Text style={styles.emptyText}>Nenhum atendimento encontrado para a busca.</Text>
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
