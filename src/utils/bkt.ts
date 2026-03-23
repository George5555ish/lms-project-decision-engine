import { BktParams } from '../models/SkillConfig';

/**
 * Apply Bayesian Knowledge Tracing update for a single skill.
 *
 * P(L0): prior knowledge
 * P(T): learning/transition
 * P(G): guess
 * P(S): slip
 */
export function updateBkt(pKnowPrev: number, correct: boolean, params: BktParams): number {
  const { pT, pG, pS } = params;

  let pKnowGivenObs: number;

  if (correct) {
    // P(Ln | correct)
    // (P(Ln-1)*(1 - S)) / ((P(Ln-1)*(1 - S)) + ((1 - P(Ln-1))*G))
    const numerator = pKnowPrev * (1 - pS);
    const denominator = numerator + (1 - pKnowPrev) * pG;
    pKnowGivenObs = denominator === 0 ? pKnowPrev : numerator / denominator;
  } else {
    // P(Ln | incorrect)
    // (P(Ln-1)*S) / ((P(Ln-1)*S) + ((1 - P(Ln-1))*(1 - G)))
    const numerator = pKnowPrev * pS;
    const denominator = numerator + (1 - pKnowPrev) * (1 - pG);
    pKnowGivenObs = denominator === 0 ? pKnowPrev : numerator / denominator;
  }

  // Apply learning transition: P(Ln) = P(Ln) + (1 - P(Ln)) * T
  const pKnowUpdated = pKnowGivenObs + (1 - pKnowGivenObs) * pT;

  // Clamp to [0,1]
  return Math.min(1, Math.max(0, pKnowUpdated));
}

