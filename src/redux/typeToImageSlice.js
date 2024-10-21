import {createAsyncThunk, createSlice} from "@reduxjs/toolkit";
import {flaskBackendAxiosInstance} from "../axios/axios";
import {QueryStatus} from "@reduxjs/toolkit/query";

export const queryImage = createAsyncThunk('/typeToImage',
    async (payload) => {
        return await flaskBackendAxiosInstance
            .post('/typeToImage', payload, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then((response) => response.data)
            .catch((response) => {
                console.log(response);
            });
    });

export const typeToImageSlice = createSlice({
    name: 'typeToImage',
    initialState: {
        typeToImage: {},
        queryTypeToImageStatus: QueryStatus.uninitialized, // This is auto updated
        queryTypeToImageErrorMessage: ''
    },
    // reducers: {}
    extraReducers: (builder) => {
        builder
            .addCase(queryImage.pending, (state) => {
                state.queryTypeToImageStatus = QueryStatus.pending;
            })
            .addCase(queryImage.fulfilled, (state, action) => {
                state.typeToImage = action.payload;
                state.queryTypeToImageStatus = QueryStatus.fulfilled;
            })
            .addCase(queryImage.rejected, (state, action) => {
                state.queryTypeToImageErrorMessage = action.error.message;
                state.queryTypeToImageStatus = QueryStatus.rejected;
            });
    }
});

export default typeToImageSlice.reducer;
