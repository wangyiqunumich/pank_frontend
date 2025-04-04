import React, { useCallback, useEffect, useState } from 'react';
import { Container, Typography, Box, Autocomplete, TextField } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import remarkGfm from 'remark-gfm';
import rehypeRaw from "rehype-raw";
import { useNavigate } from 'react-router';
import { useLocation } from 'react-router-dom';
import lunr from 'lunr';
import ReactDOMServer from 'react-dom/server'

import './Ontology.css'
import "./github-markdown-light.css";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { useRef } from 'react';

const Pages = {
    overview: 'Overview',
    ontology: 'Ontology',
    API: 'API',
    statistics: 'Statistics',
    usecase: 'Use cases',
    tutorial: 'Tutorials'
}

const defaultPage = 'overview';

export function CodeCopyBtn({ children }) {
    const [copyOk, setCopyOk] = React.useState(false);

    const iconColor = copyOk ? '#bbb' : '#ddd';
    const icon = copyOk ? 'fa-check-square' : 'fa-copy';

    const handleClick = (e) => {
        navigator.clipboard.writeText(children.props.children);

        setCopyOk(true);
        setTimeout(() => {
            setCopyOk(false);
        }, 200);
    }

    return (
        <div className="code-copy-btn" style={{ width: '24px', height: '24px', zIndex: 1 }}>
            <i className={`fas ${icon}`} onClick={handleClick} style={{ color: iconColor, width: '24px', height: '24px', zIndex: 1 }}>
                <ContentCopyIcon />
            </i>
        </div>
    )
}

