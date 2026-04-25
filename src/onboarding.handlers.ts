import type { AnswerField, Answers, QuizKey } from './onboarding.state';

export function buildStats(answers: Answers) {
  const age = Math.max(parseInt(answers.exactAge || '0', 10) || 22, 13);
  const yearsInLoop = Math.max(age - getExposureAge(answers.firstExposure), 1);
  const totalHours = yearsInLoop * 52 * getWeeklyGooning(answers.goonFrequency) * getSessionHours(answers.sessionLength);
  const timeLostDays = Math.floor(totalHours / 24);
  const timeLostHours = Math.round(totalHours % 24);
  const testosteroneDrop = Math.min(47, Math.max(11, Math.round(9 + yearsInLoop * 0.7 + getWeeklyGooning(answers.goonFrequency) * 2.2)));
  const calories = Math.round(totalHours * 112);

  return {
    name: answers.firstName || 'Freeman',
    timeLostDays,
    timeLostHours,
    testosteroneDrop,
    calories,
  };
}

export function roundNumber(value: number) {
  return Math.round(value).toLocaleString();
}

export function applyQuizAnswer(current: Answers, key: QuizKey, option: string): Answers {
  return { ...current, [key]: option };
}

export function applyFieldValue(current: Answers, field: AnswerField, value: string): Answers {
  if (field === 'exactAge') {
    return {
      ...current,
      exactAge: value.replace(/[^0-9]/g, ''),
    };
  }

  return {
    ...current,
    [field]: value,
  };
}

export function toggleSymptomValue(current: Answers, symptom: string): Answers {
  const nextSymptoms = current.symptoms.includes(symptom)
    ? current.symptoms.filter((item) => item !== symptom)
    : [...current.symptoms, symptom];

  return {
    ...current,
    symptoms: nextSymptoms,
  };
}

export function canContinuePersonalInfo(answers: Answers) {
  return Boolean(answers.firstName.trim() && answers.exactAge.trim());
}

function getExposureAge(value: string) {
  const map: Record<string, number> = {
    'Before 10': 9,
    '10-12': 11,
    '13-15': 14,
    '16-18': 17,
    '19+': 19,
  };
  return map[value] || 14;
}

function getWeeklyGooning(value: string) {
  const map: Record<string, number> = {
    '1-2 times a month': 0.4,
    'A few times a week': 3,
    Daily: 7,
    'Multiple times a day': 14,
  };
  return map[value] || 3;
}

function getSessionHours(value: string) {
  const map: Record<string, number> = {
    'Under 15 min': 0.2,
    '15-30 min': 0.38,
    '30-60 min': 0.75,
    '1-2 hours': 1.5,
    '2+ hours': 2.5,
  };
  return map[value] || 0.75;
}
