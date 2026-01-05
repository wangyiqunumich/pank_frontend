import { createSlice } from "@reduxjs/toolkit";

const hoverSlice = createSlice({
    name: "hover",
    initialState: {
        hoverId: null,
        hoverState: false,
    },
    reducers: {
        setHoverId: (state, action) => {
            state.hoverId = action.payload;
        },
        setHoverState: (state, action) => {
            state.hoverState = action.payload;
        },
    },
});

export const { setHoverId, setHoverState } = hoverSlice.actions;
export default hoverSlice.reducer;