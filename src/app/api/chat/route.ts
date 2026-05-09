import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  type Content,
  type FunctionDeclaration,
} from '@google/genai';
import { z } from 'zod';
import { RECIPE_CATEGORIES, RECIPE_TAGS, UNITS } from '@/types';
import { SHOPPING_CATEGORIES } from '@/lib/shopping-types';
import { SUPERMARKETS } from '@/lib/supermarkets';
import { importRecipes } from '@/lib/recipe-import';
import { checkAndIncrement, getClientIp, PER_IP_DAILY_CAP } from '@/lib/chat-rate-limit';

export const dynamic = 'force-dynamic';

const MODEL = 'gemini-2.5-flash-lite';
const MAX_TOOL_ROUNDS = 6;

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string().min(1).max(4000),
});

const PayloadSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
});

const SUPERMARKET_IDS = SUPERMARKETS.map((s) => s.id) as [string, ...string[]];

const ChatIngredientSchema = z.object({
  name: z.string().min(1),
  is_pantry: z.boolean().optional(),
  quantity: z.number().positive().optional(),
  unit: z.enum(UNITS).optional(),
  shopping_category: z.enum(SHOPPING_CATEGORIES).optional(),
  supermarket: z.enum(SUPERMARKET_IDS).optional(),
});

const ChatRecipeSchema = z
  .object({
    name: z.string().min(1),
    emoji: z.string().min(1),
    servings: z.number().int().positive(),
    category: z.enum(RECIPE_CATEGORIES),
    prep_time_min: z.number().int().positive(),
    description: z.string().min(10),
    notes: z.string().optional(),
    tags: z.array(z.enum(RECIPE_TAGS)).optional(),
    ingredients: z.array(ChatIngredientSchema).min(1),
  })
  .superRefine((data, ctx) => {
    data.ingredients.forEach((ing, idx) => {
      if (ing.is_pantry) return;
      if (ing.quantity == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.invalid_type,
          expected: z.ZodParsedType.number,
          received: z.ZodParsedType.undefined,
          path: ['ingredients', idx, 'quantity'],
          message: 'Required',
        });
      }
      if (ing.unit == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.invalid_type,
          expected: z.ZodParsedType.string,
          received: z.ZodParsedType.undefined,
          path: ['ingredients', idx, 'unit'],
          message: 'Required',
        });
      }
      if (ing.supermarket == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.invalid_type,
          expected: z.ZodParsedType.string,
          received: z.ZodParsedType.undefined,
          path: ['ingredients', idx, 'supermarket'],
          message: 'Required',
        });
      }
    });
  });

const MODEL_FILLED_FIELDS = new Set(['name', 'emoji', 'category', 'description']);

type ChatRecipeInput = z.infer<typeof ChatRecipeSchema>;

const PANTRY_DEFAULT_UNIT: (typeof UNITS)[number] = 'al_gusto';

