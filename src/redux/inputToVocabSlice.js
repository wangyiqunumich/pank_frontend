import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {flaskBackendAxiosInstance} from "../axios/axios";
import {QueryStatus} from "@reduxjs/toolkit/query";


export const queryVocab = createAsyncThunk("/inputToVocab",
    async (payload) => {
        return await flaskBackendAxiosInstance
            .post("inputToVocab", payload, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then((response) => response.data)
            .catch((response) => {
                console.log(response);
            });
    });

export const vocabSlice = createSlice({
    name: "inputToVocab",
    initialState: {
        vocab: {},
        queryVocabStatus: QueryStatus.uninitialized, // This is auto updated
        queryVocabErrorMessage: ''
    },
    extraReducers: (builder) => {
        builder
            .addCase(queryVocab.pending, (state) => {
                state.queryVocabStatus = QueryStatus.pending;
            })
            .addCase(queryVocab.fulfilled, (state, action) => {
                state.vocab = action.payload;
                state.queryVocabStatus = QueryStatus.fulfilled;
            })
            .addCase(queryVocab.rejected, (state, action) => {
                state.queryVocabErrorMessage = action.error.message;
                state.queryVocabStatus = QueryStatus.rejected;
            });
    }
})

export default vocabSlice.reducer;
