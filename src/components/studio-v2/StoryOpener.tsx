/**
 * StoryOpener — calls generateStoryOpener server fn, renders a 3-sentence
 * personal story above the reveal route. Fallback is deterministic — no
 * skeleton loader ugliness; if the call hasn't returned yet, render the
 * deterministic version and replace it when the AI version lands.
 */

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateStoryOpener } from "@/lib/studio-v2/story.functions";
import type { TravelerProfile } from "@/lib/studio-v2/profile";
import type { SceneSignal } from "@/lib/studio-v2/intent-infer";

interface Props {
  profile: TravelerProfile;
  region: string;
  signals: SceneSignal[];
}

function deterministic(profile: TravelerProfile, region: string): string {
  const who = profile.name?.trim() ? `${profile.name.trim()},` : "Quietly,";
  const lean =
    profile.intent === "coastal_cinematic" ? "you leaned toward Atlantic light and the hour gold turns" :
    profile.intent === "romantic_intimate" ? "you leaned toward the coast at dusk, just the two of you" :
    profile.intent === "food_local"        ? "you leaned toward long tables and unhurried tasting" :
    profile.intent === "elegant_cultural"  ? "you leaned toward stone, shadow and quiet rooms" :
    profile.intent === "social_celebratory"? "you leaned toward a day that lifts the room" :
                                             "you leaned toward open roads and slow afternoon light";
  const r = region.toLowerCase();
  const place =
    r.includes("arrabida") ? "the Arrábida — vineyards and the Atlantic close enough to taste" :
    r.includes("lisbon")   ? "Sintra and the Atlantic edge — granite, mist, ocean shoulder" :
    r.includes("alentejo") ? "the Alentejo — long horizons and slow tables" :
                             "a corner of Portugal that fits your rhythm";
  return `${who} ${lean}. We're shaping ${place}. So we composed a day with the right weight.`;
}

export function StoryOpener({ profile, region, signals }: Props) {
  const [story, setStory] = useState<string>(() => deterministic(profile, region));
  const requested = useRef(false);
  const generate = useServerFn(generateStoryOpener);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    generate({
      data: {
        name: profile.name ?? "",
        intent: profile.intent ?? "relaxed_scenic",
        pace: profile.pace ?? "balanced",
        region,
        pax: profile.group?.adults ?? 2,
        signals,
      },
    })
      .then((r) => { if (r?.story) setStory(r.story); })
      .catch(() => { /* keep deterministic fallback */ });
  }, [generate, profile, region, signals]);

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
