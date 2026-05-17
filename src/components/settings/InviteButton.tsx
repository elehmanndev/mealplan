'use client';

import { useState, useTransition } from 'react';
import { Check, Copy, Link as LinkIcon } from 'lucide-react';
import { createInviteAction } from '@/actions/household';
import { useToast } from '@/components/ui/Toast';

export function InviteButton() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    startTransition(async () => {
      try {
        const result = await createInviteAction();
        setUrl(result.url);
        setCopied(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo crear el enlace';
        toast.show(msg, 'error');
      }
    });
  }

  async function copy() {
    if (!url) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // Same fallback as DataActions — older WebKit / non-secure contexts.
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
    }
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast.show('No se pudo copiar al portapapeles', 'error');
    }
  }

  async function share() {
    if (!url) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Únete a mi casa en mealplan',
          text: 'Te invito a mi plan de comidas en mealplan:',
          url,
        });
        return;
      } catch {
        // User cancelled share sheet or unsupported — fall through to copy.
      }
    }
    void copy();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={generate}
        disabled={pending}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform disabled:opacity-60"
      >
        <LinkIcon size={20} className="text-text-muted shrink-0" />
        <div className="flex-1">
          <div className="font-medium text-text">
            {pending ? 'Generando enlace…' : url ? 'Generar otro enlace' : 'Invitar a alguien'}
          </div>
          <div className="text-xs text-text-muted">
            Crea un enlace de un solo uso que caduca en 7 días
          </div>
        </div>
      </button>

      {url && (
        <div className="rounded-2xl bg-surface ring-1 ring-[color:var(--glass-border)] p-3 flex flex-col gap-2">
          <div className="text-[11px] uppercase tracking-wider text-text-muted px-1">
            Comparte este enlace
          </div>
          <div className="font-mono text-[12px] text-text break-all px-1 leading-snug">
            {url}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={copy}
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-accent/15 text-accent text-sm font-medium active:scale-[0.99] transition-transform"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button
              type="button"
              onClick={share}
              className="flex-1 inline-flex items-center justify-center h-10 rounded-xl text-white text-sm font-medium active:scale-[0.99] transition-transform"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 55%, #A855F7 100%)',
              }}
            >
              Compartir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
