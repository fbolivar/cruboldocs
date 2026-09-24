import type { Metadata } from "next"
import Link from "next/link"
import type * as React from "react"

import { LogoHex, Wordmark } from "@/components/ui/logo-hex"

export const metadata: Metadata = {
  title: "Política de tratamiento de datos personales",
  description: "Cómo CrubolDocs trata los datos personales conforme a la Ley 1581 de 2012.",
}

// Texto aprobado por Fernando tras la revisión legal (2026-09-24). La vigencia es la fecha
// de publicación en producción: se fija el día del deploy (fase deploy).
const EMPRESA = {
  nombre: "Crubol Technology S.A.S.",
  nit: "902107870-4",
  domicilio: "Calle 77A # 85-46, Bogotá D.C., Colombia",
  correo: "datos@crubol.com",
  vigenciaDesde: "la fecha de su publicación",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-h2">{title}</h2>
      <div className="flex flex-col gap-3 text-body-lg">{children}</div>
    </section>
  )
}

export default function TratamientoDeDatosPage() {
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
          <h1>Política de tratamiento de datos personales</h1>
          <p className="text-texto-sec">
            En cumplimiento de la Ley 1581 de 2012 y el Decreto 1074 de 2015 (Capítulo 25).
          </p>
        </div>

        <Section title="1. Quién trata tus datos">
          <p>
            CrubolDocs es un servicio de {EMPRESA.nombre} (NIT {EMPRESA.nit}, domicilio {EMPRESA.domicilio}). Cada
            empresa cliente es <strong className="font-semibold">responsable</strong> de los datos de sus usuarios y
            colaboradores; {EMPRESA.nombre} actúa como <strong className="font-semibold">encargado</strong> y los trata
            solo por cuenta de la empresa y según sus instrucciones.
          </p>
        </Section>

        <Section title="2. Qué datos tratamos">
          <ul className="list-disc space-y-1.5 pl-6">
            <li>Identificación y contacto: nombre completo y correo electrónico corporativo.</li>
            <li>Datos laborales: cargo, proceso y organización a la que perteneces.</li>
            <li>
              Registros de uso: acciones en la plataforma, firmas electrónicas (fecha, hora, dirección IP y navegador) y
              confirmaciones de lectura.
            </li>
          </ul>
          <p>No solicitamos datos sensibles ni datos de niñas, niños y adolescentes.</p>
        </Section>

        <Section title="3. Para qué los usamos">
          <ul className="list-disc space-y-1.5 pl-6">
            <li>Darte acceso a la plataforma y gestionar tus permisos según tu cargo.</li>
            <li>Registrar la trazabilidad de documentos, firmas, lecturas y controles del sistema de gestión.</li>
            <li>Enviarte avisos de tareas, vencimientos e invitaciones por correo.</li>
            <li>Atender auditorías del sistema de gestión y requerimientos de autoridades.</li>
            <li>Mantener la seguridad del servicio y prevenir accesos no autorizados.</li>
          </ul>
        </Section>

        <Section title="4. Tus derechos">
          <p>Como titular de los datos puedes:</p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>Conocer, actualizar y rectificar tus datos.</li>
            <li>Solicitar prueba de la autorización que otorgaste.</li>
            <li>Ser informado sobre el uso que se ha dado a tus datos.</li>
            <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
            <li>
              Revocar la autorización o pedir la supresión de tus datos cuando no exista un deber legal o contractual de
              conservarlos. Los registros de firmas y de auditoría se conservan por su valor probatorio.
            </li>
            <li>Acceder de forma gratuita a tus datos personales.</li>
          </ul>
        </Section>

        <Section title="5. Cómo ejercerlos">
          <p>
            Escribe al administrador de tu empresa o a{" "}
            <a href={`mailto:${EMPRESA.correo}`} className="font-medium text-acento underline underline-offset-4">
              {EMPRESA.correo}
            </a>
            . Respondemos las consultas en un máximo de 10
            días hábiles (prorrogables 5 días) y los reclamos en un máximo de 15 días hábiles (prorrogables 8 días).
          </p>
        </Section>

        <Section title="6. Proveedores y transferencia internacional">
          <p>
            Para operar el servicio, {EMPRESA.nombre} contrata proveedores que actúan como sus encargados y tratan los
            datos solo para prestarle ese servicio:
          </p>
          <ul className="list-disc space-y-1.5 pl-6">
            <li>Supabase: base de datos, archivos e inicio de sesión. Servidores en Estados Unidos.</li>
            <li>Vercel: aloja la aplicación. Procesa las solicitudes en Estados Unidos.</li>
            <li>
              Upstash: guarda por poco tiempo la dirección IP y el correo usados en intentos de ingreso, para limitar
              ataques. Servidores en Estados Unidos.
            </li>
            <li>Cloudflare (Turnstile): verifica que quien ingresa sea una persona. Procesa la dirección IP y datos del navegador.</li>
            <li>Hostinger: envío de correos. Sus servidores pueden estar fuera de Colombia.</li>
          </ul>
          <p>
            Esto implica una transmisión internacional de datos personales, principalmente a Estados Unidos. Al aceptar
            esta política autorizas esa transmisión. Los proveedores están obligados por contrato a proteger la
            información con medidas de seguridad adecuadas y a no usarla para fines propios.
          </p>
        </Section>

        <Section title="7. Seguridad">
          <p>
            El acceso se limita por organización y cargo; los archivos se guardan en almacenamiento privado; las firmas
            y la auditoría no se pueden modificar; y la comunicación viaja cifrada.
          </p>
        </Section>

        <Section title="8. Vigencia">
          <p>
            Esta política rige desde {EMPRESA.vigenciaDesde}. Los datos se conservan mientras exista la relación con la
            empresa cliente y durante el tiempo que exijan las normas aplicables.
          </p>
        </Section>
      </main>
    </div>
  )
}
