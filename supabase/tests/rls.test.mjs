// Pruebas de RLS y del flujo con 2 organizaciones (base de las pruebas de la fase testing).
import { as, asMfa, freshDb } from "./harness.mjs"

const db = await freshDb()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) pass++; else fail++; console.log(`${cond ? "✓" : "✗"} ${name}`) }
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
await throws(() => as(db, U.laura, `select public.set_version_files('${U.laura}', '${ver}', '${A}/${DOC}/${ver}/doc.pdf', '${sha}', 1000, '${A}/${DOC}/${ver}/doc.docx', '${sha}', 'doc.docx', 2000)`),
  "Un cliente no puede invocar set_version_files con su hash (solo servidor)", "permission denied")
await svc(`select public.set_version_files('${U.laura}', '${ver}', '${A}/${DOC}/${ver}/doc.pdf', '${sha}', 1000, '${A}/${DOC}/${ver}/doc.docx', '${"b".repeat(64)}', 'doc.docx', 2000)`)
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
await throws(() => as(db, U.diana, `select public.register_evidence('${U.diana}', '${ctl}', current_date, 'efectivo', '')`),
  "Un cliente no puede invocar register_evidence (solo servidor)", "permission denied")
await throws(() => svc(`select public.register_evidence('${U.sofia}', '${ctl}', current_date, 'efectivo', '')`), "Sofía (consulta) no registra evidencia", "Solo el cargo responsable")
const EV = "cccccccc-0000-0000-0000-000000000001"
for (const [path, name] of [
  [`${A}/${ctl}/${EV}/../../../${B}/x.pdf`, "con recorrido de ruta"],
  [`${A}/${ctl}/${EV}/subida/x.pdf`, "temporal (sin validar)"],
  [`${B}/${ctl}/${EV}/x.pdf`, "de otra organización"],
  [`${A}/${ctl}/no-uuid/x.pdf`, "sin identificador válido"],
  [`${A}/${ctl}/${EV}/.htaccess`, "con nombre oculto"],
]) {
  await throws(() => svc(`select public.register_evidence('${U.diana}', '${ctl}', current_date, 'efectivo', '', $1, '${sha}', 'x.pdf')`, [path]),
    `Evidencia con ruta ${name} rechazada`, "Ruta de archivo")
}
await throws(() => svc(`select public.register_evidence('${U.diana}', '${ctl}', current_date, 'efectivo', '', '${A}/${ctl}/${EV}/x.pdf', 'no-es-hash', 'x.pdf')`),
  "Evidencia con hash mal formado rechazada", "Ruta de archivo")
await svc(`select public.register_evidence('${U.diana}', '${ctl}', current_date, 'efectivo', 'OK', '${A}/${ctl}/${EV}/acta.pdf', '${sha}', 'acta.pdf')`)
ok((await as(db, U.diana, `select registered_by = '${U.diana}' ok from public.control_evidences where control_id = '${ctl}'`)).rows[0].ok, "La evidencia queda a nombre del actor que pasó el servidor")
ok((await as(db, U.diana, `select next_due_date > current_date + 20 ok from public.controls where id = '${ctl}'`)).rows[0].ok, "Diana registra evidencia y se recalcula la próxima ejecución")
ok((await as(db, U.beto, `select count(*)::int n from public.risks`)).rows[0].n === 0, "Beto (org B) no ve riesgos de A")
ok((await as(db, U.carlos, `select count(*)::int n from public.risks`)).rows[0].n === 0, "Carlos (solo aprobador) no ve riesgos")
await throws(() => as(db, U.sofia, `select public.add_assessment('${risk.id}', 'residual', 1, 1)`), "Sofía no puede valorar riesgos", "no puede valorar")

// ---------- 009: borrador de quien lo registra y directorio ----------
const DOC2 = id("a4", 2)
const v21 = (await as(db, U.juan, `select public.create_document($1, $2, $3, $4, 'PR-GC-002', 'Auditorías internas',
  $5, $6, $7, '{}'::uuid[], false, 12, 'Creación') id`, [DOC2, A, P.sigA, id("a3", 1), POS.calidad, POS.gerente, POS.jefe])).rows[0].id
await throws(() => svc(`select public.set_version_files('${U.sofia}', '${v21}', '${A}/${DOC2}/${v21}/a.pdf', '${sha}', 1, '${A}/${DOC2}/${v21}/a.docx', '${sha}', 'a.docx', 1)`),
  "Sofía no adjunta archivos a un borrador ajeno")
await throws(() => svc(`select public.set_version_files('${U.juan}', '${v21}', '${A}/${DOC2}/${v21}/a.pdf', '${sha}', 1, '${B}/${DOC2}/${v21}/a.docx', '${sha}', 'a.docx', 1)`),
  "La ruta del archivo fuente también se valida", "Ruta de archivo")
const pre = `${A}/${DOC2}/${v21}`
for (const [pdf, src, name] of [
  [`${pre}/../../${DOC}/${ver}/doc.pdf`, `${pre}/a.docx`, "con recorrido de ruta"],
  [`${pre}/subida/a.pdf`, `${pre}/a.docx`, "temporal"],
  [`${pre}/a.pdf/`, `${pre}/a.docx`, "con barra final"],
  [`${pre}/a%2F..%2Fx.pdf`, `${pre}/a.docx`, "codificada"],
  [`${pre}/a.docx`, `${pre}/a.docx`, "PDF sin extensión .pdf"],
]) {
  await throws(() => svc(`select public.set_version_files('${U.juan}', '${v21}', $1, '${sha}', 1, $2, '${sha}', 'a.docx', 1)`, [pdf, src]),
    `Adjuntar con ruta ${name} se rechaza`, "Ruta de archivo")
}
await throws(() => svc(`select public.set_version_files('${U.juan}', '${v21}', '${pre}/a.pdf', 'xyz', 1, '${pre}/a.docx', '${sha}', 'a.docx', 1)`),
  "Adjuntar con hash mal formado se rechaza", "Archivo inválido")
await throws(() => svc(`select public.set_version_files('${U.beto}', '${v21}', '${pre}/a.pdf', '${sha}', 1, '${pre}/a.docx', '${sha}', 'a.docx', 1)`),
  "Beto (org B) no adjunta archivos a un borrador de A", "Solo el cargo elaborador")
await svc(`select public.set_version_files('${U.juan}', '${v21}', '${A}/${DOC2}/${v21}/a.pdf', '${sha}', 1, '${A}/${DOC2}/${v21}/a.docx', '${sha}', 'a.docx', 1)`)
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

const evBucket = (await db.query(`select allowed_mime_types m from storage.buckets where id = 'evidencias'`)).rows[0].m
ok(Array.isArray(evBucket) && !evBucket.some((t) => ["text/html", "image/svg+xml", "application/xhtml+xml", "text/javascript", "text/xml", "application/xml"].includes(t)), "El bucket de evidencias solo acepta tipos de lista blanca")

// ---------- 011: invitaciones solo por servidor ----------
const H = (c) => c.repeat(64)
const inv = (actor, org, email, pos, admin, hash) =>
  svc(`select * from public.create_invitation($1, $2, $3, $4, $5, false, null, $6)`, [actor, org, email, pos, admin, hash])
await throws(() => as(db, U.laura, `insert into public.invitations (organization_id, email, position_id, token_hash, invited_by)
  values ('${A}', 'gerente@valle.co', '${POS.analista}', '${H("1")}', '${U.laura}')`), "Un admin no puede insertar invitaciones por REST (token elegido)", "permission denied")
await throws(() => as(db, U.laura, `select * from public.create_invitation('${U.laura}', '${A}', 'x@y.co', '${POS.analista}', false, false, null, '${H("1")}')`),
  "Un cliente no puede invocar create_invitation (solo servidor)", "permission denied")
await throws(() => inv(U.beto, A, "x@y.co", POS.analista, false, H("1")), "Beto (org B) no invita en A", "No tienes permiso")
await throws(() => inv(U.sofia, A, "x@y.co", POS.analista, false, H("1")), "Sofía (consulta) no invita", "No tienes permiso")
await throws(() => inv(U.juan, A, "x@y.co", POS.analista, true, H("1")), "Juan (Líder SIG, no admin) no invita administradores", "Solo un administrador")
await throws(() => inv(U.juan, A, "SOFIA@x.co", POS.analista, false, H("1")), "No se invita a quien ya es miembro activo", "ya pertenece")
await throws(() => inv(U.juan, A, "x@y.co", POS.analista, false, "elegido-por-el-cliente"), "El hash del token debe ser SHA-256", "Invitación inválida")
const inv1 = (await inv(U.juan, A, "Nuevo@X.co", POS.analista, false, H("1"))).rows[0]
ok(!!inv1?.id, "Juan (Líder SIG) invita a nuevo@x.co")
ok((await as(db, U.oscar, `select count(*)::int n from public.audit_log where action = 'invitar_usuario' and entity_id = '${inv1.id}'`)).rows[0].n === 1,
  "La invitación queda auditada en la base (no depende de la app)")

