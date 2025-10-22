import {
  createAsyncThunk,
  createSlice,
} from '@reduxjs/toolkit';
import { QueryStatus } from '@reduxjs/toolkit/query';

import { flaskBackendAxiosInstanceNew } from '../axios/axios';

export const queryAiAgent = createAsyncThunk('/aiAgent',
    async (payload) => {
        return await flaskBackendAxiosInstanceNew
            .post('/pank3-ai-agent', payload, {
                headers: {
                    "Content-Type": "application/json",
                }
            })
            .then((response) => response.data)
            .catch((response) => {
                console.log(response);
            });
    });

export const aiAgentSlice = createSlice({
    name: 'aiAgent',
    initialState: {
        aiAgent: {},
        queryAiAgentStatus: QueryStatus.uninitialized, // This is auto updated
        queryAiAgentErrorMessage: ''
    },
    // reducers: {}
    extraReducers: (builder) => {
        builder
            .addCase(queryAiAgent.pending, (state) => {
                state.queryAiAgentStatus = QueryStatus.pending;
            })
            .addCase(queryAiAgent.fulfilled, (state, action) => {
                state.aiAgent = action.payload;
                state.queryAiAgentStatus = QueryStatus.fulfilled;
            })
            .addCase(queryAiAgent.rejected, (state, action) => {
                state.queryAiAgentErrorMessage = action.error.message;
                state.queryAiAgentStatus = QueryStatus.rejected;
            });
    }
});

// export const {} = aiAgentSlice.actions;

export default aiAgentSlice.reducer;
