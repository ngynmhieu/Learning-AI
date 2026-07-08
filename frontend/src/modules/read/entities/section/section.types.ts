/** A volume or chapter — the two tabs are just this type filtered by `kind`. */
export type { SectionSummary as Section } from "../../shared/api/readApi";

export type SectionKind = "volume" | "chapter";

/** Display label for a section card ("Vol. 3", "Ch. 12.5 — The Storm", …). */
export function sectionLabel(section: {
  kind: SectionKind;
  number: number | null;
  title: string | null;
}): string {
  const prefix = section.kind === "volume" ? "Vol." : "Ch.";
  const num = section.number !== null ? ` ${section.number}` : "";
  const title = section.title ? `${section.number !== null ? " — " : " "}${section.title}` : "";
  return `${prefix}${num}${title}` || prefix;
}
