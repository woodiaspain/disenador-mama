import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { DesignProject } from "./design-project";
import type { GarmentMeasurements } from "./spec-types";

// ─── Color helpers ────────────────────────────────────────────────────────────

const PANTONE_HEX: Record<string, string> = {
  "warm sand": "#C4A882",
  sand: "#C4A882",
  indigo: "#2C3F6E",
  ecru: "#E8DCC8",
  black: "#1A1A1A",
  white: "#F5F5F5",
  navy: "#1B2A4A",
  grey: "#888888",
  gray: "#888888",
  khaki: "#C3B091",
  tan: "#D2B48C",
  brown: "#795548",
  olive: "#808000",
  rust: "#8B2500",
  camel: "#C19A6B",
  ivory: "#F2EDD4",
  cream: "#EDE5C8",
  beige: "#D9C9A8",
  chocolate: "#5C3018",
  "dark navy": "#111E35",
  "washed indigo": "#4A5F8A",
  blue: "#2B4C8A",
  "light blue": "#5B8FC0",
  "light grey": "#C0BFBB",
  "dark grey": "#444444",
  charcoal: "#2E2E2E",
  "olive drab": "#5A5A28",
  "forest green": "#254B30",
  green: "#3A6040",
  burgundy: "#5C1A1A",
  orange: "#C06020",
  mustard: "#A88828",
  yellow: "#C8A820",
  pink: "#C87878",
  blush: "#D8A898",
  lavender: "#8878A8",
  purple: "#5A3878",
};

function resolveColor(str: string): string {
  const lower = str.toLowerCase();
  for (const [key, hex] of Object.entries(PANTONE_HEX)) {
    if (lower.includes(key)) return hex;
  }
  return "#888888";
}

// ─── Measurement rows ─────────────────────────────────────────────────────────

const MEASUREMENT_ROWS: { key: keyof GarmentMeasurements; pom: number; label: string }[] = [
  { pom: 1, key: "waist_half",        label: "WAIST (1/2)" },
  { pom: 2, key: "hip_half",          label: "HIP (1/2, 20CM BELOW WB)" },
  { pom: 3, key: "front_rise",        label: "FRONT RISE" },
  { pom: 4, key: "back_rise",         label: "BACK RISE" },
  { pom: 5, key: "thigh_half",        label: "THIGH (1/2)" },
  { pom: 6, key: "knee_half",         label: "KNEE (1/2)" },
  { pom: 7, key: "leg_opening_half",  label: "LEG OPENING (1/2)" },
  { pom: 8, key: "inseam",            label: "INSEAM" },
  { pom: 9, key: "outseam_incl_wb",   label: "OUTSEAM (INCL.WB)" },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    fontSize: 8,
  },

  // ── Shared header ──────────────────────────────────────────────────────────
  headerWrap: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerBrand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#000000",
  },
  headerCollection: {
    fontSize: 7,
    letterSpacing: 1.5,
    color: "#666666",
  },
  headerDate: {
    fontSize: 7,
    color: "#666666",
  },
  headerBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerInfoTable: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#CCCCCC",
  },
  headerInfoRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#CCCCCC",
  },
  headerInfoRowLast: {
    flexDirection: "row",
  },
  headerInfoCell: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: "#CCCCCC",
  },
  headerInfoCellLast: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  headerInfoLabel: {
    fontSize: 5.5,
    letterSpacing: 1,
    color: "#999999",
    marginBottom: 1,
  },
  headerInfoValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    color: "#000000",
    letterSpacing: 0.3,
  },
  headerStyleName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    letterSpacing: 1.5,
    color: "#000000",
    marginLeft: 16,
    maxWidth: 160,
    textAlign: "right",
  },

  // ── Section labels ─────────────────────────────────────────────────────────
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6,
    letterSpacing: 2,
    color: "#888888",
    marginBottom: 5,
  },

  // ── Bullet list ────────────────────────────────────────────────────────────
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bulletDash: {
    fontSize: 7,
    color: "#888888",
    width: 8,
    marginRight: 3,
  },
  bulletText: {
    fontSize: 7,
    color: "#333333",
    flex: 1,
    lineHeight: 1.4,
  },

  // ── Sketch placeholder ─────────────────────────────────────────────────────
  sketchPlaceholder: {
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  sketchPlaceholderText: {
    fontSize: 6.5,
    color: "#AAAAAA",
    letterSpacing: 1,
    textAlign: "center",
  },

  // ── Measurements table ─────────────────────────────────────────────────────
  measureTable: {
    borderWidth: 0.5,
    borderColor: "#CCCCCC",
  },
  measureHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderBottomWidth: 0.5,
    borderBottomColor: "#CCCCCC",
  },
  measureRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#EEEEEE",
  },
  measureRowLast: {
    flexDirection: "row",
  },
  measureCellPOM: {
    width: "10%",
    padding: 3,
    borderRightWidth: 0.5,
    borderRightColor: "#CCCCCC",
  },
  measureCellDesc: {
    width: "68%",
    padding: 3,
    borderRightWidth: 0.5,
    borderRightColor: "#CCCCCC",
  },
  measureCellCM: {
    width: "22%",
    padding: 3,
  },
  measureHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6,
    letterSpacing: 1,
    color: "#666666",
  },
  measureBodyText: {
    fontSize: 7,
    color: "#333333",
  },
  measureValueText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#000000",
    textAlign: "right",
  },
});

