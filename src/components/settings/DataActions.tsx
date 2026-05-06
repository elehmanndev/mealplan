'use client';

import { useState } from 'react';
import { Check, Copy, Download, Upload } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const EXAMPLE_JSON = `{
  "recipes": [
    {
      "name": "Pasta carbonara",
      "emoji": "🍝",
      "servings": 2,
      "category": "pasta",
      "prep_time_min": 20,
      "tags": ["Pasta", "Cenas"],
      "ingredients": [
        { "name": "Spaghetti", "quantity": 200, "unit": "g", "shopping_category": "despensa", "supermarket": "mercadona" },
        { "name": "Huevo", "quantity": 2, "unit": "ud", "shopping_category": "lacteos", "supermarket": "mercadona" },
        { "name": "Panceta", "quantity": 100, "unit": "g", "shopping_category": "carne", "supermarket": "lidl" }
      ]
    }
  ]
}`;

const CHATGPT_PROMPT = `Quiero importar mis recetas a una app de planificación de comidas. Conviértelas a este formato JSON y devuélveme SOLO el JSON, sin markdown ni explicaciones.

Esquema:
{
  "recipes": [
    {
      "name": "Nombre de la receta",
      "emoji": "🍝",
      "servings": 2,
      "category": "uno de: pasta, arroz, carne, pescado, ensalada, verdura, legumbres, huevos, sopa, otros",
      "prep_time_min": 20,
      "tags": ["uno o varios de: Pasta, Ensaladas, Cenas, Comidas, Tuppers, Verano, Invierno"],
      "ingredients": [
        {
          "name": "Ingrediente",
          "quantity": 200,
          "unit": "uno de: g, kg, ml, l, ud, pieza, unidad, paquete, lata, bandeja, bolsa, brick, cucharada, cucharadita, pellizco, taza, diente",
          "shopping_category": "uno de: verduras, frutas, carne, pescado, lacteos, panaderia, despensa, congelado, bebidas, otros",
          "supermarket": "uno de: mercadona, lidl, bon-area, aldi (omite si no sabes)"
        }
      ]
    }
  ]
}

Mis recetas:
[pega tus recetas aquí]`;

export function DataActions() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(CHATGPT_PROMPT);
      ok = true;
    } catch {
      // Fallback for environments where the async Clipboard API isn't available.
      const ta = document.createElement('textarea');
      ta.value = CHATGPT_PROMPT;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
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

  function handleExport() {
    const a = document.createElement('a');
    a.href = '/api/export';
    a.click();
  }

  function openImport() {
    setText('');
    setOpen(true);
  }

  function close() {
    if (importing) return;
    setOpen(false);
  }

  async function submit() {
    const body = text.trim();
    if (!body) {
      toast.show('Pega el JSON antes de importar', 'error');
      return;
    }
    try {
      JSON.parse(body);
    } catch {
      toast.show('El JSON no es válido', 'error');
      return;
    }
    setImporting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        imported?: number;
        skipped?: string[];
      };
      if (!res.ok) {
        toast.show(data.error ?? 'No se pudo importar', 'error');
        setImporting(false);
        return;
      }
      const imported = data.imported ?? 0;
      const skipped = data.skipped?.length ?? 0;
      const msg =
        imported === 0
          ? skipped > 0
            ? `Ninguna receta nueva (${skipped} ya existían)`
            : 'No se importó ninguna receta'
          : skipped > 0
            ? `${imported} añadidas, ${skipped} omitidas (ya existían)`
            : `${imported} receta${imported === 1 ? '' : 's'} añadida${imported === 1 ? '' : 's'}`;
      toast.show(msg, imported > 0 ? 'success' : 'info');
      setOpen(false);
      setImporting(false);
      if (imported > 0) {
        window.location.assign('/recipes');
      }
    } catch {
      toast.show('No se pudo importar', 'error');
      setImporting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform"
        >
          <Download size={20} className="text-text-muted shrink-0" />
          <div className="flex-1">
            <div className="font-medium">Exportar copia</div>
            <div className="text-xs text-text-muted">Descarga un JSON con tus recetas y plan</div>
          </div>
        </button>
        <button
          type="button"
          onClick={openImport}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface min-h-touch text-left active:scale-[0.99] transition-transform"
        >
          <Upload size={20} className="text-text-muted shrink-0" />
          <div className="flex-1">
            <div className="font-medium">Importar recetas</div>
            <div className="text-xs text-text-muted">Pega un JSON (p. ej. de ChatGPT)</div>
          </div>
        </button>
      </div>

      <BottomSheet open={open} onClose={close} title="Importar recetas" fullHeight>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold">1</span>
              <span className="text-sm font-medium text-text">Pídele a ChatGPT que convierta tus recetas</span>
            </div>
            <button
              type="button"
              onClick={copyPrompt}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-accent/15 text-accent text-sm font-medium active:scale-[0.99] transition-transform"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '¡Copiado! Pégalo en ChatGPT' : 'Copiar prompt para ChatGPT'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold">2</span>
              <span className="text-sm font-medium text-text">Pega aquí el JSON que te devuelva</span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'{\n  "recipes": [ … ]\n}'}
              spellCheck={false}
              className="w-full h-48 bg-surface rounded-xl px-3 py-2 text-sm font-mono text-text placeholder:text-text-muted/40 outline-none focus:ring-2 focus:ring-accent/50"
            />
            <p className="text-xs text-text-muted px-1">
              Las recetas que ya existen (mismo nombre) se omiten. Los ingredientes se reutilizan por nombre.
            </p>
          </div>

          <details className="text-xs text-text-muted">
            <summary className="cursor-pointer text-text-muted hover:text-text">
              Ver formato y valores aceptados
            </summary>
            <div className="mt-3 space-y-2 px-1">
              <div>
                <span className="text-text font-medium">unit:</span> g, kg, ml, l, ud, pieza, unidad,
                paquete, lata, bandeja, bolsa, brick, cucharada, cucharadita, pellizco, taza, diente
              </div>
              <div>
                <span className="text-text font-medium">shopping_category:</span> verduras, frutas,
                carne, pescado, lacteos, panaderia, despensa, congelado, bebidas, otros
              </div>
              <div>
                <span className="text-text font-medium">category:</span> pasta, arroz, carne, pescado,
                ensalada, verdura, legumbres, huevos, sopa, otros
              </div>
              <div>
                <span className="text-text font-medium">tags:</span> Pasta, Ensaladas, Cenas, Comidas,
                Tuppers, Verano, Invierno
              </div>
              <div>
                <span className="text-text font-medium">supermarket:</span> mercadona, lidl, bon-area,
                aldi
              </div>
              <pre className="mt-2 p-3 bg-surface rounded-lg overflow-x-auto text-[11px] leading-relaxed text-text">
{EXAMPLE_JSON}
              </pre>
            </div>
          </details>

          <div className="flex gap-2">
            <Button variant="secondary" size="md" fullWidth onClick={close} disabled={importing}>
              Cancelar
            </Button>
            <Button variant="primary" size="md" fullWidth onClick={submit} disabled={importing}>
              {importing ? 'Importando…' : 'Importar'}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
