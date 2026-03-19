import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") {
    return Response.json({ success: false, message: "Method not allowed" }, { status: 405, headers: CORS });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return Response.json({ success: false, message: "Token obrigatório" }, { status: 401, headers: CORS });
  }

  const base44 = createClientFromRequest(req);

  try {
    // Validate token against SyncToken or Company.agentToken
    let companyId = null;

    const syncTokens = await base44.asServiceRole.entities.SyncToken.filter({ token, status: "ativo" });
    if (syncTokens?.length > 0) {
      companyId = syncTokens[0].company_id;
      await base44.asServiceRole.entities.SyncToken.update(syncTokens[0].id, { ultimo_uso: new Date().toISOString() });
    } else {
      const companies = await base44.asServiceRole.entities.Company.filter({ agentToken: token });
      if (!companies?.length) {
        return Response.json({ success: false, message: "Token inválido" }, { status: 401, headers: CORS });
      }
      companyId = companies[0].id;
    }

    const body = await req.json();
    const { filename, level, message } = body;

    if (!message) {
      return Response.json({ success: false, message: "Campo obrigatório ausente: message" }, { status: 400, headers: CORS });
    }

    const validLevels = ["info", "warning", "error"];
    const logLevel = validLevels.includes(level) ? level : "info";

    await base44.asServiceRole.entities.AgentLog.create({
      companyId,
      filename: filename || "",
      message,
      level: logLevel,
    });

    return Response.json({ success: true, message: "Log registrado" }, { headers: CORS });
  } catch (error) {
    return Response.json({ success: false, message: `Erro: ${error.message}` }, { status: 500, headers: CORS });
  }
});