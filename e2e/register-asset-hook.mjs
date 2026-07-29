// Preloaded via NODE_OPTIONS="--import ..." in every Playwright worker so the
// asset stub hook is installed before any spec module is evaluated.
import { register } from "node:module";

register("./asset-esm-hook.mjs", import.meta.url);
