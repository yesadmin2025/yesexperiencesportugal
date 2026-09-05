/**
 * /pt/contact — página de contactos em português.
 *
 * Paridade funcional com /contact: mesmo formulário, mesma rota de envio
 * (`/api/public/contact`), mesma validação. Só a interface está em PT-PT.
 */
import { localeAlternateLinks } from "@/i18n/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { trackEvent } from "@/lib/analytics-events";
import { useMarketingMotion } from "@/hooks/use-marketing-motion";

import {
  BUSINESS_NAME,
  EMAIL,
  EMAIL_HREF,
  PHONE_DISPLAY,
  PHONE_HREF,
  BASED_IN,
  TRUST_LINE_PT,
  whatsappUrl,
} from "@/config/business-nap";

const REQUEST_TYPES = [
  { value: "private_day", label: "Um dia privado" },
  { value: "studio", label: "O Studio" },
  { value: "multi_day", label: "Uma viagem de vários dias" },
  { value: "proposal", label: "Um pedido de casamento ou celebração" },
  { value: "corporate", label: "Um dia para empresa ou grupo" },
  { value: "other", label: "Outra coisa" },
] as const;

const requestTypeValues = REQUEST_TYPES.map((r) => r.value) as [string, ...string[]];

const contactSchema = z.object({
  first: z.string().trim().min(1, "Indique o seu nome próprio").max(80),
  last: z.string().trim().min(1, "Indique o seu apelido").max(80),
  email: z.string().trim().toLowerCase().email("Introduza um email válido").max(254),
  requestType: z.enum(requestTypeValues, {
    errorMap: () => ({ message: "Escolha o que podemos ajudar a planear" }),
  }),
  travelDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Introduza uma data válida")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: z
    .string()
    .trim()
    .min(10, "Conte-nos um pouco mais para podermos ajudar")
    .max(4000, "Mensagem demasiado longa"),
});

type Status = "idle" | "submitting" | "success" | "error";

