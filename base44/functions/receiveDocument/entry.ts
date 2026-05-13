import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB por arquivo
const MAX_BATCH_SIZE = 200; // máximo de arquivos por lote

function mask(str) {
  if (!str || str.length < 8) return "***";
  return str.slice(0, 4) + "..." + str.slice(-4);
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function detectType(xmlContent, hint) {
  if (hint) return hint;
  if (xmlContent.includes("<mod>55</mod>")) return "NFe";
  if (xmlContent.includes("<mod>65</mod>")) return "NFCe";
  return "XML";
}

function extractAccessKey(xmlContent) {
  const m = xmlContent.match(/<chNFe>(\d{44})<\/chNFe>/);
  if (m) return m[1];
  const m2 = xmlContent.match(/\b(\d{44})\b/);
  return m2 ? m2[1] : null;
}

function extractCnpj(xmlContent) {
  const m = xmlContent.match(/<CNPJ>(\d{14})<\/CNPJ>/);
  return m ? m[1] : null;
}

// Extrai data de emissão do XML - cobre todos os padrões fiscais brasileiros
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

async function saveLog(base44, companyId, filename, message, level) {
  try {
    await base44.asServiceRole.entities.AgentLog.create({ companyId, filename, message, level });
  } catch { /* ignore */ }
}

// Resolve empresa a partir do token
async function resolveCompany(base44, token) {
  // Strategy A: SyncToken
  const allTokens = await base44.asServiceRole.entities.SyncToken.list("-created_date", 500);
  const matchedSync = allTokens.find(t => t.token === token && t.status === "ativo");

  if (matchedSync) {
    const companyId = matchedSync.company_id;
    // Atualizar último uso sem bloquear
    base44.asServiceRole.entities.SyncToken.update(matchedSync.id, { ultimo_uso: new Date().toISOString() }).catch(() => {});
    const companies = await base44.asServiceRole.entities.Company.list("-created_date", 500);
    const company = companies.find(c => c.id === companyId) || null;
    if (company) return { companyId, company };
  }

  // Strategy B: Company.agentToken
  const allCompanies = await base44.asServiceRole.entities.Company.list("-created_date", 500);
  const matchedByToken = allCompanies.find(c => c.agentToken === token);
  if (matchedByToken) {
    return { companyId: matchedByToken.id, company: matchedByToken };
  }

  return { companyId: null, company: null };
}

// Faz upload do XML como arquivo e retorna a URL
async function uploadXmlFile(base44, filename, xmlContent) {
  try {
    const blob = new Blob([xmlContent], { type: "application/xml" });
    const formData = new FormData();
    formData.append("file", blob, filename);
    const result = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
    return result?.file_url || null;
  } catch {
    return null;
  }
}

// Processa um único documento
async function processSingleDocument(base44, companyId, filename, xmlContent, documentTypeHint) {
  const documentType = detectType(xmlContent, documentTypeHint);
  const accessKey = extractAccessKey(xmlContent);
  const emitterCnpj = extractCnpj(xmlContent);
  const { dataEmissao, competencia } = extractEmissionDate(xmlContent);

  // Deduplicação
  if (accessKey) {
    const existing = await base44.asServiceRole.entities.Document.filter({ companyId, accessKey });
    if (existing?.length > 0) {
      await saveLog(base44, companyId, filename, `Duplicado ignorado | Chave: ${accessKey}`, "warning");
      return { success: false, filename, message: "Documento duplicado: chave de acesso já registrada", documentId: existing[0].id, duplicate: true };
    }
  } else {
    const contentHash = await sha256(xmlContent);
    const existing = await base44.asServiceRole.entities.Document.filter({ companyId, filename });
    if (existing?.length > 0 && existing.some(d => d.contentHash === contentHash)) {
      return { success: false, filename, message: "Documento duplicado: mesmo arquivo já enviado", duplicate: true };
    }
  }

  const contentHash = accessKey ? null : await sha256(xmlContent);
  const now = new Date().toISOString();

  // Decide se salva xmlContent inline ou faz upload como arquivo
  const XML_INLINE_LIMIT = 200 * 1024; // 200KB inline, acima disso faz upload
  let xmlContentToSave = null;
  let fileUrl = null;

  if (xmlContent.length <= XML_INLINE_LIMIT) {
    xmlContentToSave = xmlContent;
  } else {
    fileUrl = await uploadXmlFile(base44, filename, xmlContent);
    // Se upload falhar, tenta salvar inline mesmo assim
    if (!fileUrl) xmlContentToSave = xmlContent;
  }

  const document = await base44.asServiceRole.entities.Document.create({
    companyId,
    filename,
    originalFilename: filename,
    documentType,
    xmlContent: xmlContentToSave,
    fileUrl: fileUrl || null,
    accessKey: accessKey || null,
    emitterCnpj: emitterCnpj || null,
    contentHash: contentHash || null,
    dataEmissao: dataEmissao || null,
    competencia: competencia || null,
    status: "recebido",
    source: "agent",
    uploadedAt: now,
  });

  await saveLog(base44, companyId, filename,
    `Documento recebido | Tipo: ${documentType} | Chave: ${accessKey || "N/A"} | CNPJ: ${emitterCnpj || "N/A"} | Emissão: ${dataEmissao || "N/A"} | Competência: ${competencia || "N/A"}`,
    "info"
  );

  return { success: true, filename, documentId: document.id, documentType, accessKey, dataEmissao, competencia };
}

// Processa batch em paralelo com concorrência limitada
async function processInParallel(tasks, concurrency) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") {
    return Response.json({ success: false, message: "Method not allowed" }, { status: 405, headers: CORS });
  }

  const base44 = createClientFromRequest(req);
  let companyId = null;

  try {
    // ── 1. Extract token ────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      return Response.json(
        { success: false, message: "Header Authorization ausente. Use: Authorization: Bearer SEU_TOKEN" },
        { status: 401, headers: CORS }
      );
    }

    // ── 2. Resolve company ──────────────────────────────────
    const { companyId: cId, company } = await resolveCompany(base44, token);
    companyId = cId;

    if (!company) {
      return Response.json(
        { success: false, message: "Token inválido. Verifique o token em Agente Sync > Configuração do Agente." },
        { status: 401, headers: CORS }
      );
    }

    if (company.active === false || company.status === "inativa" || company.status === "suspensa") {
      return Response.json(
        { success: false, message: "Empresa inativa. Entre em contato com o contador." },
        { status: 403, headers: CORS }
      );
    }

    // ── 3. Parse body ───────────────────────────────────────
    const contentType = req.headers.get("Content-Type") || "";
    let filesToProcess = []; // Array de { filename, xmlContent, documentTypeHint }

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const documentTypeHint = formData.get("documentType") || null;

      // Suporta campo "file" único OU múltiplos campos "files" / "file_0", "file_1", etc.
      const singleFile = formData.get("file");

      if (singleFile && singleFile.name) {
        // Modo arquivo único
        if (singleFile.size > MAX_FILE_SIZE) {
          return Response.json({ success: false, message: `Arquivo muito grande (${(singleFile.size / 1024 / 1024).toFixed(1)}MB). Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400, headers: CORS });
        }
        const text = await singleFile.text();
        filesToProcess.push({ filename: singleFile.name || "documento.xml", xmlContent: text, documentTypeHint });
      }

      // Múltiplos arquivos via campo "files" (array)
      const multiFiles = formData.getAll("files");
      for (const f of multiFiles) {
        if (f && f.name) {
          if (f.size > MAX_FILE_SIZE) {
            console.log(`[SKIP] Arquivo ${f.name} muito grande: ${(f.size / 1024 / 1024).toFixed(1)}MB`);
            continue;
          }
          const text = await f.text();
          filesToProcess.push({ filename: f.name, xmlContent: text, documentTypeHint });
        }
      }

      // Suporte a campos numerados: file_0, file_1, file_2...
      for (let i = 0; i < 500; i++) {
        const f = formData.get(`file_${i}`);
        if (!f || !f.name) break;
        if (f.size > MAX_FILE_SIZE) {
          console.log(`[SKIP] Arquivo ${f.name} muito grande: ${(f.size / 1024 / 1024).toFixed(1)}MB`);
          continue;
        }
        const text = await f.text();
        filesToProcess.push({ filename: f.name, xmlContent: text, documentTypeHint });
      }

      if (filesToProcess.length === 0) {
        return Response.json({ success: false, message: "Nenhum arquivo encontrado no form-data. Use campo 'file', 'files' ou 'file_0', 'file_1'..." }, { status: 400, headers: CORS });
      }

    } else if (contentType.includes("application/json")) {
      const body = await req.json();

      // Modo batch: { documents: [{ filename, xmlContent, documentType? }, ...] }
      if (body.documents && Array.isArray(body.documents)) {
        for (const doc of body.documents) {
          if (!doc.filename || !doc.xmlContent) continue;
          filesToProcess.push({
            filename: doc.filename,
            xmlContent: doc.xmlContent,
            documentTypeHint: doc.documentType || null,
          });
        }
      }
      // Modo single: { filename, xmlContent }
      else if (body.filename && body.xmlContent) {
        filesToProcess.push({
          filename: body.filename,
          xmlContent: body.xmlContent,
          documentTypeHint: body.documentType || null,
        });
      }

      if (filesToProcess.length === 0) {
        return Response.json(
          { success: false, message: "Campos obrigatórios ausentes. Use { filename, xmlContent } ou { documents: [{ filename, xmlContent }] }" },
          { status: 400, headers: CORS }
        );
      }
    } else {
      return Response.json(
        { success: false, message: `Content-Type inválido: "${contentType}". Use multipart/form-data ou application/json` },
        { status: 415, headers: CORS }
      );
    }

    // Limitar batch
    if (filesToProcess.length > MAX_BATCH_SIZE) {
      filesToProcess = filesToProcess.slice(0, MAX_BATCH_SIZE);
      console.log(`[WARN] Batch limitado a ${MAX_BATCH_SIZE} arquivos`);
    }

    console.log(`[INFO] Processando ${filesToProcess.length} arquivo(s) para empresa ${companyId}`);

    // ── 4. Processar em paralelo (5 simultâneos) ────────────
    const tasks = filesToProcess.map((f) => async () => {
      try {
        return await processSingleDocument(base44, companyId, f.filename, f.xmlContent, f.documentTypeHint);
      } catch (err) {
        console.log(`[ERROR] Erro processando ${f.filename}: ${err.message}`);
        await saveLog(base44, companyId, f.filename, `Erro: ${err.message}`, "error");
        return { success: false, filename: f.filename, message: err.message, error: true };
      }
    });

    const results = await processInParallel(tasks, 5);

    // ── 5. Atualizar timestamp da empresa ───────────────────
    const now = new Date().toISOString();
    base44.asServiceRole.entities.Company.update(companyId, { lastSyncAt: now, ultimo_envio: now }).catch(() => {});

    const successCount = results.filter(r => r.success).length;
    const duplicateCount = results.filter(r => r.duplicate).length;
    const errorCount = results.filter(r => !r.success && !r.duplicate).length;

    console.log(`[INFO] Resultado: ${successCount} OK, ${duplicateCount} duplicados, ${errorCount} erros`);

    // Se era um único arquivo, responde no formato antigo para compatibilidade
    if (filesToProcess.length === 1) {
      const r = results[0];
      const status = r.success ? 200 : (r.duplicate ? 409 : 500);
      return Response.json({ ...r }, { status, headers: CORS });
    }

    // Resposta batch
    return Response.json({
      success: true,
      message: `Lote processado: ${successCount} recebidos, ${duplicateCount} duplicados, ${errorCount} erros`,
      total: filesToProcess.length,
      successCount,
      duplicateCount,
      errorCount,
      results,
    }, { headers: CORS });

  } catch (error) {
    console.log("[ERROR]", error.message);
    await saveLog(base44, companyId || "", "batch", `Erro interno: ${error.message}`, "error");
    return Response.json(
      { success: false, message: `Erro interno: ${error.message}` },
      { status: 500, headers: CORS }
    );
  }
});