import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const endpointUrl = `${origin}/api/functions/receiveDocument`;

  return Response.json({
    success: true,
    endpoint: endpointUrl,
    method: "POST",
    contentType: "multipart/form-data",
    fields: ["file", "companyId opcional"],
    authHeader: "Authorization: Bearer SEU_TOKEN",
  }, { headers: CORS });
});