const NUEVO = "00000000-0000-0000-0000-0000000000aa"
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${NUEVO}', 'nuevo@x.co', '{}')`)
await throws(() => as(db, NUEVO, `select public.accept_invitation('${H("1")}', '${NUEVO}')`), "Un cliente no puede invocar accept_invitation", "permission denied")
await throws(() => svc(`select public.accept_invitation('${H("1")}', '${U.beto}')`), "Beto no acepta una invitación dirigida a otro correo", "otro correo")
await throws(() => svc(`select public.accept_invitation('${H("9")}', '${NUEVO}')`), "Un token inexistente se rechaza", "venció o ya fue usada")
ok((await svc(`select public.accept_invitation('${H("1")}', '${NUEVO}', 'Nuevo Usuario') org`)).rows[0].org === A, "nuevo@x.co acepta y queda en A")
const mNuevo = (await as(db, NUEVO, `select position_id, status, is_org_admin from public.memberships where organization_id = '${A}'`)).rows[0]
ok(mNuevo?.position_id === POS.analista && mNuevo.status === "activo" && !mNuevo.is_org_admin, "La membresía toma el cargo de la invitación")
await throws(() => svc(`select public.accept_invitation('${H("1")}', '${NUEVO}')`), "La invitación es de un solo uso", "venció o ya fue usada")

const inv2 = (await inv(U.laura, A, "otro@x.co", POS.analista, true, H("2"))).rows[0]
ok(!!inv2?.id, "Laura (admin) sí invita administradores")
await svc(`insert into public.email_outbox (organization_id, to_email, template) values ('${A}', 'otro@x.co', 'invitacion'), ('${B}', 'otro@x.co', 'invitacion')`)
await throws(() => svc(`select public.reissue_invitation('${U.beto}', '${inv2.id}', '${H("3")}')`), "Beto (org B) no reenvía invitaciones de A", "No tienes permiso")
await svc(`select public.reissue_invitation('${U.laura}', '${inv2.id}', '${H("3")}')`)
const outbox = (await svc(`select organization_id from public.email_outbox where to_email = 'otro@x.co' and status = 'pendiente'`)).rows
ok(outbox.length === 1 && outbox[0].organization_id === B, "Reenviar descarta solo los correos pendientes de esa organización (BAJ-01)")
await throws(() => svc(`select public.accept_invitation('${H("2")}', '${NUEVO}')`), "El token anterior deja de servir al reenviar", "venció o ya fue usada")
await svc(`update public.invitations set expires_at = now() - interval '1 minute' where id = '${inv2.id}'`)
const OTRO = "00000000-0000-0000-0000-0000000000bb"
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${OTRO}', 'otro@x.co', '{}')`)
await throws(() => svc(`select public.accept_invitation('${H("3")}', '${OTRO}')`), "Una invitación vencida no se acepta", "venció o ya fue usada")

// ---------- 012: Superadmin con MFA y solo metadatos (ALTA-04) ----------
const count = async (fn, user, sql) => (await fn(db, user, `select count(*)::int n from (${sql}) t`)).rows[0].n
ok((await as(db, U.crubol, `select public.is_platform_admin() v`)).rows[0].v === false, "Superadmin sin MFA (aal1) no tiene privilegios")
ok((await as(db, U.crubol, `select public.is_platform_admin_account() v`)).rows[0].v === true, "La app detecta la cuenta Superadmin para exigir el MFA")
ok(await count(as, U.crubol, `select id from public.organizations`) === 0, "Superadmin sin MFA no ve organizaciones")
ok(await count(asMfa, U.crubol, `select id from public.organizations`) === 2, "Superadmin con MFA ve las organizaciones")
const porg = (await asMfa(db, U.crubol, `select * from public.platform_organizations() where id = '${A}'`)).rows[0]
ok(porg?.user_count === 7, `platform_organizations da el conteo de usuarios vigentes (${porg?.user_count})`)
ok(await count(as, U.laura, `select * from public.platform_organizations()`) === 0, "Un admin de organización no usa platform_organizations")
for (const [t, name] of [["risks", "riesgos"], ["controls", "controles"], ["control_evidences", "evidencias"], ["documents", "documentos"],
  ["document_versions", "versiones"], ["signatures", "firmas"], ["change_requests", "solicitudes"], ["read_acknowledgements", "lecturas"],
  ["processes", "procesos"], ["positions", "cargos"], ["memberships", "membresías"], ["invitations", "invitaciones"], ["audit_log", "auditoría"]]) {
  ok(await count(asMfa, U.crubol, `select 1 from public.${t}`) === 0, `Superadmin con MFA no lee ${name} de los clientes`)
}
ok(await count(asMfa, U.crubol, `select id from public.profiles where id <> '${U.crubol}'`) === 0, "Superadmin no lee perfiles de los clientes")
ok(await count(asMfa, U.crubol, `select * from public.org_directory('${A}')`) === 0, "Superadmin no lee el directorio de un cliente")
ok((await asMfa(db, U.crubol, `select public.is_org_admin('${A}') v`)).rows[0].v === false, "Superadmin no es admin de las organizaciones")
await throws(() => asMfa(db, U.crubol, `insert into public.memberships (organization_id, user_id, position_id) values ('${A}', '${U.crubol}', '${POS.lider}')`),
  "Superadmin no se da acceso a una organización", "permission denied")
await throws(() => asMfa(db, U.crubol, `select public.set_active_org('${A}')`), "Superadmin no activa una organización ajena", "No perteneces")
await throws(() => asMfa(db, U.crubol, `insert into public.organizations (name, nit) values ('X', '900000000-1')`), "Nadie crea organizaciones por REST", "row-level security")
await throws(() => asMfa(db, U.crubol, `select * from public.create_organization('${U.crubol}', 'X', '900000000-1', 'a@x.co', '${H("4")}')`),
  "Un cliente no invoca create_organization", "permission denied")
await throws(() => svc(`select * from public.create_organization('${U.laura}', 'X', '900000000-1', 'a@x.co', '${H("4")}')`),
  "Solo el Superadmin crea organizaciones", "No tienes permiso")
const neo = (await svc(`select * from public.create_organization('${U.crubol}', 'Nueva SAS', '900000000-1', 'Admin@Nueva.co', '${H("4")}')`)).rows[0]
ok(!!neo?.organization_id, "El Superadmin crea una organización con su cargo e invitación de administrador")
const neoAudit = (await svc(`select action, actor_id from public.audit_log where organization_id = '${neo.organization_id}' order by id`)).rows
ok(["crear_organizacion", "crear_cargo", "invitar_usuario"].every((a) => neoAudit.some((r) => r.action === a && r.actor_id === U.crubol)),
  `El alta queda en la traza a nombre del Superadmin (${neoAudit.map((r) => r.action).join(", ")})`)
const neoInv = (await asMfa(db, U.crubol, `select pending_admin_invitation id from public.platform_organizations() where id = '${neo.organization_id}'`)).rows[0].id
await svc(`select public.reissue_invitation('${U.crubol}', '${neoInv}', '${H("5")}')`)
ok(true, "El Superadmin reenvía la invitación del administrador inicial")
const invA = (await inv(U.laura, A, "jefe2@x.co", POS.jefe, true, H("6"))).rows[0]
await throws(() => svc(`select public.reissue_invitation('${U.crubol}', '${invA.id}', '${H("7")}')`),
  "El Superadmin no reenvía invitaciones de una organización con administrador", "No tienes permiso")
await throws(() => inv(U.crubol, A, "x@y.co", POS.analista, false, H("8")), "El Superadmin no invita usuarios en un cliente", "No tienes permiso")

// ---------- 012: separación de funciones y traza en la base (ALTA-05, MED-01, BAJ-05) ----------
await throws(() => as(db, U.oscar, `insert into public.position_roles (organization_id, position_id, role) values ('${A}', '${POS.jefe}', 'auditor')`),
  "Óscar (admin sin rol) no se asigna un rol funcional en su propio cargo", "propio cargo")
