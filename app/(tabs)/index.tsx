// app/(tabs)/index.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert, Modal, useColorScheme, Button } from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';

import { useAtendimentoStore } from '@/src/store/atendimentoStore';
import { Atendimento, Status, statusOptions } from '@/src/types/atendimento';

const AtendimentoItem = ({ item }: { item: Atendimento }) => {
  const router = useRouter();
  const handleNavigate = () => { router.push({ pathname: "/atendimento/[id]", params: { id: item.id } }); };
  return (
    <Pressable style={styles.itemContainer} onPress={handleNavigate}>
      <View style={styles.itemHeader}><Text style={styles.itemTitle}>{item.numeroChamado}</Text><View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}><Text style={styles.statusText}>{item.status}</Text></View></View>
      <View style={styles.itemBody}><View style={styles.infoRow}><FontAwesome name="desktop" size={14} color="#666" style={styles.icon} /><Text style={styles.infoText}>{item.numeroLogicoTerminal}</Text></View><View style={styles.infoRow}><FontAwesome name="commenting-o" size={14} color="#666" style={styles.icon} /><Text style={styles.infoText} numberOfLines={1}>{item.solicitacao}</Text></View></View>
      {item.status.includes('Pendente') && item.detalhePendencia && (<View style={styles.pendenciaRow}><FontAwesome name="info-circle" size={14} color="#B45309" /><Text style={styles.pendenciaText}>{item.detalhePendencia}</Text></View>)}
      <View style={styles.itemFooter}><FontAwesome name="calendar" size={14} color="#666" style={styles.icon} /><Text style={styles.infoText}>{new Date(item.dataInicio).toLocaleDateString('pt-BR')}</Text></View>
    </Pressable>
  );
};
const getStatusColor = (status: string) => {
  if (status === 'Concluído') return '#28a745';
  if (status.includes('Pendente')) return '#ffc107';
  return 'orange';
};

