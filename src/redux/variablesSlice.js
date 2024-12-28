import { createSlice } from '@reduxjs/toolkit';

const variablesSlice = createSlice({
  name: 'variables',
  initialState: {
    leadSnp: '',
    geneId: '',
    tissueKey: '',
    dataSource: '',
    snpId: '',
    geneSymbol: ''
  },
  reducers: {
    setVariables: (state, action) => {
      state.leadSnp = action.payload.leadSnp;
      state.geneId = action.payload.geneId;
      state.tissueKey = action.payload.tissueKey;
      state.dataSource = action.payload.dataSource;
      state.snpId = action.payload.snpId;
      state.geneSymbol = action.payload.geneSymbol;
    }
  }
});

export const { setVariables } = variablesSlice.actions;
export default variablesSlice.reducer; 