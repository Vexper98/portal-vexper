import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentIds } = await req.json();
    if (!documentIds || !Array.isArray(documentIds)) {
      return Response.json({ error: 'documentIds array required' }, { status: 400 });
    }

    // Fetch all documents with full content
    const allDocs = await base44.asServiceRole.entities.Document.list('-created_date', 20000);
    
    // Filter and map to include only requested IDs
    const docs = allDocs
      .filter(d => documentIds.includes(d.id))
      .map(d => ({
        id: d.id,
        filename: d.originalFilename || d.filename,
        xmlContent: d.xmlContent,
        companyId: d.companyId,
        documentType: d.documentType,
      }));

    return Response.json({ documents: docs });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});