import base from "/dev-server/playwright.local.config.ts";
export default { ...base, use: { ...(base as any).use, baseURL: "https://yesexperiencesportugal.com" } };
