import { createSlice } from '@reduxjs/toolkit';

const searchSlice = createSlice({
  name: 'search',
  initialState: {
    sourceTerm: '',
    relationship: '',
    targetTerm: '',
    nextQuestionClicked: false,
    usingFallback: false,
    fallbackSourceTerm: 'sequence_variant:rs17510162',
    fallbackRelationship: 'fine_mapped_eQTL',
    fallbackTargetTerm: 'gene:ENSG00000134242',
    targetTermSymbol: ''
  },
  reducers: {
    setSearchTerms: (state, action) => {
      if (!state.usingFallback) {
        state.sourceTerm = action.payload.sourceTerm;
        state.relationship = action.payload.relationship;
        state.targetTerm = action.payload.targetTerm;
        state.targetTermSymbol = action.payload.targetTermSymbol;
      }
    },
    setNextQuestionClicked: (state, action) => {
      state.nextQuestionClicked = action.payload;
    },
    setUsingFallback: (state, action) => {
      state.usingFallback = action.payload;
    },
    setTargetTermSymbol: (state, action) => {
      state.targetTermSymbol = action.payload;
    } 
  }
});

export const { setSearchTerms, setNextQuestionClicked, setUsingFallback, setTargetTermSymbol } = searchSlice.actions;
export default searchSlice.reducer;

export const setSearchState = (searchState) => ({
  type: 'search/setSearchState',
  payload: searchState
});
