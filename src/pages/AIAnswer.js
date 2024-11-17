import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import NavBar from '../NavBar';
import Markdown from 'react-markdown'
import llm from '../mdFiles/llm.md'

function AIAnswer() {
  return (
    <>
      <NavBar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Graph Summary with LLM
          </Typography>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>Overview</Typography>
            <Typography paragraph>
              Our AI summary feature leverages Large Language Models (LLMs) to provide intelligent analysis and natural language summaries based on query result and HIRN literature. This tool bridges the gap between raw graph query results and meaningful scientific insights.
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>Key Features</Typography>
            
            <Typography variant="h6" gutterBottom>Dynamic Graph Summarization</Typography>
            <ul>
              <Typography component="li">Converts graph query results into natural language descriptions</Typography>
              <Typography component="li">Highlights key relationships and patterns in the data</Typography>
              <Typography component="li">Provides context-aware summaries based on the query type</Typography>
            </ul>

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Literature-Enhanced Responses</Typography>
            <ul>
              <Typography component="li">Integrates relevant information from HIRN literature</Typography>
              <Typography component="li">Cross-references graph data with published research</Typography>
              <Typography component="li">Enriches summaries with citations and supporting evidence</Typography>
            </ul>

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Templated Question Answering</Typography>
            <ul>
              <Typography component="li">Responds to predefined question templates about graph data</Typography>
              <Typography component="li">Offers consistent and structured analysis</Typography>
              <Typography component="li">Supports common research queries such as:
                <ul>
                  <Typography component="li">Relationship analysis between entities</Typography>
                  <Typography component="li">Statistical summaries of connections</Typography>
                  <Typography component="li">Evidence-based explanations</Typography>
                </ul>
              </Typography>
            </ul>
          </Box>

          <Box>
            <Typography variant="h5" gutterBottom>How It Works</Typography>
            <ol>
              <Typography component="li">Query Processing: The system receives a graph query and executes it against the database</Typography>
              <Typography component="li">Context Assembly: Relevant literature and metadata are gathered</Typography>
              <Typography component="li">LLM Analysis: The model processes the combined information</Typography>
              <Typography component="li">Response Generation: A coherent summary or answer is generated based on the template</Typography>
            </ol>
          </Box>
        </Paper>
      </Container>
    </>
  );
}

export default AIAnswer;
