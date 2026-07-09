/**
 * StoryOpener — calls generateStoryOpener server fn, renders a 3-sentence
 * personal story above the reveal route. Fallback is deterministic — no
 * skeleton loader ugliness; if the call hasn't returned yet, render the
 * deterministic version and replace it when the AI version lands.
 */

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateStoryOpener } from "@/lib/studio-v2/story.functions";
import { useBuilderSessionId } from "@/hooks/useBuilderSessionId";
import type { TravelerProfile } from "@/lib/studio-v2/profile";
import type { SceneSignal } from "@/lib/studio-v2/intent-infer";

interface Props {
  profile: TravelerProfile;
  region: string;
  signals: SceneSignal[];
}

function deterministic(profile: TravelerProfile, region: string): string {
  const who = profile.name?.trim() ? `${profile.name.trim()},` : "For you,";
  const lean =
    profile.intent === "coastal_cinematic"
      ? "a day built around Atlantic light and the hour gold turns"
      : profile.intent === "romantic_intimate"
        ? "a day built for two — the coast, the quiet, the dusk"
        : profile.intent === "food_local"
          ? "a day built around long tables and unhurried tasting"
          : profile.intent === "elegant_cultural"
            ? "a day built around stone, shadow and quiet rooms"
            : profile.intent === "social_celebratory"
              ? "a day built to lift the room and hold the moment"
              : "a day built around open roads and slow afternoon light";
  const r = region.toLowerCase();
  const place = r.includes("arrabida")
    ? "set in the Arrábida — vineyards and the Atlantic close enough to taste"
    : r.includes("lisbon")
      ? "set along Sintra and the Atlantic edge — granite, mist, ocean shoulder"
      : r.includes("alentejo")
        ? "set across the Alentejo — long horizons and slow tables"
        : "set in the corner of Portugal that fits your rhythm";
  return `${who} ${lean}, ${place}. Designed around what you actually want — nothing generic, nothing filler.`;
}

export function StoryOpener({ profile, region, signals }: Props) {
  const [story, setStory] = useState<string>(() => deterministic(profile, region));
  const requested = useRef(false);
  const generate = useServerFn(generateStoryOpener);
  const sessionId = useBuilderSessionId();

  useEffect(() => {
    if (requested.current) return;
    if (!sessionId) return;
    requested.current = true;
    generate({
      data: {
        name: profile.name ?? "",
        intent: profile.intent ?? "relaxed_scenic",
        pace: profile.pace ?? "balanced",
        region,
        pax: profile.group?.adults ?? 2,
        signals,
        sessionId,
      },
    })
      .then((r) => {
        if (r?.story) setStory(r.story);
      })
      .catch(() => {
        /* keep deterministic fallback */
      });
  }, [generate, profile, region, signals, sessionId]);

  return (
    <div className="mx-auto mb-10 max-w-[36ch]">
      <p
        className="text-[10.5px] font-bold uppercase tracking-[0.32em]"
        style={{ color: "color-mix(in oklab, var(--charcoal) 60%, transparent)" }}
      >
        Your story
      </p>
      <p
        className="mt-3 text-[19px] leading-[1.36] sm:text-[22px]"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          color: "var(--charcoal)",
        }}
      >
        {story}
      </p>
      <span
        aria-hidden
        className="mt-6 block h-px w-12"
        style={{ background: "color-mix(in oklab, var(--gold) 70%, transparent)" }}
      />
    </div>
  );
}
