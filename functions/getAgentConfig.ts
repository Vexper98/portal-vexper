import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const appId = Deno.env.get("BASE44_APP_ID") || "";
  const endpointUrl = `https://api.base44.com/api/apps/${appId}/functions/receiveDocument`;

  return Response.json({
    success: true,
    endpoint: endpointUrl,
    method: "POST",
    contentType: "multipart/form-data",
    fields: ["companyId", "file"],
    authHeader: "Authorization: Bearer SEU_TOKEN",
  }, { headers: CORS });
});