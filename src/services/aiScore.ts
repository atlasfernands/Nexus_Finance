const SCORE_PATTERNS = [
  /score\s+financeiro[^0-9]{0,80}(\d{1,2}(?:[,.]\d+)?)(?:\s*\/\s*10)?/i,
  /health\s+score[^0-9]{0,80}(\d{1,2}(?:[,.]\d+)?)(?:\s*\/\s*10)?/i,
];

function normalizeScoreValue(value: string): number | null {
  const parsed = Number(value.replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.min(10, Math.max(0, parsed));
}

export function extractHealthScore(analysis?: string): number | null {
  if (!analysis) {
    return null;
  }

  for (const pattern of SCORE_PATTERNS) {
    const match = analysis.match(pattern);
    const score = match?.[1] ? normalizeScoreValue(match[1]) : null;

    if (score !== null) {
      return score;
    }
  }

  return null;
}

export function formatHealthScore(analysis?: string): string {
  const score = extractHealthScore(analysis);
  return score === null ? "--" : score.toFixed(1);
}
