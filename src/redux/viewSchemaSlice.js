import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {flaskBackendAxiosInstance} from "../axios/axios";
import {QueryStatus} from "@reduxjs/toolkit/query";
import VisualizationSchema from "../schema/visualization_schema.json";

export const queryViewSchema = createAsyncThunk('/tripletsToViewSchema',
    async (payload) => {
        const source = payload.sourceTerm.split('@')[0];
        const target = payload.targetTerm.split('@')[0];
        const relationship = payload.relationship.split('@')[0];
        const term = `${source} - ${relationship} - ${target}`;
        const result = VisualizationSchema[term]?.[`${payload.sourceTerm === source ? 'general' : 'specific'} - relationship - ${payload.targetTerm === target ? 'general' : 'specific'}`];
        if (result) {
            console.log(`Found visualization schema for term: ${term}`);
            return result;
        }
        console.error(`No visualization schema found for term: ${term}`);
        return;
    }
);

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
