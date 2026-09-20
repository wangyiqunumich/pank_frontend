// Match the agent's Unicode character limit without truncating the user's text.
export const MAX_QUESTION_CHARACTERS = 6000;
export const questionLength = value => Array.from(String(value || '')).length;
export const questionInputError = value => questionLength(value) > MAX_QUESTION_CHARACTERS
  ? 'Please shorten your question to 6,000 characters or fewer. Your text has not been changed.' : '';
export const questionInputHint = value => questionInputError(value) || `${questionLength(value).toLocaleString('en-US')} / 6,000 characters`;
