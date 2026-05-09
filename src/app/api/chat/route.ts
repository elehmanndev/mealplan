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
import { db } from '@/lib/db';
import { checkAndIncrement, getClientIp, PER_IP_DAILY_CAP } from '@/lib/chat-rate-limit';

export const dynamic = 'force-dynamic';

const MODEL = 'gemini-2.5-flash-lite';
const MAX_TOOL_ROUNDS = 3;

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
    // Model-domain fields are OPTIONAL at the schema level — the model is
    // encouraged via the prompt to always fill them, but Flash-Lite occasionally
    // misses one. Server-side defaults below keep the save flowing rather than
    // bouncing on a missing emoji or short description.
    emoji: z.string().min(1).optional(),
    servings: z.number().int().positive(),
    category: z.enum(RECIPE_CATEGORIES).optional(),
    prep_time_min: z.number().int().positive().optional(),
    description: z.string().min(1).optional(),
    notes: z.string().optional(),
    tags: z.array(z.enum(RECIPE_TAGS)).optional(),
    ingredients: z.array(ChatIngredientSchema).min(1),
  })
  // Ingredient-level fields (quantity/unit/supermarket) are no longer required
  // at the schema level — the model estimates everything based on recipe +
  // servings, and any holes get safe server-side defaults at import time. The
  // only field the user must ever provide is `servings`.

const MODEL_FILLED_FIELDS = new Set([
  'name',
  'emoji',
  'category',
  'description',
  'prep_time_min',
  // Everything ingredient-related: model estimates quantities, units,
  // supermarkets — user is never asked about ingredients.
  'ingredients',
]);

type ChatRecipeInput = z.infer<typeof ChatRecipeSchema>;

const PANTRY_DEFAULT_UNIT: (typeof UNITS)[number] = 'al_gusto';

const SYSTEM_PROMPT = `Eres un asistente culinario de la app MealPlan. Hablas en castellano de forma cercana y breve. Puedes usar markdown ligero (negritas, listas).

Tu tarea es **guardar recetas en el recetario del usuario** llamando a la herramienta \`save_recipe\`. La herramienta es la que valida los datos: tú no decides si está completa, ella te lo dice.

**REGLA DE ORO — TÚ RELLENAS PRÁCTICAMENTE TODO.** El único dato que pides al usuario si falta es \`servings\` (raciones). Lo demás lo estimas tú con criterio razonable y el usuario lo edita después si quiere.

**Lo que rellenas tú** (NUNCA preguntes):
- \`name\`: normaliza/limpia lo que diga el usuario (ej. "fabada" → "Fabada Asturiana").
- \`emoji\`: uno apropiado (🥗 ensalada, 🍝 pasta, 🍲 sopa, 🥘 guiso, 🐟 pescado, 🍗 pollo, 🍰 postre…).
- \`category\`: dedúcela del tipo de plato.
- \`description\`: una frase breve a partir del nombre/ingredientes.
- \`prep_time_min\`: estímalo (ensalada ~15, pasta ~20, guiso 45-60, asado 60-90 min).
- **Lista de ingredientes** completa con \`name\`, \`quantity\`, \`unit\`, \`supermarket\`, y opcionalmente \`shopping_category\`. Para cada ingrediente:
  - \`quantity\` y \`unit\`: estima en función del plato y las raciones (proteínas ~150-200 g/persona, arroz seco ~80 g/persona, pasta seca ~80-100 g/persona, verdura ~150-200 g/persona, huevos por unidad…). No dejes ninguno vacío.
  - \`supermarket\`: elige el más probable en España de la lista (${SUPERMARKET_IDS.join(', ')}). Para carne/pescado/embutido suele encajar **bon-area**; para producto fresco genérico **mercadona**; para productos puntuales (lácteos exóticos, congelados) **lidl** o **aldi**. Nunca lo dejes vacío en ingredientes no-pantry.
  - Marca con \`is_pantry: true\` los básicos de despensa (aceite, sal, pimienta, especias, vinagre, ajo en polvo, azúcar, harina, agua…). Para estos no necesitas \`quantity\`/\`unit\`/\`supermarket\` — la app pone defaults.

**Lo que pide el usuario** (lo único):
- \`servings\` — si no lo dijo, pregúntalo en una frase corta.

Si el usuario te corrige cualquier estimación tuya en un turno posterior (por ejemplo "no, salmón pongo solo 200g" o "ese ingrediente lo compro en lidl"), **mantén el resto de tu propuesta anterior** y aplica solo el cambio. No pierdas datos ya rellenados.

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

export interface RecipeDraft {
  name: string;
  emoji?: string;
  servings: number;
  category?: (typeof RECIPE_CATEGORIES)[number];
  prep_time_min?: number;
  description?: string;
  notes?: string;
  tags?: (typeof RECIPE_TAGS)[number][];
  ingredients: {
    name: string;
    quantity: number;
    unit: (typeof UNITS)[number];
    shopping_category?: (typeof SHOPPING_CATEGORIES)[number];
    supermarket?: string | null;
    is_pantry?: boolean;
  }[];
}

interface ToolResult {
  ok: boolean;
  draft?: RecipeDraft;
  alreadyExists?: { name: string };
  missing_fields?: string[];
  invalid_fields?: { path: string; reason: string }[];
  ingredient_names?: string[];
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

function describeMissingField(path: string, ingredientNames?: string[]): string {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  const ingMatch = path.match(/^ingredients\[(\d+)\]\.(.+)$/);
  if (ingMatch) {
    const idx = Number(ingMatch[1]);
    const name = ingredientNames?.[idx];
    const label = name ? `**${name}**` : `ingrediente #${idx + 1}`;
    const sub = ingMatch[2];
    if (sub === 'name') return `nombre de ${label}`;
    if (sub === 'quantity') return `cantidad de ${label}`;
    if (sub === 'unit') return `unidad de ${label}`;
    if (sub === 'supermarket')
      return `supermercado de ${label} (uno de: ${SUPERMARKET_IDS.join(', ')})`;
    return `${sub} de ${label}`;
  }
  return path;
}

