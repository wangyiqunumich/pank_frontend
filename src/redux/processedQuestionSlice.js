import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentQuestion: '',
  nextQuestions: [],
  aiQuestions: [],
  aiAnswerTitle: '',
  aiAnswerSubtitle: ''
};

export const processedQuestionSlice = createSlice({
  name: 'processedQuestion',
  initialState,
  reducers: {
    setProcessedQuestion: (state, action) => {
      state.currentQuestion = action.payload.currentQuestion;
      state.nextQuestions = action.payload.nextQuestions;
      state.aiQuestions = action.payload.aiQuestions || [];
      state.aiAnswerTitle = action.payload.aiAnswerTitle || '';
      state.aiAnswerSubtitle = action.payload.aiAnswerSubtitle || '';
    },
    clearProcessedQuestion: (state) => {
      state.currentQuestion = '';
      state.nextQuestions = [];
      state.aiQuestions = [];
      state.aiAnswerTitle = '';
      state.aiAnswerSubtitle = '';
    }
  }
});

export const { setProcessedQuestion, clearProcessedQuestion } = processedQuestionSlice.actions;

export default processedQuestionSlice.reducer;