const SYSTEM_PROMPT = `Eres un asistente culinario de la app MealPlan. Hablas en castellano de forma cercana y breve. Puedes usar markdown ligero (negritas, listas).

Tu tarea es **guardar recetas en el recetario del usuario** llamando a la herramienta \`save_recipe\`. La herramienta es la que valida los datos: tú no decides si está completa, ella te lo dice.

**REGLA DE ORO — TRES GRUPOS DE CAMPOS:**

**Grupo A — TÚ rellenas siempre por tu cuenta** (NUNCA preguntes al usuario):
- \`name\`: normaliza/limpia lo que diga el usuario (ej. "fabada" → "Fabada Asturiana").
- \`emoji\`: elige uno apropiado (🥗 ensalada, 🍝 pasta, 🍲 sopa, 🥘 guiso, 🐟 pescado, 🍗 pollo, 🍰 postre…). Siempre uno.
- \`category\`: dedúcela del tipo de plato.
- \`description\`: redacta tú una descripción breve (1-2 frases) a partir del nombre/ingredientes.
- **Lista sugerida de ingredientes**: si el usuario solo te dio el nombre de la receta y no enumeró ingredientes, **sugiere tú una lista razonable de NOMBRES de ingredientes** (sin cantidades ni supermercados). El usuario revisará y aportará cantidades/supermercados.

**Grupo B — DEBES preguntar al usuario** si faltan:
- \`servings\` (raciones).
- \`prep_time_min\` (tiempo de preparación).
- Para los ingredientes **NO de despensa**: \`quantity\`, \`unit\` y \`supermarket\`.

**Grupo C — Ingredientes de despensa (\`is_pantry: true\`)**: aceite, sal, pimienta, especias, vinagre, ajo en polvo, azúcar, harina, agua, etc. Para estos:
- Marca \`is_pantry: true\`.
- **NO preguntes** cantidad, unidad ni supermercado — la app usa defaults sensatos.
- Tú solo proporcionas el \`name\` y opcionalmente \`shopping_category\` (suele ser "despensa").

**PROHIBIDO INVENTAR cantidades o supermercados** para ingredientes que NO sean de despensa. Solo el usuario los aporta.

**Flujo correcto:**
1. Pregunta al usuario los datos básicos de la receta de forma natural.
2. **Llama a \`save_recipe\` con todos los datos que tengas, aunque pienses que faltan cosas.** La herramienta responderá con uno de estos tres resultados:
   - \`ok: true\` con \`created\` o \`alreadyExists\` → la receta se guardó (o ya existía). Confirma al usuario.
   - \`ok: false\` con \`missing_fields\` → faltan campos. La herramienta te dice exactamente cuáles. Pregúntaselos al usuario en UN solo mensaje (bullets), recoge las respuestas y vuelve a llamar a \`save_recipe\` con los datos actualizados.
   - \`ok: false\` con \`invalid_fields\` → algunos valores no son válidos (p.ej. supermercado fuera de la lista). Pregunta al usuario por las correcciones y vuelve a llamar.
3. **NUNCA digas que has guardado una receta sin haber recibido \`ok: true\` de la herramienta.**
4. Cuando vuelvas a llamar a \`save_recipe\`, **incluye TODOS los datos** anteriores más los nuevos — no solo los que faltaban.
5. **NUNCA preguntes proactivamente por campos opcionales** (tags, descripción, notas) — solo pregunta por los que la herramienta marque como missing/invalid. La herramienta es la única fuente de verdad sobre qué falta.

**Reglas para los campos** (la herramienta los validará igualmente):
- \`unit\`: ${UNITS.join(', ')}
- \`shopping_category\`: ${SHOPPING_CATEGORIES.join(', ')} — esto puedes inferirlo del ingrediente (tomate→verduras, leche→lacteos…), no preguntes.
- \`supermarket\`: uno de ${SUPERMARKET_IDS.join(', ')}. **Nunca lo elijas por defecto** — pregunta siempre por cada ingrediente.
- \`category\`: ${RECIPE_CATEGORIES.join(', ')}.
- \`tags\`: cero o más de ${RECIPE_TAGS.join(', ')}.
- \`emoji\`: elígelo tú según la receta.

**Inferencias permitidas (sin preguntar):**
- "1 limón" → quantity=1, unit=ud
- "1 diente de ajo" → quantity=1, unit=diente
- "una pizca/un pellizco de sal" → quantity=1, unit=pellizco
- shopping_category según el ingrediente

Sé conciso. Una pregunta agrupada vale más que cinco preguntas seguidas.`;

