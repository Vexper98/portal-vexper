import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

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

async function saveLog(base44, companyId, filename, message, level) {
  try {
    await base44.asServiceRole.entities.AgentLog.create({ companyId, filename, message, level });
  } catch { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") {
    return Response.json({ success: false, message: "Method not allowed" }, { status: 405, headers: CORS });
  }

  const base44 = createClientFromRequest(req);
  let companyId = null;
  let filename = null;

  try {
    // ── 1. Extract token from Authorization header ──────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    console.log("[DEBUG] Authorization header bruto:", authHeader.substring(0, 30));
    console.log("[DEBUG] Token recebido (mascarado):", mask(token));
    console.log("[DEBUG] Token length:", token.length);

    if (!token) {
      return Response.json(
        { success: false, message: "Header Authorization ausente ou inválido. Use: Authorization: Bearer SEU_TOKEN" },
        { status: 401, headers: CORS }
      );
    }

    // ── 2. Parse body ────────────────────────────────────────────────────────
    let xmlContent = null;
    let documentTypeHint = null;
    const contentType = req.headers.get("Content-Type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      companyId = formData.get("companyId");
      documentTypeHint = formData.get("documentType") || null;
      const fileField = formData.get("file");

      console.log("[DEBUG] companyId recebido (form):", companyId);
      console.log("[DEBUG] file presente:", !!fileField);

      if (!fileField || !companyId) {
        return Response.json(
          { success: false, message: `Campos ausentes: ${!fileField ? "file " : ""}${!companyId ? "companyId" : ""}`.trim() },
          { status: 400, headers: CORS }
        );
      }
      if (fileField.size > 10 * 1024 * 1024) {
        return Response.json({ success: false, message: "Arquivo muito grande. Máximo: 10MB" }, { status: 400, headers: CORS });
      }
      filename = fileField.name || "documento.xml";
      xmlContent = await fileField.text();

    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      companyId = body.companyId;
      filename = body.filename;
      xmlContent = body.xmlContent;
      documentTypeHint = body.documentType || null;

      console.log("[DEBUG] companyId recebido (json):", companyId);

      if (!companyId || !filename || !xmlContent) {
        return Response.json(
          { success: false, message: "Campos obrigatórios ausentes: companyId, filename, xmlContent" },
          { status: 400, headers: CORS }
        );
      }
    } else {
      return Response.json(
        { success: false, message: `Content-Type inválido: "${contentType}". Use multipart/form-data ou application/json` },
        { status: 415, headers: CORS }
      );
    }

    // ── 3. Validate token — Strategy A: SyncToken entity ────────────────────
    let company = null;
    let authStrategy = null;

    try {
      const allTokens = await base44.asServiceRole.entities.SyncToken.list("-created_date", 500);
      console.log("[DEBUG] Total SyncTokens no banco:", allTokens.length);

      const matchedSync = allTokens.find(t => t.token === token && t.status === "ativo");
      if (matchedSync) {
        console.log("[DEBUG] SyncToken encontrado | company_id esperado:", matchedSync.company_id);
        console.log("[DEBUG] companyId recebido:", companyId);

        if (matchedSync.company_id !== companyId) {
          console.log("[DEBUG] FALHA: companyId não bate com o token | esperado:", matchedSync.company_id, "| recebido:", companyId);
          await saveLog(base44, companyId, filename || "", `Auth falhou: companyId incorreto | esperado: ${matchedSync.company_id} | recebido: ${companyId}`, "error");
          return Response.json({
            success: false,
            message: `companyId incorreto. O token pertence à empresa ID: ${matchedSync.company_id}. Você enviou: ${companyId}`,
          }, { status: 401, headers: CORS });
        }

        // Update ultimo_uso
        await base44.asServiceRole.entities.SyncToken.update(matchedSync.id, { ultimo_uso: new Date().toISOString() });

        // Load company
        const companies = await base44.asServiceRole.entities.Company.list("-created_date", 500);
        company = companies.find(c => c.id === companyId) || null;
        authStrategy = "SyncToken";
        console.log("[DEBUG] Empresa encontrada via SyncToken:", company?.razao_social);
      } else {
        console.log("[DEBUG] Nenhum SyncToken ativo encontrado para este token");
      }
    } catch (syncErr) {
      console.log("[DEBUG] Erro ao buscar SyncToken:", syncErr.message);
    }

    // ── 4. Validate token — Strategy B: Company.agentToken ──────────────────
    if (!company) {
      try {
        const allCompanies = await base44.asServiceRole.entities.Company.list("-created_date", 500);
        console.log("[DEBUG] Total empresas no banco:", allCompanies.length);

        const matchedByToken = allCompanies.find(c => c.agentToken === token);
        if (matchedByToken) {
          console.log("[DEBUG] Empresa encontrada via agentToken | ID esperado:", matchedByToken.id, "| token esperado (mascarado):", mask(matchedByToken.agentToken));
          console.log("[DEBUG] companyId recebido:", companyId);

          if (matchedByToken.id !== companyId) {
            console.log("[DEBUG] FALHA: companyId não bate | esperado:", matchedByToken.id, "| recebido:", companyId);
            await saveLog(base44, companyId, filename || "", `Auth falhou: companyId incorreto | esperado: ${matchedByToken.id} | recebido: ${companyId}`, "error");
            return Response.json({
              success: false,
              message: `companyId incorreto. O token pertence à empresa ID: ${matchedByToken.id}. Você enviou: ${companyId}`,
            }, { status: 401, headers: CORS });
          }

          company = matchedByToken;
          authStrategy = "Company.agentToken";
          console.log("[DEBUG] Autenticado via Company.agentToken:", company.razao_social);
        } else {
          // Log all agentTokens (masked) for debugging
          const withTokens = allCompanies.filter(c => c.agentToken);
          console.log("[DEBUG] Empresas com agentToken:", withTokens.map(c => ({ id: c.id, token: mask(c.agentToken) })));
          console.log("[DEBUG] FALHA TOTAL: nenhuma empresa encontrada para o token fornecido");
        }
      } catch (compErr) {
        console.log("[DEBUG] Erro ao buscar empresas:", compErr.message);
      }
    }

    if (!company) {
      await saveLog(base44, companyId || "", filename || "", `Auth falhou: token inválido (mascarado: ${mask(token)})`, "error");
      return Response.json({
        success: false,
        message: "Token inválido: nenhuma empresa encontrada para este token. Verifique o token na tela Agente Sync > Configuração do Agente.",
      }, { status: 401, headers: CORS });
    }

    console.log("[DEBUG] Autenticação OK via:", authStrategy);

    // ── 5. Check company status ──────────────────────────────────────────────
    if (company.active === false || company.status === "inativa" || company.status === "suspensa") {
      await saveLog(base44, companyId, filename || "", "Upload bloqueado: empresa inativa ou suspensa", "warning");
      return Response.json(
        { success: false, message: "Empresa inativa. Entre em contato com o contador." },
        { status: 403, headers: CORS }
      );
    }

    // ── 6. Extract XML metadata ──────────────────────────────────────────────
    const documentType = detectType(xmlContent, documentTypeHint);
    const accessKey = extractAccessKey(xmlContent);
    const emitterCnpj = extractCnpj(xmlContent);

    // ── 7. Deduplication ────────────────────────────────────────────────────
    if (accessKey) {
      const allDocs = await base44.asServiceRole.entities.Document.filter({ companyId, accessKey });
      if (allDocs?.length > 0) {
        await saveLog(base44, companyId, filename, `Duplicado ignorado | Chave: ${accessKey}`, "warning");
        return Response.json({
          success: false,
          message: "Documento duplicado: já existe um registro com esta chave de acesso",
          documentId: allDocs[0].id,
          duplicate: true,
        }, { status: 409, headers: CORS });
      }
    } else {
      const contentHash = await sha256(xmlContent);
      const existing = await base44.asServiceRole.entities.Document.filter({ companyId, filename });
      if (existing?.length > 0 && existing.some(d => d.contentHash === contentHash)) {
        return Response.json({
          success: false,
          message: "Documento duplicado: mesmo arquivo já enviado anteriormente",
          duplicate: true,
        }, { status: 409, headers: CORS });
      }
    }

    // ── 8. Upload to storage ─────────────────────────────────────────────────
    const fileBlob = new Blob([xmlContent], { type: "text/xml" });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: fileBlob });
    const fileUrl = uploadResult.file_url;

    const now = new Date().toISOString();
    const contentHash = accessKey ? null : await sha256(xmlContent);

    const document = await base44.asServiceRole.entities.Document.create({
      companyId,
      filename,
      originalFilename: filename,
      documentType,
      xmlContent,
      fileUrl,
      accessKey: accessKey || null,
      emitterCnpj: emitterCnpj || null,
      contentHash: contentHash || null,
      status: "recebido",
      source: "agent",
      uploadedAt: now,
    });

    await base44.asServiceRole.entities.Company.update(companyId, { lastSyncAt: now, ultimo_envio: now });

    await saveLog(base44, companyId, filename,
      `Documento recebido | Tipo: ${documentType} | Chave: ${accessKey || "N/A"} | CNPJ: ${emitterCnpj || "N/A"}`,
      "info"
    );

    return Response.json({
      success: true,
      message: "Documento recebido com sucesso",
      documentId: document.id,
      documentType,
      accessKey,
    }, { headers: CORS });

  } catch (error) {
    console.log("[DEBUG] Erro não tratado:", error.message, error.stack);
    await saveLog(base44, companyId || "", filename || "unknown", `Erro interno: ${error.message}`, "error");
    return Response.json(
      { success: false, message: `Erro interno: ${error.message}` },
      { status: 500, headers: CORS }
    );
  }
});