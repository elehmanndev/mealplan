import { Sparkles } from 'lucide-react';
import { BottomNav } from '@/components/ui/BottomNav';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { getCurrentWeek } from '@/lib/week';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const week = getCurrentWeek();
  return (
    <main
      className="flex flex-col bg-bg safe-top"
      style={{ height: 'var(--vvh, 100dvh)', paddingBottom: 'max(0px, calc(96px - var(--vvb, 0px)))' }}
    >
      <div className="flex-1 min-h-0 flex flex-col px-4 pt-12 pb-2">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-3xl font-bold text-text mb-4 flex items-center gap-2">
            <Sparkles size={26} strokeWidth={2.25} className="text-accent" />
            Chat
          </h1>
        </div>
        <ChatPanel />
      </div>
      <BottomNav currentWeek={week} />
    </main>
  );
}
