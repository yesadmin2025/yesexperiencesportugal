/**
 * Share (og:image / twitter:image) art for static Local Stories.
 *
 * Local Stories articles carry no `heroImage` of their own, so social
 * platforms had nothing to scrape. This module maps a story's matching
 * Signature tour to its hero photo. It deliberately imports only the image
 * assets (URL strings after bundling) instead of the heavy signatureTours
 * module, so the article route keeps its light runtime.
 */
import imgArrabidaWine from "@/assets/tours/arrabida-wine-allinclusive/hero.jpg";
import imgEvoraAlentejo from "@/assets/tours/evora-alentejo.jpg";
import imgRomanHeritage from "@/assets/tours/roman-heritage-alentejo/hero.jpg";
import imgSintraCascais from "@/assets/tours/sintra-cascais/hero.jpg";
import imgTroiaComporta from "@/assets/tours/troia-comporta/hero.jpg";
import imgWildBeaches from "@/assets/tours/wild-beaches-picnic/hero.jpg";
import imgViewpoint from "@/assets/edit-viewpoint.jpg";

const BY_SIGNATURE: Record<string, string> = {
  "arrabida-wine-allinclusive": imgArrabidaWine,
  "evora-alentejo": imgEvoraAlentejo,
  "roman-heritage-alentejo": imgRomanHeritage,
  "sintra-cascais": imgSintraCascais,
  "southwest-vicentine-coast": imgWildBeaches,
  "troia-comporta": imgTroiaComporta,
  "wild-beaches-picnic": imgWildBeaches,
};

/** Editorial fallback for guides that cover a region rather than one tour. */
export const LOCAL_STORY_DEFAULT_SHARE_IMAGE = imgViewpoint;

export function localStoryShareImage(signatureSlug?: string): string {
  return (signatureSlug && BY_SIGNATURE[signatureSlug]) || LOCAL_STORY_DEFAULT_SHARE_IMAGE;
}