function topLevelKey(path: string): string {
  return path.split(/[.[]/)[0];
}

function buildUserQuestion(
  missing: string[],
  invalid: { path: string; reason: string }[],
  ingredientNames?: string[],
): string | null {
  const userMissing = missing.filter((m) => !MODEL_FILLED_FIELDS.has(topLevelKey(m)));
  const userInvalid = invalid.filter((i) => !MODEL_FILLED_FIELDS.has(topLevelKey(i.path)));
  if (userMissing.length === 0 && userInvalid.length === 0) return null;
  const lines: string[] = ['Antes de guardar necesito un par de cosas:'];
  for (const m of userMissing) lines.push(`- ${describeMissingField(m, ingredientNames)}`);
  for (const i of userInvalid) {
    lines.push(`- ${describeMissingField(i.path, ingredientNames)} — corrige: ${i.reason}`);
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
    const items = missingUser.map((m) => describeMissingField(m));
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

function extractIngredientNames(args: unknown): string[] {
  if (!args || typeof args !== 'object') return [];
  const ings = (args as { ingredients?: unknown }).ingredients;
  if (!Array.isArray(ings)) return [];
  return ings.map((ing) => {
    if (ing && typeof ing === 'object' && typeof (ing as { name?: unknown }).name === 'string') {
      return (ing as { name: string }).name;
    }
    return '';
  });
}

function runSaveRecipeTool(args: unknown): ToolResult {
  const ingredientNames = extractIngredientNames(args);
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
      ...(ingredientNames.length ? { ingredient_names: ingredientNames } : {}),
      next_action: buildNextAction(missing, invalid),
    };
  }
  const data = parsed.data as ChatRecipeInput;
  const existing = db
    .prepare('SELECT name FROM recipes WHERE LOWER(name) = LOWER(?)')
    .get(data.name.trim()) as { name: string } | undefined;
  if (existing) {
    return { ok: true, alreadyExists: { name: existing.name } };
  }
  const draft: RecipeDraft = {
    name: data.name.trim(),
    emoji: data.emoji,
    servings: data.servings,
    category: data.category,
    prep_time_min: data.prep_time_min,
    description: data.description,
    notes: data.notes,
    tags: data.tags ?? [],
    ingredients: data.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity ?? 1,
      unit: ing.unit ?? (ing.is_pantry ? PANTRY_DEFAULT_UNIT : 'ud'),
      shopping_category: ing.shopping_category,
      supermarket: ing.supermarket ?? null,
      is_pantry: !!ing.is_pantry,
    })),
  };
  return { ok: true, draft };
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
        let draftEmitted = false;
        const recipesSkippedNames: string[] = [];
        let lastValidationFailedModelDomain = false;
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
            if (result.draft) {
              send('recipe_draft', result.draft);
              draftEmitted = true;
            } else if (result.alreadyExists) {
              send('recipe_skipped', { name: result.alreadyExists.name });
              recipesSkippedNames.push(result.alreadyExists.name);
            } else if (!result.ok) {
              const userMissing = (result.missing_fields ?? []).filter(
                (m) => !MODEL_FILLED_FIELDS.has(topLevelKey(m)),
              );
              const userInvalid = (result.invalid_fields ?? []).filter(
                (i) => !MODEL_FILLED_FIELDS.has(topLevelKey(i.path)),
              );
              lastValidationFailedModelDomain = userMissing.length === 0 && userInvalid.length === 0;
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
              r.ok
                ? null
                : buildUserQuestion(
                    r.missing_fields ?? [],
                    r.invalid_fields ?? [],
                    r.ingredient_names,
                  ),
            )
            .filter((q): q is string => q !== null);
          if (userQuestions.length > 0) {
            const text = userQuestions.join('\n\n');
            totalTextStreamed += text.length;
            send('text', { delta: text });
            break;
          }

          // If a draft was emitted or a recipe is duplicate, short-circuit with a
          // deterministic confirmation — don't burn a Gemini round in AUTO mode
          // that often produces no text on Flash-Lite.
          const anySuccess = toolResults.some((r) => r.ok);
          if (anySuccess) {
            const parts: string[] = [];
            if (draftEmitted) {
              parts.push(
                'Aquí tienes la receta. Revísala, edita lo que quieras y pulsa **Guardar**.',
              );
            }
            if (recipesSkippedNames.length) {
              parts.push(
                `**${recipesSkippedNames.join('**, **')}** ya estaba en tu recetario, no la he duplicado.`,
              );
            }
            const text = parts.join(' ');
            totalTextStreamed += text.length;
            send('text', { delta: text });
            break;
          }
        }

        if (totalTextStreamed === 0) {
          const fallback = lastValidationFailedModelDomain
            ? 'Algo no me ha cuadrado por dentro al preparar la receta. ¿Podrías volver a contarme los datos?'
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
