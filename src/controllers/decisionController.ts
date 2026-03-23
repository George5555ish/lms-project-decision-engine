import { Request, Response } from 'express';
import { getNextQuestionDecision, updateStudentKnowledge } from '../services/decisionService';

export async function postNextQuestion(req: Request, res: Response): Promise<void> {
  try {
    const { studentId, studentProfile, subjects } = req.body;
    // eslint-disable-next-line no-console
    console.log('[decision-engine] /next-question studentId:', studentId ? String(studentId) : null, 'subjects:', subjects);
    if (!studentId || typeof studentId !== 'string') {
      res.status(400).json({ error: 'studentId is required' });
      return;
    }
    // Use top-level subjects (e.g. from mock test) when provided; otherwise use profile
    const profileToUse = subjects?.length
      ? { ...studentProfile, subjects: Array.isArray(subjects) ? subjects : [subjects] }
      : studentProfile;

    const decision = await getNextQuestionDecision(studentId, profileToUse);
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

