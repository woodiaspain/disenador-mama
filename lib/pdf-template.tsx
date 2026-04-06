import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { GarmentSpecs, GarmentMeasurements } from "./spec-types";

// Pantone color approximate hex lookup
const PANTONE_HEX: Record<string, string> = {
  "warm sand": "#C4A882",
  "sand": "#C4A882",
  "indigo": "#2C3F6E",
  "ecru": "#E8DCC8",
  "black": "#1A1A1A",
  "white": "#F5F5F5",
  "navy": "#1B2A4A",
  "grey": "#888888",
  "gray": "#888888",
  "khaki": "#C3B091",
  "tan": "#D2B48C",
  "brown": "#795548",
  "olive": "#808000",
  "rust": "#8B2500",
  "camel": "#C19A6B",
};

function resolvePantoneColor(threadStr: string): string {
  const lower = threadStr.toLowerCase();
  for (const [key, hex] of Object.entries(PANTONE_HEX)) {
    if (lower.includes(key)) return hex;
  }
  return "#8A8A8A";
}

const MEASUREMENT_ROWS: Array<{
  key: keyof GarmentMeasurements;
  label: string;
  pom: string;
}> = [
  { key: "waist_half", label: "WAIST HALF", pom: "A" },
  { key: "hip_half", label: "HIP HALF", pom: "B" },
  { key: "front_rise", label: "FRONT RISE", pom: "C" },
  { key: "back_rise", label: "BACK RISE", pom: "D" },
  { key: "thigh_half", label: "THIGH HALF", pom: "E" },
  { key: "knee_half", label: "KNEE HALF", pom: "F" },
  { key: "leg_opening_half", label: "LEG OPENING HALF", pom: "G" },
  { key: "inseam", label: "INSEAM", pom: "H" },
  { key: "outseam_incl_wb", label: "OUTSEAM INCL. WB", pom: "I" },
];

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    fontSize: 8,
  },

  // HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
  },
  brandName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    letterSpacing: 3,
    color: "#000000",
  },
  collectionLabel: {
    fontSize: 7,
    letterSpacing: 2,
    color: "#555555",
    textAlign: "center",
  },
  headerDate: {
    fontSize: 7,
    color: "#555555",
    letterSpacing: 1,
    textAlign: "right",
  },

  // STYLE TITLE
  styleTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    letterSpacing: 2,
    color: "#000000",
    marginBottom: 10,
    marginTop: 8,
  },
  styleCode: {
    fontSize: 7,
    letterSpacing: 2,
    color: "#888888",
    marginBottom: 10,
  },

  // INFO TABLE
  infoTable: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#CCCCCC",
  },
  infoRowLast: {
    flexDirection: "row",
  },
  infoCell: {
    flex: 1,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: "#CCCCCC",
  },
  infoCellLast: {
    flex: 1,
    padding: 5,
  },
  infoCellLabel: {
    fontSize: 6,
    letterSpacing: 1.5,
    color: "#888888",
    marginBottom: 2,
  },
  infoCellValue: {
    fontSize: 7.5,
    color: "#000000",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },

  // BODY 3-COLUMN
  bodyRow: {
    flexDirection: "row",
    marginBottom: 12,
    minHeight: 160,
  },
  leftCol: {
    width: "28%",
    paddingRight: 10,
  },
  centerCol: {
    width: "44%",
    borderWidth: 1,
    borderColor: "#CCCCCC",
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginLeft: 10,
    overflow: "hidden",
  },
  rightCol: {
    width: "28%",
  },
  colLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    letterSpacing: 1.5,
    color: "#888888",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bulletDash: {
    fontSize: 7,
    color: "#888888",
    marginRight: 4,
    width: 8,
  },
  bulletText: {
    fontSize: 7,
    color: "#333333",
    flex: 1,
    lineHeight: 1.4,
  },
  drawingLabel: {
    fontSize: 7,
    color: "#AAAAAA",
    letterSpacing: 1,
    textAlign: "center",
    lineHeight: 1.6,
  },
  sketchImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  // MEASUREMENTS TABLE
  measurementsSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    letterSpacing: 2,
    color: "#888888",
    marginBottom: 6,
  },
  measureTable: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  measureHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderBottomWidth: 1,
    borderBottomColor: "#CCCCCC",
  },
  measureRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  measureRowLast: {
    flexDirection: "row",
  },
  measureCellPOM: {
    width: "12%",
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#CCCCCC",
  },
  measureCellDesc: {
    width: "68%",
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#CCCCCC",
  },
  measureCellCM: {
    width: "20%",
    padding: 4,
    textAlign: "right",
  },
  measureHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    letterSpacing: 1.5,
    color: "#555555",
  },
  measureBodyText: {
    fontSize: 7.5,
    color: "#000000",
  },
  measureValueText: {
    fontSize: 7.5,
    color: "#000000",
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },

  // FOOTER
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#CCCCCC",
  },
  pantoneBlock: {
    flexDirection: "row",
    alignItems: "center",
  },
  pantoneSwatch: {
    width: 18,
    height: 18,
    marginRight: 8,
    borderWidth: 0.5,
    borderColor: "#DDDDDD",
  },
  pantoneLabel: {
    fontSize: 6,
    letterSpacing: 1,
    color: "#888888",
    marginBottom: 2,
  },
  pantoneValue: {
    fontSize: 7,
    color: "#000000",
  },
  rivetBlock: {
    alignItems: "flex-end",
  },
  rivetLabel: {
    fontSize: 6,
    letterSpacing: 1,
    color: "#888888",
    marginBottom: 2,
  },
  rivetValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#000000",
    letterSpacing: 0.5,
  },

  // FIT NOTES
  fitNotesSection: {
    borderTopWidth: 1.5,
    borderTopColor: "#000000",
    paddingTop: 8,
  },
  fitNotesLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    letterSpacing: 2,
    color: "#000000",
    marginBottom: 4,
  },
  fitNotesText: {
    fontSize: 7.5,
    color: "#333333",
    lineHeight: 1.5,
  },
});