// ─── Shared header (pages 2–7) ────────────────────────────────────────────────

function SharedHeader({ project }: { project: DesignProject }) {
  return (
    <View style={s.headerWrap}>
      {/* Top row: brand | collection | date */}
      <View style={s.headerTopRow}>
        <Text style={s.headerBrand}>{project.brand.toUpperCase()}</Text>
        <Text style={s.headerCollection}>DENIM PANT COLLECTION</Text>
        <Text style={s.headerDate}>{project.date}</Text>
      </View>

      {/* Info table + style name */}
      <View style={s.headerBody}>
        <View style={s.headerInfoTable}>
          <View style={s.headerInfoRow}>
            <View style={s.headerInfoCell}>
              <Text style={s.headerInfoLabel}>STYLE</Text>
              <Text style={s.headerInfoValue}>{project.styleCode || "—"}</Text>
            </View>
            <View style={s.headerInfoCell}>
              <Text style={s.headerInfoLabel}>SAMPLE SIZE</Text>
              <Text style={s.headerInfoValue}>42</Text>
            </View>
            <View style={s.headerInfoCellLast}>
              <Text style={s.headerInfoLabel}>DATE</Text>
              <Text style={s.headerInfoValue}>{project.date}</Text>
            </View>
          </View>
          <View style={s.headerInfoRow}>
            <View style={s.headerInfoCell}>
              <Text style={s.headerInfoLabel}>FABRIC</Text>
              <Text style={s.headerInfoValue}>AS PER TECHNICAL SHEET</Text>
            </View>
            <View style={s.headerInfoCell}>
              <Text style={s.headerInfoLabel}>WASHING</Text>
              <Text style={s.headerInfoValue}>AS PER TECHNICAL SHEET</Text>
            </View>
            <View style={s.headerInfoCellLast}>
              <Text style={s.headerInfoLabel}>DEADLINE</Text>
              <Text style={s.headerInfoValue}>ASAP</Text>
            </View>
          </View>
          <View style={s.headerInfoRowLast}>
            <View style={s.headerInfoCell}>
              <Text style={s.headerInfoLabel}>COLOUR</Text>
              <Text style={s.headerInfoValue}>AS PER TECHNICAL SHEET</Text>
            </View>
            <View style={s.headerInfoCell}>
              <Text style={s.headerInfoLabel}>DYEING</Text>
              <Text style={s.headerInfoValue}>AS PER TECHNICAL SHEET</Text>
            </View>
            <View style={s.headerInfoCellLast}>
              <Text style={s.headerInfoLabel}>CONTACT</Text>
              <Text style={s.headerInfoValue}>{project.contact || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Style name top right */}
        {project.styleName && (
          <Text style={s.headerStyleName}>{project.styleName.toUpperCase()}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Bullet list helper ───────────────────────────────────────────────────────

function BulletList({ items }: { items: string[] }) {
  return (
    <>
      {items.filter(Boolean).map((item, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bulletDash}>—</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

// ─── PAGE 1 — Portada ─────────────────────────────────────────────────────────

function Page1Cover({ project }: { project: DesignProject }) {
  return (
    <Page size="A4" style={s.page}>
      {/* Brand top left */}
      <View style={{ marginBottom: 60 }}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, letterSpacing: 3, color: "#000000" }}>
          {project.brand.toUpperCase()}
        </Text>
      </View>

      {/* Season + market centered */}
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <Text style={{ fontSize: 8, letterSpacing: 3, color: "#888888" }}>
          {project.season}  ·  {project.market}
        </Text>
      </View>

      {/* Style name — very large */}
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 28, letterSpacing: 3, color: "#000000", textAlign: "center" }}>
          {(project.styleName || "UNTITLED STYLE").toUpperCase()}
        </Text>
      </View>

      {/* Style code */}
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <Text style={{ fontSize: 9, letterSpacing: 2.5, color: "#888888" }}>
          {project.styleCode || "—"}
        </Text>
      </View>

      {/* Fit description from selected style */}
      {project.selectedLook ? (
        <View style={{ alignItems: "center", marginBottom: 16, paddingHorizontal: 60 }}>
          <Text style={{ fontSize: 8, color: "#555555", textAlign: "center", lineHeight: 1.6 }}>
            {project.selectedLook}
          </Text>
        </View>
      ) : null}

      {/* Divider line */}
      <View style={{ borderBottomWidth: 0.5, borderBottomColor: "#CCCCCC", marginVertical: 24, marginHorizontal: 60 }} />

      {/* Category + season info */}
      <View style={{ alignItems: "center", gap: 4 }}>
        <Text style={{ fontSize: 7, letterSpacing: 2, color: "#AAAAAA" }}>
          {project.category}
        </Text>
      </View>

      {/* Date bottom right */}
      <View style={{ position: "absolute", bottom: 30, right: 30 }}>
        <Text style={{ fontSize: 7, color: "#AAAAAA", letterSpacing: 1 }}>{project.date}</Text>
      </View>
    </Page>
  );
}

// ─── PAGE 2 — Referencias de Looks ───────────────────────────────────────────

function Page2Looks({ project }: { project: DesignProject }) {
  const images = project.lookImages.slice(0, 4);
  const trends = project.trendReport?.keyTrends ?? [];
  const palette = project.trendReport?.colorPalette ?? [];

  return (
    <Page size="A4" style={s.page}>
      <SharedHeader project={project} />

      <View style={{ flexDirection: "row", gap: 16, flex: 1 }}>
        {/* Left: images + look description */}
        <View style={{ flex: 1 }}>
          {images.length > 0 && (
            <View style={{ marginBottom: 10 }}>
              <Text style={s.sectionLabel}>REFERENCIAS DE LOOKS</Text>
              {/* 2-column image grid */}
              {[0, 2].map((rowStart) => {
                const rowImages = images.slice(rowStart, rowStart + 2);
                if (rowImages.length === 0) return null;
                return (
                  <View key={rowStart} style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
                    {rowImages.map((src, i) => (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <Image
                        key={i}
                        src={src}
                        style={{ flex: 1, height: 120, objectFit: "cover" }}
                      />
                    ))}
                    {rowImages.length === 1 && <View style={{ flex: 1 }} />}
                  </View>
                );
              })}
            </View>
          )}

          {project.selectedLook ? (
            <View style={{ marginBottom: 10 }}>
              <Text style={s.sectionLabel}>DESCRIPCIÓN DEL LOOK</Text>
              <Text style={{ fontSize: 7.5, color: "#333333", lineHeight: 1.5 }}>
                {project.selectedLook}
              </Text>
            </View>
          ) : null}

          {/* Color palette */}
          {palette.length > 0 && (
            <View>
              <Text style={s.sectionLabel}>PALETA DE COLOR</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {palette.map((color, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                    <View style={{ width: 14, height: 14, backgroundColor: resolveColor(color), borderWidth: 0.5, borderColor: "#DDDDDD" }} />
                    <Text style={{ fontSize: 6.5, color: "#555555" }}>{color}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Right: key trends */}
        {trends.length > 0 && (
          <View style={{ width: 160 }}>
            <Text style={s.sectionLabel}>TENDENCIAS CLAVE</Text>
            <BulletList items={trends} />
          </View>
        )}
      </View>
    </Page>
  );
}

// ─── PAGE 3 — Bocetos Técnicos ────────────────────────────────────────────────

function Page3Sketches({ project }: { project: DesignProject }) {
  return (
    <Page size="A4" style={s.page}>
      <SharedHeader project={project} />

      <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
        {/* Front sketch */}
        <View style={{ flex: 1, flexDirection: "column" }}>
          {project.sketchFront ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={project.sketchFront} style={{ flex: 1, objectFit: "contain" }} />
          ) : (
            <View style={[s.sketchPlaceholder, { flex: 1 }]}>
              <Text style={s.sketchPlaceholderText}>DELANTERO{"\n"}NO DISPONIBLE</Text>
            </View>
          )}
          <Text style={{ textAlign: "center", fontSize: 6.5, letterSpacing: 2, color: "#888888", marginTop: 6 }}>
            DELANTERO
          </Text>
        </View>

        {/* Back sketch */}
        <View style={{ flex: 1, flexDirection: "column" }}>
          {project.sketchBack ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={project.sketchBack} style={{ flex: 1, objectFit: "contain" }} />
          ) : (
            <View style={[s.sketchPlaceholder, { flex: 1 }]}>
              <Text style={s.sketchPlaceholderText}>ESPALDA{"\n"}NO DISPONIBLE</Text>
            </View>
          )}
          <Text style={{ textAlign: "center", fontSize: 6.5, letterSpacing: 2, color: "#888888", marginTop: 6 }}>
            ESPALDA
          </Text>
        </View>
      </View>
    </Page>
  );
}

// ─── PAGE 4 — Delantero con Detalles ─────────────────────────────────────────

function Page4Front({ project }: { project: DesignProject }) {
  const swatchColor = project.topstitchThread ? resolveColor(project.topstitchThread) : "#888888";

  return (
    <Page size="A4" style={s.page}>
      <SharedHeader project={project} />

      <View style={{ flexDirection: "row", gap: 14, flex: 1 }}>
        {/* Front sketch 40% */}
        <View style={{ width: "40%" }}>
          {project.sketchFront ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={project.sketchFront} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <View style={[s.sketchPlaceholder, { flex: 1 }]}>
              <Text style={s.sketchPlaceholderText}>DELANTERO</Text>
            </View>
          )}
        </View>

        {/* Details 60% */}
        <View style={{ flex: 1, gap: 14 }}>
          {project.frontDetails.filter(Boolean).length > 0 && (
            <View>
              <Text style={s.sectionLabel}>KEY DETAILS</Text>
              <BulletList items={project.frontDetails} />
            </View>
          )}

          {project.washingDescription ? (
            <View>
              <Text style={s.sectionLabel}>WASHING DESCRIPTION</Text>
              <Text style={{ fontSize: 7, color: "#333333", lineHeight: 1.5 }}>
                {project.washingDescription}
              </Text>
            </View>
          ) : null}

          {project.washingInstructions.length > 0 && (
            <View>
              <Text style={s.sectionLabel}>WASHING INSTRUCTIONS</Text>
              <BulletList items={project.washingInstructions} />
            </View>
          )}

          {project.topstitchThread ? (
            <View>
              <Text style={s.sectionLabel}>TOPSTITCH THREAD</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 16, height: 16, backgroundColor: swatchColor, borderWidth: 0.5, borderColor: "#DDDDDD" }} />
                <Text style={{ fontSize: 7, color: "#333333" }}>{project.topstitchThread}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Page>
  );
}

// ─── PAGE 5 — Espalda con Detalles ───────────────────────────────────────────

function Page5Back({ project }: { project: DesignProject }) {
  return (
    <Page size="A4" style={s.page}>
      <SharedHeader project={project} />

      <View style={{ flexDirection: "row", gap: 14, flex: 1 }}>
        {/* Back sketch 40% */}
        <View style={{ width: "40%" }}>
          {project.sketchBack ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={project.sketchBack} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <View style={[s.sketchPlaceholder, { flex: 1 }]}>
              <Text style={s.sketchPlaceholderText}>ESPALDA{"\n"}NO DISPONIBLE</Text>
            </View>
          )}
        </View>

        {/* Details 60% */}
        <View style={{ flex: 1, gap: 14 }}>
          {project.backDetails.filter(Boolean).length > 0 && (
            <View>
              <Text style={s.sectionLabel}>BACK DETAILS</Text>
              <BulletList items={project.backDetails} />
            </View>
          )}

          {project.specialConstruction.filter(Boolean).length > 0 && (
            <View>
              <Text style={s.sectionLabel}>SPECIAL CONSTRUCTION</Text>
              <BulletList items={project.specialConstruction} />
            </View>
          )}

          {project.rivetFinish ? (
            <View>
              <Text style={s.sectionLabel}>RIVET FINISH</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#000000", letterSpacing: 0.5 }}>
                {project.rivetFinish}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Page>
  );
}

// ─── PAGE 6 — Medidas y Tejido ────────────────────────────────────────────────

function Page6Measurements({ project }: { project: DesignProject }) {
  return (
    <Page size="A4" style={s.page}>
      <SharedHeader project={project} />

      <View style={{ flexDirection: "row", gap: 20, flex: 1 }}>
        {/* Left: measurements table */}
        <View style={{ width: "50%" }}>
          <Text style={s.sectionLabel}>POINTS OF MEASURE — TALLA 42</Text>
          <View style={s.measureTable}>
            <View style={s.measureHeaderRow}>
              <View style={s.measureCellPOM}>
                <Text style={s.measureHeaderText}>POM</Text>
              </View>
              <View style={s.measureCellDesc}>
                <Text style={s.measureHeaderText}>DESCRIPTION</Text>
              </View>
              <View style={s.measureCellCM}>
                <Text style={[s.measureHeaderText, { textAlign: "right" }]}>CM</Text>
              </View>
            </View>
            {MEASUREMENT_ROWS.map((row, i) => (
              <View key={row.key} style={i < MEASUREMENT_ROWS.length - 1 ? s.measureRow : s.measureRowLast}>
                <View style={s.measureCellPOM}>
                  <Text style={[s.measureBodyText, { color: "#888888" }]}>{row.pom}</Text>
                </View>
                <View style={s.measureCellDesc}>
                  <Text style={s.measureBodyText}>{row.label}</Text>
                </View>
                <View style={s.measureCellCM}>
                  <Text style={s.measureValueText}>{project.measurements[row.key]}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Right: fabric */}
        <View style={{ flex: 1, gap: 12 }}>
          <Text style={s.sectionLabel}>TEJIDO</Text>

          {project.fabricDescription ? (
            <View>
              <Text style={{ fontSize: 5.5, letterSpacing: 1, color: "#999999", marginBottom: 2 }}>TEJIDO SELECCIONADO</Text>
              <Text style={{ fontSize: 7.5, color: "#000000", fontFamily: "Helvetica-Bold" }}>{project.fabricDescription}</Text>
            </View>
          ) : null}

          {project.fabricComposition ? (
            <View>
              <Text style={{ fontSize: 5.5, letterSpacing: 1, color: "#999999", marginBottom: 2 }}>COMPOSICIÓN</Text>
              <Text style={{ fontSize: 7, color: "#333333" }}>{project.fabricComposition}</Text>
            </View>
          ) : null}

          {project.fabricWeight ? (
            <View>
              <Text style={{ fontSize: 5.5, letterSpacing: 1, color: "#999999", marginBottom: 2 }}>PESO</Text>
              <Text style={{ fontSize: 7, color: "#333333" }}>{project.fabricWeight} oz</Text>
            </View>
          ) : null}

          {project.fabricImage ? (
            <View>
              <Text style={{ fontSize: 5.5, letterSpacing: 1, color: "#999999", marginBottom: 4 }}>MUESTRA DE TEJIDO</Text>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={project.fabricImage} style={{ width: "100%", maxHeight: 180, objectFit: "contain" }} />
            </View>
          ) : null}
        </View>
      </View>
    </Page>
  );
}

// ─── PAGE 7 — Trims ───────────────────────────────────────────────────────────

function Page7Trims({ project }: { project: DesignProject }) {
  const included = project.trims.filter((t) => t.included);

  // Group into rows of 2
  const rows: (typeof included)[] = [];
  for (let i = 0; i < included.length; i += 2) {
    rows.push(included.slice(i, i + 2));
  }

  return (
    <Page size="A4" style={s.page}>
      <SharedHeader project={project} />

      <Text style={s.sectionLabel}>TRIMS Y ACABADOS</Text>

      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          {row.map((trim, colIdx) => (
            <View
              key={colIdx}
              style={{
                flex: 1,
                borderWidth: 0.5,
                borderColor: "#CCCCCC",
                padding: 8,
                gap: 4,
              }}
            >
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7.5, letterSpacing: 1, color: "#000000" }}>
                {trim.name.toUpperCase()}
              </Text>
              {trim.description ? (
                <Text style={{ fontSize: 7, color: "#555555" }}>{trim.description}</Text>
              ) : null}
              {trim.finish && trim.finish !== "—" ? (
                <View>
                  <Text style={{ fontSize: 5.5, letterSpacing: 1, color: "#999999", marginBottom: 1 }}>FINISH</Text>
                  <Text style={{ fontSize: 7, color: "#333333" }}>{trim.finish}</Text>
                </View>
              ) : null}
              {trim.pantone ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <View style={{ width: 12, height: 12, backgroundColor: resolveColor(trim.pantone), borderWidth: 0.5, borderColor: "#DDDDDD" }} />
                  <Text style={{ fontSize: 6.5, color: "#666666" }}>{trim.pantone}</Text>
                </View>
              ) : null}
            </View>
          ))}
          {/* Fill empty slot in last row if odd number */}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}

      {included.length === 0 && (
        <Text style={{ fontSize: 7.5, color: "#AAAAAA", marginTop: 8 }}>
          No hay trims incluidos.
        </Text>
      )}
    </Page>
  );
}

// ─── Document root ────────────────────────────────────────────────────────────

export function DesignProjectDocument({ project }: { project: DesignProject }) {
  return (
    <Document>
      <Page1Cover project={project} />
      <Page2Looks project={project} />
      <Page3Sketches project={project} />
      <Page4Front project={project} />
      <Page5Back project={project} />
      <Page6Measurements project={project} />
      <Page7Trims project={project} />
    </Document>
  );
}
