import type { Metadata } from "next"
import Link from "next/link"
import type * as React from "react"

import { LogoHex, Wordmark } from "@/components/ui/logo-hex"

export const metadata: Metadata = {
  title: "Términos de servicio",
  description: "Condiciones de uso del servicio CrubolDocs de Crubol Technology S.A.S.",
  alternates: { canonical: "/terminos" },
  openGraph: {
    title: "Términos de servicio · CrubolDocs",
    description: "Condiciones de uso del servicio CrubolDocs de Crubol Technology S.A.S.",
    url: "/terminos",
    siteName: "CrubolDocs",
    locale: "es_CO",
    type: "article",
  },
}

// Texto aprobado por el abogado de Fernando (2026-11-10) y ampliado el 2026-11-11 con su visto
// bueno: la §9 "Asistente de IA (Crubol-Agent)" ahora cubre el copiloto de causa/CAPA/riesgos, que
// bajo demanda procesa el contenido del registro abierto (solo propone, humano confirma, no cierra
// ni verifica; Anthropic como encargado en EE. UU. sin entrenamiento). Decisiones reflejadas:
// 7.6-1 (el cliente responde por el contenido que carga), sin antivirus en v1 (riesgo declarado),
// supresión por anonimización. Datos de la empresa reutilizados de /tratamiento-de-datos.
const EMPRESA = {
  nombre: "Crubol Technology S.A.S.",
  nit: "902107870-4",
  domicilio: "Calle 77A # 85-46, Bogotá D.C., Colombia",
  ciudad: "Bogotá D.C.",
  correo: "info@crubol.com",
  correoDatos: "datos@crubol.com",
  vigenciaDesde: "el 11 de noviembre de 2026",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-h2">{title}</h2>
      <div className="flex flex-col gap-3 text-body-lg">{children}</div>
    </section>
  )
}

