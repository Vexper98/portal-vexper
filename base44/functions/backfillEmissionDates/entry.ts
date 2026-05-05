import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function extractEmissionDate(xmlContent) {
  const mDh = xmlContent.match(/<dhEmi>(\d{4}-\d{2}-\d{2})T/);
  if (mDh) {
    const date = mDh[1];
    return { dataEmissao: date, competencia: date.slice(0, 7) };
  }
  const mDe = xmlContent.match(/<dEmi>(\d{4}-\d{2}-\d{2})<\/dEmi>/);
  if (mDe) {
    const date = mDe[1];
    return { dataEmissao: date, competencia: date.slice(0, 7) };
  }
  const mDt = xmlContent.match(/<dtEmissao>(\d{4}-\d{2}-\d{2})/);
  if (mDt) {
    const date = mDt[1];
    return { dataEmissao: date, competencia: date.slice(0, 7) };
  }
  return { dataEmissao: null, competencia: null };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar documentos sem dataEmissao mas com xmlContent
    let page = 0;
    const pageSize = 100;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    while (true) {
      const docs = await base44.asServiceRole.entities.Document.list('-created_date', pageSize, page * pageSize);
      if (!docs || docs.length === 0) break;

      for (const doc of docs) {
        // Só processar docs sem dataEmissao que tenham xmlContent
        if (doc.dataEmissao || !doc.xmlContent) {
          skipped++;
          continue;
        }
        const { dataEmissao, competencia } = extractEmissionDate(doc.xmlContent);
        if (dataEmissao) {
          try {
            await base44.asServiceRole.entities.Document.update(doc.id, { dataEmissao, competencia });
            updated++;
          } catch (e) {
            errors++;
          }
        } else {
          skipped++;
        }
      }

      if (docs.length < pageSize) break;
      page++;
    }

    return Response.json({
      success: true,
      message: `Backfill concluído: ${updated} atualizados, ${skipped} ignorados, ${errors} erros`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});