import './Ontology.css';
import './github-markdown-light.css';

import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import lunr from 'lunr';
import Mark from 'mark.js';
import ReactDOMServer from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router';
import { useLocation } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import CheckBoxIcon from '@mui/icons-material/CheckBox';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import {
    Autocomplete,
    Box,
    Container,
    TextField,
    Typography,
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';

import pageHierarchy from '../schema/doc/documentation.json';

// const Pages = {
//     overview: 'Overview',
//     API: 'API',
//     ontology: 'Ontology',
//     usecase: 'Use cases',
//     tutorial: 'Tutorials',
//     statistics: 'Statistics'
// }

// const defaultPage = 'overview';

// const Folders = ["documentation", "data"];

const Pages = (() => {
    let pages = {};
    function traverse(node) {
        if (node.children) {
            node.children.forEach(child => {
                traverse(child);
            });
        } else {
            pages[node.id] = node.name;
        }
    }
    traverse(pageHierarchy.root);
    return pages;
})();

const Folders = (() => {
    let folders = [];
    function traverse(node) {
        if (node.children) {
            folders = [...folders, node.id];
            node.children.forEach(child => {
                traverse(child);
            });
        }
    }
    traverse(pageHierarchy.root);
    return folders;
})();

const defaultPage = pageHierarchy.default;

const treeNodes = (() => {
    function traverse(node) {
        if (node.children) {
            return <TreeItem itemId={node.id} label={node.name} key={node.id} sx={{
                '.MuiTreeItem-content.Mui-selected': {
                    '.MuiTreeItem-label': {
                        fontWeight: 'bold !important',
                        color: '#24767F',
                    }
                }
            }}>
                {node.children.map(child => traverse(child))}
            </TreeItem>
        } else {
            return <TreeItem itemId={node.id} label={node.name} key={node.id} />
        }
    }
    return (<>
        {pageHierarchy.root?.children.map(child => traverse(child))}
    </>);
})();

export function CodeCopyBtn({ children }) {
    const [copyOk, setCopyOk] = React.useState(false);

    const iconColor = copyOk ? '#126130' : '#ddd';

    const handleClick = (_) => {
        navigator.clipboard.writeText(children.props.children);

        setCopyOk(true);
        setTimeout(() => {
            setCopyOk(false);
        }, 1000);
    }

    return (
        <div className="code-copy-btn" style={{ width: '24px', height: '24px', zIndex: 1 }}>
            <div
                onClick={handleClick}
                style={{ color: iconColor, width: '24px', height: '24px', zIndex: 1 }}
            >

                {!copyOk && (<ContentCopyIcon />)}
                {copyOk && (<CheckBoxIcon />)}
            </div>
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
                    .join(" ")
            )
            .join("\n");
    }

    function extractTextFromNode(node) {
        if (!containsTable(node)) {
            return Array.from(node.childNodes)
                .map(node => node.textContent.trim())
                .filter(text => text.length > 0)
                .join("\n")
                .replace(/\s+/g, " ")
                .trim();
        }
        if (node.tagName === "TABLE") {
            return extractTextFromTable(node);
        } else if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.trim();
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            return Array.from(node.childNodes)
                .map(extractTextFromNode)
                .filter(text => text.length > 0)
                .join(" ");
        }
        return "";
    }

    return extractTextFromNode(divContainer)
        .replace(/\n{2,}/g, "\n")
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
    const [expandedItems, setExpandedItems] = React.useState(pageHierarchy.defaultExpanded);
    const navigate = useNavigate();
    const location = useLocation();
    const [pages, setPages] = useState({}); // converted page text
    const [pageString, setpageString] = useState({}); // pages in string of html
    const [pageHTML, setpageHTML] = useState({}); // pages in jsx
    const [cache, setCache] = useState({}); // cache for search results
    const [isLoading, setIsLoading] = useState(true);
    const [highlightKey, setHighlightKey] = useState('');
    const scrollRef = useRef(null);
    const contentRef = useRef(null);
    const [inputValue, setInputValue] = useState("");
    const [getResultResult, setGetResultResult] = useState([]);

    const renderMD = useCallback((contn) => {
        function getID(children) {
            if (children.$$typeof === Symbol.for('react.element')) {
                return children.props.children.toLowerCase().replaceAll(' ', '-')
            }
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
        if (!isLoading) { return };
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
        if (!text) return [<></>, "", ""];
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
        return [<span>{highlighted}</span>, section, query];
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
                const [snippet, section, querykey] =
                    content ? findRelevantSnippet(query, res.ref, 50) : ["", null, ""];

                return { page: Pages[res.ref], snippet: snippet, section: section, querykey: querykey };
            });
        setCache({ ...cache, [query]: result });
        return result;
    }

    useEffect(() => {
        if (isLoading) {
            return;
        }
        if (inputValue) {
            const result = getResult(inputValue);
            setGetResultResult(result.map(res => {
                return { title: res.page, content: res.snippet, section: res.section, querykey: res.querykey };
            }));
        } else {
            setGetResultResult([]);
        }
    }, [inputValue, isLoading, pages]);


    function SearchDropdown() {
        return (
            <Autocomplete
                id="search"
                freeSolo
                autoSelect
                options={isLoading ? [] : getResultResult}
                getOptionLabel={() => inputValue}
                filterOptions={(options => options)}
                renderOption={(props, option) => (
                    <Box {...props} key={option.title} sx=
                        {{
                            display: 'flex',
                            flexDirection: 'column'
                        }} onClick={() => {
                            document.getElementById('search').blur();
                            setInputValue("");
                            setHighlightKey(option.querykey);
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
                onInputChange={(_, v, r) => {
                    if (r === "input") { setHighlightKey(v); } setInputValue(v);
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder="Search"
                        InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                                <SearchIcon />
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                height: '40px',
                                borderRadius: '20px',
                                backgroundColor: '#fff',
                            },
                        }}
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
    }, [location, isLoading]);

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

    useEffect(() => {
        if (contentRef.current) {
            const instance = new Mark(contentRef.current);
            instance.unmark();
            instance.mark(highlightKey);
        }
    }, [highlightKey, page]);

    const handlePageChange = (event, itemId) => {
        setSelectedPage(itemId);
        if (!Folders.includes(itemId)) {
            const newfrag = page !== itemId ? '' : frag;
            setFrag(newfrag);
            setHighlightKey(inputValue);
            navigate(`/docs/${itemId}${newfrag ? `#${newfrag}` : ''}`);
        }
    }

    const Pre = ({ children }) => <pre className="blog-pre">
        <CodeCopyBtn>{children}</CodeCopyBtn>
        {children}
    </pre>

    return (
        <div className="App">
            <Container maxWidth="100%"
                sx={{
                    mt: 4,
                    mb: 4,
                    display: 'flex',
                    flexDirection: 'row',
                    position: 'relative',
                    minHeight: 'calc(100vh - 400px)'
                }}
            >
                <Box
                    sx={{
                        width: '370px',
                        textAlign: 'left',
                        height: 'calc(100% + 100px)',
                        minHeight: 'calc(100vh + 20px)',
                        position: 'absolute',
                        top: "-50px",
                        left: "-24px",
                        zIndex: -1,
                        mr: 10,
                        backgroundColor: "#E9F4F580"
                    }}
                >
                </Box>
                <Box
                    sx={{
                        width: '300px',
                        textAlign: 'left',
                        height: 'fit-content',
                        overflowY: 'auto',
                        position: 'sticky',
                        top: '30px',
                        mr: 10
                    }}
                >
                    <Box sx={{ height: "10px" }} />
                    {SearchDropdown()}
                    <Box sx={{ height: "10px" }} />
                    <SimpleTreeView selectedItems={[selectedPage]} onSelectedItemsChange={handlePageChange}
                        expandedItems={expandedItems} onExpandedItemsChange={handleExpandedItemsChange}
                        itemChildrenIndentation={24}
                        sx={{
                            '.MuiTreeItem-content': {
                                flexDirection: 'row-reverse',
                                justifyContent: 'space-between',
                                height: '40px',
                                fontSize: '18px',
                                paddingLeft: '20px',
                                '&.Mui-selected': {
                                    fontWeight: 'bold !important',
                                    color: '#24767F',
                                }
                            },
                        }} >
                        {/* <TreeItem itemId='documentation' label="Documentation">
                            <TreeItem itemId="overview" label="Overview" />
                            <TreeItem itemId="ontology" label="Ontology" />
                            <TreeItem itemId="API" label="API" />
                            <TreeItem itemId="data" label="Data">
                                <TreeItem itemId="statistics" label="Statistics" />
                            </TreeItem>
                            <TreeItem itemId="usecase" label="Use cases" />
                            <TreeItem itemId="tutorial" label="Tutorials" />
                        </TreeItem> */}
                        {treeNodes}
                    </SimpleTreeView>
                </Box>
                <Box
                    ref={scrollRef}
                    sx={{
                        textAlign: 'left',
                    }}
                    className={'markdown-body'}
                >
                    <div ref={contentRef} >
                        {isLoading ? loading() : pageHTML[page]}
                    </div>
                </Box>
            </Container>
        </div >
    );
}

export default DocPage;
