export interface BktParams {
  pL0: number; // initial knowledge
  pT: number; // learning (transition) probability
  pG: number; // guess probability
  pS: number; // slip probability
}

export interface SkillConfig {
  id: string;
  topic: string;
  name: string;
  importance: number; // higher = more exam-critical
  bkt: BktParams;
}

