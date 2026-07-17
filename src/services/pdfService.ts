// src/services/pdfService.ts
//
// Geração de PDF de UM atendimento (com fotos embutidas em base64) e
// compartilhamento. As fotos são convertidas em data URI porque o motor de
// impressão nem sempre carrega file:// diretamente.

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Atendimento } from '../types/atendimento';
import { getStatusColor } from '@/constants/theme';
import { getFormattedDate, formatDateTime } from '../utils/format';

const esc = (v?: string | null) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const fotoParaDataUri = async (uri: string): Promise<string | null> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const ext = (uri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
};

const buildHtml = async (at: Atendimento): Promise<string> => {
  const dataUris = await Promise.all((at.fotos ?? []).map(fotoParaDataUri));
  const fotosHtml = dataUris
    .filter(Boolean)
    .map(src => `<img src="${src}" style="width:31%;margin:1%;border:1px solid #ccc;border-radius:6px;" />`)
    .join('');

  const localizacao =
    at.latitude != null && at.longitude != null
      ? `<a href="https://www.google.com/maps?q=${at.latitude},${at.longitude}">${at.latitude.toFixed(5)}, ${at.longitude.toFixed(5)}</a>`
      : 'Não informada';

  const linha = (label: string, valor: string) =>
    `<tr><td class="label">${label}</td><td>${valor}</td></tr>`;

  return `
    <html><head><meta charset="utf-8"><style>
      body{font-family:Helvetica,Arial,sans-serif;color:#222;padding:12px;}
      h1{color:#3e2c61;font-size:20px;margin-bottom:4px;}
      .badge{display:inline-block;color:#fff;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:bold;background:${getStatusColor(at.status)};}
      table{width:100%;border-collapse:collapse;margin-top:12px;}
      td{border:1px solid #e5e7eb;padding:8px;font-size:12px;vertical-align:top;}
      td.label{background:#f2f2f2;font-weight:bold;width:32%;}
      .bloco{margin-top:14px;} .bloco h3{font-size:13px;margin:0 0 4px;color:#3e2c61;}
      .fotos{display:flex;flex-wrap:wrap;margin-top:8px;}
    </style></head><body>
      <h1>Atendimento — Chamado ${esc(at.numeroChamado)}</h1>
      <span class="badge">${esc(at.status)}</span>
      <table>
        ${linha('Terminal', esc(at.numeroLogicoTerminal))}
        ${linha('Data de Início', formatDateTime(at.dataInicio))}
        ${linha('Data de Fim', at.dataFim ? formatDateTime(at.dataFim) : 'Em aberto')}
        ${at.detalhePendencia ? linha('Pendência', esc(at.detalhePendencia)) : ''}
        ${linha('Localização', localizacao)}
      </table>
      <div class="bloco"><h3>Descrição do Problema</h3><div>${esc(at.solicitacao) || 'Não informado'}</div></div>
      <div class="bloco"><h3>Diagnóstico e Solução</h3><div>${esc(at.diagnosticoSolucao) || 'Não informado'}</div></div>
      <div class="bloco"><h3>Causa Real</h3><div>${esc(at.causaReal) || 'Não informado'}</div></div>
      ${fotosHtml ? `<div class="bloco"><h3>Fotos</h3><div class="fotos">${fotosHtml}</div></div>` : ''}
    </body></html>`;
};

/** Gera e compartilha o PDF de um único atendimento. */
export const exportAtendimentoPdf = async (at: Atendimento): Promise<void> => {
  const html = await buildHtml(at);
  const { uri: tempUri } = await Print.printToFileAsync({ html });
  const nome = `Atendimento_${at.numeroChamado || at.id}_${getFormattedDate()}.pdf`.replace(/[^\w.-]+/g, '_');
  const destino = FileSystem.documentDirectory + nome;
  await FileSystem.moveAsync({ from: tempUri, to: destino });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destino, { mimeType: 'application/pdf', dialogTitle: 'Exportar atendimento em PDF' });
  }
};