await throws(() => as(db, U.juan, `delete from public.position_roles where position_id = '${POS.lider}' and role = 'revisor'`),
  "Juan (Líder SIG) no cambia los roles de su propio cargo", "propio cargo")
await throws(() => as(db, U.oscar, `update public.memberships set position_id = '${POS.calidad}' where user_id = '${U.oscar}' and organization_id = '${A}'`),
  "Óscar no se cambia a un cargo con roles funcionales", "propio acceso")
await throws(() => as(db, U.juan, `update public.memberships set is_org_admin = true where user_id = '${U.sofia}'`),
  "Juan (Líder SIG) no otorga administración por REST", "permission denied")
await throws(() => as(db, U.juan, `update public.memberships set user_id = '${U.beto}' where user_id = '${U.sofia}'`),
  "Nadie cambia el usuario de una membresía", "permission denied")
await throws(() => as(db, U.juan, `update public.memberships set status = 'revocado' where user_id = '${U.laura}' and organization_id = '${A}'`),
  "Juan (Líder SIG) no revoca a un administrador", "Solo un administrador")
await throws(() => as(db, U.juan, `insert into public.memberships (organization_id, user_id, position_id) values ('${A}', '${U.beto}', '${POS.analista}')`),
  "Nadie inserta membresías por REST (terceros de otra organización)", "permission denied")
await throws(() => as(db, U.juan, `update public.invitations set token_hash = '${H("9")}' where id = '${invA.id}'`),
  "Nadie cambia el token de una invitación por REST", "permission denied")
await throws(() => as(db, U.juan, `delete from public.invitations where id = '${invA.id}'`),
  "Juan (Líder SIG) no cancela la invitación de un administrador", "Solo un administrador")

await as(db, U.oscar, `insert into public.position_roles (organization_id, position_id, role) values ('${A}', '${POS.analista}', 'auditor')`)
await as(db, U.laura, `update public.memberships set valid_until = current_date + 30 where user_id = '${U.sofia}' and organization_id = '${A}'`)
await as(db, U.juan, `update public.processes set name = 'TI y soporte' where id = '${P.tiA}'`)
await as(db, U.laura, `delete from public.invitations where id = '${invA.id}'`)
const trail = (await svc(`select action, actor_id from public.audit_log where organization_id = '${A}'`)).rows
for (const [action, actor, name] of [["asignar_rol", U.oscar, "Asignar un rol por REST"], ["editar_acceso", U.laura, "Editar una membresía por REST"],
  ["editar_proceso", U.juan, "Editar un proceso por REST"], ["cancelar_invitacion", U.laura, "Cancelar una invitación por REST"]]) {
  ok(trail.some((r) => r.action === action && r.actor_id === actor), `${name} queda en la traza con su actor`)
}
const invTrail = (await svc(`select count(*)::int n from public.audit_log where action = 'invitar_usuario' and entity_id = '${inv1.id}'`)).rows[0].n
ok(invTrail === 1, "Invitar deja una sola entrada en la traza")

const mSofia = (await svc(`select id from public.memberships where user_id = '${U.sofia}'`)).rows[0].id
const mJuan = (await svc(`select id from public.memberships where user_id = '${U.juan}'`)).rows[0].id
const mBeto = (await svc(`select id from public.memberships where user_id = '${U.beto}'`)).rows[0].id
await throws(() => as(db, U.juan, `insert into public.access_recertifications (organization_id, membership_id, reviewed_by, decision) values ('${A}', '${mJuan}', '${U.juan}', 'mantener')`),
  "Nadie recertifica su propio acceso", "row-level security")
await throws(() => as(db, U.juan, `insert into public.access_recertifications (organization_id, membership_id, reviewed_by, decision) values ('${A}', '${mBeto}', '${U.juan}', 'mantener')`),
  "No se recertifica una membresía de otra organización (BAJ-05)")
await as(db, U.juan, `insert into public.access_recertifications (organization_id, membership_id, reviewed_by, decision) values ('${A}', '${mSofia}', '${U.juan}', 'mantener')`)
const mLaura = (await svc(`select id from public.memberships where user_id = '${U.laura}' and organization_id = '${A}'`)).rows[0].id
await as(db, U.juan, `insert into public.access_recertifications (organization_id, membership_id, reviewed_by, decision) values ('${A}', '${mLaura}', '${U.juan}', 'mantener')`)
const stamp = (await svc(`select (m.last_recertified_at = r.at) ok from public.memberships m join public.access_recertifications r on r.membership_id = m.id where m.id = '${mLaura}'`)).rows[0]
ok(stamp?.ok === true, "Juan (Líder SIG) recertifica a un administrador y la base fija la fecha (RA-14)")
await throws(() => as(db, U.juan, `update public.memberships set last_recertified_at = now() where user_id = '${U.laura}' and organization_id = '${A}'`),
  "Nadie marca la fecha de recertificación por REST sin recertificar (RA-14)", "permission denied")

// ---------- 012: correos fuera de REST (MED-08) ----------
await throws(() => as(db, U.sofia, `select email from public.profiles where id = '${U.juan}'`), "Sofía no lee el correo de sus colegas", "permission denied")
ok((await as(db, U.sofia, `select full_name from public.profiles where id = '${U.juan}'`)).rows[0]?.full_name === "juan", "Sofía sí ve el nombre de sus colegas")
ok(await count(as, U.sofia, `select * from public.member_contacts('${A}')`) === 0, "Sofía no usa member_contacts")
ok(await count(as, U.beto, `select * from public.member_contacts('${A}')`) === 0, "Beto (org B) no lee los correos de A")
ok((await as(db, U.juan, `select email from public.member_contacts('${A}') where user_id = '${U.sofia}'`)).rows[0]?.email === "sofia@x.co", "Juan (Líder SIG) lee los correos de su organización")

// ---------- 013: re-auditoría (RA-03, RA-04, RA-10, RA-15) ----------
// RA-03: invitaciones pendientes frente a membresías activas.
await inv(U.laura, A, "dup@x.co", POS.analista, false, H("a"))
await throws(() => inv(U.laura, A, "DUP@x.co", POS.analista, false, H("b")), "Solo una invitación pendiente por correo", "invitación pendiente")
await throws(() => svc(`insert into public.invitations (organization_id, email, position_id, token_hash, invited_by) values ('${A}', 'dup@x.co', '${POS.analista}', '${H("c")}', '${U.laura}')`),
  "El índice único impide dos pendientes aunque se salte la función", "invitations_pending_email")
// Invitación a Óscar que quedó pendiente de antes (simula la segunda invitación del escenario del hallazgo).
await svc(`insert into public.invitations (organization_id, email, position_id, is_org_admin, token_hash, invited_by) values ('${A}', 'oscar@x.co', '${POS.jefe}', true, '${H("d")}', '${U.laura}')`)
await throws(() => as(db, U.oscar, `update public.invitations set position_id = '${POS.calidad}' where email = 'oscar@x.co'`),
  "Óscar no mueve a un cargo con roles una invitación dirigida a su correo", "propio correo")
await throws(() => svc(`select public.accept_invitation('${H("d")}', '${U.oscar}')`),
  "Aceptar una invitación no reescribe un acceso activo", "Ya tienes acceso")
ok((await svc(`select position_id from public.memberships where user_id = '${U.oscar}' and organization_id = '${A}'`)).rows[0].position_id === POS.jefe,
  "Óscar conserva su cargo sin roles funcionales")
// Revocar cancela las invitaciones pendientes de esa persona.
await svc(`insert into public.invitations (organization_id, email, position_id, token_hash, invited_by) values ('${A}', 'diana@x.co', '${POS.ti}', '${H("e")}', '${U.laura}')`)
await as(db, U.laura, `update public.memberships set status = 'revocado' where user_id = '${U.diana}' and organization_id = '${A}'`)
ok((await svc(`select count(*)::int n from public.invitations where email = 'diana@x.co' and accepted_at is null`)).rows[0].n === 0,
  "Revocar un acceso cancela sus invitaciones pendientes")
await throws(() => svc(`select public.accept_invitation('${H("e")}', '${U.diana}')`), "Diana revocada no recupera el acceso con una invitación vieja", "venció o ya fue usada")
ok((await svc(`select count(*)::int n from public.audit_log where action = 'cancelar_invitacion' and entity_label = 'd***@x.co'`)).rows[0].n === 1,
  "La cancelación por revocación queda en la traza con el correo enmascarado")

