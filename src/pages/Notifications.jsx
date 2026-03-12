import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const tipoConfig = {
  erro: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
  aviso: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-50" },
  sucesso: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const notifs = await base44.entities.Notification.list("-created_date", 100);
      setNotifications(notifs);
      setLoading(false);
    };
    load();
  }, []);

  const markAsRead = async (notif) => {
    await base44.entities.Notification.update(notif.id, { lida: true });
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, lida: true } : n));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.lida);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { lida: true })));
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
  };

  const unreadCount = notifications.filter(n => !n.lida).length;

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notificações</h1>
          <p className="text-sm text-slate-500 mt-1">{unreadCount} não lida(s)</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">Nenhuma notificação</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const config = tipoConfig[notif.tipo] || tipoConfig.info;
            const Icon = config.icon;
            return (
              <Card
                key={notif.id}
                className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${!notif.lida ? "ring-1 ring-blue-200 bg-blue-50/30" : ""}`}
                onClick={() => !notif.lida && markAsRead(notif)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`p-2 rounded-xl ${config.bg} shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${!notif.lida ? "text-slate-900" : "text-slate-600"}`}>{notif.titulo}</p>
                      {!notif.lida && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{notif.mensagem}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {notif.company_name && <Badge variant="outline" className="text-[10px]">{notif.company_name}</Badge>}
                      <span className="text-xs text-slate-400">
                        {notif.created_date && format(new Date(notif.created_date), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}