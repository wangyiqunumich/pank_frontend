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
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import SearchIcon from '@mui/icons-material/Search';
import {
    Autocomplete,
    Box,
    Button,
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

function parseGlobalTreeFromMarkdown(markdownText) {
    const text = String(markdownText || '');
    const blockMatch = text.match(/```text\s*([\s\S]*?)```/i);
    const treeText = blockMatch ? blockMatch[1] : text;
    const lines = treeText
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+$/g, ''))
        .filter((line) => line.trim().length > 0);

    if (!lines.length) return null;

    const root = { label: lines[0].trim(), children: [] };
    const stack = [root];

    for (let i = 1; i < lines.length; i += 1) {
        const raw = lines[i];
        const branchIndex = raw.search(/[├└]──\s+/);
        if (branchIndex < 0) continue;

        const prefix = raw.slice(0, branchIndex);
        const label = raw.slice(branchIndex).replace(/^[├└]──\s+/, '').trim();
        if (!label) continue;

        const depthChunks = prefix.match(/(?:│   |    )/g);
        const depth = (depthChunks ? depthChunks.length : 0) + 1;
        const node = { label, children: [] };

        while (stack.length > depth) {
            stack.pop();
        }

        const parent = stack[stack.length - 1];
        if (!parent.children) parent.children = [];
        parent.children.push(node);
        stack.push(node);
    }

    return root;
}

