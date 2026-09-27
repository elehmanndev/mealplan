import { BottomNav } from '@/components/ui/BottomNav';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { getCurrentWeek } from '@/lib/week';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  const week = getCurrentWeek();
  return (
    <main data-chat-main className="flex flex-col h-[100dvh] pb-28">
      <div className="flex-1 min-h-0 flex flex-col pb-2">
        <ChatPanel />
      </div>
      <BottomNav currentWeek={week} />
    </main>
  );
}
