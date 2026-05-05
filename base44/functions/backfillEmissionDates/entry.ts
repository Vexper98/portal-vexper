import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Parser robusto - cobre todos os padrões fiscais brasileiros
function extractEmissionDate(xmlContent) {
  if (!xmlContent) return { dataEmissao: null, competencia: null };

  // 1. <dhEmi>2024-03-15T10:30:00-03:00</dhEmi>  (NFe/NFCe padrão atual)
  const mDh = xmlContent.match(/<dhEmi>\s*(\d{4}-\d{2}-\d{2})T/);
  if (mDh) {
    const date = mDh[1];
    return { dataEmissao: date, competencia: date.slice(0, 7) };
  }
  // 2. <dEmi>2024-03-15</dEmi>  (NFe layout antigo)
  const mDe = xmlContent.match(/<dEmi>\s*(\d{4}-\d{2}-\d{2})\s*<\/dEmi>/);
  if (mDe) {
    const date = mDe[1];
    return { dataEmissao: date, competencia: date.slice(0, 7) };
  }
  // 3. <dtEmissao>2024-03-15</dtEmissao>  (CTe / NFSe)
  const mDt = xmlContent.match(/<dtEmissao>\s*(\d{4}-\d{2}-\d{2})/);
  if (mDt) {
    const date = mDt[1];
    return { dataEmissao: date, competencia: date.slice(0, 7) };
  }
  // 4. <DataEmissao>2024-03-15</DataEmissao>  (NFSe variação)
  const mDe2 = xmlContent.match(/<DataEmissao>\s*(\d{4}-\d{2}-\d{2})/i);
  if (mDe2) {
    const date = mDe2[1];
    return { dataEmissao: date, competencia: date.slice(0, 7) };
  }
  // 5. <DataEmissaoRPS>2024-03-15</DataEmissaoRPS>  (NFSe RPS)
  const mRps = xmlContent.match(/<DataEmissaoRPS>\s*(\d{4}-\d{2}-\d{2})/i);
  if (mRps) {
    const date = mRps[1];
    return { dataEmissao: date, competencia: date.slice(0, 7) };
  }
  // 6. Fallback: chave de acesso 44 dígitos (posições 2-5 = AAMM)
  const chave = xmlContent.match(/\b(\d{44})\b/);
  if (chave) {
    const k = chave[1];
    const ano = "20" + k.slice(2, 4);
    const mes = k.slice(4, 6);
    const mesNum = parseInt(mes, 10);
    if (mesNum >= 1 && mesNum <= 12) {
      return { dataEmissao: `${ano}-${mes}-01`, competencia: `${ano}-${mes}` };
    }
  }
  return { dataEmissao: null, competencia: null };
}

async function fetchXmlFromUrl(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes("<") && text.includes(">")) return text;
    return null;
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Pega um lote de até 20 docs sem dataEmissao para processar por chamada
    // (para não estourar timeout nem rate limit)
    const BATCH = 20;
    const docs = await base44.asServiceRole.entities.Document.list('-created_date', 200);

    const pending = docs.filter(d => !d.dataEmissao || !d.competencia);

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let fetchedFromUrl = 0;

    const toProcess = pending.slice(0, BATCH);

    for (const doc of toProcess) {
      let xmlContent = doc.xmlContent || null;

      if (!xmlContent && doc.fileUrl) {
        xmlContent = await fetchXmlFromUrl(doc.fileUrl);
        if (xmlContent) fetchedFromUrl++;
      }

      if (!xmlContent) {
        skipped++;
        continue;
      }

      const { dataEmissao, competencia } = extractEmissionDate(xmlContent);

      if (dataEmissao) {
        try {
          const payload = {};
          if (!doc.dataEmissao) payload.dataEmissao = dataEmissao;
          if (!doc.competencia) payload.competencia = competencia;
          await base44.asServiceRole.entities.Document.update(doc.id, payload);
          updated++;
          await sleep(600); // respeita rate limit
        } catch {
          errors++;
          await sleep(600);
        }
      } else {
        skipped++;
      }
    }

    const remaining = pending.length - toProcess.length;

    return Response.json({
      success: true,
      message: `Lote processado: ${updated} atualizados${fetchedFromUrl ? ` (${fetchedFromUrl} via URL)` : ""}, ${skipped} sem dados, ${errors} erros. Restam ~${remaining} documentos pendentes.`,
      updated,
      skipped,
      errors,
      remaining,
      hasMore: remaining > 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});