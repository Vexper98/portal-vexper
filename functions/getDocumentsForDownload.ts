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

    // Fetch all documents in parallel
    const results = await Promise.all(
      documentIds.map(id => base44.asServiceRole.entities.Document.get(id).catch(() => null))
    );

    const docs = results
      .filter(doc => doc !== null)
      .map(doc => ({
        id: doc.id,
        filename: doc.originalFilename || doc.filename,
        xmlContent: doc.xmlContent || null,
        fileUrl: doc.fileUrl || null,
        companyId: doc.companyId,
        documentType: doc.documentType,
      }));

    return Response.json({ documents: docs });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});