export default function TerminosPage() {
  return (
    <div className="min-h-dvh bg-fondo">
      <header className="border-b border-borde bg-superficie">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-4 md:px-8">
          <Link href="/login" className="flex items-center gap-2.5">
            <LogoHex className="size-7" />
            <Wordmark />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        <div className="flex flex-col gap-2">
          <h1>Términos de servicio</h1>
          <p className="text-texto-sec">
            Condiciones que rigen el uso de CrubolDocs, un servicio de {EMPRESA.nombre}.
          </p>
        </div>

        <Section title="1. Qué es CrubolDocs y a quién va dirigido">
          <p>
            CrubolDocs es una plataforma en línea de gestión de calidad (control documental y de riesgos) ofrecida por{" "}
            {EMPRESA.nombre} (NIT {EMPRESA.nit}, domicilio {EMPRESA.domicilio}), en adelante <strong className="font-semibold">Crubol</strong>.
          </p>
          <p>
            El servicio está dirigido a empresas y organizaciones (el <strong className="font-semibold">Cliente</strong>) y a
            las personas que el Cliente autoriza a usarlo (los <strong className="font-semibold">Usuarios</strong>). No está
            dirigido a consumidores individuales. El uso de CrubolDocs implica la aceptación de estos términos; si no estás
            de acuerdo, no uses el servicio.
          </p>
        </Section>

        <Section title="2. Cuentas, acceso y seguridad de las credenciales">
          <p>
            El alta de cada organización la realiza Crubol y el acceso de los Usuarios se habilita por invitación del
            administrador del Cliente. Cada Usuario es responsable de la confidencialidad de sus credenciales y de toda
            actividad realizada con ellas, y debe avisar de inmediato ante cualquier uso no autorizado.
          </p>
          <p>
            Los permisos dependen del cargo asignado dentro de la organización. Las firmas electrónicas simples
            (reautenticación con contraseña, con registro de fecha, hora, dirección IP y navegador) se atribuyen al Usuario
            que las realiza.
          </p>
        </Section>

        <Section title="3. Gratuidad de esta versión">
          <p>
            Esta versión del servicio se ofrece sin costo para el Cliente. Crubol podrá introducir planes pagos en el
            futuro, en cuyo caso lo comunicará con antelación y no cobrará por el uso ya realizado sin aviso previo.
          </p>
        </Section>

        <Section title="4. Contenido del Cliente y responsabilidad">
          <p>
            El Cliente y sus Usuarios conservan la titularidad de los documentos, archivos, datos y demás información que
            cargan o generan en la plataforma (el <strong className="font-semibold">Contenido</strong>).
          </p>
          <p>
            El Cliente es el <strong className="font-semibold">único responsable</strong> del Contenido que carga y de su uso
            del servicio. En particular, declara y garantiza que cuenta con los derechos y autorizaciones necesarios sobre el
            Contenido, que este no infringe derechos de terceros (incluidos derechos de propiedad intelectual ni de
            protección de datos) y que cumple la ley aplicable. El Contenido es responsabilidad de quien lo aporta; Crubol no
            lo revisa, valida ni avala, y no responde por su exactitud, legalidad o idoneidad.
          </p>
          <p>
            El Cliente mantendrá indemne a Crubol frente a reclamaciones de terceros derivadas del Contenido o de un uso del
            servicio contrario a estos términos o a la ley.
          </p>
        </Section>

        <Section title="5. Archivos, análisis de seguridad y antivirus">
          <p>
            La plataforma valida el tipo, la firma binaria y el tamaño de los archivos que se cargan, pero{" "}
            <strong className="font-semibold">no realiza análisis de antivirus ni de código malicioso</strong> sobre su
            contenido en esta versión. El Cliente es responsable de verificar, antes de cargarlos, que los archivos estén
            libres de virus o software malicioso, y asume el riesgo asociado a los archivos que él mismo u otros Usuarios de
            su organización aporten o descarguen.
          </p>
        </Section>

        <Section title="6. Uso aceptable">
          <p>Al usar CrubolDocs, el Cliente y sus Usuarios se obligan a no:</p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>Cargar contenido ilícito, que infrinja derechos de terceros o que contenga software malicioso.</li>
            <li>Intentar acceder a datos de otras organizaciones o a áreas del servicio sin autorización.</li>
            <li>Vulnerar, probar o eludir las medidas de seguridad, salvo autorización expresa y por escrito de Crubol.</li>
            <li>Interferir con el funcionamiento del servicio, sobrecargarlo o usarlo de forma automatizada abusiva.</li>
            <li>Usar el servicio para fines distintos a la gestión documental y de riesgos para la que está previsto.</li>
          </ul>
        </Section>

        <Section title="7. Propiedad intelectual del servicio">
          <p>
            El software, la marca, el diseño y demás elementos de CrubolDocs son propiedad de Crubol o de sus licenciantes.
            Estos términos no transfieren al Cliente ningún derecho sobre el servicio distinto del derecho de uso, limitado y
            revocable, que aquí se concede. El Cliente conserva todos sus derechos sobre el Contenido.
          </p>
        </Section>

        <Section title="8. Datos personales">
          <p>
            Respecto de los datos personales de los Usuarios, el Cliente actúa como responsable del tratamiento y Crubol como
            encargado, que los trata solo por cuenta del Cliente y según sus instrucciones. El tratamiento se rige por la{" "}
            <a href="/tratamiento-de-datos" className="font-medium text-acento underline underline-offset-4">
              Política de tratamiento de datos personales
            </a>{" "}
            (Ley 1581 de 2012), que forma parte integral de estos términos.
          </p>
        </Section>

        <Section title="9. Asistente de IA (Crubol-Agent)">
          <p>
            Crubol-Agent es una función opcional de inteligencia artificial que ayuda a configurar el catálogo de la
            organización (procesos, tipos de documento y cargos) y, <strong className="font-semibold">dentro de las
            fichas de no conformidades y riesgos, a redactar el análisis de causa, el plan de acciones, los controles o
            la valoración</strong>, conversando con el Usuario. Está{" "}
            <strong className="font-semibold">desactivada por defecto</strong> y solo se habilita por organización, a
            solicitud o con el consentimiento del Cliente.
          </p>
          <p>
            El asistente únicamente <strong className="font-semibold">propone</strong> acciones: no se crea, modifica ni
            elimina nada sin que un Usuario con permiso lo <strong className="font-semibold">confirme</strong>. No firma,
            no aprueba, no cierra ni verifica la eficacia, y solo accede al registro que el Usuario abre y para el que
            pide ayuda; no accede al contenido de otros registros ni a los datos de otras organizaciones.
          </p>
          <p>
            Las sugerencias las genera un modelo de IA y <strong className="font-semibold">pueden contener errores o
            estar incompletas</strong>. El Cliente y sus Usuarios son responsables de revisarlas y confirmarlas antes de
            aplicarlas; Crubol no garantiza su exactitud ni idoneidad. Pueden aplicarse límites de uso.
          </p>
          <p>
            Para prestar esta función, Crubol utiliza la API de Claude de Anthropic como encargado, que procesa en
            Estados Unidos el texto de la conversación, el catálogo y el contenido del registro para el que el Usuario
            solicita ayuda, no usa esos datos para entrenar sus modelos y los trata solo para generar las sugerencias.
            Este tratamiento se rige por la{" "}
            <a href="/tratamiento-de-datos" className="font-medium text-acento underline underline-offset-4">
              Política de tratamiento de datos personales
            </a>
            .
          </p>
        </Section>

        <Section title="10. Conservación y supresión de datos">
          <p>
            Mientras exista la relación con el Cliente, el Contenido y los datos se conservan para prestar el servicio.
            Terminada la relación, y salvo deber legal de conservarlos, la supresión de los datos personales se realiza
            mediante <strong className="font-semibold">anonimización</strong>: se eliminan o disocian los datos que permiten
            identificar a una persona. Los registros de firmas electrónicas y de auditoría se conservan por su valor
            probatorio y de trazabilidad del sistema de gestión, de forma anonimizada cuando corresponde.
          </p>
        </Section>

        <Section title="11. Disponibilidad del servicio">
          <p>
            El servicio se presta <strong className="font-semibold">“tal cual” y “según disponibilidad”</strong>, sin
            garantía de disponibilidad ininterrumpida ni compromiso de nivel de servicio (SLA) en esta versión. Crubol podrá
            realizar mantenimientos, actualizaciones o suspensiones temporales, y procurará avisar de los mantenimientos
            programados cuando sea razonable.
          </p>
        </Section>

        <Section title="12. Limitación de responsabilidad">
          <p>
            En la medida permitida por la ley, Crubol no responde por daños indirectos, lucro cesante, pérdida de datos o de
            información derivada del Contenido, ni por fallos atribuibles al Cliente, a sus Usuarios, a terceros o a causas de
            fuerza mayor. Nada en estos términos limita responsabilidades que la ley no permita excluir.
          </p>
        </Section>

        <Section title="13. Suspensión y terminación">
          <p>
            Crubol podrá suspender o terminar el acceso ante un incumplimiento de estos términos, un riesgo de seguridad o un
            requerimiento legal. El Cliente puede dejar de usar el servicio en cualquier momento. Terminado el acceso, se
            aplica lo previsto en la sección 10 sobre conservación y supresión de datos.
          </p>
        </Section>

        <Section title="14. Cambios en estos términos">
          <p>
            Crubol podrá modificar estos términos para reflejar cambios en el servicio o en la normativa. Los cambios
            relevantes se comunicarán por medios razonables; el uso del servicio después de su entrada en vigencia implica su
            aceptación.
          </p>
        </Section>

        <Section title="15. Ley aplicable y jurisdicción">
          <p>
            Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se someterá a los
            jueces competentes de {EMPRESA.ciudad}, sin perjuicio de los derechos que la ley reconozca al Cliente.
          </p>
        </Section>

        <Section title="16. Contacto">
          <p>
            Para asuntos relacionados con estos términos, escribe a{" "}
            <a href={`mailto:${EMPRESA.correo}`} className="font-medium text-acento underline underline-offset-4">
              {EMPRESA.correo}
            </a>
            . Para asuntos de datos personales, escribe a{" "}
            <a href={`mailto:${EMPRESA.correoDatos}`} className="font-medium text-acento underline underline-offset-4">
              {EMPRESA.correoDatos}
            </a>
            .
          </p>
        </Section>

        <Section title="17. Vigencia">
          <p>Estos términos rigen desde {EMPRESA.vigenciaDesde}.</p>
        </Section>
      </main>
    </div>
  )
}
