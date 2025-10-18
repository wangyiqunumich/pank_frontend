import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { flaskBackendAxiosInstanceNew } from "../axios/axios";
import { QueryStatus } from "@reduxjs/toolkit/query";


export const queryGraphviewer = createAsyncThunk("/Graphviewer",
    async (payload) => {
        return await flaskBackendAxiosInstanceNew
            .post("graph-viewer", payload, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then((response) => response.data)
            .catch((response) => {
                console.log(response);
            });
    });

export const graphviewerSlice = createSlice({
    name: "Graphviewer",
    initialState: {
        graphviewer: {},
        queryGraphviewerStatus: QueryStatus.uninitialized, // This is auto updated
        queryGraphviewerErrorMessage: ''
    },
    extraReducers: (builder) => {
        builder
            .addCase(queryGraphviewer.pending, (state) => {
                state.queryGraphviewerStatus = QueryStatus.pending;
            })
            .addCase(queryGraphviewer.fulfilled, (state, action) => {
                state.graphviewer = action.payload;
                state.queryGraphviewerStatus = QueryStatus.fulfilled;
            })
            .addCase(queryGraphviewer.rejected, (state, action) => {
                state.queryGraphviewerErrorMessage = action.error.message;
                state.queryGraphviewerStatus = QueryStatus.rejected;
            });
    }
})

export default graphviewerSlice.reducer;
