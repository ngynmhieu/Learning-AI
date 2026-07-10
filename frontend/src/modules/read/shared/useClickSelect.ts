import { useState } from "react";

/** Click to toggle one item; shift-click extends the selection from the
 *  last-clicked item to the current one (Explorer/Gmail-style range select).
 *  `keys` is the current on-screen order — pass whatever's actually visible,
 *  since the range is defined by what the user sees between the two clicks.
 *  Selection order is preserved (new picks/range members append in that
 *  order), which callers that care about pick order (e.g. import reading
 *  order) get for free; callers that don't (e.g. bulk delete) can ignore it. */
export function useClickSelect(keys: string[]) {
  const [picked, setPicked] = useState<string[]>([]);
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);

  const onItemClick = (key: string, index: number, event: React.MouseEvent) => {
    if (event.shiftKey && anchorIndex !== null) {
      const [start, end] = [anchorIndex, index].sort((a, b) => a - b);
      const rangeKeys = keys.slice(start, end + 1);
      setPicked((prev) => [...prev, ...rangeKeys.filter((k) => !prev.includes(k))]);
    } else {
      setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    }
    setAnchorIndex(index);
  };

  return { picked, setPicked, onItemClick };
}