function GlobalTreeTopDownGraph({ markdownText }) {
    const tree = React.useMemo(() => parseGlobalTreeFromMarkdown(markdownText), [markdownText]);
    const [fullscreen, setFullscreen] = React.useState(false);

    const parseLabelWithId = React.useCallback((rawLabel) => {
        const label = String(rawLabel || '').trim();
        const match = label.match(/^(.*)\s+\[([^\]]+)\]\s*$/);
        if (!match) {
            return { text: label, id: null, href: null };
        }
        const text = (match[1] || '').trim();
        const id = (match[2] || '').trim();
        return {
            text,
            id,
            href: id ? `http://purl.obolibrary.org/obo/${id}` : null,
        };
    }, []);

    const renderNodeLabel = React.useCallback((rawLabel, color = 'inherit') => {
        const parsed = parseLabelWithId(rawLabel);
        if (!parsed.href) {
            return parsed.text;
        }
        return (
            <a
                href={parsed.href}
                target="_blank"
                rel="noreferrer"
                style={{ color, textDecoration: 'underline' }}
            >
                {parsed.text}
            </a>
        );
    }, [parseLabelWithId]);

    const countSubtreeNodes = React.useCallback((node) => {
        if (!node) return 0;
        const children = node.children || [];
        return 1 + children.reduce((sum, child) => sum + countSubtreeNodes(child), 0);
    }, []);

    const renderNodeList = (nodes, color, depth = 0, solidAtCurrentLevel = false) => {
        if (!nodes?.length) return null;
        return (
            <ul
                style={{
                    margin: depth === 0 ? '0' : '6px 0 0 14px',
                    padding: 0,
                    paddingInlineStart: 0,
                    listStyle: 'none',
                    listStyleType: 'none',
                }}
            >
                {nodes.map((node) => {
                    const hasChildren = Boolean(node.children?.length);
                    const hasWideSubtree = (node.children?.length || 0) >= 3;

                    if (hasWideSubtree) {
                        return (
                            <li
                                key={`${depth}-${node.label}`}
                                style={{
                                    margin: '0 0 10px 0',
                                    padding: 0,
                                    display: 'block',
                                    listStyle: 'none',
                                    listStyleType: 'none',
                                }}
                            >
                                <Box
                                    sx={{
                                        border: `1px solid ${color}44`,
                                        borderRadius: '10px',
                                        bgcolor: '#FFFFFF',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            px: 1.2,
                                            py: 0.7,
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: '#0F172A',
                                            borderBottom: `1px solid ${color}33`,
                                            bgcolor: `${color}14`,
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        {renderNodeLabel(node.label, '#1E4FAE')}
                                    </Box>
                                    <Box sx={{ px: 1, py: 0.8, bgcolor: '#FFFFFF' }}>
                                        {renderNodeList(node.children, color, depth + 1, true)}
                                    </Box>
                                </Box>
                            </li>
                        );
                    }

                    return (
                        <li key={`${depth}-${node.label}`} style={{ marginBottom: 8, listStyle: 'none', listStyleType: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ color, lineHeight: '19px', fontSize: 13 }}>{(depth === 0 || solidAtCurrentLevel) ? '●' : '○'}</span>
                                <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>
                                    {renderNodeLabel(node.label, '#1E4FAE')}
                                </div>
                            </div>
                            {hasChildren ? renderNodeList(node.children, color, depth + 1, false) : null}
                        </li>
                    );
                })}
            </ul>
        );
    };

    if (!tree) {
        return <Typography sx={{ color: '#64748B' }}>Unable to parse global tree data.</Typography>;
    }

    const topChildren = tree.children || [];
    const sectionStyles = [
        { bar: '#0A3D84', border: '#8DB3E2', bullet: '#0D5BB5', bg: '#F8FBFF' },
        { bar: '#2B7A0B', border: '#8BC97A', bullet: '#1F8A2C', bg: '#F8FFF7' },
        { bar: '#5B2A86', border: '#BE9CDE', bullet: '#6F35A5', bg: '#FCF8FF' },
    ];

    const THIRD_CARD_WIDTH = 220;
    const THIRD_CARD_HEIGHT = 720;
    const THIRD_GAP = 12;
    const SECOND_GAP = 24;

    const renderThirdLevelCard = (node, styleByGroup) => (
        <Box
            key={`third-level-${node.label}`}
            sx={{
                flex: `0 0 ${THIRD_CARD_WIDTH}px`,
                width: `${THIRD_CARD_WIDTH}px`,
                height: `${THIRD_CARD_HEIGHT}px`,
                minHeight: `${THIRD_CARD_HEIGHT}px`,
                maxHeight: `${THIRD_CARD_HEIGHT}px`,
                flexShrink: 0,
                border: `2px solid ${styleByGroup.border}`,
                borderRadius: '12px',
                bgcolor: '#FFFFFF',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                sx={{
                    px: 1.5,
                    py: 1,
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#0F172A',
                    borderBottom: `1px solid ${styleByGroup.border}`,
                    bgcolor: styleByGroup.bg,
                    lineHeight: 1.2,
                }}
            >
                {renderNodeLabel(node.label, '#1E4FAE')}
            </Box>
            <Box sx={{ p: 1.2, flex: 1, overflowY: 'auto', overflowX: 'hidden', bgcolor: '#FFFFFF' }}>
                {renderNodeList(node.children || [], styleByGroup.bullet)}
            </Box>
        </Box>
    );

    const renderVirtualThirdLevelCard = (children, styleByGroup, cardWidth) => (
        <Box
            key={`virtual-third-level-${children.length}`}
            sx={{
                flex: `0 0 ${cardWidth}px`,
                width: `${cardWidth}px`,
                height: `${THIRD_CARD_HEIGHT}px`,
                minHeight: `${THIRD_CARD_HEIGHT}px`,
                maxHeight: `${THIRD_CARD_HEIGHT}px`,
                flexShrink: 0,
                border: `2px solid ${styleByGroup.border}`,
                borderRadius: '12px',
                bgcolor: '#FFFFFF',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ p: 1.2, flex: 1, overflowY: 'auto', overflowX: 'hidden', bgcolor: '#FFFFFF' }}>
                {renderNodeList(children || [], styleByGroup.bullet)}
            </Box>
        </Box>
    );

    const layoutNodes = topChildren.map((node, index) => {
        const children = node.children || [];
        const childCount = children.length;
        const shouldUseVirtualNode = childCount > 0 && children.every((child) => countSubtreeNodes(child) <= 4);
        const visualChildCount = Math.max(1, shouldUseVirtualNode ? 1 : childCount);
        const childrenRowWidth = (visualChildCount * THIRD_CARD_WIDTH) + ((visualChildCount - 1) * THIRD_GAP);
        const subtreeWidth = Math.max(300, childrenRowWidth);
        return {
            node,
            styleByGroup: sectionStyles[index % sectionStyles.length],
            childCount,
            visualChildCount,
            childrenRowWidth,
            subtreeWidth,
            shouldUseVirtualNode,
        };
    });

    const positionedNodes = layoutNodes.map((item, idx) => {
        const xStart = layoutNodes
            .slice(0, idx)
            .reduce((sum, prev) => sum + prev.subtreeWidth, 0) + (idx * SECOND_GAP);
        const centerX = xStart + (item.subtreeWidth / 2);
        return {
            ...item,
            xStart,
            centerX,
        };
    });

    const topConnectorContainerWidth = layoutNodes.reduce((sum, item) => sum + item.subtreeWidth, 0)
        + Math.max(0, layoutNodes.length - 1) * SECOND_GAP;
    const firstTopCenter = positionedNodes[0]?.centerX ?? 0;
    const lastTopCenter = positionedNodes[positionedNodes.length - 1]?.centerX ?? firstTopCenter;
    const topConnectorLeft = firstTopCenter;
    const topConnectorWidth = Math.max(2, lastTopCenter - firstTopCenter);
    const treeCanvasWidth = Math.max(1480, topConnectorContainerWidth);

    const topdownContent = (
        <Box className="global-tree-topdown" sx={{ minWidth: treeCanvasWidth, minHeight: 980, px: 1, py: 1 }}>
            <Box sx={{ width: `${treeCanvasWidth}px`, display: 'flex', justifyContent: 'center' }}>
                <Box
                    sx={{
                        px: 3,
                        py: 1.2,
                        borderRadius: 1.5,
                        bgcolor: '#0A3D84',
                        color: '#fff',
                        fontSize: 42,
                        fontWeight: 900,
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        mb: 0,
                    }}
                >
                    {renderNodeLabel(tree.label, '#FFFFFF')}
                </Box>
            </Box>

            <Box sx={{ width: `${treeCanvasWidth}px`, display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: 2, height: 40, bgcolor: '#64748B' }} />
            </Box>

            <Box sx={{ width: `${treeCanvasWidth}px`, position: 'relative', height: 2 }}>
                <Box
                    sx={{
                        position: 'absolute',
                        left: `${topConnectorLeft}px`,
                        width: `${topConnectorWidth}px`,
                        height: 2,
                        bgcolor: '#64748B',
                    }}
                />
            </Box>

            <Box sx={{ width: `${treeCanvasWidth}px`, display: 'flex', gap: `${SECOND_GAP}px`, alignItems: 'flex-start', pt: 0 }}>
                {positionedNodes.map(({ node, styleByGroup, childCount, visualChildCount, childrenRowWidth, subtreeWidth, shouldUseVirtualNode }) => (
                    <Box
                        key={`second-layer-${node.label}`}
                        sx={{
                            flex: `0 0 ${subtreeWidth}px`,
                            width: `${subtreeWidth}px`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            minHeight: `${THIRD_CARD_HEIGHT + 120}px`,
                        }}
                    >
                        <Box sx={{ width: 2, height: 24, bgcolor: '#64748B' }} />
                        <Box
                            sx={{
                                px: 3,
                                py: 1.1,
                                borderRadius: 1.5,
                                bgcolor: '#0A3D84',
                                color: '#fff',
                                fontSize: 26,
                                fontWeight: 900,
                                lineHeight: 1.2,
                                textTransform: 'uppercase',
                                letterSpacing: '0.015em',
                                textAlign: 'center',
                                width: 'fit-content',
                                maxWidth: `${subtreeWidth}px`,
                                borderRadius: 1.5,
                            }}
                        >
                            {renderNodeLabel(node.label, '#FFFFFF')}
                        </Box>
                        <Box
                            sx={{
                                position: 'relative',
                                width: `${childrenRowWidth}px`,
                                height: '46px',
                            }}
                        >
                            {(() => {
                                const firstChildCenter = shouldUseVirtualNode
                                    ? (childrenRowWidth / 2)
                                    : Math.floor(THIRD_CARD_WIDTH / 2);
                                const lastChildCenter = shouldUseVirtualNode
                                    ? (childrenRowWidth / 2)
                                    : firstChildCenter + Math.max(0, visualChildCount - 1) * (THIRD_CARD_WIDTH + THIRD_GAP);
                                const connectorWidth = Math.max(2, lastChildCenter - firstChildCenter);
                                return (
                                    <>
                                        <Box sx={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 2, height: 20, bgcolor: '#64748B' }} />
                                        <Box sx={{ position: 'absolute', top: 20, left: `${firstChildCenter}px`, width: `${connectorWidth}px`, height: 2, bgcolor: '#64748B' }} />
                                    </>
                                );
                            })()}
                            {Array.from({ length: shouldUseVirtualNode ? 1 : visualChildCount }).map((_, childIndex) => (
                                <Box
                                    key={`subtree-drop-${node.label}-${childIndex}`}
                                    sx={{
                                        position: 'absolute',
                                        top: 20,
                                        left: shouldUseVirtualNode
                                            ? `${childrenRowWidth / 2}px`
                                            : `${childIndex * (THIRD_CARD_WIDTH + THIRD_GAP) + Math.floor(THIRD_CARD_WIDTH / 2)}px`,
                                        width: 2,
                                        height: 24,
                                        bgcolor: '#64748B',
                                        transform: 'translateX(-50%)',
                                    }}
                                />
                            ))}
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', gap: `${THIRD_GAP}px`, overflowX: 'visible' }}>
                            {shouldUseVirtualNode
                                ? (
                                    <Box key={`third-wrap-virtual-${node.label}`} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        {renderVirtualThirdLevelCard(node.children || [], styleByGroup, childrenRowWidth)}
                                    </Box>
                                )
                                : (node.children || []).map((child) => (
                                    <Box key={`third-wrap-${node.label}-${child.label}`} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        {renderThirdLevelCard(child, styleByGroup)}
                                    </Box>
                                ))}
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );

    return (
        <Box sx={{ width: '100%', pb: 1, border: '1px solid #E2E8F0', borderRadius: '12px', bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={fullscreen ? <FullscreenExitIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
                    onClick={() => setFullscreen((prev) => !prev)}
                    sx={{ textTransform: 'none', borderRadius: '10px' }}
                >
                    {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </Button>
            </Box>

            {fullscreen ? (
                <Box
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        bgcolor: '#FFFFFF',
                        zIndex: 1800,
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<FullscreenExitIcon fontSize="small" />}
                            onClick={() => setFullscreen(false)}
                            sx={{ textTransform: 'none', borderRadius: '10px' }}
                        >
                            Exit Fullscreen
                        </Button>
                    </Box>
                    <Box sx={{ flex: 1, overflowX: 'auto', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '10px', p: 1 }}>
                        {topdownContent}
                    </Box>
                </Box>
            ) : (
                <Box sx={{ overflowX: 'auto', overflowY: 'auto', px: 1, pb: 1 }}>
                    {topdownContent}
                </Box>
            )}
        </Box>
    );
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
    const [pageMarkdown, setPageMarkdown] = useState({}); // raw markdown content per page
    const [styledOntologyMarkdown, setStyledOntologyMarkdown] = useState('');
    const [cache, setCache] = useState({}); // cache for search results
    const [isLoading, setIsLoading] = useState(true);
    const [highlightKey, setHighlightKey] = useState('');
    const scrollRef = useRef(null);
    const contentRef = useRef(null);
    const [inputValue, setInputValue] = useState("");
    const [getResultResult, setGetResultResult] = useState([]);
    const isStyledOntology = new URLSearchParams(location.search).get('styled') === 'true';

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
        const raw = await Promise.all(
            Object.keys(Pages).map(async (page) => {
                const module = await import(`../schema/doc/${page}.md`);
                const response = await fetch(module.default);
                const text = await response.text();
                return { [page]: text };
            })
        );
        const markdownData = Object.assign({}, ...raw);
        setPageMarkdown(markdownData);

        const html = Object.keys(markdownData).map((pg) => {
            const mdhtml = renderMD(markdownData[pg]);
            return { [pg]: mdhtml };
        });
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

        const styledOntologyModule = await import('../schema/doc/ontology_styled.md');
        const styledOntologyResponse = await fetch(styledOntologyModule.default);
        const styledOntologyText = await styledOntologyResponse.text();
        setStyledOntologyMarkdown(styledOntologyText);

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
                // console.log('no such element', frag);
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

    const isGlobalTreePage = page === 'ontology' && isStyledOntology;

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
                        slots={{
                            expandIcon: ExpandMoreIcon,
                            collapseIcon: ExpandLessIcon,
                        }}
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
                                    backgroundColor: '#21919726',
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
                        ...(isGlobalTreePage
                            ? {
                                width: 'calc(100% - 380px)',
                                px: 2,
                                pb: 3,
                            }
                            : {}),
                    }}
                    className={isGlobalTreePage ? undefined : 'markdown-body'}
                >
                    <div ref={contentRef} >
                        {isLoading
                            ? loading()
                            : (page === 'ontology'
                                ? (isStyledOntology
                                    ? <GlobalTreeTopDownGraph markdownText={styledOntologyMarkdown || pageMarkdown[page]} />
                                    : pageHTML[page])
                                : pageHTML[page])}
                    </div>
                </Box>
            </Container>
        </div >
    );
}

export default DocPage;
