// app/(tabs)/relatorios.tsx

import React, { useMemo, useState } from 'react'; // Adicionado useState
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAtendimentoStore } from '@/src/store/atendimentoStore';
import { Atendimento } from '@/src/types/atendimento';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

interface TerminalRanking {
  terminalId: string;
  count: number;
}

const RankingItem = ({ item, index }: { item: TerminalRanking, index: number }) => {
    const router = useRouter();

    const handlePress = () => {
        router.push({
            pathname: '/(tabs)/busca',
            params: { terminalId: item.terminalId }
        });
    };

    return (
        <Pressable style={styles.itemContainer} onPress={handlePress}>
            <View style={styles.rankContainer}>
                <Text style={styles.rankNumber}>{index + 1}º</Text>
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.terminalId}>Terminal: {item.terminalId}</Text>
                <Text style={styles.defectCount}>{item.count} atendimento(s) no mês</Text>
            </View>
            <FontAwesome name="chevron-right" size={16} color="#ccc" />
        </Pressable>
    );
};

export default function RelatoriosScreen() {
  const { atendimentos } = useAtendimentoStore();
  const router = useRouter();

  // ✅ 1. ESTADO PARA CONTROLAR O MÊS EXIBIDO
  const [displayDate, setDisplayDate] = useState(new Date());

  // ✅ 2. LÓGICA DE ANÁLISE AGORA USA O ESTADO 'displayDate'
  const rankingDoMes = useMemo(() => {
    const mesSelecionado = displayDate.getMonth();
    const anoSelecionado = displayDate.getFullYear();

    const atendimentosDoMes = atendimentos.filter(at => {
      const dataAtendimento = new Date(at.dataInicio);
      return dataAtendimento.getMonth() === mesSelecionado && dataAtendimento.getFullYear() === anoSelecionado;
    });

    const contagem = atendimentosDoMes.reduce((acc, at) => {
      acc[at.numeroLogicoTerminal] = (acc[at.numeroLogicoTerminal] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const ranking: TerminalRanking[] = Object.entries(contagem)
      .map(([terminalId, count]) => ({ terminalId, count }))
      .sort((a, b) => b.count - a.count);

    return ranking;
  }, [atendimentos, displayDate]); // Roda de novo quando os atendimentos ou a data mudam

  // ✅ 3. FUNÇÕES PARA NAVEGAR ENTRE OS MESES
  const goToPreviousMonth = () => {
    setDisplayDate(currentDate => new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setDisplayDate(currentDate => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Formata o nome do mês e ano para exibição
  const nomeMesDisplay = displayDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const getFormattedDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Funções de exportação (agora usam 'nomeMesDisplay' para o nome do arquivo)
  const generateHtmlForRankingPdf = (data: TerminalRanking[]) => {
    const rankingHtml = data.map((item, index) => `
      <tr>
        <td>${index + 1}º</td>
        <td>${item.terminalId}</td>
        <td>${item.count}</td>
      </tr>
    `).join('');

    return `
      <html>
        <head><style>body{font-family:Helvetica,sans-serif;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;font-size:12px;}th{background-color:#f2f2f2;}h1{text-align:center;}</style></head>
        <body>
          <h1>Ranking de Atendimentos - ${nomeMesDisplay.charAt(0).toUpperCase() + nomeMesDisplay.slice(1)}</h1>
          <table>
            <thead><tr><th>Posição</th><th>Terminal</th><th>Nº de Atendimentos</th></tr></thead>
            <tbody>${rankingHtml}</tbody>
          </table>
        </body>
      </html>
    `;
  };

  const handleExportPdf = async () => {
    if (rankingDoMes.length === 0) { Alert.alert("Sem Dados", "Não há dados no ranking para exportar."); return; }
    try {
      const html = generateHtmlForRankingPdf(rankingDoMes);
      const { uri: tempUri } = await Print.printToFileAsync({ html });
      const pdfName = `Ranking_${nomeMesDisplay}_${getFormattedDate()}.pdf`;
      const newUri = FileSystem.documentDirectory + pdfName;
      await FileSystem.moveAsync({ from: tempUri, to: newUri });
      await Sharing.shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: 'Exportar Ranking em PDF' });
    } catch (error) { Alert.alert("Erro", "Não foi possível gerar o arquivo PDF."); }
  };
  
  const handleExportXlsx = async () => {
    if (rankingDoMes.length === 0) { Alert.alert("Sem Dados", "Não há dados no ranking para exportar."); return; }
    const header = ["Posição", "Terminal", "Nº de Atendimentos"];
    const rows = rankingDoMes.map((item, index) => [index + 1, item.terminalId, item.count]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Ranking ${nomeMesDisplay}`);
    const base64 = XLSX.write(wb, { type: "base64" });
    const filename = FileSystem.documentDirectory + `Ranking_${nomeMesDisplay}_${getFormattedDate()}.xlsx`;
    try {
      await FileSystem.writeAsStringAsync(filename, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(filename, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Exportar Ranking em Excel' });
    } catch (error) { Alert.alert("Erro", "Não foi possível gerar o arquivo Excel."); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Relatórios Mensais',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, marginRight: 15 }}>
              <Pressable onPress={handleExportPdf}>
                <FontAwesome name="file-pdf-o" size={24} color="#DC3545" />
              </Pressable>
              <Pressable onPress={handleExportXlsx}>
                <FontAwesome name="file-excel-o" size={24} color="#28a745" />
              </Pressable>
            </View>
          ),
        }}
      />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ranking de Atendimentos</Text>
        {/* ✅ 4. NOVO SELETOR DE MÊS */}
        <View style={styles.monthSelector}>
            <Pressable onPress={goToPreviousMonth} style={styles.arrowButton}>
                <FontAwesome name="chevron-left" size={20} color="#007AFF" />
            </Pressable>
            <Text style={styles.headerSubtitle}>{nomeMesDisplay.charAt(0).toUpperCase() + nomeMesDisplay.slice(1)}</Text>
            <Pressable onPress={goToNextMonth} style={styles.arrowButton}>
                <FontAwesome name="chevron-right" size={20} color="#007AFF" />
            </Pressable>
        </View>
      </View>

      <FlatList
        data={rankingDoMes}
        renderItem={({ item, index }) => <RankingItem item={item} index={index} />}
        keyExtractor={(item) => item.terminalId}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum atendimento registrado neste mês.</Text>
            </View>
        )}
      />
    </SafeAreaView>
  );
}

// ✅ 5. ESTILOS ATUALIZADOS
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f7' },
  header: { backgroundColor: 'white', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  arrowButton: {
    padding: 10,
  },
  headerSubtitle: { fontSize: 16, textAlign: 'center', color: 'gray', fontWeight: '600' },
  itemContainer: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginVertical: 8, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, },
  rankContainer: { backgroundColor: '#EFEFF4', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  rankNumber: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  infoContainer: { flex: 1 },
  terminalId: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  defectCount: { fontSize: 14, color: 'gray', marginTop: 2 },
  emptyContainer: { flex: 1, marginTop: '40%', alignItems: 'center' },
  emptyText: { fontSize: 16, color: 'gray' },
});
