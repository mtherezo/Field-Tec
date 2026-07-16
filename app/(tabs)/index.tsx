// app/(tabs)/index.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert, Modal, useColorScheme, Button, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAtendimentoStore } from '@/src/store/atendimentoStore';
import { Atendimento, Status, statusOptions } from '@/src/types/atendimento';
import { AtendimentoCard } from '@/components/AtendimentoCard';
import { AppColors } from '@/constants/theme';
import { getFormattedDate, formatDate } from '@/src/utils/format';
import { exportBackup, pickAndReadBackup } from '@/src/services/backupService';

export default function ListaAtendimentosScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const { atendimentos, isLoading, initializeAtendimentos, importAtendimentos, clearAllAtendimentos } = useAtendimentoStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false); // evita toques duplos durante export/import

  const [filtroStatus, setFiltroStatus] = useState<Status[]>([]);
  const [tempFiltroStatus, setTempFiltroStatus] = useState<Status[]>([]);
  const [dataInicioFiltro, setDataInicioFiltro] = useState<Date | null>(null);
  const [dataFimFiltro, setDataFimFiltro] = useState<Date | null>(null);

  useEffect(() => {
    initializeAtendimentos();
  }, []);

  // Filtragem: status (multi) + período. Cada limite de data é independente
  // (antes o filtro só funcionava com as DUAS datas preenchidas).
  const atendimentosFiltrados = atendimentos.filter(atendimento => {
    const statusMatch = filtroStatus.length === 0 || filtroStatus.includes(atendimento.status);
    if (!statusMatch) return false;

    const dataAtendimento = new Date(atendimento.dataInicio);
    if (dataInicioFiltro) {
      const inicio = new Date(dataInicioFiltro);
      inicio.setHours(0, 0, 0, 0);
      if (dataAtendimento < inicio) return false;
    }
    if (dataFimFiltro) {
      const fim = new Date(dataFimFiltro);
      fim.setHours(23, 59, 59, 999);
      if (dataAtendimento > fim) return false;
    }
    return true;
  });

  const isFiltroAtivo = filtroStatus.length > 0 || !!dataInicioFiltro || !!dataFimFiltro;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeAtendimentos();
    setRefreshing(false);
  }, [initializeAtendimentos]);

  const handleToggleStatus = (status: Status) => {
    setTempFiltroStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const aplicarFiltros = () => {
    setFiltroStatus(tempFiltroStatus);
    setModalVisible(false);
  };

  const limparFiltros = () => {
    setFiltroStatus([]);
    setTempFiltroStatus([]);
    setDataInicioFiltro(null);
    setDataFimFiltro(null);
    setModalVisible(false);
  };

  const showDateFilterPicker = (tipo: 'inicio' | 'fim') => {
    const dataAtual = tipo === 'inicio' ? dataInicioFiltro : dataFimFiltro;
    DateTimePickerAndroid.open({
      value: dataAtual || new Date(),
      mode: 'date',
      onChange: (event, selectedDate) => {
        if (event.type === 'set' && selectedDate) {
          if (tipo === 'inicio') setDataInicioFiltro(selectedDate);
          else setDataFimFiltro(selectedDate);
        }
      },
    });
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Atenção! Ação Irreversível',
      'Você tem certeza que deseja excluir TODOS os atendimentos salvos? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Excluir Tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllAtendimentos();
              setModalVisible(false);
              Alert.alert('Sucesso', 'Todos os atendimentos foram excluídos.');
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir os dados.');
            }
          },
        },
      ]
    );
  };

  // ---- Exportações ----
  const generateHtmlForPdf = (data: Atendimento[]) => {
    const linhas = data.map(at => `
      <tr>
        <td>${at.numeroChamado}</td><td>${at.numeroLogicoTerminal}</td><td>${at.status}</td>
        <td>${at.solicitacao || ''}</td><td>${at.diagnosticoSolucao || ''}</td><td>${at.causaReal || ''}</td>
        <td>${at.detalhePendencia || ''}</td><td>${formatDate(at.dataInicio)}</td>
        <td>${at.dataFim ? formatDate(at.dataFim) : ''}</td>
      </tr>`).join('');
    const periodo = dataInicioFiltro || dataFimFiltro
      ? `${dataInicioFiltro ? formatDate(dataInicioFiltro) : '...'} a ${dataFimFiltro ? formatDate(dataFimFiltro) : '...'}`
      : 'Todos';
    return `
      <html><head><style>body{font-family:Helvetica,sans-serif;color:#333}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;text-align:left;padding:4px;font-size:8px;}th{background-color:#f2f2f2}h1{text-align:center;color:#3e2c61}p{font-size:12px}</style></head>
      <body><h1>Relatório de Atendimentos</h1><p><strong>Filtro:</strong> ${filtroStatus.join(', ') || 'Todos'} | <strong>Período:</strong> ${periodo}</p><p><strong>Total:</strong> ${data.length}</p>
      <table><thead><tr><th>Chamado</th><th>Terminal</th><th>Status</th><th>Motivo</th><th>Solução</th><th>Causa</th><th>Pendência</th><th>Data Início</th><th>Data Fim</th></tr></thead><tbody>${linhas}</tbody></table></body></html>`;
  };

  const handleExportPdf = async () => {
    const data = atendimentosFiltrados;
    if (data.length === 0) { Alert.alert('Sem Dados', 'Não há atendimentos para exportar em PDF.'); return; }
    setBusy(true);
    try {
      const { uri: tempUri } = await Print.printToFileAsync({ html: generateHtmlForPdf(data) });
      const newUri = FileSystem.documentDirectory + `Relatorio_Atendimentos_${getFormattedDate()}.pdf`;
      await FileSystem.moveAsync({ from: tempUri, to: newUri });
      await Sharing.shareAsync(newUri, { mimeType: 'application/pdf', dialogTitle: 'Exportar Relatório PDF' });
    } catch { Alert.alert('Erro', 'Não foi possível gerar o arquivo PDF.'); }
    finally { setBusy(false); }
  };

  const handleExportXlsx = async () => {
    const data = atendimentosFiltrados;
    if (data.length === 0) { Alert.alert('Sem Dados', 'Não há atendimentos para exportar.'); return; }
    setBusy(true);
    try {
      const header = ['Chamado', 'Terminal', 'Status', 'Motivo', 'Solução', 'Causa Real', 'Detalhe Pendência', 'Data Início', 'Data Fim'];
      const rows = data.map(at => [at.numeroChamado, at.numeroLogicoTerminal, at.status, at.solicitacao, at.diagnosticoSolucao, at.causaReal, at.detalhePendencia || '', new Date(at.dataInicio), at.dataFim ? new Date(at.dataFim) : null]);
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Atendimentos');
      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filename = FileSystem.documentDirectory + `Relatorio_Atendimentos_${getFormattedDate()}.xlsx`;
      await FileSystem.writeAsStringAsync(filename, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(filename, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Exportar Relatório Excel' });
    } catch { Alert.alert('Erro', 'Não foi possível gerar o arquivo Excel.'); }
    finally { setBusy(false); }
  };

  const handleImportXlsx = async () => {
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset.name.toLowerCase().endsWith('.xlsx')) {
        Alert.alert('Arquivo Inválido', 'Por favor, selecione um arquivo Excel (.xlsx).');
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const wb = XLSX.read(fileContent, { type: 'base64' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, cellDates: true } as any);

      if (data.length < 2) { Alert.alert('Erro', 'Arquivo Excel vazio ou inválido.'); return; }

      const novos: Atendimento[] = [];
      (data.slice(1) as any[]).forEach((row, i) => {
        if (!row[0] || !row[1]) return;
        novos.push({
          id: `${Date.now()}-${i}`,
          numeroChamado: String(row[0]),
          numeroLogicoTerminal: String(row[1]),
          status: (statusOptions.includes(row[2]) ? row[2] : 'Em andamento') as Status,
          solicitacao: String(row[3] || ''),
          detalhePendencia: String(row[4] || ''),
          causaReal: String(row[5] || ''),
          dataInicio: (row[6] instanceof Date ? row[6] : new Date()).toISOString(),
          dataFim: (row[7] instanceof Date ? row[7] : null)?.toISOString() || null,
          diagnosticoSolucao: '',
          fotos: [],
        });
      });

      await importAtendimentos(novos);
      Alert.alert('Sucesso!', `${novos.length} atendimento(s) importado(s).`);
    } catch (error) {
      console.error('Erro ao importar XLSX:', error);
      Alert.alert('Erro', 'Não foi possível importar o arquivo. Verifique se ele não está corrompido.');
    } finally { setBusy(false); }
  };

  // ---- Backup JSON ----
  const handleExportBackup = async () => {
    if (atendimentos.length === 0) { Alert.alert('Sem Dados', 'Não há atendimentos para o backup.'); return; }
    setBusy(true);
    try {
      await exportBackup(atendimentos);
    } catch { Alert.alert('Erro', 'Não foi possível gerar o backup.'); }
    finally { setBusy(false); }
  };

  const handleImportBackup = async () => {
    setBusy(true);
    try {
      const lista = await pickAndReadBackup();
      if (lista === null) return; // cancelado
      if (lista.length === 0) { Alert.alert('Backup vazio', 'Nenhum atendimento válido encontrado no arquivo.'); return; }
      Alert.alert(
        'Restaurar Backup',
        `Foram encontrados ${lista.length} atendimento(s). Eles serão adicionados/atualizados na sua lista. Continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            onPress: async () => {
              try {
                await importAtendimentos(lista);
                setModalVisible(false);
                Alert.alert('Sucesso!', `${lista.length} atendimento(s) restaurado(s).`);
              } catch { Alert.alert('Erro', 'Falha ao restaurar o backup.'); }
            },
          },
        ]
      );
    } catch {
      Alert.alert('Erro', 'Arquivo de backup inválido ou corrompido.');
    } finally { setBusy(false); }
  };

  if (isLoading) {
    return <ActivityIndicator size="large" color={AppColors.primary} style={styles.loader} />;
  }

  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={modalVisible} onRequestClose={() => setModalVisible(false)} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalView} onPress={() => {}}>
            <Text style={styles.modalTitle}>Filtrar por Status</Text>
            {statusOptions.map(status => (
              <Pressable key={status} style={styles.modalOption} onPress={() => handleToggleStatus(status)}>
                <FontAwesome name={tempFiltroStatus.includes(status) ? 'check-square-o' : 'square-o'} size={24} color="#3b0653" />
                <Text style={styles.modalOptionText}>{status}</Text>
              </Pressable>
            ))}

            <Text style={[styles.modalTitle, { marginTop: 20 }]}>Filtrar por Período</Text>
            <View style={styles.dateFilterRow}>
              <Pressable style={styles.datePickerButton} onPress={() => showDateFilterPicker('inicio')}><FontAwesome name="calendar" size={16} color="#333" /><Text style={styles.datePickerText}>{dataInicioFiltro ? `De: ${formatDate(dataInicioFiltro)}` : 'Data Início'}</Text></Pressable>
              <Pressable style={styles.datePickerButton} onPress={() => showDateFilterPicker('fim')}><FontAwesome name="calendar" size={16} color="#333" /><Text style={styles.datePickerText}>{dataFimFiltro ? `Até: ${formatDate(dataFimFiltro)}` : 'Data Fim'}</Text></Pressable>
            </View>

            <View style={styles.modalButtonContainer}>
              <Button title="Limpar Filtros" onPress={limparFiltros} color="#555" />
              <Button title="Aplicar Filtros" onPress={aplicarFiltros} />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Backup</Text>
              <View style={styles.modalButtonContainer}>
                <Button title="Exportar (JSON)" onPress={handleExportBackup} />
                <Button title="Restaurar" onPress={handleImportBackup} color={AppColors.success} />
              </View>
              <View style={{ marginTop: 16 }}>
                <Button title="Excluir Todos os Dados" onPress={handleClearAllData} color="#c91c1c" />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Stack.Screen
        options={{
          title: 'Atendimentos',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, marginRight: 15 }}>
              <Pressable onPress={handleImportXlsx} disabled={busy} accessibilityLabel="Importar planilha"><FontAwesome name="cloud-upload" size={26} color={iconColor} /></Pressable>
              <Pressable onPress={() => { setTempFiltroStatus(filtroStatus); setModalVisible(true); }} accessibilityLabel="Filtros e backup"><FontAwesome name="filter" size={24} color={isFiltroAtivo ? AppColors.primary : iconColor} /></Pressable>
              <Pressable onPress={handleExportPdf} disabled={busy} accessibilityLabel="Exportar PDF"><FontAwesome name="file-pdf-o" size={24} color={AppColors.pdf} /></Pressable>
              <Pressable onPress={handleExportXlsx} disabled={busy} accessibilityLabel="Exportar Excel"><FontAwesome name="file-excel-o" size={24} color={AppColors.excel} /></Pressable>
              <Pressable onPress={() => router.push('/novoAtendimento')} accessibilityLabel="Novo atendimento"><FontAwesome name="plus-circle" size={28} color={iconColor} /></Pressable>
            </View>
          ),
        }}
      />

      {isFiltroAtivo && (
        <View style={styles.resultBar}>
          <Text style={styles.resultText}>{atendimentosFiltrados.length} resultado(s) — filtro ativo</Text>
          <Pressable onPress={limparFiltros}><Text style={styles.resultClear}>Limpar</Text></Pressable>
        </View>
      )}

      <FlatList
        data={atendimentosFiltrados}
        renderItem={({ item }) => <AtendimentoCard item={item} variant="lista" />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{isFiltroAtivo ? 'Nenhum atendimento encontrado' : 'Nenhum atendimento cadastrado.'}</Text>
            {!isFiltroAtivo && <Text style={styles.emptySubtext}>Clique no '+' para começar.</Text>}
          </View>
        )}
      />

      {busy && (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AppColors.background },
  resultBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: AppColors.backgroundElevated },
  resultText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  resultClear: { color: '#9ecbff', fontSize: 13, fontWeight: 'bold' },
  emptyContainer: { flex: 1, marginTop: '50%', alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, fontWeight: 'bold', color: 'white' },
  emptySubtext: { fontSize: 14, color: '#ccc', marginTop: 8 },
  busyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalView: { margin: 20, backgroundColor: AppColors.surfaceAlt, borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  modalOption: { width: '100%', paddingVertical: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalOptionText: { fontSize: 15, color: '#3b0653', marginLeft: 15 },
  dateFilterRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, gap: 10 },
  datePickerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEFF4', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  datePickerText: { marginLeft: 8, fontSize: 14, color: '#333' },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20, gap: 12 },
  modalSection: { marginTop: 24, width: '100%', borderTopWidth: 1, borderTopColor: '#bbb', paddingTop: 16 },
  modalSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center' },
});
