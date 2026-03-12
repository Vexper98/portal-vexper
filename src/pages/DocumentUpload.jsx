import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, CloudUpload } from "lucide-react";

function detectType(fileName, xmlContent) {
  if (xmlContent) {
    if (xmlContent.includes("<mod>55</mod>")) return "NFe";
    if (xmlContent.includes("<mod>65</mod>")) return "NFCe";
  }
  const n = fileName.toLowerCase();
  if (n.includes("nfce") || n.includes("nfc-e")) return "NFCe";
  if (n.endsWith(".xml")) return "NFe";
  return "XML";
}

function extractAccessKey(xml) {
  const m = xml.match(/<chNFe>(\d{44})<\/chNFe>/) || xml.match(/\b(\d{44})\b/);
  return m ? m[1] : null;
}

function extractCnpj(xml) {
  const m = xml.match(/<CNPJ>(\d{14})<\/CNPJ>/);
  return m ? m[1] : null;
}

export default function DocumentUpload() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedCompany = urlParams.get("company_id");

  const [companies, setCompanies]       = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(preselectedCompany || "");
  const [files, setFiles]               = useState([]);
  const [uploading, setUploading]       = useState(false);
  const [results, setResults]           = useState([]);
  const fileInputRef                    = useRef(null);

  useEffect(() => {
    base44.entities.Company.list("-created_date", 200).then(setCompanies);
  }, []);

  const handleFileSelect = (e) => {
    setFiles(prev => [...prev, ...Array.from(e.target.files)]);
    setResults([]);
  };

  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const handleUpload = async () => {
    if (!selectedCompany || files.length === 0) return;
    setUploading(true);
    const company = companies.find(c => c.id === selectedCompany);
    const uploadResults = [];

    for (const file of files) {
      const entry = { fileName: file.name, status: "uploading" };
      uploadResults.push(entry);
      setResults([...uploadResults]);

      // Read XML content
      const xmlContent = await file.text();

      // Upload file to storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const docType    = detectType(file.name, xmlContent);
      const accessKey  = extractAccessKey(xmlContent);
      const emitterCnpj = extractCnpj(xmlContent);
      const now        = new Date().toISOString();

      await base44.entities.Document.create({
        companyId:        selectedCompany,
        filename:         file.name,
        originalFilename: file.name,
        documentType:     docType,
        xmlContent,
        fileUrl:          file_url,
        accessKey:        accessKey || null,
        emitterCnpj:      emitterCnpj || null,
        status:           "recebido",
        source:           "manual",
        uploadedAt:       now,
      });

      entry.status = "success";
      setResults([...uploadResults]);
    }

    await base44.entities.Company.update(selectedCompany, {
      ultimo_envio: new Date().toISOString(),
      lastSyncAt:   new Date().toISOString(),
    });

    await base44.entities.ActivityLog.create({
      company_id:   selectedCompany,
      company_name: company?.nome_fantasia || company?.razao_social || "",
      tipo:         "upload",
      descricao:    `${files.length} arquivo(s) enviado(s) manualmente`,
      status:       "sucesso",
    });

    setUploading(false);
    setFiles([]);
  };

  const iconColor = (fileName) => {
    const t = detectType(fileName, "");
    return t === "NFe" ? "text-blue-500 bg-blue-50" : t === "NFCe" ? "text-violet-500 bg-violet-50" : "text-slate-500 bg-slate-50";
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Enviar Arquivos</h1>
        <p className="text-sm text-slate-500 mt-1">Upload manual de documentos fiscais (NF-e, NFC-e, XML)</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <Label className="text-sm font-semibold">Empresa *</Label>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome_fantasia || c.razao_social} — {c.cnpj}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div
            className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
          >
            <CloudUpload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-700">Arraste e solte arquivos XML aqui</p>
            <p className="text-xs text-slate-400 mt-1">ou clique para selecionar</p>
            <p className="text-xs text-slate-400 mt-3">Aceito: .xml (NF-e, NFC-e)</p>
            <input ref={fileInputRef} type="file" multiple accept=".xml" className="hidden" onChange={handleFileSelect} />
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{files.length} arquivo(s) selecionado(s)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColor(file.name)}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(i)}>
                  <X className="w-4 h-4 text-slate-400" />
                </Button>
              </div>
            ))}
            <Button
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
              disabled={!selectedCompany || uploading}
              onClick={handleUpload}
            >
              {uploading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                : <><Upload className="w-4 h-4 mr-2" /> Enviar {files.length} arquivo(s)</>
              }
            </Button>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Resultado</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                {r.status === "uploading" && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                {r.status === "success"   && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {r.status === "error"     && <AlertCircle  className="w-5 h-5 text-red-500" />}
                <span className="text-sm text-slate-700">{r.fileName}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}