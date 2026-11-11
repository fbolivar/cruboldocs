import "server-only"

import { createAdminClient } from "@/lib/supabase/server"

// Lecturas de la API pública. SIN sesión: cada consulta filtra EXPLÍCITAMENTE por `org` (el cliente
// de servicio no aplica RLS). Campos mínimos y SIN dato personal (p. ej. PQRS sin cliente).

type Page = { limit: number; offset: number }
const procName = (p: unknown) => (p && typeof p === "object" ? (p as { name: string | null }).name : null)

export async function readNonconformities(org: string, { limit, offset }: Page) {
  const { data } = await createAdminClient()
    .from("nonconformities")
    .select("code, status, severity, source, title, detected_at, process:processes(name)")
    .eq("organization_id", org)
    .order("code", { ascending: false })
    .range(offset, offset + limit - 1)
  return (data ?? []).map((n) => ({
    code: n.code, status: n.status, severity: n.severity, source: n.source,
    title: n.title, detectedAt: n.detected_at, process: procName(n.process),
  }))
}

export async function readIndicators(org: string, { limit, offset }: Page) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("indicators")
    .select("id, code, name, unit, target, status, process:processes(name)")
    .eq("organization_id", org)
    .order("code", { ascending: false })
    .range(offset, offset + limit - 1)
  const rows = data ?? []
  const ids = rows.map((r) => r.id)
  const last = new Map<string, { value: number; period: string; compliance: string }>()
  if (ids.length) {
    const { data: ms } = await admin
      .from("indicator_measurements")
      .select("indicator_id, period, value, compliance")
      .eq("organization_id", org)
      .in("indicator_id", ids)
      .order("period", { ascending: false })
    for (const m of ms ?? []) if (!last.has(m.indicator_id)) last.set(m.indicator_id, { value: Number(m.value), period: m.period, compliance: m.compliance })
  }
  return rows.map((r) => {
    const m = last.get(r.id)
    return {
      code: r.code, name: r.name, unit: r.unit, target: Number(r.target), status: r.status,
      process: procName(r.process),
      lastValue: m?.value ?? null, lastPeriod: m?.period ?? null, lastCompliance: m?.compliance ?? null,
    }
  })
}

export async function readRisks(org: string, { limit, offset }: Page) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("risks")
    .select("id, code, description, category, status, process:processes(name)")
    .eq("organization_id", org)
    .order("code", { ascending: false })
    .range(offset, offset + limit - 1)
  const rows = data ?? []
  const ids = rows.map((r) => r.id)
  const last = new Map<string, { level: string; score: number }>()
  if (ids.length) {
    const { data: as } = await admin
      .from("risk_assessments")
      .select("risk_id, level, score, assessed_at")
      .eq("organization_id", org)
      .in("risk_id", ids)
      .order("assessed_at", { ascending: false })
    for (const a of as ?? []) if (!last.has(a.risk_id)) last.set(a.risk_id, { level: a.level, score: Number(a.score) })
  }
  return rows.map((r) => {
    const a = last.get(r.id)
    return {
      code: r.code, description: r.description, category: r.category, status: r.status,
      process: procName(r.process), level: a?.level ?? null, score: a?.score ?? null,
    }
  })
}

export async function readAudits(org: string, { limit, offset }: Page) {
  const { data } = await createAdminClient()
    .from("audits")
    .select("code, title, status, planned_date, closed_at")
    .eq("organization_id", org)
    .order("code", { ascending: false })
    .range(offset, offset + limit - 1)
  return (data ?? []).map((a) => ({
    code: a.code, title: a.title, status: a.status, plannedDate: a.planned_date, closedDate: a.closed_at,
  }))
}

export async function readPqrs(org: string, { limit, offset }: Page) {
  // Sin dato personal: no se devuelve customer_name ni customer_contact.
  const { data } = await createAdminClient()
    .from("pqrs_cases")
    .select("code, type, channel, status, received_date, due_date, process:processes(name)")
    .eq("organization_id", org)
    .order("code", { ascending: false })
    .range(offset, offset + limit - 1)
  return (data ?? []).map((p) => ({
    code: p.code, type: p.type, channel: p.channel, status: p.status,
    receivedDate: p.received_date, dueDate: p.due_date, process: procName(p.process),
  }))
}
