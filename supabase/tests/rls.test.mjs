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


// ========== 027 · PQRS y satisfacción (ISO 9.1.2) ==========
// Alta: Líder SIG o Líder del proceso; no la consulta ni otra org.
const pq = (await as(db, U.juan, `select id, code from public.create_pqrs('${A}', 'reclamo', 'correo', 'Juan Cliente', 'juan@x.co', '${P.sigA}', 'El pedido llegó incompleto y con retraso.', current_date, 15)`)).rows[0]
ok(pq.code === "PQRS-" + new Date().getFullYear() + "-001", "Numeración PQRS-AAAA-001 (027)")
const pet = (await as(db, U.juan, `select id, code from public.create_pqrs('${A}', 'peticion', 'web', 'María', null, '${P.sigA}', 'Solicita copia de la factura.', current_date, 15)`)).rows[0]
ok(pet.code === "PQRS-" + new Date().getFullYear() + "-002", "Numeración incremental PQRS-AAAA-002 (027)")
await throws(() => as(db, U.sofia, `select public.create_pqrs('${A}', 'queja', 'web', null, null, null, 'Intrusa', current_date, 15)`),
  "Sofía (consulta) no registra PQRS (027)", "No puedes registrar")
await throws(() => as(db, U.beto, `select public.create_pqrs('${A}', 'queja', 'web', null, null, null, 'Intrusa B', current_date, 15)`),
  "Beto (org B) no registra PQRS en A (027)", "No puedes registrar")

// El plazo se fija a +15 días.
ok((await as(db, U.juan, `select (due_date - received_date) d from public.pqrs_cases where id = '${pq.id}'`)).rows[0].d === 15, "El plazo se fija en +15 días (027)")

// Cierre exige respuesta registrada.
await throws(() => as(db, U.juan, `select public.close_pqrs('${pq.id}', true)`),
  "No se cierra sin respuesta (027)", "Registra la respuesta")
await as(db, U.juan, `select public.respond_pqrs('${pq.id}', 'Se repuso el pedido y se ofreció disculpa.')`)
ok((await as(db, U.juan, `select status from public.pqrs_cases where id = '${pq.id}'`)).rows[0].status === "en_gestion", "Al responder pasa a en gestión (027)")

// Reclamo → NC (reusa report_nonconformity 'queja_pqrs'); idempotente.
const nc = (await as(db, U.juan, `select code from public.generate_nc_from_pqrs('${pq.id}')`)).rows[0]
ok(/^NC-\d{4}-\d{3}$/.test(nc.code), "El reclamo genera una NC (027)")
ok((await as(db, U.juan, `select source from public.nonconformities where code = '${nc.code}' and organization_id = '${A}'`)).rows[0].source === "queja_pqrs", "La NC tiene source queja_pqrs (027)")
await throws(() => as(db, U.juan, `select public.generate_nc_from_pqrs('${pq.id}')`),
  "No se duplica la NC del reclamo: idempotente (027)", "ya tiene una no conformidad")
await throws(() => as(db, U.juan, `select public.generate_nc_from_pqrs('${pet.id}')`),
  "Una petición no genera NC (027)", "Solo un reclamo")

// Cierre con conformidad.
await as(db, U.juan, `select public.close_pqrs('${pq.id}', true)`)
const closed = (await as(db, U.juan, `select status, satisfied from public.pqrs_cases where id = '${pq.id}'`)).rows[0]
ok(closed.status === "cerrada" && closed.satisfied === true, "Se cierra con conformidad del cliente (027)")
await throws(() => as(db, U.juan, `select public.respond_pqrs('${pq.id}', 'Tardía')`),
  "No se edita una PQRS cerrada (027)", "ya no es editable")

// Anular (desde abierto).
await as(db, U.juan, `select public.cancel_pqrs('${pet.id}', 'Duplicada')`)
ok((await as(db, U.juan, `select status from public.pqrs_cases where id = '${pet.id}'`)).rows[0].status === "anulada", "Se anula la PQRS (027)")

// Satisfacción: upsert por periodo+método; score fuera de rango rechazado.
await as(db, U.juan, `select public.record_satisfaction('${A}', date_trunc('month', current_date)::date, 'encuesta', 84.5, 30, 'Buen mes')`)
await as(db, U.juan, `select public.record_satisfaction('${A}', date_trunc('month', current_date)::date, 'encuesta', 90, 31, null)`)
const sat = (await as(db, U.juan, `select count(*)::int n, max(score) s from public.satisfaction_measurements where organization_id = '${A}' and method = 'encuesta'`)).rows[0]
ok(sat.n === 1 && Number(sat.s) === 90, "Satisfacción: upsert por periodo+método (027)")
await throws(() => as(db, U.juan, `select public.record_satisfaction('${A}', date_trunc('month', current_date)::date, 'nps', 120, null, null)`),
  "Puntaje de satisfacción fuera de rango rechazado (027)", "de 0 a 100")

