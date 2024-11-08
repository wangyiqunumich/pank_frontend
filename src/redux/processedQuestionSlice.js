import { createSlice } from '@reduxjs/toolkit';

const processedQuestionSlice = createSlice({
  name: 'processedQuestion',
  initialState: {
    currentQuestion: '',
    nextQuestions: []
  },
  reducers: {
    setProcessedQuestion: (state, action) => {
      state.currentQuestion = action.payload.currentQuestion;
      state.nextQuestions = action.payload.nextQuestions;
    },
  },
});

export const { setProcessedQuestion } = processedQuestionSlice.actions;
export default processedQuestionSlice.reducer;
