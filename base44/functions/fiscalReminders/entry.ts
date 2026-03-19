import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Calculate the date 2 days from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const targetDateStr = targetDate.toISOString().split('T')[0]; // yyyy-MM-dd

    // Fetch all schedules with data_limite = 2 days from now that are not concluded
    const schedules = await base44.asServiceRole.entities.FiscalSchedule.filter({
      data_limite: targetDateStr,
    });

    const pending = schedules.filter(s => s.status !== "concluido");

    let created = 0;
    for (const schedule of pending) {
      if (!schedule.contador_email) continue;

      // Check if notification already exists to avoid duplicates
      const existing = await base44.asServiceRole.entities.Notification.filter({
        destinatario: schedule.contador_email,
        company_id: schedule.company_id,
        titulo: `Lembrete: prazo fiscal em 2 dias - ${schedule.company_name || ""}`,
      });

      if (existing.length > 0) continue;

      await base44.asServiceRole.entities.Notification.create({
        titulo: `Lembrete: prazo fiscal em 2 dias - ${schedule.company_name || ""}`,
        mensagem: `O prazo fiscal de ${schedule.company_name || "empresa"} para a competência ${schedule.competencia} vence em 2 dias (${schedule.data_limite}). Tipo: ${schedule.tipo_fechamento || "mensal"}. ${schedule.observacoes ? "Obs: " + schedule.observacoes : ""}`,
        tipo: "aviso",
        destinatario: schedule.contador_email,
        company_id: schedule.company_id,
        company_name: schedule.company_name || "",
        lida: false,
        link: "/FiscalCalendar",
      });
      created++;
    }

    return Response.json({ success: true, reminders_created: created, checked: pending.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});