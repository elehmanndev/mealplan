import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createHouseholdAction } from '@/actions/household';

export const dynamic = 'force-dynamic';

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?callbackUrl=/welcome');
  if (user.householdId != null) redirect('/');

  const firstName = (user.name ?? '').trim().split(/\s+/)[0] ?? '';
  const defaultName = firstName ? `Casa ${firstName}` : '';

  return (
    <main className="relative min-h-dvh flex flex-col items-center justify-center px-6 py-10 overflow-hidden">
      <BrandBackdrop />

      <div className="w-full max-w-[360px] flex flex-col items-center gap-8">
        <Wordmark />

        <div className="text-center space-y-2.5 px-2">
          <h1
            className="font-semibold tracking-tight leading-tight text-text"
            style={{ fontSize: 'clamp(20px, 5.4vw, 26px)' }}
          >
            ¡Bienvenido{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="text-sm text-text-muted leading-relaxed">
            Crea tu casa para empezar. Después podrás invitar a quien viva contigo
            con un enlace.
          </p>
        </div>

        <form action={createHouseholdAction} className="w-full flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted px-1">
              Nombre de tu casa
            </span>
            <input
              type="text"
              name="name"
              required
              maxLength={60}
              defaultValue={defaultName}
              placeholder="Casa García"
              autoComplete="off"
              autoFocus
              className="h-12 rounded-2xl bg-surface ring-1 ring-[color:var(--glass-border)] px-4 text-[15px] text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </label>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center h-12 rounded-2xl text-white font-medium text-[15px] active:scale-[0.985] transition-transform"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 55%, #A855F7 100%)',
              boxShadow: '0 12px 30px -10px rgba(124, 58, 237, 0.6), 0 4px 12px -4px rgba(99, 102, 241, 0.4)',
            }}
          >
            Crear casa
          </button>
        </form>

        <div className="w-full pt-2 border-t border-[color:var(--glass-border)]">
          <p className="text-[12px] text-text-muted/80 text-center leading-relaxed pt-4">
            ¿Te invitaron? Abre el enlace que te enviaron — no necesitas crear nada
            aquí.
          </p>
        </div>
      </div>
    </main>
  );
}

function BrandBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <div
        className="absolute -top-[18vmax] -left-[18vmax] w-[60vmax] h-[60vmax] rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, #6366F1 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-[22vmax] -right-[22vmax] w-[68vmax] h-[68vmax] rounded-full opacity-45 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, #A855F7 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40vmax] h-[40vmax] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, #7C3AED 0%, transparent 70%)' }}
      />
    </div>
  );
}

function Wordmark() {
  return (
    <svg
      viewBox="0 0 460 110"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto max-w-[260px]"
      fill="none"
      role="img"
      aria-label="MealPlan"
    >
      <defs>
        <linearGradient id="wm-welcome-grad" x1="0" y1="0" x2="460" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="0.55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <text
        x="230"
        y="86"
        textAnchor="middle"
        fontFamily="Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="88"
        fontWeight="800"
        letterSpacing="-4"
        fill="url(#wm-welcome-grad)"
      >
        mealplan
      </text>
    </svg>
  );
}
