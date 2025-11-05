import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { QueryStatus } from "@reduxjs/toolkit/query";
import { flaskBackendAxiosInstanceNew } from "../axios/axios";

export const queryAiAgent = createAsyncThunk(
  "/aiAgent",
  async (payload, { signal, rejectWithValue }) => {
    // Create a controller for Axios
    const controller = new AbortController();

    // Connect Redux Toolkit's signal to Axios' AbortController
    signal.addEventListener("abort", () => controller.abort());

    try {
      const response = await flaskBackendAxiosInstanceNew.post(
        "/pank3-ai-agent",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal, // attach abort signal
        }
      );

      return response.data;
    } catch (error) {
      if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
        // Axios throws a CanceledError when aborted
        return rejectWithValue("Request canceled by user");
      }
      console.error(error);
      return rejectWithValue(error.message);
    }
  }
);

export const aiAgentSlice = createSlice({
  name: "aiAgent",
  initialState: {
    aiAgent: {},
    queryAiAgentStatus: QueryStatus.uninitialized,
    queryAiAgentErrorMessage: "",
  },
  extraReducers: (builder) => {
    builder
      .addCase(queryAiAgent.pending, (state) => {
        state.queryAiAgentStatus = QueryStatus.pending;
        state.queryAiAgentErrorMessage = "";
      })
      .addCase(queryAiAgent.fulfilled, (state, action) => {
        state.aiAgent = action.payload;
        state.queryAiAgentStatus = QueryStatus.fulfilled;
      })
      .addCase(queryAiAgent.rejected, (state, action) => {
        state.queryAiAgentStatus = QueryStatus.rejected;
        state.queryAiAgentErrorMessage = action.payload || action.error.message;
      });
  },
});

export default aiAgentSlice.reducer;
