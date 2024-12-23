import React, { useEffect, useState } from 'react';
import { Container, Typography, Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import apiContent from '../schema/doc/API.md';
import NavBar from '../NavBar';
import 'github-markdown-css';
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import './ApiPage.css'
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export function CodeCopyBtn({ children }) {
    const [copyOk, setCopyOk] = React.useState(false);

    const iconColor = copyOk ? '#0af20a' : '#ddd';
    const icon = copyOk ? 'fa-check-square' : 'fa-copy';

    const handleClick = (e) => {
        navigator.clipboard.writeText(children.props.children);
        console.log(children)

        setCopyOk(true);
        setTimeout(() => {
            setCopyOk(false);
        }, 5000);
    }

    return (
        <div className="code-copy-btn" style={{ width: '20px', height: '20px', zIndex: 1}}>
            <i className={`fas ${icon}`} onClick={handleClick} style={{color: 'black', width: '20px', height: '20px', zIndex: 1}}>
                <ContentCopyIcon/>
            </i>
        </div>
    )
}

function ApiPage() {
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch(apiContent)
      .then(response => response.text())
      .then(text => setContent(text))
      .catch(error => console.error('Error loading API documentation:', error));
  }, []);
    const Pre = ({ children }) => <pre className="blog-pre">
        <CodeCopyBtn>{children}</CodeCopyBtn>
        {children}
    </pre>

  return (
    <div className="App">
      <NavBar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ p: 4, textAlign: 'left' }} className={'markdown-body'}>
          <ReactMarkdown
              className={'post-markdown'}
              // linkTarget='_blank'
              rehypePlugins={[rehypeRaw]}
              remarkPlugins={[remarkGfm]}
            components={{
                pre: Pre,
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
