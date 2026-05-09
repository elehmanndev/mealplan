import { BottomNav } from '@/components/ui/BottomNav';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { getCurrentWeek } from '@/lib/week';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const week = getCurrentWeek();
  return (
    <main className="flex flex-col h-[100dvh] bg-bg safe-top pb-24">
      <div className="flex-1 min-h-0 flex flex-col px-4 pt-12 pb-2">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-3xl font-bold text-text mb-4">Chat</h1>
        </div>
        <ChatPanel />
      </div>
      <BottomNav currentWeek={week} />
    </main>
  );
}
