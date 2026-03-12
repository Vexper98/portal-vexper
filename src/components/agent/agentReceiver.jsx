import { base44 } from "@/api/base44Client";

/**
 * receiveAgentDocument
 * Recebe um documento XML enviado pelo agente desktop e salva na tabela Document.
 *
 * @param {object} params
 * @param {string} params.companyId  - ID da empresa
 * @param {string} params.filename   - Nome do arquivo (ex: nfe-0001.xml)
 * @param {string} params.xmlContent - Conteúdo bruto do XML
 * @returns {Promise<{success: boolean, message: string, document?: object}>}
 */
export async function receiveAgentDocument({ companyId, filename, xmlContent }) {
  if (!companyId || !filename) {
    return { success: false, message: "companyId e filename são obrigatórios." };
  }

  const document = await base44.entities.Document.create({
    companyId,
    filename,
    xmlContent: xmlContent || "",
    status: "recebido",
    createdAt: new Date().toISOString(),
  });

  // Atualiza último envio da empresa
  await base44.entities.Company.update(companyId, {
    ultimo_envio: new Date().toISOString(),
  });

  // Log de atividade
  await base44.entities.ActivityLog.create({
    company_id: companyId,
    tipo: "upload",
    descricao: `XML recebido via agente: ${filename}`,
    status: "sucesso",
  });

  return {
    success: true,
    message: "XML recebido com sucesso",
    document,
  };
}