// RA-04 y RA-10: devolución sin texto en la traza; firma solo del PDF verificado.
const sha2 = "c".repeat(64)
await svc(`select public.set_version_files('${U.laura}', '${v2}', '${A}/${DOC}/${v2}/doc.pdf', '${sha2}', 1000, '${A}/${DOC}/${v2}/doc.docx', '${sha2}', 'doc.docx', 2000)`)
await as(db, U.laura, `select public.submit_version('${v2}')`)
const REASON = "El alcance omite los registros electrónicos"
await as(db, U.juan, `select public.return_version('${v2}', '${REASON}')`)
const devol = (await as(db, U.oscar, `select diff::text d from public.audit_log where action = 'devolver'`)).rows
ok(devol.length === 1 && !devol[0].d.includes(REASON) && devol[0].d.includes("comentario"),
  "Óscar (admin sin rol) ve la devolución en la traza, pero no el texto del comentario (RA-04)")
await as(db, U.laura, `select public.submit_version('${v2}')`)
await throws(() => as(db, U.juan, `select public.sign_version_checked('${v2}', '${U.juan}', 'revision', 'Revisé', '1.1.1.1', 'x', '${sha2}')`),
  "Un cliente no invoca sign_version_checked", "permission denied")
await throws(() => svc(`select public.sign_version_checked('${v2}', '${U.juan}', 'revision', 'Revisé', '1.1.1.1', 'x', '${sha}')`),
  "No se firma si el PDF no es el que verificó el servidor (RA-10)", "cambió mientras firmabas")
ok(!!(await svc(`select public.sign_version_checked('${v2}', '${U.juan}', 'revision', 'Revisé', '1.1.1.1', 'x', '${sha2}') id`)).rows[0].id,
  "Con el hash verificado la firma se registra")

// RA-15: sin correos completos en la traza.
const leaks = (await svc(`select count(*)::int n from public.audit_log where diff ? 'email' or entity_label ~ '^[^*@]+@'`)).rows[0].n
ok(leaks === 0, `La traza no guarda correos completos (RA-15, ${leaks})`)

// ---------- 014: re-verificación del bloque 6 ----------
const mCarlos = (await svc(`select id from public.memberships where user_id = '${U.carlos}'`)).rows[0].id
await as(db, U.juan, `insert into public.access_recertifications (organization_id, membership_id, reviewed_by, decision, at) values ('${A}', '${mCarlos}', '${U.juan}', 'mantener', '2999-01-01')`)
ok((await svc(`select (at < now() + interval '1 minute') ok from public.access_recertifications where membership_id = '${mCarlos}'`)).rows[0].ok,
  "La fecha de una recertificación la fija la base, no el cliente (N-2)")
await throws(() => as(db, U.juan, `insert into public.access_recertifications (organization_id, membership_id, reviewed_by, decision) values ('${A}', '${mLaura}', '${U.juan}', 'revocar')`),
  "Juan (Líder SIG) no revoca a un administrador desde la recertificación", "Solo un administrador")
ok((await svc(`select count(*)::int n from public.access_recertifications where membership_id = '${mLaura}' and decision = 'revocar'`)).rows[0].n === 0,
  "La decisión rechazada no queda registrada ni marca la fecha (R-1)")
await as(db, U.juan, `insert into public.access_recertifications (organization_id, membership_id, reviewed_by, decision) values ('${A}', '${mSofia}', '${U.juan}', 'revocar')`)
ok((await svc(`select status from public.memberships where id = '${mSofia}'`)).rows[0].status === "revocado", "Revocar en la recertificación revoca el acceso en la misma operación")
await throws(() => as(db, U.laura, `update public.memberships set status = 'activo' where id = '${mSofia}'`),
  "Un acceso revocado no se reactiva por REST (N-4)", "invitación nueva")
const ctl2 = (await as(db, U.juan, `select public.add_control('${risk.id}', 'Cifrado de respaldos con llave rotada', 'preventivo', 'mensual', '${POS.lider}') id`)).rows[0].id
const ctlAudit = (await as(db, U.oscar, `select diff::text d from public.audit_log where action = 'agregar_control' and diff::text like '%${ctl2}%'`)).rows
ok(ctlAudit.length === 1 && !ctlAudit[0].d.includes("Cifrado"), "La traza guarda el id del control, no su descripción (RA-04)")

// ---------- Rol anónimo sin privilegios sobre tablas (015) ----------
const anonQ = async (sql) => {
  await db.exec("set role anon; select set_config('request.jwt.claim.sub', '', false);")
  try { return await db.query(sql) } finally { await db.exec("reset role;") }
}
for (const t of ["documents", "organizations", "memberships", "signatures", "audit_log", "invitations"]) {
  await throws(() => anonQ(`select * from public.${t} limit 1`), `Anónimo no puede leer ${t} (015)`, "permission denied")
}
await throws(() => anonQ(`insert into public.organizations (name, nit) values ('x', '900000000-0')`), "Anónimo no puede insertar organizaciones (015)", "permission denied")

// ---------- Crubol-Agent: opt-in y uso por organización (016) ----------
await svc(`insert into public.ai_agent_usage (organization_id, period, used) values ('${A}', '2026-11', 3)`)
ok((await as(db, U.beto, `select count(*)::int n from public.ai_agent_usage where organization_id = '${A}'`)).rows[0].n === 0,
  "Beto (org B) no ve el uso del agente de A (016)")
ok((await as(db, U.sofia, `select count(*)::int n from public.ai_agent_usage where organization_id = '${A}'`)).rows[0].n === 0,
  "Sofía (consulta) no ve el uso del agente de A (016)")
ok((await as(db, U.laura, `select used from public.ai_agent_usage where organization_id = '${A}'`)).rows[0]?.used === 3,
  "Laura (admin) ve el uso del agente de su organización (016)")
ok((await as(db, U.juan, `select count(*)::int n from public.ai_agent_usage where organization_id = '${A}'`)).rows[0].n === 1,
  "Juan (Líder SIG) ve el uso del agente de su organización (016)")
await throws(() => as(db, U.laura, `insert into public.ai_agent_usage (organization_id, period) values ('${A}', '2026-12')`),
  "Nadie inserta en ai_agent_usage por REST (016)")
await as(db, U.laura, `update public.ai_agent_usage set used = 0 where organization_id = '${A}'`)
ok((await svc(`select used from public.ai_agent_usage where organization_id = '${A}' and period = '2026-11'`)).rows[0].used === 3,
  "Un UPDATE por REST no cambia ai_agent_usage: sin política de escritura no afecta filas (016)")
// ai_agent_consume: apagado → falla.
await throws(() => as(db, U.laura, `select public.ai_agent_consume('${A}', 5, '2026-11')`),
  "Con el agente apagado, consumir falla (016)", "no está habilitado")
await svc(`update public.organizations set ai_agent_enabled = true where id = '${A}'`)
await throws(() => as(db, U.sofia, `select public.ai_agent_consume('${A}', 5, '2026-11')`),
  "Sofía (consulta) no puede consumir el agente (016)", "Sin permiso")
await throws(() => as(db, U.laura, `select public.ai_agent_consume('${B}', 5, '2026-11')`),
  "Laura (A) no consume el agente de B (016)", "Sin permiso")
ok((await as(db, U.laura, `select public.ai_agent_consume('${A}', 5, '2026-11') r`)).rows[0].r === 1,
  "Consumir con uso 3/5 deja 1 (016)")
ok((await as(db, U.laura, `select public.ai_agent_consume('${A}', 5, '2026-11') r`)).rows[0].r === 0,
  "Consumir con uso 4/5 deja 0 (016)")
await throws(() => as(db, U.laura, `select public.ai_agent_consume('${A}', 5, '2026-11')`),
  "Consumir al alcanzar el límite falla (016)", "Límite")

// ---------- No Conformidades / CAPA (017) ----------
const Y = new Date().getFullYear()
// El estado del seed se muta en pruebas anteriores; este bloque corre al final. Restauramos las
// membresías que necesita (service_role) para probar el módulo de forma aislada.
await svc(`insert into public.memberships (organization_id, user_id, position_id, is_org_admin, is_external, valid_from, valid_until, status) values
    ('${A}','${U.juan}','${POS.lider}',false,false,current_date-100,null,'activo'),
    ('${A}','${U.laura}','${POS.calidad}',true,false,current_date-100,null,'activo'),
    ('${A}','${U.carlos}','${POS.gerente}',false,false,current_date-100,null,'activo'),
    ('${A}','${U.diana}','${POS.ti}',false,false,current_date-100,null,'activo'),
    ('${A}','${U.sofia}','${POS.analista}',false,false,current_date-100,null,'activo'),
    ('${A}','${U.oscar}','${POS.jefe}',true,false,current_date-100,null,'activo')
  on conflict (organization_id, user_id) do update set status='activo', valid_until=null,
    position_id=excluded.position_id, is_org_admin=excluded.is_org_admin`)
