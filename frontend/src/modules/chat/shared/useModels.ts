import { useEffect, useState } from "react";
import { chatApi, type ModelInfo } from "@/shared/api";

interface UseModelsReturn {
  models: ModelInfo[];
  count: number | null;
  error: string | null;
}

/** Fetches the available LLM models from the backend once on mount. */
export function useModels(): UseModelsReturn {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    chatApi
      .listModels()
      .then((res) => {
        if (!active) return;
        setModels(res.models);
        setCount(res.count);
      })
      .catch((err) => {
        if (active) setError((err as Error).message);
      });
    return () => {
      active = false;
    };
  }, []);

  return { models, count, error };
}