function loading() {
    return <h2>Loading...</h2>
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

function findSection(html, keyword) {
    var divContainer = document.createElement("div");
    divContainer.innerHTML = html;
    var lastSeen = null;
    var found = false;
    var walker = document.createTreeWalker(divContainer, 0x5, null, false);
    while (walker.nextNode()) {
        var node = walker.currentNode;
        if (node.className === 'post-markdown') {
            continue;
        }
        if (node.id) {
            lastSeen = node.id;
        }
        if (node.innerText?.toLowerCase().includes(keyword.toLowerCase())) {
            found = true;
            break;
        }
    }
    if (found) {
        return lastSeen;
    } else {
        return null;
    }
}

function DocPage() {
    const [page, setPage] = useState('loading'); //current page to change
    const [frag, setFrag] = useState('');
    const [selectedPage, setSelectedPage] = useState(''); //selected item in the left
    const [expandedItems, setExpandedItems] = React.useState(['documentation']);
    const navigate = useNavigate();
    const location = useLocation();
    const [pages, setPages] = useState({}); // converted page text
    const [pageString, setpageString] = useState({}); // pages in string of html
    const [pageHTML, setpageHTML] = useState({}); // pages in jsx
    const [cache, setCache] = useState({}); // cache for search results
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef(null);

    const renderMD = useCallback((contn) => {
        function getID(children) { // convert subsection title to string
            if (children.$$typeof === Symbol.for('react.element')) {
                return children.props.children.toLowerCase().replaceAll(' ', '-')
            }
            // if children is a list
            if (Array.isArray(children)) {
                return children.map((child) => {
                    if (child.$$typeof === Symbol.for('react.element')) {
                        return child.props.children.toLowerCase().replaceAll(' ', '-')
                    }
                    return child.toLowerCase().replaceAll(' ', '-')
                }).join('')
            }
            return children.toLowerCase().replaceAll(' ', '-')
        }
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
                h1(node) {
                    return <h1 id={getID(node.children)}>{node.children}</h1>
                },
                h2(node) {
                    return <h2 id={getID(node.children)}>{node.children}</h2>
                },
                h3(node) {
                    return <h3 id={getID(node.children)}>{node.children}</h3>
                },
                h4(node) {
                    return <h4 id={getID(node.children)}>{node.children}</h4>
                },
            }}
        >
            {contn}
        </ReactMarkdown>);
    }, []);

    const fetchPages = useCallback(async () => {
        if (!isLoading) { setPage(defaultPage); return };
        const html = await Promise.all(
            Object.keys(Pages).map(async (page) => {
                const module = await import(`../schema/doc/${page}.md`);
                const response = await fetch(module.default);
                const text = await response.text();
                const mdhtml = renderMD(text);
                return { [page]: mdhtml };
            })
        );
        const pageHTMLData = Object.assign({}, ...html);
        setpageHTML(pageHTMLData);
        const str =
            Object.keys(Pages).map((page) => {
                const text = pageHTMLData[page] || '';
                return { [page]: ReactDOMServer.renderToStaticMarkup(text) };
            });
        const pageStringData = Object.assign({}, ...str);
        setpageString(pageStringData);
        const pg =
            Object.keys(Pages).map((page) => {
                const text = pageStringData[page] || '';
                return { [page]: getText(text) };
            });
        const pages = Object.assign({}, ...pg);
        setPages(pages);
        setIsLoading(false);
    }, [renderMD, isLoading]);

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

    function findRelevantSnippet(query, pagetitle, snippetLength = 50) {
        let text = pages[pagetitle].replace(/\s+/g, ' ').trim();
        if (!text) return [<></>, ""];
        let matchIndex = text.toLowerCase().indexOf(query.toLowerCase());
        if (!query) matchIndex = snippetLength / 2;
        if (matchIndex === -1) return findRelevantSnippet(query.slice(0, -1), pagetitle, snippetLength);

        let start = text.lastIndexOf(' ', matchIndex - snippetLength / 2) + 1;
        let end = text.indexOf(' ', matchIndex + snippetLength / 2);
        let snippet = text.substring(start, end);
        let beforequery = snippet.substring(0, matchIndex - start);
        let afterquery = snippet.substring(matchIndex - start + query.length, end - start);
        let highlighted = <span>{beforequery}<span style={{ backgroundColor: '#ff0' }}>{query}</span>{afterquery}</span>;
        let section = findSection(pageString[pagetitle], query);
        return [<span>{highlighted}</span>, section];
    }

    function getResult(query) {
        if (isLoading) return [];
        if (cache[query]) {
            return cache[query];
        }
        if (Object.keys(cache).length > 100) {
            setCache({});
        }
        let result = idx.search(query)
            .map(res => {
                const content = pages[res.ref] || '';
                const [snippet, section] =
                    content ? findRelevantSnippet(query, res.ref, 50) : ["", null];

                return { page: Pages[res.ref], snippet: snippet, section: section };
            });
        setCache({ ...cache, [query]: result });
        return result;
    }


    function SearchDropdown() {
        const [inputValue, setInputValue] = useState("");

        return (
            <Autocomplete
                id="search"
                freeSolo
                autoSelect
                options={isLoading ? [] : getResult(inputValue).map(res => {
                    return { title: res.page, content: res.snippet, section: res.section };
                })}
                getOptionLabel={() => inputValue} // What appears in input
                filterOptions={(options => options)} // Disable filtering
                renderOption={(props, option) => (
                    <Box {...props} key={option.title} sx=
                        {{
                            display: 'flex',
                            flexDirection: 'column'
                        }} onClick={() => {
                            document.getElementById('search').blur();
                            setInputValue("");
                            let pg = Object.entries(Pages)
                                .find(([_, value]) => value === option.title)?.[0];
                            navigate(`/docs/${pg}${option.section ? `#${option.section}` : ''}`);
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
                onInputChange={(_, v, _2) => { setInputValue(v); }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        id="searchbartextfield"
                        label="Search"
                        variant="outlined"
                        fullWidth
                    />
                )}
            />
        );
    }

    useEffect(() => {
        fetchPages();
    }, [fetchPages]);


    const handleExpandedItemsChange = (event, itemIds) => {
        setExpandedItems(itemIds);
    };

    useEffect(() => {
        if (location.pathname.match(/^\/docs\/([^/]+)?$/)) {
            const newpage = location.pathname.split('/')[2] || defaultPage;
            const newfrag = decodeURIComponent(location.hash.slice(1)) || '';
            setFrag(newfrag);
            if (Pages[newpage]) {
                setSelectedPage(newpage);
                setPage(newpage);
            } else {
                setSelectedPage(defaultPage);
                setPage(defaultPage);
            }
        }
    }, [location]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [page]);

    useEffect(() => {
        if (frag) {
            const element = document.getElementById(frag);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
            else {
                console.log('no such element', frag);
            }
        }
    }, [page, frag]);

    const handlePageChange = (event, itemId) => {
        setSelectedPage(itemId);
        if (itemId !== 'data' && itemId !== 'documentation') {
            const newfrag = page !== itemId ? '' : frag;
            setFrag(newfrag);
            navigate(`/docs/${itemId}${newfrag ? `#${newfrag}` : ''}`);
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
                    {SearchDropdown()}
                    <SimpleTreeView selectedItems={[selectedPage]} onSelectedItemsChange={handlePageChange}
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
                    ref={scrollRef}
                    sx={{
                        width: 'stretch',
                        textAlign: 'left',
                        maxHeight: 'calc(100vh - 420px)',
                        overflowY: 'auto',
                    }}
                    className={'markdown-body'}
                >
                    <p className="gradient-overlay-top"></p>
                    {isLoading ? loading() : pageHTML[page]}
                    <p className="gradient-overlay-bottom"></p>
                </Box>
            </Container>
        </div>
    );
}

export default DocPage;
