// components/AtendimentoCard.tsx
//
// Card de atendimento reutilizado nas telas de Lista (index) e Busca.
// Antes esse item existia duplicado quase igual nos dois arquivos.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

import { Atendimento } from '@/src/types/atendimento';
import { getStatusStyle } from '@/constants/theme';
import { formatDate } from '@/src/utils/format';

type Variant = 'lista' | 'busca';

type Props = {
  item: Atendimento;
  /** 'lista' mostra terminal + motivo; 'busca' mostra causa + solução. */
  variant?: Variant;
};

const StatusBadge = ({ status }: { status: string }) => {
  const { backgroundColor, color } = getStatusStyle(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor }]}>
      <Text style={[styles.statusText, { color }]}>{status}</Text>
    </View>
  );
};

const PendenciaRow = ({ detalhe }: { detalhe: string }) => (
  <View style={styles.pendenciaRow}>
    <FontAwesome name="info-circle" size={14} color="#B45309" />
    <Text style={styles.pendenciaText}>{detalhe}</Text>
  </View>
);

const AtendimentoCardComponent = ({ item, variant = 'lista' }: Props) => {
  const router = useRouter();
  const handleNavigate = () =>
    router.push({ pathname: '/atendimento/[id]', params: { id: item.id } });

  const mostrarPendencia = item.status.includes('Pendente') && !!item.detalhePendencia;

  return (
    <Pressable style={styles.itemContainer} onPress={handleNavigate}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{item.numeroChamado}</Text>
        <StatusBadge status={item.status} />
      </View>

      {variant === 'lista' ? (
        <>
          <View style={styles.itemBody}>
            <View style={styles.infoRow}>
              <FontAwesome name="desktop" size={14} color="#666" style={styles.icon} />
              <Text style={styles.infoText}>{item.numeroLogicoTerminal}</Text>
            </View>
            <View style={styles.infoRow}>
              <FontAwesome name="commenting-o" size={14} color="#666" style={styles.icon} />
              <Text style={styles.infoText} numberOfLines={1}>{item.solicitacao}</Text>
            </View>
          </View>
          {mostrarPendencia && <PendenciaRow detalhe={item.detalhePendencia!} />}
          <View style={styles.itemFooter}>
            <FontAwesome name="calendar" size={14} color="#666" style={styles.icon} />
            <Text style={styles.infoText}>{formatDate(item.dataInicio)}</Text>
          </View>
        </>
      ) : (
        <>
          {mostrarPendencia && <PendenciaRow detalhe={item.detalhePendencia!} />}
          <Text style={styles.itemSubtitle}>Causa Real: {item.causaReal || 'Não informada'}</Text>
          <Text style={styles.itemText}>Solução: {item.diagnosticoSolucao || 'Não informada'}</Text>
          <Text style={styles.itemDate}>Data: {formatDate(item.dataInicio)}</Text>
        </>
      )}
    </Pressable>
  );
};

// memo evita re-render dos itens quando a lista muda mas o item não.
export const AtendimentoCard = React.memo(AtendimentoCardComponent);

const styles = StyleSheet.create({
  itemContainer: { backgroundColor: '#c7d8c4', borderRadius: 12, padding: 16, marginVertical: 8, marginHorizontal: 12, borderWidth: 1, borderColor: '#EFEFEF', shadowColor: '#555', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 3.84, elevation: 5 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  itemBody: { marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { marginRight: 8 },
  infoText: { fontSize: 15, color: '#444', fontWeight: 'bold', flex: 1 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8, marginTop: 4 },
  itemSubtitle: { fontSize: 14, color: '#333', fontWeight: '600', marginTop: 8 },
  itemText: { fontSize: 14, color: '#26271e', marginTop: 4 },
  itemDate: { fontSize: 12, color: '#26271e', marginTop: 8, textAlign: 'right' },
  pendenciaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e9dba5', borderRadius: 6, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: '#FEEBC8' },
  pendenciaText: { marginLeft: 8, fontSize: 14, color: '#994606', fontStyle: 'italic', flex: 1 },
});
