/**
 * echo — connectivity check. No auth requirements, no I/O.
 */
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "echo",
  title: "Echo",
  description: "Echo the input text back — use to verify the connection is live.",
  inputSchema: {
    text: z.string().min(1).describe("Text to echo back."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ text }) => ({ content: [{ type: "text", text }] }),
});
