import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {flaskBackendAxiosInstance} from "../axios/axios";
import {QueryStatus} from "@reduxjs/toolkit/query";
import axios from "axios";

export const queryAiAnswer = createAsyncThunk('/queryResultToAiAnswer',
    async (payload) => {
        return await axios
            .post('https://glkb.dcmb.med.umich.edu/api/search/PKG_LLM_QA', payload, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then((response) => response.data)
            .catch((response) => {
                console.log(response);
            });
    });

export const aiAnswerSlice = createSlice({
    name: 'aiAnswer',
    initialState: {
        aiAnswer: {},
        queryAiAnswerStatus: QueryStatus.uninitialized, // This is auto updated
        queryAiAnswerErrorMessage: ''
    },
    // reducers: {}
    extraReducers: (builder) => {
        builder
            .addCase(queryAiAnswer.pending, (state) => {
                state.queryAiAnswerStatus = QueryStatus.pending;
            })
            .addCase(queryAiAnswer.fulfilled, (state, action) => {
                state.aiAnswer = action.payload;
                state.queryAiAnswerStatus = QueryStatus.fulfilled;
            })
            .addCase(queryAiAnswer.rejected, (state, action) => {
                state.queryAiAnswerErrorMessage = action.error.message;
                state.queryAiAnswerStatus = QueryStatus.rejected;
            });
    }
});

// export const {} = aiAnswerSlice.actions;

export default aiAnswerSlice.reducer;
