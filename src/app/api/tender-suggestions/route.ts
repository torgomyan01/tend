import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DESCRIPTION_MIN_CHARS = 200;
const DESCRIPTION_MAX_CHARS = 5000;

const requestSchema = z.object({
  kind: z.enum(["title", "description"]).optional(),
  services: z
    .array(
      z.object({
        category: z.string().trim().min(1).max(160),
        service: z.string().trim().min(1).max(160),
      }),
    )
    .min(1)
    .max(10),
  /** Վերնագրի ուղղում/գեներացիա (kind=title); description-ում չենք օգտագործում mode-ը որոշելու համար */
  title: z.string().trim().max(200).optional(),
  /** Նախորդ քայլի վերնագիր՝ նկարագրության կոնտեքստ (kind=description) */
  tenderTitle: z.string().trim().max(200).optional(),
  /** Գոյություն ունեցող նախագիծ նկարագրության բարելավման համար (kind=description) */
  currentDescription: z.string().max(DESCRIPTION_MAX_CHARS).optional(),
  urgency: z.string().trim().max(40).optional(),
});

/** Վերնագիրը պատկանում է պատվիրատուին / կարիք ունեցող մարդկանց, ոչ թե կատարող ընկերության՝ «եմ իրականացնում» տոնով։ */
function normalizePatronNeedTone(title: string): string {
  let t = title.trim();
  const executorLead = [
    /^իրականացնում\s+եմ[՝,:\s\u2013\u2014-]*/iu,
    /^իրականացնում\s+ենք[՝,:\s\u2013\u2014-]*/iu,
    /^կատարում\s+եմ[՝,:\s\u2013\u2014-]*/iu,
    /^կատարում\s+ենք[՝,:\s\u2013\u2014-]*/iu,
    /^աշխատում\s+եմ[՝,:\s\u2013\u2014-]*/iu,
    /^ունեմ\s+իրականացնելու[՝,:\s\u2013\u2014-]*/iu,
  ];
  for (const re of executorLead) {
    if (re.test(t)) {
      t = ("Անհրաժեշտ է " + t.replace(re, "").trim()).replace(/\s+/g, " ").trim();
      break;
    }
  }
  return t;
}

function cleanTitle(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^```[a-z]*\s*/i, "").replace(/```$/i, "").trim();
  t = t.replace(/^"([\s\S]+)"$/, "$1").trim();
  t = t.replace(/[\r\n\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
  return normalizePatronNeedTone(t);
}

function isBadTitle(title: string): boolean {
  const t = title.trim();
  if (t.length < 20) return true;
  if (t.length > 170) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 4) return true;
  return false;
}

function cleanDescriptionText(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^```[a-z]*\s*/i, "").replace(/```$/i, "").trim();
  if (/^"[\s\S]+"$/u.test(t)) {
    t = t.replace(/^"([\s\S]+)"$/u, "$1").trim();
  }
  t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.replace(/\n{5,}/g, "\n\n\n\n").replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\s+$/gm, "").trim();
  return normalizePatronNeedToneWholeText(t);
}

/** Կիրառիր կատարողի սկզբավորումները միայն տեքստի ամենասկզբում (մեկնաբանություններ չեն խառնվում)։ */
function normalizePatronNeedToneWholeText(text: string): string {
  const firstNewline = text.indexOf("\n");
  const head = firstNewline === -1 ? text : text.slice(0, firstNewline);
  const tail = firstNewline === -1 ? "" : text.slice(firstNewline);
  return normalizePatronNeedTone(head) + tail;
}

function isBadDescription(text: string): boolean {
  const t = text.trim();
  if (t.length < DESCRIPTION_MIN_CHARS) return true;
  if (t.length > DESCRIPTION_MAX_CHARS) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 22) return true;
  return false;
}