export default function ListaAtendimentosScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  
  const { atendimentos, isLoading, initializeAtendimentos, addAtendimento } = useAtendimentoStore();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | Status>('Todos');
  const [dataInicioFiltro, setDataInicioFiltro] = useState<Date | null>(null);
  const [dataFimFiltro, setDataFimFiltro] = useState<Date | null>(null);

  useEffect(() => {
    initializeAtendimentos();
  }, []);

  const atendimentosFiltrados = atendimentos.filter(atendimento => {
    const statusMatch = filtroStatus === 'Todos' || atendimento.status === filtroStatus;
    if (!statusMatch) return false;
    const dataAtendimento = new Date(atendimento.dataInicio);
    if (dataInicioFiltro && dataFimFiltro) {
        const inicio = new Date(dataInicioFiltro);
        inicio.setHours(0, 0, 0, 0);
        const fim = new Date(dataFimFiltro);
        fim.setHours(23, 59, 59, 999);
        return dataAtendimento >= inicio && dataAtendimento <= fim;
    }
    return true;
  });

  const showDateFilterPicker = (tipo: 'inicio' | 'fim') => {
    const dataAtual = tipo === 'inicio' ? dataInicioFiltro : dataFimFiltro;
    DateTimePickerAndroid.open({
        value: dataAtual || new Date(),
        mode: 'date',
        onChange: (event, selectedDate) => {
            if (event.type === 'set' && selectedDate) {
                if (tipo === 'inicio') { setDataInicioFiltro(selectedDate); } 
                else { setDataFimFiltro(selectedDate); }
            }
        }
    });
  };

  const limparFiltros = () => {
    setFiltroStatus('Todos');
    setDataInicioFiltro(null);
    setDataFimFiltro(null);
    setModalVisible(false);
  };
  
  const getFormattedDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const generateHtmlForPdf = (data: Atendimento[]) => {
    const atendimentosHtml = data.map(at => `
      <tr>
        <td>${at.numeroChamado}</td><td>${at.numeroLogicoTerminal}</td><td>${at.status}</td>
        <td>${at.detalhePendencia || ''}</td><td>${new Date(at.dataInicio).toLocaleDateString('pt-BR')}</td>
      </tr>`).join('');
    return `
      <html><head><style>body{font-family:Helvetica,sans-serif;color:#333}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;text-align:left;padding:8px;font-size:10px}th{background-color:#f2f2f2}h1{text-align:center;color:#3e2961ff}p{font-size:12px}</style></head>
      <body><h1>Relatório de Atendimentos</h1><p><strong>Filtro Aplicado:</strong> ${filtroStatus} | Período: ${(dataInicioFiltro && dataFimFiltro ? `${dataInicioFiltro.toLocaleDateString('pt-BR')} a ${dataFimFiltro.toLocaleDateString('pt-BR')}`: 'Todos')}</p><p><strong>Total de Registros:</strong> ${data.length}</p>
      <table><thead><tr><th>Chamado</th><th>Terminal</th><th>Status</th><th>Detalhe Pendência</th><th>Data</th></tr></thead><tbody>${atendimentosHtml}</tbody></table></body></html>`;
  };

  const handleExportPdf = async () => {
    const data = atendimentosFiltrados;
    if (data.length === 0) { Alert.alert("Sem Dados", "Não há atendimentos para exportar em PDF."); return; }
    try {
      const { uri: tempUri } = await Print.printToFileAsync({ html: generateHtmlForPdf(data) });
      const pdfName = `Relatorio_Atendimentos_${getFormattedDate()}.pdf`;
      const newUri = FileSystem.documentDirectory + pdfName;
      await FileSystem.moveAsync({ from: tempUri, to: newUri });
      await Sharing.shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: 'Exportar Relatório PDF' });
    } catch (error) { Alert.alert("Erro", "Não foi possível gerar o arquivo PDF."); }
  };

  const handleExportXlsx = async () => {
    const data = atendimentosFiltrados;
    if (data.length === 0) { Alert.alert("Sem Dados", "Não há atendimentos para exportar."); return; }
    const header = ["Chamado", "Terminal", "Status", "Motivo", "Detalhe Pendência", "Causa Real", "Data Início", "Data Fim"];
    const rows = data.map(at => [ at.numeroChamado, at.numeroLogicoTerminal, at.status, at.solicitacao, at.detalhePendencia || '', at.causaReal, new Date(at.dataInicio).toLocaleString('pt-BR'), at.dataFim ? new Date(at.dataFim).toLocaleString('pt-BR') : '' ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atendimentos");
    const base64 = XLSX.write(wb, { type: "base64" });
    const filename = FileSystem.documentDirectory + `Relatorio_Atendimentos_${getFormattedDate()}.xlsx`;
    try {
      await FileSystem.writeAsStringAsync(filename, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(filename, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Exportar Relatório Excel' });
    } catch (error) { Alert.alert("Erro", "Não foi possível gerar o arquivo Excel."); }
  };

  const handleImportXlsx = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
      
      const wb = XLSX.read(fileContent, { type: 'base64' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (data.length < 2) {
        Alert.alert("Erro", "Arquivo vazio ou inválido.");
        return;
      }

      const rows = data.slice(1);
      let importadosComSucesso = 0;

      // ✅ CORREÇÃO: DIZEMOS AO TYPESCRIPT QUE CADA 'row' É UM ARRAY DE 'any'
      for (const row of rows as any[]) {
        const novoAtendimento: Atendimento = {
          id: Date.now().toString() + Math.random(),
          numeroChamado: String(row[0] || ''),
          numeroLogicoTerminal: String(row[1] || ''),
          status: (statusOptions.includes(row[2]) ? row[2] : 'Em andamento') as Status,
          solicitacao: String(row[3] || ''),
          detalhePendencia: String(row[4] || ''),
          causaReal: String(row[5] || ''),
          dataInicio: new Date(row[6] || Date.now()).toISOString(),
          dataFim: row[7] ? new Date(row[7]).toISOString() : null,
          diagnosticoSolucao: '',
        };
        await addAtendimento(novoAtendimento);
        importadosComSucesso++;
      }

      Alert.alert("Sucesso!", `${importadosComSucesso} atendimentos foram importados com sucesso.`);

    } catch (error) {
      console.error("Erro ao importar XLSX:", error);
      Alert.alert("Erro", "Não foi possível importar o arquivo. Verifique o formato.");
    }
  };

  const isFiltroAtivo = filtroStatus !== 'Todos' || (!!dataInicioFiltro && !!dataFimFiltro);

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      <Modal visible={modalVisible} onRequestClose={() => setModalVisible(false)} transparent={true} animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Filtrar por Status</Text>
            {['Todos', ...statusOptions].map(status => (<Pressable key={status} style={styles.modalOption} onPress={() => { setFiltroStatus(status as any); setModalVisible(false); }}><Text style={styles.modalOptionText}>{status}</Text></Pressable>))}
            <Text style={[styles.modalTitle, { marginTop: 20 }]}>Filtrar por Período</Text>
            <View style={styles.dateFilterRow}>
                <Pressable style={styles.datePickerButton} onPress={() => showDateFilterPicker('inicio')}><FontAwesome name="calendar" size={16} color="#333" /><Text style={styles.datePickerText}>{dataInicioFiltro ? `De: ${dataInicioFiltro.toLocaleDateString('pt-BR')}` : 'Data Início'}</Text></Pressable>
                <Pressable style={styles.datePickerButton} onPress={() => showDateFilterPicker('fim')}><FontAwesome name="calendar" size={16} color="#333" /><Text style={styles.datePickerText}>{dataFimFiltro ? `Até: ${dataFimFiltro.toLocaleDateString('pt-BR')}` : 'Data Fim'}</Text></Pressable>
            </View>
            <View style={{marginTop: 20, width: '100%'}}>
              <Button title="Limpar Filtros" onPress={limparFiltros} color="#DC3545" />
            </View>
          </View>
        </Pressable>
      </Modal>

      <Stack.Screen
        options={{
          title: 'Atendimentos',
          headerRight: () => {
            const iconColor = colorScheme === 'dark' ? 'white' : 'black';
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22 }}>
                <Pressable onPress={handleImportXlsx}>
                  <FontAwesome name="cloud-upload" size={26} color={iconColor} />
                </Pressable>
                <Pressable onPress={() => setModalVisible(true)}><FontAwesome name="filter" size={24} color={isFiltroAtivo ? '#007AFF' : iconColor} /></Pressable>
                <Pressable onPress={handleExportPdf}><FontAwesome name="file-pdf-o" size={24} color="#DC3545" /></Pressable>
                <Pressable onPress={handleExportXlsx}><FontAwesome name="file-excel-o" size={24} color="#28a745" /></Pressable>
                <Pressable onPress={() => router.push('/novoAtendimento')}><FontAwesome name="plus-circle" size={28} color={iconColor} /></Pressable>
              </View>
            );
          },
        }}
      />

      <FlatList
        data={atendimentosFiltrados}
        renderItem={({ item }) => <AtendimentoItem item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 8 }}
        ListEmptyComponent={() => (<View style={styles.emptyContainer}><Text style={styles.emptyText}>{isFiltroAtivo ? 'Nenhum atendimento encontrado' : 'Nenhum atendimento cadastrado.'}</Text>{!isFiltroAtivo && <Text style={styles.emptySubtext}>Clique no '+' para começar.</Text>}</View>)}
      />
    </View>
  );
}

