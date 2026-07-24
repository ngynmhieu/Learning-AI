import { useLayoutEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

interface Tab<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (value: T) => void;
}

/** A segmented tab switch with a pill that slides between tabs. Measures the
 *  active button's own position/size directly (ref + `useLayoutEffect`, so it
 *  happens before paint) and animates it with a plain CSS transition, instead
 *  of Framer Motion's shared-`layoutId` projection. That cross-render
 *  tracking measures via `getBoundingClientRect`, which can be wrong for a
 *  frame when an ANCESTOR is itself still animating (e.g. this now lives
 *  inside a `Modal` that scales in and scrolls) — the pill briefly jumps to a
 *  stale rect before self-correcting. A locally-measured, CSS-transitioned
 *  pill has no such cross-element dependency: it only interpolates this
 *  element's own `left`/`width`, unaffected by what any ancestor is doing. */
export function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>) {
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const button = buttonRefs.current.get(active);
    if (!button) return;
    setPill({ left: button.offsetLeft, width: button.offsetWidth });
  }, [active, tabs]);

  return (
    <div className="relative flex gap-1 rounded-md border border-[var(--owl-border)] p-1 w-fit">
      {pill && (
        <span
          className="absolute top-1 bottom-1 rounded bg-[var(--owl-brown)]/10 transition-[left,width] duration-300 ease-out"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {tabs.map((tab) => (
        <button
          key={tab.value}
          ref={(el) => {
            if (el) buttonRefs.current.set(tab.value, el);
            else buttonRefs.current.delete(tab.value);
          }}
          onClick={() => onChange(tab.value)}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1 rounded text-sm cursor-pointer transition-colors ${
            active === tab.value
              ? "text-[var(--owl-brown-deep)] font-medium"
              : "text-[var(--owl-brown-muted)] hover:text-[var(--owl-brown-deep)]"
          }`}
        >
          {tab.icon && <tab.icon size={14} aria-hidden="true" />}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
