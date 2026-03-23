import express from 'express';
import { postNextQuestion, postUpdate } from '../controllers/decisionController';

export const router = express.Router();

router.post('/next-question', postNextQuestion);
router.post('/update', postUpdate);

