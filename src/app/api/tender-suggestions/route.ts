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

const DEFAULT_MODEL_ID = "deepseek-flash";
const DEFAULT_API_BASE = "https://api.deepseek.com";

function resolveModelName(): string {
  return process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL_ID;
}

function resolveApiBase(): string {
  const preferred = process.env.DEEPSEEK_API_BASE?.trim();
  const base = (preferred || DEFAULT_API_BASE).replace(/\/+$/, "");
  // OpenAI SDK often appends /v1; accept either form.
  return base.endsWith("/v1") ? base : `${base}/v1`;
}

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
  }>;
  error?: { message?: string; type?: string; code?: string | number };
};

type GenerateKind = "title" | "description";

function isBillingExhausted(status: number, bodyText: string): boolean {
  if (status !== 402 && status !== 429 && status !== 403) return false;
  return /insufficient|balance|quota|credit|billing|payment|exhausted|depleted/i.test(
    bodyText,
  );
}

function generationParamsFor(kind: GenerateKind) {
  return {
    temperature: kind === "title" ? 0.55 : 0.65,
    max_tokens: kind === "title" ? 128 : 1400,
  };
}

async function callDeepSeekChat(params: {
  base: string;
  apiKey: string;
  modelName: string;
  prompt: string;
  kind: GenerateKind;
  /** When true, omit thinking field (for APIs that reject it). */
  omitThinking?: boolean;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; bodyText: string }> {
  const { base, apiKey, modelName, prompt, kind, omitThinking } = params;
  const url = `${base}/chat/completions`;
  const { temperature, max_tokens } = generationParamsFor(kind);

  const payload: Record<string, unknown> = {
    model: modelName,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens,
  };
  // Cheap/fast path — disable thinking when the API supports it.
  if (!omitThinking) {
    payload.thinking = { type: "disabled" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await res.text().catch(() => "");
  if (!res.ok) return { ok: false, status: res.status, bodyText };

  let data: DeepSeekChatResponse | null = null;
  try {
    data = JSON.parse(bodyText) as DeepSeekChatResponse;
  } catch {
    data = null;
  }

  const text = data?.choices?.[0]?.message?.content?.trim() ?? "";

  if (!text) {
    return {
      ok: false,
      status: 502,
      bodyText: bodyText || safeJsonStringify(data),
    };
  }

  return { ok: true, text };
}

/**
 * Single-model DeepSeek chat/completions with one short retry on transient errors.
 * Billing exhaustion fails immediately.
 */
async function generateWithRetry(
  prompt: string,
  kind: GenerateKind,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY_NOT_SET");

  const modelName = resolveModelName();
  const base = resolveApiBase();
  let lastStatus: number | null = null;
  let lastBody = "";
  let omitThinking = false;

  const fail = (code: string): never => {
    const err = new Error(code);
    (err as Error & { status?: number; body?: string }).status =
      lastStatus ?? undefined;
    (err as Error & { status?: number; body?: string }).body = lastBody;
    throw err;
  };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[tender-suggestions] DeepSeek REST attempt:", {
        base,
        modelName,
        kind,
        attempt,
        omitThinking,
      });
    }

    const result = await callDeepSeekChat({
      base,
      apiKey,
      modelName,
      prompt,
      kind,
      omitThinking,
    });
    if (result.ok) return result.text;

    lastStatus = result.status;
    lastBody = result.bodyText;

    if (isBillingExhausted(result.status, result.bodyText)) {
      fail("DEEPSEEK_QUOTA_EXHAUSTED");
    }

    // thinking param unsupported → same request once without it
    if (
      result.status === 400 &&
      !omitThinking &&
      /thinking/i.test(result.bodyText)
    ) {
      omitThinking = true;
      continue;
    }

    if (result.status === 429 || result.status === 500 || result.status === 503) {
      if (attempt === 2) break;
      await sleep(400 + Math.floor(Math.random() * 200));
      continue;
    }

    break;
  }

  return fail(lastStatus ? `DEEPSEEK_REST_FAILED_${lastStatus}` : "DEEPSEEK_REST_FAILED");
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
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

      const rawDesc = await generateWithRetry(promptDesc, "description");
      if (process.env.NODE_ENV !== "production") {
        console.debug("[tender-suggestions] description raw(full):", { descMode, rawDesc });
      }
      let cleanedDesc = cleanDescriptionText(rawDesc);
      if (!cleanedDesc || isBadDescription(cleanedDesc)) {
        const strictDesc = `${promptDesc}\n\nՊարտադիր՝ պահպանիր պահանջները, տուր ամբողջական բազմատող նկարագրություն, առնվազն ${DESCRIPTION_MIN_CHARS} նիշ։ Պատվիրատուի տոն, ոչ թե կատարողի։`;
        const raw2d = await generateWithRetry(strictDesc, "description");
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

    const raw = await generateWithRetry(prompt, "title");
    if (process.env.NODE_ENV !== "production") {
      console.debug("[tender-suggestions] raw(full):", { mode, raw });
    }
    const cleaned = cleanTitle(raw);
    if (!cleaned || isBadTitle(cleaned)) {
      const strictPrompt = `${prompt}\n\nՊարտադիր՝ տուր լիարժեք վերնագիր (առնվազն 4 բառ), ոչ մի կիսատ բառ չլինի։ Պատվիրատուի տոնով՝ «Անհրաժեշտ է / Կարիք կա», ոչ թե «Իրականացնում եմ / Կատարում եմ»։`;
      const raw2 = await generateWithRetry(strictPrompt, "title");
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
      console.warn("[tender-suggestions] DeepSeek failed:", msg, extra, e);
    }
    if (msg === "DEEPSEEK_QUOTA_EXHAUSTED") {
      return NextResponse.json({ error: "AI_QUOTA_EXCEEDED" }, { status: 402 });
    }
    return NextResponse.json({ error: "AI_UNAVAILABLE" }, { status: 503 });
  }
}