// Aislamiento entre organizaciones y bloqueo de INSERT por REST.
ok((await as(db, U.beto, `select count(*)::int n from public.pqrs_cases where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve PQRS de A (027)")
await throws(() => as(db, U.sofia, `insert into public.pqrs_cases (organization_id, code, type, channel, description, received_date, due_date) values ('${A}', 'X', 'queja', 'web', 'x intrusa', current_date, current_date)`),
  "Nadie inserta PQRS por REST (027)", "row-level security")

// ========== 028 · Actas/reuniones y Objetivos de calidad / BSC (ISO 6.2) ==========
const YEAR = new Date().getFullYear()

// --- Actas ---
const m1 = (await as(db, U.juan, `select id, code from public.create_minute('${A}', 'Revisión mensual del SIG', 'comité', current_date, null, 'Ana, Juan', 'Temas varios')`)).rows[0]
ok(m1.code === "ACT-" + YEAR + "-001", "Numeración ACT-AAAA-001 (028)")
const m2 = (await as(db, U.laura, `select id, code from public.create_minute('${A}', 'Comité de calidad', 'comité', current_date, '${P.sigA}', null, null)`)).rows[0]
ok(m2.code === "ACT-" + YEAR + "-002", "Numeración incremental ACT-AAAA-002; Líder de proceso crea (028)")
await throws(() => as(db, U.sofia, `select public.create_minute('${A}', 'Intrusa', 'otro', current_date, null, null, null)`),
  "Sofía (consulta) no crea actas (028)", "No puedes crear")
await throws(() => as(db, U.beto, `select public.create_minute('${A}', 'Intrusa B', 'otro', current_date, null, null, null)`),
  "Beto (org B) no crea actas en A (028)", "No puedes crear")

await as(db, U.juan, `select public.update_minute('${m1.id}', 'Revisión mensual SIG (v2)', 'comité', current_date, null, 'Ana, Juan, Pedro', 'Orden del día')`)
ok((await as(db, U.juan, `select title from public.meeting_minutes where id = '${m1.id}'`)).rows[0].title === "Revisión mensual SIG (v2)", "Editar acta en borrador (028)")
await as(db, U.juan, `select public.close_minute('${m1.id}')`)
ok((await as(db, U.juan, `select status from public.meeting_minutes where id = '${m1.id}'`)).rows[0].status === "cerrada", "Cerrar acta → cerrada (028)")
await throws(() => as(db, U.juan, `select public.update_minute('${m1.id}', 'x', 'comité', current_date, null, null, null)`),
  "No se edita un acta cerrada (028)", "ya no es editable")
await throws(() => as(db, U.juan, `select public.add_commitment('${m1.id}', 'Tardío', null, null)`),
  "Un acta cerrada no admite nuevos compromisos (028)", "ya no admite")

// Compromiso con responsable → genera tarea 'cumplir_compromiso'
const com = (await as(db, U.juan, `select public.add_commitment('${m2.id}', 'Actualizar el procedimiento PR-07', '${POS.calidad}', current_date + 5) id`)).rows[0].id
ok((await as(db, U.laura, `select count(*)::int n from public.tasks where type = 'cumplir_compromiso' and entity_type = 'acta' and entity_id = '${com}' and status = 'pendiente'`)).rows[0].n === 1,
  "add_commitment genera tarea cumplir_compromiso al cargo responsable (028)")
await throws(() => as(db, U.sofia, `select public.add_commitment('${m2.id}', 'Intrusa', null, null)`),
  "Sofía (consulta) no agrega compromisos (028)", "No puedes agregar")

// El compromiso sobrevive al cierre del acta y se puede cumplir
await as(db, U.juan, `select public.close_minute('${m2.id}')`)
await as(db, U.juan, `select public.complete_commitment('${com}')`)
ok((await as(db, U.juan, `select status from public.meeting_commitments where id = '${com}'`)).rows[0].status === "cumplido",
  "complete_commitment permitido con el acta cerrada (ADR-032) (028)")
ok((await as(db, U.laura, `select count(*)::int n from public.tasks where type = 'cumplir_compromiso' and entity_id = '${com}' and status = 'completada'`)).rows[0].n === 1,
  "Cumplir el compromiso completa su tarea (028)")

// --- Objetivos / BSC ---
const o1 = (await as(db, U.juan, `select id, code from public.create_objective('${A}', 'Reducir el costo de la no calidad', 'financiera', '${P.sigA}', '-15%', ${YEAR}, array['${indTi.id}']::uuid[])`)).rows[0]
ok(o1.code === "OBJ-" + YEAR + "-001", "Numeración OBJ-AAAA-001 (028)")
const prog1 = (await as(db, U.juan, `select indicator_count, progress_pct from public.objectives_with_progress('${A}') where id = '${o1.id}'`)).rows[0]
ok(prog1.indicator_count === 1 && Number(prog1.progress_pct) === 100, "Avance derivado: indicador con última medición 'cumple' → 100% (028)")

const o2 = (await as(db, U.juan, `select id, code from public.create_objective('${A}', 'Estandarizar el despacho', 'procesos', null, null, null, array[]::uuid[])`)).rows[0]
const prog2 = (await as(db, U.juan, `select indicator_count, progress_pct from public.objectives_with_progress('${A}') where id = '${o2.id}'`)).rows[0]
ok(prog2.indicator_count === 0 && prog2.progress_pct === null, "Objetivo sin indicadores → avance Sin datos (null) (028)")

// Aislamiento: un indicador de B no se liga a un objetivo de A
const indB = (await as(db, U.beto, `select id from public.create_indicator('${B}', 'KPI B', '${P.sigB}', null, '%', 'mayor_mejor', 90, null, 5, 'mensual', null, false)`)).rows[0]
await as(db, U.juan, `select public.update_objective('${o2.id}', 'Estandarizar el despacho', 'procesos', null, null, null, 'activo', array['${indB.id}']::uuid[])`)
ok((await as(db, U.juan, `select indicator_count from public.objectives_with_progress('${A}') where id = '${o2.id}'`)).rows[0].indicator_count === 0,
  "No se liga un indicador de otra organización (028)")

// update_objective re-sincroniza (baja lógica): quitar el indicador del objetivo o1
await as(db, U.juan, `select public.update_objective('${o1.id}', 'Reducir el costo de la no calidad', 'financiera', '${P.sigA}', '-15%', ${YEAR}, 'activo', array[]::uuid[])`)
ok((await as(db, U.juan, `select indicator_count from public.objectives_with_progress('${A}') where id = '${o1.id}'`)).rows[0].indicator_count === 0,
  "update_objective desliga indicadores (baja lógica, sin DELETE) (028)")

await as(db, U.juan, `select public.set_objective_status('${o1.id}', 'cumplido')`)
ok((await as(db, U.juan, `select status from public.quality_objectives where id = '${o1.id}'`)).rows[0].status === "cumplido", "set_objective_status cambia el estado (028)")
await throws(() => as(db, U.sofia, `select public.create_objective('${A}', 'Intrusa', 'cliente', null, null, null, array[]::uuid[])`),
  "Sofía (consulta) no crea objetivos (028)", "No puedes crear")
await throws(() => as(db, U.beto, `select public.set_objective_status('${o1.id}', 'activo')`),
  "Beto (org B) no toca objetivos de A (028)", "no encontrado")

// Aislamiento de lectura + bloqueo de INSERT por REST
ok((await as(db, U.beto, `select count(*)::int n from public.meeting_minutes where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve actas de A (028)")
ok((await as(db, U.beto, `select count(*)::int n from public.quality_objectives where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve objetivos de A (028)")
await throws(() => as(db, U.sofia, `insert into public.meeting_minutes (organization_id, code, title, meeting_type, meeting_date) values ('${A}', 'X', 'Intrusa', 'otro', current_date)`),
  "Nadie inserta actas por REST (028)", "row-level security")
await throws(() => as(db, U.sofia, `insert into public.meeting_commitments (organization_id, minute_id, description) values ('${A}', '${m2.id}', 'x')`),
  "Nadie inserta compromisos por REST (028)", "row-level security")
await throws(() => as(db, U.sofia, `insert into public.quality_objectives (organization_id, code, description, perspective) values ('${A}', 'X', 'Intrusa', 'financiera')`),
  "Nadie inserta objetivos por REST (028)", "row-level security")
await throws(() => as(db, U.sofia, `insert into public.objective_indicators (organization_id, objective_id, indicator_id) values ('${A}', '${o1.id}', '${indTi.id}')`),
  "Nadie liga indicadores por REST (028)", "row-level security")
await throws(() => as(db, U.sofia, `insert into public.meeting_counters (organization_id, year, last_seq) values ('${A}', ${YEAR}, 9)`),
  "meeting_counters es deny-all (028)", "row-level security")

// ========== 029 · Encuesta de satisfacción enviable (ISO 9.1.2) ==========
const anon = async (sql, p = []) => {
  await db.exec("set role anon; select set_config('request.jwt.claim.sub', '', true);")
  try { return await db.query(sql, p) } finally { await db.exec("reset role;") }
}

const sv = (await as(db, U.juan, `select id, code, token from public.create_survey('${A}', 'Satisfacción nov', 'csat', '1_5', current_date, '${P.sigA}')`)).rows[0]
ok(sv.code === "ENC-" + YEAR + "-001", "Numeración ENC-AAAA-001 (029)")
ok(typeof sv.token === "string" && sv.token.length >= 32, "La campaña genera un token aleatorio (029)")
await throws(() => as(db, U.sofia, `select public.create_survey('${A}', 'Intrusa', 'csat', '0_100', current_date, null)`),
  "Sofía (consulta) no crea encuestas (029)", "No puedes crear")
await throws(() => as(db, U.beto, `select public.create_survey('${A}', 'Intrusa B', 'csat', '0_100', current_date, null)`),
  "Beto (org B) no crea encuestas en A (029)", "No puedes crear")

// Lectura pública por token (anon) y envío público
const pub = (await anon(`select title, is_open from public.get_survey_public('${sv.token}')`)).rows[0]
ok(pub && pub.is_open === true, "get_survey_public devuelve la campaña abierta por token (029)")
ok((await anon(`select count(*)::int n from public.get_survey_public('token-inexistente')`)).rows[0].n === 0, "Token inexistente no revela nada (029)")
await anon(`select public.submit_survey_response('${sv.token}', 5, 'Excelente', null)`)   // escala 1_5 → 100
await anon(`select public.submit_survey_response('${sv.token}', 3, null, null)`)          // 1_5 → 50
ok((await svc(`select count(*)::int n from public.survey_responses where survey_id = '${sv.id}'`)).rows[0].n === 2, "anon registra respuestas por el RPC (029)")
ok(Number((await svc(`select score from public.survey_responses where survey_id = '${sv.id}' order by score limit 1`)).rows[0].score) === 50, "Normaliza la escala 1–5 a 0–100 (3→50) (029)")
await throws(() => anon(`select public.submit_survey_response('${sv.token}', 9, null, null)`),
  "Puntaje fuera de rango en escala 1–5 rechazado (029)", "fuera de rango")

// El público NO puede leer respuestas ni campañas por REST, ni insertar directo
await throws(() => anon(`select count(*)::int n from public.survey_responses`), "anon no lee respuestas por REST (029)", "permission denied")
await throws(() => anon(`select count(*)::int n from public.satisfaction_surveys`), "anon no lee campañas por REST (029)", "permission denied")
await throws(() => anon(`insert into public.survey_responses (organization_id, survey_id, score) values ('${A}', '${sv.id}', 10)`),
  "anon no inserta respuestas por REST (029)", "permission denied")

// Aislamiento + cierre → medición
ok((await as(db, U.beto, `select count(*)::int n from public.satisfaction_surveys where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve campañas de A (029)")
await throws(() => as(db, U.beto, `select public.close_survey('${sv.id}')`), "Beto (org B) no cierra campañas de A (029)", "no encontrada")
await as(db, U.juan, `select public.close_survey('${sv.id}')`)
ok((await as(db, U.juan, `select status from public.satisfaction_surveys where id = '${sv.id}'`)).rows[0].status === "cerrada", "Cerrar deja la campaña cerrada (029)")
const meas = (await as(db, U.juan, `select score, responses from public.satisfaction_measurements where organization_id = '${A}' and method = 'csat' order by created_at desc limit 1`)).rows[0]
ok(meas && Number(meas.score) === 75 && meas.responses === 2, "El cierre escribe la medición (promedio 75 de 2 respuestas) (029)")
await throws(() => anon(`select public.submit_survey_response('${sv.token}', 5, null, null)`),
  "Una campaña cerrada no acepta respuestas (029)", "no está disponible")
const sv2 = (await as(db, U.juan, `select id from public.create_survey('${A}', 'Sin respuestas', 'csat', '0_100', current_date, null)`)).rows[0]
await throws(() => as(db, U.juan, `select public.close_survey('${sv2.id}')`), "No se cierra una campaña sin respuestas (029)", "no tiene respuestas")
await throws(() => as(db, U.sofia, `insert into public.satisfaction_surveys (organization_id, code, title, method, period, token) values ('${A}', 'X', 'Intrusa', 'csat', current_date, 'tok')`),
  "Nadie inserta campañas por REST (029)", "row-level security")

// ========== 030 · Requisitos legales (ISO 14001/45001, SG-SST) ==========
const rq = (await as(db, U.juan, `select id, code from public.create_requirement('${A}', 'Estándares mínimos SG-SST', 'decreto', 'Dec. 1072/2015 art. 2.2.4.6', 'Mintrabajo', 'Cumplir los estándares mínimos', '${P.sigA}', null, 'anual')`)).rows[0]
ok(rq.code === "REQ-" + YEAR + "-001", "Numeración REQ-AAAA-001 (030)")
await throws(() => as(db, U.sofia, `select public.create_requirement('${A}', 'Intrusa', 'ley', 'X', null, 'x', null, null, 'anual')`),
  "Sofía (consulta) no crea requisitos (030)", "No puedes crear")
await throws(() => as(db, U.beto, `select public.create_requirement('${A}', 'Intrusa B', 'ley', 'X', null, 'x', null, null, 'anual')`),
  "Beto (org B) no crea requisitos en A (030)", "No puedes crear")

// Evaluación → cumplimiento vigente derivado + próxima evaluación (+1 año anual)
await throws(() => as(db, U.juan, `select public.evaluate_requirement('${rq.id}', 'parcial', '  ', current_date, null)`),
  "La evaluación exige evidencia (030)", "evidencia")
await as(db, U.juan, `select public.evaluate_requirement('${rq.id}', 'parcial', 'Faltan 3 estándares', current_date, null)`)
const rl1 = (await as(db, U.juan, `select next_eval_date, (next_eval_date = current_date + interval '12 months') ok from public.legal_requirements where id = '${rq.id}'`)).rows[0]
ok(rl1.ok === true, "La próxima evaluación se fija a +12 meses (anual) (030)")
ok((await as(db, U.juan, `select compliance from public.legal_evaluations where requirement_id = '${rq.id}' order by evaluated_at desc limit 1`)).rows[0].compliance === "parcial", "El cumplimiento vigente lo da la última evaluación (030)")
await throws(() => as(db, U.juan, `select public.evaluate_requirement('${rq.id}', 'x_invalido', 'ev', current_date, null)`),
  "Cumplimiento no válido rechazado (030)", "no válido")

// Derogar (baja lógica) → no editable
await as(db, U.juan, `select public.derogate_requirement('${rq.id}')`)
ok((await as(db, U.juan, `select status, next_eval_date from public.legal_requirements where id = '${rq.id}'`)).rows[0].status === "derogado", "Derogar deja el requisito derogado (030)")
await throws(() => as(db, U.juan, `select public.update_requirement('${rq.id}', 'x', 'ley', 'y', null, 'z', null, null, 'anual')`),
  "Un requisito derogado no es editable (030)", "ya no es editable")
await throws(() => as(db, U.juan, `select public.evaluate_requirement('${rq.id}', 'cumple', 'ev', current_date, null)`),
  "Un requisito derogado no se evalúa (030)", "derogado")

// Aislamiento + REST
ok((await as(db, U.beto, `select count(*)::int n from public.legal_requirements where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve requisitos de A (030)")
const rq2 = (await as(db, U.juan, `select id from public.create_requirement('${A}', 'Otro requisito', 'norma_iso', 'ISO 9001 7.5', null, 'Info documentada', null, null, 'anual')`)).rows[0]
await throws(() => as(db, U.beto, `select public.evaluate_requirement('${rq2.id}', 'cumple', 'ev', current_date, null)`),
  "Beto (org B) no evalúa requisitos de A (030)", "no encontrado")
await throws(() => as(db, U.sofia, `insert into public.legal_requirements (organization_id, code, title, source_type, reference, description) values ('${A}', 'X', 'Intrusa', 'ley', 'r', 'd')`),
  "Nadie inserta requisitos por REST (030)", "row-level security")
await throws(() => as(db, U.sofia, `insert into public.legal_evaluations (organization_id, requirement_id, evaluated_at, compliance, evidence) values ('${A}', '${rq2.id}', current_date, 'cumple', 'ev')`),
  "Nadie inserta evaluaciones por REST (030)", "row-level security")
await throws(() => as(db, U.sofia, `insert into public.legal_counters (organization_id, year, last_seq) values ('${A}', ${YEAR}, 9)`),
  "legal_counters es deny-all (030)", "row-level security")

// ========== 031 · Multi-norma y peligros SST (GTC-45) ==========
// Normas
const norm45 = (await as(db, U.juan, `select public.upsert_norm('${A}', '45001', 'ISO 45001') id`)).rows[0].id
ok(typeof norm45 === "string", "Líder SIG activa una norma (031)")
await throws(() => as(db, U.sofia, `select public.upsert_norm('${A}', '9001', 'ISO 9001')`),
  "Sofía (consulta) no administra normas (031)", "No puedes administrar")
await throws(() => as(db, U.beto, `select public.upsert_norm('${A}', '9001', 'ISO 9001')`),
  "Beto (org B) no administra normas de A (031)", "No puedes administrar")

// Etiquetado polimórfico (proceso ↔ norma), con baja lógica al re-sincronizar
await as(db, U.juan, `select public.set_entity_norms('${A}', 'proceso', '${P.sigA}', array['${norm45}']::uuid[])`)
ok((await as(db, U.juan, `select count(*)::int n from public.entity_norms where entity_type='proceso' and entity_id='${P.sigA}' and is_active`)).rows[0].n === 1, "Etiqueta una entidad con una norma (031)")
await as(db, U.juan, `select public.set_entity_norms('${A}', 'proceso', '${P.sigA}', array[]::uuid[])`)
ok((await as(db, U.juan, `select count(*)::int n from public.entity_norms where entity_type='proceso' and entity_id='${P.sigA}' and is_active`)).rows[0].n === 0, "Re-sincronizar desactiva el vínculo (baja lógica, 031)")
await throws(() => as(db, U.sofia, `select public.set_entity_norms('${A}', 'proceso', '${P.sigA}', array['${norm45}']::uuid[])`),
  "Sofía (consulta) no etiqueta por norma (031)", "No puedes etiquetar")

// Peligros GTC-45
const hz = (await as(db, U.juan, `select id, code from public.create_hazard('${A}', '${P.sigA}', 'Planta', 'Ruido continuo', 'fisico', 'Protección auditiva', 10, 4, 100, 'EPP', null, null)`)).rows[0]
ok(hz.code === "PEL-" + YEAR + "-001", "Numeración PEL-AAAA-001 (031)")
const v = (await as(db, U.juan, `select np, nr, risk_level from public.hazards where id = '${hz.id}'`)).rows[0]
ok(v.np === 40 && v.nr === 4000 && v.risk_level === "I", "GTC-45 calcula NP=40, NR=4000, Nivel I en el servidor (031)")
await throws(() => as(db, U.juan, `select public.create_hazard('${A}', null, null, 'Malo', 'fisico', null, 5, 4, 100, null, null, null)`),
  "Valoración GTC-45 inválida rechazada (ND=5) (031)", "no válida")
await throws(() => as(db, U.sofia, `select public.create_hazard('${A}', null, 'x', 'Intruso', 'fisico', null, 2, 1, 10, null, null, null)`),
  "Sofía (consulta) no registra peligros (031)", "No puedes registrar")
await throws(() => as(db, U.beto, `select public.create_hazard('${A}', null, 'x', 'Intruso B', 'fisico', null, 2, 1, 10, null, null, null)`),
  "Beto (org B) no registra peligros en A (031)", "No puedes registrar")

// Editar recalcula; inactivar bloquea edición
await as(db, U.juan, `select public.update_hazard('${hz.id}', '${P.sigA}', 'Planta', 'Ruido', 'fisico', null, 2, 2, 25, null, null, null)`)
ok(Number((await as(db, U.juan, `select nr from public.hazards where id = '${hz.id}'`)).rows[0].nr) === 100, "Editar recalcula NR (2×2×25=100) (031)")
await as(db, U.juan, `select public.set_hazard_active('${hz.id}', false)`)
await throws(() => as(db, U.juan, `select public.update_hazard('${hz.id}', null, null, 'x', 'fisico', null, 2, 2, 25, null, null, null)`),
  "Un peligro inactivo no es editable (031)", "ya no es editable")

// Aislamiento + REST
ok((await as(db, U.beto, `select count(*)::int n from public.hazards where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve peligros de A (031)")
ok((await as(db, U.beto, `select count(*)::int n from public.norms where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve normas de A (031)")
await throws(() => as(db, U.sofia, `insert into public.norms (organization_id, code, name) values ('${A}', 'X', 'Intrusa')`),
  "Nadie inserta normas por REST (031)", "row-level security")
await throws(() => as(db, U.sofia, `insert into public.hazards (organization_id, code, hazard, classification, nd, ne, nc, np, nr, risk_level) values ('${A}', 'X', 'h', 'fisico', 2, 2, 25, 4, 100, 'III')`),
  "Nadie inserta peligros por REST (031)", "row-level security")
await throws(() => as(db, U.sofia, `insert into public.entity_norms (organization_id, norm_id, entity_type, entity_id) values ('${A}', '${norm45}', 'proceso', '${P.sigA}')`),
  "Nadie etiqueta por REST (031)", "row-level security")

// ========== 032 · Aspectos ambientales (ISO 14001) ==========
const asp = (await as(db, U.juan, `select id, code from public.create_aspect('${A}', '${P.sigA}', 'Lavado de equipos', 'Vertimiento de aguas', 'Contaminación hídrica', 'normal', 'Trampa de grasas', null, null, 3, 3, 2, 3, null)`)).rows[0]
ok(asp.code === "ASP-" + YEAR + "-001", "Numeración ASP-AAAA-001 (032)")
const av = (await as(db, U.juan, `select score, significance from public.env_aspects where id = '${asp.id}'`)).rows[0]
ok(av.score === 11 && av.significance === "significativo", "Significancia derivada en servidor: índice 11 ≥ 8 → significativo (032)")
// No significativo si índice < 8, condición normal y sin requisito legal
const asp2 = (await as(db, U.juan, `select id from public.create_aspect('${A}', null, 'Uso de papel', 'Consumo de papel', 'Agotamiento de recursos', 'normal', null, null, null, 1, 1, 1, 1, null)`)).rows[0]
ok((await as(db, U.juan, `select significance from public.env_aspects where id = '${asp2.id}'`)).rows[0].significance === "no_significativo", "Índice 4 sin emergencia ni legal → no significativo (032)")
// Emergencia fuerza significativo aunque el índice sea bajo
const asp3 = (await as(db, U.juan, `select id from public.create_aspect('${A}', null, 'Derrame', 'Derrame de químicos', 'Contaminación de suelo', 'emergencia', null, null, null, 1, 1, 1, 1, null)`)).rows[0]
ok((await as(db, U.juan, `select significance from public.env_aspects where id = '${asp3.id}'`)).rows[0].significance === "significativo", "Condición emergencia → significativo aunque índice bajo (032)")
await throws(() => as(db, U.juan, `select public.create_aspect('${A}', null, 'x', 'y', 'z', 'normal', null, null, null, 5, 1, 1, 1, null)`),
  "Valoración ambiental inválida rechazada (freq=5) (032)", "no válida")
await throws(() => as(db, U.sofia, `select public.create_aspect('${A}', null, 'x', 'y', 'z', 'normal', null, null, null, 1, 1, 1, 1, null)`),
  "Sofía (consulta) no registra aspectos (032)", "No puedes registrar")
await throws(() => as(db, U.beto, `select public.create_aspect('${A}', null, 'x', 'y', 'z', 'normal', null, null, null, 1, 1, 1, 1, null)`),
  "Beto (org B) no registra aspectos en A (032)", "No puedes registrar")

// Editar recalcula; inactivar bloquea
await as(db, U.juan, `select public.update_aspect('${asp.id}', '${P.sigA}', 'Lavado', 'Vertimiento', 'Contaminación', 'normal', null, null, null, 1, 1, 1, 1, null)`)
ok((await as(db, U.juan, `select score, significance from public.env_aspects where id = '${asp.id}'`)).rows[0].significance === "no_significativo", "Editar recalcula la significancia (índice 4) (032)")
await as(db, U.juan, `select public.set_aspect_active('${asp.id}', false)`)
await throws(() => as(db, U.juan, `select public.update_aspect('${asp.id}', null, 'x', 'y', 'z', 'normal', null, null, null, 1, 1, 1, 1, null)`),
  "Un aspecto inactivo no es editable (032)", "ya no es editable")

// Aislamiento + REST
ok((await as(db, U.beto, `select count(*)::int n from public.env_aspects where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve aspectos de A (032)")
await throws(() => as(db, U.sofia, `insert into public.env_aspects (organization_id, code, activity, aspect, impact, condition, freq, sev, reach, legal_crit, score, significance) values ('${A}', 'X', 'a', 'b', 'c', 'normal', 1, 1, 1, 1, 4, 'no_significativo')`),
  "Nadie inserta aspectos por REST (032)", "row-level security")
await throws(() => as(db, U.sofia, `insert into public.env_counters (organization_id, year, last_seq) values ('${A}', ${YEAR}, 9)`),
  "env_counters es deny-all (032)", "row-level security")

// ========== 033 · Constructor de formularios ==========
// Crear plantilla (juan lider_sig); numeración FORM-AAAA-001
const tpl = (await as(db, U.juan, `select id, code from public.create_template('${A}', 'Inspección de EPP', 'inspeccion', '${P.sigA}', '')`)).rows[0]
ok(tpl.code === "FORM-" + YEAR + "-001", "Numeración FORM-AAAA-001 (033)")
ok((await as(db, U.juan, `select status, draft_version from public.form_templates where id = '${tpl.id}'`)).rows[0].status === "borrador", "Plantilla nace en borrador v1 (033)")

// Rol: consulta y otra org no crean
await throws(() => as(db, U.sofia, `select public.create_template('${A}', 'X', 'otro', null, '')`),
  "Sofía (consulta) no crea plantillas (033)", "No puedes crear")
await throws(() => as(db, U.beto, `select public.create_template('${A}', 'X', 'otro', null, '')`),
  "Beto (org B) no crea plantillas en A (033)", "No puedes crear")

// Campos
const f1 = (await as(db, U.juan, `select public.add_field('${tpl.id}', 'texto', 'Nombre') as id`)).rows[0].id
await as(db, U.juan, `select public.update_field('${f1}', 'Nombre', null, true, null, null)`)
const f2 = (await as(db, U.juan, `select public.add_field('${tpl.id}', 'seleccion', 'Estado') as id`)).rows[0].id
await as(db, U.juan, `select public.update_field('${f2}', 'Estado', null, true, '["Bueno","Regular","Malo"]'::jsonb, null)`)
const f3 = (await as(db, U.juan, `select public.add_field('${tpl.id}', 'numero', 'Cantidad') as id`)).rows[0].id
await as(db, U.juan, `select public.update_field('${f3}', 'Cantidad', null, false, null, '{"min":0,"max":100}'::jsonb)`)
const f4 = (await as(db, U.juan, `select public.add_field('${tpl.id}', 'si_no', '¿Usa casco?') as id`)).rows[0].id
ok((await as(db, U.juan, `select count(*)::int n from public.form_fields where template_id = '${tpl.id}' and version = 1 and is_active`)).rows[0].n === 4, "4 campos en el borrador v1 (033)")

// Publicar sin campos falla (otra plantilla); publicar con campos ok
const tpl0 = (await as(db, U.juan, `select id from public.create_template('${A}', 'Vacía', 'otro', null, '')`)).rows[0]
await throws(() => as(db, U.juan, `select public.publish_template('${tpl0.id}')`), "No se publica una plantilla sin campos (033)", "al menos un campo")
await as(db, U.juan, `select public.publish_template('${tpl.id}')`)
ok((await as(db, U.juan, `select status, published_version from public.form_templates where id = '${tpl.id}'`)).rows[0].published_version === 1, "Publicar fija published_version=1 (033)")

// Publicada es inmutable sin nueva versión
await throws(() => as(db, U.juan, `select public.add_field('${tpl.id}', 'texto', 'Otro')`), "No se edita una plantilla publicada sin nueva versión (033)", "nueva versión")

// Diligenciar: miembro no-SIG (carlos aprobador) obtiene el formulario publicado y responde
const pubForm = (await as(db, U.carlos, `select public.get_published_form_by_code('${A}', '${tpl.code}') as f`)).rows[0].f
ok(Array.isArray(pubForm.fields) && pubForm.fields.length === 4 && pubForm.version === 1, "get_published_form_by_code devuelve la v1 publicada (033)")
// Requerido faltante
await throws(() => as(db, U.carlos, `select public.submit_new_submission('${tpl.id}', jsonb_build_object('${f2}', 'Bueno'))`),
  "Falta un requerido → rechazado (033)", "obligatorio")
// Opción inválida
await throws(() => as(db, U.carlos, `select public.submit_new_submission('${tpl.id}', jsonb_build_object('${f1}', 'Ana', '${f2}', 'Pésimo'))`),
  "Opción fuera del catálogo → rechazada (033)", "no es válida")
// Número fuera de rango
await throws(() => as(db, U.carlos, `select public.submit_new_submission('${tpl.id}', jsonb_build_object('${f1}', 'Ana', '${f2}', 'Bueno', '${f3}', 150))`),
  "Número sobre el máximo → rechazado (033)", "máximo")
// Respuesta válida
const sub = (await as(db, U.carlos, `select public.submit_new_submission('${tpl.id}', jsonb_build_object('${f1}', 'Ana', '${f2}', 'Bueno', '${f3}', 50, '${f4}', true)) as id`)).rows[0].id
ok(!!sub, "Carlos (miembro) envía una respuesta válida (033)")
ok((await as(db, U.carlos, `select status from public.form_submissions where id = '${sub}'`)).rows[0].status === "enviada", "La respuesta queda enviada (033)")

// Borrador: guarda y no cuenta como enviada hasta submit
const draft = (await as(db, U.diana, `select public.save_submission_draft(null, '${tpl.id}', jsonb_build_object('${f1}', 'Luis')) as id`)).rows[0].id
ok((await as(db, U.diana, `select status from public.form_submissions where id = '${draft}'`)).rows[0].status === "borrador", "save_submission_draft crea un borrador (033)")
// El autor diligencia su propio borrador; otro no
await throws(() => as(db, U.carlos, `select public.save_submission_draft('${draft}', '${tpl.id}', '{}'::jsonb)`),
  "Un borrador es privado de su autor (033)", "no encontrada")

// Nueva versión clona campos → draft 2 editable
await as(db, U.juan, `select public.new_template_version('${tpl.id}')`)
ok((await as(db, U.juan, `select draft_version from public.form_templates where id = '${tpl.id}'`)).rows[0].draft_version === 2, "new_template_version abre draft 2 (033)")
ok((await as(db, U.juan, `select count(*)::int n from public.form_fields where template_id = '${tpl.id}' and version = 2 and is_active`)).rows[0].n === 4, "La v2 clona los 4 campos (033)")
const f5 = (await as(db, U.juan, `select public.add_field('${tpl.id}', 'texto', 'Observación') as id`)).rows[0].id
ok(!!f5, "Se agregan campos al borrador v2 (033)")

// Archivar bloquea edición
await as(db, U.juan, `select public.set_template_archived('${tpl0.id}', true)`)
await throws(() => as(db, U.juan, `select public.update_template_data('${tpl0.id}', 'X', 'otro', null, '')`),
  "Una plantilla archivada no es editable (033)", "archivada")

// Visibilidad por rol
ok((await as(db, U.sofia, `select count(*)::int n from public.form_templates where organization_id = '${A}'`)).rows[0].n >= 1, "Sofía (consulta) ve las plantillas del SIG (033)")
ok((await as(db, U.beto, `select count(*)::int n from public.form_templates where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve plantillas de A (033)")

// REST directo + contador deny-all
await throws(() => as(db, U.juan, `insert into public.form_templates (organization_id, code, title, category) values ('${A}', 'Z', 'Z', 'otro')`),
  "Nadie inserta plantillas por REST (033)", "row-level security")
await throws(() => as(db, U.juan, `insert into public.form_counters (organization_id, year, last_seq) values ('${A}', ${YEAR}, 9)`),
  "form_counters es deny-all (033)", "row-level security")

// ========== 035 · SG-SST (Estándares Mínimos, Res. 0312) ==========
// Catálogo sembrado: 60 estándares, peso oficial weight_60 suma 100; aplicabilidad oficial 7 y 21
const sums = (await svc(`select coalesce(sum(weight_60),0) s60, count(*)::int n, count(*) filter (where applies_7)::int a7, count(*) filter (where applies_21)::int a21 from public.sst_standards`)).rows[0]
ok(Number(sums.n) === 60 && Number(sums.s60) === 100 && Number(sums.a7) === 7 && Number(sums.a21) === 21,
  "Catálogo: 60 estándares; weight_60 suma 100; aplican 7 y 21 por nivel (036)")

// Derivación de nivel por tamaño y riesgo
const ev60 = (await as(db, U.juan, `select id, code from public.create_evaluation('${A}', 2026, 60, 3)`)).rows[0]
ok(ev60.code === "SGSST-2026-001", "Numeración SGSST-2026-001 (035)")
ok((await as(db, U.juan, `select tier from public.sst_evaluations where id = '${ev60.id}'`)).rows[0].tier === 60, "60 trab. riesgo III → nivel 60 (035)")
ok((await as(db, U.juan, `select count(*)::int n from public.sst_evaluation_items where evaluation_id = '${ev60.id}'`)).rows[0].n === 60, "Se crean 60 ítems para el nivel 60 (035)")
const ev7 = (await as(db, U.juan, `select id from public.create_evaluation('${A}', 2026, 5, 2)`)).rows[0]
ok((await as(db, U.juan, `select tier from public.sst_evaluations where id = '${ev7.id}'`)).rows[0].tier === 7, "5 trab. riesgo II → nivel 7 (035)")
ok((await as(db, U.juan, `select count(*)::int n from public.sst_evaluation_items where evaluation_id = '${ev7.id}'`)).rows[0].n === 60, "El nivel 7 crea los 60 ítems (metodología oficial) (036)")
ok((await as(db, U.juan, `select count(*)::int n from public.sst_evaluation_items where evaluation_id = '${ev7.id}' and status = 'pendiente'`)).rows[0].n === 7, "7 estándares aplican al nivel 7; el resto se autocalifica (036)")
// Autocrédito: el puntaje inicial del nivel 7 = 100 - peso de los 7 aplicables (12.50) = 87.50
ok((await as(db, U.juan, `select score from public.sst_evaluations where id = '${ev7.id}'`)).rows[0].score === "87.50", "Nivel 7: los no aplicables se califican al máximo → puntaje inicial 87.50 (036)")
const ev21 = (await as(db, U.juan, `select id from public.create_evaluation('${A}', 2026, 30, 2)`)).rows[0]
ok((await as(db, U.juan, `select tier from public.sst_evaluations where id = '${ev21.id}'`)).rows[0].tier === 21, "30 trab. riesgo II → nivel 21 (035)")
ok((await as(db, U.juan, `select count(*)::int n from public.sst_evaluation_items where evaluation_id = '${ev21.id}' and status = 'pendiente'`)).rows[0].n === 21, "21 estándares aplican al nivel 21 (036)")
// Un estándar que no aplica al nivel no se puede diligenciar
const ev7na = (await as(db, U.juan, `select i.id from public.sst_evaluation_items i join public.sst_standards s on s.id = i.standard_id where i.evaluation_id = '${ev7.id}' and s.code = '6.1.1'`)).rows[0].id
await throws(() => as(db, U.juan, `select public.set_item_status('${ev7na}', 'no_cumple', null)`),
  "Un estándar que no aplica al nivel no se diligencia (036)", "no aplica a tu nivel")
const ev60b = (await as(db, U.juan, `select id from public.create_evaluation('${A}', 2026, 5, 4)`)).rows[0]
ok((await as(db, U.juan, `select tier from public.sst_evaluations where id = '${ev60b.id}'`)).rows[0].tier === 60, "Riesgo IV fuerza nivel 60 aunque sea micro (035)")

// Scoring server-side en el nivel 60
const itemOf = async (code) => (await as(db, U.juan, `select i.id from public.sst_evaluation_items i join public.sst_standards s on s.id = i.standard_id where i.evaluation_id = '${ev60.id}' and s.code = '${code}'`)).rows[0].id
await as(db, U.juan, `select public.set_item_status('${await itemOf("2.1.1")}', 'cumple', null)`)
ok((await as(db, U.juan, `select score from public.sst_evaluations where id = '${ev60.id}'`)).rows[0].score === "1.00", "Cumple de peso 1 → puntaje 1.00 (035)")
await as(db, U.juan, `select public.set_item_status('${await itemOf("5.1.1")}', 'no_aplica', 'No hay brigada por tamaño')`)
ok((await as(db, U.juan, `select score from public.sst_evaluations where id = '${ev60.id}'`)).rows[0].score === "6.00", "No aplica justificado de peso 5 suma al puntaje (035)")
await as(db, U.juan, `select public.set_item_status('${await itemOf("5.1.2")}', 'no_cumple', null)`)
ok((await as(db, U.juan, `select score, rating from public.sst_evaluations where id = '${ev60.id}'`)).rows[0].score === "6.00", "No cumple no suma (035)")
ok((await as(db, U.juan, `select rating from public.sst_evaluations where id = '${ev60.id}'`)).rows[0].rating === "critico", "Puntaje < 60 → valoración crítico (035)")

// No aplica exige justificación; cerrar exige todo respondido
const na221 = await itemOf("2.2.1")
await throws(() => as(db, U.juan, `select public.set_item_status('${na221}', 'no_aplica', null)`),
  "No aplica sin justificación es rechazado (035)", "Justifica")
await throws(() => as(db, U.juan, `select public.close_evaluation('${ev60.id}')`),
  "No se cierra con estándares pendientes (035)", "Faltan")

// Plan de mejora: solo para No cumple
await throws(() => as(db, U.juan, `select public.add_sst_action('${ev60.id}', (select id from public.sst_standards where code = '2.1.1'), 'x', null, null)`),
  "Acción de mejora sobre un Cumple es rechazada (035)", "No cumple")
const sstAct = (await as(db, U.juan, `select public.add_sst_action('${ev60.id}', (select id from public.sst_standards where code = '5.1.2'), 'Conformar brigada', null, null) as id`)).rows[0].id
ok(!!sstAct, "Acción de mejora sobre un No cumple se crea (035)")

// Roles y aislamiento
await throws(() => as(db, U.sofia, `select public.create_evaluation('${A}', 2026, 10, 2)`),
  "Sofía (consulta) no crea autoevaluaciones (035)", "No puedes crear")
await throws(() => as(db, U.beto, `select public.create_evaluation('${A}', 2026, 10, 2)`),
  "Beto (org B) no crea autoevaluaciones en A (035)", "No puedes crear")
ok((await as(db, U.beto, `select count(*)::int n from public.sst_evaluations where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve autoevaluaciones de A (035)")
ok((await as(db, U.sofia, `select count(*)::int n from public.sst_evaluations where organization_id = '${A}'`)).rows[0].n >= 1, "Sofía (consulta) ve las autoevaluaciones del SIG (035)")
// El catálogo es referencia pública para cualquier miembro
ok((await as(db, U.beto, `select count(*)::int n from public.sst_standards`)).rows[0].n === 60, "El catálogo de estándares es visible para cualquier miembro (035)")
await throws(() => as(db, U.juan, `insert into public.sst_evaluations (organization_id, code, period, worker_count, risk_class, tier) values ('${A}', 'X', 2026, 1, 1, 7)`),
  "Nadie inserta autoevaluaciones por REST (035)", "row-level security")
await throws(() => as(db, U.juan, `insert into public.sst_counters (organization_id, year, last_seq) values ('${A}', 2026, 9)`),
  "sst_counters es deny-all (035)", "row-level security")

// ========== 034 · Crubol-Agent copiloto — consumo por rol gestor ==========
await svc(`update public.organizations set ai_agent_enabled = true where id = '${A}'`)
await svc(`delete from public.ai_agent_usage where organization_id = '${A}'`)
ok((await as(db, U.juan, `select public.ai_agent_consume_record('${A}', 200, '2026-11') as r`)).rows[0].r === 199,
  "Líder SIG consume el copiloto; queda 199 de 200 (034)")
await throws(() => as(db, U.sofia, `select public.ai_agent_consume_record('${A}', 200, '2026-11')`),
  "Consulta no usa el copiloto (034)", "Sin permiso")
await throws(() => as(db, U.diana, `select public.ai_agent_consume_record('${A}', 200, '2026-11')`),
  "Responsable de control no usa el copiloto (034)", "Sin permiso")
await throws(() => as(db, U.beto, `select public.ai_agent_consume_record('${A}', 200, '2026-11')`),
  "Otra org no usa el copiloto en A (034)", "Sin permiso")
await svc(`update public.organizations set ai_agent_enabled = false where id = '${A}'`)
await throws(() => as(db, U.juan, `select public.ai_agent_consume_record('${A}', 200, '2026-11')`),
  "Con el agente apagado no se consume (034)", "no está habilitado")

// ========== 037 · Metrología (7.1.5) ==========
const eq = (await as(db, U.juan, `select id, code from public.create_equipment('${A}', 'Balanza analítica', 'instrumento', '${P.sigA}', 'Lab', '0-200 g', 'g', 'anual', null)`)).rows[0]
ok(eq.code === "MET-" + YEAR + "-001", "Numeración MET-AAAA-001 (037)")
await as(db, U.juan, `select public.register_calibration('${eq.id}', '2026-01-01', 'calibracion', 'conforme', 'masa E2', 'LAB-114', 'Metrocal', null)`)
const eqrow = (await as(db, U.juan, `select last_calibration_date::text ld, next_due_date::text nd from public.measurement_equipment where id = '${eq.id}'`)).rows[0]
ok(eqrow.ld === "2026-01-01" && eqrow.nd === "2027-01-01", "Registrar calibración deriva la próxima fecha (anual → +1 año) (037)")
ok((await as(db, U.juan, `select count(*)::int n from public.calibration_events where equipment_id = '${eq.id}'`)).rows[0].n === 1, "Se guarda el evento de calibración (037)")
await as(db, U.juan, `select public.set_equipment_service('${eq.id}', false)`)
ok((await as(db, U.juan, `select status from public.measurement_equipment where id = '${eq.id}'`)).rows[0].status === "fuera_de_servicio", "Dar de baja un equipo (037)")
await throws(() => as(db, U.sofia, `select public.create_equipment('${A}', 'x', null, null, null, null, null, 'anual', null)`),
  "Sofía (consulta) no registra equipos (037)", "No puedes registrar")
await throws(() => as(db, U.beto, `select public.create_equipment('${A}', 'x', null, null, null, null, null, 'anual', null)`),
  "Beto (org B) no registra equipos en A (037)", "No puedes registrar")
ok((await as(db, U.beto, `select count(*)::int n from public.measurement_equipment where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve equipos de A (037)")
await throws(() => as(db, U.juan, `insert into public.measurement_equipment (organization_id, code, name, calibration_frequency) values ('${A}', 'X', 'x', 'anual')`),
  "Nadie inserta equipos por REST (037)", "row-level security")
await throws(() => as(db, U.juan, `insert into public.metrology_counters (organization_id, year, last_seq) values ('${A}', ${YEAR}, 9)`),
  "metrology_counters es deny-all (037)", "row-level security")

// ========== 038 · Gestión del cambio (6.3) ==========
const cmb = (await as(db, U.juan, `select id, code from public.create_change('${A}', 'Cambio de proveedor', 'proceso', '${P.sigA}', 'Descripción', null)`)).rows[0]
ok(cmb.code === "CMB-" + YEAR + "-001", "Numeración CMB-AAAA-001 (038)")
ok((await as(db, U.juan, `select status from public.change_control where id = '${cmb.id}'`)).rows[0].status === "propuesto", "La solicitud nace en propuesto (038)")
// No se decide sin estar en evaluación
await throws(() => as(db, U.juan, `select public.decide_change('${cmb.id}', true, null)`),
  "No se decide un cambio sin evaluar (038)", "en evaluación")
// Evaluar exige impacto; luego pasa a en_evaluacion
await throws(() => as(db, U.juan, `select public.assess_change('${cmb.id}', '')`),
  "Evaluar exige análisis de impacto (038)", "análisis de impacto")
await as(db, U.juan, `select public.assess_change('${cmb.id}', 'Riesgos: bajos; Recursos: ninguno; Responsabilidades: Compras')`)
ok((await as(db, U.juan, `select status from public.change_control where id = '${cmb.id}'`)).rows[0].status === "en_evaluacion", "Con impacto pasa a en evaluación (038)")
// Solo el Líder SIG decide
await throws(() => as(db, U.diana, `select public.decide_change('${cmb.id}', true, null)`),
  "Responsable de control no aprueba cambios (038)", "Solo el Líder SIG")
await as(db, U.juan, `select public.decide_change('${cmb.id}', true, null)`)
ok((await as(db, U.juan, `select status from public.change_control where id = '${cmb.id}'`)).rows[0].status === "aprobado", "Líder SIG aprueba el cambio (038)")
await as(db, U.juan, `select public.implement_change('${cmb.id}', 'Hecho')`)
ok((await as(db, U.juan, `select status from public.change_control where id = '${cmb.id}'`)).rows[0].status === "implementado", "Un cambio aprobado se implementa (038)")
await throws(() => as(db, U.sofia, `select public.create_change('${A}', 'x', 'otro', null, null, null)`),
  "Sofía (consulta) no crea solicitudes (038)", "No puedes crear")
ok((await as(db, U.beto, `select count(*)::int n from public.change_control where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve cambios de A (038)")
await throws(() => as(db, U.juan, `insert into public.change_control (organization_id, code, title, change_type) values ('${A}', 'X', 'x', 'otro')`),
  "Nadie inserta cambios por REST (038)", "row-level security")


// ========== 040 · Capacitación / LMS (ISO 7.2) ==========
const course = (await as(db, U.juan, `select id, code from public.create_course('${A}', 'Inducción en SST', '${P.sigA}', 'Curso base', 70)`)).rows[0]
ok(course.code === "CAP-" + YEAR + "-001", "Numeración CAP-AAAA-001 (040)")
ok((await as(db, U.juan, `select status from public.courses where id = '${course.id}'`)).rows[0].status === "borrador", "El curso nace en borrador (040)")
// Publicar sin preguntas falla
await throws(() => as(db, U.juan, `select public.publish_course('${course.id}')`),
  "No se publica un curso sin preguntas (040)", "al menos una pregunta")
// Opciones inválidas (dos correctas) se rechazan
await throws(() => as(db, U.juan, `select public.add_course_question('${course.id}', '¿Qué es un EPP?', '[{"text":"a","correct":true},{"text":"b","correct":true}]'::jsonb)`),
  "Una pregunta con dos correctas se rechaza (040)", "exactamente una correcta")
// Pregunta válida
const q1 = (await as(db, U.juan, `select public.add_course_question('${course.id}', '¿Qué es un EPP?', '[{"text":"Elemento de Protección Personal","correct":true},{"text":"Equipo de Primeros Pasos","correct":false}]'::jsonb) as id`)).rows[0].id
ok((await as(db, U.juan, `select count(*)::int n from public.course_questions where course_id = '${course.id}' and is_active`)).rows[0].n === 1, "Se agrega la pregunta (040)")
// Consulta no puede editar preguntas
await throws(() => as(db, U.sofia, `select public.add_course_question('${course.id}', 'x', '[{"text":"a","correct":true},{"text":"b","correct":false}]'::jsonb)`),
  "Sofía (consulta) no edita preguntas (040)", "No puedes editar")
// Publicar
await as(db, U.juan, `select public.publish_course('${course.id}')`)
ok((await as(db, U.juan, `select status from public.courses where id = '${course.id}'`)).rows[0].status === "publicado", "Líder SIG publica el curso (040)")
// Tras publicar, las preguntas quedan congeladas
await throws(() => as(db, U.juan, `select public.add_course_question('${course.id}', 'y', '[{"text":"a","correct":true},{"text":"b","correct":false}]'::jsonb)`),
  "Un curso publicado no admite nuevas preguntas (040)", "borrador")
// get_course_to_take NO filtra la respuesta correcta
const take = (await as(db, U.sofia, `select public.get_course_to_take('${A}', '${course.code}') j`)).rows[0].j
ok(Array.isArray(take.questions) && take.questions.length === 1, "get_course_to_take devuelve las preguntas (040)")
ok(typeof take.questions[0].options[0] === "string", "Las opciones se entregan como texto plano (040)")
ok(!JSON.stringify(take).includes("correct"), "get_course_to_take NUNCA filtra la marca de correcta (040)")
// Calificación en el servidor: respuesta correcta → 100 aprobado
const capR1 = (await as(db, U.sofia, `select public.submit_course_attempt('${course.id}', '{"${q1}":0}'::jsonb) j`)).rows[0].j
ok(capR1.score === 100 && capR1.status === "aprobado", "Responder bien → 100% aprobado (040)")
// Reintento con respuesta incorrecta: upsert reemplaza, no duplica
const capR2 = (await as(db, U.sofia, `select public.submit_course_attempt('${course.id}', '{"${q1}":1}'::jsonb) j`)).rows[0].j
ok(capR2.score === 0 && capR2.status === "no_aprobado", "Responder mal → 0% no aprobado (040)")
ok((await as(db, U.juan, `select count(*)::int n from public.course_enrollments where course_id = '${course.id}' and user_id = '${U.sofia}'`)).rows[0].n === 1, "El reintento actualiza la inscripción (no duplica) (040)")
// Aislamiento y deny-all
await throws(() => as(db, U.sofia, `select public.create_course('${A}', 'x', null, null, 70)`),
  "Sofía (consulta) no crea cursos (040)", "No puedes crear")
await throws(() => as(db, U.beto, `select public.create_course('${A}', 'x', null, null, 70)`),
  "Beto (org B) no crea cursos en A (040)", "No puedes crear")
ok((await as(db, U.beto, `select count(*)::int n from public.courses where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve cursos de A (040)")
await throws(() => as(db, U.juan, `insert into public.courses (organization_id, code, title) values ('${A}', 'X', 'x')`),
  "Nadie inserta cursos por REST (040)", "row-level security")
await throws(() => as(db, U.juan, `insert into public.course_counters (organization_id, year, last_seq) values ('${A}', 2026, 9)`),
  "course_counters es deny-all (040)", "row-level security")
// Líder de proceso del curso puede crear uno de su proceso
const lauraCourse = (await as(db, U.laura, `select code from public.create_course('${A}', 'Curso de calidad', '${P.sigA}', null, 80)`)).rows[0]
ok(lauraCourse.code === "CAP-" + YEAR + "-002", "El líder del proceso crea cursos de su proceso (040)")


// ========== 041 · Contexto de la organización (ISO 4.1/4.2) ==========
// Cuestión externa (amenaza) con PESTEL
const ctxIssue = (await as(db, U.juan, `select public.create_context_issue('${A}', 'amenaza', 'legal', 'Cambio normativo del sector', 'Riesgo de incumplimiento', '${P.sigA}', null) as id`)).rows[0].id
ok((await as(db, U.juan, `select pestel from public.context_issues where id = '${ctxIssue}'`)).rows[0].pestel === "legal", "PESTEL se guarda en una cuestión externa (041)")
// PESTEL solo aplica a externas: en una interna se descarta en el servidor
const ctxF = (await as(db, U.juan, `select public.create_context_issue('${A}', 'fortaleza', 'legal', 'Equipo certificado', null, null, null) as id`)).rows[0].id
ok((await as(db, U.juan, `select pestel from public.context_issues where id = '${ctxF}'`)).rows[0].pestel === null, "PESTEL se ignora en una cuestión interna (041)")
// Generar riesgo desde la cuestión (4.1 → 6.1)
const ctxRisk = (await as(db, U.juan, `select * from public.generate_risk_from_issue('${ctxIssue}', '${P.sigA}', '${POS.calidad}', 3, 3)`)).rows[0]
ok(ctxRisk.code && ctxRisk.code.startsWith("R-"), "Generar riesgo desde la cuestión crea un R- (041)")
ok((await as(db, U.juan, `select risk_id from public.context_issues where id = '${ctxIssue}'`)).rows[0].risk_id === ctxRisk.id, "La cuestión queda enlazada al riesgo (041)")
ok((await as(db, U.juan, `select category from public.risks where id = '${ctxRisk.id}'`)).rows[0].category === "Contexto", "El riesgo generado se categoriza como Contexto (041)")
// Idempotente: no genera un segundo riesgo
await throws(() => as(db, U.juan, `select public.generate_risk_from_issue('${ctxIssue}', '${P.sigA}', '${POS.calidad}', 3, 3)`),
  "Una cuestión no genera dos riesgos (041)", "ya generó un riesgo")
// Consulta no gestiona el contexto
await throws(() => as(db, U.sofia, `select public.create_context_issue('${A}', 'fortaleza', null, 'x', null, null, null)`),
  "Sofía (consulta) no registra cuestiones (041)", "No puedes registrar")
await throws(() => as(db, U.sofia, `select public.generate_risk_from_issue('${ctxF}', '${P.sigA}', '${POS.calidad}', 3, 3)`),
  "Sofía (consulta) no genera riesgos desde el contexto (041)", "no puede identificar")
// Líder de proceso puede registrar en su proceso
const ctxLaura = (await as(db, U.laura, `select public.create_context_issue('${A}', 'debilidad', null, 'Alta rotación', null, '${P.sigA}', null) as id`)).rows[0].id
ok(ctxLaura != null, "El líder del proceso registra cuestiones de su proceso (041)")
// Archivar
await as(db, U.juan, `select public.set_issue_archived('${ctxIssue}', true)`)
ok((await as(db, U.juan, `select status from public.context_issues where id = '${ctxIssue}'`)).rows[0].status === "archivada", "Archivar una cuestión (041)")
// Partes interesadas
const ctxParty = (await as(db, U.juan, `select public.create_interested_party('${A}', 'ANLA', 'autoridad', 'cumplimiento', 'licencia ambiental', 'trimestral', '${P.sigA}', null) as id`)).rows[0].id
ok((await as(db, U.juan, `select party_type from public.interested_parties where id = '${ctxParty}'`)).rows[0].party_type === "autoridad", "Registrar una parte interesada (041)")
await as(db, U.juan, `select public.update_interested_party('${ctxParty}', 'ANLA', 'autoridad', 'cumplimiento', 'licencia ambiental vigente', 'mensual', '${P.sigA}', null)`)
ok((await as(db, U.juan, `select monitoring from public.interested_parties where id = '${ctxParty}'`)).rows[0].monitoring === "mensual", "Editar una parte interesada (041)")
await throws(() => as(db, U.sofia, `select public.create_interested_party('${A}', 'x', 'cliente', null, null, null, null, null)`),
  "Sofía (consulta) no registra partes (041)", "No puedes registrar")
// Aislamiento multi-tenant
ok((await as(db, U.beto, `select count(*)::int n from public.context_issues where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve cuestiones de A (041)")
ok((await as(db, U.beto, `select count(*)::int n from public.interested_parties where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve partes de A (041)")
await throws(() => as(db, U.beto, `select public.create_context_issue('${A}', 'fortaleza', null, 'x', null, null, null)`),
  "Beto (org B) no registra cuestiones en A (041)", "No puedes registrar")
await throws(() => as(db, U.juan, `insert into public.context_issues (organization_id, swot, description) values ('${A}', 'fortaleza', 'x')`),
  "Nadie inserta cuestiones por REST (041)", "row-level security")
await throws(() => as(db, U.juan, `insert into public.interested_parties (organization_id, name, party_type) values ('${A}', 'x', 'cliente')`),
  "Nadie inserta partes por REST (041)", "row-level security")


// ========== 042 · Caracterización de procesos (ISO 4.4) ==========
const NULLS9 = "null, null, null, null, null, null, null, null, null"
// Líder SIG caracteriza cualquier proceso
await as(db, U.juan, `select public.update_process_characterization('${P.sigA}', 'Asegurar la conformidad del SGC', 'Todos los procesos', 'Requisitos ISO', 'Dirección', 'SGC mantenido', 'Todos los procesos', 'Plataforma', 'Planear auditorías', 'Ejecutarlas', 'Revisar resultados', 'Mejorar')`)
ok((await as(db, U.juan, `select objective from public.processes where id = '${P.sigA}'`)).rows[0].objective === "Asegurar la conformidad del SGC", "Caracterizar guarda el objetivo (042)")
ok((await as(db, U.juan, `select characterized_at is not null ok from public.processes where id = '${P.sigA}'`)).rows[0].ok === true, "Caracterizar marca characterized_at (042)")
ok((await as(db, U.juan, `select phva_plan from public.processes where id = '${P.sigA}'`)).rows[0].phva_plan === "Planear auditorías", "Caracterizar guarda el PHVA (042)")
// Líder del proceso caracteriza su proceso
await as(db, U.laura, `select public.update_process_characterization('${P.sigA}', 'Objetivo ajustado', ${NULLS9}, null)`)
ok((await as(db, U.laura, `select objective from public.processes where id = '${P.sigA}'`)).rows[0].objective === "Objetivo ajustado", "El líder del proceso caracteriza su proceso (042)")
// Campos vacíos se normalizan a null
await as(db, U.juan, `select public.update_process_characterization('${P.sigA}', '   ', ${NULLS9}, null)`)
ok((await as(db, U.juan, `select objective from public.processes where id = '${P.sigA}'`)).rows[0].objective === null, "Un objetivo en blanco se normaliza a null (042)")
// Responsable de control (no líder) no caracteriza
await throws(() => as(db, U.diana, `select public.update_process_characterization('${P.tiA}', 'x', ${NULLS9}, null)`),
  "Responsable de control no caracteriza (042)", "No puedes caracterizar")
// Consulta no caracteriza
await throws(() => as(db, U.sofia, `select public.update_process_characterization('${P.sigA}', 'x', ${NULLS9}, null)`),
  "Sofía (consulta) no caracteriza (042)", "No puedes caracterizar")
// Otra organización no caracteriza procesos de A
await throws(() => as(db, U.beto, `select public.update_process_characterization('${P.sigA}', 'x', ${NULLS9}, null)`),
  "Beto (org B) no caracteriza procesos de A (042)", "no encontrado o sin acceso")


// ========== 043 · Tablero configurable (preferencia por usuario) ==========
await as(db, U.juan, `select public.set_dashboard_layout('${A}', '["panel_pqrs","kpi_mejora"]'::jsonb)`)
ok(JSON.stringify((await as(db, U.juan, `select layout from public.dashboard_preferences where organization_id = '${A}' and user_id = '${U.juan}'`)).rows[0].layout) === '["panel_pqrs","kpi_mejora"]', "Guarda el layout del usuario (043)")
// Upsert: la segunda llamada reemplaza y no duplica
await as(db, U.juan, `select public.set_dashboard_layout('${A}', '["kpi_desempeno"]'::jsonb)`)
ok((await as(db, U.juan, `select count(*)::int n from public.dashboard_preferences where organization_id = '${A}' and user_id = '${U.juan}'`)).rows[0].n === 1, "La preferencia es única por usuario (upsert) (043)")
ok(JSON.stringify((await as(db, U.juan, `select layout from public.dashboard_preferences where user_id = '${U.juan}'`)).rows[0].layout) === '["kpi_desempeno"]', "El upsert reemplaza el layout (043)")
// Aislamiento entre usuarios: Sofía no ve la preferencia de Juan
ok((await as(db, U.sofia, `select count(*)::int n from public.dashboard_preferences where organization_id = '${A}'`)).rows[0].n === 0, "Sofía no ve la preferencia de Juan (RLS por usuario) (043)")
// Claves inválidas rechazadas
await throws(() => as(db, U.juan, `select public.set_dashboard_layout('${A}', '["foo"]'::jsonb)`),
  "Una clave desconocida se rechaza (043)", "Bloque desconocido")
// No-array rechazado
await throws(() => as(db, U.juan, `select public.set_dashboard_layout('${A}', '{}'::jsonb)`),
  "Un layout no-array se rechaza (043)", "no válida")
// Otra organización no guarda preferencia en A
await throws(() => as(db, U.beto, `select public.set_dashboard_layout('${A}', '["kpi_mejora"]'::jsonb)`),
  "Beto (org B) no guarda preferencia en A (043)", "Sin acceso")
// Nadie inserta por REST
await throws(() => as(db, U.juan, `insert into public.dashboard_preferences (organization_id, user_id, layout) values ('${A}', '${U.juan}', '[]'::jsonb)`),
  "Nadie inserta preferencias por REST (043)", "row-level security")


// ========== 044 · Fotos de formularios / inspecciones (ISO + PWA) ==========
const fotoTpl = (await as(db, U.juan, `select * from public.create_template('${A}', 'Inspección EPP', 'inspeccion', null, '')`)).rows[0]
const fotoField = (await as(db, U.juan, `select public.add_field('${fotoTpl.id}', 'imagen', 'Fotos EPP') as id`)).rows[0].id
ok(fotoField != null, "Se agrega un campo de tipo imagen (044)")
await as(db, U.juan, `select public.update_field('${fotoField}', 'Fotos EPP', '', true, null, '{"max":2}'::jsonb)`)
await as(db, U.juan, `select public.publish_template('${fotoTpl.id}')`)
// Enviar con 2 fotos válidas (prefijo <org>/<template>/)
const fotoSub = (await as(db, U.juan, `select public.submit_new_submission('${fotoTpl.id}', jsonb_build_object('${fotoField}', jsonb_build_array('${A}/${fotoTpl.id}/a.jpg','${A}/${fotoTpl.id}/b.jpg'))) as id`)).rows[0].id
ok(fotoSub != null, "Se envía una respuesta con 2 fotos válidas (044)")
// Más fotos que el máximo (3 > 2) se rechaza
await throws(() => as(db, U.juan, `select public.submit_new_submission('${fotoTpl.id}', jsonb_build_object('${fotoField}', jsonb_build_array('${A}/${fotoTpl.id}/a.jpg','${A}/${fotoTpl.id}/b.jpg','${A}/${fotoTpl.id}/c.jpg')))`),
  "Supera el máximo de fotos (044)", "hasta 2 fotos")
// Ruta de otra organización se rechaza
await throws(() => as(db, U.juan, `select public.submit_new_submission('${fotoTpl.id}', jsonb_build_object('${fotoField}', jsonb_build_array('${B}/${fotoTpl.id}/a.jpg')))`),
  "Una foto con prefijo de otra org se rechaza (044)", "no es válida")
// Campo requerido vacío se rechaza
await throws(() => as(db, U.juan, `select public.submit_new_submission('${fotoTpl.id}', '{}'::jsonb)`),
  "El campo de foto obligatorio exige al menos una (044)", "obligatorio")
// storage_can_read_form_photo
ok((await as(db, U.juan, `select public.storage_can_read_form_photo('${A}/${fotoTpl.id}/a.jpg') ok`)).rows[0].ok === true, "Un miembro lee las fotos de su organización (044)")
ok((await as(db, U.beto, `select public.storage_can_read_form_photo('${A}/${fotoTpl.id}/a.jpg') ok`)).rows[0].ok === false, "Otra organización no lee las fotos de A (044)")
ok((await as(db, U.juan, `select public.storage_can_read_form_photo('${A}/solo-dos') ok`)).rows[0].ok === false, "Una ruta mal formada no es legible (044)")


// ========== 045 · Salida no conforme (ISO 8.7) ==========
const snc = (await as(db, U.juan, `select id, code from public.create_nc_output('${A}', 'Lote L-22 fuera de tolerancia', '${P.sigA}', current_date, 'Lote L-22, 120 u.')`)).rows[0]
ok(snc.code === "SNC-" + YEAR + "-001", "Numeración SNC-AAAA-001 (045)")
ok((await as(db, U.juan, `select status from public.nonconforming_outputs where id = '${snc.id}'`)).rows[0].status === "abierto", "La salida nace abierta (045)")
// No se cierra sin disposición
await throws(() => as(db, U.juan, `select public.close_output('${snc.id}')`),
  "No se cierra sin disposición (045)", "Aplica una disposición")
// Disposición inválida rechazada
await throws(() => as(db, U.juan, `select public.set_output_disposition('${snc.id}', 'inventada', null, false, null)`),
  "Disposición inválida rechazada (045)", "no válida")
// Aplicar disposición → tratada
await as(db, U.juan, `select public.set_output_disposition('${snc.id}', 'reproceso', 'Se reprocesa el lote', true, '${POS.lider}')`)
ok((await as(db, U.juan, `select status, disposition, customer_informed from public.nonconforming_outputs where id = '${snc.id}'`)).rows[0].status === "tratado", "Aplicar disposición pasa a tratada (045)")
// Generar NC desde la salida (8.7 → 10.2)
const sncNc = (await as(db, U.juan, `select * from public.generate_nc_from_snc('${snc.id}')`)).rows[0]
ok(sncNc.code && sncNc.code.startsWith("NC-"), "Generar NC desde la salida crea un NC- (045)")
ok((await as(db, U.juan, `select nonconformity_id from public.nonconforming_outputs where id = '${snc.id}'`)).rows[0].nonconformity_id === sncNc.id, "La salida queda enlazada a la NC (045)")
ok((await as(db, U.juan, `select source from public.nonconformities where id = '${sncNc.id}'`)).rows[0].source === "producto_servicio", "La NC generada tiene fuente producto_servicio (045)")
// Idempotente
await throws(() => as(db, U.juan, `select public.generate_nc_from_snc('${snc.id}')`),
  "Una salida no genera dos NC (045)", "ya generó una no conformidad")
// Cerrar
await as(db, U.juan, `select public.close_output('${snc.id}')`)
ok((await as(db, U.juan, `select status from public.nonconforming_outputs where id = '${snc.id}'`)).rows[0].status === "cerrado", "Cerrar con disposición pasa a cerrada (045)")
// Cerrada ya no es editable
await throws(() => as(db, U.juan, `select public.update_nc_output('${snc.id}', 'x', null, current_date, null)`),
  "Una salida cerrada no es editable (045)", "ya no es editable")
// Consulta no gestiona
await throws(() => as(db, U.sofia, `select public.create_nc_output('${A}', 'x', null, current_date, null)`),
  "Sofía (consulta) no registra salidas (045)", "No puedes registrar")
// Aislamiento
ok((await as(db, U.beto, `select count(*)::int n from public.nonconforming_outputs where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve salidas de A (045)")
await throws(() => as(db, U.beto, `select public.create_nc_output('${A}', 'x', null, current_date, null)`),
  "Beto (org B) no registra salidas en A (045)", "No puedes registrar")
await throws(() => as(db, U.juan, `insert into public.nonconforming_outputs (organization_id, code, description) values ('${A}', 'X', 'x')`),
  "Nadie inserta salidas por REST (045)", "row-level security")
await throws(() => as(db, U.juan, `insert into public.snc_counters (organization_id, year, last_seq) values ('${A}', 2026, 9)`),
  "snc_counters es deny-all (045)", "row-level security")


// ========== 046 · API pública: claves de API ==========
const H1 = "a".repeat(64)
const H2 = "b".repeat(64)
// Líder SIG crea una clave
const apiKey = (await as(db, U.juan, `select public.create_api_key('${A}', 'Integración BI', array['read:indicators','read:risks'], 'ck_live_ab12…', '${H1}') as id`)).rows[0].id
ok(apiKey != null, "Líder SIG crea una clave de API (046)")
ok((await as(db, U.juan, `select array_length(scopes,1) n from public.api_keys where id = '${apiKey}'`)).rows[0].n === 2, "La clave guarda sus scopes (046)")
ok((await as(db, U.juan, `select key_hash from public.api_keys where id = '${apiKey}'`)).rows[0].key_hash === H1, "La clave guarda solo el hash (046)")
// Admin de organización también puede (Oscar)
await as(db, U.oscar, `select public.create_api_key('${A}', 'Panel', array['read:audits'], 'ck_live_cd34…', '${H2}')`)
// Scope inválido rechazado
await throws(() => as(db, U.juan, `select public.create_api_key('${A}', 'x', array['write:todo'], 'p', '${"c".repeat(64)}')`),
  "Un permiso no válido se rechaza (046)", "Permiso no válido")
// Hash mal formado rechazado
await throws(() => as(db, U.juan, `select public.create_api_key('${A}', 'x', array['read:risks'], 'p', 'no-es-hash')`),
  "Un hash mal formado se rechaza (046)", "Clave no válida")
// Consulta no administra claves
await throws(() => as(db, U.sofia, `select public.create_api_key('${A}', 'x', array['read:risks'], 'p', '${"d".repeat(64)}')`),
  "Sofía (consulta) no crea claves (046)", "No puedes administrar")
// Responsable de control tampoco
await throws(() => as(db, U.diana, `select public.create_api_key('${A}', 'x', array['read:risks'], 'p', '${"e".repeat(64)}')`),
  "Responsable de control no crea claves (046)", "No puedes administrar")
// Revocar
await as(db, U.juan, `select public.revoke_api_key('${apiKey}')`)
ok((await as(db, U.juan, `select revoked_at is not null ok from public.api_keys where id = '${apiKey}'`)).rows[0].ok === true, "Revocar marca revoked_at (046)")
await throws(() => as(db, U.juan, `select public.revoke_api_key('${apiKey}')`),
  "Una clave revocada no se revoca de nuevo (046)", "ya está revocada")
// Visibilidad: quien administra ve; la consulta no
ok((await as(db, U.juan, `select count(*)::int n from public.api_keys where organization_id = '${A}'`)).rows[0].n >= 2, "El administrador ve las claves de su org (046)")
ok((await as(db, U.sofia, `select count(*)::int n from public.api_keys where organization_id = '${A}'`)).rows[0].n === 0, "La consulta no ve las claves (046)")
// Aislamiento multi-tenant
await throws(() => as(db, U.beto, `select public.create_api_key('${A}', 'x', array['read:risks'], 'p', '${"f".repeat(64)}')`),
  "Beto (org B) no crea claves en A (046)", "No puedes administrar")
ok((await as(db, U.beto, `select count(*)::int n from public.api_keys where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve las claves de A (046)")
// REST directo bloqueado
await throws(() => as(db, U.juan, `insert into public.api_keys (organization_id, name, key_prefix, key_hash, scopes) values ('${A}', 'x', 'p', '${"0".repeat(64)}', array['read:risks'])`),
  "Nadie inserta claves por REST (046)", "row-level security")


// ========== 047 · API de escritura + Webhooks ==========
// create_api_key acepta scopes de escritura
const wkey = (await as(db, U.juan, `select public.create_api_key('${A}', 'Escritura', array['write:nonconformities','read:indicators'], 'ck_live_w1…', '${"1".repeat(64)}') as id`)).rows[0].id
ok(wkey != null, "create_api_key acepta scopes de escritura (047)")
// Funciones api_* NO ejecutables por un usuario autenticado (solo el cliente de servicio)
await throws(() => as(db, U.juan, `select public.api_report_nonconformity('${A}', '${U.juan}', 'otro', null, 'x', 'y', 'mayor', current_date)`),
  "Un usuario no ejecuta api_report_nonconformity (047)", "permission denied")
// Vía cliente de servicio (como la API): crea NC atribuida al actor
const apiNc = (await svc(`select * from public.api_report_nonconformity('${A}', '${U.juan}', 'otro', '${P.sigA}', 'Desvío API', 'Detalle', 'mayor', current_date)`)).rows[0]
ok(apiNc.code && apiNc.code.startsWith("NC-"), "api_report_nonconformity crea una NC (047)")
ok((await svc(`select created_by from public.nonconformities where id = '${apiNc.id}'`)).rows[0].created_by === U.juan, "La NC por API queda atribuida al creador de la key (047)")
// Proceso de otra organización se rechaza
await throws(() => svc(`select * from public.api_report_nonconformity('${A}', '${U.juan}', 'otro', '${P.sigB}', 'x', 'y', 'mayor', current_date)`),
  "api_report_nonconformity rechaza proceso de otra org (047)", "no pertenece")
// source/severity inválidos
await throws(() => svc(`select * from public.api_report_nonconformity('${A}', '${U.juan}', 'inventado', null, 'x', 'y', 'mayor', current_date)`),
  "source no válido se rechaza (047)", "source no válido")
await throws(() => svc(`select * from public.api_report_nonconformity('${A}', '${U.juan}', 'otro', null, 'x', 'y', 'altisima', current_date)`),
  "severity no válido se rechaza (047)", "severity no válido")
// api_create_pqrs sin PII mínima
const apiPqrs = (await svc(`select * from public.api_create_pqrs('${A}', '${U.juan}', 'peticion', 'web', null, null, null, 'Solicitud', current_date, 15)`)).rows[0]
ok(apiPqrs.code && apiPqrs.code.startsWith("PQRS-"), "api_create_pqrs crea una PQRS (047)")

// --- Webhooks ---
// Líder SIG (can_manage_org) crea un endpoint suscrito a nonconformity.created
const ep = (await as(db, U.juan, `select public.create_webhook_endpoint('${A}', 'https://cliente.example/hook', array['nonconformity.created'], 'whsec_test') as id`)).rows[0].id
ok(ep != null, "Se crea un endpoint de webhook (047)")
// URL http:// se rechaza
await throws(() => as(db, U.juan, `select public.create_webhook_endpoint('${A}', 'http://inseguro', array['pqrs.created'], 's')`),
  "URL no https se rechaza (047)", "https")
// Evento inválido
await throws(() => as(db, U.juan, `select public.create_webhook_endpoint('${A}', 'https://x.example', array['foo.bar'], 's')`),
  "Evento inválido se rechaza (047)", "Evento no válido")
// Crear una NC dispara el encolado hacia el endpoint suscrito
await svc(`select * from public.api_report_nonconformity('${A}', '${U.juan}', 'otro', null, 'Dispara webhook', 'x', 'menor', current_date)`)
ok((await as(db, U.juan, `select count(*)::int n from public.webhook_deliveries where endpoint_id = '${ep}' and event = 'nonconformity.created'`)).rows[0].n >= 1, "Crear NC encola entregas al endpoint suscrito (047)")
// Una PQRS NO encola a un endpoint que solo escucha NC
const beforePqrs = (await as(db, U.juan, `select count(*)::int n from public.webhook_deliveries where endpoint_id = '${ep}'`)).rows[0].n
await svc(`select * from public.api_create_pqrs('${A}', '${U.juan}', 'queja', 'web', null, null, null, 'Otra queja de prueba', current_date, 15)`)
ok((await as(db, U.juan, `select count(*)::int n from public.webhook_deliveries where endpoint_id = '${ep}'`)).rows[0].n === beforePqrs, "Un evento no suscrito no se encola (047)")
// Revocar el endpoint: deja de encolar
await as(db, U.juan, `select public.revoke_webhook_endpoint('${ep}')`)
const afterRevoke = (await as(db, U.juan, `select count(*)::int n from public.webhook_deliveries where endpoint_id = '${ep}'`)).rows[0].n
await svc(`select * from public.api_report_nonconformity('${A}', '${U.juan}', 'otro', null, 'Tras revocar', 'x', 'menor', current_date)`)
ok((await as(db, U.juan, `select count(*)::int n from public.webhook_deliveries where endpoint_id = '${ep}'`)).rows[0].n === afterRevoke, "Un endpoint revocado no recibe más entregas (047)")
// Consulta no administra webhooks
await throws(() => as(db, U.sofia, `select public.create_webhook_endpoint('${A}', 'https://x.example', array['pqrs.created'], 's')`),
  "Sofía (consulta) no crea webhooks (047)", "No puedes administrar")
// Aislamiento: Beto no ve los webhooks de A
ok((await as(db, U.beto, `select count(*)::int n from public.webhook_endpoints where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve webhooks de A (047)")
// Idempotencia deny-all
await throws(() => as(db, U.juan, `insert into public.api_idempotency (organization_id, idem_key, response) values ('${A}', 'k', '{}'::jsonb)`),
  "api_idempotency es deny-all (047)", "row-level security")


// ========== 048 · Gestión del conocimiento (ISO 7.1.6) ==========
const art = (await as(db, U.juan, `select id, code from public.create_knowledge_article('${A}', 'Buena práctica de inducción', 'buenas_practicas', '${P.sigA}', 'Contenido del artículo', 'Taller interno')`)).rows[0]
ok(art.code === "KN-" + YEAR + "-001", "Numeración KN-AAAA-001 (048)")
// Categoría inválida
await throws(() => as(db, U.juan, `select public.create_knowledge_article('${A}', 'x y z', 'inventada', null, 'contenido', null)`),
  "Categoría inválida se rechaza (048)", "Categoría no válida")
// Visible para cualquier miembro (incluso la consulta)
ok((await as(db, U.sofia, `select count(*)::int n from public.knowledge_articles where organization_id = '${A}'`)).rows[0].n >= 1, "La consulta ve la base de conocimiento (048)")
// La consulta NO gestiona
await throws(() => as(db, U.sofia, `select public.create_knowledge_article('${A}', 'x y z', 'faq', null, 'c', null)`),
  "Sofía (consulta) no crea artículos (048)", "No puedes crear")
// Editar y archivar por el líder
await as(db, U.juan, `select public.update_knowledge_article('${art.id}', 'Inducción v2', 'know_how', '${P.sigA}', 'Nuevo contenido', null)`)
ok((await as(db, U.juan, `select category from public.knowledge_articles where id = '${art.id}'`)).rows[0].category === "know_how", "Editar un artículo (048)")
await as(db, U.juan, `select public.set_article_archived('${art.id}', true)`)
ok((await as(db, U.juan, `select status from public.knowledge_articles where id = '${art.id}'`)).rows[0].status === "archivado", "Archivar un artículo (048)")
// Lección desde una NC (reusa una NC existente de A)
const someNc = (await as(db, U.juan, `select id, code from public.nonconformities where organization_id = '${A}' limit 1`)).rows[0]
const lesson = (await as(db, U.juan, `select * from public.create_article_from_nc('${someNc.id}')`)).rows[0]
ok(lesson.code && lesson.code.startsWith("KN-"), "Registrar lección desde una NC crea un KN- (048)")
ok((await as(db, U.juan, `select category, source_nc_id from public.knowledge_articles where id = '${lesson.id}'`)).rows[0].category === "lecciones_aprendidas", "La lección es de categoría lecciones_aprendidas y queda ligada a la NC (048)")
// Aislamiento
ok((await as(db, U.beto, `select count(*)::int n from public.knowledge_articles where organization_id = '${A}'`)).rows[0].n === 0, "Beto (org B) no ve el conocimiento de A (048)")
await throws(() => as(db, U.beto, `select public.create_knowledge_article('${A}', 'x y z', 'faq', null, 'c', null)`),
  "Beto (org B) no crea artículos en A (048)", "No puedes crear")
await throws(() => as(db, U.juan, `insert into public.knowledge_articles (organization_id, code, title, category, content) values ('${A}', 'X', 'xxx', 'faq', 'c')`),
  "Nadie inserta artículos por REST (048)", "row-level security")
await throws(() => as(db, U.juan, `insert into public.kn_counters (organization_id, year, last_seq) values ('${A}', 2026, 9)`),
  "kn_counters es deny-all (048)", "row-level security")

// ========== 049 · Portal externo (PQRS pública + autoevaluación de proveedor) ==========
// --- Buzón público de PQRS ---
const portalTok = (await as(db, U.juan, `select public.set_public_pqrs_portal('${A}', true, 'portaltokenA1234567890') t`)).rows[0].t
ok(portalTok === "portaltokenA1234567890", "El Admin activa el buzón y obtiene el token (049)")
await throws(() => as(db, U.sofia, `select public.set_public_pqrs_portal('${A}', true, null)`),
  "Sofía (consulta) no administra el buzón (049)", "No puedes administrar")
await throws(() => as(db, U.beto, `select public.set_public_pqrs_portal('${A}', true, null)`),
  "Beto (org B) no administra el buzón de A (049)", "No puedes administrar")

// anon: lectura por token y radicación
ok((await anon(`select organization from public.get_public_pqrs_portal('${portalTok}')`)).rows[0].organization != null, "anon lee el buzón por token (049)")
ok((await anon(`select count(*)::int n from public.get_public_pqrs_portal('inexistente')`)).rows[0].n === 0, "Token de buzón inexistente no revela nada (049)")
await anon(`select public.submit_public_pqrs('${portalTok}', 'queja', 'Cliente Web', 'web@cliente.co', 'El servicio llegó con retraso considerable.')`)
const webPqrs = (await svc(`select code, channel, type, created_by from public.pqrs_cases where organization_id='${A}' and channel='web' order by created_at desc limit 1`)).rows[0]
ok(webPqrs && webPqrs.channel === "web" && webPqrs.type === "queja", "anon radica una PQRS por el canal web (049)")
ok(webPqrs.created_by === U.juan, "La PQRS pública queda a cargo del creador del buzón (049)")
await throws(() => anon(`select public.submit_public_pqrs('${portalTok}', 'inventado', null, null, 'texto válido')`),
  "Tipo inválido en PQRS pública rechazado (049)", "no válido")
await throws(() => anon(`select public.submit_public_pqrs('${portalTok}', 'queja', null, null, 'x')`),
  "Descripción muy corta rechazada (049)", "Cuéntanos")

// Desactivar el buzón: deja de recibir
await as(db, U.juan, `select public.set_public_pqrs_portal('${A}', false, null)`)
ok((await anon(`select count(*)::int n from public.get_public_pqrs_portal('${portalTok}')`)).rows[0].n === 0, "Buzón desactivado no se lee por token (049)")
await throws(() => anon(`select public.submit_public_pqrs('${portalTok}', 'peticion', null, null, 'Hola, una petición.')`),
  "Buzón desactivado no acepta PQRS (049)", "no está disponible")

// anon no lee la tabla del buzón por REST
await throws(() => anon(`select count(*) from public.public_pqrs_portals`), "anon no lee buzones por REST (049)", "permission denied")

// --- Autoevaluación de proveedor (prov es un proveedor activo de A, proceso sigA) ---
await as(db, U.juan, `select public.issue_supplier_self_assessment('${prov.id}', 'provtoken1234567890ab')`)
await throws(() => as(db, U.sofia, `select public.issue_supplier_self_assessment('${prov.id}', 'otrotok')`),
  "Sofía (consulta) no genera el enlace de autoevaluación (049)", "No puedes generar")
await throws(() => as(db, U.beto, `select public.issue_supplier_self_assessment('${prov.id}', 'betotok')`),
  "Beto (org B) no genera el enlace de un proveedor de A (049)", "sin acceso")

ok((await anon(`select supplier from public.get_supplier_self_assessment('provtoken1234567890ab')`)).rows[0].supplier != null, "anon lee la autoevaluación por token (049)")
ok((await anon(`select count(*)::int n from public.get_supplier_self_assessment('inexistente')`)).rows[0].n === 0, "Token de autoevaluación inexistente no revela nada (049)")
await anon(`select public.submit_supplier_self_assessment('provtoken1234567890ab', 88, 'Cumplimos los requisitos.', null)`)
const sa = (await svc(`select id, score, status from public.supplier_self_assessments where supplier_id='${prov.id}'`)).rows[0]
ok(sa && Number(sa.score) === 88 && sa.status === "recibida", "anon envía su autoevaluación (recibida) (049)")
await throws(() => anon(`select public.submit_supplier_self_assessment('provtoken1234567890ab', 120, null, null)`),
  "Puntaje de autoevaluación fuera de rango rechazado (049)", "fuera de rango")

// El SIG la revisa
await as(db, U.juan, `select public.mark_self_assessment_reviewed('${sa.id}')`)
ok((await as(db, U.juan, `select status from public.supplier_self_assessments where id='${sa.id}'`)).rows[0].status === "revisada", "El SIG marca la autoevaluación como revisada (049)")

// Aislamiento + anon no lee la tabla por REST
ok((await as(db, U.beto, `select count(*)::int n from public.supplier_self_assessments where organization_id='${A}'`)).rows[0].n === 0, "Beto (org B) no ve autoevaluaciones de A (049)")
await throws(() => anon(`select count(*) from public.supplier_self_assessments`), "anon no lee autoevaluaciones por REST (049)", "permission denied")

// ========== 050 · Multi-idioma (idioma por usuario + traducción de contenido) ==========
// Idioma del usuario
await as(db, U.juan, `select public.set_user_locale('en')`)
ok((await svc(`select locale from public.profiles where id = '${U.juan}'`)).rows[0].locale === "en", "El usuario cambia su idioma (050)")
await throws(() => as(db, U.juan, `select public.set_user_locale('fr')`), "Idioma no válido rechazado (050)", "no válido")
await as(db, U.juan, `select public.set_user_locale('es')`)

// Traducción de contenido: DOC es un documento de A (proceso sigA). Laura es elaborador del proceso; Juan líder SIG.
await as(db, U.laura, `select public.set_content_translation('documento', '${DOC}', 'en', 'title', 'Document control')`)
ok((await as(db, U.juan, `select value from public.content_translations where entity_type='documento' and entity_id='${DOC}' and locale='en' and field='title'`)).rows[0].value === "Document control", "Se guarda la traducción EN del título (050)")
// Sofía (consulta) no traduce
await throws(() => as(db, U.sofia, `select public.set_content_translation('documento', '${DOC}', 'en', 'title', 'Intrusa')`),
  "Sofía (consulta) no traduce documentos (050)", "No puedes traducir")
// Beto (org B) no traduce un documento de A
await throws(() => as(db, U.beto, `select public.set_content_translation('documento', '${DOC}', 'en', 'title', 'Intruso')`),
  "Beto (org B) no traduce un documento de A (050)", "sin acceso")
// Campo / entidad fuera de la lista blanca
await throws(() => as(db, U.laura, `select public.set_content_translation('documento', '${DOC}', 'en', 'body', 'x')`),
  "Campo no traducible rechazado (050)", "no traducible")
await throws(() => as(db, U.laura, `select public.set_content_translation('otra', '${DOC}', 'en', 'title', 'x')`),
  "Entidad no traducible rechazada (050)", "no traducible")
// Idioma inválido en la traducción
await throws(() => as(db, U.laura, `select public.set_content_translation('documento', '${DOC}', 'fr', 'title', 'x')`),
  "Idioma inválido en la traducción rechazado (050)", "no válido")
// Vaciar = sin traducción (baja lógica, sin hard delete)
await as(db, U.laura, `select public.set_content_translation('documento', '${DOC}', 'en', 'title', '')`)
ok((await as(db, U.juan, `select value from public.content_translations where entity_type='documento' and entity_id='${DOC}' and locale='en' and field='title'`)).rows[0].value === "", "Vaciar el campo deja la traducción en blanco (050)")
// Aislamiento + REST
ok((await as(db, U.beto, `select count(*)::int n from public.content_translations where organization_id='${A}'`)).rows[0].n === 0, "Beto (org B) no ve traducciones de A (050)")
await throws(() => as(db, U.sofia, `insert into public.content_translations (organization_id, entity_type, entity_id, locale, field, value) values ('${A}', 'documento', '${DOC}', 'en', 'title', 'x')`),
  "Nadie inserta traducciones por REST (050)", "row-level security")

// ========== 051 · BPM-lite: Solicitudes y aprobaciones configurables ==========
// Gestión de flujos: Líder SIG o Admin de organización.
const flow = (await as(db, U.juan, `select id from public.create_approval_flow('${A}', 'Aprobación de compra', 'Compras menores')`)).rows[0].id
await throws(() => as(db, U.sofia, `select public.create_approval_flow('${A}', 'Intrusa', null)`),
  "Sofía (sin rol) no crea flujos (051)", "No puedes gestionar")
await throws(() => as(db, U.beto, `select public.create_approval_flow('${A}', 'Intrusa B', null)`),
  "Beto (org B) no crea flujos en A (051)", "No puedes gestionar")
// Pasos: cargo debe ser de la org
await as(db, U.juan, `select public.set_flow_steps('${flow}', '[{"name":"Jefe de área","position":"${POS.calidad}"},{"name":"Gerencia","position":"${POS.gerente}"}]'::jsonb)`)
await throws(() => as(db, U.juan, `select public.set_flow_steps('${flow}', '[{"name":"X","position":"${POS.betoB}"}]'::jsonb)`),
  "Un paso con cargo de otra org se rechaza (051)", "cargo inválido")

// Radicar: cualquier miembro activo
const sol1 = (await as(db, U.sofia, `select code from public.create_approval_request('${A}', '${flow}', 'Compra de laptops', 'Para el equipo')`)).rows[0].code
ok(sol1 === "SOL-" + YEAR + "-001", "Numeración SOL-AAAA-001 (051)")
const req1 = (await svc(`select id from public.approval_requests where organization_id='${A}' and code='${sol1}'`)).rows[0].id
// Pasos copiados: editar la plantilla no altera la solicitud en curso
await as(db, U.juan, `select public.set_flow_steps('${flow}', '[{"name":"Solo gerencia","position":"${POS.gerente}"}]'::jsonb)`)
ok((await svc(`select count(*)::int n from public.approval_request_steps where request_id='${req1}'`)).rows[0].n === 2, "Los pasos se copian al radicar: editar la plantilla no afecta lo en curso (051)")
// Tarea del primer paso para el cargo aprobador
ok((await svc(`select count(*)::int n from public.tasks where entity_id='${req1}' and type='aprobar_solicitud' and assignee_position_id='${POS.calidad}' and status='pendiente'`)).rows[0].n === 1, "Se crea la tarea de aprobación del primer paso (051)")

// Solo el cargo del paso actual decide
await throws(() => as(db, U.carlos, `select public.decide_approval_step('${req1}', true, null)`),
  "Carlos (gerencia) no decide el paso 1 (051)", "No te corresponde")
await throws(() => as(db, U.sofia, `select public.decide_approval_step('${req1}', true, null)`),
  "El solicitante no decide si no es el cargo (051)", "No te corresponde")
await as(db, U.laura, `select public.decide_approval_step('${req1}', true, 'Ok del área')`)
ok((await svc(`select current_step, status from public.approval_requests where id='${req1}'`)).rows[0].current_step === 2, "Aprobar el paso 1 avanza al paso 2 (051)")
// La tarea del paso 1 se completa y aparece la del paso 2
ok((await svc(`select count(*)::int n from public.tasks where entity_id='${req1}' and assignee_position_id='${POS.gerente}' and status='pendiente'`)).rows[0].n === 1, "El paso siguiente genera su tarea (051)")
await as(db, U.carlos, `select public.decide_approval_step('${req1}', true, null)`)
ok((await svc(`select status from public.approval_requests where id='${req1}'`)).rows[0].status === "aprobada", "Aprobar el último paso deja la solicitud aprobada (051)")
await throws(() => as(db, U.carlos, `select public.decide_approval_step('${req1}', true, null)`),
  "Una solicitud cerrada no se vuelve a decidir (051)", "ya no está en curso")

// Rechazo termina la solicitud
await as(db, U.juan, `select public.set_flow_steps('${flow}', '[{"name":"Jefe de área","position":"${POS.calidad}"},{"name":"Gerencia","position":"${POS.gerente}"}]'::jsonb)`)
const sol2 = (await as(db, U.sofia, `select code from public.create_approval_request('${A}', '${flow}', 'Compra rechazable', null)`)).rows[0].code
const req2 = (await svc(`select id from public.approval_requests where code='${sol2}' and organization_id='${A}'`)).rows[0].id
await throws(() => as(db, U.laura, `select public.decide_approval_step('${req2}', false, null)`),
  "Rechazar exige motivo (051)", "motivo del rechazo")
await as(db, U.laura, `select public.decide_approval_step('${req2}', false, 'No hay presupuesto')`)
ok((await svc(`select status from public.approval_requests where id='${req2}'`)).rows[0].status === "rechazada", "Rechazar un paso cierra la solicitud (051)")

// Anular: el solicitante o el Líder SIG, mientras esté pendiente
const sol3 = (await as(db, U.sofia, `select code from public.create_approval_request('${A}', '${flow}', 'Compra anulable', null)`)).rows[0].code
const req3 = (await svc(`select id from public.approval_requests where code='${sol3}' and organization_id='${A}'`)).rows[0].id
await throws(() => as(db, U.diana, `select public.cancel_approval_request('${req3}', null)`),
  "Un tercero no anula la solicitud ajena (051)", "No puedes anular")
await as(db, U.sofia, `select public.cancel_approval_request('${req3}', 'Ya no se necesita')`)
ok((await svc(`select status from public.approval_requests where id='${req3}'`)).rows[0].status === "anulada", "El solicitante anula su solicitud (051)")

// Aislamiento + REST
ok((await as(db, U.beto, `select count(*)::int n from public.approval_requests where organization_id='${A}'`)).rows[0].n === 0, "Beto (org B) no ve solicitudes de A (051)")
await throws(() => as(db, U.sofia, `insert into public.approval_flows (organization_id, name) values ('${A}', 'X')`),
  "Nadie inserta flujos por REST (051)", "row-level security")
await throws(() => as(db, U.sofia, `insert into public.sol_counters (organization_id, year, last_seq) values ('${A}', ${YEAR}, 9)`),
  "sol_counters es deny-all (051)", "row-level security")

// ========== 052 · BI / Constructor de informes (saved_reports) ==========
// Compartir es del Líder SIG/Admin; privado lo crea cualquier miembro.
const repShared = (await as(db, U.laura, `select id from public.create_saved_report('${A}', 'NC por proceso', 'nc', '{}'::jsonb, 'compartida')`)).rows[0].id
const repMine = (await as(db, U.sofia, `select id from public.create_saved_report('${A}', 'Mi borrador', 'pqrs', '{}'::jsonb, 'privada')`)).rows[0].id
await throws(() => as(db, U.sofia, `select public.create_saved_report('${A}', 'Intenta compartir', 'nc', '{}'::jsonb, 'compartida')`),
  "La consulta no comparte informes (052)", "Líder SIG")
await throws(() => as(db, U.beto, `select public.create_saved_report('${A}', 'Intruso', 'nc', '{}'::jsonb, 'privada')`),
  "Beto (org B) no crea informes en A (052)", "Sin acceso")
await throws(() => as(db, U.laura, `select public.create_saved_report('${A}', 'Fuente mala', 'inventado', '{}'::jsonb, 'privada')`),
  "Fuente no válida rechazada (052)", "Fuente no válida")

// Visibilidad: compartida la ven todos; la privada solo su autor.
ok((await as(db, U.sofia, `select count(*)::int n from public.saved_reports where organization_id='${A}'`)).rows[0].n === 2, "Sofía ve el compartido y su propio privado (052)")
ok((await as(db, U.juan, `select count(*)::int n from public.saved_reports where id='${repMine}'`)).rows[0].n === 0, "Juan no ve el informe privado de Sofía (052)")
ok((await as(db, U.juan, `select count(*)::int n from public.saved_reports where id='${repShared}'`)).rows[0].n === 1, "Juan ve el informe compartido (052)")

// Edición: autor del privado o Líder SIG del compartido.
await as(db, U.sofia, `select public.update_saved_report('${repMine}', 'Mi borrador v2', 'pqrs', '{}'::jsonb, 'privada')`)
ok((await as(db, U.sofia, `select name from public.saved_reports where id='${repMine}'`)).rows[0].name === "Mi borrador v2", "El autor edita su informe privado (052)")
await throws(() => as(db, U.sofia, `select public.update_saved_report('${repShared}', 'Hackeado', 'nc', '{}'::jsonb, 'compartida')`),
  "La consulta no edita un informe compartido ajeno (052)", "No puedes editar")
await as(db, U.juan, `select public.update_saved_report('${repShared}', 'NC por proceso v2', 'nc', '{}'::jsonb, 'compartida')`)
ok((await as(db, U.juan, `select name from public.saved_reports where id='${repShared}'`)).rows[0].name === "NC por proceso v2", "El Líder SIG edita el informe compartido (052)")

// Eliminar (baja lógica): desaparece de la vista.
await as(db, U.sofia, `select public.discard_saved_report('${repMine}')`)
ok((await as(db, U.sofia, `select count(*)::int n from public.saved_reports where id='${repMine}'`)).rows[0].n === 0, "Eliminar un informe lo oculta (baja lógica) (052)")

// Aislamiento + REST
ok((await as(db, U.beto, `select count(*)::int n from public.saved_reports where organization_id='${A}'`)).rows[0].n === 0, "Beto (org B) no ve informes de A (052)")
await throws(() => as(db, U.sofia, `insert into public.saved_reports (organization_id, name, dataset) values ('${A}', 'X', 'nc')`),
  "Nadie inserta informes por REST (052)", "row-level security")

// ========== 053 · Notificaciones Slack/Teams (chat_notifiers + encolado) ==========
// Configuración solo Admin/Líder SIG.
const notif = (await as(db, U.oscar, `select id from public.create_chat_notifier('${A}', 'slack', 'https://hooks.slack.com/services/abc', 'Canal Calidad', array['nc','pqrs'])`)).rows[0].id
await throws(() => as(db, U.sofia, `select public.create_chat_notifier('${A}', 'slack', 'https://hooks.slack.com/x', 'Intrusa', array['nc'])`),
  "Sofía (consulta) no configura notificaciones (053)", "No puedes configurar")
await throws(() => as(db, U.beto, `select public.create_chat_notifier('${A}', 'slack', 'https://hooks.slack.com/x', 'Intrusa B', array['nc'])`),
  "Beto (org B) no configura notificaciones en A (053)", "No puedes configurar")
await throws(() => as(db, U.oscar, `select public.create_chat_notifier('${A}', 'discord', 'https://hooks.slack.com/x', 'X', array['nc'])`),
  "Proveedor no válido rechazado (053)", "Proveedor no válido")
await throws(() => as(db, U.oscar, `select public.create_chat_notifier('${A}', 'slack', 'https://hooks.slack.com/x', 'X', array[]::text[])`),
  "Sin eventos rechazado (053)", "al menos un evento")

// RLS: solo Admin ve los canales (la URL es un secreto).
ok((await as(db, U.sofia, `select count(*)::int n from public.chat_notifiers where organization_id='${A}'`)).rows[0].n === 0, "La consulta no ve los canales (053)")
ok((await as(db, U.oscar, `select count(*)::int n from public.chat_notifiers where organization_id='${A}'`)).rows[0].n === 1, "El Admin ve el canal (053)")

// Un INSERT en la entidad encola el aviso para el canal suscrito.
await as(db, U.juan, `select public.create_pqrs('${A}', 'queja', 'web', null, null, '${P.sigA}', 'Una queja para notificar al canal.', current_date, 15)`)
ok((await svc(`select count(*)::int n from public.chat_outbox where organization_id='${A}' and event='pqrs' and notifier_id='${notif}'`)).rows[0].n === 1, "Crear una PQRS encola el aviso al canal suscrito (053)")
// Un canal solo suscrito a otro evento no recibe nada.
const notifSol = (await as(db, U.oscar, `select id from public.create_chat_notifier('${A}', 'teams', 'https://acme.webhook.office.com/y', 'Solo solicitudes', array['solicitud'])`)).rows[0].id
ok((await svc(`select count(*)::int n from public.chat_outbox where notifier_id='${notifSol}'`)).rows[0].n === 0, "Un canal no suscrito al evento no lo recibe (053)")

// Un canal desactivado no recibe avisos.
await as(db, U.oscar, `select public.update_chat_notifier('${notif}', 'https://hooks.slack.com/services/abc', 'Canal Calidad', array['nc','pqrs'], false)`)
await as(db, U.juan, `select public.create_pqrs('${A}', 'peticion', 'web', null, null, '${P.sigA}', 'Otra petición después de desactivar.', current_date, 15)`)
ok((await svc(`select count(*)::int n from public.chat_outbox where notifier_id='${notif}'`)).rows[0].n === 1, "Un canal desactivado no recibe nuevos avisos (053)")

// Eliminar (baja lógica) oculta el canal.
await as(db, U.oscar, `select public.discard_chat_notifier('${notifSol}')`)
ok((await as(db, U.oscar, `select count(*)::int n from public.chat_notifiers where id='${notifSol}'`)).rows[0].n === 0, "Eliminar un canal lo oculta (baja lógica) (053)")

// Aislamiento + REST
ok((await as(db, U.beto, `select count(*)::int n from public.chat_notifiers where organization_id='${A}'`)).rows[0].n === 0, "Beto (org B) no ve canales de A (053)")
await throws(() => as(db, U.oscar, `insert into public.chat_notifiers (organization_id, provider, url, name) values ('${A}', 'slack', 'https://x', 'X')`),
  "Nadie inserta canales por REST (053)", "row-level security")

console.log(`\n${pass} pasaron · ${fail} fallaron`)
process.exit(fail ? 1 : 0)
