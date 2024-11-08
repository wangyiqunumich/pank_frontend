import { createSlice } from '@reduxjs/toolkit';

const searchSlice = createSlice({
  name: 'search',
  initialState: {
    sourceTerm: '',
    relationship: '',
    targetTerm: ''
  },
  reducers: {
    setSearchTerms: (state, action) => {
      state.sourceTerm = action.payload.sourceTerm;
      state.relationship = action.payload.relationship;
      state.targetTerm = action.payload.targetTerm;
    }
  }
});

export const { setSearchTerms } = searchSlice.actions;
export default searchSlice.reducer;
