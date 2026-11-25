import { getTourContent, signatureIncludesLunch } from "@/lib/tourContent";

type HighlightSelector =
  | { source: "highlight"; value: string; label?: string }
  | { source: "included"; value: string; label?: string }
  | { source: "includedLunch"; label: string };

/**
 * Buyer-facing card promises derived only from each Signature's canonical
 * overview, itinerary, highlights and inclusions. Operational detail remains
 * owned by the tour data; this map only keeps catalog copy concise.
 */
const CARD_PROMISES: Record<string, string> = {
  "p23-artisan-pottery-cork": "Step into the working world of Alentejo artisans and experience two of Portugal’s defining crafts through your own hands.",
  "arrabida-wine-allinclusive": "Discover the remarkable wines and regional flavors of the Setúbal Peninsula, where vineyards meet the mountains and Atlantic coast.",
  "wild-beaches-picnic": "A private escape to Arrábida’s sheltered coves and wild coastline, with a picnic of regional delicacies away from the city.",
  "arrabida-boat": "Experience Arrábida from land and sea, discovering the dramatic cliffs, sheltered waters and maritime character of Sesimbra.",
  "tiles-workshop": "Go beyond admiring Portugal’s iconic azulejos: paint your own tile in a hands-on workshop and discover the culture behind this living art.",
  "azeitao-cheese": "Discover the craft behind Azeitão’s celebrated cheese through a private cheesemaking workshop, complemented by the wines of its region.",
  "sintra-cascais": "Experience the romance of Sintra’s palaces and the elegance of the Portuguese Riviera, with the freedom to choose the palace experience that suits you.",
  "troia-comporta": "Discover the understated luxury of Comporta: unspoiled Atlantic beaches, distinctive wine country and ancient heritage, on a private coastal escape.",
  "evora-alentejo": "Explore the heart of Alentejo wine country, where renowned winemaking traditions meet the extraordinary UNESCO heritage of Évora.",
  "tomar-coimbra": "Uncover two remarkable chapters of Portugal’s history, from the Knights Templar in Tomar to Coimbra’s centuries-old academic traditions.",
  "fatima-nazare-obidos": "Experience three contrasting icons of Portugal in one private day: a place of pilgrimage, an Atlantic fishing town and a medieval walled village.",
  "roman-heritage-alentejo": "Taste a remarkable winemaking tradition rooted in Roman antiquity, with wines still made in clay talhas and a traditional lunch at a family winery.",
  "southwest-vicentine-coast": "Discover a wilder side of Portugal on its protected southwestern coast, with dramatic ocean landscapes and villages far from the conventional sightseeing circuit.",
};

// PT-PT editorial equivalents of the verified English card copy above.
const CARD_PROMISES_PT: Record<string, string> = {
  "p23-artisan-pottery-cork": "Entre no universo dos artesãos alentejanos e descubra, com as suas próprias mãos, dois dos ofícios que definem a identidade portuguesa.",
  "arrabida-wine-allinclusive": "Descubra os vinhos e sabores da Península de Setúbal, onde as vinhas encontram a serra e o Atlântico.",
  "wild-beaches-picnic": "Uma escapadinha privada pelas enseadas e pela costa selvagem da Arrábida, com um piquenique de sabores regionais longe da cidade.",
  "arrabida-boat": "Descubra a Arrábida por terra e por mar, entre falésias dramáticas, águas abrigadas e a identidade marítima de Sesimbra.",
  "tiles-workshop": "Vá além da contemplação dos azulejos portugueses: pinte o seu próprio azulejo e descubra a cultura por detrás desta arte viva.",
  "azeitao-cheese": "Descubra a tradição do célebre queijo de Azeitão numa oficina privada de produção de queijo, acompanhada pelos vinhos da região.",
  "sintra-cascais": "Viva o romantismo dos palácios de Sintra e a elegância da Riviera portuguesa, com liberdade para escolher a experiência palaciana que mais lhe agrada.",
  "troia-comporta": "Descubra o luxo discreto da Comporta, entre praias atlânticas, vinhos singulares e património antigo, numa escapadinha privada pela costa.",
  "evora-alentejo": "Explore o coração da região vinícola alentejana, onde tradições de produção de vinho se encontram com o extraordinário património UNESCO de Évora.",
  "tomar-coimbra": "Descubra dois capítulos fascinantes da história portuguesa, dos templários de Tomar às tradições académicas seculares de Coimbra.",
  "fatima-nazare-obidos": "Viva três ícones distintos de Portugal num dia privado: um lugar de peregrinação, uma vila piscatória atlântica e uma povoação medieval muralhada.",
  "roman-heritage-alentejo": "Prove uma tradição vinícola com raízes na Antiguidade romana, com vinhos ainda produzidos em talhas de barro e almoço tradicional numa adega familiar.",
  "southwest-vicentine-coast": "Descubra um Portugal mais selvagem na costa sudoeste protegida, entre paisagens atlânticas e aldeias longe dos circuitos turísticos convencionais.",
};

