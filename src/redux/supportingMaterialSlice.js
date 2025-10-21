import {
    createAsyncThunk,
    createSlice,
} from '@reduxjs/toolkit';
import { QueryStatus } from '@reduxjs/toolkit/query';

import { flaskBackendAxiosInstanceNew } from '../axios/axios';

export const querySupportingMaterial = createAsyncThunk("/SupportingMaterial",
    async (payload) => {
        return await flaskBackendAxiosInstanceNew
            .post("support-materials", payload, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then((response) => response.data)
            .catch((response) => {
                console.log(response);
            });
    });

export const supportingMaterialSlice = createSlice({
    name: "SupportingMaterial",
    initialState: {
        supportingMaterial: {},
        querySupportingMaterialStatus: QueryStatus.uninitialized, // This is auto updated
        querySupportingMaterialErrorMessage: ''
    },
    extraReducers: (builder) => {
        builder
            .addCase(querySupportingMaterial.pending, (state) => {
                state.querySupportingMaterialStatus = QueryStatus.pending;
            })
            .addCase(querySupportingMaterial.fulfilled, (state, action) => {
                state.supportingMaterial = action.payload;
                state.querySupportingMaterialStatus = QueryStatus.fulfilled;
            })
            .addCase(querySupportingMaterial.rejected, (state, action) => {
                state.querySupportingMaterialErrorMessage = action.error.message;
                state.querySupportingMaterialStatus = QueryStatus.rejected;
            });
    }
})

export default supportingMaterialSlice.reducer;
