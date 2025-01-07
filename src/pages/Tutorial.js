import React, { useEffect, useState } from 'react';
import { Container, Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import tutorialContent from '../schema/doc/tutorial.md';
import NavBar from '../NavBar';
import 'github-markdown-css';

function Tutorial() {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    fetch(tutorialContent)
      .then(response => response.text())
      .then(text => {
        setMarkdown(text);
      })
      .catch(error => {
        console.error('Error loading tutorial content:', error);
      });
  }, []);

  return (
    <>
      <Container maxWidth={false} disableGutters>
        <Box className={'markdown-body'} sx={{
          padding: '40px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <ReactMarkdown>
            {markdown}
          </ReactMarkdown>
        </Box>
      </Container>
    </>
  );
}

export default Tutorial;
