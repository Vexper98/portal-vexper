import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return Response.json({ success: false, message: "Method not allowed" }, { status: 405, headers: CORS });
  }

  const base44 = createClientFromRequest(req);
  let companyId = null;
  let filename = null;

  try {
    const formData = await req.formData();
    companyId = formData.get("companyId");
    const fileField = formData.get("file");

    if (!fileField || !companyId) {
      return Response.json(
        { success: false, message: "Campos obrigatórios ausentes: file, companyId" },
        { status: 400, headers: CORS }
      );
    }

    filename = fileField.name || "documento.xml";

    if (fileField.size > 10 * 1024 * 1024) {
      return Response.json(
        { success: false, message: "Arquivo muito grande. Máximo: 10MB" },
        { status: 400, headers: CORS }
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      await saveLog(base44, companyId, filename, "Autenticação falhou: nenhum token fornecido", "error");
      return Response.json(
        { success: false, message: "Token de autorização obrigatório (Bearer)" },
        { status: 401, headers: CORS }
      );
    }

    // Find company by agentToken
    const companies = await base44.asServiceRole.entities.Company.filter({ agentToken: token });
    if (!companies || companies.length === 0) {
      await saveLog(base44, companyId, filename, `Token inválido: nenhuma empresa encontrada para este token`, "error");
      return Response.json(
        { success: false, message: "Token inválido ou empresa não encontrada" },
        { status: 401, headers: CORS }
      );
    }

    const company = companies[0];

    if (company.id !== companyId) {
      await saveLog(base44, companyId, filename, "Token não pertence à empresa informada no companyId", "error");
      return Response.json(
        { success: false, message: "Token não corresponde à empresa informada" },
        { status: 401, headers: CORS }
      );
    }

    if (company.active === false || company.status === "inativa" || company.status === "suspensa") {
      await saveLog(base44, companyId, filename, "Upload bloqueado: empresa inativa ou suspensa", "warning");
      return Response.json(
        { success: false, message: "Empresa inativa. Entre em contato com o contador." },
        { status: 403, headers: CORS }
      );
    }

    const xmlContent = await fileField.text();

    // Detect document type from XML content
    let documentType = formData.get("documentType") || null;
    if (!documentType) {
      if (xmlContent.includes("<mod>55</mod>")) {
        documentType = "NFe";
      } else if (xmlContent.includes("<mod>65</mod>")) {
        documentType = "NFCe";
      } else {
        documentType = "XML";
      }
    }

    // Extract access key (44 digits)
    let accessKey = null;
    const chNFeMatch = xmlContent.match(/<chNFe>(\d{44})<\/chNFe>/);
    if (chNFeMatch) {
      accessKey = chNFeMatch[1];
    } else {
      const keyMatch = xmlContent.match(/\b(\d{44})\b/);
      if (keyMatch) accessKey = keyMatch[1];
    }

    // Extract emitter CNPJ (first occurrence)
    let emitterCnpj = null;
    const cnpjMatch = xmlContent.match(/<CNPJ>(\d{14})<\/CNPJ>/);
    if (cnpjMatch) emitterCnpj = cnpjMatch[1];

    // Upload file to storage
    const fileBlob = new Blob([xmlContent], { type: "text/xml" });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: fileBlob });
    const fileUrl = uploadResult.file_url;

    const now = new Date().toISOString();

    const document = await base44.asServiceRole.entities.Document.create({
      companyId,
      filename,
      originalFilename: filename,
      documentType,
      xmlContent,
      fileUrl,
      accessKey: accessKey || null,
      emitterCnpj: emitterCnpj || null,
      status: "recebido",
      source: "agent",
      uploadedAt: now,
    });

    await base44.asServiceRole.entities.Company.update(companyId, {
      lastSyncAt: now,
      ultimo_envio: now,
    });

    await saveLog(
      base44, companyId, filename,
      `Documento recebido com sucesso | Tipo: ${documentType} | Chave: ${accessKey || "N/A"} | CNPJ: ${emitterCnpj || "N/A"}`,
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
    return Response.json(
      { success: false, message: `Erro interno: ${error.message}` },
      { status: 500, headers: CORS }
    );
  }
});

async function saveLog(base44, companyId, filename, message, level) {
  try {
    await base44.asServiceRole.entities.AgentLog.create({ companyId, filename, message, level });
  } catch {
    // Silently ignore log failures
  }
}