import { describe, expect, it } from "vitest";
import { createClassSet, type CardAnswer, type TeacherClassSet } from "./classCards";
import type { ClassQuestion } from "./classQuestions";
import {
  createLesson,
  getHardestQuestion,
  getLessonSummary,
  getQuestionResults,
  getStudentResult,
  getStudentResults,
  recordQuestion,
  type ClassLesson
} from "./classLesson";

function makeSet(students = 3): TeacherClassSet {
  let seed = 0;
  return createClassSet(students, "2026-08-07", "5to B", () => {
    seed += 0.137;
    return seed % 1;
  });
}

/** A question as `classQuestions` would hand one over. */
function question(id: string, correct: CardAnswer): ClassQuestion {
  return {
    id,
    kind: "compare",
    media: [],
    labelKeys: ["answerA", "answerB"],
    correct
  };
}

const makeRound = (id: string, aiPosition: "left" | "right") =>
  question(id, aiPosition === "left" ? "A" : "B");

describe("closing a question into the lesson", () => {
  it("takes the correct side from the question, never from the teacher", () => {
    const lesson = recordQuestion(createLesson("p"), question("q1", "B"), {});

    expect(lesson.questions).toEqual([{ roundId: "q1", correct: "B", answers: {} }]);
  });

  it("copies the answers, so a later scan cannot rewrite a closed question", () => {
    const answers: Record<string, CardAnswer> = { "card-1": "A" };
    const lesson = recordQuestion(createLesson("p"), question("q1", "A"), answers);

    answers["card-1"] = "B";

    expect(lesson.questions[0].answers).toEqual({ "card-1": "A" });
  });
});

describe("scoring a student across the lesson", () => {
  const set = makeSet();
  const [first, second, third] = set.cards;

  function lessonOfTwo(): ClassLesson {
    let lesson = createLesson("animals-compare-v1");
    // Question 1: A is right. First gets it, second does not, third never answered.
    lesson = recordQuestion(lesson, makeRound("q1", "left"), {
      [first.cardId]: "A",
      [second.cardId]: "B"
    });
    // Question 2: B is right. Both answered, both right.
    lesson = recordQuestion(lesson, makeRound("q2", "right"), {
      [first.cardId]: "B",
      [second.cardId]: "B"
    });
    return lesson;
  }

  it("counts only the questions a student actually answered", () => {
    const lesson = lessonOfTwo();

    expect(getStudentResult(lesson, first)).toMatchObject({ right: 2, answered: 2, asked: 2 });
    expect(getStudentResult(lesson, second)).toMatchObject({ right: 1, answered: 2, asked: 2 });
    expect(getStudentResult(lesson, third)).toMatchObject({ right: 0, answered: 0, asked: 2 });
  });

  it("keeps a silent student visible instead of scoring them as wrong", () => {
    const result = getStudentResult(lessonOfTwo(), third);

    // Nought out of nought answered is not the same as nought out of two attempted.
    expect(result.answered).toBe(0);
    expect(result.asked).toBe(2);
  });

  it("reports one result per printed card, in the order they were handed out", () => {
    const results = getStudentResults(lessonOfTwo(), set);

    expect(results.map((result) => result.card.number)).toEqual([1, 2, 3]);
  });
});

describe("what the teacher reads afterwards", () => {
  const set = makeSet(4);

  it("counts each question by how many got it right", () => {
    let lesson = createLesson("p");
    lesson = recordQuestion(lesson, makeRound("q1", "left"), {
      [set.cards[0].cardId]: "A",
      [set.cards[1].cardId]: "A"
    });

    expect(getQuestionResults(lesson)[0]).toMatchObject({ index: 0, right: 2, answered: 2 });
  });

  /*
   * Ranked by how many got it wrong, not by percentage: a question only two children
   * answered should not outrank one the whole class stumbled on.
   */
  it("names the question the most children got wrong", () => {
    let lesson = createLesson("p");
    lesson = recordQuestion(lesson, makeRound("easy", "left"), {
      [set.cards[0].cardId]: "A",
      [set.cards[1].cardId]: "A",
      [set.cards[2].cardId]: "B"
    });
    lesson = recordQuestion(lesson, makeRound("hard", "right"), {
      [set.cards[0].cardId]: "A",
      [set.cards[1].cardId]: "A",
      [set.cards[2].cardId]: "A"
    });

    expect(getHardestQuestion(lesson)?.question.roundId).toBe("hard");
  });

  it("has no hardest question before anything was asked", () => {
    expect(getHardestQuestion(createLesson("p"))).toBeNull();
  });

  it("counts the students who did not answer everything, so nobody is left behind quietly", () => {
    let lesson = createLesson("p");
    lesson = recordQuestion(lesson, makeRound("q1", "left"), {
      [set.cards[0].cardId]: "A",
      [set.cards[1].cardId]: "A"
    });
    lesson = recordQuestion(lesson, makeRound("q2", "left"), { [set.cards[0].cardId]: "A" });

    expect(getLessonSummary(lesson, set)).toEqual({
      questionsAsked: 2,
      right: 3,
      answered: 3,
      incomplete: 3
    });
  });

  it("summarises an untouched lesson without inventing numbers", () => {
    expect(getLessonSummary(createLesson("p"), set)).toEqual({
      questionsAsked: 0,
      right: 0,
      answered: 0,
      incomplete: 0
    });
  });
});
