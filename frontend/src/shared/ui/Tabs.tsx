import { motion } from "motion/react";

interface Tab<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (value: T) => void;
  /** Namespaces the sliding pill's `layoutId`. Give each `<Tabs>` on screen at
   *  the same time a distinct id, or two unrelated tab groups will animate
   *  into each other's position when either changes. */
  layoutId: string;
}

/** A segmented tab switch with a pill that slides between tabs (shared
 *  `layoutId` lets Framer Motion animate it smoothly instead of just
 *  repainting). Generic over the tab's value type so callers keep their own
 *  string-literal union (e.g. `SectionKind`) instead of a bare `string`. */
export function Tabs<T extends string>({ tabs, active, onChange, layoutId }: TabsProps<T>) {
  return (
    <div className="flex gap-1 rounded-md border border-[var(--owl-border)] p-1 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`relative px-3 py-1 rounded text-sm cursor-pointer transition-colors ${
            active === tab.value
              ? "text-[var(--owl-brown-deep)] font-medium"
              : "text-[var(--owl-brown-muted)] hover:text-[var(--owl-brown-deep)]"
          }`}
        >
          {active === tab.value && (
            <motion.span
              layoutId={`${layoutId}-pill`}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="absolute inset-0 rounded bg-[var(--owl-brown)]/10"
            />
          )}
          <span className="relative">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
