import { Student, StudentDocument, SkillMastery } from '../models/Student';
import { loadSkills, getSkillById } from './skillTaxonomy';
import { updateBkt } from '../utils/bkt';
import { BktParams } from '../models/SkillConfig';

export type AoLevel = 'AO1' | 'AO2' | 'AO3';

export type QuestionType = 'retrieval' | 'procedural' | 'multi-step' | 'exam-style';

export interface NextQuestionDecision {
  topic: string;
  skill: string;
  skillId: string;
  aoLevel: AoLevel;
  difficulty: number; // 1–5
  questionType: QuestionType;
}

interface UpdatePayload {
  studentId: string;
  skillId: string;
  correct: boolean;
  questionId?: string;
}

export async function getOrCreateStudent(studentId: string): Promise<StudentDocument> {
  let student = await Student.findOne({ studentId });
  if (!student) {
    student = new Student({ studentId, skills: [], history: [], totalQuestionsAsked: 0 });
    await student.save();
  }
  return student;
}

export async function updateStudentKnowledge({
  studentId,
  skillId,
  correct,
  questionId
}: UpdatePayload): Promise<StudentDocument> {
  const skills = loadSkills();
  const skillConfig = skills.find((s) => s.id === skillId);
  if (!skillConfig) {
    throw new Error(`Unknown skillId: ${skillId}`);
  }

  const student = await getOrCreateStudent(studentId);

  let mastery = student.skills.find((s) => s.skillId === skillId);
  if (!mastery) {
    mastery = {
      skillId,
      pKnow: skillConfig.bkt.pL0,
      lastUpdated: new Date(),
      attempts: 0
    };
    student.skills.push(mastery);
  }

  const newPKnow = updateBkt(mastery.pKnow, correct, skillConfig.bkt as BktParams);
  mastery.pKnow = newPKnow;
  mastery.attempts += 1;
  mastery.lastUpdated = new Date();

  student.totalQuestionsAsked += 1;

  student.history.push({
    questionId: questionId || `q-${Date.now()}`,
    skillId,
    correct,
    timestamp: new Date()
  });

  await student.save();
  return student;
}

/** Map skill topic names to subject names (for filtering by student's chosen subjects). */
const TOPIC_TO_SUBJECT: Record<string, string> = {
  'Cell Biology': 'Biology',
  'Organisation': 'Biology',
  'Infection and response': 'Biology',
  'Energy': 'Physics',
  'Electricity': 'Physics',
  'Particle model of matter': 'Physics'
};

/** Student profile shape passed from LMS backend (student_profiles collection). */
export interface StudentProfileContext {
  subjects?: string[];
  examBoard?: string;
  qualification?: string;
  aoDistributionTarget?: { AO1?: number; AO2?: number; AO3?: number };
  mastery?: Record<string, unknown>;
  targetExamDate?: string | null;
}

function filterSkillsBySubjects(
  skills: { id: string; topic: string }[],
  subjects: string[]
): typeof skills {
  if (!subjects?.length) return skills;
  const subjectSet = new Set(subjects.map((s) => s.toLowerCase().trim()));
  return skills.filter((skill) => {
    const subject = TOPIC_TO_SUBJECT[skill.topic];
    return subject && subjectSet.has(subject.toLowerCase());
  });
}

function pickAoFromDistribution(target: {
  AO1?: number;
  AO2?: number;
  AO3?: number;
}): 'AO1' | 'AO2' | 'AO3' {
  const a1 = Math.max(0, target.AO1 ?? 0);
  const a2 = Math.max(0, target.AO2 ?? 0);
  const a3 = Math.max(0, target.AO3 ?? 0);
  const sum = a1 + a2 + a3;
  if (sum <= 0) return 'AO2';
  let r = Math.random() * sum;
  if (r < a1) return 'AO1';
  r -= a1;
  if (r < a2) return 'AO2';
  return 'AO3';
}

