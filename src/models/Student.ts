import mongoose, { Schema, Document } from 'mongoose';

export interface SkillMastery {
  skillId: string;
  pKnow: number; // P(Know)
  lastUpdated: Date;
  attempts: number;
}

export interface QuestionHistoryEntry {
  questionId: string;
  skillId: string;
  correct: boolean;
  timestamp: Date;
}

export interface StudentDocument extends Document {
  studentId: string;
  skills: SkillMastery[];
  history: QuestionHistoryEntry[];
  totalQuestionsAsked: number;
}

const SkillMasterySchema = new Schema<SkillMastery>(
  {
    skillId: { type: String, required: true },
    pKnow: { type: Number, required: true, default: 0 },
    lastUpdated: { type: Date, required: true, default: Date.now },
    attempts: { type: Number, required: true, default: 0 }
  },
  { _id: false }
);

const QuestionHistorySchema = new Schema<QuestionHistoryEntry>(
  {
    questionId: { type: String, required: true },
    skillId: { type: String, required: true },
    correct: { type: Boolean, required: true },
    timestamp: { type: Date, required: true, default: Date.now }
  },
  { _id: false }
);

const StudentSchema = new Schema<StudentDocument>(
  {
    studentId: { type: String, required: true, unique: true, index: true },
    skills: { type: [SkillMasterySchema], default: [] },
    history: { type: [QuestionHistorySchema], default: [] },
    totalQuestionsAsked: { type: Number, required: true, default: 0 }
  },
  {
    timestamps: true,
    collection: 'students'
  }
);

export const Student = mongoose.model<StudentDocument>('Student', StudentSchema);