const CARD_HIGHLIGHTS_PT: Record<string, readonly [string, string, string]> = {
  "p23-artisan-pottery-cork": ["Oficina de cortiça com artesãos locais", "Oficina de cerâmica de três horas", "Almoço incluído"],
  "arrabida-wine-allinclusive": ["Duas adegas e provas de vinhos regionais", "Almoço tradicional em Azeitão incluído", "Parque Natural da Arrábida e vistas atlânticas"],
  "wild-beaches-picnic": ["Parque Natural da Arrábida e miradouros costeiros", "Praias de Galapinhos, Bicas e zona do Meco", "Piquenique privado com produtos regionais"],
  "arrabida-boat": ["Passeio de barco pela costa de Sesimbra", "Mercado do Livramento e Parque Natural da Arrábida", "Santuário no topo das falésias do Cabo Espichel"],
  "tiles-workshop": ["Oficina prática de pintura de azulejos", "Prova numa adega regional selecionada", "Mercado do Livramento e Sesimbra"],
  "azeitao-cheese": ["Oficina privada de queijo de Azeitão", "Visita e prova numa adega local", "Mercado do Livramento, Azeitão e Sesimbra"],
  "sintra-cascais": ["Um palácio e prova de vinho, ou bilhetes para dois palácios", "Azenhas do Mar, Cabo da Roca e Cascais", "Escolha flexível de palácios com guia"],
  "troia-comporta": ["Comporta, cais palafítico e praias atlânticas", "Experiência e prova de vinhos da região", "Visita guiada às ruínas romanas de Tróia, com entrada"],
  "evora-alentejo": ["Duas adegas alentejanas e provas de vinhos", "Évora UNESCO, Templo Romano e Capela dos Ossos", "Visita a produtor tradicional de cortiça"],
  "tomar-coimbra": ["Convento de Cristo e herança templária", "Universidade de Coimbra", "Entrada com horário marcado na Biblioteca Joanina"],
  "fatima-nazare-obidos": ["Santuário de Fátima", "Miradouro, praia e vila piscatória da Nazaré", "Vila medieval muralhada e castelo de Óbidos"],
  "roman-heritage-alentejo": ["Provas de vinho de talha e almoço na adega", "Adega familiar e vinificação em talhas de barro", "Sítio arqueológico romano de São Cucufate"],
  "southwest-vicentine-coast": ["Porto Covo e Vila Nova de Milfontes", "Parque Natural do Sudoeste Alentejano e Costa Vicentina", "Paisagem da foz de Odeceixe"],
};

