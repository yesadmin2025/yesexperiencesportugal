import { it, expect, vi } from "vitest";
import { revealSuccess } from "@/lib/reveal-success";
it("scrolls the success block into view and focuses it", async () => {
  const el = document.createElement("div"); el.tabIndex = -1; document.body.appendChild(el);
  el.scrollIntoView = vi.fn();
  revealSuccess(el);
  await new Promise((r) => setTimeout(r, 50));
  expect(el.scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "auto" });
  expect(document.activeElement).toBe(el);
});