export const Route = createFileRoute("/pt/contact")({
  validateSearch: (search: Record<string, unknown>): { type?: string } => {
    const raw = typeof search.type === "string" && search.type.length > 0 ? search.type : undefined;
    return raw ? { type: raw } : {};
  },
  head: (ctx) => {
    // Paridade com /contact: `?type=` é apenas uma pré-seleção, por isso a
    // variante fica rastreável mas fora do índice, com canónico limpo.
    const search = (ctx.match?.search ?? {}) as { type?: string };
    const isParamVariant = typeof search.type === "string" && search.type.length > 0;
    return {
      meta: [
        ...(isParamVariant ? [{ name: "robots", content: "noindex, follow" }] : []),
        { title: "Contactos — YES Experiences Portugal" },
        {
          name: "description",
          content:
            "Contacte a YES Experiences Portugal por formulário, WhatsApp, telefone ou email. Respondemos diariamente em português e inglês e ajudamos a planear a sua experiência privada.",
        },
        { property: "og:title", content: "Contactos — YES Experiences Portugal" },
        {
          property: "og:description",
          content: "Fale connosco por formulário, WhatsApp, telefone ou email.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { property: "og:locale", content: "pt_PT" },
        { property: "og:url", content: "https://yesexperiencesportugal.com/pt/contact" },
      ],
      links: [
        { rel: "canonical", href: "https://yesexperiencesportugal.com/pt/contact" },
        ...localeAlternateLinks("/contact"),
      ],
    };
  },
  component: PtContactPage,
});

function PtContactPage() {
  useMarketingMotion();
  const { type } = Route.useSearch();
  const presetRequestType = REQUEST_TYPES.some((r) => r.value === type) ? type : undefined;

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <SiteLayout>
      <section className="reveal pt-32 pb-10 bg-[color:var(--sand)]">
        <div className="container-x max-w-2xl">
          <Eyebrow>Contactos</Eyebrow>
          <h1 className="mt-5 font-[family-name:var(--font-editorial)] text-4xl md:text-5xl leading-[1.05] text-[color:var(--charcoal)]">
            Estamos a um recado de distância.
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-[color:var(--charcoal-soft)]">
            Escreva-nos com o que tem em mente — datas, número de pessoas, região ou ocasião.
            Respondemos em português ou em inglês, todos os dias, com propostas concretas e claras.
          </p>
        </div>
      </section>

      <section className="reveal py-16 md:py-20">
        <div className="container-x grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            {sent ? (
              <div className="border-l-4 border-[color:var(--gold)] bg-[color:var(--sand)] p-10">
                <h2 className="serif text-3xl text-[color:var(--teal)]">Obrigado.</h2>
                <p className="mt-3 text-[color:var(--charcoal-soft)]">
                  A sua mensagem chegou à nossa equipa. Entramos em contacto em breve.
                </p>
              </div>
            ) : (
              <form
                noValidate
                className="space-y-6"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setErrorMsg(null);
                  const data = new FormData(e.currentTarget);
                  const parsed = contactSchema.safeParse({
                    first: String(data.get("first") ?? ""),
                    last: String(data.get("last") ?? ""),
                    email: String(data.get("email") ?? ""),
                    requestType: String(data.get("requestType") ?? ""),
                    travelDate: String(data.get("travelDate") ?? ""),
                    message: String(data.get("message") ?? ""),
                  });
                  if (!parsed.success) {
                    setErrorMsg(parsed.error.issues[0]?.message ?? "Verifique o formulário.");
                    return;
                  }
                  setStatus("submitting");
                  try {
                    const resp = await fetch("/api/public/contact", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        first: parsed.data.first,
                        last: parsed.data.last,
                        email: parsed.data.email,
                        requestType: parsed.data.requestType,
                        travelDate: parsed.data.travelDate ?? null,
                        message: parsed.data.message,
                        place: null,
                        source: "contact-page-pt",
                        locale: "pt-PT",
                        userAgent:
                          typeof navigator !== "undefined"
                            ? navigator.userAgent.slice(0, 500)
                            : null,
                      }),
                    });
                    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    setStatus("success");
                    setSent(true);
                    void import("@/lib/analytics-ga4").then((m) =>
                      m.gaGenerateLead({
                        leadSource: "contact_form",
                        method: "email",
                        requestType: parsed.data.requestType,
                      }),
                    );
                    trackEvent("contact_form_submitted", { placement: parsed.data.requestType });
                  } catch (err) {
                    console.error("[pt-contact] submit failed", err);
                    setStatus("error");
                    setErrorMsg(
                      `Não foi possível enviar a mensagem. Escreva-nos para ${EMAIL}, por favor.`,
                    );
                  }
                }}
              >
                <div className="grid sm:grid-cols-2 gap-6">
                  <Field label="Nome próprio" name="first" autoComplete="given-name" />
                  <Field label="Apelido" name="last" autoComplete="family-name" />
                </div>
                <Field label="Email" name="email" type="email" autoComplete="email" />
                <SelectField
                  label="O que podemos ajudar a planear?"
                  name="requestType"
                  options={REQUEST_TYPES}
                  defaultValue={presetRequestType}
                />
                <Field
                  label="Quando viaja? (opcional)"
                  name="travelDate"
                  type="date"
                  required={false}
                  min={new Date().toISOString().slice(0, 10)}
                  autoComplete="off"
                />
                <Field label="O que gostaria de viver?" name="message" textarea />
                {errorMsg ? (
                  <p className="text-[13px] text-red-700" role="alert">
                    {errorMsg}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="inline-flex min-h-11 items-center justify-center gap-2 bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] text-[color:var(--ivory)] px-7 py-3.5 text-[11px] uppercase tracking-[0.22em] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "submitting" ? "A enviar…" : "Enviar mensagem"}
                </button>
                <p className="text-[12.5px] leading-relaxed text-[color:var(--charcoal-soft)]">
                  Usamos os seus dados apenas para responder ao seu pedido. Consulte a{" "}
                  <Link
                    to="/pt/privacy"
                    className="underline underline-offset-2 text-[color:var(--teal)]"
                  >
                    política de privacidade
                  </Link>
                  .
                </p>
              </form>
            )}
          </div>

          <aside>
            <dl className="space-y-6 text-[15px]">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                  WhatsApp
                </dt>
                <dd className="mt-1">
                  <a
                    href={whatsappUrl("Olá! Gostaria de saber mais sobre uma experiência YES.")}
                    className="text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
                  >
                    {PHONE_DISPLAY}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                  Telefone
                </dt>
                <dd className="mt-1">
                  <a
                    href={PHONE_HREF}
                    className="text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
                  >
                    {PHONE_DISPLAY}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                  Email
                </dt>
                <dd className="mt-1">
                  <a
                    href={EMAIL_HREF}
                    className="text-[color:var(--teal)] hover:text-[color:var(--charcoal)] transition-colors"
                  >
                    {EMAIL}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                  Sede
                </dt>
                <dd className="mt-1 text-[color:var(--charcoal-soft)]">
                  {BUSINESS_NAME} · {BASED_IN}
                  <br />
                  {TRUST_LINE_PT}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                  Horário de resposta
                </dt>
                <dd className="mt-1 text-[color:var(--charcoal-soft)]">
                  Todos os dias, 9h–20h (WET/WEST). Fora deste horário, respondemos na manhã
                  seguinte.
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({
  label,
  name,
  type = "text",
  textarea = false,
  required = true,
  min,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  textarea?: boolean;
  required?: boolean;
  min?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)]">
        {label}
      </span>
      {textarea ? (
        <textarea
          name={name}
          rows={5}
          required={required}
          maxLength={4000}
          autoComplete={autoComplete}
          className="mt-2 min-h-11 w-full bg-transparent border-b border-[color:var(--charcoal)]/30 focus:border-[color:var(--teal)] outline-none py-2 text-base resize-none transition-colors"
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          min={min}
          maxLength={type === "email" ? 254 : 80}
          autoComplete={autoComplete}
          className="mt-2 min-h-11 w-full bg-transparent border-b border-[color:var(--charcoal)]/30 focus:border-[color:var(--teal)] outline-none py-2 text-base transition-colors"
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.25em] text-[color:var(--charcoal-soft)]">
        {label}
      </span>
      <select
        name={name}
        required
        defaultValue={defaultValue ?? ""}
        className="mt-2 min-h-11 w-full bg-transparent border-b border-[color:var(--charcoal)]/30 focus:border-[color:var(--teal)] outline-none py-2 text-base transition-colors appearance-none"
      >
        <option value="" disabled>
          Escolha uma opção…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
