import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { redeemInviteAction } from '@/actions/household';

export const dynamic = 'force-dynamic';

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;

  const user = await getCurrentUser();
  if (!user) {
    // Send them through Google sign-in then back to this same URL. After
    // they authenticate the page re-runs and the redeem path takes over.
    redirect(`/login?callbackUrl=${encodeURIComponent(`/join/${token}`)}`);
  }

  const result = await redeemInviteAction(token);
  if (result.ok) {
    // Whether they were newly added or already a member, the right answer is
    // "go home." The DB-backed `requireHouseholdIdOrRedirect` will pick up
    // the new membership without needing a JWT refresh.
    redirect('/');
  }

  return (
    <main className="relative min-h-dvh flex flex-col items-center justify-center px-6 py-10 overflow-hidden">
      <BrandBackdrop />
      <div className="w-full max-w-[360px] flex flex-col items-center gap-6 text-center">
        <Wordmark />
        <div className="space-y-2.5">
          <h1
            className="font-semibold tracking-tight leading-tight text-text"
            style={{ fontSize: 'clamp(20px, 5.4vw, 26px)' }}
          >
            {titleFor(result.reason)}
          </h1>
          <p className="text-sm text-text-muted leading-relaxed">{bodyFor(result.reason)}</p>
        </div>
        <Link
          href="/welcome"
          className="w-full inline-flex items-center justify-center h-12 rounded-2xl text-white font-medium text-[15px] active:scale-[0.985] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 55%, #A855F7 100%)',
            boxShadow: '0 12px 30px -10px rgba(124, 58, 237, 0.6), 0 4px 12px -4px rgba(99, 102, 241, 0.4)',
          }}
        >
          Crear mi propia casa
        </Link>
      </div>
    </main>
  );
}

function titleFor(reason: 'invalid' | 'expired' | 'used'): string {
  switch (reason) {
    case 'expired':
      return 'Este enlace ha caducado';
    case 'used':
      return 'Este enlace ya se ha usado';
    case 'invalid':
    default:
      return 'Enlace no válido';
  }
}

function bodyFor(reason: 'invalid' | 'expired' | 'used'): string {
  switch (reason) {
    case 'expired':
      return 'Pídele a quien te invitó que te envíe uno nuevo.';
    case 'used':
      return 'Cada enlace solo sirve una vez. Pide otro a quien te invitó.';
    case 'invalid':
    default:
      return 'Revisa el enlace o pídele a quien te invitó que te lo vuelva a enviar.';
  }
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
    </div>
  );
}

function Wordmark() {
  return (
    <svg
      viewBox="0 0 460 110"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto max-w-[220px]"
      fill="none"
      role="img"
      aria-label="MealPlan"
    >
      <defs>
        <linearGradient id="wm-join-grad" x1="0" y1="0" x2="460" y2="110" gradientUnits="userSpaceOnUse">
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
        fill="url(#wm-join-grad)"
      >
        mealplan
      </text>
    </svg>
  );
}
