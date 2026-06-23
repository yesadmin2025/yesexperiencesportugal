// Studio V3 — cinematic scene clips per phase + answer.
//
// Reuses the existing real-scene library shipped alongside the homepage hero
// film (same Lovable asset URLs already used by CinematicChoices.tsx in the
// Builder). NEVER invent or stock-photo — every clip is a real Portugal
// scene we own.
//
// Used as autoplaying, looping, muted backgrounds inside the reaction
// beats (`AtmosphereBeat`) so the canvas under each question swaps as the
// traveller chooses — Portugal arrives before the next question does.
//
// The `imagePoster` field keeps the still JPG behind the video so SSR,
// slow networks and `prefers-reduced-motion` users still see something
// premium without waiting for the clip to buffer.

export const STUDIO_SCENE_CLIPS = {
  coast:
    "/__l5e/assets-v1/e1a97610-5754-4c2c-b5dd-60d7dcc51406/scene-coast-arrabida.mp4",
  table:
    "/__l5e/assets-v1/a5974d67-6f34-4365-8d96-ea82c4b83457/scene-azeitao-table.mp4",
  viewpoint:
    "/__l5e/assets-v1/5a4d8176-1104-47c8-9ab7-f7324c5c16eb/scene-arrabida-viewpoint.mp4",
  caboRoca:
    "/__l5e/assets-v1/7a39b0d5-f6c2-4fb6-9333-0ceb9bc2a7f0/scene-cabo-da-roca.mp4",
  hiddenCove:
    "/__l5e/assets-v1/6e836749-2d77-463c-838c-72735c80e770/scene-hidden-cove.mp4",
  celebration:
    "/__l5e/assets-v1/79e74bb4-85bb-4f83-9bc7-c8bf774af5be/scene-celebration.mp4",
  localTable:
    "/__l5e/assets-v1/9db73543-09c3-4d53-93bd-4abbb15a4b00/scene-local-table.mp4",
  hiddenStreet:
    "/__l5e/assets-v1/dc013d32-5691-419e-84ad-06099bf3631e/scene-hidden-street.mp4",
  route:
    "/__l5e/assets-v1/501885a8-7399-4591-99fc-1c410b24c428/scene-route-portugal.mp4",
  sesimbra:
    "/__l5e/assets-v1/f205739c-b223-4db4-9ffb-ce15539d73c3/scene-sesimbra-street.mp4",
} as const;

export type StudioSceneClip = keyof typeof STUDIO_SCENE_CLIPS;

/** Feeling → scene clip. Falls back to viewpoint when unmapped. */
export function videoForFeeling(feeling: string | null | undefined): string | undefined {
  if (!feeling) return undefined;
  switch (feeling) {
    case "coastal":
      return STUDIO_SCENE_CLIPS.coast;
    case "wine-food":
      return STUDIO_SCENE_CLIPS.localTable;
    case "hidden":
      return STUDIO_SCENE_CLIPS.hiddenStreet;
    case "romance":
      return STUDIO_SCENE_CLIPS.hiddenCove;
    case "family":
      return STUDIO_SCENE_CLIPS.celebration;
    case "culture":
      return STUDIO_SCENE_CLIPS.sesimbra;
    case "adventure":
      return STUDIO_SCENE_CLIPS.viewpoint;
    case "slow-luxury":
      return STUDIO_SCENE_CLIPS.table;
    default:
      return STUDIO_SCENE_CLIPS.viewpoint;
  }
}

/** Interest → scene clip. */
export function videoForInterest(interest: string | null | undefined): string | undefined {
  if (!interest) return undefined;
  switch (interest) {
    case "wine":
      return STUDIO_SCENE_CLIPS.table;
    case "gastronomy":
      return STUDIO_SCENE_CLIPS.localTable;
    case "nature":
      return STUDIO_SCENE_CLIPS.viewpoint;
    case "coast":
      return STUDIO_SCENE_CLIPS.coast;
    case "heritage":
      return STUDIO_SCENE_CLIPS.sesimbra;
    case "photography":
      return STUDIO_SCENE_CLIPS.viewpoint;
    case "wellness":
      return STUDIO_SCENE_CLIPS.hiddenCove;
    case "local-life":
      return STUDIO_SCENE_CLIPS.hiddenStreet;
    default:
      return undefined;
  }
}

/** Destination intent → scene clip. */
export function videoForDestination(destination: string | null | undefined): string | undefined {
  if (!destination) return undefined;
  switch (destination) {
    case "sintra-cascais":
      return STUDIO_SCENE_CLIPS.caboRoca;
    case "arrabida-setubal":
      return STUDIO_SCENE_CLIPS.coast;
    case "alentejo":
      return STUDIO_SCENE_CLIPS.route;
    case "no-preference":
    default:
      return STUDIO_SCENE_CLIPS.route;
  }
}

/** Companions → scene clip (Who beat). */
export function videoForCompanions(companions: string | null | undefined): string | undefined {
  if (!companions) return undefined;
  switch (companions) {
    case "couple":
    case "proposal":
      return STUDIO_SCENE_CLIPS.hiddenCove;
    case "family":
      return STUDIO_SCENE_CLIPS.localTable;
    case "friends":
    case "celebration":
      return STUDIO_SCENE_CLIPS.celebration;
    case "solo":
      return STUDIO_SCENE_CLIPS.caboRoca;
    case "corporate":
      return STUDIO_SCENE_CLIPS.route;
    default:
      return undefined;
  }
}
