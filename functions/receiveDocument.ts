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
    // ── 1. Extract token ─────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    console.log("[DEBUG] Token recebido (mascarado):", mask(token));

    if (!token) {
      return Response.json(
        { success: false, message: "Header Authorization ausente. Use: Authorization: Bearer SEU_TOKEN" },
        { status: 401, headers: CORS }
      );
    }

    // ── 2. Resolve companyId from token ──────────────────────────────────────
    let company = null;

    // Strategy A: SyncToken
    const allTokens = await base44.asServiceRole.entities.SyncToken.list("-created_date", 500);
    const matchedSync = allTokens.find(t => t.token === token && t.status === "ativo");

    if (matchedSync) {
      companyId = matchedSync.company_id;
      console.log("[DEBUG] Token válido via SyncToken | companyId:", companyId);
      await base44.asServiceRole.entities.SyncToken.update(matchedSync.id, { ultimo_uso: new Date().toISOString() });
      const companies = await base44.asServiceRole.entities.Company.list("-created_date", 500);
      company = companies.find(c => c.id === companyId) || null;
    }

    // Strategy B: Company.agentToken
    if (!company) {
      const allCompanies = await base44.asServiceRole.entities.Company.list("-created_date", 500);
      const matchedByToken = allCompanies.find(c => c.agentToken === token);
      if (matchedByToken) {
        companyId = matchedByToken.id;
        company = matchedByToken;
        console.log("[DEBUG] Token válido via Company.agentToken | companyId:", companyId);
      }
    }

    if (!company) {
      console.log("[DEBUG] Token inválido:", mask(token));
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

    // ── 3. Parse body ────────────────────────────────────────────────────────
    let xmlContent = null;
    let documentTypeHint = null;
    const contentType = req.headers.get("Content-Type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      documentTypeHint = formData.get("documentType") || null;
      const fileField = formData.get("file");

      if (!fileField) {
        return Response.json({ success: false, message: "Campo 'file' ausente no form-data" }, { status: 400, headers: CORS });
      }
      if (fileField.size > 10 * 1024 * 1024) {
        return Response.json({ success: false, message: "Arquivo muito grande. Máximo: 10MB" }, { status: 400, headers: CORS });
      }
      filename = fileField.name || "documento.xml";
      xmlContent = await fileField.text();

    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      filename = body.filename;
      xmlContent = body.xmlContent;
      documentTypeHint = body.documentType || null;

      if (!filename || !xmlContent) {
        return Response.json(
          { success: false, message: "Campos obrigatórios ausentes: filename, xmlContent" },
          { status: 400, headers: CORS }
        );
      }
    } else {
      return Response.json(
        { success: false, message: `Content-Type inválido: "${contentType}". Use multipart/form-data ou application/json` },
        { status: 415, headers: CORS }
      );
    }

    // ── 4. Extract XML metadata ──────────────────────────────────────────────
    const documentType = detectType(xmlContent, documentTypeHint);
    const accessKey = extractAccessKey(xmlContent);
    const emitterCnpj = extractCnpj(xmlContent);

    // ── 5. Deduplication ─────────────────────────────────────────────────────
    if (accessKey) {
      const existing = await base44.asServiceRole.entities.Document.filter({ companyId, accessKey });
      if (existing?.length > 0) {
        await saveLog(base44, companyId, filename, `Duplicado ignorado | Chave: ${accessKey}`, "warning");
        return Response.json({
          success: false,
          message: "Documento duplicado: chave de acesso já registrada",
          documentId: existing[0].id,
          duplicate: true,
        }, { status: 409, headers: CORS });
      }
    } else {
      const contentHash = await sha256(xmlContent);
      const existing = await base44.asServiceRole.entities.Document.filter({ companyId, filename });
      if (existing?.length > 0 && existing.some(d => d.contentHash === contentHash)) {
        return Response.json({
          success: false,
          message: "Documento duplicado: mesmo arquivo já enviado",
          duplicate: true,
        }, { status: 409, headers: CORS });
      }
    }

    // ── 6. Save document ─────────────────────────────────────────────────────
    const contentHash = accessKey ? null : await sha256(xmlContent);
    const now = new Date().toISOString();

    console.log("[DEBUG] Criando registro em Document...");
    let document;
    try {
      document = await base44.asServiceRole.entities.Document.create({
        companyId,
        filename,
        originalFilename: filename,
        documentType,
        xmlContent,
        fileUrl: null,
        accessKey: accessKey || null,
        emitterCnpj: emitterCnpj || null,
        contentHash: contentHash || null,
        status: "recebido",
        source: "agent",
        uploadedAt: now,
      });
      console.log("[DEBUG] Document criado:", document.id);
    } catch (err) {
      console.log("[DEBUG] Erro ao criar Document:", err.message);
      return Response.json({ success: false, message: `Erro ao criar registro em Document: ${err.message}` }, { status: 500, headers: CORS });
    }

    try {
      await base44.asServiceRole.entities.Company.update(companyId, { lastSyncAt: now, ultimo_envio: now });
      console.log("[DEBUG] Company.lastSyncAt atualizado");
    } catch (err) {
      console.log("[DEBUG] Erro ao atualizar Company:", err.message);
      // não falhar por isso
    }

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
    console.log("[DEBUG] Erro:", error.message);
    await saveLog(base44, companyId || "", filename || "unknown", `Erro interno: ${error.message}`, "error");
    return Response.json(
      { success: false, message: `Erro interno: ${error.message}` },
      { status: 500, headers: CORS }
    );
  }
});