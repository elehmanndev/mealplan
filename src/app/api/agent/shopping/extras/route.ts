import { agentRoute } from '@/lib/agent-route';
import { agentShoppingAdd } from '@/lib/agent-ops';

export const dynamic = 'force-dynamic';

// POST /api/agent/shopping/extras { name, date?, quantity?, unit?, shopping_category?, supermarket? }
export async function POST(request: Request) {
  return agentRoute(request, agentShoppingAdd);
}