export async function getNextQuestionDecision(
  studentId: string,
  studentProfile?: StudentProfileContext | null
): Promise<NextQuestionDecision> {
  const student = await getOrCreateStudent(studentId);
  let skills = loadSkills();

  // Filter skills by student's chosen subjects when profile is available
  const profileSubjects = studentProfile?.subjects;
  if (profileSubjects?.length) {
    const filtered = filterSkillsBySubjects(skills, profileSubjects);
    if (filtered.length > 0) skills = filtered;
  }

  // Ensure student has mastery entries for all known skills (lazy init).
  if (student.skills.length === 0) {
    const now = new Date();
    student.skills = skills.map<SkillMastery>((skill) => ({
      skillId: skill.id,
      pKnow: skill.bkt.pL0,
      lastUpdated: now,
      attempts: 0
    }));
  }

  // Build a lookup map for mastery.
  const masteryById = new Map<string, SkillMastery>();
  for (const m of student.skills) {
    masteryById.set(m.skillId, m);
  }

  const now = Date.now();

  let bestSkill: SkillMastery | null = null;
  let bestScore = -Infinity;

  for (const skill of skills) {
    const mastery = masteryById.get(skill.id) ?? {
      skillId: skill.id,
      pKnow: skill.bkt.pL0,
      lastUpdated: new Date(0),
      attempts: 0
    };

    const pKnow = mastery.pKnow;

    // Priority components:
    // (1 - P(Know)) → lower mastery => higher priority
    const masteryComponent = 1 - pKnow;

    // Recency: older lastUpdated => higher priority.
    const ageMs = now - mastery.lastUpdated.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.min(ageDays / 7, 1); // cap at +1 after ~1 week

    // Importance: exam-critical skills get higher weight.
    const importanceWeight = skill.importance - 1; // importance ~1–1.3 => 0–0.3

    const priority = masteryComponent + recencyWeight + importanceWeight;

    if (priority > bestScore) {
      bestScore = priority;
      bestSkill = mastery;
    }
  }

  if (!bestSkill) {
    throw new Error('No skills available for decision.');
  }

  const skillConfig = getSkillById(bestSkill.skillId);
  if (!skillConfig) {
    throw new Error(`Skill configuration not found for ${bestSkill.skillId}`);
  }

  const pKnow = bestSkill.pKnow;

  // Difficulty + AO mapping: use profile's aoDistributionTarget when available, else mastery-based
  let difficulty: number;
  let aoLevel: AoLevel;

  const aoTarget = studentProfile?.aoDistributionTarget;
  if (aoTarget && (aoTarget.AO1 || aoTarget.AO2 || aoTarget.AO3)) {
    aoLevel = pickAoFromDistribution(aoTarget);
    // Difficulty aligned with AO: AO1 easier, AO3 harder
    if (aoLevel === 'AO1') difficulty = 1 + Math.floor(Math.random() * 2);
    else if (aoLevel === 'AO2') difficulty = 2 + Math.floor(Math.random() * 2);
    else difficulty = 3 + Math.floor(Math.random() * 3);
  } else {
    // Fallback: mastery-based AO selection
    if (pKnow < 0.4) {
      difficulty = 1 + Math.floor(Math.random() * 2);
      aoLevel = 'AO1';
    } else if (pKnow < 0.7) {
      difficulty = 2 + Math.floor(Math.random() * 2);
      aoLevel = Math.random() < 0.5 ? 'AO1' : 'AO2';
    } else {
      difficulty = 3 + Math.floor(Math.random() * 3);
      aoLevel = Math.random() < 0.5 ? 'AO2' : 'AO3';
    }
  }

  // Inject challenge: every 5th question force AO3 where possible (unless profile overrides).
  const questionsSoFar = student.totalQuestionsAsked;
  const shouldForceAo3 = (questionsSoFar + 1) % 5 === 0;
  if (shouldForceAo3) {
    aoLevel = 'AO3';
    if (difficulty < 3) difficulty = 3;
  }

  // Rotate question types based on totalQuestionsAsked
  const types: QuestionType[] = ['retrieval', 'procedural', 'multi-step', 'exam-style'];
  const questionType = types[questionsSoFar % types.length];

  // Bump totalQuestionsAsked; actual answer logging will happen via /update
  student.totalQuestionsAsked += 1;
  await student.save();

  return {
    topic: skillConfig.topic,
    skill: skillConfig.name,
    skillId: skillConfig.id,
    aoLevel,
    difficulty,
    questionType
  };
}

