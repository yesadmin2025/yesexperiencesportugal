import { VIATOR_META } from "@/data/signatureToursViator";

const DEAD_VICENTINE_COVER =
  "/__l5e/assets-v1/baab2cc3-8f8e-4c48-be82-388c0ea30b67/southwest-vicentine-coast-cover.jpg";
const VERIFIED_VICENTINE_COVER =
  "/__l5e/assets-v1/f2725404-9b59-4a19-892d-4e5c1bc550ed/yes-tour-94c3a93cd262.webp";

const vicentine = VIATOR_META["southwest-vicentine-coast"];
if (vicentine?.localGallery) {
  vicentine.localGallery = vicentine.localGallery.map((photo) =>
    photo.src === DEAD_VICENTINE_COVER ? { ...photo, src: VERIFIED_VICENTINE_COVER } : photo,
  );
}
