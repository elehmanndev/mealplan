'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/components/ui/Toast';
import { RecipeDraftCard, type RecipeDraft } from '@/components/chat/RecipeDraftCard';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  draft?: RecipeDraft;
  draftStatus?: 'pending' | 'saving' | 'saved' | 'discarded';
  draftSaved?: { id: number; name: string };
  skippedRecipes?: string[];
}

const WELCOME: ChatMessage = {
  role: 'model',
  content:
    '¡Hola! Cuéntame una receta y te propondré una versión lista para guardar. Por ejemplo: *lentejas con chorizo para 4 personas* o *ensalada de quinoa con aguacate*.',
};

export function ChatPanel() {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleMic() {
    inputRef.current?.focus();
    try {
      const seen = window.localStorage.getItem('mealplan.micHintSeen');
      if (!seen) {
        toast.show('Toca el micrófono de tu teclado para dictar 🎤', 'info');
        window.localStorage.setItem('mealplan.micHintSeen', '1');
      }
    } catch {
      // localStorage may be unavailable (private mode); ignore
    }
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages([...next, { role: 'model', content: '' }]);
    setText('');
    setBusy(true);

    try {
      const apiMessages = next
        .filter((m) => m !== WELCOME)
        .map(({ role, content }) => ({ role, content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (!res.ok && res.status !== 200) {
        const txt = await res.text();
        const errMsg = parseErrorEvent(txt) ?? 'Error al hablar con el asistente';
        toast.show(errMsg, 'error');
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (!res.body) {
        toast.show('Sin respuesta del servidor', 'error');
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = consumeSseEvents(buffer);
        buffer = events.remaining;
        for (const ev of events.parsed) {
          handleEvent(ev);
        }
      }
    } catch {
      toast.show('No se pudo enviar el mensaje', 'error');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setBusy(false);
    }

    function handleEvent(ev: { event: string; data: unknown }) {
      const data = ev.data as Record<string, unknown>;
      if (ev.event === 'text') {
        const delta = String(data.delta ?? '');
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'model') {
            copy[copy.length - 1] = { ...last, content: last.content + delta };
          }
          return copy;
        });
      } else if (ev.event === 'recipe_draft') {
        const draft = data as unknown as RecipeDraft;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'model') {
            copy[copy.length - 1] = { ...last, draft, draftStatus: 'pending' };
          }
          return copy;
        });
      } else if (ev.event === 'recipe_skipped') {
        const name = String(data.name ?? '');
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'model') {
            copy[copy.length - 1] = {
              ...last,
              skippedRecipes: [...(last.skippedRecipes ?? []), name],
            };
          }
          return copy;
        });
      } else if (ev.event === 'tool_error') {
        toast.show(String(data.error ?? 'Error con la herramienta'), 'error');
      } else if (ev.event === 'done') {
        if (typeof data.remaining === 'number') setRemaining(data.remaining);
      } else if (ev.event === 'error') {
        toast.show(String(data.message ?? 'Error'), 'error');
      }
    }
  }

  async function saveDraft(messageIndex: number, edited: RecipeDraft) {
    setMessages((prev) => {
      const copy = [...prev];
      const m = copy[messageIndex];
      if (m) copy[messageIndex] = { ...m, draftStatus: 'saving' };
      return copy;
    });
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes: [edited] }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        imported?: number;
        skipped?: string[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        toast.show(data.error ?? 'No se pudo guardar', 'error');
        setMessages((prev) => {
          const copy = [...prev];
          const m = copy[messageIndex];
          if (m) copy[messageIndex] = { ...m, draftStatus: 'pending' };
          return copy;
        });
        return;
      }
      const created = data.imported && data.imported > 0;
      if (!created) {
        // dedup by name on the server side; treat as already-existing
        toast.show(`"${edited.name}" ya existía`, 'info');
        setMessages((prev) => {
          const copy = [...prev];
          const m = copy[messageIndex];
          if (m) copy[messageIndex] = { ...m, draftStatus: 'discarded' };
          return copy;
        });
        return;
      }
      // Look up the inserted recipe id (the import endpoint doesn't return it)
      const idRes = await fetch(`/api/recipes?q=${encodeURIComponent(edited.name)}`);
      const recipes = (await idRes.json().catch(() => [])) as { id: number; name: string }[];
      const match = recipes.find(
        (r) => r.name.toLowerCase() === edited.name.toLowerCase(),
      );
      const saved = match
        ? { id: match.id, name: match.name }
        : { id: 0, name: edited.name };
      toast.show(`Receta "${edited.name}" guardada`, 'success');
      setMessages((prev) => {
        const copy = [...prev];
        const m = copy[messageIndex];
        if (m) copy[messageIndex] = { ...m, draftStatus: 'saved', draftSaved: saved };
        return copy;
      });
    } catch {
      toast.show('No se pudo guardar la receta', 'error');
      setMessages((prev) => {
        const copy = [...prev];
        const m = copy[messageIndex];
        if (m) copy[messageIndex] = { ...m, draftStatus: 'pending' };
        return copy;
      });
    }
  }

  function discardDraft(messageIndex: number) {
    setMessages((prev) => {
      const copy = [...prev];
      const m = copy[messageIndex];
      if (m) copy[messageIndex] = { ...m, draftStatus: 'discarded' };
      return copy;
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="mx-auto max-w-3xl flex flex-col gap-5 pb-2">
          {messages.map((m, i) => (
            <Message
              key={i}
              message={m}
              streaming={busy && i === messages.length - 1}
              onSaveDraft={(edited) => saveDraft(i, edited)}
              onDiscardDraft={() => discardDraft(i)}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex flex-col gap-1">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Describe una receta…"
            rows={1}
            disabled={busy}
            className="flex-1 bg-surface rounded-2xl px-4 py-3 text-sm text-text placeholder:text-text-muted/60 outline-none focus:ring-2 focus:ring-accent/50 resize-none max-h-32 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleMic}
            disabled={busy}
            aria-label="Dictar con el micrófono del teclado"
            className="shrink-0 w-12 h-12 rounded-full bg-surface text-text-muted flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
          >
            <Mic size={18} />
          </button>
          <button
            type="button"
            onClick={send}
            disabled={busy || !text.trim()}
            aria-label="Enviar"
            className="shrink-0 w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-40 disabled:bg-surface disabled:text-text-muted active:scale-95 transition-transform"
          >
            <Send size={18} />
          </button>
        </div>
        {remaining !== null && (
          <div className="text-[11px] text-text-muted px-2">
            {remaining} mensaje{remaining === 1 ? '' : 's'} disponible{remaining === 1 ? '' : 's'} hoy
          </div>
        )}
      </div>
    </div>
  );
}

function Message({
  message,
  streaming,
  onSaveDraft,
  onDiscardDraft,
}: {
  message: ChatMessage;
  streaming: boolean;
  onSaveDraft: (edited: RecipeDraft) => void;
  onDiscardDraft: () => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm bg-accent text-white whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  const showDraft = message.draft && message.draftStatus !== 'discarded';
  const empty =
    !message.content && (message.skippedRecipes?.length ?? 0) === 0 && !showDraft;

  return (
    <div className="text-text text-[15px] leading-relaxed">
      {empty && streaming ? (
        <ThinkingDots />
      ) : (
        <>
          {message.content && (
            <div>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: (props) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline"
                    />
                  ),
                  code: ({ children, ...props }) => (
                    <code
                      {...props}
                      className="px-1 py-0.5 rounded bg-surface text-[0.9em] font-mono"
                    >
                      {children}
                    </code>
                  ),
                  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
                  p: ({ children }) => (
                    <p className="my-2 first:mt-0 last:mb-0">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-text">{children}</strong>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {showDraft && message.draft && (
            <div className="mt-3">
              <RecipeDraftCard
                draft={message.draft}
                onSave={onSaveDraft}
                onDiscard={onDiscardDraft}
                saving={message.draftStatus === 'saving'}
                saved={message.draftStatus === 'saved' ? message.draftSaved : undefined}
              />
            </div>
          )}

          {message.skippedRecipes && message.skippedRecipes.length > 0 && (
            <div className="mt-2 text-xs text-text-muted">
              Ya existían: {message.skippedRecipes.join(', ')}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="inline-flex items-center gap-1.5 text-text-muted text-sm py-1">
      <Sparkles size={14} className="animate-pulse" />
      <span>Pensando…</span>
    </div>
  );
}

interface SseEvent {
  event: string;
  data: unknown;
}

function consumeSseEvents(buffer: string): { parsed: SseEvent[]; remaining: string } {
  const parsed: SseEvent[] = [];
  let rest = buffer;
  while (true) {
    const idx = rest.indexOf('\n\n');
    if (idx === -1) break;
    const block = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length === 0) continue;
    let data: unknown = dataLines.join('\n');
    try {
      data = JSON.parse(dataLines.join('\n'));
    } catch {
      // leave as string
    }
    parsed.push({ event, data });
  }
  return { parsed, remaining: rest };
}

function parseErrorEvent(body: string): string | null {
  const events = consumeSseEvents(body).parsed;
  for (const e of events) {
    if (e.event === 'error') {
      const data = e.data as Record<string, unknown>;
      if (typeof data.message === 'string') return data.message;
    }
  }
  return null;
}
