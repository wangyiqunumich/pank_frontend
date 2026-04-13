import axios from 'axios';

import {
  createAsyncThunk,
  createSlice,
} from '@reduxjs/toolkit';
import { QueryStatus } from '@reduxjs/toolkit/query';

export const queryAiAgent = createAsyncThunk(
  "/aiAgent",
  async (payload, { signal, rejectWithValue }) => {
    // Create a controller for Axios
    const controller = new AbortController();

    // Connect Redux Toolkit's signal to Axios' AbortController
    signal.addEventListener("abort", () => controller.abort());

    if (payload.debug) {
      return {
        answer: JSON.stringify(
          {
            "text":
            {
              "cypher":
                ["MATCH (g:gene) WHERE g.name = \"INS\" WITH collect(DISTINCT g) AS nodes, [] AS edges RETURN nodes, edges;",
                  "MATCH (g:gene)-[r:function_annotation]->(go:gene_ontology) WHERE g.name = \"INS\" WITH collect(DISTINCT g) AS nodes, collect(DISTINCT r) AS edges RETURN nodes, edges;",
                  "MATCH (g:gene)-[r:effector_gene_of]->(d:disease) WHERE g.name = \"INS\" WITH collect(DISTINCT g) AS nodes, collect(DISTINCT r) AS edges RETURN nodes, edges;"
                ],
              "summary":
                "Answer\nThe INS gene, located on chromosome 11, encodes insulin, a vital hormone for glucose metabolism and homeostasis. Insulin is produced by pancreatic beta cells and plays a key role in regulating blood sugar levels.\n\nGene overview\nThe INS gene plays a critical role in pathways such as cellular response to glucose and insulin receptor signaling. It is available for reference in Ensembl at https://www.ensembl.org/id/ENSG00000254647.\n\nQTL overview\nThe INS gene is considered an effector gene for Type 1 Diabetes (T1D) due to strong genetic, regulatory, and experimental evidence linking it to the disease. Specific studies have identified its role in autoimmune diabetes susceptibility and regulation in immune-related contexts.\n\nSpecific relation to Type 1 Diabetes\nRecent studies have identified an alternatively spliced product of the INS gene, expressed in pancreatic delta cells but not beta cells. This spliced variant encodes a protein containing the insulin signal peptide and B chain with an alternative C-terminus. This product activates preproinsulin-specific cytotoxic T lymphocytes (CTLs) in vitro, suggesting a potential role in islet autoimmunity and endocrine cell function. [PubMed ID: 20628762] [PubMed ID: 28870212] [PubMed ID: 36884057]"
              , "template_matching": "agent_answer"
            }
          })
      };
    }

    const normalizedPayload = {
      ...(payload || {}),
      agent_name: "pankbase",
    };

    try {
      const response = await axios.post(
        "https://agent.pankgraph.org/query",
        normalizedPayload,
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
