import { createSlice } from '@reduxjs/toolkit';

export const processedQuestionSlice = createSlice({
  name: 'processedQuestion',
  initialState: {
    question: '',
    nextQuestions: [],
  },
  reducers: {
    setProcessedQuestion: (state, action) => {
      state.question = action.payload;
    },
    setProcessedNextQuestions: (state, action) => {
      state.nextQuestions = action.payload;
    },
  },
});

export const { setProcessedQuestion, setProcessedNextQuestions } = processedQuestionSlice.actions;

export default processedQuestionSlice.reducer;
