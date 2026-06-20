/**
 * Client hook — fetches real images for the active route, with graceful
 * fallback when the DB has nothing yet.
 *
 * Returns:
 *   stopImages: { [stopKey]: { url, alt } | null }
 *   storyImage: { url, alt } | null
 *   reviewThumbs: { url, alt }[]
 */

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { pickImagesForRoute, pickMoodCardImages } from "@/lib/builderImages.functions";
import type { Mood } from "@/components/builder/types";

export interface BuilderImageRef {
  url: string;
  alt: string;
}

export interface BuilderImagesForRoute {
  hero: BuilderImageRef | null;
  stopImages: Record<string, BuilderImageRef | null>;
  storyImage: BuilderImageRef | null;
  reviewThumbs: BuilderImageRef[];
  loading: boolean;
}

const EMPTY: BuilderImagesForRoute = {
  hero: null,
  stopImages: {},
  storyImage: null,
  reviewThumbs: [],
  loading: false,
};

export function useBuilderRouteImages(args: {
  regionKey?: string;
  stopKeys: string[];
  mood?: string;
  occasion?: string;
}): BuilderImagesForRoute {
  const pick = useServerFn(pickImagesForRoute);
  const [state, setState] = useState<BuilderImagesForRoute>(EMPTY);

  const stopKeysJoined = args.stopKeys.join("|");

  useEffect(() => {
    if (!args.regionKey || args.stopKeys.length === 0) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    pick({
      data: {
        regionKey: args.regionKey,
        stopKeys: args.stopKeys,
        mood: args.mood,
        occasion: args.occasion,
      },
    })
      .then((r) => {
        if (cancelled) return;
        const stopImages: Record<string, BuilderImageRef | null> = {};
        for (const [k, v] of Object.entries(r.stopImages)) {
          stopImages[k] = v ? { url: v.image_url, alt: v.alt_text } : null;
        }
        setState({
          hero: r.hero ? { url: r.hero.image_url, alt: r.hero.alt_text } : null,
          stopImages,
          storyImage: r.storyImage
            ? { url: r.storyImage.image_url, alt: r.storyImage.alt_text }
            : null,
          reviewThumbs: r.reviewThumbs.map((t) => ({
            url: t.image_url,
            alt: t.alt_text,
          })),
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ ...EMPTY, loading: false });
      });
    return () => {
      cancelled = true;
    };
    // stopKeysJoined captures the array; mood/occasion/region are scalars
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.regionKey, stopKeysJoined, args.mood, args.occasion, pick]);

  return state;
}

export function useBuilderMoodImages(moods: Mood[]): {
  moodImages: Record<string, BuilderImageRef | null>;
  loading: boolean;
} {
  const pick = useServerFn(pickMoodCardImages);
  const [data, setData] = useState<Record<string, BuilderImageRef | null>>({});
  const [loading, setLoading] = useState(false);
  const key = moods.join("|");

  useEffect(() => {
    if (moods.length === 0) return;
    let cancelled = false;
    setLoading(true);
    pick({ data: { moods } })
      .then((r) => {
        if (cancelled) return;
        const out: Record<string, BuilderImageRef | null> = {};
        for (const [k, v] of Object.entries(r.moodImages)) {
          out[k] = v ? { url: v.image_url, alt: v.alt_text } : null;
        }
        setData(out);
      })
      .catch(() => {
        if (!cancelled) setData({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pick]);

  return { moodImages: data, loading };
}
