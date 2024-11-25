import { createSlice } from '@reduxjs/toolkit';

const variablesSlice = createSlice({
  name: 'variables',
  initialState: {
    leadSnp: '',
    geneId: '',
    tissue: '',
    dataSource: ''
  },
  reducers: {
    setVariables: (state, action) => {
      state.leadSnp = action.payload.leadSnp;
      state.geneId = action.payload.geneId;
      state.tissue = action.payload.tissue;
      state.dataSource = action.payload.dataSource;
    }
  }
});

export const { setVariables } = variablesSlice.actions;
export default variablesSlice.reducer; 