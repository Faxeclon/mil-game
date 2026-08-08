import type { CardAnswer, TeacherCard, TeacherClassSet } from "./classCards";
import type { ClassQuestion } from "./classQuestions";

/**
 * A lesson: several questions asked to one class, with the cards answering each.
 *
 * The point of joining this to the game's own content is that the teacher stops being the
 * answer key. Kikiria already knows which image was made with AI, so a question corrects
 * itself the moment the answers close - which is the difference between a counter and a
 * lesson, and it removes the one step where a tired teacher could mark the wrong side.
 *
 * Following the rule the rest of the project runs on, only facts are kept: which card
 * showed which letter, and which letter was right. Every score, percentage and "this one
 * was hardest" is worked out from those, so no two numbers here can ever disagree.
 */

/** One question, closed. Nothing derived is stored here. */
export type LessonQuestion = {
  roundId: string;
  correct: CardAnswer;
  /** What each card was showing when the question closed. Absent means they did not answer. */
  answers: Readonly<Record<string, CardAnswer>>;
};

export type ClassLesson = {
  packId: string;
  questions: readonly LessonQuestion[];
};

export function createLesson(packId: string): ClassLesson {
  return { packId, questions: [] };
}

/**
 * Closes a question into the lesson.
 *
 * The correct side comes from the question, which read it from the authored pack. The
 * teacher is never asked for it, so a tired hand cannot mark the wrong side and cost the
 * whole class their score.
 */
export function recordQuestion(
  lesson: ClassLesson,
  question: ClassQuestion,
  answers: Readonly<Record<string, CardAnswer>>
): ClassLesson {
  return {
    ...lesson,
    questions: [
      ...lesson.questions,
      { roundId: question.id, correct: question.correct, answers: { ...answers } }
    ]
  };
}

export type StudentResult = { card: TeacherCard; right: number; answered: number; asked: number };

/** How one student did across every question asked so far. */
export function getStudentResult(lesson: ClassLesson, card: TeacherCard): StudentResult {
  let right = 0;
  let answered = 0;

  for (const question of lesson.questions) {
    const answer = question.answers[card.cardId];
    if (answer === undefined) continue;
    answered += 1;
    if (answer === question.correct) right += 1;
  }

  return { card, right, answered, asked: lesson.questions.length };
}

export function getStudentResults(lesson: ClassLesson, set: TeacherClassSet): StudentResult[] {
  return set.cards.map((card) => getStudentResult(lesson, card));
}

export type QuestionResult = {
  question: LessonQuestion;
  index: number;
  right: number;
  answered: number;
};

export function getQuestionResults(lesson: ClassLesson): QuestionResult[] {
  return lesson.questions.map((question, index) => {
    const given = Object.values(question.answers);
    return {
      question,
      index,
      right: given.filter((answer) => answer === question.correct).length,
      answered: given.length
    };
  });
}

/**
 * The question the class found hardest, which is the one worth talking about.
 *
 * Ranked by how many got it wrong rather than by percentage, so a question only two
 * children answered does not outrank one the whole class stumbled on. Ties keep the
 * earlier question, so the same lesson always reports the same one.
 */
export function getHardestQuestion(lesson: ClassLesson): QuestionResult | null {
  const results = getQuestionResults(lesson);
  if (results.length === 0) return null;

  return results.reduce((hardest, current) =>
    current.answered - current.right > hardest.answered - hardest.right ? current : hardest
  );
}

export type LessonSummary = {
  questionsAsked: number;
  /** Correct answers across the whole class, and how many answers were given at all. */
  right: number;
  answered: number;
  /** Students who did not answer every question, so nobody is quietly left behind. */
  incomplete: number;
};

export function getLessonSummary(lesson: ClassLesson, set: TeacherClassSet): LessonSummary {
  const results = getStudentResults(lesson, set);

  return {
    questionsAsked: lesson.questions.length,
    right: results.reduce((total, result) => total + result.right, 0),
    answered: results.reduce((total, result) => total + result.answered, 0),
    incomplete: results.filter((result) => result.answered < lesson.questions.length).length
  };
}
