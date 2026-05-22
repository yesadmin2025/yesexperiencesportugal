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
});

type Result = { line: string; source: "ai" | "fallback" | "rate_limited" };

function deterministic(
  mood: string | null | undefined,
  who: string | null | undefined,
  regionLabel: string | null | undefined,
  stopCount: number,
  kind: "chapter" | "farewell",
): string {
  const m = mood ?? "lenta";
  const place = regionLabel ?? "Portugal";
  const moodPt: Record<string, string> = {
    slow: "lenta",
    curious: "curiosa",
    romantic: "romântica",
    open: "aberta",
    energetic: "vibrante",
  };
  const whoPt: Record<string, string> = {
    couple: "para dois",
    family: "em família",
    friends: "entre amigos",
    solo: "a sós",
    corporate: "para um grupo",
    group: "para o grupo",
  };
  const mLabel = moodPt[m] ?? "lenta";
  const wLabel = who ? (whoPt[who] ?? "") : "";
  if (kind === "farewell") {
    return `Uma história ${mLabel} em ${place}${wLabel ? `, ${wLabel}` : ""}.`;
  }
  if (stopCount === 0) {
    return `Uma história ${mLabel} a desenhar-se em ${place}${wLabel ? `, ${wLabel}` : ""}.`;
  }
  return `${place}, ${mLabel}${wLabel ? `, ${wLabel}` : ""} — ${stopCount} momento${stopCount === 1 ? "" : "s"} já no mapa.`;
}

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
    });
    const startedAt = Date.now();
    const model = "google/gemini-3-flash-preview";

    try {
      const sys =
        data.kind === "farewell"
          ? "Escreves UMA frase final editorial em PT-PT (≤80 caracteres) que despede o viajante da história que acabou de desenhar. Tom: caloroso, sem clichés, sem exclamações, sem palavras como 'incrível' ou 'inesquecível'. Nunca inventes paragens; usa apenas o contexto dado."
          : "Escreves UMA frase editorial em PT-PT (≤80 caracteres) que captura o capítulo emergente desta viagem. Tom: italic-friendly, sereno, sem clichés, sem marketing. Nunca inventes paragens nem regiões; usa apenas o contexto dado.";
      const usr = `Contexto:
- Mood: ${data.mood ?? "—"}
- Com: ${data.who ?? "—"}
- Procura: ${data.intention ?? "—"}
- Ritmo: ${data.pace ?? "—"}
- Região: ${data.regionLabel ?? "—"}
- Paragens já escolhidas: ${data.stopLabels.length ? data.stopLabels.join(" · ") : "nenhuma ainda"}

Devolve apenas a frase, sem aspas, sem prefixos.`;

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
