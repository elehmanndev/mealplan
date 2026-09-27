'use client';

import { useState, useTransition } from 'react';
import { Check, Copy, Link as LinkIcon } from 'lucide-react';
import { ListRow, ListSection } from '@/components/ui/List';
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
    <div className="flex flex-col gap-3">
      <ListSection footer="Crea un enlace de un solo uso que caduca en 7 días.">
        <ListRow
          icon={LinkIcon}
          title={pending ? 'Generando enlace…' : url ? 'Generar otro enlace' : 'Invitar a alguien'}
          onClick={generate}
          disabled={pending}
        />
      </ListSection>

      {url && (
        <div className="rounded-cell bg-surface p-4 flex flex-col gap-2">
          <div className="text-footnote text-text-muted">Comparte este enlace</div>
          <div className="font-mono text-footnote text-text break-all leading-snug">
            {url}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={copy}
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-full bg-fill text-accent text-subhead font-semibold active:bg-[var(--fill-pressed)] transition-colors"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button
              type="button"
              onClick={share}
              className="flex-1 inline-flex items-center justify-center h-10 rounded-full bg-accent text-white text-subhead font-semibold active:opacity-80 transition-opacity"
            >
              Compartir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