// Sofía (consulta) puede REPORTAR aunque no gestione el SIG. NC sobre el proceso TI.
const nc1 = (await as(db, U.sofia,
  `select id, code from public.report_nonconformity('${A}', 'auditoria_interna', '${P.tiA}', 'Falla en TI', 'Descripción de la no conformidad', 'mayor')`)).rows[0]
ok(nc1?.code === `NC-${Y}-001`, `Sofía (consulta) reporta una NC y recibe ${`NC-${Y}-001`} (017)`)
await throws(() => as(db, U.beto, `select public.report_nonconformity('${A}', 'otro', null, 'Intrusa', 'x larga aqui', 'menor')`),
  "Beto (org B) no reporta NC en A (017)", "No perteneces")

ok((await as(db, U.juan, `select count(*)::int n from public.nonconformities where id = '${nc1.id}'`)).rows[0].n === 1,
  "Juan (Líder SIG) ve la NC (017)")
ok((await as(db, U.oscar, `select count(*)::int n from public.nonconformities where id = '${nc1.id}'`)).rows[0].n === 0,
  "Óscar (admin sin rol SIG) no ve la NC (017)")
ok((await as(db, U.beto, `select count(*)::int n from public.nonconformities where organization_id = '${A}'`)).rows[0].n === 0,
  "Beto (org B) no ve NC de A (017)")

// El reportante ve su propia NC aunque su cargo no sea del SIG (Carlos = aprobador).
const nc2 = (await as(db, U.carlos,
  `select id, code from public.report_nonconformity('${A}', 'queja_pqrs', null, 'Queja', 'Otra descripción larga', 'menor')`)).rows[0]
ok(nc2?.code === `NC-${Y}-002`, `La numeración sigue consecutiva: ${`NC-${Y}-002`} (017)`)
ok((await as(db, U.carlos, `select count(*)::int n from public.nonconformities where id = '${nc2.id}'`)).rows[0].n === 1,
  "Carlos (aprobador) ve la NC que él reportó (017)")
ok((await as(db, U.carlos, `select count(*)::int n from public.nonconformities where id = '${nc1.id}'`)).rows[0].n === 0,
  "Carlos no ve una NC ajena que no reportó (017)")

// Gestión: Sofía (consulta) no; Laura (líder de otro proceso) no; Juan (Líder SIG) sí.
await throws(() => as(db, U.sofia, `select public.set_nc_cause('${nc1.id}', 'causa raíz identificada')`),
  "Sofía (consulta) no gestiona la NC (017)", "no puede gestionar")
await throws(() => as(db, U.laura, `select public.set_nc_cause('${nc1.id}', 'causa raíz identificada')`),
  "Laura (líder de otro proceso) no gestiona la NC de TI (017)", "no puede gestionar")
await as(db, U.juan, `select public.set_nc_cause('${nc1.id}', 'El procedimiento no define el reintento', '${POS.ti}')`)
ok((await as(db, U.juan, `select status from public.nonconformities where id = '${nc1.id}'`)).rows[0].status === "plan_accion",
  "Fijar la causa pasa la NC a plan_accion (017)")

const act = (await as(db, U.juan,
  `select public.add_nc_action('${nc1.id}', 'correctiva', 'Actualizar el procedimiento', '${POS.ti}', (current_date + 10)) a`)).rows[0].a
ok(!!act, "Juan agrega una acción al plan (017)")
ok((await as(db, U.juan, `select status from public.nonconformities where id = '${nc1.id}'`)).rows[0].status === "en_ejecucion",
  "Agregar acción pasa la NC a en_ejecucion (017)")
ok((await as(db, U.diana, `select count(*)::int n from public.tasks where type = 'ejecutar_accion_nc' and status = 'pendiente'`)).rows[0].n === 1,
  "Diana (cargo responsable) recibe la tarea de la acción (017)")

await throws(() => as(db, U.sofia, `select public.complete_nc_action('${act}')`),
  "Sofía (ni responsable ni líder) no completa la acción (017)", "responsable o un líder")
await as(db, U.diana, `select public.complete_nc_action('${act}')`)
ok((await as(db, U.juan, `select status from public.nonconformities where id = '${nc1.id}'`)).rows[0].status === "verificacion",
  "Al completar todas las acciones, la NC pasa a verificación (017)")

await throws(() => as(db, U.sofia, `select public.verify_nc('${nc1.id}', true, 'ok')`),
  "Sofía no verifica la eficacia (017)", "Líder SIG o el dueño")
await as(db, U.juan, `select public.verify_nc('${nc1.id}', true, 'Verificado: no se repite')`)
ok((await as(db, U.juan, `select status from public.nonconformities where id = '${nc1.id}'`)).rows[0].status === "cerrada",
  "Verificación eficaz cierra la NC (017)")
await throws(() => as(db, U.juan, `select public.verify_nc('${nc1.id}', true, 'x')`),
  "No se verifica una NC que no está en verificación (017)", "no está en verificación")

// MED-01 (018): un miembro SIN cargo no puede verificar una NC SIN dueño (NULL is not distinct from NULL).
const NOPOS = "00000000-0000-0000-0000-0000000000a1"
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${NOPOS}', 'nopos@x.co', '{"full_name":"SinCargo"}');
  insert into public.memberships (organization_id, user_id, is_org_admin, is_external, valid_from) values ('${A}', '${NOPOS}', false, false, current_date - 10);`)
const nc3 = (await as(db, U.sofia, `select id, code from public.report_nonconformity('${A}', 'mejora', '${P.tiA}', 'Mejora', 'descripción de la mejora', 'menor')`)).rows[0]
await as(db, U.juan, `select public.set_nc_cause('${nc3.id}', 'causa sin dueño asignado')`)
const act3 = (await as(db, U.juan, `select public.add_nc_action('${nc3.id}', 'preventiva', 'acción de mejora', '${POS.ti}', (current_date + 5)) a`)).rows[0].a
await as(db, U.diana, `select public.complete_nc_action('${act3}')`)
await throws(() => as(db, NOPOS, `select public.verify_nc('${nc3.id}', true, 'x')`),
  "Miembro sin cargo no verifica una NC sin dueño (018, MED-01)", "Líder SIG o el dueño")
await as(db, U.juan, `select public.verify_nc('${nc3.id}', true, 'ok')`)
ok((await as(db, U.juan, `select status from public.nonconformities where id = '${nc3.id}'`)).rows[0].status === "cerrada",
  "El Líder SIG sí verifica tras el arreglo (018)")

await throws(() => as(db, U.juan, `insert into public.nonconformities (organization_id, code, source, title, description, severity, reported_by, detected_at) values ('${A}', 'NC-X', 'otro', 't', 'd', 'menor', '${U.juan}', current_date)`),
  "Nadie inserta NC por REST: sin política de escritura (017)", "row-level security")
await throws(() => as(db, U.juan, `select public.nc_add_evidence('${U.juan}', '${nc1.id}', null, '${A}/${nc1.id}/x/f.pdf', '${"a".repeat(64)}', 1, 'f.pdf')`),
  "nc_add_evidence no es ejecutable por authenticated: server-only (019)", "permission denied")

// ---------- Auditorías Internas (020) ----------
// Agregamos el rol `auditor` a un cargo para probar el registro de hallazgos (Carlos = auditor).
await db.exec(`insert into public.position_roles (organization_id, position_id, role, process_id) values ('${A}', '${POS.gerente}', 'auditor', null);`)

await throws(() => as(db, U.sofia, `select public.plan_audit('${A}', 'Aud', null, null, null, current_date + 5, array['${P.tiA}']::uuid[])`),
  "Sofía (consulta) no planifica auditorías (020)", "Solo el Líder SIG")
await throws(() => as(db, U.beto, `select public.plan_audit('${A}', 'Intrusa', null, null, null, current_date + 5, array['${P.tiA}']::uuid[])`),
  "Beto (org B) no planifica auditorías en A (020)", "Solo el Líder SIG")
const aud = (await as(db, U.juan, `select id, code from public.plan_audit('${A}', 'Auditoría SGC', 'Objetivo', 'ISO 9001', '${POS.gerente}', current_date + 5, array['${P.tiA}','${P.sigA}']::uuid[])`)).rows[0]
ok(aud?.code === `AUD-${Y}-001`, `Juan (Líder SIG) planifica una auditoría → AUD-${Y}-001 (020)`)
ok((await as(db, U.juan, `select count(*)::int n from public.audit_processes where audit_id = '${aud.id}'`)).rows[0].n === 2,
  "La auditoría cubre 2 procesos (020)")
ok((await as(db, U.carlos, `select count(*)::int n from public.audits where id = '${aud.id}'`)).rows[0].n === 1, "Carlos (auditor) ve la auditoría (020)")
ok((await as(db, U.oscar, `select count(*)::int n from public.audits where id = '${aud.id}'`)).rows[0].n === 0, "Óscar (admin sin rol SIG) no ve la auditoría (020)")
ok((await as(db, U.beto, `select count(*)::int n from public.audits where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve auditorías de A (020)")

