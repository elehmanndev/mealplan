import { redirect } from 'next/navigation';
import { signIn, auth } from '@/auth';

export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl;
  const error = params.error;

  // Already signed in? Bounce back to wherever they were trying to go.
  const session = await auth();
  if (session?.user) redirect(callbackUrl ?? '/');

  async function signInWithGoogle() {
    'use server';
    await signIn('google', { redirectTo: callbackUrl ?? '/' });
  }

  return (
    <main className="relative min-h-dvh flex flex-col items-center justify-center px-6 py-10 overflow-hidden">
      {/* Brand gradient backdrop — bigger / more saturated than the global body
          background. Two soft blobs in the brand palette (indigo → violet →
          fuchsia) plus a faint grain via a subtle white wash on top. */}
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

      <div className="w-full max-w-[360px] flex flex-col items-center gap-10">
        {/* Wordmark — inlined here (instead of using the shared `<Wordmark>`)
            so the text uses textAnchor="middle" + x=230 and renders centered
            within its viewBox. The shared component on /home is left-aligned
            by design; centering it there would misalign the title with the
            paragraph below. */}
        <CenteredWordmark />

        {/* Tagline */}
        <div className="text-center space-y-2.5 px-2">
          <h1
            className="font-semibold tracking-tight leading-tight text-text whitespace-nowrap"
            style={{ fontSize: 'clamp(14px, 4.6vw, 20px)' }}
          >
            Tus comidas de la semana, en un vistazo
          </h1>
          <p className="text-sm text-text-muted leading-relaxed max-w-[280px] mx-auto">
            Plan, recetas y lista de la compra, sincronizado con tu casa.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="w-full rounded-2xl bg-red-500/10 ring-1 ring-red-500/25 px-4 py-3 text-[13px] text-red-300 text-center leading-relaxed">
            {errorMessage(error)}
          </div>
        )}

        {/* Sign-in button. White button with the official 4-color G mark
            satisfies Google's branding guidelines in both light and dark
            modes. */}
        <form className="w-full" action={signInWithGoogle}>
          <button
            type="submit"
            className="group w-full inline-flex items-center justify-center gap-3 h-12 rounded-2xl bg-white text-slate-900 font-medium text-[15px] ring-1 ring-black/5 active:scale-[0.985] transition-transform"
            style={{ boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.5), 0 4px 12px -4px rgba(124, 58, 237, 0.35)' }}
          >
            <GoogleGlyph />
            <span>Continuar con Google</span>
          </button>
        </form>

        <p className="text-[11px] text-text-muted/80 text-center leading-relaxed max-w-[280px]">
          Solo pedimos a Google tu nombre y tu correo — nada más.
        </p>
      </div>

      <a
        href="https://github.com/elehmanndev"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 text-[11px] text-text-muted/70 hover:text-text-muted transition-colors"
      >
        <GithubMark />
        <span>Created by elehmanndev</span>
      </a>
    </main>
  );
}

function GithubMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function CenteredWordmark() {
  return (
    <svg
      viewBox="0 0 460 110"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      fill="none"
      role="img"
      aria-label="MealPlan"
    >
      <defs>
        <linearGradient id="wm-login-grad" x1="0" y1="0" x2="460" y2="110" gradientUnits="userSpaceOnUse">
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
        fill="url(#wm-login-grad)"
      >
        mealplan
      </text>
    </svg>
  );
}

function errorMessage(error: string): string {
  switch (error) {
    case 'AccessDenied':
      return 'Esa cuenta todavía no tiene acceso. Pídele a quien te invitó que vuelva a compartir su enlace.';
    case 'OAuthCallback':
    case 'OAuthSignin':
      return 'Algo salió mal hablando con Google. Inténtalo de nuevo en un momento.';
    default:
      return 'No se pudo iniciar sesión. Inténtalo de nuevo en un momento.';
  }
}

function GoogleGlyph() {
  // Official Google "G" logo. SVG inlined so it ships with the button and
  // doesn't depend on a separate asset request.
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
