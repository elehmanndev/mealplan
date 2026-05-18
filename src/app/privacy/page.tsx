import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacidad — MealPlan',
};

export default function PrivacyPage() {
  return (
    <main className="flex flex-col min-h-screen bg-bg safe-top pb-12">
      <div className="flex-1 flex flex-col px-4 pt-12 gap-6 max-w-2xl w-full mx-auto">
        <div className="flex items-center gap-2 -mx-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full text-text-muted hover:text-text transition-colors"
            aria-label="Volver"
          >
            <ChevronLeft size={22} />
          </Link>
          <h1 className="text-3xl font-bold text-text">Privacidad</h1>
        </div>

        <p className="text-xs text-text-muted">Última actualización: 18 de mayo de 2026</p>

        <Section title="Quién es responsable">
          MealPlan es un proyecto personal mantenido por Eric Lehmann. La aplicación está
          autoalojada en un servidor en España; no hay empresa detrás. Para cualquier consulta,
          escribe a <a className="text-accent" href="mailto:lemmi93@googlemail.com">lemmi93@googlemail.com</a>.
        </Section>

        <Section title="Qué datos recogemos">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>De Google, al iniciar sesión: tu nombre, correo electrónico y foto de perfil.</li>
            <li>Los datos que tú creas: recetas, planificación semanal, lista de la compra y
              mensajes que envías al chat de la IA.</li>
            <li>Un contador diario de mensajes de chat por usuario para evitar abusos.</li>
          </ul>
          <p className="mt-2">No usamos cookies de seguimiento, ni Google Analytics, ni
          servicios de medición de terceros.</p>
        </Section>

        <Section title="Para qué se usan">
          Para que la app funcione: identificarte, mostrarte tus recetas y compartirlas con la
          gente con la que convives en tu &laquo;casa&raquo; dentro de la app. Nada más.
        </Section>

        <Section title="Dónde se guardan">
          En una base de datos SQLite en el servidor del autor, en España. No se comparten con
          terceros, salvo la siguiente excepción.
        </Section>

        <Section title="La excepción: Google Gemini">
          Cuando usas el chat de recetas, tus mensajes se envían a la API de Google Gemini para
          generar la respuesta. Google procesa esos mensajes según su propia política de
          privacidad. No le mandamos tu correo ni tu nombre — solo el texto del mensaje.
        </Section>

        <Section title="Tus derechos">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Puedes exportar todos tus datos desde <Link className="text-accent" href="/settings">Ajustes &rarr; Datos &rarr; Exportar copia</Link>.</li>
            <li>Si quieres eliminar tu cuenta o salir de una casa compartida, escribe al correo
              de arriba — añadiremos autoservicio pronto.</li>
            <li>Si vives en la UE, tienes los derechos del RGPD (acceso, rectificación,
              supresión, portabilidad, oposición). Ejercítalos por correo.</li>
          </ul>
        </Section>

        <Section title="Menores">
          Esta app no está dirigida a menores de 16 años. No recogemos datos a sabiendas de
          menores.
        </Section>

        <Section title="Cambios">
          Si modificamos algo importante, actualizaremos la fecha de arriba y avisaremos en la
          propia app la próxima vez que entres.
        </Section>

        <div className="pt-4 border-t border-[color:var(--glass-border)] text-sm text-text-muted">
          <Link href="/terms" className="text-accent hover:underline">Ver términos de uso</Link>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      <div className="text-sm text-text-muted leading-relaxed">{children}</div>
    </section>
  );
}
