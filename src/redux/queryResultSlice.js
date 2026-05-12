import {
  createAsyncThunk,
  createSlice,
} from '@reduxjs/toolkit';
import { QueryStatus } from '@reduxjs/toolkit/query';

import { flaskBackendAxiosInstanceNew } from '../axios/axios';

const NEO4J_QUERY_ENDPOINT = 'http://dev-neo4j.pankgraph.org/db/neo4j/query/v2';
const NEO4J_BASIC_AUTH = 'Basic bmVvNGo6UGFuS19kZXZlbG9wbWVudF9wYXNzd29yZA==';

export const queryQueryResult = createAsyncThunk('/openCypherToQueryResult',
    async (payload) => {
        if (payload.isNeptune) {
            return await flaskBackendAxiosInstanceNew
                .post(NEO4J_QUERY_ENDPOINT, { statement: payload.query }, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": NEO4J_BASIC_AUTH,
                    }
                })
                .then((response) => {
                    const fields = response.data?.data?.fields;
                    const rows = response.data?.data?.values;
                    const mappedRows = Array.isArray(fields) && Array.isArray(rows)
                        ? rows
                            .map((row) => Object.fromEntries(fields.map((field, index) => [field, row[index]])))
                        : [];

                    console.log('Mapped Rows:', mappedRows);
                    if (mappedRows.length > 0) {
                        return { results: JSON.stringify(mappedRows) };
                    }

                    // Fallback to older response shapes for backward compatibility.
                    return {
                        results: JSON.stringify(
                            response.data?.values ?? response.data?.results ?? response.data
                        ),
                    };
                })
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
