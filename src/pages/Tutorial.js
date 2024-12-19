import React, { useEffect, useState } from 'react';
import { Container, Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import tutorialContent from '../mdFiles/Tutorial.md';
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
      <NavBar />
      <Container maxWidth={false} disableGutters>
        <Box className={'markdown-body'} sx={{
          padding: '40px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <ReactMarkdown
            // components={{
            //   h1: ({ children }) => (
            //     <Typography variant="h1" sx={{ fontSize: '2.5rem', mb: 3 }}>
            //       {children}
            //     </Typography>
            //   ),
            //   h2: ({ children }) => (
            //     <Typography variant="h2" sx={{ fontSize: '2rem', mb: 2, mt: 4 }}>
            //       {children}
            //     </Typography>
            //   ),
            //   h3: ({ children }) => (
            //     <Typography variant="h3" sx={{ fontSize: '1.5rem', mb: 2, mt: 3 }}>
            //       {children}
            //     </Typography>
            //   ),
            //   p: ({ children }) => (
            //     <Typography sx={{ mb: 2, fontSize: '1rem', lineHeight: 1.6 }}>
            //       {children}
            //     </Typography>
            //   ),
            //   ul: ({ children }) => (
            //     <Box component="ul" sx={{ mb: 2, pl: 4 }}>
            //       {children}
            //     </Box>
            //   ),
            //   li: ({ children }) => (
            //     <Typography component="li" sx={{ mb: 1 }}>
            //       {children}
            //     </Typography>
            //   ),
            //   code: ({ inline, children }) => (
            //     inline ?
            //       <Typography component="code" sx={{
            //         backgroundColor: '#f5f5f5',
            //         padding: '2px 4px',
            //         borderRadius: '4px',
            //         fontFamily: 'monospace'
            //       }}>
            //         {children}
            //       </Typography> :
            //       <Box component="pre" sx={{
            //         backgroundColor: '#f5f5f5',
            //         padding: '16px',
            //         borderRadius: '4px',
            //         overflow: 'auto',
            //         mb: 2
            //       }}>
            //         <code>{children}</code>
            //       </Box>
            //   )
            // }}
          >
            {markdown}
          </ReactMarkdown>
        </Box>
      </Container>
    </>
  );
}

export default Tutorial;
