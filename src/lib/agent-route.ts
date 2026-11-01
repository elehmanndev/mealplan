import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { agentHouseholdId } from '@/lib/agent-auth';
import { NotFoundError } from '@/lib/errors';

// Wraps an /api/agent handler: bearer auth (401), JSON body parsing, and the
// error mapping shared by every agent endpoint (zod → 400, not found → 404).
export async function agentRoute(
  request: Request,
  handler: (householdId: number, body: unknown) => unknown,
): Promise<NextResponse> {
  const householdId = agentHouseholdId(request);
  if (householdId === null) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown = undefined;
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'body must be JSON' }, { status: 400 });
    }
  }
  try {
    return NextResponse.json(await handler(householdId, body));
  } catch (err) {
    return agentErrorResponse(err);
  }
}

export function agentErrorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: 'validation', issues: err.issues }, { status: 400 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  console.error('[agent-api]', err);
  return NextResponse.json({ error: 'internal error' }, { status: 500 });
}

export type IdParams = { params: Promise<{ id: string }> };

// Path ids arrive as strings; non-numeric ones fail zod's int check → 400.
export async function paramId({ params }: IdParams): Promise<number> {
  const { id } = await params;
  return /^\d+$/.test(id) ? Number(id) : NaN;
}
