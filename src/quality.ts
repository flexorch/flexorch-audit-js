export interface QualityMetrics {
  completeness: number;
  avg_length: number;
  duplicate_ratio: null;
}

export function qualityMetrics(text: string): QualityMetrics {
  const stripped = (text ?? "").trim();
  return {
    completeness: stripped.length > 0 ? 1.0 : 0.0,
    avg_length: stripped.length,
    duplicate_ratio: null,
  };
}