await throws(() => as(db, U.carlos, `select public.add_audit_finding('${aud.id}', 'observacion', '${P.tiA}', 'hallazgo largo', null)`),
  "No se registran hallazgos si la auditoría no está en ejecución (020)", "no está en ejecución")
await as(db, U.juan, `select public.start_audit('${aud.id}')`)
// Laura (líder de proceso, sin rol auditor ni lider_sig) no puede registrar hallazgos.
await throws(() => as(db, U.laura, `select public.add_audit_finding('${aud.id}', 'observacion', '${P.tiA}', 'hallazgo largo', null)`),
  "Laura (sin rol auditor) no registra hallazgos (020)", "no puede registrar")
const find = (await as(db, U.carlos, `select public.add_audit_finding('${aud.id}', 'no_conformidad', '${P.tiA}', 'Falla de control de versión', '7.5.3', 'mayor') f`)).rows[0].f
ok(!!find, "Carlos (auditor) registra un hallazgo de no conformidad (020)")

const ncFromFinding = (await as(db, U.juan, `select public.generate_nc_from_finding('${find}') c`)).rows[0].c
ok(/^NC-\d{4}-\d{3}$/.test(ncFromFinding), `El hallazgo genera una NC (${ncFromFinding}) (020)`)
await throws(() => as(db, U.juan, `select public.generate_nc_from_finding('${find}')`),
  "No se duplica la NC de un hallazgo: idempotente (020)", "ya tiene una no conformidad")
ok((await as(db, U.juan, `select nonconformity_id is not null r from public.audit_findings where id = '${find}'`)).rows[0].r === true,
  "El hallazgo queda enlazado a la NC (020)")

await throws(() => as(db, U.juan, `select public.close_audit('${aud.id}', '')`), "No se cierra una auditoría sin conclusiones (020)", "conclusiones")
await as(db, U.juan, `select public.close_audit('${aud.id}', 'El SGC cumple salvo la NC abierta.')`)
ok((await as(db, U.juan, `select status from public.audits where id = '${aud.id}'`)).rows[0].status === "cerrada", "El Líder SIG cierra la auditoría (020)")
await throws(() => as(db, U.juan, `insert into public.audits (organization_id, code, title, planned_date) values ('${A}', 'AUD-X', 't', current_date)`),
  "Nadie inserta auditorías por REST (020)", "row-level security")

// ---------- Indicadores de gestión / KPIs (022) ----------
// Juan = Líder SIG; Laura = líder de proceso de sigA; Carlos = auditor; Sofía = consulta.

await throws(() => as(db, U.sofia, `select public.create_indicator('${A}', 'KPI', '${P.tiA}', null, '%', 'mayor_mejor', 95, null, 5, 'mensual', null, false)`),
  "Sofía (consulta) no crea indicadores (022)", "Solo el Líder SIG")
await throws(() => as(db, U.beto, `select public.create_indicator('${A}', 'Intruso', '${P.tiA}', null, '%', 'mayor_mejor', 95, null, 5, 'mensual', null, false)`),
  "Beto (org B) no crea indicadores en A (022)", "Solo el Líder SIG")

const indTi = (await as(db, U.juan, `select id, code from public.create_indicator('${A}', 'Disponibilidad TI', '${P.tiA}', 'uptime', '%', 'mayor_mejor', 95, null, 5, 'mensual', '${POS.ti}', false)`)).rows[0]
ok(indTi?.code === `IND-${Y}-001`, `Juan (Líder SIG) crea un indicador → IND-${Y}-001 (022)`)
const indSig = (await as(db, U.juan, `select id, code from public.create_indicator('${A}', 'Reprocesos', '${P.sigA}', null, '%', 'menor_mejor', 3, null, 10, 'mensual', null, false)`)).rows[0]
ok(indSig?.code === `IND-${Y}-002`, "La numeración de indicadores es secuencial por año (022)")

