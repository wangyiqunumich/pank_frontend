import {
  createAsyncThunk,
  createSlice,
} from '@reduxjs/toolkit';
import { QueryStatus } from '@reduxjs/toolkit/query';

import { searchEntities } from '../vnext/api';

export const queryQueryResult = createAsyncThunk('/localSearch',
    async (payload, { signal }) => {
        const { rawResponse, isNeptune, ...parameters } = payload;
        if (!parameters.kind || parameters.query) throw new Error('A typed search is required.');
        const data = await searchEntities(parameters, { signal });
        const items = Array.isArray(data.items) ? data.items : [];
        return rawResponse
            ? { results: items.map(item => ({ ...item, snp: item.snp || item.id })) }
            : { ...data, results: [{ credible_sets: items.map(item => ({ ...item, credible_set_id: item.credible_set_id || item.credible_set })) }] };
    }
);

export const queryResultSlice = createSlice({
    name: 'queryResult',
    initialState: {
        queryResult: { 123: 123 },
        queryQueryResultStatus: QueryStatus.uninitialized, // This is auto updated
        queryQueryResultErrorMessage: ''
    },
    extraReducers: (builder) => {
        builder
            .addCase(queryQueryResult.pending, (state) => {
                state.queryQueryResultStatus = QueryStatus.pending;
            })
            .addCase(queryQueryResult.fulfilled, (state, action) => {
                state.queryResult = action.payload;
                state.queryQueryResultStatus = QueryStatus.fulfilled;
            })
            .addCase(queryQueryResult.rejected, (state, action) => {
                state.queryQueryResultErrorMessage = action.error.message;
                state.queryQueryResultStatus = QueryStatus.rejected;
            });
    }
})

export default queryResultSlice.reducer;
