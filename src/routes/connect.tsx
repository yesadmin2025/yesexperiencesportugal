import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Connect an AI assistant — YES Experiences Portugal" },
      {
        name: "description",
        content:
          "Connect ChatGPT or Claude to YES Experiences Portugal so your assistant can help you browse and plan.",
      },
      { property: "og:title", content: "Connect an AI assistant — YES Experiences Portugal" },
      {
        property: "og:description",
        content:
          "Paste one URL into ChatGPT or Claude to connect them to YES Experiences Portugal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const [mcpUrl, setMcpUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMcpUrl(new URL("/mcp", window.location.origin).toString());
  }, []);

  async function copy() {
    if (!mcpUrl) return;
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <SiteLayout>
      <section className="pt-32 pb-24">
        <div className="container-x max-w-2xl mx-auto">
          <Eyebrow>Agent integrations</Eyebrow>
          <h1 className="serif text-4xl md:text-5xl mt-4 leading-tight">
            Connect an AI assistant to YES Experiences
          </h1>
          <p className="mt-4 text-[color:var(--charcoal-soft)]">
            Add YES Experiences to ChatGPT or Claude so your assistant can help you explore tours
            and answer questions on your behalf. It only takes one URL.
          </p>

          {/* Server URL */}
          <div className="mt-10 border border-[color:var(--border)] bg-[color:var(--card)] p-5">
            <div className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--gold)]">
              MCP server URL
            </div>
            <div className="mt-3 flex items-stretch gap-2">
              <code className="flex-1 min-w-0 truncate bg-[color:var(--sand)] px-3 py-3 text-sm text-[color:var(--charcoal)] border border-[color:var(--border)]">
                {mcpUrl || "…"}
              </code>
              <button
                type="button"
                onClick={copy}
                disabled={!mcpUrl}
                className="bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] disabled:opacity-60 text-[color:var(--ivory)] px-4 text-sm tracking-wide"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-3 text-xs text-[color:var(--charcoal-soft)]">
              You'll sign in with your YES account when the assistant connects.
            </p>
          </div>

          {/* ChatGPT */}
          <div className="mt-12">
            <h2 className="serif text-2xl">ChatGPT</h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed list-decimal pl-5 text-[color:var(--charcoal)]">
              <li>
                Open{" "}
                <a
                  href="https://chatgpt.com/#settings/Connectors/Advanced"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[color:var(--teal)] underline"
                >
                  ChatGPT Connectors settings
                </a>{" "}
                and turn on Developer mode (read the notice shown there).
              </li>
              <li>In the chat composer's "+" menu, enable Developer mode.</li>
              <li>Click <strong>Add sources</strong>, then <strong>Connect more</strong>.</li>
              <li>Name the connector "YES Experiences" and paste the URL above.</li>
              <li>Ask ChatGPT to use YES Experiences — e.g. "Show me signature tours in Lisbon."</li>
            </ol>
          </div>

          {/* Claude */}
          <div className="mt-12">
            <h2 className="serif text-2xl">Claude</h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed list-decimal pl-5 text-[color:var(--charcoal)]">
              <li>
                Open{" "}
                <a
                  href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[color:var(--teal)] underline"
                >
                  Claude's Add custom connector page
                </a>
                .
              </li>
              <li>Name the connector "YES Experiences" and paste the URL above.</li>
              <li>
                Enable the connector from the chat composer, then ask Claude to use YES
                Experiences.
              </li>
            </ol>
          </div>

          <p className="mt-14 text-xs text-[color:var(--charcoal-soft)]">
            Having trouble? Contact us and we'll help you get connected.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
