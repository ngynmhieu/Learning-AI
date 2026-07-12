/** Generic in-flight/done status for anything processed item-by-item (scrape
 *  import, local upload, pool collect). Lives in `shared` — not a feature's
 *  file — so the UI primitives that render it (`PickerCard`, `PickerGrid`)
 *  don't end up depending on a feature (shared code must not depend on
 *  business modules). Feature hooks producing this status import it from
 *  here too, rather than one feature exporting it for the others. */
export type ImportStatus = "importing" | "done" | "error";
