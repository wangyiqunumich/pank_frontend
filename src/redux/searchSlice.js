import { createSlice } from '@reduxjs/toolkit';

const searchSlice = createSlice({
  name: 'search',
  initialState: {
    sourceTerm: '',
    relationship: '',
    targetTerm: '',
    nextQuestionClicked: false
  },
  reducers: {
    setSearchTerms: (state, action) => {
      state.sourceTerm = action.payload.sourceTerm;
      state.relationship = action.payload.relationship;
      state.targetTerm = action.payload.targetTerm;
    },
    setNextQuestionClicked: (state, action) => {
      state.nextQuestionClicked = action.payload;
    }
  }
});

export const { setSearchTerms, setNextQuestionClicked } = searchSlice.actions;
export default searchSlice.reducer;

export const setSearchState = (searchState) => ({
  type: 'search/setSearchState',
  payload: searchState
});
