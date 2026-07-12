import { fetchWithToken } from "./http";

/** Fetch `input`, then yield each newline-delimited JSON object from the
 *  response body as it arrives — for endpoints that stream results instead of
 *  returning one JSON array. Goes through `fetchWithToken` (not the browser's
 *  native `EventSource`, which can't carry a custom Authorization header) so
 *  streamed endpoints still authenticate the same way as every other call. */
export async function* streamNdjson<T>(input: string, init: RequestInit = {}): AsyncGenerator<T> {
  const res = await fetchWithToken(input, init);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? "Request failed");
  }
  if (!res.body) throw new Error("Streaming response has no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim()) yield JSON.parse(line) as T;
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer) as T;
}
