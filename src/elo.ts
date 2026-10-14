export type Outcome = 'a' | 'b' | 'tie' | 'both_bad';

export const K_FACTOR = 32;
export const START_RATING = 1000;

/** Probability that a player rated `ra` beats a player rated `rb`. */
export function expectedScore(ra: number, rb: number): number {
  return 1 / (1 + 10 ** ((rb - ra) / 400));
}

/**
 * New ratings for both sides after one vote. "Both bad" counts as a tie,
 * the same way LMSYS Chatbot Arena scores it.
 */
export function updateElo(ra: number, rb: number, outcome: Outcome, k = K_FACTOR): [number, number] {
  const scoreA = outcome === 'a' ? 1 : outcome === 'b' ? 0 : 0.5;
  const ea = expectedScore(ra, rb);
  const delta = k * (scoreA - ea);
  return [ra + delta, rb - delta];
}
