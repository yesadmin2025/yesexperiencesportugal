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
