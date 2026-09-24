import {
  createAsyncThunk,
  createSlice,
} from '@reduxjs/toolkit';
import { QueryStatus } from '@reduxjs/toolkit/query';

import { flaskBackendAxiosInstanceNew } from '../axios/axios';
import { searchEntities } from '../vnext/api';
import { getDevConfig } from '../vnext/runtimeConfig';

export const queryQueryResult = createAsyncThunk('/openCypherToQueryResult',
    async (payload, { signal }) => {
        // Explicit typed tool searches use vNext only on enabled dev hosts.
        // Existing SQL/Cypher callers retain their original backend.
        if (payload.kind && getDevConfig().vnextEnabled) {
            const { rawResponse, isNeptune, ...parameters } = payload;
            if (parameters.query) throw new Error('A typed search cannot include a raw query.');
            const data = await searchEntities(parameters, { signal }).catch(error => {
                // Redux keeps standard Error.code but drops custom HTTP status.
                if (Number.isInteger(error?.status)) error.code = String(error.status);
                throw error;
            });
            if (!Array.isArray(data.items)) throw new Error('The search service returned an invalid response.');
            return rawResponse
                ? { ...data, results: data.items.map(item => ({ ...item, snp: item.snp || item.id })) }
                : { ...data, results: [{ credible_sets: data.items.map(item => ({ ...item, credible_set_id: item.credible_set_id || item.credible_set })) }] };
        }
        if (payload.kind) throw new Error('The new search service is disabled.');
        if (payload.isNeptune) {
            return await flaskBackendAxiosInstanceNew
                .post('/pank2-neo4j-api-development', { action: "query", query: payload.query }, {
                    headers: {
                        "Content-Type": "application/json"
                    }
                })
                .then((response) => ({ results: JSON.stringify(response.data?.records) }))
                .catch((response) => {
                    console.log(response);
                });
        }
        return await flaskBackendAxiosInstanceNew
            .post('/RDSLambda', { query: payload.query }, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then((response) =>
                payload.rawResponse
                    ? response.data
                    : {
                        results: [{
                            credible_sets: response.data.results.map((result) => ({
                                ...result,
                                credible_set_id: result.credible_set
                            }))
                        }]
                    }
            )
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
