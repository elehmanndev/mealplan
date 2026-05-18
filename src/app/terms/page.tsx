import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const metadata = {
  title: 'Términos — MealPlan',
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-text">Términos de uso</h1>
        </div>

        <p className="text-xs text-text-muted">Última actualización: 18 de mayo de 2026</p>

        <Section title="Qué es esto">
          MealPlan es una app gratuita para planificar comidas, mantenida por una persona
          como proyecto personal. La ofrecemos &laquo;tal cual&raquo;, sin garantías de
          disponibilidad ni de que tus datos no se pierdan. Hacemos copias de seguridad, pero
          no firmamos un acuerdo de servicio.
        </Section>

        <Section title="Tu cuenta">
          Te identificas con una cuenta de Google. Eres responsable de mantener su seguridad.
          Si la pierdes, pierdes el acceso a tu casa en MealPlan.
        </Section>

        <Section title="Uso correcto">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Hay un límite diario de mensajes al chat de la IA para que el servicio siga
              gratis para todos. Si lo agotas, vuelve mañana.</li>
            <li>No abuses del chat para fines distintos a generar recetas (la IA puede negarse
              y, si insistes, te bloquearemos).</li>
            <li>Las recetas que importes son tu responsabilidad — respeta los derechos de
              autor de quien las publicó originalmente.</li>
            <li>No subas datos de terceros sin su permiso (correos, fotos, etc.).</li>
          </ul>
        </Section>

        <Section title="Casas compartidas">
          Cuando aceptas una invitación a una casa, compartes con sus miembros toda la
          información de esa casa (recetas, plan, lista de la compra). El propietario de la
          casa puede expulsarte; tú puedes solicitar irte por correo.
        </Section>

        <Section title="Suspensión">
          Nos reservamos el derecho de suspender cuentas que abusen del servicio, intenten
          saltarse los límites, o usen la app para algo distinto a su propósito. Si pasa, te
          avisaremos al correo de tu cuenta de Google.
        </Section>

        <Section title="Cambios en el servicio">
          MealPlan está en desarrollo activo. Podemos cambiar funcionalidades, retirarlas, o
          incluso dejar de ofrecer el servicio si deja de ser viable. Si fuese a cerrar, te
          avisaríamos con al menos 30 días para exportar tus datos.
        </Section>

        <Section title="Limitación de responsabilidad">
          MealPlan no se hace responsable de pérdida de datos, errores en las recetas
          generadas por la IA (revisa siempre lo que vayas a cocinar), ni de cualquier
          consecuencia derivada del uso de la app.
        </Section>

        <Section title="Ley aplicable">
          Estos términos se rigen por la ley española. Cualquier disputa se resolverá en los
          juzgados de Barcelona.
        </Section>

        <div className="pt-4 border-t border-[color:var(--glass-border)] text-sm text-text-muted">
          <Link href="/privacy" className="text-accent hover:underline">Ver política de privacidad</Link>
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
