import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hashConfig, logAiUsage } from "./aiAuditLog.server";
import { rateLimit } from "./rateLimit.server";

/**
 * Tone-only chapter generator for the Living Atmosphere Studio.
 *
 * Returns ONE editorial line (Georgia italic, ≤80 chars, PT-PT) describing
 * the emerging chapter of the journey. Never invents stops or regions —
 * pure narrative voice over the real selections the user has made.
 */

const inputSchema = z.object({
  sessionId: z.string().min(8).max(64),
  mood: z.string().max(40).nullable().optional(),
  who: z.string().max(40).nullable().optional(),
  intention: z.string().max(40).nullable().optional(),
  pace: z.string().max(40).nullable().optional(),
  regionLabel: z.string().max(120).nullable().optional(),
  stopLabels: z.array(z.string().min(1).max(160)).max(10).default([]),
  kind: z.enum(["chapter", "farewell"]).default("chapter"),
  locale: z.enum(["pt", "en", "es", "fr"]).default("pt"),
});

type Locale = "pt" | "en" | "es" | "fr";
type Result = { line: string; source: "ai" | "fallback" | "rate_limited" };

const MOOD_BY_LOCALE: Record<Locale, Record<string, string>> = {
  pt: { slow: "lenta", curious: "curiosa", romantic: "romântica", open: "aberta", energetic: "vibrante" },
  en: { slow: "slow", curious: "curious", romantic: "romantic", open: "open", energetic: "vibrant" },
  es: { slow: "lenta", curious: "curiosa", romantic: "romántica", open: "abierta", energetic: "vibrante" },
  fr: { slow: "lente", curious: "curieuse", romantic: "romantique", open: "ouverte", energetic: "vibrante" },
};
const WHO_BY_LOCALE: Record<Locale, Record<string, string>> = {
  pt: { couple: "para dois", family: "em família", friends: "entre amigos", solo: "a sós", corporate: "para um grupo", group: "para o grupo" },
  en: { couple: "for two", family: "as a family", friends: "with friends", solo: "alone", corporate: "for a group", group: "for the group" },
  es: { couple: "para dos", family: "en familia", friends: "entre amigos", solo: "a solas", corporate: "para un grupo", group: "para el grupo" },
  fr: { couple: "à deux", family: "en famille", friends: "entre amis", solo: "en solo", corporate: "pour un groupe", group: "pour le groupe" },
};

function deterministic(
  mood: string | null | undefined,
  who: string | null | undefined,
  regionLabel: string | null | undefined,
  stopCount: number,
  kind: "chapter" | "farewell",
  locale: Locale,
): string {
  const m = mood ?? "slow";
  const place = regionLabel ?? "Portugal";
  const mLabel = MOOD_BY_LOCALE[locale][m] ?? MOOD_BY_LOCALE[locale].slow;
  const wLabel = who ? (WHO_BY_LOCALE[locale][who] ?? "") : "";

  if (kind === "farewell") {
    if (locale === "en") return `A ${mLabel} story in ${place}${wLabel ? `, ${wLabel}` : ""}.`;
    if (locale === "es") return `Una historia ${mLabel} en ${place}${wLabel ? `, ${wLabel}` : ""}.`;
    if (locale === "fr") return `Une histoire ${mLabel} à ${place}${wLabel ? `, ${wLabel}` : ""}.`;
    return `Uma história ${mLabel} em ${place}${wLabel ? `, ${wLabel}` : ""}.`;
  }
  if (stopCount === 0) {
    if (locale === "en") return `A ${mLabel} story taking shape in ${place}${wLabel ? `, ${wLabel}` : ""}.`;
    if (locale === "es") return `Una historia ${mLabel} tomando forma en ${place}${wLabel ? `, ${wLabel}` : ""}.`;
    if (locale === "fr") return `Une histoire ${mLabel} qui prend forme à ${place}${wLabel ? `, ${wLabel}` : ""}.`;
    return `Uma história ${mLabel} a desenhar-se em ${place}${wLabel ? `, ${wLabel}` : ""}.`;
  }
  const word = stopCount === 1 ? { pt: "momento", en: "moment", es: "momento", fr: "moment" }[locale] : { pt: "momentos", en: "moments", es: "momentos", fr: "moments" }[locale];
  const onMap = { pt: "já no mapa", en: "on the map", es: "ya en el mapa", fr: "déjà sur la carte" }[locale];
  return `${place}, ${mLabel}${wLabel ? `, ${wLabel}` : ""} — ${stopCount} ${word} ${onMap}.`;
}