ok((await as(db, U.carlos, `select count(*)::int n from public.indicators where id = '${indTi.id}'`)).rows[0].n === 1, "Carlos (auditor) ve el indicador (022)")
ok((await as(db, U.oscar, `select count(*)::int n from public.indicators where id = '${indTi.id}'`)).rows[0].n === 0, "Óscar (admin sin rol SIG) no ve el indicador (022)")
ok((await as(db, U.beto, `select count(*)::int n from public.indicators where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve indicadores de A (022)")

// Cumplimiento derivado por sentido (mayor_mejor, meta 95, tol 5%).
const c1 = (await as(db, U.juan, `select public.record_measurement('${indTi.id}', current_date, 97, null, null, null) c`)).rows[0].c
ok(c1 === "cumple", "mayor_mejor: 97 ≥ 95 → cumple (022)")
const c2 = (await as(db, U.juan, `select public.record_measurement('${indTi.id}', (current_date - interval '1 month')::date, 92, null, null, 'bajó') c`)).rows[0].c
ok(c2 === "en_riesgo", "mayor_mejor: 92 dentro de la tolerancia → en_riesgo (022)")
const c3 = (await as(db, U.juan, `select public.record_measurement('${indTi.id}', (current_date - interval '2 month')::date, 80, null, null, 'caída') c`)).rows[0].c
ok(c3 === "no_cumple", "mayor_mejor: 80 fuera de la tolerancia → no_cumple (022)")

// Captura por el líder del proceso dueño; rechazo si el proceso no es suyo o sin rol.
const cL = (await as(db, U.laura, `select public.record_measurement('${indSig.id}', current_date, 2, null, null, null) c`)).rows[0].c
ok(cL === "cumple", "Laura (líder de sigA) captura su indicador; menor_mejor 2 ≤ 3 → cumple (022)")
await throws(() => as(db, U.laura, `select public.record_measurement('${indTi.id}', current_date, 90, null, null, null)`),
  "Laura no captura mediciones de un indicador de otro proceso (022)", "no puede registrar")
await throws(() => as(db, U.sofia, `select public.record_measurement('${indSig.id}', current_date, 1, null, null, null)`),
  "Sofía (consulta) no captura mediciones (022)", "no puede registrar")

// El upsert por periodo corrige, no duplica.
await as(db, U.juan, `select public.record_measurement('${indTi.id}', current_date, 99, null, null, null)`)
ok((await as(db, U.juan, `select count(*)::int n from public.indicator_measurements where indicator_id = '${indTi.id}' and period = date_trunc('month', current_date)::date`)).rows[0].n === 1,
  "Re-registrar el mismo periodo corrige (upsert), no duplica (022)")

// Indicador de tasa: división por cero rechazada.
const indRate = (await as(db, U.juan, `select id from public.create_indicator('${A}', 'Entregas a tiempo', '${P.tiA}', null, '%', 'mayor_mejor', 95, null, 5, 'mensual', null, true)`)).rows[0]
await throws(() => as(db, U.juan, `select public.record_measurement('${indRate.id}', current_date, null, 10, 0, null)`),
  "Indicador de tasa: denominador cero rechazado (022)", "denominador no puede ser cero")
const cR = (await as(db, U.juan, `select public.record_measurement('${indRate.id}', current_date, null, 97, 100, null) c`)).rows[0].c
ok(cR === "cumple", "Indicador de tasa: 97/100 → 97% → cumple (022)")

// Medición no_cumple genera una NC (un clic, idempotente, solo si no cumple).
const measNo = (await as(db, U.juan, `select id from public.indicator_measurements where indicator_id = '${indTi.id}' and compliance = 'no_cumple' limit 1`)).rows[0].id
const ncFromMeas = (await as(db, U.juan, `select public.generate_nc_from_measurement('${measNo}') c`)).rows[0].c
ok(/^NC-\d{4}-\d{3}$/.test(ncFromMeas), `La medición que no cumple genera una NC (${ncFromMeas}) (022)`)
await throws(() => as(db, U.juan, `select public.generate_nc_from_measurement('${measNo}')`),
  "No se duplica la NC de una medición: idempotente (022)", "ya tiene una no conformidad")
const measOk = (await as(db, U.juan, `select id from public.indicator_measurements where indicator_id = '${indTi.id}' and compliance = 'cumple' limit 1`)).rows[0].id
await throws(() => as(db, U.juan, `select public.generate_nc_from_measurement('${measOk}')`),
  "Una medición que cumple no genera NC (022)", "no genera no conformidad")

// Solo el Líder SIG archiva.
await throws(() => as(db, U.laura, `select public.archive_indicator('${indTi.id}')`), "Laura no archiva indicadores (022)", "Solo el Líder SIG")
await as(db, U.juan, `select public.archive_indicator('${indTi.id}')`)
ok((await as(db, U.juan, `select status from public.indicators where id = '${indTi.id}'`)).rows[0].status === "archivado", "El Líder SIG archiva el indicador (022)")

await throws(() => as(db, U.juan, `insert into public.indicators (organization_id, code, name, process_id, unit, direction, target, frequency) values ('${A}', 'IND-X', 't', '${P.tiA}', '%', 'mayor_mejor', 1, 'mensual')`),
  "Nadie inserta indicadores por REST (022)", "row-level security")

// ---------- Revisión por la dirección (023) ----------
// Juan = Líder SIG (gestiona/firma); Laura = líder de proceso (no gestiona); Sofía = consulta; Carlos = auditor (ve).

await throws(() => as(db, U.laura, `select public.create_review('${A}', 'Acta', current_date - 180, current_date, current_date, null)`),
  "Laura (sin lider_sig) no crea actas (023)", "Solo el Líder SIG")
await throws(() => as(db, U.beto, `select public.create_review('${A}', 'Intrusa', current_date - 180, current_date, current_date, null)`),
  "Beto (org B) no crea actas en A (023)", "Solo el Líder SIG")
await throws(() => as(db, U.juan, `select public.create_review('${A}', 'Rango malo', current_date, current_date - 10, current_date, null)`),
  "El fin del periodo no puede ser anterior al inicio (023)", "anterior al inicio")

const rev = (await as(db, U.juan, `select id, code from public.create_review('${A}', 'Revisión 2026-2', current_date - 180, current_date, current_date, 'Desempeño del SGC')`)).rows[0]
ok(rev?.code === `RD-${Y}-001`, `Juan (Líder SIG) crea un acta → RD-${Y}-001 (023)`)
const snap = (await as(db, U.juan, `select snapshot from public.management_reviews where id = '${rev.id}'`)).rows[0].snapshot
ok(snap && snap.nc && snap.indicadores && snap.auditorias && snap.documentos && snap.riesgos && snap.accionesPrevias,
  "El acta precarga el snapshot con todos los bloques (023)")

ok((await as(db, U.carlos, `select count(*)::int n from public.management_reviews where id = '${rev.id}'`)).rows[0].n === 1, "Carlos (auditor) ve el acta (023)")
ok((await as(db, U.oscar, `select count(*)::int n from public.management_reviews where id = '${rev.id}'`)).rows[0].n === 0, "Óscar (admin sin rol SIG) no ve el acta (023)")
ok((await as(db, U.beto, `select count(*)::int n from public.management_reviews where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve actas de A (023)")

await throws(() => as(db, U.laura, `select public.add_review_output('${rev.id}', 'decision', 'Una decisión larga', null, null)`),
  "Laura no registra decisiones (023)", "Solo el Líder SIG")
const out = (await as(db, U.juan, `select public.add_review_output('${rev.id}', 'accion_mejora', 'Implementar monitoreo de disponibilidad', '${POS.ti}', current_date + 30) o`)).rows[0].o
ok(!!out, "Juan registra una acción de mejora (023)")
const outDec = (await as(db, U.juan, `select public.add_review_output('${rev.id}', 'decision', 'Mantener la certificación', null, null) o`)).rows[0].o

const ncFromOut = (await as(db, U.juan, `select public.generate_nc_from_output('${out}') c`)).rows[0].c
ok(/^NC-\d{4}-\d{3}$/.test(ncFromOut), `La acción de mejora genera una NC (${ncFromOut}) (023)`)
await throws(() => as(db, U.juan, `select public.generate_nc_from_output('${out}')`),
  "No se duplica la NC de una decisión: idempotente (023)", "ya tiene una no conformidad")
await throws(() => as(db, U.juan, `select public.generate_nc_from_output('${outDec}')`),
  "Una decisión que no es acción de mejora no genera NC (023)", "Solo una acción de mejora")

// Cerrar y firmar (ADR-004): admin-only tras el endurecimiento 024 (AUD MED-01). La reautenticación vive
// en la server action; el RPC recibe al aprobador explícito y autoriza su rol Líder SIG directamente.
// MED-01: un usuario autenticado NO puede invocar close_review directo (ni siquiera la firma vieja de 5 args).
await throws(() => as(db, U.juan, `select public.close_review('${rev.id}', now(), '${"a".repeat(64)}', null, 't')`),
  "authenticated no puede ejecutar close_review directo (024, MED-01)", "permission denied")
await throws(() => svc(`select public.close_review('${rev.id}', '${U.laura}', now(), '${"a".repeat(64)}', null, 't')`),
  "Laura (no Líder SIG) no cierra el acta (024)", "Solo el Líder SIG")
await throws(() => svc(`select public.close_review('${rev.id}', '${U.juan}', now() - interval '20 minutes', '${"a".repeat(64)}', null, 't')`),
  "No se cierra sin reautenticación reciente (024)", "confirmar tu identidad")
await throws(() => svc(`select public.close_review('${rev.id}', '${U.juan}', now(), 'hash-invalido', null, 't')`),
  "No se cierra con una firma inválida (024)", "Firma inválida")
await svc(`select public.close_review('${rev.id}', '${U.juan}', now(), '${"a".repeat(64)}', null, 'navegador')`)
ok((await as(db, U.juan, `select status, approved_by from public.management_reviews where id = '${rev.id}'`)).rows[0].status === "cerrada", "El Líder SIG cierra y firma el acta (024)")
ok((await as(db, U.juan, `select approved_by from public.management_reviews where id = '${rev.id}'`)).rows[0].approved_by === U.juan, "El acta queda firmada por el aprobador explícito (024)")

// Inmutable tras cerrar.
await throws(() => as(db, U.juan, `select public.add_review_output('${rev.id}', 'decision', 'Tardía', null, null)`),
  "No se agregan decisiones tras cerrar el acta (023)", "ya no es editable")
await throws(() => as(db, U.juan, `select public.refresh_review_snapshot('${rev.id}')`),
  "No se actualiza el snapshot tras cerrar (023)", "ya no es editable")

await throws(() => as(db, U.juan, `insert into public.management_reviews (organization_id, code, title, period_start, period_end, meeting_date) values ('${A}', 'RD-X', 't', current_date, current_date, current_date)`),
  "Nadie inserta actas por REST (023)", "row-level security")




// ========== 025 · Competencias (ISO 7.2) ==========
const cmLaura = (await svc(`select id from public.memberships where organization_id = '${A}' and user_id = '${U.laura}'`)).rows[0].id

// Catálogo: solo Líder SIG.
const comp = (await as(db, U.juan, `select public.create_competency('${A}', 'Auditoría interna ISO 19011', 'formacion', '')`)).rows[0].create_competency
ok(!!comp, "Juan (Líder SIG) crea una competencia (025)")
await throws(() => as(db, U.sofia, `select public.create_competency('${A}', 'Intrusa', 'habilidad', '')`),
  "Sofía (consulta) no crea competencias (025)", "Solo el Líder SIG")
await throws(() => as(db, U.beto, `select public.create_competency('${A}', 'Intrusa B', 'habilidad', '')`),
  "Beto (org B) no crea competencias en A (025)", "Solo el Líder SIG")

// Perfil del cargo: Líder SIG o líder del proceso; no la consulta.
const req = (await as(db, U.juan, `select public.set_position_requirement('${POS.calidad}', '${comp}', 3::smallint, true, null)`)).rows[0].set_position_requirement
ok(!!req, "Juan define un requisito en el perfil del cargo (025)")
await throws(() => as(db, U.sofia, `select public.set_position_requirement('${POS.calidad}', '${comp}', 2::smallint, true, null)`),
  "Sofía no edita el perfil del cargo (025)", "No puedes editar el perfil")

// Formación y asistente.
const tr = (await as(db, U.juan, `select public.create_training('${A}', 'Diplomado ISO 19011', 'externa', 'Icontec', current_date - 30, 40, null, '')`)).rows[0].create_training
ok(!!tr, "Juan crea una formación (025)")
const att = (await as(db, U.juan, `select public.add_training_attendee('${tr}', '${cmLaura}', 'aprobado', current_date + 365)`)).rows[0].add_training_attendee
ok(!!att, "Juan registra a Laura como asistente (025)")

// Evaluación: estado calculado en el servidor.
const s1 = (await as(db, U.juan, `select status from public.assess_competency('${cmLaura}', '${comp}', '${POS.calidad}', 1::smallint, null, null, false)`)).rows[0].status
ok(s1 === "brecha", "Nivel por debajo del requerido y sin plan → brecha (025)")
const s2 = (await as(db, U.juan, `select status from public.assess_competency('${cmLaura}', '${comp}', '${POS.calidad}', 1::smallint, null, 'Plan: diplomado', false)`)).rows[0].status
ok(s2 === "brecha_en_plan", "Nivel por debajo con plan → brecha_en_plan (025)")
const s3 = (await as(db, U.juan, `select status from public.assess_competency('${cmLaura}', '${comp}', '${POS.calidad}', 3::smallint, null, null, false)`)).rows[0].status
ok(s3 === "cumple", "Nivel igual o mayor al requerido → cumple (025)")
const n = (await svc(`select count(*)::int n from public.competency_assessments where membership_id = '${cmLaura}' and competency_id = '${comp}'`)).rows[0].n
ok(n === 1, "La evaluación es upsert por (persona, competencia): una sola fila (025)")

// Tarea de cierre de brecha.
await as(db, U.juan, `select public.assess_competency('${cmLaura}', '${comp}', '${POS.calidad}', 1::smallint, null, 'Plan', true)`)
const task = (await svc(`select gap_task_id from public.competency_assessments where membership_id = '${cmLaura}' and competency_id = '${comp}'`)).rows[0].gap_task_id
ok(!!task, "Al evaluar con brecha se crea y enlaza la tarea de cierre (025)")

// Dato personal: la propia persona ve lo suyo; la consulta ajena no; el líder SIG sí.
ok((await as(db, U.laura, `select count(*)::int n from public.competency_assessments where membership_id = '${cmLaura}'`)).rows[0].n === 1,
  "Laura ve su propia evaluación (025)")
ok((await as(db, U.sofia, `select count(*)::int n from public.competency_assessments where membership_id = '${cmLaura}'`)).rows[0].n === 0,
  "Sofía (consulta) no ve la evaluación de otra persona (025)")
ok((await as(db, U.juan, `select count(*)::int n from public.competency_assessments where membership_id = '${cmLaura}'`)).rows[0].n === 1,
  "El Líder SIG ve la evaluación de la persona (025)")
ok((await as(db, U.laura, `select count(*)::int n from public.training_attendees where membership_id = '${cmLaura}'`)).rows[0].n === 1,
  "Laura ve su propia formación (025)")
ok((await as(db, U.sofia, `select count(*)::int n from public.training_attendees where membership_id = '${cmLaura}'`)).rows[0].n === 0,
  "Sofía no ve la formación de otra persona (025)")

// Aislamiento entre organizaciones.
ok((await as(db, U.beto, `select count(*)::int n from public.competencies where organization_id = '${A}'`)).rows[0].n === 0,
  "Beto (org B) no ve competencias de A (025)")

// Bloqueo de INSERT por REST.
await throws(() => as(db, U.sofia, `insert into public.competencies (organization_id, name, kind) values ('${A}', 'X', 'habilidad')`),
  "Nadie inserta competencias por REST (025)", "row-level security")


// ========== 026 · Proveedores (ISO 8.4) ==========
// Alta: Líder SIG o Líder del proceso; no la consulta ni otra org.
const prov = (await as(db, U.juan, `select id, code from public.create_supplier('${A}', 'Transportes del Valle', '900.1-2', 'servicio', 'Logística', 'alta', '${P.sigA}', 'Ana', 'ana@valle.co', '3100000000')`)).rows[0]
ok(prov.code === "PRV-" + new Date().getFullYear() + "-001", "Numeración PRV-AAAA-001 (026)")
const prov2 = (await as(db, U.laura, `select code from public.create_supplier('${A}', 'Insumos Andinos', null, 'bien', 'Insumos', 'media', '${P.sigA}', null, null, null)`)).rows[0]
ok(prov2.code === "PRV-" + new Date().getFullYear() + "-002", "Numeración incremental PRV-AAAA-002 (026)")
await throws(() => as(db, U.sofia, `select public.create_supplier('${A}', 'Intrusa', null, 'bien', null, 'baja', null, null, null, null)`),
  "Sofía (consulta) no registra proveedores (026)", "No puedes registrar")
await throws(() => as(db, U.beto, `select public.create_supplier('${A}', 'Intrusa B', null, 'bien', null, 'baja', null, null, null, null)`),
  "Beto (org B) no registra proveedores en A (026)", "No puedes registrar")

// Evaluación: total y resultado calculados en el servidor por umbral.
const r1 = (await as(db, U.juan, `select result, total from public.evaluate_supplier('${prov.id}', 'inicial', current_date, 90::smallint, 85::smallint, 80::smallint, current_date + 365, null)`)).rows[0]
ok(Number(r1.total) === 86.5 && r1.result === "aprobado", "90/85/80 → 86.5 aprobado (026)")
const r2 = (await as(db, U.juan, `select result, total from public.evaluate_supplier('${prov.id}', 'periodica', current_date, 50::smallint, 50::smallint, 50::smallint, null, null)`)).rows[0]
ok(Number(r2.total) === 50 && r2.result === "rechazado", "50/50/50 → 50 rechazado (026)")
const r3 = (await as(db, U.juan, `select result, total from public.evaluate_supplier('${prov.id}', 'periodica', current_date, 60::smallint, 60::smallint, 60::smallint, current_date + 30, null)`)).rows[0]
ok(Number(r3.total) === 60 && r3.result === "condicionado", "60/60/60 → 60 condicionado, límite inferior (026)")

// El estado vigente y la próxima reevaluación del proveedor reflejan la última evaluación.
const after = (await as(db, U.juan, `select status, next_eval_date from public.suppliers where id = '${prov.id}'`)).rows[0]
ok(after.status === "condicionado", "El estado vigente = resultado de la última evaluación (026)")
ok(after.next_eval_date !== null, "La próxima reevaluación se guarda en el proveedor (026)")

// Autorización de la evaluación.
await throws(() => as(db, U.sofia, `select public.evaluate_supplier('${prov.id}', 'periodica', current_date, 90::smallint, 90::smallint, 90::smallint, null, null)`),
  "Sofía no evalúa proveedores (026)", "No puedes evaluar")

// Baja lógica y reactivación (vuelve al resultado de la última evaluación).
await as(db, U.juan, `select public.set_supplier_active('${prov.id}', false)`)
ok((await as(db, U.juan, `select status, is_active from public.suppliers where id = '${prov.id}'`)).rows[0].status === "inactivo", "Baja lógica → inactivo (026)")
await throws(() => as(db, U.juan, `select public.evaluate_supplier('${prov.id}', 'periodica', current_date, 90::smallint, 90::smallint, 90::smallint, null, null)`),
  "No se evalúa un proveedor inactivo (026)", "inactivo")
await as(db, U.juan, `select public.set_supplier_active('${prov.id}', true)`)
ok((await as(db, U.juan, `select status from public.suppliers where id = '${prov.id}'`)).rows[0].status === "condicionado", "Reactivar vuelve al último resultado (026)")

// Aislamiento entre organizaciones y bloqueo de INSERT por REST.
ok((await as(db, U.beto, `select count(*)::int n from public.suppliers where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve proveedores de A (026)")
await throws(() => as(db, U.sofia, `insert into public.suppliers (organization_id, code, name, kind, criticality) values ('${A}', 'X', 'X', 'bien', 'baja')`),
  "Nadie inserta proveedores por REST (026)", "row-level security")

console.log(`\n${pass} pasaron · ${fail} fallaron`)
process.exit(fail ? 1 : 0)
