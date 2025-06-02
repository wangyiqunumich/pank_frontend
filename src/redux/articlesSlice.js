import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { flaskBackendAxiosInstance, glkbAxiosInstance } from "../axios/axios";
import { QueryStatus } from "@reduxjs/toolkit/query";
import axios from "axios";

export const queryArticles = createAsyncThunk('/queryArticles',
    async (payload) => {
        return await axios
            .post('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi', payload, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                }
            })
            .then((response) => response.data)
            .catch((response) => {
                console.log(response);
            });
    });

export const ArticlesSlice = createSlice({
    name: 'articles',
    initialState: {
        Articles: {},
        queryArticlesStatus: QueryStatus.uninitialized, // This is auto updated
        queryArticlesErrorMessage: ''
    },
    // reducers: {}
    extraReducers: (builder) => {
        builder
            .addCase(queryArticles.pending, (state) => {
                state.queryArticlesStatus = QueryStatus.pending;
            })
            .addCase(queryArticles.fulfilled, (state, action) => {
                state.Articles = action.payload;
                state.queryArticlesStatus = QueryStatus.fulfilled;
            })
            .addCase(queryArticles.rejected, (state, action) => {
                state.queryArticlesErrorMessage = action.error.message;
                state.queryArticlesStatus = QueryStatus.rejected;
            });
    }
});

// export const {} = ArticlesSlice.actions;

export default ArticlesSlice.reducer;