const SYS_BY_LOCALE: Record<Locale, { chapter: string; farewell: string }> = {
  pt: {
    chapter: "Escreves UMA frase editorial em PT-PT (≤80 caracteres) que captura o capítulo emergente desta viagem. Tom: italic-friendly, sereno, sem clichés, sem marketing. Nunca inventes paragens nem regiões; usa apenas o contexto dado.",
    farewell: "Escreves UMA frase final editorial em PT-PT (≤80 caracteres) que despede o viajante da história que acabou de desenhar. Tom: caloroso, sem clichés, sem exclamações, sem palavras como 'incrível' ou 'inesquecível'. Nunca inventes paragens; usa apenas o contexto dado.",
  },
  en: {
    chapter: "Write ONE editorial sentence in English (≤80 characters) that captures the emerging chapter of this journey. Tone: italic-friendly, serene, no clichés, no marketing. Never invent stops or regions; use only the given context.",
    farewell: "Write ONE final editorial sentence in English (≤80 characters) that bids the traveler farewell. Tone: warm, no clichés, no exclamation marks, no words like 'amazing' or 'unforgettable'. Never invent stops; use only the given context.",
  },
  es: {
    chapter: "Escribe UNA frase editorial en español (≤80 caracteres) que capture el capítulo emergente de este viaje. Tono: italic-friendly, sereno, sin clichés, sin marketing. Nunca inventes paradas ni regiones; usa solo el contexto dado.",
    farewell: "Escribe UNA frase final editorial en español (≤80 caracteres) que despida al viajero. Tono: cálido, sin clichés, sin exclamaciones, sin palabras como 'increíble' o 'inolvidable'. Nunca inventes paradas; usa solo el contexto dado.",
  },
  fr: {
    chapter: "Écris UNE phrase éditoriale en français (≤80 caractères) qui capte le chapitre émergent de ce voyage. Ton : italique, serein, sans clichés, sans marketing. N'invente jamais d'étapes ni de régions ; utilise uniquement le contexte donné.",
    farewell: "Écris UNE phrase finale éditoriale en français (≤80 caractères) qui prend congé du voyageur. Ton : chaleureux, sans clichés, sans exclamation, sans mots comme 'incroyable' ou 'inoubliable'. N'invente jamais d'étapes ; utilise uniquement le contexte donné.",
  },
};

export const generateChapter = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<Result> => {
    const fallback: Result = {
      line: deterministic(
        data.mood ?? null,
        data.who ?? null,
        data.regionLabel ?? null,
        data.stopLabels.length,
        data.kind,
        data.locale,
      ),
      source: "fallback",
    };

    const rl = await rateLimit({
      sessionId: data.sessionId,
      bucket: "builder_chapter",
      limit: 12,
      windowSec: 300,
    });
    if (!rl.ok) return { ...fallback, source: "rate_limited" };

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) return fallback;

    const configHash = hashConfig({
      mood: data.mood,
      who: data.who,
      intention: data.intention,
      pace: data.pace,
      region: data.regionLabel,
      stops: data.stopLabels,
      kind: data.kind,
      locale: data.locale,
    });
    const startedAt = Date.now();
    const model = "google/gemini-3-flash-preview";

    try {
      const sys = SYS_BY_LOCALE[data.locale][data.kind];
      const labels: Record<Locale, { mood: string; with: string; seeks: string; pace: string; region: string; stops: string; none: string; instruct: string }> = {
        pt: { mood: "Mood", with: "Com", seeks: "Procura", pace: "Ritmo", region: "Região", stops: "Paragens já escolhidas", none: "nenhuma ainda", instruct: "Devolve apenas a frase, sem aspas, sem prefixos." },
        en: { mood: "Mood", with: "With", seeks: "Seeks", pace: "Pace", region: "Region", stops: "Stops chosen", none: "none yet", instruct: "Return only the sentence, no quotes, no prefixes." },
        es: { mood: "Mood", with: "Con", seeks: "Busca", pace: "Ritmo", region: "Región", stops: "Paradas elegidas", none: "ninguna aún", instruct: "Devuelve solo la frase, sin comillas, sin prefijos." },
        fr: { mood: "Mood", with: "Avec", seeks: "Cherche", pace: "Rythme", region: "Région", stops: "Étapes choisies", none: "aucune pour l'instant", instruct: "Retourne uniquement la phrase, sans guillemets, sans préfixes." },
      };
      const L = labels[data.locale];
      const usr = `${L.mood}: ${data.mood ?? "—"}
${L.with}: ${data.who ?? "—"}
${L.seeks}: ${data.intention ?? "—"}
${L.pace}: ${data.pace ?? "—"}
${L.region}: ${data.regionLabel ?? "—"}
${L.stops}: ${data.stopLabels.length ? data.stopLabels.join(" · ") : L.none}

${L.instruct}`;

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: usr },
          ],
          temperature: 0.7,
          max_tokens: 60,
        }),
      });
      const latencyMs = Date.now() - startedAt;
      if (!res.ok) {
        await logAiUsage({
          provider: "lovable_ai",
          model,
          feature: "builder_chapter",
          status: res.status === 429 ? "rate_limited" : "failure",
          latencyMs,
          configHash,
          errorCode: String(res.status),
        });
        return fallback;
      }
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) return fallback;
      await logAiUsage({
        provider: "lovable_ai",
        model,
        feature: "builder_chapter",
        status: "success",
        latencyMs,
        configHash,
      });
      return { line: text.replace(/^["'""]|["'""]$/g, "").slice(0, 110), source: "ai" };
    } catch (err) {
      await logAiUsage({
        provider: "lovable_ai",
        model,
        feature: "builder_chapter",
        status: "failure",
        latencyMs: Date.now() - startedAt,
        configHash,
        errorCode: "exception",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return fallback;
    }
  });
