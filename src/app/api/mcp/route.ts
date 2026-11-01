import { NextResponse } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { agentHouseholdId } from '@/lib/agent-auth';
import { buildMcpServer } from '@/lib/mcp-server';

export const dynamic = 'force-dynamic';

// MCP Streamable HTTP, stateless: one server + transport per request, JSON
// responses (no SSE). Same bearer token/household as /api/agent.
async function handle(request: Request): Promise<Response> {
  const householdId = agentHouseholdId(request);
  if (householdId === null) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const server = buildMcpServer(householdId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    void server.close();
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
