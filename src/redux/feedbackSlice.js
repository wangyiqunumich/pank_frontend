import {
    createAsyncThunk,
    createSlice,
} from '@reduxjs/toolkit';
import { QueryStatus } from '@reduxjs/toolkit/query';

import { flaskBackendAxiosInstanceNew } from '../axios/axios';

export const submitFeedback = createAsyncThunk("/pank2ReviewPage",
    async (payload) => {
        return await flaskBackendAxiosInstanceNew
            .post("/pank2ReviewPage", {
                type: "insert",
                information: payload
            }, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then((response) => response.data)
            .catch((response) => {
                console.log(response);
            });
        // return { status: 'success' };
    });

export const feedbackSlice = createSlice({
    name: "feedback",
    initialState: {
        feedback: {},
        submitFeedbackStatus: QueryStatus.uninitialized, // This is auto updated
        submitFeedbackErrorMessage: ''
    },
    extraReducers: (builder) => {
        builder
            .addCase(submitFeedback.pending, (state) => {
                state.submitFeedbackStatus = QueryStatus.pending;
            })
            .addCase(submitFeedback.fulfilled, (state, action) => {
                state.feedback = action.payload;
                state.submitFeedbackStatus = QueryStatus.fulfilled;
            })
            .addCase(submitFeedback.rejected, (state, action) => {
                state.submitFeedbackErrorMessage = action.error.message;
                state.submitFeedbackStatus = QueryStatus.rejected;
            });
    }
})

export default feedbackSlice.reducer;
