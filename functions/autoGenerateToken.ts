import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function generateToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "pct_";
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const companyId = payload?.event?.entity_id || payload?.data?.id;
    const company = payload?.data;

    if (!companyId || !company) {
      return Response.json({ error: "Missing company data" }, { status: 400 });
    }

    // Check if token already exists for this company
    const existing = await base44.asServiceRole.entities.SyncToken.filter({
      company_id: companyId,
      status: "ativo",
    });

    if (existing.length > 0) {
      return Response.json({ message: "Token already exists", skipped: true });
    }

    const token = generateToken();

    // Create SyncToken
    await base44.asServiceRole.entities.SyncToken.create({
      company_id: companyId,
      company_name: company.nome_fantasia || company.razao_social || "",
      company_cnpj: company.cnpj || "",
      token,
      descricao: "Token gerado automaticamente",
      status: "ativo",
    });

    // Update company with agentToken
    await base44.asServiceRole.entities.Company.update(companyId, {
      agentToken: token,
      active: true,
    });

    return Response.json({ success: true, message: "Token generated", companyId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});