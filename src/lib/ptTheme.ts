/** PT-PT labels for Signature themes (data stays in English). */
const PT_THEMES: Record<string, string> = {
  Coastal: "Costa",
  Culture: "Cultura",
  Gastronomy: "Gastronomia",
  Heritage: "Património",
  Wine: "Vinho",
};

export function ptTheme(theme: string): string {
  return PT_THEMES[theme] ?? theme;
}

/** Catalogue display only: canonical tour content and SEO remain in English. */
const PT_CARD_TITLES: Readonly<Record<string, string>> = {
  "arrabida-wine-allinclusive": "Visita privada de vinhos à Arrábida, desde Lisboa — tudo incluído",
  "wild-beaches-picnic": "Dia privado na costa: Arrábida, Sesimbra e piquenique na praia",
  "arrabida-boat": "Visita privada à Arrábida e Sesimbra com passeio de barco pela costa",
  "tiles-workshop": "Oficina de pintura de azulejos, prova de vinhos e Sesimbra — dia privado",
  "azeitao-cheese": "Visita privada a Azeitão: produção de queijo e vinhos, desde Lisboa",
  "sintra-cascais": "Visita privada a Sintra e Cascais — palácios, vinhos e costa atlântica",
  "troia-comporta": "Visita privada a Tróia e Comporta, desde Lisboa — ruínas, vinhos e costa",
  "evora-alentejo": "Visita privada a Évora e aos vinhos do Alentejo — tradições locais",
  "tomar-coimbra": "Visita privada a Tomar e Coimbra, desde Lisboa — templários e património",
  "fatima-nazare-obidos": "Visita privada a Fátima, Nazaré e Óbidos, desde Lisboa",
  "roman-heritage-alentejo": "Vinhos e património romano — visita privada ao Alentejo menos conhecido",
  "southwest-vicentine-coast": "Visita privada à Costa Vicentina, desde Lisboa",
};

export function ptSignatureCardTitle(id: string, originalTitle: string): string {
  return Object.hasOwn(PT_CARD_TITLES, id) ? PT_CARD_TITLES[id] ?? originalTitle : originalTitle;
}