interface SpecSheetDocumentProps {
  specs: GarmentSpecs;
  brand?: string;
  referenceImageBase64?: string;
}

export function SpecSheetDocument({
  specs,
  brand = "ZARA MAN",
  referenceImageBase64,
}: SpecSheetDocumentProps) {
  const swatchColor = resolvePantoneColor(specs.topstitch_thread);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.brandName}>{brand.toUpperCase()}</Text>
          <Text style={styles.collectionLabel}>DENIM PANT COLLECTION</Text>
          <Text style={styles.headerDate}>{specs.date}</Text>
        </View>

        {/* STYLE TITLE */}
        <Text style={styles.styleTitle}>{specs.style_name}</Text>
        <Text style={styles.styleCode}>{specs.style_code} — {specs.garment_type}</Text>

        {/* INFO TABLE */}
        <View style={styles.infoTable}>
          <View style={styles.infoRow}>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>STYLE</Text>
              <Text style={styles.infoCellValue}>{specs.style_code}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>SAMPLE SIZE</Text>
              <Text style={styles.infoCellValue}>{specs.sample_size}</Text>
            </View>
            <View style={styles.infoCellLast}>
              <Text style={styles.infoCellLabel}>DATE</Text>
              <Text style={styles.infoCellValue}>{specs.date}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>FABRIC</Text>
              <Text style={styles.infoCellValue}>AS PER TECHNICAL SHEET</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>WASHING</Text>
              <Text style={styles.infoCellValue}>{specs.washing}</Text>
            </View>
            <View style={styles.infoCellLast}>
              <Text style={styles.infoCellLabel}>DEADLINE</Text>
              <Text style={styles.infoCellValue}>{specs.deadline}</Text>
            </View>
          </View>
          <View style={styles.infoRowLast}>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>COLOUR</Text>
              <Text style={styles.infoCellValue}>{specs.colour}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>DYEING</Text>
              <Text style={styles.infoCellValue}>{specs.dyeing}</Text>
            </View>
            <View style={styles.infoCellLast}>
              <Text style={styles.infoCellLabel}>CONTACT</Text>
              <Text style={styles.infoCellValue}>{specs.contact || "—"}</Text>
            </View>
          </View>
        </View>

        {/* BODY 3-COLUMN */}
        <View style={styles.bodyRow}>
          {/* Left: key details + special construction */}
          <View style={styles.leftCol}>
            <Text style={styles.colLabel}>Key Details</Text>
            {specs.key_details.map((detail, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletDash}>—</Text>
                <Text style={styles.bulletText}>{detail}</Text>
              </View>
            ))}
            {specs.special_construction.length > 0 && (
              <>
                <Text style={[styles.colLabel, { marginTop: 8 }]}>Special Construction</Text>
                {specs.special_construction.map((item, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={styles.bulletDash}>—</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Center: reference image or placeholder */}
          <View style={styles.centerCol}>
            {referenceImageBase64 ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={referenceImageBase64} style={styles.sketchImage} />
            ) : (
              <Text style={styles.drawingLabel}>
                TECHNICAL DRAWING{"\n"}{specs.style_name}
              </Text>
            )}
          </View>

          {/* Right: washing instructions */}
          <View style={styles.rightCol}>
            <Text style={styles.colLabel}>Washing Instructions</Text>
            {specs.washing_instructions.map((item, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletDash}>—</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* MEASUREMENTS TABLE */}
        <View style={styles.measurementsSection}>
          <Text style={styles.sectionLabel}>POINTS OF MEASURE</Text>
          <View style={styles.measureTable}>
            <View style={styles.measureHeaderRow}>
              <View style={styles.measureCellPOM}>
                <Text style={styles.measureHeaderText}>POM</Text>
              </View>
              <View style={styles.measureCellDesc}>
                <Text style={styles.measureHeaderText}>DESCRIPTION</Text>
              </View>
              <View style={styles.measureCellCM}>
                <Text style={[styles.measureHeaderText, { textAlign: "right" }]}>CM</Text>
              </View>
            </View>
            {MEASUREMENT_ROWS.map((row, i) => {
              const isLast = i === MEASUREMENT_ROWS.length - 1;
              return (
                <View
                  key={row.key}
                  style={isLast ? styles.measureRowLast : styles.measureRow}
                >
                  <View style={styles.measureCellPOM}>
                    <Text style={[styles.measureBodyText, { color: "#888888" }]}>
                      {row.pom}
                    </Text>
                  </View>
                  <View style={styles.measureCellDesc}>
                    <Text style={styles.measureBodyText}>{row.label}</Text>
                  </View>
                  <View style={styles.measureCellCM}>
                    <Text style={styles.measureValueText}>
                      {specs.measurements[row.key]}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* FOOTER: topstitch + rivet */}
        <View style={styles.footerRow}>
          <View style={styles.pantoneBlock}>
            <View style={[styles.pantoneSwatch, { backgroundColor: swatchColor }]} />
            <View>
              <Text style={styles.pantoneLabel}>TOPSTITCH THREAD</Text>
              <Text style={styles.pantoneValue}>{specs.topstitch_thread}</Text>
            </View>
          </View>
          <View style={styles.rivetBlock}>
            <Text style={styles.rivetLabel}>RIVET FINISH</Text>
            <Text style={styles.rivetValue}>{specs.rivet_finish}</Text>
          </View>
        </View>

        {/* FIT NOTES */}
        <View style={styles.fitNotesSection}>
          <Text style={styles.fitNotesLabel}>IMPORTANT — FIT NOTES</Text>
          <Text style={styles.fitNotesText}>{specs.fit_notes}</Text>
        </View>
      </Page>
    </Document>
  );
}
