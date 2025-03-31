import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Autocomplete, TextField } from '@mui/material';
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
import { useNavigate } from 'react-router';
import { useLocation } from 'react-router-dom';
import lunr from 'lunr';
import ReactDOMServer from 'react-dom/server'

import './Ontology.css'
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const Pages = {
    overview: 'Overview',
    ontology: 'Ontology',
    API: 'API',
    statistics: 'Statistics',
    usecase: 'Use cases',
    tutorial: 'Tutorials'
}

export function CodeCopyBtn({ children }) {
    const [copyOk, setCopyOk] = React.useState(false);

    const iconColor = copyOk ? '#0af20a' : '#ddd';
    const icon = copyOk ? 'fa-check-square' : 'fa-copy';

    const handleClick = (e) => {
        navigator.clipboard.writeText(children.props.children);

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

function getText(html) {
    var divContainer = document.createElement("div");
    divContainer.innerHTML = html;

    function containsTable(node) {
        if (node.tagName === "TABLE") {
            return true;
        }
        for (let i = 0; i < node.childNodes.length; i++) {
            if (containsTable(node.childNodes[i])) {
                return true;
            }
        }
        return false;
    }

    function extractTextFromTable(table) {
        return Array.from(table.rows)
            .map(row =>
                Array.from(row.cells)
                    .map(cell => cell.textContent.trim())
                    .join(" ") // Separate columns with " | "
            )
            .join("\n"); // Newline for rows
    }

    function extractTextFromNode(node) {
        if (!containsTable(node)) {
            return Array.from(node.childNodes)
                .map(node => node.textContent.trim())
                .filter(text => text.length > 0)
                .join("\n")
                .replace(/\s+/g, " ") // Remove extra spaces and empty lines
                .trim(); // Ensure no leading/trailing spaces
        }
        if (node.tagName === "TABLE") {
            return extractTextFromTable(node);
        } else if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.trim();
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            return Array.from(node.childNodes)
                .map(extractTextFromNode)
                .filter(text => text.length > 0)
                .join(" "); // Ensure spacing
        }
        return "";
    }

    return extractTextFromNode(divContainer)
        .replace(/\n{2,}/g, "\n") // Remove excessive blank lines
        .trim();
}

function DocPage() {
    const [content, setContent] = useState('');
    const [page, setPage] = useState('overview');
    const [currPage, setCurrPage] = useState('overview');
    const [selectedPage, setSelectedPage] = useState('overview');
    const apiRef = useTreeViewApiRef();
    const [expandedItems, setExpandedItems] = React.useState(['documentation']);
    const navigate = useNavigate();
    const location = useLocation();
    const [pages, setPages] = useState({});

    function renderMD(page, contn) {
        return (<ReactMarkdown
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
                    if (page === 'usecase') {
                        return <></>
                    }
                    return <h2 id={node.children.toLowerCase().replaceAll(' ', '-')}>{node.children}</h2>
                }
            }}
        >
            {contn}
        </ReactMarkdown>);
    }

    async function fetchPages() {
        const pages = await Promise.all(
            Object.keys(Pages).map(async (page) => {
                const module = await import(`../schema/doc/${page}.txt`);
                const response = await fetch(module.default);
                const text = await response.text();
                const html = getText(ReactDOMServer.renderToStaticMarkup(renderMD(page, text)));
                return { [page]: html };
            })
        );
        setPages(Object.assign({}, ...pages));
    }

    const idx = lunr(
        function () {
            this.ref('title');
            this.field('title');
            this.field('content');

            Object.keys(Pages).forEach((page, _) => {
                const content = pages[page] || '';
                this.add({
                    title: page,
                    content: content
                });
            });
        }
    );

    function findRelevantSnippet(query, text, snippetLength = 50) {
        text = text.replace(/\s+/g, ' ').trim();
        if (!text) return '';
        let matchIndex = text.toLowerCase().indexOf(query.toLowerCase());
        if (matchIndex === -1) return findRelevantSnippet(query.slice(0, -1), text, snippetLength);

        let start = text.lastIndexOf(' ', matchIndex - snippetLength / 2) + 1;
        let end = text.indexOf(' ', matchIndex + snippetLength / 2);
        let snippet = text.substring(start, end);
        let beforequery = snippet.substring(0, matchIndex - start);
        let afterquery = snippet.substring(matchIndex - start + query.length, end - start);
        let highlighted = <span>{beforequery}<span style={{ backgroundColor: '#ff0' }}>{query}</span>{afterquery}</span>;
        return <span>{highlighted}</span>;
    }

    function getResult(query) {
        console.log(query, idx.search(query));
        return idx.search(query)
            .map(res => {
                const content = pages[res.ref] || '';
                const snippet = findRelevantSnippet(query, content, 50);
                return { page: Pages[res.ref], snippet: snippet };
            });
    }

    function SearchDropdown() {
        const [inputValue, setInputValue] = useState("");

        return (
            <Autocomplete
                freeSolo
                options={getResult(inputValue).map(res => {
                    return { title: res.page, content: res.snippet };
                })}
                getOptionLabel={() => inputValue} // What appears in input
                filterOptions={(options => options)} // Disable filtering
                renderOption={(props, option) => (
                    <Box {...props} key={option.title} sx=
                        {{
                            display: 'flex',
                            flexDirection: 'column'
                        }} onClick={() => {
                            navigate(`/docs/${Object.entries(Pages)
                                .find(([_, value]) => value === option.title)?.[0]}`);
                        }}>
                        <Typography variant="body2" color="text.secondary"></Typography>
                        <Typography variant="body1" fontWeight="bold" align='left' sx={{ alignSelf: 'flex-start' }}>
                            {option.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'flex-start' }}>
                            {option.content}
                        </Typography>
                    </Box>
                )}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Search"
                        variant="outlined"
                        fullWidth
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                )}

            />
        );
    }

    useEffect(() => {
        fetchPages();
    }, []);


    const handleExpandedItemsChange = (event, itemIds) => {
        setExpandedItems(itemIds);
    };

    useEffect(() => {
        if (location.pathname.match(/^\/docs\/[^\/]+$/)) {
            var newpage = location.pathname.split('/')[2];
            newpage = newpage.split('#')[0];
            setPage(newpage);
            setSelectedPage(newpage);
        }
    }, [location]);

    useEffect(() => {
        import(`../schema/doc/${page}.txt`)
            .then(module => fetch(module.default))
            .then(response => response.text())
            .then(text => setContent(text))
            .then(() => { setCurrPage(page) })
            .catch(error => {
                console.error('Error loading documentation:', error);
                navigate('/docs/overview');
            });
    }, [page]);

    const handlePageChange = (event, itemId) => {
        setSelectedPage(itemId);
        if (itemId !== 'data' && itemId !== 'documentation') {
            navigate(`/docs/${itemId}`);
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
                    <Box sx={{ height: "10px" }} />
                    <SearchDropdown />
                    <SimpleTreeView apiRef={apiRef} selectedItems={[selectedPage]} onSelectedItemsChange={handlePageChange}
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
