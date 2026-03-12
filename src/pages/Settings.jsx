import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, UserPlus, Settings as SettingsIcon, Download } from "lucide-react";
import DownloadAgentCard from "../components/sync/DownloadAgentCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const roleBadge = {
  admin: "bg-red-50 text-red-700 border-red-200",
  contador: "bg-blue-50 text-blue-700 border-blue-200",
  empresa: "bg-emerald-50 text-emerald-700 border-emerald-200",
  suporte: "bg-purple-50 text-purple-700 border-purple-200",
};

const roleLabel = { admin: "Administrador", contador: "Contador", empresa: "Empresa", suporte: "Suporte" };

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("empresa");
  const [inviting, setInviting] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setCurrentUser(me);
      if (me?.role === "admin") {
        const u = await base44.entities.User.list("-created_date", 100);
        setUsers(u);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, inviteRole === "admin" ? "admin" : "user");
    // After invite, we'd want to also update the role for the user once they accept
    toast.success(`Convite enviado para ${inviteEmail}`);
    setInviteEmail("");
    setInviting(false);
    setInviteOpen(false);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  if (currentUser?.role !== "admin") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
          <p className="text-sm text-slate-500 mt-1">Informações da sua conta</p>
        </div>
        <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-center">Apenas administradores podem gerenciar usuários e configurações do sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500 mt-1">Gerenciar usuários e permissões</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" /> Usuários</TabsTrigger>
          <TabsTrigger value="system"><SettingsIcon className="w-4 h-4 mr-2" /> Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Usuários do Sistema</CardTitle>
              <Button size="sm" onClick={() => setInviteOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-4 h-4 mr-2" /> Convidar Usuário
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Usuário</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">E-mail</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Perfil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id} className="border-slate-100">
                        <TableCell className="font-medium text-sm">{user.full_name || "—"}</TableCell>
                        <TableCell className="text-sm text-slate-600">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-semibold ${roleBadge[user.role] || ""}`}>
                            {roleLabel[user.role] || user.role}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Informações do Sistema</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-400 mb-1">Versão</p>
                  <p className="text-sm font-medium text-slate-700">1.0.0</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-400 mb-1">Tipos de Documento Suportados</p>
                  <p className="text-sm font-medium text-slate-700">NF-e, NFC-e, CT-e, NFS-e, PDF</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-700">Sobre o Agente de Sincronização</p>
                </div>
                <p className="text-xs text-blue-600 leading-relaxed">
                  O agente de sincronização automática é um módulo que pode ser instalado no ambiente do cliente para monitorar pastas e enviar automaticamente novos arquivos XML e PDF para o portal. 
                  Por enquanto, utilize o upload manual pela interface web. A integração com agente desktop será disponibilizada em versão futura.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="usuario@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="contador">Contador</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="suporte">Suporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail || inviting} className="bg-blue-600 hover:bg-blue-700">
              {inviting ? "Enviando..." : "Enviar Convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}