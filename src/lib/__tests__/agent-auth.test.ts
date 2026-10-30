import { afterEach, describe, expect, it } from 'vitest';
import { agentHouseholdId } from '../agent-auth';

const req = (auth?: string) =>
  new Request('http://x/api/agent/plan', auth ? { headers: { authorization: auth } } : undefined);

describe('agentHouseholdId', () => {
  afterEach(() => {
    delete process.env.MEALPLAN_AGENT_TOKEN;
    delete process.env.MEALPLAN_AGENT_HOUSEHOLD_ID;
  });

  it('is disabled when no token is configured', () => {
    expect(agentHouseholdId(req('Bearer anything'))).toBeNull();
  });

  it('rejects a missing or wrong token', () => {
    process.env.MEALPLAN_AGENT_TOKEN = 'secret-token';
    expect(agentHouseholdId(req())).toBeNull();
    expect(agentHouseholdId(req('Bearer wrong'))).toBeNull();
    expect(agentHouseholdId(req('secret-token'))).toBeNull();
  });

  it('returns household 1 by default for the right token', () => {
    process.env.MEALPLAN_AGENT_TOKEN = 'secret-token';
    expect(agentHouseholdId(req('Bearer secret-token'))).toBe(1);
  });

  it('honours MEALPLAN_AGENT_HOUSEHOLD_ID', () => {
    process.env.MEALPLAN_AGENT_TOKEN = 'secret-token';
    process.env.MEALPLAN_AGENT_HOUSEHOLD_ID = '3';
    expect(agentHouseholdId(req('Bearer secret-token'))).toBe(3);
  });
});
