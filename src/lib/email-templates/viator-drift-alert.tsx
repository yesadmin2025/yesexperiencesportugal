import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface ViatorDriftItem {
  tourId: string;
  title?: string;
  addedOnViator: string[];
  removedOnViator: string[];
  priceFromViator?: string | null;
}

export interface ViatorDriftAlertProps {
  runAt?: string;
  toursChecked?: number;
  toursWithDrift?: number;
  scrapeErrors?: number;
  items?: ViatorDriftItem[];
}

const container = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "24px",
  fontFamily: "Inter, Arial, sans-serif",
} as const;
const h1 = { color: "#295B61", fontSize: 20, margin: "0 0 12px" } as const;
const label = {
  color: "#666",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};
const value = { color: "#111", fontSize: 14, margin: "2px 0 12px" };
const tourBlock = {
  borderTop: "1px solid #E8E2D5",
  paddingTop: 12,
  marginTop: 12,
} as const;

const Alert: React.FC<ViatorDriftAlertProps> = (p) => {
  const items = p.items ?? [];
  const drift = p.toursWithDrift ?? items.length;
  return (
    <Html>
      <Head />
      <Preview>Viator drift check: {drift} tour(s) changed</Preview>
      <Body style={{ backgroundColor: "#FAF8F3", margin: 0 }}>
        <Container style={container}>
          <Heading style={h1}>Viator drift report</Heading>
          <Text style={{ color: "#333", fontSize: 14 }}>
            Weekly comparison of scraped Viator inclusions vs the YES source of truth.
            No SoT files were changed — review below and patch what still matters.
          </Text>

          <Section style={{ marginTop: 16 }}>
            <Text style={label}>Run at</Text>
            <Text style={value}>{p.runAt ?? new Date().toISOString()}</Text>
            <Text style={label}>Tours checked · with drift · scrape errors</Text>
            <Text style={value}>
              {p.toursChecked ?? 0} · {drift} · {p.scrapeErrors ?? 0}
            </Text>
          </Section>

          {items.length === 0 ? (
            <Text style={{ color: "#295B61", fontSize: 14, marginTop: 16 }}>
              All 12 signature tours are aligned with Viator this week.
            </Text>
          ) : (
            items.map((it) => (
              <Section key={it.tourId} style={tourBlock}>
                <Text style={{ ...value, fontWeight: 600 }}>
                  {it.title ?? it.tourId}{" "}
                  <span style={{ color: "#888", fontWeight: 400 }}>({it.tourId})</span>
                </Text>
                {it.addedOnViator.length > 0 && (
                  <>
                    <Text style={label}>New on Viator (missing from SoT)</Text>
                    <Text style={value}>• {it.addedOnViator.join("\n• ")}</Text>
                  </>
                )}
                {it.removedOnViator.length > 0 && (
                  <>
                    <Text style={label}>In SoT but no longer on Viator</Text>
                    <Text style={value}>• {it.removedOnViator.join("\n• ")}</Text>
                  </>
                )}
                {it.priceFromViator && (
                  <>
                    <Text style={label}>Viator "From" price signal</Text>
                    <Text style={value}>{it.priceFromViator}</Text>
                  </>
                )}
              </Section>
            ))
          )}

          <Text style={{ color: "#666", fontSize: 12, marginTop: 16 }}>
            Open /admin/sot-diff to review changes side-by-side before editing
            src/data/signatureToursSourceOfTruth.ts.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template: TemplateEntry = {
  component: Alert,
  subject: (data: Record<string, unknown>) => {
    const n = typeof data.toursWithDrift === "number" ? data.toursWithDrift : 0;
    return n === 0
      ? "Viator drift check: all tours aligned"
      : `Viator drift check: ${n} tour(s) changed`;
  },
  displayName: "Viator drift alert",
  to: "info@yesexperiencesportugal.com",
};
