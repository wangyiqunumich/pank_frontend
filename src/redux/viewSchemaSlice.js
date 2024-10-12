import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {flaskBackendAxiosInstance} from "../axios/axios";
import {QueryStatus} from "@reduxjs/toolkit/query";

export const queryViewSchema = createAsyncThunk('/tripletsToViewSchema',
    async (payload) => {
    return await flaskBackendAxiosInstance
        .post('/tripletsToViewSchema', payload, {
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then((response) => response.data)
        .catch((response) => {
            console.log(response);
        });
});

export const viewSchemaSlice = createSlice({
    name: 'viewSchema',
    initialState: {
        viewSchema: {},
        queryViewSchemaStatus: QueryStatus.uninitialized, // This is auto updated
        queryViewSchemaErrorMessage: ''
    },
    // reducers: {}
    extraReducers: (builder) => {
        builder
            .addCase(queryViewSchema.pending, (state) => {
                state.queryViewSchemaStatus = QueryStatus.pending;
            })
            .addCase(queryViewSchema.fulfilled, (state, action) => {
                state.viewSchema = action.payload;
                state.queryViewSchemaStatus = QueryStatus.fulfilled;
            })
            .addCase(queryViewSchema.rejected, (state, action) => {
                state.queryViewSchemaErrorMessage = action.error.message;
                state.queryViewSchemaStatus = QueryStatus.rejected;
            });
    }
});

// export const {} = viewSchemaSlice.actions;

export default viewSchemaSlice.reducer;
