/**
 * signatureOnePagerPdf — single-page A4 PDF summary of the Final Signature
 * Day. Rendered client-side from live state (never from server data), so
 * back-navigation edits are always reflected in the download.
 *
 * PDF contains price/inclusions/additions only. The story narrative lives
 * in the Signature Story email — this stays a compact, printable summary.
 */
import * as React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const TEAL = "#295B61";
const GOLD = "#C9A96A";
const CHARCOAL = "#2E2E2E";
const IVORY = "#FAF8F3";
const SAND = "#F4EEE2";

export interface SignatureOnePagerData {
  title: string;
  dateLabel: string | null;
  guests: number;
  pickupLabel: string;
  languageLabel: string;
  inclusions: string[];
  additions: Array<{ label: string; priceEur: number }>;
  totalEur: number | null;
  perPaxEur: number | null;
  supportEmail?: string;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: IVORY,
    padding: 40,
    fontFamily: "Times-Roman",
    color: CHARCOAL,
    fontSize: 11,
  },
  wordmark: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 2,
    color: GOLD,
    textTransform: "uppercase",
  },
  goldRule: { borderBottomWidth: 0.75, borderBottomColor: GOLD, marginTop: 6, marginBottom: 22 },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 22,
    lineHeight: 1.2,
    color: CHARCOAL,
    marginBottom: 6,
  },
  lede: {
    fontFamily: "Times-Italic",
    fontSize: 12,
    color: "#4a4a4a",
    marginBottom: 18,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    borderTopWidth: 0.5,
    borderTopColor: "#00000022",
    borderBottomWidth: 0.5,
    borderBottomColor: "#00000022",
    paddingTop: 10,
    paddingBottom: 10,
  },
  metaCell: { width: "50%", marginBottom: 8 },
  metaLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 1.8,
    color: TEAL,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metaValue: { fontFamily: "Times-Roman", fontSize: 11.5, color: CHARCOAL },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: TEAL,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 6,
  },
  list: { marginBottom: 14 },
  listItem: { fontSize: 11, marginBottom: 3, color: CHARCOAL },
  additionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  additionPrice: { fontFamily: "Helvetica", color: TEAL },
  totalBox: {
    marginTop: 18,
    padding: 14,
    backgroundColor: SAND,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  totalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: CHARCOAL,
    textTransform: "uppercase",
  },
  totalValue: {
    fontFamily: "Times-Bold",
    fontSize: 22,
    color: CHARCOAL,
  },
  perPax: {
    fontFamily: "Helvetica",
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#00000099",
    marginTop: 3,
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    bottom: 34,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: "#00000022",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontFamily: "Times-Italic",
    fontSize: 9,
    color: "#4a4a4a",
  },
  footerBrand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1.5,
    color: GOLD,
    textTransform: "uppercase",
  },
});

function formatEur(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function SignatureOnePager({ data }: { data: SignatureOnePagerData }) {
  const {
    title,
    dateLabel,
    guests,
    pickupLabel,
    languageLabel,
    inclusions,
    additions,
    totalEur,
    perPaxEur,
    supportEmail = "yesexperiences@gmail.com",
  } = data;

  return (
    <Document
      title={`Signature Day — ${title}`}
      author="YES Experiences Portugal"
      creator="YES Experiences Portugal"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.wordmark}>YES Experiences · Portugal</Text>
        <View style={styles.goldRule} />

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.lede}>A private day, shaped for you and instantly confirmed.</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{dateLabel ?? "Flexible"}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Guests</Text>
            <Text style={styles.metaValue}>
              {`${guests} ${guests === 1 ? "guest" : "guests"}`}
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Pickup</Text>
            <Text style={styles.metaValue}>{pickupLabel}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Language</Text>
            <Text style={styles.metaValue}>{languageLabel}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What's included</Text>
        <View style={styles.list}>
          {inclusions.slice(0, 8).map((item, i) => (
            <Text key={i} style={styles.listItem}>· {item}</Text>
          ))}
        </View>

        {additions.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Your additions</Text>
            <View style={styles.list}>
              {additions.map((a, i) => (
                <View key={i} style={styles.additionRow}>
                  <Text style={styles.listItem}>· {a.label}</Text>
                  <Text style={[styles.listItem, styles.additionPrice]}>
                    {formatEur(a.priceEur)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total</Text>
          <View>
            <Text style={styles.totalValue}>{formatEur(totalEur)}</Text>
            {perPaxEur != null ? (
              <Text style={styles.perPax}>{`${formatEur(perPaxEur)} / guest`}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Instant confirmation the moment you reserve.</Text>
          <Text style={styles.footerBrand}>{supportEmail}</Text>
        </View>
      </Page>
    </Document>
  );
}

export default SignatureOnePager;
