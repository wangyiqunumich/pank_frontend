import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { QueryStatus } from "@reduxjs/toolkit/query";
import { flaskBackendAxiosInstanceNew } from "../axios/axios";
import { viewSchemaSlice } from "./viewSchemaSlice";

export const queryQueryResultPage = createAsyncThunk('/pank2ResultPage',
    async (payload) => {
        return await flaskBackendAxiosInstanceNew
            .post('/pank2ResultPage', payload, {
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

export const queryResultPageSlice = createSlice({
    name: 'pank2ResultPage',
    initialState: {
        queryVisResult: {},
        queryQueryResultPageStatus: QueryStatus.uninitialized, // This is auto updated
        queryQueryResultPageErrorMessage: ''
    },
    extraReducers: (builder) => {
        builder
            .addCase(queryQueryResultPage.pending, (state) => {
                state.queryQueryResultPageStatus = QueryStatus.pending;
            })
            .addCase(queryQueryResultPage.fulfilled, (state, action) => {
                state.queryResultPage = action.payload;
                state.queryQueryResultPageStatus = QueryStatus.fulfilled;
            })
            .addCase(queryQueryResultPage.rejected, (state, action) => {
                state.queryQueryResultPageErrorMessage = action.error.message;
                state.queryQueryResultPageStatus = QueryStatus.rejected;
            });
    }
})

export default queryResultPageSlice.reducer;