// (Seus estilos personalizados mantidos)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3e2961ff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  itemContainer: { backgroundColor: '#c7d8c4ff', borderRadius: 12, padding: 16, marginVertical: 8, marginHorizontal: 12, borderWidth: 1, borderColor: '#EFEFEF', shadowColor: "#555", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 3.84, elevation: 5 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 12, color: 'black', fontWeight: 'bold' },
  itemBody: { marginBottom: 8, },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { marginRight: 8 },
  infoText: { fontSize: 15, color: '#444', fontWeight: 'bold', flex: 1 },
  pendenciaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e9dba5ff', borderRadius: 6, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: '#FEEBC8', },
  pendenciaText: { marginLeft: 8, fontSize: 14, color: '#994606ff', fontStyle: 'italic', flex: 1, },
  itemFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8, marginTop: 4 },
  emptyContainer: { flex: 1, marginTop: '50%', alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, fontWeight: 'bold', color: 'white' },
  emptySubtext: { fontSize: 14, color: '#ccc', marginTop: 8 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalView: { margin: 20, backgroundColor: '#d1d7ddff', borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  modalOption: { width: '100%', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalOptionText: { textAlign: 'center', fontSize: 15, color: '#3b0653ff' },
  dateFilterRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, gap: 10, },
  datePickerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEFF4', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', },
  datePickerText: { marginLeft: 8, fontSize: 14, color: '#333', },
});
