import React, { useEffect, useState } from 'react';
import { Container, Typography, Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import apiContent from '../mdFiles/API.md';
import NavBar from '../NavBar';
import 'github-markdown-css';

function ApiPage() {
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch(apiContent)
      .then(response => response.text())
      .then(text => setContent(text))
      .catch(error => console.error('Error loading API documentation:', error));
  }, []);

  return (
    <div className="App">
      <NavBar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ p: 4, textAlign: 'left' }} className={'markdown-body'}>
          <ReactMarkdown
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
              },
                h2(node) {
                    // console.log('here', children)
                    return <h2 id={node.children.toLowerCase().replaceAll(' ', '-')}>{node.children}</h2>
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

export default ApiPage;
