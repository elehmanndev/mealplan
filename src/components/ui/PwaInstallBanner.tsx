'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Download, Share as ShareIcon, Plus } from 'lucide-react';

const DISMISS_KEY = 'pwa.install.dismissed.v1';

// Routes that already own the full viewport / are auth-only — banner would
// be visual noise there.
const HIDDEN_PREFIXES = ['/login', '/welcome', '/join', '/privacy', '/terms', '/chat'];

type Platform = 'android' | 'ios' | 'other';

// Minimal shape of the BeforeInstallPromptEvent. Not in lib.dom yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  return 'other';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari sets navigator.standalone (non-standard, exists only on iOS).
  return Boolean((window.navigator as { standalone?: boolean }).standalone);
}

export function PwaInstallBanner() {
  const pathname = usePathname() ?? '';
  const [platform, setPlatform] = useState<Platform>('other');
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosSheetOpen, setIosSheetOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      // private-browsing / storage-disabled — treat as not dismissed.
    }
    if (dismissed) return;

    const p = detectPlatform();
    setPlatform(p);

    if (p === 'android') {
      // Wait for the install prompt event before showing — if it never fires
      // (e.g. Firefox, or the criteria aren't met), the banner stays hidden.
      const onPrompt = (e: Event) => {
        e.preventDefault();
        setPromptEvent(e as BeforeInstallPromptEvent);
        setShow(true);
      };
      window.addEventListener('beforeinstallprompt', onPrompt);
      return () => window.removeEventListener('beforeinstallprompt', onPrompt);
    }

    if (p === 'ios') {
      // iOS doesn't fire beforeinstallprompt — show the banner immediately
      // (with manual "share → add to home screen" instructions on tap).
      setShow(true);
    }
  }, []);

  // Hide on routes that don't need this.
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null;
  }
  if (!show) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
    setShow(false);
    setIosSheetOpen(false);
  }

  async function install() {
    if (platform === 'android' && promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      // Either way the prompt is single-use. Dismiss the banner.
      if (choice.outcome === 'accepted' || choice.outcome === 'dismissed') {
        dismiss();
      }
      return;
    }
    if (platform === 'ios') {
      setIosSheetOpen(true);
    }
  }

  return (
    <>
      <div
        role="region"
        aria-label="Instalar la app"
        className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}
      >
        <div className="glass pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-full max-w-[88vw]">
          <Download size={16} className="text-accent shrink-0" />
          <span className="text-subhead text-text font-semibold whitespace-nowrap truncate">
            Instala MealPlan
          </span>
          <button
            type="button"
            onClick={install}
            className="text-subhead font-semibold px-3.5 h-8 rounded-full text-white bg-accent active:opacity-80"
          >
            {platform === 'ios' ? 'Cómo' : 'Instalar'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar"
            className="ml-1 -mr-1 p-1 rounded-full text-text-muted hover:text-text"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {iosSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cómo instalar en iOS"
          className="fixed inset-0 z-50 flex items-end justify-center p-2"
          style={{ background: 'var(--backdrop)' }}
          onClick={() => setIosSheetOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-sheet p-5 pb-6"
            style={{ background: 'rgb(var(--sheet))', marginBottom: 'max(0px, calc(env(safe-area-inset-bottom) - 28px))' }}
          >
            <div className="mx-auto w-9 h-[5px] rounded-full bg-text-tertiary mb-4" />
            <h3 className="text-title3 text-text mb-3 text-center">Instalar en iPhone</h3>
            <ol className="space-y-3 text-subhead text-text-muted">
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-caption1 font-bold">1</span>
                <span className="flex-1">
                  Pulsa el botón <ShareIcon size={14} className="inline -mt-0.5 text-text" /> Compartir en la barra inferior de Safari.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-caption1 font-bold">2</span>
                <span className="flex-1">
                  Desplázate y toca <strong className="text-text">Añadir a pantalla de inicio</strong> <Plus size={14} className="inline -mt-0.5" />.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-caption1 font-bold">3</span>
                <span className="flex-1">
                  Confirma con <strong className="text-text">Añadir</strong>. MealPlan aparecerá como una app más, sin barra del navegador.
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={dismiss}
              className="mt-5 w-full h-[50px] rounded-full bg-accent text-white font-semibold text-body active:opacity-80"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
