import {
  createAsyncThunk,
  createSlice,
} from '@reduxjs/toolkit';
import { QueryStatus } from '@reduxjs/toolkit/query';

import { flaskBackendAxiosInstanceNew } from '../axios/axios';

export const queryQueryResultPage = createAsyncThunk('/pank2ResultPage',
    async ({payload, agent = false}) => {
        return await flaskBackendAxiosInstanceNew
            .post(agent ? '/pankgraph-agent-result-page' : '/pank2ResultPage', payload, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then((response) => response.data)
            .then((data) => {
                const isCoreNode = (node) => data.core_nodes.includes(node['~id']);
                const ocrList =
                    data.combined_query_result.nodes?.filter(
                        (node) => node["~labels"].includes("OCR")
                    )?.sort((a, b) => isCoreNode(a) - isCoreNode(b));
                // number the OCR nodes
                const ocrLabelMap = new Map(ocrList?.map((node, index) => [node['~id'], `OCR Cluster ${index + 1}`])||[]);
                // update the labels of OCR nodes
                return {
                    ...data,
                    combined_query_result: {
                        ...data.combined_query_result,
                        nodes: data.combined_query_result.nodes.map((node) => {
                            if (node["~labels"].includes("OCR")) {
                                return {
                                    ...node,
                                    "~properties": {
                                        ...node["~properties"],
                                        "name": ocrLabelMap.get(node['~id'])
                                    },
                                };
                            }
                            return node;
                        })
                    }
                }
            })
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