const CARD_HIGHLIGHT_SELECTORS: Record<string, readonly HighlightSelector[]> = {
  "p23-artisan-pottery-cork": [
    { source: "highlight", value: "Hands-on cork workshop with local makers" },
    { source: "highlight", value: "Three-hour pottery workshop at a ceramics and earth arts center" },
    { source: "includedLunch", label: "Lunch included" },
  ],
  "troia-comporta": [
    { source: "highlight", value: "Comporta village, Carrasqueira stilt pier and Atlantic beaches", label: "Comporta village, stilt pier & beaches" },
    { source: "highlight", value: "Herdade da Comporta wine experience and tasting", label: "Regional winery experience & tasting" },
    { source: "highlight", value: "Guided Roman Ruins of Tróia visit with admission", label: "Guided Tróia Roman ruins visit & entry" },
  ],
  "roman-heritage-alentejo": [
    { source: "highlight", value: "Multiple talha wines and traditional winery lunch", label: "Talha wine tastings & winery lunch" },
    { source: "highlight", value: "Family-run winery using Roman-style clay vessels", label: "Family winery & ancient clay-vessel winemaking" },
    { source: "highlight", value: "São Cucufate Roman archaeological site" },
  ],
  "southwest-vicentine-coast": [
    { source: "highlight", value: "Porto Covo and Vila Nova de Milfontes" },
    { source: "highlight", value: "Southwest Alentejo and Vicentine Coast Natural Park" },
    { source: "highlight", value: "Odeceixe river-meets-ocean landscape" },
  ],
  "arrabida-boat": [
    { source: "highlight", value: "Sesimbra Coastal Boat Tour" },
    { source: "highlight", value: "Livramento Market and Arrábida Natural Park" },
    { source: "highlight", value: "Cabo Espichel clifftop sanctuary" },
  ],
  "sintra-cascais": [
    { source: "highlight", value: "One palace plus wine tasting, or two palace tickets" },
    { source: "highlight", value: "Azenhas do Mar, Cabo da Roca and Cascais" },
    { source: "highlight", value: "Flexible palace selection with expert guide" },
  ],
  "azeitao-cheese": [
    { source: "highlight", value: "Private Azeitão cheese workshop" },
    { source: "highlight", value: "Local winery entrance and tasting" },
    { source: "highlight", value: "Livramento Market, Azeitão and Sesimbra" },
  ],
  "tomar-coimbra": [
    { source: "highlight", value: "Convento de Cristo and Templar heritage" },
    { source: "highlight", value: "University of Coimbra" },
    { source: "highlight", value: "Joanina Library timed entry" },
  ],
  "evora-alentejo": [
    { source: "highlight", value: "Two selected Alentejo winery visits and tastings", label: "Two Alentejo wineries & tastings" },
    { source: "highlight", value: "Roman Temple and Chapel of Bones", label: "UNESCO Évora, Roman Temple & Chapel of Bones" },
    { source: "highlight", value: "Traditional cork production site", label: "Traditional cork production visit" },
  ],
  "fatima-nazare-obidos": [
    { source: "highlight", value: "Sanctuary of Fátima" },
    { source: "highlight", value: "Nazaré viewpoint, beach and fishing town" },
    { source: "highlight", value: "Óbidos medieval walled town and castle" },
  ],
  "tiles-workshop": [
    { source: "highlight", value: "Hands-on azulejo painting workshop" },
    { source: "highlight", value: "Selected regional winery tasting" },
    { source: "highlight", value: "Livramento Market and Sesimbra" },
  ],
  "arrabida-wine-allinclusive": [
    { source: "highlight", value: "Two selected wineries included, up to four in Tailor", label: "Two wineries & regional wine tastings" },
    { source: "includedLunch", label: "Traditional Azeitão lunch included" },
    { source: "highlight", value: "Arrábida Natural Park", label: "Arrábida Natural Park & Atlantic views" },
  ],
  "wild-beaches-picnic": [
    { source: "highlight", value: "Arrábida Natural Park and coastal viewpoints" },
    { source: "highlight", value: "Galapinhos, Bicas and Meco-area beaches" },
    { source: "highlight", value: "Private picnic with regional products" },
  ],
};

export function getSignatureCardPromise(tourId: string, locale: "en" | "pt" = "en"): string {
  return (locale === "pt" ? CARD_PROMISES_PT[tourId] : CARD_PROMISES[tourId]) ?? getTourContent(tourId).overview;
}

export function getSignatureCardHighlights(tourId: string, locale: "en" | "pt" = "en"): string[] {
  const content = getTourContent(tourId);
  const selected = (CARD_HIGHLIGHT_SELECTORS[tourId] ?? []).flatMap((selector) => {
    if (selector.source === "includedLunch") {
      return signatureIncludesLunch(tourId) && content.included.some((item) => /^lunch$/i.test(item.trim()))
        ? [selector.label]
        : [];
    }
    const source = selector.source === "highlight" ? content.highlights : content.included;
    const label = "label" in selector ? selector.label : undefined;
    return source.includes(selector.value) ? [label ?? selector.value] : [];
  });
  const verified = [...selected, ...content.highlights.filter((item) => !selected.includes(item))].slice(0, 3);
  const translated = CARD_HIGHLIGHTS_PT[tourId];
  return locale === "pt" && translated && verified.length === 3 ? [...translated] : verified;
}