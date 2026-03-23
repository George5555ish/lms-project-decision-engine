import path from 'path';
import fs from 'fs';
import { SkillConfig, BktParams } from '../models/SkillConfig';

// Use bundled data (decision-engine/data). Works for both monorepo dev and Railway deploy.
const DATA_DIR = path.resolve(__dirname, '../../data');
const BIOLOGY_SPEC = path.join(DATA_DIR, 'aqa_biology_spec_full_hierarchy.json');
const PHYSICS_SPEC = path.join(DATA_DIR, 'aqa_physics_spec_full_hierarchy.json');

const allowedBiologyTopics = new Set(['Cell Biology', 'Organisation', 'Infection and response']);
const allowedPhysicsTopics = new Set(['Energy', 'Electricity', 'Particle model of matter']);

// Default BKT parameters used when no specific tuning is available.
const defaultBkt: BktParams = {
  pL0: 0.2,
  pT: 0.1,
  pG: 0.2,
  pS: 0.1
};

let cachedSkills: SkillConfig[] | null = null;

function loadSkillsFromSpec(specPath: string, allowedTopics: Set<string>): SkillConfig[] {
  let raw: any;
  try {
    const file = fs.readFileSync(specPath, 'utf8');
    raw = JSON.parse(file);
  } catch {
    return [];
  }

  const topics = raw?.topics || [];
  const skills: SkillConfig[] = [];

  for (const topic of topics) {
    const topicName: string = topic.title || topic.topicName || '';
    if (!topicName || !allowedTopics.has(topicName)) continue;

    const subtopics = topic.subtopics || [];

    for (const st of subtopics) {
      const subName: string = st.title || st.subtopicName || '';
      const refCode: string = st.reference_code || (st.specPoints?.[0]?.code) || `${topicName}:${subName}`;

      let importance = 1;
      if (topicName === 'Cell Biology') importance = 1.2;
      if (topicName === 'Organisation') importance = 1.1;
      if (topicName === 'Energy') importance = 1.2;
      if (topicName === 'Electricity') importance = 1.2;

      const skillId = `${topicName}::${refCode}`;

      skills.push({
        id: skillId,
        topic: topicName,
        name: subName,
        importance,
        bkt: defaultBkt
      });
    }
  }

  return skills;
}

export function loadSkills(): SkillConfig[] {
  if (cachedSkills) return cachedSkills;

  const biologySkills = loadSkillsFromSpec(BIOLOGY_SPEC, allowedBiologyTopics);
  const physicsSkills = loadSkillsFromSpec(PHYSICS_SPEC, allowedPhysicsTopics);
  const skills = [...biologySkills, ...physicsSkills];

  cachedSkills = skills.length ? skills : buildFallbackSkills();
  return cachedSkills;
}

function buildFallbackSkills(): SkillConfig[] {
  return [
    { id: 'Cell Biology::cell-structure', topic: 'Cell Biology', name: 'Cell structure', importance: 1.2, bkt: defaultBkt },
    { id: 'Cell Biology::microscopy', topic: 'Cell Biology', name: 'Microscopy', importance: 1.1, bkt: defaultBkt },
    { id: 'Cell Biology::transport-in-cells', topic: 'Cell Biology', name: 'Transport in cells', importance: 1.3, bkt: defaultBkt },
    { id: 'Organisation::digestive-system', topic: 'Organisation', name: 'Digestive system', importance: 1.2, bkt: defaultBkt },
    { id: 'Organisation::enzymes', topic: 'Organisation', name: 'Enzymes', importance: 1.3, bkt: defaultBkt },
    { id: 'Organisation::circulatory-system', topic: 'Organisation', name: 'Circulatory system', importance: 1.2, bkt: defaultBkt },
    { id: 'Infection and response::pathogens', topic: 'Infection and response', name: 'Pathogens', importance: 1.3, bkt: defaultBkt },
    { id: 'Infection and response::immune-system', topic: 'Infection and response', name: 'Immune system', importance: 1.2, bkt: defaultBkt },
    { id: 'Infection and response::vaccination', topic: 'Infection and response', name: 'Vaccination', importance: 1.3, bkt: defaultBkt },
    { id: 'Energy::4.1.1', topic: 'Energy', name: 'Energy stores and systems', importance: 1.2, bkt: defaultBkt },
    { id: 'Energy::4.1.2', topic: 'Energy', name: 'Conservation and dissipation of energy', importance: 1.1, bkt: defaultBkt },
    { id: 'Electricity::4.2.1', topic: 'Electricity', name: 'Current, potential difference and resistance', importance: 1.2, bkt: defaultBkt },
    { id: 'Electricity::4.2.2', topic: 'Electricity', name: 'Series and parallel circuits', importance: 1.2, bkt: defaultBkt },
    { id: 'Particle model of matter::4.3.1', topic: 'Particle model of matter', name: 'Density and changes of state', importance: 1.1, bkt: defaultBkt },
    { id: 'Particle model of matter::4.3.2', topic: 'Particle model of matter', name: 'Internal energy and energy transfers', importance: 1.2, bkt: defaultBkt },
    { id: 'Particle model of matter::4.3.3', topic: 'Particle model of matter', name: 'Particle model and pressure', importance: 1.2, bkt: defaultBkt }
  ];
}

export function getSkillById(skillId: string): SkillConfig | undefined {
  return loadSkills().find((s) => s.id === skillId);
}

