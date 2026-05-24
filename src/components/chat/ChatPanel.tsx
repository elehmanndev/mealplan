'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mic, RotateCcw, Send, Sparkles } from 'lucide-react';
import { Streamdown } from 'streamdown';
import { useToast } from '@/components/ui/Toast';
import { RecipeDraftCard, type RecipeDraft } from '@/components/chat/RecipeDraftCard';
import { ChatUsageBar } from '@/components/chat/ChatUsageBar';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  draft?: RecipeDraft;
  draftStatus?: 'pending' | 'saving' | 'saved' | 'discarded';
  draftSaved?: { id: number; name: string };
  skippedRecipes?: string[];
  // True for follow-up bubbles created when the typewriter splits a long
  // response into shorter sintagmas. Suppresses the "Pensando…" placeholder
  // that would otherwise flash between bubbles.
  isContinuation?: boolean;
}

const WELCOME: ChatMessage = {
  role: 'model',
  content: 'Pídeme un plato que te apetezca y te hago la receta. Como tu abuela, pero sin sermón.',
};

const STORAGE_KEY = 'mealplan.chat.messages';

function loadStoredMessages(): ChatMessage[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ChatPanel() {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [usedToday, setUsedToday] = useState<number | null>(null);
  const [capToday, setCapToday] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);
  const hydratedRef = useRef(false);

  // Typewriter throttle. Gemini hands us ~50-word chunks every ~270ms, which
  // makes the visible reveal jump forward in big steps even with Streamdown's
  // per-word stagger. We buffer incoming text and drain it at a fixed rate,
  // then split it into shorter "sintagma" bubbles at sentence boundaries with
  // a short conversational pause between bubbles — feels like a chat partner
  // sending you a few quick messages in a row.
  const textBufferRef = useRef('');
  const drainTimerRef = useRef<number | null>(null);
  const streamDoneRef = useRef(false);
  const drainResolverRef = useRef<(() => void) | null>(null);
  const pauseTicksRef = useRef(0);
  const needNewBubbleRef = useRef(false);
  const pendingDraftRef = useRef<RecipeDraft | null>(null);
  const pendingSkippedRef = useRef<string[]>([]);
  const TYPEWRITER_CHARS_PER_TICK = 2;
  const TYPEWRITER_TICK_MS = 25; // → ~80 chars/sec within a single bubble
  const PAUSE_BETWEEN_BUBBLES_MS = 600;
  const PAUSE_BETWEEN_BUBBLES_TICKS = Math.round(PAUSE_BETWEEN_BUBBLES_MS / TYPEWRITER_TICK_MS);
  const SENTENCE_END = /[.!?…]/;

  // Hydrate from sessionStorage on first mount.
  useEffect(() => {
    const stored = loadStoredMessages();
    if (stored) setMessages(stored);
    hydratedRef.current = true;
  }, []);

  // Persist messages on change (skip the initial render before hydration).
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      // Drop in-flight streaming placeholders to keep storage clean.
      const persisted = messages.filter(
        (m, i) => !(i === messages.length - 1 && m.role === 'model' && m.content === '' && !m.draft),
      );
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // sessionStorage may be unavailable / quota exceeded; ignore
    }
  }, [messages]);

  function handleMic() {
    inputRef.current?.focus();
  }

  function resetChat() {
    setMessages([WELCOME]);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    // Within 24px of the bottom counts as "at bottom" — accommodates fractional pixels and small overshoots.
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  }

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  useLayoutEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
    ta.scrollTop = ta.scrollHeight;
  }, [text]);

  // Hide the BottomNav while the user is typing — keeps the composer
  // unblocked when the OS lifts the nav above the keyboard.
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    const onFocus = () => document.body.setAttribute('data-chat-typing', '');
    const onBlur = () => document.body.removeAttribute('data-chat-typing');
    ta.addEventListener('focus', onFocus);
    ta.addEventListener('blur', onBlur);
    return () => {
      ta.removeEventListener('focus', onFocus);
      ta.removeEventListener('blur', onBlur);
      document.body.removeAttribute('data-chat-typing');
    };
  }, []);

  function ensureDrainRunning() {
    if (drainTimerRef.current != null) return;
    drainTimerRef.current = window.setInterval(() => {
      // Hold off while pausing between bubbles.
      if (pauseTicksRef.current > 0) {
        pauseTicksRef.current--;
        return;
      }
      // After a pause, the next tick spawns a fresh continuation bubble; the
      // tick after starts filling it.
      if (needNewBubbleRef.current) {
        setMessages((prev) => [...prev, { role: 'model', content: '', isContinuation: true }]);
        needNewBubbleRef.current = false;
        return;
      }
      if (textBufferRef.current.length === 0) {
        if (streamDoneRef.current) {
          // Flush any queued draft / skipped events that arrived mid-stream.
          if (pendingDraftRef.current || pendingSkippedRef.current.length > 0) {
            const draft = pendingDraftRef.current;
            const skipped = pendingSkippedRef.current;
            pendingDraftRef.current = null;
            pendingSkippedRef.current = [];
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === 'model') {
                copy[copy.length - 1] = {
                  ...last,
                  ...(draft ? { draft, draftStatus: 'pending' as const } : {}),
                  ...(skipped.length > 0
                    ? { skippedRecipes: [...(last.skippedRecipes ?? []), ...skipped] }
                    : {}),
                };
              }
              return copy;
            });
          }
          window.clearInterval(drainTimerRef.current!);
          drainTimerRef.current = null;
          drainResolverRef.current?.();
          drainResolverRef.current = null;
        }
        return;
      }

      // Scan the next chunk window for a sentence boundary so we can seal the
      // current bubble at a natural break instead of mid-clause.
      const buf = textBufferRef.current;
      const windowSize = Math.min(TYPEWRITER_CHARS_PER_TICK, buf.length);
      let stopAt = windowSize;
      let sealed = false;
      for (let i = 0; i < windowSize; i++) {
        const c = buf[i];
        const next = buf[i + 1];
        if (SENTENCE_END.test(c) && next && /\s/.test(next)) {
          stopAt = i + 1;
          sealed = true;
          break;
        }
      }
      const out = buf.slice(0, stopAt);
      let remainder = buf.slice(stopAt);
      if (sealed) {
        // Eat the whitespace that would otherwise lead the next bubble.
        remainder = remainder.replace(/^\s+/, '');
        pauseTicksRef.current = PAUSE_BETWEEN_BUBBLES_TICKS;
        needNewBubbleRef.current = true;
      }
      textBufferRef.current = remainder;
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'model') {
          copy[copy.length - 1] = { ...last, content: last.content + out };
        }
        return copy;
      });
    }, TYPEWRITER_TICK_MS);
  }

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    // User just acted — they want to see the result regardless of prior scroll position.
    stickToBottomRef.current = true;
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages([...next, { role: 'model', content: '' }]);
    setText('');
    setBusy(true);
    // Reset typewriter state for this turn.
    textBufferRef.current = '';
    streamDoneRef.current = false;
    pauseTicksRef.current = 0;
    needNewBubbleRef.current = false;
    pendingDraftRef.current = null;
    pendingSkippedRef.current = [];

    try {
      const baseMessages = next
        .filter((m) => m !== WELCOME)
        .map(({ role, content }) => ({ role, content }));

      // If a previous draft is still on screen (pending or saving), seed the
      // model with the user's current edits so it doesn't re-introduce
      // ingredients the user removed/changed when answering the next request.
      const pending = [...messages]
        .reverse()
        .find(
          (m) =>
            m.role === 'model' &&
            m.draft &&
            m.draftStatus !== 'discarded' &&
            m.draftStatus !== 'saved',
        );
      const apiMessages =
        pending?.draft && baseMessages.length > 0
          ? [
              ...baseMessages.slice(0, -1),
              {
                role: 'model' as const,
                content: `Estado actual de la receta tras las ediciones del usuario:\n\`\`\`json\n${JSON.stringify(pending.draft, null, 2)}\n\`\`\`\nUsa este estado como base. Aplica solo el cambio que pida el usuario; no reintroduzcas ingredientes que ya quitó ni revierte cantidades que ya ajustó.`,
              },
              baseMessages[baseMessages.length - 1],
            ]
          : baseMessages;
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
      // Abort the typewriter on error — drop any buffered text so the
      // drain-wait in `finally` resolves immediately.
      textBufferRef.current = '';
      if (drainTimerRef.current != null) {
        window.clearInterval(drainTimerRef.current);
        drainTimerRef.current = null;
      }
      toast.show('No se pudo enviar el mensaje', 'error');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      // Mark stream complete and wait for the typewriter to flush the buffer
      // before flipping busy=false. Otherwise `streaming` would go false while
      // text is still being typed out, killing Streamdown's per-word fade.
      streamDoneRef.current = true;
      if (textBufferRef.current.length > 0 || drainTimerRef.current != null) {
        await new Promise<void>((resolve) => {
          drainResolverRef.current = resolve;
        });
      }
      setBusy(false);
    }

    function handleEvent(ev: { event: string; data: unknown }) {
      const data = ev.data as Record<string, unknown>;
      if (ev.event === 'text') {
        const delta = String(data.delta ?? '');
        // Push into the typewriter buffer; the drain timer applies it to
        // state at TYPEWRITER_CHARS_PER_TICK chars per TYPEWRITER_TICK_MS.
        textBufferRef.current += delta;
        ensureDrainRunning();
      } else if (ev.event === 'recipe_draft') {
        // Defer: the draft must attach to the FINAL bubble of the turn, but
        // continuation bubbles may still be created by the typewriter after
        // this event fires. We apply it once the drain finishes.
        pendingDraftRef.current = data as unknown as RecipeDraft;
        ensureDrainRunning();
      } else if (ev.event === 'recipe_skipped') {
        pendingSkippedRef.current.push(String(data.name ?? ''));
        ensureDrainRunning();
      } else if (ev.event === 'tool_error') {
        toast.show(String(data.error ?? 'Error con la herramienta'), 'error');
      } else if (ev.event === 'done') {
        if (typeof data.used === 'number') setUsedToday(data.used);
        if (typeof data.cap === 'number') setCapToday(data.cap);
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

  function updateDraft(messageIndex: number, edited: RecipeDraft) {
    setMessages((prev) => {
      const copy = [...prev];
      const m = copy[messageIndex];
      if (m && m.draft) copy[messageIndex] = { ...m, draft: edited };
      return copy;
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const hasHistory = messages.length > 1;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {hasHistory && (
        <div className="mx-auto w-full max-w-3xl flex justify-end -mb-2">
          <button
            type="button"
            onClick={resetChat}
            disabled={busy}
            aria-label="Nueva conversación"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface text-text-muted text-[11px] font-medium tracking-tight active:scale-95 transition-all disabled:opacity-40 hover:text-text"
          >
            <RotateCcw size={12} strokeWidth={2.5} />
            Nueva conversación
          </button>
        </div>
      )}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto no-scrollbar"
      >
        <div className="mx-auto max-w-3xl flex flex-col gap-5 pb-2">
          {messages.map((m, i) => (
            <Message
              key={i}
              message={m}
              streaming={busy && i === messages.length - 1}
              onSaveDraft={(edited) => saveDraft(i, edited)}
              onDiscardDraft={() => discardDraft(i)}
              onChangeDraft={(edited) => updateDraft(i, edited)}
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
            className="flex-1 bg-surface rounded-2xl px-4 py-3 text-sm text-text placeholder:text-text-muted/60 outline-none focus:ring-2 focus:ring-accent/50 resize-none max-h-[calc(5lh+1.5rem)] disabled:opacity-60 no-scrollbar"
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
        <ChatUsageBar liveUsed={usedToday} liveCap={capToday} compact />

      </div>
    </div>
  );
}

function Message({
  message,
  streaming,
  onSaveDraft,
  onDiscardDraft,
  onChangeDraft,
}: {
  message: ChatMessage;
  streaming: boolean;
  onSaveDraft: (edited: RecipeDraft) => void;
  onDiscardDraft: () => void;
  onChangeDraft: (edited: RecipeDraft) => void;
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
      {empty && streaming && !message.isContinuation ? (
        <ThinkingDots />
      ) : (
        <>
          {message.content && (
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-surface rounded-2xl rounded-bl-md px-4 py-3">
                <Streamdown
                  controls={false}
                  isAnimating={streaming}
                  // Pacing is owned by the typewriter throttle in send()
                  // (see TYPEWRITER_* constants). Streamdown just softens the
                  // appearance of each new character with a short fade.
                  animated={{ animation: 'fadeIn', duration: 180, sep: 'char', stagger: 0 }}
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
                        className="px-1 py-0.5 rounded bg-surface-2 text-[0.9em] font-mono"
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
                </Streamdown>
              </div>
            </div>
          )}

          {showDraft && message.draft && (
            <div className="mt-3 mx-2">
              <RecipeDraftCard
                draft={message.draft}
                onSave={onSaveDraft}
                onDiscard={onDiscardDraft}
                onChange={onChangeDraft}
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
    <div className="inline-flex items-center gap-2 text-text-muted text-sm py-1">
      <Sparkles size={14} className="text-accent animate-thinking-spin" />
      <span className="animate-thinking-shimmer bg-clip-text text-transparent bg-[linear-gradient(90deg,rgb(var(--text-muted))_0%,rgb(var(--text))_50%,rgb(var(--text-muted))_100%)] bg-[length:200%_100%]">
        Pensando…
      </span>
      <style jsx global>{`
        @keyframes thinking-spin {
          0%, 100% { transform: rotate(0deg) scale(1); opacity: 0.7; }
          50% { transform: rotate(180deg) scale(1.15); opacity: 1; }
        }
        .animate-thinking-spin {
          animation: thinking-spin 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes thinking-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-thinking-shimmer {
          animation: thinking-shimmer 2.2s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-thinking-spin, .animate-thinking-shimmer { animation: none; }
        }
      `}</style>
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
