import { Tabs } from "@/shared/ui";
import type { SectionKind } from "../entities";

interface SectionTabsProps {
  active: SectionKind;
  onChange: (kind: SectionKind) => void;
}

const TABS: { value: SectionKind; label: string }[] = [
  { value: "volume", label: "Volumes" },
  { value: "chapter", label: "Chapters" },
];

/** Volumes | Chapters switch — the two tabs are just a `kind` filter, built on
 *  the shared `Tabs` control. */
export function SectionTabs({ active, onChange }: SectionTabsProps) {
  return <Tabs tabs={TABS} active={active} onChange={onChange} layoutId="section-tabs" />;
}
