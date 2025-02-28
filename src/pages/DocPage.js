import React, { useEffect, useState } from 'react';
import { Container, Typography, Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { useTreeViewApiRef } from '@mui/x-tree-view/hooks/useTreeViewApiRef';
import docContent from '../schema/doc/statistics.txt';
import NavBar from '../NavBar';
import 'github-markdown-css';
import remarkGfm from 'remark-gfm';
import rehypeRaw from "rehype-raw";
//import './ApiPage.css'
import './Ontology.css'
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
    }, 1000);
  }

  return (
    <div className="code-copy-btn" style={{ width: '20px', height: '20px', zIndex: 1 }}>
      <i className={`fas ${icon}`} onClick={handleClick} style={{ color: iconColor, width: '20px', height: '20px', zIndex: 1 }}>
        <ContentCopyIcon />
      </i>
    </div>
  )
}

function DocPage() {
  const [content, setContent] = useState('');
  const [page, setPage] = useState('API');
  const [currPage, setCurrPage] = useState('API');
  const apiRef = useTreeViewApiRef();
  const [expandedItems, setExpandedItems] = React.useState(['documentation']);

  const handleExpandedItemsChange = (event, itemIds) => {
    setExpandedItems(itemIds);
  };

  useEffect(() => {
    fetch(require(`../schema/doc/${page}.txt`))
      .then(response => response.text())
      .then(text => setContent(text))
      .then(() => { setCurrPage(page) })
      .catch(error => console.error('Error loading documentation:', error));
  }, [page]);

  const handlePageChange = (event, itemId, isSelected) => {
    if (!isSelected) {
      return;
    }
    if (itemId !== 'data' && itemId !== 'documentation') {
      setPage(itemId);
    }
  }

  const Pre = ({ children }) => <pre className="blog-pre">
    <CodeCopyBtn>{children}</CodeCopyBtn>
    {children}
  </pre>

  return (
    <div className="App">
      <Container maxWidth="100%" sx={{ mt: 4, mb: 4, display: 'flex', flexDirection: 'row' }}>
        <Box
          sx={{
            width: '300px',
            textAlign: 'left',
            maxHeight: 'calc(100vh - 420px)',
            overflowY: 'auto',
            mr: 10
          }}
        >
          <SimpleTreeView apiRef={apiRef} onItemSelectionToggle={handlePageChange}
            expandedItems={expandedItems} onExpandedItemsChange={handleExpandedItemsChange}>
            <TreeItem itemId='documentation' label="Documentation">
              <TreeItem itemId="overview" label="Overview" />
              <TreeItem itemId="ontology" label="Ontology" />
              <TreeItem itemId="API" label="API" />
              <TreeItem itemId="data" label="Data">
                <TreeItem itemId="statistics" label="Statistics" />
              </TreeItem>
              <TreeItem itemId="usecase" label="Use cases" />
              <TreeItem itemId="tutorial" label="Tutorials" />
            </TreeItem>
          </SimpleTreeView>
        </Box>
        <Box
          sx={{
            width: 'stretch',
            textAlign: 'left',
            maxHeight: 'calc(100vh - 350px)',
            overflowY: 'auto'
          }}
          className={'markdown-body'}
        >
          {
            <ReactMarkdown
              className={'post-markdown'}
              // linkTarget='_blank'
              rehypePlugins={[rehypeRaw]}
              remarkPlugins={[remarkGfm]}
              components={{
                pre: Pre,
                code({ node, inline, className, children, ...props }) {
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
                  if (currPage === 'usecase') {
                    return <></>
                  }
                  return <h2 id={node.children.toLowerCase().replaceAll(' ', '-')}>{node.children}</h2>
                }
              }}
            >
              {content}
            </ReactMarkdown>}
          {/* {currPage === 'ontology' &&
            <div>
              <Container>
                <Typography variant="h1" gutterBottom>
                  Ontology Tree
                </Typography>
                <Typography>
                  The ontology tree displays all Gene Ontology (GO) terms included in PanKgraph, organized hierarchically for easy navigation and analysis. It encompasses various biological processes, molecular functions, and cellular components, structured to facilitate exploration and analysis of functional relationships within the dataset.
                </Typography>
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </Container>
            </div>} */}
        </Box>
      </Container>
    </div>
  );
}

export default DocPage;
