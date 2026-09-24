// Pruebas de RLS y del flujo con 2 organizaciones (base de las pruebas de la fase testing).
import { as, freshDb } from "./harness.mjs"

const db = await freshDb()
let pass = 0, fail = 0
const ok = (cond, name) => { cond ? pass++ : fail++; console.log(`${cond ? "✓" : "✗"} ${name}`) }
async function throws(fn, name, match) {
  try { await fn(); ok(false, `${name} (no falló)`) }
  catch (e) { ok(!match || e.message.includes(match), `${name} → ${e.message.split("\n")[0]}`) }
}
const svc = async (sql, p = []) => {
  await db.exec("set role service_role; select set_config('request.jwt.claim.sub', '', false);")
  try { return await db.query(sql, p) } finally { await db.exec("reset role;") }
}

// ---------- Seed: 2 organizaciones ----------
const U = Object.fromEntries(["laura", "juan", "carlos", "diana", "oscar", "sofia", "pedro", "beto", "crubol"]
  .map((n, i) => [n, `00000000-0000-0000-0000-00000000000${i + 1}`]))
const A = "aaaaaaaa-0000-0000-0000-000000000001", B = "bbbbbbbb-0000-0000-0000-000000000001"
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values
  ${Object.entries(U).map(([n, id]) => `('${id}', '${n}@x.co', '{"full_name":"${n}"}')`).join(",")};
  insert into public.platform_admins values ('${U.crubol}');
  insert into public.organizations (id, name, nit) values ('${A}', 'Acme', '900123456-7'), ('${B}', 'Valle', '890456789-1');
`)
// UUIDs válidos para catálogos
const id = (p, n) => `${p}000000-0000-0000-0000-${String(n).padStart(12, "0")}`
const P = { sigA: id("a1", 1), tiA: id("a1", 2), sigB: id("b1", 1) }
const POS = { calidad: id("a2", 1), lider: id("a2", 2), gerente: id("a2", 3), ti: id("a2", 4), jefe: id("a2", 5), analista: id("a2", 6), betoB: id("b2", 1), otroB: id("b2", 2), tercB: id("b2", 3) }
await db.exec(`
  insert into public.processes (id, organization_id, code, name, type) values
    ('${P.sigA}', '${A}', 'GC', 'Gestión SIG', 'estrategico'), ('${P.tiA}', '${A}', 'TI', 'TI', 'apoyo'),
    ('${P.sigB}', '${B}', 'GC', 'Gestión', 'estrategico');
  insert into public.positions (id, organization_id, name) values
    ('${POS.calidad}', '${A}', 'Coordinador de Calidad'), ('${POS.lider}', '${A}', 'Líder SIG'),
    ('${POS.gerente}', '${A}', 'Gerente General'), ('${POS.ti}', '${A}', 'Coordinador de TI'),
    ('${POS.jefe}', '${A}', 'Jefe administrativo'), ('${POS.analista}', '${A}', 'Analista'),
    ('${POS.betoB}', '${B}', 'Director'), ('${POS.otroB}', '${B}', 'Revisor B'), ('${POS.tercB}', '${B}', 'Aprobador B');
  insert into public.position_roles (organization_id, position_id, role, process_id) values
    ('${A}', '${POS.calidad}', 'elaborador', null), ('${A}', '${POS.calidad}', 'lider_proceso', '${P.sigA}'),
    ('${A}', '${POS.lider}', 'lider_sig', null), ('${A}', '${POS.lider}', 'revisor', null),
    ('${A}', '${POS.gerente}', 'aprobador', null),
    ('${A}', '${POS.ti}', 'responsable_control', '${P.tiA}'),
    ('${A}', '${POS.analista}', 'consulta', null),
    ('${B}', '${POS.betoB}', 'lider_sig', null), ('${B}', '${POS.betoB}', 'elaborador', null);
  insert into public.memberships (organization_id, user_id, position_id, is_org_admin, is_external, valid_from, valid_until) values
    ('${A}', '${U.laura}', '${POS.calidad}', true, false, current_date - 100, null),
    ('${A}', '${U.juan}', '${POS.lider}', false, false, current_date - 100, null),
    ('${A}', '${U.carlos}', '${POS.gerente}', false, false, current_date - 100, null),
    ('${A}', '${U.diana}', '${POS.ti}', false, false, current_date - 100, null),
    ('${A}', '${U.oscar}', '${POS.jefe}', true, false, current_date - 100, null),
    ('${A}', '${U.sofia}', '${POS.analista}', false, false, current_date - 100, null),
    ('${A}', '${U.pedro}', '${POS.analista}', false, true, current_date - 200, current_date - 1),
    ('${B}', '${U.beto}', '${POS.betoB}', true, false, current_date - 100, null);
  insert into public.document_types (id, organization_id, code, name) values
    ('${id("a3", 1)}', '${A}', 'PR', 'Procedimiento'), ('${id("b3", 1)}', '${B}', 'PR', 'Procedimiento');
