import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, CloudUpload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function DocumentUpload() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedCompany = urlParams.get("company_id");

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(preselectedCompany || "");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const comps = await base44.entities.Company.list("-created_date", 200);
      setCompanies(comps);
    };
    load();
  }, []);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selected]);
    setResults([]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const detectTipo = (fileName) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".pdf")) return "pdf_nota";
    if (lower.includes("nfce") || lower.includes("nfc-e")) return "nfce_xml";
    if (lower.includes("cte") || lower.includes("ct-e")) return "cte_xml";
    if (lower.includes("nfse") || lower.includes("nfs-e")) return "nfse_xml";
    if (lower.endsWith(".xml")) return "nfe_xml";
    return "outros";
  };

  const handleUpload = async () => {
    if (!selectedCompany || files.length === 0) return;
    setUploading(true);
    const company = companies.find(c => c.id === selectedCompany);
    const uploadResults = [];

    for (const file of files) {
      const result = { fileName: file.name, status: "uploading" };
      uploadResults.push(result);
      setResults([...uploadResults]);

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.FiscalDocument.create({
        company_id: selectedCompany,
        company_name: company?.nome_fantasia || company?.razao_social || "",
        company_cnpj: company?.cnpj || "",
        tipo_documento: detectTipo(file.name),
        nome_arquivo: file.name,
        file_url,
        status: "enviado",
        competencia: new Date().toISOString().slice(0, 7),
      });

      result.status = "success";
      setResults([...uploadResults]);
    }

    // Update ultimo_envio
    await base44.entities.Company.update(selectedCompany, { ultimo_envio: new Date().toISOString() });

    // Log activity
    await base44.entities.ActivityLog.create({
      company_id: selectedCompany,
      company_name: company?.nome_fantasia || company?.razao_social || "",
      tipo: "upload",
      descricao: `${files.length} arquivo(s) enviado(s) com sucesso`,
      status: "sucesso",
    });

    setUploading(false);
    setFiles([]);
  };

  const getFileIcon = (fileName) => {
    const tipo = detectTipo(fileName);
    const colors = {
      nfe_xml: "text-blue-500 bg-blue-50",
      nfce_xml: "text-violet-500 bg-violet-50",
      cte_xml: "text-cyan-500 bg-cyan-50",
      nfse_xml: "text-emerald-500 bg-emerald-50",
      pdf_nota: "text-red-500 bg-red-50",
      outros: "text-slate-500 bg-slate-50",
    };
    return colors[tipo] || colors.outros;
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Enviar Arquivos</h1>
        <p className="text-sm text-slate-500 mt-1">Faça o upload de documentos fiscais</p>
      </div>

      {/* Company Selection */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <Label className="text-sm font-semibold">Empresa *</Label>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social} — {c.cnpj}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Drop Zone */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div
            className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const droppedFiles = Array.from(e.dataTransfer.files); setFiles(prev => [...prev, ...droppedFiles]); }}
          >
            <CloudUpload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-700">Arraste e solte arquivos aqui</p>
            <p className="text-xs text-slate-400 mt-1">ou clique para selecionar</p>
            <p className="text-xs text-slate-400 mt-3">XML (NF-e, NFC-e, CT-e, NFS-e), PDF</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xml,.pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{files.length} arquivo(s) selecionado(s)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getFileIcon(file.name)}`}>
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
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><Upload className="w-4 h-4 mr-2" /> Enviar {files.length} arquivo(s)</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload Results */}
      {results.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Resultado do Envio</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                {r.status === "uploading" && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                {r.status === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {r.status === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
                <span className="text-sm text-slate-700">{r.fileName}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}