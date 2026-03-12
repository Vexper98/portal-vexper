import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

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

async function resolveCompany(base44, token, companyId) {
  // 1. Try SyncToken (preferred)
  const syncTokens = await base44.asServiceRole.entities.SyncToken.filter({ token, status: "ativo" });
  if (syncTokens?.length > 0) {
    const st = syncTokens[0];
    const resolvedId = companyId || st.company_id;
    if (resolvedId !== st.company_id) return null;
    await base44.asServiceRole.entities.SyncToken.update(st.id, { ultimo_uso: new Date().toISOString() });
    const comps = await base44.asServiceRole.entities.Company.filter({ id: resolvedId });
    return comps?.[0] || null;
  }
  // 2. Fallback: Company.agentToken
  const comps = await base44.asServiceRole.entities.Company.filter({ agentToken: token });
  if (!comps?.length) return null;
  const company = comps[0];
  if (companyId && company.id !== companyId) return null;
  return company;
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
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      return Response.json({ success: false, message: "Token de autorização obrigatório (Bearer)" }, { status: 401, headers: CORS });
    }

    // Parse body: multipart/form-data OR application/json
    let xmlContent = null;
    let documentTypeHint = null;

    const contentType = req.headers.get("Content-Type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      companyId = formData.get("companyId");
      documentTypeHint = formData.get("documentType") || null;
      const fileField = formData.get("file");

      if (!fileField || !companyId) {
        return Response.json({ success: false, message: "Campos obrigatórios ausentes: file, companyId" }, { status: 400, headers: CORS });
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

      if (!companyId || !filename || !xmlContent) {
        return Response.json({ success: false, message: "Campos obrigatórios ausentes: companyId, filename, xmlContent" }, { status: 400, headers: CORS });
      }
    } else {
      return Response.json({ success: false, message: "Content-Type deve ser multipart/form-data ou application/json" }, { status: 415, headers: CORS });
    }

    // Resolve and validate company
    const company = await resolveCompany(base44, token, companyId);
    if (!company) {
      await saveLog(base44, companyId || "", filename, "Token inválido ou empresa não encontrada", "error");
      return Response.json({ success: false, message: "Token inválido ou empresa não encontrada" }, { status: 401, headers: CORS });
    }
    companyId = company.id;

    if (company.active === false || company.status === "inativa" || company.status === "suspensa") {
      await saveLog(base44, companyId, filename, "Upload bloqueado: empresa inativa ou suspensa", "warning");
      return Response.json({ success: false, message: "Empresa inativa. Entre em contato com o contador." }, { status: 403, headers: CORS });
    }

    // Extract metadata
    const documentType = detectType(xmlContent, documentTypeHint);
    const accessKey = extractAccessKey(xmlContent);
    const emitterCnpj = extractCnpj(xmlContent);

    // Deduplication check
    if (accessKey) {
      const existing = await base44.asServiceRole.entities.Document.filter({ companyId, accessKey });
      if (existing?.length > 0) {
        await saveLog(base44, companyId, filename, `Documento duplicado ignorado | Chave: ${accessKey}`, "warning");
        return Response.json({
          success: false,
          message: "Documento duplicado: já existe um registro com esta chave de acesso",
          documentId: existing[0].id,
          duplicate: true,
        }, { status: 409, headers: CORS });
      }
    } else {
      const contentHash = await sha256(xmlContent);
      const existing = await base44.asServiceRole.entities.Document.filter({ companyId, filename });
      if (existing?.length > 0) {
        const dup = existing.find(d => d.contentHash === contentHash);
        if (dup) {
          await saveLog(base44, companyId, filename, "Documento duplicado ignorado (hash)", "warning");
          return Response.json({
            success: false,
            message: "Documento duplicado: mesmo arquivo já enviado anteriormente",
            documentId: dup.id,
            duplicate: true,
          }, { status: 409, headers: CORS });
        }
      }
    }

    // Upload to storage
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
    await saveLog(base44, companyId || "", filename || "unknown", `Erro interno: ${error.message}`, "error");
    return Response.json({ success: false, message: `Erro interno: ${error.message}` }, { status: 500, headers: CORS });
  }
});