function buildGeneratePrompt(
  services: Array<{ category: string; service: string }>,
  urgency?: string,
): string {
  const primary = services[0]!;
  const bundle = services.map((s) => s.service).join(", ");
  return [
    `Դու Tend.am հարթակի օգնական ես։`,
    `Լեզու: Հայերեն (hy-AM)։`,
    `Կոնտեքստ: վերնագիրը գրում է ՊԱՏՎԻՐԱՏՈՒԸ / գնորդը, ով ծառայության ԿԱՐԻՔ ունի (ոչ թե կատարող կազմակերպությունը)։`,
    `Տոն: պահանջ/անհրաժեշտություն, պրոֆեսիոնալ, հարգալից։`,
    ``,
    `Ընտրված ծառայություններ: ${bundle}`,
    `Հիմնական ծառայություն: ${primary.service}`,
    ...(urgency ? [`Շտապություն: ${urgency}`] : []),
    ``,
    `Առաջադրանք: Գեներացրու 1 լիարժեք վերնագիր՝ ըստ ընտրված ծառայությունների։`,
    `Պահանջներ:`,
    `- 30–150 նիշ`,
    `- առնվազն 4 բառ`,
    `- 1 տող`,
    `- Առանց markdown, առանց JSON, առանց չակերտների`,
    `- Լավագույն սկիզբներ (ըստ իմաստի).՝ «Անհրաժեշտ է …», «Կարիք կա …», «Պետք է …» (այս կարգի)`,
    `- Խստագույնս ՄԻ սկսիր «Իրականացնում եմ», «Կատարում եմ», «Աշխատում եմ» (դա կատարողի տոն է)`,
    `- Մի սկսիր «Փնտրում եմ» կամ «Փնտրում» բառերով`,
    `- Մի հորինիր գին/ամսաթիվ`,
  ].join("\n");
}

function buildRewritePrompt(
  services: Array<{ category: string; service: string }>,
  currentTitle: string,
  urgency?: string,
): string {
  const primary = services[0]!;
  const bundle = services.map((s) => s.service).join(", ");
  return [
    `Դու Tend.am հարթակի օգնական ես։`,
    `Լեզու: Հայերեն (hy-AM)։`,
    `Կոնտեքստ: վերնագիրը գրում է ՊԱՏՎԻՐԱՏՈՒԸ / գնորդը, ով ծառայության ԿԱՐԻՔ ունի (ոչ թե կատարող կազմակերպությունը)։`,
    `Տոն: պահանջ/անհրաժեշտություն, պրոֆեսիոնալ, հարգալից։`,
    ``,
    `Ընտրված ծառայություններ: ${bundle}`,
    `Հիմնական ծառայություն: ${primary.service}`,
    ...(urgency ? [`Շտապություն: ${urgency}`] : []),
    ``,
    `Սկզբնական վերնագիր: ${currentTitle}`,
    ``,
    `Առաջադրանք: Վերաշարադրիր վերնագիրը՝ դարձնելով ավելի գրագետ, վաճառող ու գեղեցիկ։`,
    `Կարող ես փոքր շտկումներ անել՝ ըստ ծառայության/կարքի, բայց իմաստը մի կորցրու։`,
    `Պահանջներ:`,
    `- 30–150 նիշ`,
    `- առնվազն 4 բառ`,
    `- 1 տող`,
    `- Առանց markdown, առանց JSON, առանց չակերտների`,
    `- Լավագույն սկիզբներ.՝ «Անհրաժեշտ է …», «Կարիք կա …», «Պետք է …»`,
    `- Խստագույնս մի օգտագործիր «Իրականացնում եմ / Կատարում եմ / Աշխատում եմ» (կատարողի տոն)`,
    `- Մի սկսիր «Փնտրում եմ» կամ «Փնտրում» բառերով`,
  ].join("\n");
}

