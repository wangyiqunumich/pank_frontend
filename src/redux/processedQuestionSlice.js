import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentQuestion: '',
  nextQuestions: [],
  aiQuestions: []
};

export const processedQuestionSlice = createSlice({
  name: 'processedQuestion',
  initialState,
  reducers: {
    setProcessedQuestion: (state, action) => {
      state.currentQuestion = action.payload.currentQuestion;
      state.nextQuestions = action.payload.nextQuestions;
      state.aiQuestions = action.payload.aiQuestions || [];
    },
    clearProcessedQuestion: (state) => {
      state.currentQuestion = '';
      state.nextQuestions = [];
      state.aiQuestions = [];
    }
  }
});

export const { setProcessedQuestion, clearProcessedQuestion } = processedQuestionSlice.actions;

export default processedQuestionSlice.reducer;