const recipeJsonSchema = {
  type: 'object',
  description:
    'Datos de una receta para guardar. Llama con TODO lo que el usuario haya proporcionado realmente. NO inventes ingredientes, cantidades, supermercados ni ningún otro dato — si falta, omítelo y la herramienta te lo pedirá.',
  properties: {
    name: { type: 'string', description: 'Nombre de la receta' },
    emoji: { type: 'string' },
    servings: { type: 'integer', minimum: 1 },
    category: { type: 'string', enum: [...RECIPE_CATEGORIES] },
    prep_time_min: { type: 'integer', minimum: 1 },
    description: { type: 'string' },
    notes: { type: 'string' },
    tags: { type: 'array', items: { type: 'string', enum: [...RECIPE_TAGS] } },
    ingredients: {
      type: 'array',
      description:
        'Ingredientes de la receta. Si el usuario solo te dio el nombre, sugiere ingredientes razonables aquí (solo NOMBRES — no inventes cantidades ni supermercados). Marca con is_pantry=true los productos básicos de despensa (aceite, sal, pimienta, especias, vinagre, ajo en polvo, etc.).',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          is_pantry: {
            type: 'boolean',
            description:
              'true si es un básico de despensa (aceite, sal, pimienta, especias, vinagre…). Cuando es true, quantity/unit/supermarket no son necesarios — la app usará defaults.',
          },
          quantity: { type: 'number', minimum: 0 },
          unit: { type: 'string', enum: [...UNITS] },
          shopping_category: { type: 'string', enum: [...SHOPPING_CATEGORIES] },
          supermarket: { type: 'string', enum: [...SUPERMARKET_IDS] },
        },
      },
    },
  },
};

const saveRecipeDeclaration: FunctionDeclaration = {
  name: 'save_recipe',
  description:
    'Intenta guardar una receta en el recetario. Llama con TODOS los datos que tengas en cada turno, aunque estén incompletos. Si faltan campos o hay valores inválidos, la herramienta devuelve missing_fields/invalid_fields para que sepas qué pedirle al usuario.',
  parametersJsonSchema: recipeJsonSchema,
};

function toGeminiContents(messages: { role: 'user' | 'model'; content: string }[]): Content[] {
  return messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] }));
}

function formatPath(path: (string | number)[]): string {
  let out = '';
  for (const seg of path) {
    if (typeof seg === 'number') out += `[${seg}]`;
    else out += out ? `.${seg}` : seg;
  }
  return out;
}

interface ToolResult {
  ok: boolean;
  created?: { id: number; name: string };
  alreadyExists?: { name: string };
  missing_fields?: string[];
  invalid_fields?: { path: string; reason: string }[];
  next_action?: string;
  error?: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'el nombre de la receta',
  servings: 'cuántas raciones rinde',
  category: `la categoría (una de: ${RECIPE_CATEGORIES.join(', ')})`,
  prep_time_min: 'el tiempo total de preparación en minutos',
  ingredients: 'la lista de ingredientes (con cantidad, unidad y supermercado para cada uno)',
};

function describeMissingField(path: string): string {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  const ingMatch = path.match(/^ingredients\[(\d+)\]\.(.+)$/);
  if (ingMatch) {
    const idx = Number(ingMatch[1]) + 1;
    const sub = ingMatch[2];
    if (sub === 'name') return `nombre del ingrediente #${idx}`;
    if (sub === 'quantity') return `cantidad del ingrediente #${idx}`;
    if (sub === 'unit') return `unidad del ingrediente #${idx}`;
    if (sub === 'supermarket')
      return `supermercado del ingrediente #${idx} (uno de: ${SUPERMARKET_IDS.join(', ')})`;
    return `${sub} del ingrediente #${idx}`;
  }
  return path;
}