function buildGenerateDescriptionPrompt(
  services: Array<{ category: string; service: string }>,
  tenderTitle?: string,
  urgency?: string,
): string {
  const primary = services[0]!;
  const bundle = services.map((s) => `${s.category}: ${s.service}`).join(" | ");
  return [
    `Դու Tend.am մրցանակային (tender) հարթակի օգնական ես։`,
    `Լեզու: Հայերեն (hy-AM)։`,
    `Կոնտեքստ: Նկարագիրը գրում է ՊԱՏՎԻՐԱՏՈՒԸ (պատվեր/կարիք ունեցող), իրենից որպես կատարող չի խոսում։`,
    `Օբյեկտը ոլորտին համապատասխան պատվեր է ընտրված ծառայությունների հիման վրա։`,
    ``,
    `Ընտրված ծառայություններ: ${bundle}`,
    `Հիմնական: ${primary.service} (${primary.category})`,
    ...(tenderTitle ? [`Վերնագիր / թեմա (եկող քայլ 1–ից եթե կա): ${tenderTitle}`] : []),
    ...(urgency ? [`Շտապություն: ${urgency}`] : []),
    ``,
    `Առաջադրանք: Կազմիր մեկ լավ կառուցված ՆԿԱՐԱԳՐՈՒԹՅԱՆ ՁԵՎԱՆՄՈՒՇ պատվիրատուի խոսքով՝ խնդիր/պահանջ/ապագա արդյունք, ոչ թե «եմ անում։» `,
    ``,
    `ԿԱՐԳԱՎՈՐ ՁԵՎ (պարտադիր բաժիններ՝ միայն տեքստով, առանց markdown # աստղանիշների)։`,
    `Օբյեկտ / վայր`,
    `Ներկա վիճակ / ինչ կա հիմա`,
    `Ինչ պետք է անել (աշխատանքի ծավալը, եզրեր, հստակ պահանջներ)`,
    `Նյութեր / սարքավորումներ (յուրի / պատվիրատուի)`,
    `Ժամկետ / հասանելիություն (տեղեր, որտեղ թույլատրելի է աշխատել)`,
    `Սպասվող արդյունք / ընդունման չափանիշներ`,
    `Հատուկ պահանջներ / սահմանափակումներ`,
    ``,
    `Պահանջներ:`,
    `- Ընդհանուր ${DESCRIPTION_MIN_CHARS}–${Math.min(1600, DESCRIPTION_MAX_CHARS)} նիշ (որ մնա տեղ մանրամասներ ավելացնելու)`,
    `- Բազմատող, պարբերություններով, կարդալի`,
    `- Տեղերում օգտագործիր «___» placeholder մանրամասների համար (գին, քմ, հասցե, ամսաթիվ) — մի հորինիր կոնկրետ գումար/ամսաթիվ`,
    `- Խստագույնս մի օգտագործիր «Իրականացնում եմ / Կատարում եմ / Աշխատում եմ»`,
    `- Առանց JSON, առանց կոդի բլոկների`,
  ].join("\n");
}

function buildRewriteDescriptionPrompt(
  services: Array<{ category: string; service: string }>,
  currentDescription: string,
  tenderTitle?: string,
  urgency?: string,
): string {
  const primary = services[0]!;
  const bundle = services.map((s) => `${s.category}: ${s.service}`).join(" | ");
  return [
    `Դու Tend.am մրցանակային հարթակի խմբագիր ես։`,
    `Լեզու: Հայերեն (hy-AM)։`,
    `ՊԱՏՎԻՐԱՏՈՒԻ տեսակետով նկարագիր (ոչ թե կատարողի)։`,
    ``,
    `Ծառայություններ: ${bundle}`,
    `Հիմնական: ${primary.service}`,
    ...(tenderTitle ? [`Վերնագիր: ${tenderTitle}`] : []),
    ...(urgency ? [`Շտապություն: ${urgency}`] : []),
    ``,
    `Սկզբնական նկարագրություն:`,
    currentDescription.trim(),
    ``,
    `Առաջադրանքը: Դարձրու նկարագիրը ավելի կառուցված, պրոֆեսիոնալ ու հասկանալի․.`,
    `- Պահպանիր մտքերն ու փաստերը, լրացրու բացերը placeholder «___», մի թողիր կիսատ`,
    `- Չխոսիր կատարողի փոխարեն («եմ անում / իրականացնում եմ»)`,
    `- Արդյունքը լինի առնվազն ${DESCRIPTION_MIN_CHARS} նիշ, առավելագույնը՝ սովորաբար մինչև ${DESCRIPTION_MAX_CHARS} նիշ`,
    `- Արդյունքը բազմատող լինի՝ պարբերություններով, առանց markdown # `,
  ].join("\n");
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Static fallbacks — 1.x / بعض 2.x ids are retired for “new API key” users per Google notices. */
const DEFAULT_MODEL_IDS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
];

function normalizeModelNames(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const candidates = [...(preferred ? [preferred] : []), ...DEFAULT_MODEL_IDS].filter((x): x is string =>
    Boolean(x && x.trim()),
  );

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of candidates) {
    const trimmed = name.trim();
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique;
}

type ListModelsPage = {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
  nextPageToken?: string;
};

function modelIdFromResourceName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("models/") ? trimmed.slice("models/".length) : trimmed;
}

function scoreModelForTitle(id: string): number {
  const lower = id.toLowerCase();
  if (lower.includes("embedding") || lower.includes("tts") || lower.includes("aqa")) return -1000;
  if (lower.includes("image") && lower.includes("flash")) return -50;
  let s = 0;
  if (lower.includes("2.5") && lower.includes("flash")) s += 120;
  if (lower.includes("2.5") && lower.includes("pro")) s += 80;
  if (lower.includes("2.0") && lower.includes("flash")) s += 50;
  if (lower.endsWith("-lite") || lower.includes("-flash-lite")) s -= 8;
  if (lower.includes("exp") || lower.includes("preview")) s -= 3;
  return s;
}

