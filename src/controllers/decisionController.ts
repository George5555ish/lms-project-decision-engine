import { Request, Response } from 'express';
import { getNextQuestionDecision, updateStudentKnowledge } from '../services/decisionService';

export async function postNextQuestion(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, studentProfile } = req.body;
    // eslint-disable-next-line no-console
    console.log('[decision-engine] /next-question studentId:', studentId ? String(studentId) : null);
    if (!studentId || typeof studentId !== 'string') {
      res.status(400).json({ error: 'studentId is required' });
      return;
    }

    const decision = await getNextQuestionDecision(studentId, studentProfile);
    res.json(decision);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[decision-engine] /next-question error', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
}

export async function postUpdate(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, skillId, correct, questionId } = req.body;
    // eslint-disable-next-line no-console
    console.log(
      '[decision-engine] /update studentId/skillId:',
      studentId ? String(studentId) : null,
      skillId ? String(skillId) : null
    );

    if (!studentId || typeof studentId !== 'string') {
      res.status(400).json({ error: 'studentId is required' });
      return;
    }
    if (!skillId || typeof skillId !== 'string') {
      res.status(400).json({ error: 'skillId is required' });
      return;
    }
    if (typeof correct !== 'boolean') {
      res.status(400).json({ error: 'correct must be a boolean' });
      return;
    }

    const updated = await updateStudentKnowledge({
      studentId,
      skillId,
      correct,
      questionId
    });

    const mastery = updated.skills.find((s) => s.skillId === skillId);

    res.json({
      studentId: updated.studentId,
      skillId,
      pKnow: mastery?.pKnow ?? null,
      attempts: mastery?.attempts ?? 0,
      lastUpdated: mastery?.lastUpdated ?? null
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[decision-engine] /update error', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
}