function topLevelKey(path: string): string {
  return path.split(/[.[]/)[0];
}

function buildUserQuestion(
  missing: string[],
  invalid: { path: string; reason: string }[],
): string | null {
  const userMissing = missing.filter((m) => !MODEL_FILLED_FIELDS.has(topLevelKey(m)));
  const userInvalid = invalid.filter((i) => !MODEL_FILLED_FIELDS.has(topLevelKey(i.path)));
  if (userMissing.length === 0 && userInvalid.length === 0) return null;
  const lines: string[] = ['Antes de guardar necesito un par de cosas:'];
  for (const m of userMissing) lines.push(`- ${describeMissingField(m)}`);
  for (const i of userInvalid) {
    lines.push(`- ${describeMissingField(i.path)} — corrige: ${i.reason}`);
  }
  return lines.join('\n');
}

function buildNextAction(missing: string[], invalid: { path: string; reason: string }[]): string {
  const parts: string[] = [];

  const missingModel = missing.filter((m) => MODEL_FILLED_FIELDS.has(m));
  const missingUser = missing.filter((m) => !MODEL_FILLED_FIELDS.has(m));

  if (missingModel.length) {
    parts.push(
      `Tú (asistente) debes rellenar estos campos por tu cuenta antes de volver a llamar, sin preguntar al usuario: ${missingModel.join(', ')}.`,
    );
  }
  if (missingUser.length) {
    const items = missingUser.map(describeMissingField);
    parts.push(
      `Pide al usuario, en UN solo mensaje con formato de lista de bullets, los siguientes datos: ${items.join('; ')}.`,
    );
  }
  if (invalid.length) {
    const userInvalid = invalid.filter((i) => !MODEL_FILLED_FIELDS.has(topLevelKey(i.path)));
    const modelInvalid = invalid.filter((i) => MODEL_FILLED_FIELDS.has(topLevelKey(i.path)));
    if (modelInvalid.length) {
      parts.push(
        `Corrige tú estos campos antes de reintentar: ${modelInvalid.map((i) => `${i.path} (${i.reason})`).join('; ')}.`,
      );
    }
    if (userInvalid.length) {
      const items = userInvalid.map((i) => `${describeMissingField(i.path)} (${i.reason})`);
      parts.push(`Pide al usuario corregir: ${items.join('; ')}.`);
    }
  }
  parts.push(
    'Cuando esté todo, llama de nuevo a save_recipe con TODOS los datos (los anteriores y los nuevos).',
  );
  return parts.join(' ');
}

function runSaveRecipeTool(args: unknown): ToolResult {
  const parsed = ChatRecipeSchema.safeParse(args ?? {});
  if (!parsed.success) {
    const missing: string[] = [];
    const invalid: { path: string; reason: string }[] = [];
    for (const issue of parsed.error.issues) {
      const path = formatPath(issue.path);
      if (
        issue.code === 'invalid_type' &&
        'received' in issue &&
        (issue as { received?: string }).received === 'undefined'
      ) {
        missing.push(path || '(root)');
      } else if (issue.code === 'too_small' && issue.path.length === 0) {
        missing.push('(root)');
      } else {
        invalid.push({ path: path || '(root)', reason: issue.message });
      }
    }
    return {
      ok: false,
      ...(missing.length ? { missing_fields: missing } : {}),
      ...(invalid.length ? { invalid_fields: invalid } : {}),
      next_action: buildNextAction(missing, invalid),
    };
  }
  try {
    const data = parsed.data as ChatRecipeInput;
    const importPayload = {
      ...data,
      ingredients: data.ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity ?? 1,
        unit: ing.unit ?? (ing.is_pantry ? PANTRY_DEFAULT_UNIT : 'ud'),
        shopping_category: ing.shopping_category,
        supermarket: ing.supermarket ?? null,
        is_pantry: ing.is_pantry,
      })),
    };
    const result = importRecipes([importPayload]);
    if (result.imported === 0 && result.skipped.length > 0) {
      return { ok: true, alreadyExists: { name: result.skipped[0] } };
    }
    return { ok: true, created: { id: result.insertedIds[0], name: data.name } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'No se pudo guardar la receta' };
  }
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      sseEvent('error', { message: 'GEMINI_API_KEY no configurada en el servidor' }),
      { status: 500, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new Response(sseEvent('error', { message: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const parsed = PayloadSchema.safeParse(json);
  if (!parsed.success) {
    return new Response(sseEvent('error', { message: 'Mensajes inválidos' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const ip = getClientIp(request);
  const limit = checkAndIncrement(ip);
  if (!limit.ok) {
    return new Response(
      sseEvent('error', {
        message: `Has alcanzado el límite diario de ${limit.cap} mensajes. Vuelve mañana.`,
        rateLimited: true,
      }),
      { status: 429, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents: Content[] = toGeminiContents(parsed.data.messages);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      try {
        let totalTextStreamed = 0;
        const recipesCreatedNames: string[] = [];
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const stream = await ai.models.generateContentStream({
            model: MODEL,
            contents,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              tools: [{ functionDeclarations: [saveRecipeDeclaration] }],
              toolConfig: {
                functionCallingConfig:
                  round === 0
                    ? {
                        mode: FunctionCallingConfigMode.ANY,
                        allowedFunctionNames: ['save_recipe'],
                      }
                    : { mode: FunctionCallingConfigMode.AUTO },
              },
              temperature: 0.3,
            },
          });

          let accumulatedText = '';
          const accumulatedCalls: { name: string; args: Record<string, unknown> }[] = [];

          for await (const chunk of stream) {
            const calls = chunk.functionCalls ?? [];
            if (calls.length > 0) {
              for (const c of calls) {
                accumulatedCalls.push({ name: c.name ?? '', args: c.args ?? {} });
              }
            }
            const text = chunk.text;
            if (text) {
              accumulatedText += text;
              totalTextStreamed += text.length;
              send('text', { delta: text });
            }
          }

          if (accumulatedCalls.length === 0) {
            break;
          }

          contents.push({
            role: 'model',
            parts: [
              ...(accumulatedText ? [{ text: accumulatedText }] : []),
              ...accumulatedCalls.map((c) => ({
                functionCall: { name: c.name, args: c.args },
              })),
            ],
          });

          const toolResults: ToolResult[] = [];
          const responseParts = accumulatedCalls.map((call) => {
            if (call.name !== 'save_recipe') {
              const result: ToolResult = { ok: false, error: 'Función desconocida' };
              toolResults.push(result);
              return {
                functionResponse: {
                  name: call.name || 'unknown',
                  response: result as unknown as Record<string, unknown>,
                },
              };
            }
            const result = runSaveRecipeTool(call.args);
            toolResults.push(result);
            if (result.created) {
              send('recipe_created', result.created);
              recipesCreatedNames.push(result.created.name);
            } else if (result.alreadyExists) {
              send('recipe_skipped', { name: result.alreadyExists.name });
            }
            return {
              functionResponse: {
                name: 'save_recipe',
                response: result as unknown as Record<string, unknown>,
              },
            };
          });
          contents.push({ role: 'user', parts: responseParts });

          // If any tool result has user-side missing/invalid, emit a deterministic
          // question and stop — don't burn another Gemini round just to verbalize it.
          const userQuestions = toolResults
            .map((r) =>
              r.ok ? null : buildUserQuestion(r.missing_fields ?? [], r.invalid_fields ?? []),
            )
            .filter((q): q is string => q !== null);
          if (userQuestions.length > 0) {
            const text = userQuestions.join('\n\n');
            totalTextStreamed += text.length;
            send('text', { delta: text });
            break;
          }
        }

        if (totalTextStreamed === 0) {
          const fallback =
            recipesCreatedNames.length > 0
              ? `Guardada **${recipesCreatedNames.join('**, **')}**.`
              : 'Listo.';
          send('text', { delta: fallback });
        }
        send('done', { remaining: limit.remaining, cap: PER_IP_DAILY_CAP });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error de Gemini';
        const isQuota = /quota|rate|429/i.test(msg);
        send('error', {
          message: isQuota
            ? 'El servicio está saturado por hoy. Inténtalo más tarde.'
            : 'No se pudo generar respuesta',
          rateLimited: isQuota,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
