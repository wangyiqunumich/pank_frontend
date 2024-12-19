import React, { useEffect, useState } from 'react';
import { Container, Typography, Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import docContent from '../mdFiles/Doc.md';
import NavBar from '../NavBar';
import 'github-markdown-css';
import remarkGfm from 'remark-gfm'

function DocPage() {
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch(docContent)
      .then(response => response.text())
      .then(text => setContent(text))
      .catch(error => console.error('Error loading documentation:', error));
  }, []);

  return (
    <div className="App">
      <NavBar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ p: 4, textAlign: 'left' }} className={'markdown-body'}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={materialLight}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </Box>
      </Container>
    </div>
  );
}

export default DocPage;