`)

// ---------- Aislamiento entre organizaciones ----------
const DOC = id("a4", 1)
const ver = (await as(db, U.laura, `select public.create_document($1, $2, $3, $4, 'PR-GC-001', 'Control de documentos',
  $5, $6, $7, array[$8, $5]::uuid[], true, 12, 'Creación')`,
  [DOC, A, P.sigA, id("a3", 1), POS.calidad, POS.lider, POS.gerente, POS.analista])).rows[0].create_document
ok(!!ver, "Laura (elaborador A) registra un documento")

for (const [t, name] of [["documents", "documentos"], ["processes", "procesos"], ["positions", "cargos"], ["memberships", "membresías"], ["document_versions", "versiones"], ["audit_log", "auditoría"]]) {
  const r = await as(db, U.beto, `select count(*)::int n from public.${t} where organization_id = '${A}'`)
  ok(r.rows[0].n === 0, `Beto (org B) no ve ${name} de A`)
}
const bSees = await as(db, U.laura, `select count(*)::int n from public.processes where organization_id = '${B}'`)
ok(bSees.rows[0].n === 0, "Laura (org A) no ve procesos de B")
await throws(() => as(db, U.beto, `insert into public.processes (organization_id, code, name, type) values ('${A}', 'XX', 'Intruso', 'apoyo')`), "Beto no puede crear procesos en A", "row-level security")
await throws(() => as(db, U.beto, `select public.submit_version('${ver}')`), "Beto no puede enviar a revisión una versión de A")
await throws(() => as(db, U.beto, `select public.create_document(gen_random_uuid(), '${A}', '${P.sigA}', '${id("a3", 1)}', 'PR-GC-099', 'Intruso', '${POS.calidad}', '${POS.lider}', '${POS.gerente}', '{}', true, 12, '')`), "Beto no puede registrar documentos en A", "no puede registrar")
const upd = await as(db, U.beto, `update public.organizations set name = 'hackeada' where id = '${A}' returning id`)
ok(upd.rows.length === 0, "Beto no puede renombrar la organización A")
const pedro = await as(db, U.pedro, `select count(*)::int n from public.processes`)
ok(pedro.rows[0].n === 0, "Pedro (externo vencido) no ve nada de A")
await throws(() => as(db, U.laura, `update public.profiles set email = 'x@y.co' where id = '${U.laura}'`), "Un usuario no puede cambiar su email en profiles", "permission denied")

// ---------- Flujo del documento ----------
await throws(() => as(db, U.laura, `select public.submit_version('${ver}')`), "No se envía sin archivos", "Adjunta el PDF")
const sha = "a".repeat(64)
await as(db, U.laura, `select public.set_version_files('${ver}', '${A}/${DOC}/${ver}/doc.pdf', '${sha}', 1000, '${A}/${DOC}/${ver}/doc.docx', '${"b".repeat(64)}', 'doc.docx', 2000)`)
await as(db, U.laura, `select public.submit_version('${ver}')`)
const juanTasks = await as(db, U.juan, `select type from public.tasks where status = 'pendiente'`)
ok(juanTasks.rows.some((r) => r.type === "revisar"), "Juan (revisor) recibe la tarea 'revisar'")
const lauraTasks = await as(db, U.laura, `select count(*)::int n from public.tasks`)
ok(lauraTasks.rows[0].n === 0, "Laura no ve tareas de otro cargo")
const sofiaDraft = await as(db, U.sofia, `select count(*)::int n from public.documents where id = '${DOC}'`)
ok(sofiaDraft.rows[0].n === 0, "Sofía (consulta) no ve un documento sin versión vigente")
await as(db, U.juan, `select public.add_comment('${ver}', 'Falta la tabla de responsables')`)
const oscarDoc = await as(db, U.oscar, `select count(*)::int n from public.documents where id = '${DOC}'`)
const oscarCom = await as(db, U.oscar, `select count(*)::int n from public.review_comments`)
ok(oscarDoc.rows[0].n === 1 && oscarCom.rows[0].n === 0, "Óscar (admin sin rol) ve metadatos pero no comentarios")
ok((await as(db, U.oscar, `select public.storage_can_read_document('${A}/${DOC}/${ver}/doc.pdf') ok`)).rows[0].ok === false, "Óscar no puede leer el PDF en Storage")
await throws(() => as(db, U.juan, `select public.sign_version('${ver}', '${U.juan}', 'revision', 'Revisé', '1.1.1.1', 'x')`), "Un cliente no puede invocar sign_version (solo servidor)", "permission denied")
await throws(() => svc(`select public.sign_version('${ver}', '${U.carlos}', 'revision', 'Revisé', '1.1.1.1', 'x')`), "Carlos no puede firmar la revisión (no es revisor)", "No te corresponde")
await svc(`select public.sign_version('${ver}', '${U.juan}', 'revision', 'Revisé', '1.1.1.1', 'x')`)
ok((await as(db, U.carlos, `select count(*)::int n from public.tasks where type = 'aprobar' and status = 'pendiente'`)).rows[0].n === 1, "Carlos (aprobador) recibe la tarea 'aprobar'")
await svc(`select public.sign_version('${ver}', '${U.carlos}', 'aprobacion', 'Apruebo', '1.1.1.2', 'x')`)
const doc = (await as(db, U.laura, `select status, current_version_id, next_review_date from public.documents where id = '${DOC}'`)).rows[0]
ok(doc.status === "vigente" && doc.current_version_id === ver && doc.next_review_date, "El documento queda vigente con próxima revisión")
ok((await as(db, U.sofia, `select count(*)::int n from public.tasks where type = 'confirmar_lectura'`)).rows[0].n === 1, "Sofía (distribución) recibe 'confirmar lectura'")
ok((await as(db, U.sofia, `select public.storage_can_read_document('${A}/${DOC}/${ver}/doc.pdf') ok`)).rows[0].ok === true, "Sofía ya puede leer el PDF vigente")
await as(db, U.sofia, `select public.confirm_read('${ver}')`)
ok((await as(db, U.sofia, `select count(*)::int n from public.tasks where type = 'confirmar_lectura' and status = 'pendiente'`)).rows[0].n === 0, "La tarea se cierra al confirmar la lectura")
await throws(() => svc(`update public.document_versions set change_summary = 'alterado' where id = '${ver}'`), "Una versión aprobada es inmutable", "inmutable")
await throws(() => svc(`delete from public.audit_log`), "La auditoría no se puede borrar", "inmutable")
await throws(() => svc(`insert into public.signatures (organization_id, version_id, signer_id, action, meaning, file_sha256, reauth_at, signature_hash)
  values ('${A}', '${ver}', '${U.laura}', 'revision', 'x', '${sha}', now(), 'h')`), "El elaborador no puede firmar su propio documento (trigger)")
const audit = await as(db, U.oscar, `select action from public.audit_log order by at`)
ok(audit.rows.length >= 5, `El auditor/admin ve la traza (${audit.rows.map((r) => r.action).join(", ")})`)
await throws(() => as(db, U.laura, `insert into public.tasks (organization_id, type, assignee_position_id, entity_type, entity_id, title, due_date)
  values ('${A}', 'revisar', '${POS.calidad}', 'version', '${ver}', 'x', now())`), "Un usuario no puede crear tareas a mano", "row-level security")

// Solicitud de actualización → versión 2
const cr = (await as(db, U.sofia, `select public.request_update('${DOC}', 'Cambió la norma de retención de registros') id`)).rows[0].id
const v2 = (await as(db, U.laura, `select public.resolve_change_request('${cr}', true, null) id`)).rows[0].id
ok(!!v2, "Laura acepta la solicitud y se crea la versión 2 en borrador")
ok((await as(db, U.sofia, `select count(*)::int n from public.document_versions where id = '${v2}'`)).rows[0].n === 0, "Sofía no ve la versión 2 en borrador")

// ---------- Riesgos ----------
const risk = (await as(db, U.juan, `select * from public.create_risk('${A}', '${P.tiA}', 'Pérdida de información', 'Sin pruebas', 'Interrupción', 'Seguridad', '${POS.ti}', 4, 5,
  '[{"description":"Prueba mensual de restauración","type":"detectivo","frequency":"mensual","responsiblePositionId":"${POS.ti}"}]')`)).rows[0]
ok(risk.code === "R-01", `Juan (Líder SIG) identifica el riesgo ${risk.code}`)
const lvl = (await as(db, U.sofia, `select level, score from public.risk_assessments where risk_id = '${risk.id}'`)).rows[0]
ok(lvl.level === "extremo" && lvl.score === 20, "La valoración 4×5 queda en nivel extremo (20)")
const ctl = (await as(db, U.diana, `select id from public.controls where risk_id = '${risk.id}'`)).rows[0].id
await throws(() => as(db, U.sofia, `select public.register_evidence('${ctl}', current_date, 'efectivo', '')`), "Sofía (consulta) no registra evidencia", "Solo el cargo responsable")
await as(db, U.diana, `select public.register_evidence('${ctl}', current_date, 'efectivo', 'OK')`)
ok((await as(db, U.diana, `select next_due_date > current_date + 20 ok from public.controls where id = '${ctl}'`)).rows[0].ok, "Diana registra evidencia y se recalcula la próxima ejecución")
ok((await as(db, U.beto, `select count(*)::int n from public.risks`)).rows[0].n === 0, "Beto (org B) no ve riesgos de A")
ok((await as(db, U.carlos, `select count(*)::int n from public.risks`)).rows[0].n === 0, "Carlos (solo aprobador) no ve riesgos")
await throws(() => as(db, U.sofia, `select public.add_assessment('${risk.id}', 'residual', 1, 1)`), "Sofía no puede valorar riesgos", "no puede valorar")

// ---------- 009: borrador de quien lo registra y directorio ----------
const DOC2 = id("a4", 2)
const v21 = (await as(db, U.juan, `select public.create_document($1, $2, $3, $4, 'PR-GC-002', 'Auditorías internas',
  $5, $6, $7, '{}'::uuid[], false, 12, 'Creación') id`, [DOC2, A, P.sigA, id("a3", 1), POS.calidad, POS.gerente, POS.jefe])).rows[0].id
await throws(() => as(db, U.sofia, `select public.set_version_files('${v21}', '${A}/${DOC2}/${v21}/a.pdf', '${sha}', 1, '${A}/${DOC2}/${v21}/a.docx', '${sha}', 'a.docx', 1)`),
  "Sofía no adjunta archivos a un borrador ajeno")
await throws(() => as(db, U.juan, `select public.set_version_files('${v21}', '${A}/${DOC2}/${v21}/a.pdf', '${sha}', 1, '${B}/${DOC2}/${v21}/a.docx', '${sha}', 'a.docx', 1)`),
  "La ruta del archivo fuente también se valida", "Ruta de archivo")
await as(db, U.juan, `select public.set_version_files('${v21}', '${A}/${DOC2}/${v21}/a.pdf', '${sha}', 1, '${A}/${DOC2}/${v21}/a.docx', '${sha}', 'a.docx', 1)`)
await as(db, U.juan, `select public.submit_version('${v21}')`)
ok((await as(db, U.carlos, `select count(*)::int n from public.tasks where type = 'revisar' and entity_id = '${v21}'`)).rows[0].n === 1,
  "Juan (Líder SIG) registra para otro elaborador, adjunta y envía a revisión")
const dirA = (await as(db, U.sofia, `select * from public.org_directory('${A}')`)).rows
ok(dirA.length === 6 && dirA.every((r) => r.position_name), "Sofía ve el directorio de A (solo vigentes, con cargo)")
ok((await as(db, U.beto, `select count(*)::int n from public.org_directory('${A}')`)).rows[0].n === 0, "Beto (org B) no ve el directorio de A")

// ---------- Job diario ----------
const job = (await svc(`select public.run_daily_jobs() r`)).rows[0].r
ok(job && typeof job.controles === "number", `Job diario ejecuta (${JSON.stringify(job)})`)
const job2 = (await svc(`select count(*)::int n from public.email_outbox`)).rows[0].n
await svc(`select public.run_daily_jobs()`)
const job3 = (await svc(`select count(*)::int n from public.email_outbox`)).rows[0].n
ok(job2 === job3, "El job es idempotente: no repite correos")
await throws(() => as(db, U.laura, `select public.run_daily_jobs()`), "Un usuario no puede ejecutar el job", "permission denied")

console.log(`\n${pass} pasaron · ${fail} fallaron`)
process.exit(fail ? 1 : 0)