/** Lists models exposed for this API key and keeps those that advertise generateContent. */
async function listGeminiGenerateContentModelIds(apiKey: string): Promise<string[]> {
  const listUrl = "https://generativelanguage.googleapis.com/v1beta/models";
  const collected: string[] = [];
  let pageToken: string | undefined;

  try {
    for (let guard = 0; guard < 25; guard += 1) {
      const url = new URL(listUrl);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("pageSize", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok) break;

      const data = (await res.json()) as ListModelsPage;
      for (const m of data.models ?? []) {
        if (!m.supportedGenerationMethods?.includes("generateContent")) continue;
        const id = modelIdFromResourceName(m.name ?? "");
        if (id) collected.push(id);
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
  } catch {
    return [];
  }

  const uniq = [...new Set(collected)];
  uniq.sort((a, b) => scoreModelForTitle(b) - scoreModelForTitle(a));
  return uniq;
}

function mergeModelOrder(params: {
  preferred?: string | null;
  fromApi: string[];
  fallback: string[];
}): string[] {
  const { preferred, fromApi, fallback } = params;
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (id: string) => {
    const t = id.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  if (preferred) push(preferred);
  // Prefer IDs the key actually exposes (fixes “wrong default model forever” issues).
  for (const id of fromApi) push(id);
  for (const id of fallback) push(id);
  return out;
}

function normalizeBases(): string[] {
  const preferred = process.env.GEMINI_API_BASE?.trim();
  const bases = [
    preferred,
    "https://generativelanguage.googleapis.com/v1beta",
    "https://generativelanguage.googleapis.com/v1",
  ].filter((x): x is string => Boolean(x && x.trim()));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of bases) {
    const trimmed = b.trim().replace(/\/+$/, "");
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  promptFeedback?: unknown;
  error?: { message?: string; status?: string };
};

async function callGeminiREST(params: {
  base: string;
  apiKey: string;
  modelName: string;
  prompt: string;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; bodyText: string }> {
  const { base, apiKey, modelName, prompt } = params;
  const modelPath = modelName.startsWith("models/") ? modelName : `models/${modelName}`;
  const url = `${base}/${modelPath}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const bodyText = await res.text().catch(() => "");
  if (!res.ok) return { ok: false, status: res.status, bodyText };

  let data: GeminiGenerateResponse | null = null;
  try {
    data = JSON.parse(bodyText) as GeminiGenerateResponse;
  } catch {
    data = null;
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("")?.trim() ?? "";

  if (!text) {
    // If the response shape differs, return a soft failure with details.
    return {
      ok: false,
      status: 502,
      bodyText: bodyText || safeJsonStringify(data),
    };
  }

  return { ok: true, text };
}

async function generateWithRetry(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY_NOT_SET");

  const preferred = process.env.GEMINI_MODEL?.trim();
  const fromApi = await listGeminiGenerateContentModelIds(apiKey);
  const modelNames = mergeModelOrder({
    preferred: preferred ?? null,
    fromApi,
    fallback: normalizeModelNames(),
  });
  if (modelNames.length === 0) throw new Error("GEMINI_MODEL_NOT_SET");

  if (process.env.NODE_ENV !== "production" && fromApi.length > 0) {
    console.debug("[tender-suggestions] Gemini models (generateContent):", fromApi.slice(0, 12));
  }
  const bases = normalizeBases();

  const maxAttempts = 3;
  let lastStatus: number | null = null;
  let lastBody = "";

  for (const base of bases) {
    for (const modelName of modelNames) {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[tender-suggestions] Gemini REST attempt:", {
            base,
            modelName,
            attempt,
          });
        }

        const result = await callGeminiREST({ base, apiKey, modelName, prompt });
        if (result.ok) return result.text;

        lastStatus = result.status;
        lastBody = result.bodyText;

        // Model/base not found → try next combination immediately
        if (result.status === 404) break;

        // High demand / transient → retry
        if (result.status === 429 || result.status === 500 || result.status === 503) {
          if (attempt === maxAttempts) break;
          const delay = 600 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
          await sleep(delay);
          continue;
        }

        // Other errors (401/403/etc.) shouldn't loop forever
        break;
      }
    }
  }

  const err = new Error(
    lastStatus ? `GEMINI_REST_FAILED_${lastStatus}` : "GEMINI_REST_FAILED",
  );
  (err as Error & { status?: number; body?: string }).status = lastStatus ?? undefined;
  (err as Error & { status?: number; body?: string }).body = lastBody;
  throw err;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const { services, title, tenderTitle, currentDescription, urgency } = parsed.data;
  const kind = parsed.data.kind ?? "title";

  try {
    if (kind === "description") {
      const draft = (currentDescription ?? "").trim();
      const descMode = draft.length > 0 ? "rewrite" : "generate";
      const ctxTitle = (tenderTitle ?? "").trim();
      const promptDesc =
        descMode === "rewrite"
          ? buildRewriteDescriptionPrompt(services, draft, ctxTitle || undefined, urgency)
          : buildGenerateDescriptionPrompt(services, ctxTitle || undefined, urgency);

      const rawDesc = await generateWithRetry(promptDesc);
      if (process.env.NODE_ENV !== "production") {
        console.debug("[tender-suggestions] description raw(full):", { descMode, rawDesc });
      }
      let cleanedDesc = cleanDescriptionText(rawDesc);
      if (!cleanedDesc || isBadDescription(cleanedDesc)) {
        const strictDesc = `${promptDesc}\n\nՊարտադիր՝ պահպանիր պահանջները, տուր ամբողջական բազմատող նկարագրություն, առնվազն ${DESCRIPTION_MIN_CHARS} նիշ։ Պատվիրատուի տոն, ոչ թե կատարողի։`;
        const raw2d = await generateWithRetry(strictDesc);
        if (process.env.NODE_ENV !== "production") {
          console.debug("[tender-suggestions] description raw(retry):", { descMode, raw2d });
        }
        cleanedDesc = cleanDescriptionText(raw2d);
        if (!cleanedDesc || isBadDescription(cleanedDesc)) {
          return NextResponse.json({ error: "MALFORMED_AI_RESPONSE" }, { status: 503 });
        }
        return NextResponse.json({
          description: cleanedDesc.slice(0, DESCRIPTION_MAX_CHARS),
          ...(process.env.NODE_ENV !== "production" ? { debugRaw: raw2d } : null),
        });
      }

      return NextResponse.json({
        description: cleanedDesc.slice(0, DESCRIPTION_MAX_CHARS),
        ...(process.env.NODE_ENV !== "production" ? { debugRaw: rawDesc } : null),
      });
    }

    const mode = title && title.trim().length > 0 ? "rewrite" : "generate";
    const prompt =
      mode === "rewrite"
        ? buildRewritePrompt(services, title!, urgency)
        : buildGeneratePrompt(services, urgency);

    const raw = await generateWithRetry(prompt);
    if (process.env.NODE_ENV !== "production") {
      console.debug("[tender-suggestions] raw(full):", { mode, raw });
    }
    const cleaned = cleanTitle(raw);
    if (!cleaned || isBadTitle(cleaned)) {
      const strictPrompt = `${prompt}\n\nՊարտադիր՝ տուր լիարժեք վերնագիր (առնվազն 4 բառ), ոչ մի կիսատ բառ չլինի։ Պատվիրատուի տոնով՝ «Անհրաժեշտ է / Կարիք կա», ոչ թե «Իրականացնում եմ / Կատարում եմ»։`;
      const raw2 = await generateWithRetry(strictPrompt);
      if (process.env.NODE_ENV !== "production") {
        console.debug("[tender-suggestions] raw(full retry):", { mode, raw: raw2 });
      }
      const cleaned2 = cleanTitle(raw2);
      if (!cleaned2 || isBadTitle(cleaned2)) {
        return NextResponse.json({ error: "MALFORMED_AI_RESPONSE" }, { status: 503 });
      }
      return NextResponse.json({
        title: cleaned2,
        ...(process.env.NODE_ENV !== "production" ? { debugRaw: raw2 } : null),
      });
    }

    return NextResponse.json({
      title: cleaned,
      ...(process.env.NODE_ENV !== "production" ? { debugRaw: raw } : null),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (process.env.NODE_ENV !== "production") {
      const extra =
        e && typeof e === "object"
          ? (e as { status?: unknown; body?: unknown }).status || (e as { body?: unknown }).body
          : null;
      console.warn("[tender-suggestions] Gemini failed:", msg, extra, e);
    }
    return NextResponse.json({ error: "AI_UNAVAILABLE" }, { status: 503 });
  }
}
