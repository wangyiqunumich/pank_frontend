import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {flaskBackendAxiosInstance} from "../axios/axios";
import {QueryStatus} from "@reduxjs/toolkit/query";
import {viewSchemaSlice} from "./viewSchemaSlice";

export const queryQueryVisResult = createAsyncThunk('/queryResultToVisualization',
    async (payload) => {
        return await flaskBackendAxiosInstance
            .post('/queryResultToVisualization', payload, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then((response) => response.data)
            .catch((response) => {
                console.log(response);
            });
    }
);

export const queryVisResultSlice = createSlice({
    name: 'queryResultToVisualization',
    initialState: {
        queryVisResult: {},
        queryQueryVisResultStatus: QueryStatus.uninitialized, // This is auto updated
        queryQueryVisResultErrorMessage: ''
    },
    extraReducers: (builder) => {
        builder
            .addCase(queryQueryVisResult.pending, (state) => {
                state.queryQueryVisResultStatus = QueryStatus.pending;
            })
            .addCase(queryQueryVisResult.fulfilled, (state, action) => {
                state.queryVisResult = action.payload;
                state.queryQueryVisResultStatus = QueryStatus.fulfilled;
            })
            .addCase(queryQueryVisResult.rejected, (state, action) => {
                state.queryQueryVisResultErrorMessage = action.error.message;
                state.queryQueryVisResultStatus = QueryStatus.rejected;
            });
    }
})

export default queryVisResultSlice.reducer;
