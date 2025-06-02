import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { flaskBackendAxiosInstance, flaskBackendAxiosInstanceNew } from "../axios/axios";
import { QueryStatus } from "@reduxjs/toolkit/query";
import { viewSchemaSlice } from "./viewSchemaSlice";
import axios from "axios";

export const queryQueryResult = createAsyncThunk('/openCypherToQueryResult',
    async (payload) => {
        return await flaskBackendAxiosInstanceNew
            .post(payload.isNeptune ? '/openCypherToQueryResult' : '/openCypherToQueryResultNew',
                { query: payload.query }, {
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
