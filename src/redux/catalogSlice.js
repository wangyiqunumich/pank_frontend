import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {flaskBackendAxiosInstance} from "../axios/axios";
import {QueryStatus} from "@reduxjs/toolkit/query";

export const queryCatalog = createAsyncThunk('/imageToCatalog',
    async (payload) => {
        return await flaskBackendAxiosInstance
            .post('/imageToCatalog', payload, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then((response) => response.data)
            .catch((response) => {
                console.log(response);
            });
    });

export const catalogSlice = createSlice({
    name: 'catalog',
    initialState: {
        catalog: {},
        queryCatalogStatus: QueryStatus.uninitialized, // This is auto updated
        queryCatalogErrorMessage: ''
    },
    // reducers: {}
    extraReducers: (builder) => {
        builder
            .addCase(queryCatalog.pending, (state) => {
                state.queryCatalogStatus = QueryStatus.pending;
            })
            .addCase(queryCatalog.fulfilled, (state, action) => {
                state.catalog = action.payload;
                state.queryCatalogStatus = QueryStatus.fulfilled;
            })
            .addCase(queryCatalog.rejected, (state, action) => {
                state.queryCatalogErrorMessage = action.error.message;
                state.queryCatalogStatus = QueryStatus.rejected;
            });
    }
});

export default catalogSlice.reducer;
