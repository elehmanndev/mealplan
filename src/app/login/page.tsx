import Image from 'next/image';
import { redirect } from 'next/navigation';
import { signIn, auth } from '@/auth';
import { Wordmark } from '@/components/ui/Wordmark';

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
        {/* Logo + wordmark */}
        <div className="flex flex-col items-center gap-5">
          <div
            className="relative w-[88px] h-[88px] rounded-[26px] overflow-hidden ring-1 ring-white/10"
            style={{ boxShadow: '0 20px 50px -10px rgba(124, 58, 237, 0.55), 0 8px 20px -8px rgba(124, 58, 237, 0.35)' }}
          >
            <Image
              src="/icon-512.png"
              alt=""
              width={88}
              height={88}
              priority
              className="w-full h-full"
            />
          </div>
          <Wordmark className="h-9 w-auto" />
        </div>

        {/* Tagline */}
        <div className="text-center space-y-2 px-2">
          <h1 className="text-[22px] font-semibold tracking-tight leading-tight text-text">
            Tu semana de comidas, en su sitio
          </h1>
          <p className="text-sm text-text-muted leading-relaxed max-w-[300px] mx-auto">
            Recetas, calendario y lista de la compra — sincronizado con tu casa, listo para el supermercado.
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
          Al continuar accedemos solo a tu nombre y correo de Google. Nada más.
        </p>
      </div>
    </main>
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
