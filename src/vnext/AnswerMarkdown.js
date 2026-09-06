// Existing answer renderer extracted unchanged in appearance from resultpage_new.
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Button, Typography, Link, Backdrop } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { trackGtagEvent as trackResultNewEvent } from '../utils/gtag';
const PMID_HOVER_EVENT = 'pank:pmid-hover';
const PMID_HOVER_CLEAR_EVENT = 'pank:pmid-hover-clear';
const PMID_CLICK_EVENT = 'pank:pmid-click';
const PMID_CITATION_PATTERN = /(\[\s*(?:pmid|pubmedid)\s*:\s*(\d{7,8})\s*\]|\(\s*(?:pmid|pubmedid)\s*:?\s*(\d{7,8})\s*\)|\[\s*(\d{7,8})\s*\]\(\s*https?:\/\/(?:www\.)?pubmed(?:\.ncbi\.nlm\.nih\.gov|\.gov)\/(\d{7,8})\/?[^)]*\))/gi;
export default function AnswerMarkdown({ answer = '', references = [] }) {
    const overviewSummary = String(answer || '');
    const mainReferenceAnchorByPmid = Object.fromEntries(references.filter(r => r.pmid).map(r => [r.pmid, r.anchorId]));
    const dispatchPmidReferenceEvent = (eventName, payload) => {
        if (typeof window === 'undefined') return;
        try {
            window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
        } catch (err) {
            // Ignore browsers/environments that don't support CustomEvent construction.
        }
    };

    const flashReferenceElement = (target) => {
        if (!target) return;
        const previousTransition = target.style.transition;
        const previousBoxShadow = target.style.boxShadow;
        const previousBorderColor = target.style.borderColor;
        const previousBackground = target.style.backgroundColor;

        target.style.transition = 'box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease';
        target.style.boxShadow = '0 0 0 2px rgba(94, 169, 134, 0.38)';
        target.style.borderColor = '#5EA986';
        target.style.backgroundColor = '#E1F2E9';

        window.setTimeout(() => {
            target.style.transition = previousTransition;
            target.style.boxShadow = previousBoxShadow;
            target.style.borderColor = previousBorderColor;
            target.style.backgroundColor = previousBackground;
        }, 950);
    };

    const scrollToReferenceAnchor = (href, event, options = {}) => {
        if (!href || !href.startsWith('#')) {
            return;
        }
        if (event?.preventDefault) {
            event.preventDefault();
        }
        const anchorId = href.slice(1);
        let target = document.getElementById(anchorId);
        if (!target) {
            const pmidMatch = anchorId.match(/(\d{7,8})/);
            if (pmidMatch?.[1]) {
                target = document.querySelector(`[data-pmid="${pmidMatch[1]}"]`);
            }
        }
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: options.block || 'center' });
            if (options.flash) {
                flashReferenceElement(target);
            }
        }
    };

    const extractPubmedIdFromHref = (href) => {
        const hrefText = String(href || '').trim();
        const match = hrefText.match(/^https?:\/\/(?:www\.)?pubmed(?:\.ncbi\.nlm\.nih\.gov|\.gov)\/(\d{7,8})\/?/i);
        return match?.[1] || '';
    };

    const renderPmidPill = (pmid, keyPrefix, referenceAnchorByPmid = {}) => {
        const anchorId = referenceAnchorByPmid?.[pmid] || `reference-item-${pmid}`;
        const href = `#${anchorId}`;
        const pmidText = String(pmid || '').trim();
        return (
            <Link
                key={`${keyPrefix}-pmid-${pmid}`}
                href={href}
                sx={{
                    textDecoration: 'none',
                    display: 'inline-flex',
                    verticalAlign: 'middle',
                    mx: 0.25,
                    '&:hover .pmid-pill': {
                        backgroundColor: '#DCEFE6',
                        borderColor: '#78B296',
                    },
                }}
                onMouseEnter={() => {
                    dispatchPmidReferenceEvent(PMID_HOVER_EVENT, { pmid: pmidText, anchorId });
                }}
                onMouseLeave={() => {
                    dispatchPmidReferenceEvent(PMID_HOVER_CLEAR_EVENT, { pmid: pmidText, anchorId });
                }}
                onClick={(event) => {
                    dispatchPmidReferenceEvent(PMID_CLICK_EVENT, { pmid: pmidText, anchorId });
                    scrollToReferenceAnchor(href, event, { block: 'center', flash: true });
                }}
            >
                <Box
                    className="pmid-pill"
                    component="span"
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 1,
                        py: '2px',
                        borderRadius: '999px',
                        border: '1px solid #8EC2A7',
                        color: '#1F6B4B',
                        backgroundColor: '#ECF7F1',
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.6,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {`PMID ${pmid}`}
                </Box>
            </Link>
        );
    };

    const renderInlineWithPmids = (value, keyPrefix, referenceAnchorByPmid = {}) => {
        if (typeof value !== 'string' || !value) {
            return value;
        }

        const regex = new RegExp(PMID_CITATION_PATTERN.source, 'gi');
        const nodes = [];
        let cursor = 0;
        let match;

        while ((match = regex.exec(value)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            const pmid = String(match[2] || match[3] || match[4] || match[5] || '').trim();

            if (start > cursor) {
                nodes.push(
                    <React.Fragment key={`${keyPrefix}-text-${cursor}`}>
                        {value.slice(cursor, start)}
                    </React.Fragment>
                );
            }

            if (pmid) {
                nodes.push(renderPmidPill(pmid, `${keyPrefix}-${start}`, referenceAnchorByPmid));
            }
            cursor = end;
        }

        if (cursor < value.length) {
            nodes.push(
                <React.Fragment key={`${keyPrefix}-text-tail`}>
                    {value.slice(cursor)}
                </React.Fragment>
            );
        }

        return nodes;
    };

    const renderChildrenWithPmids = (children, keyPrefix, skipStringLinkify = false, referenceAnchorByPmid = {}) =>
        React.Children.toArray(children).map((child, childIndex) => {
            const childKey = `${keyPrefix}-${childIndex}`;
            const voidHtmlTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
            if (typeof child === 'string') {
                return skipStringLinkify
                    ? <React.Fragment key={childKey}>{child}</React.Fragment>
                    : renderInlineWithPmids(child, childKey, referenceAnchorByPmid);
            }
            if (!React.isValidElement(child)) {
                return child;
            }

            const childType = typeof child.type === 'string' ? child.type : '';
            if (childType === 'a') {
                return React.cloneElement(child, {
                    key: child.key || childKey,
                    children: child.props.children,
                });
            }

            if (childType && voidHtmlTags.has(childType.toLowerCase())) {
                return React.cloneElement(child, {
                    key: child.key || childKey,
                });
            }

            if (child.props.children === null || child.props.children === undefined) {
                return React.cloneElement(child, {
                    key: child.key || childKey,
                });
            }

            return React.cloneElement(child, {
                key: child.key || childKey,
                children: renderChildrenWithPmids(child.props.children, childKey, skipStringLinkify, referenceAnchorByPmid),
            });
        });

    const extractTextFromNode = (node) => {
        if (node === null || node === undefined || typeof node === 'boolean') return '';
        if (typeof node === 'string' || typeof node === 'number') return String(node);
        if (Array.isArray(node)) return node.map(extractTextFromNode).join('');
        if (React.isValidElement(node)) return extractTextFromNode(node.props?.children);
        return '';
    };

    const extractTableMatrix = (children) => {
        const elements = React.Children.toArray(children).filter((child) => React.isValidElement(child));
        const thead = elements.find((el) => el.type === 'thead');
        const tbody = elements.find((el) => el.type === 'tbody');

        const parseRows = (sectionEl) => {
            if (!sectionEl || !React.isValidElement(sectionEl)) return [];

            const rowEls = React.Children.toArray(sectionEl.props?.children).filter(
                (child) => React.isValidElement(child) && child.type === 'tr'
            );

            return rowEls.map((rowEl) => {
                const cellEls = React.Children.toArray(rowEl.props?.children).filter((child) => React.isValidElement(child));
                return cellEls.map((cellEl) => extractTextFromNode(cellEl.props?.children).replace(/\s+/g, ' ').trim());
            });
        };

        const headerRows = parseRows(thead);
        const bodyRows = parseRows(tbody);

        return {
            header: headerRows[0] || [],
            bodyRows,
        };
    };

    const buildTableCsv = (header, bodyRows) => {
        const escapeCsvCell = (value) => {
            const raw = value === null || value === undefined ? '' : String(value);
            if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
                return `"${raw.replaceAll('"', '""')}"`;
            }
            return raw;
        };

        const rows = [];
        if (header.length) rows.push(header);
        rows.push(...bodyRows);

        return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
    };

    function MarkdownTableWithTools({ children, title = 'Table 1' }) {
        const [expanded, setExpanded] = React.useState(false);
        const [isTableOverlayOpen, setIsTableOverlayOpen] = React.useState(false);
        const tableRootRef = React.useRef(null);
        const { header, bodyRows } = React.useMemo(() => extractTableMatrix(children), [children]);
        const shouldHideToolbar = header.length > 0 && bodyRows.length === 1;
        const shouldShowToggle = bodyRows.length > 3;
        const collapsedVisibleRowCount = Math.min(3, bodyRows.length);

        const findScrollableAncestor = React.useCallback((node) => {
            if (!node) return null;

            let current = node.parentElement;
            while (current) {
                const style = window.getComputedStyle(current);
                const canScrollY = /(auto|scroll)/.test(style.overflowY || '') || /(auto|scroll)/.test(style.overflow || '');
                if (canScrollY && current.scrollHeight > current.clientHeight) {
                    return current;
                }
                current = current.parentElement;
            }

            return null;
        }, []);

        const handleDownloadCsv = React.useCallback(() => {
            const csvContent = buildTableCsv(header, bodyRows);
            if (!csvContent) return;

            trackResultNewEvent('agent_result_table_download_csv_click', {
                title: title || 'table',
                rows: bodyRows.length,
                columns: header.length || (bodyRows[0]?.length || 0),
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'ai-overview-table.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, [header, bodyRows]);

        const handleToggleExpanded = React.useCallback(() => {
            setExpanded((prevExpanded) => {
                const nextExpanded = !prevExpanded;
                trackResultNewEvent('agent_result_table_expand_toggle_click', {
                    title: title || 'table',
                    expanded: nextExpanded,
                });

                if (!prevExpanded && nextExpanded) {
                    requestAnimationFrame(() => {
                        const tableRoot = tableRootRef.current;
                        const scrollContainer = findScrollableAncestor(tableRoot);
                        if (!tableRoot || !scrollContainer) return;

                        const containerRect = scrollContainer.getBoundingClientRect();
                        const tableRect = tableRoot.getBoundingClientRect();
                        const delta = tableRect.top - containerRect.top;

                        scrollContainer.scrollTo({
                            top: scrollContainer.scrollTop + delta,
                            behavior: 'smooth',
                        });
                    });
                }

                return nextExpanded;
            });
        }, [findScrollableAncestor, trackResultNewEvent, title]);

        return (
            <Box ref={tableRootRef} sx={{ my: 2.25 }}>
                <Box
                    sx={{
                        border: '1px solid #DCE3EB',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundColor: '#FFFFFF',
                    }}
                >
                    {!shouldHideToolbar ? (
                        <Box
                            sx={{
                                px: 1.5,
                                py: 1,
                                backgroundColor: '#F1F5F9',
                                borderBottom: '1px solid #DCE3EB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                            }}
                        >
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
                                {title || ''}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={handleDownloadCsv}
                                    disabled={!header.length && !bodyRows.length}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        borderColor: '#CBD5E1',
                                        color: '#475569',
                                        minWidth: 0,
                                        px: 1.25,
                                        py: 0.4,
                                        backgroundColor: '#FFFFFF',
                                    }}
                                >
                                    Download CSV
                                </Button>

                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        trackResultNewEvent('agent_result_table_fullscreen_open_click', { title: title || 'table' });
                                        setIsTableOverlayOpen(true);
                                    }}
                                    disabled={!header.length && !bodyRows.length}
                                    startIcon={<OpenInFullIcon sx={{ fontSize: 14 }} />}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        borderColor: '#CBD5E1',
                                        color: '#475569',
                                        minWidth: 0,
                                        px: 1.25,
                                        py: 0.4,
                                        backgroundColor: '#FFFFFF',
                                    }}
                                >
                                    Full Screen
                                </Button>
                            </Box>
                        </Box>
                    ) : null}

                    <Box
                        sx={{
                            overflowX: 'auto',
                            overflowY: expanded ? 'auto' : 'visible',
                            maxHeight: expanded ? 420 : 'none',
                            '& table': {
                                width: '100%',
                                borderCollapse: 'collapse',
                                margin: 0,
                                borderTop: 'none',
                            },
                            '& thead tr': {
                                borderBottom: '1px solid #CBD5E1',
                            },
                            '& thead th': {
                                position: 'sticky',
                                top: 0,
                                zIndex: 1,
                                backgroundColor: '#F8FAFC',
                            },
                            '& tbody tr': {
                                borderBottom: '1px solid #CBD5E1',
                            },
                            '& th, & td': {
                                textAlign: 'left',
                                padding: '8px 10px',
                                verticalAlign: 'middle',
                            },
                            '& th': {
                                height: 38,
                            },
                            '& tbody tr:nth-of-type(n+4)': expanded ? undefined : { display: 'none' },
                            ...(expanded
                                ? {
                                    '& tbody tr:last-of-type': {
                                        borderBottom: 'none',
                                    },
                                }
                                : (collapsedVisibleRowCount > 0
                                    ? {
                                        [`& tbody tr:nth-of-type(${collapsedVisibleRowCount})`]: {
                                            borderBottom: 'none',
                                        },
                                    }
                                    : {})),
                        }}
                    >
                        <table>{children}</table>
                    </Box>

                    {shouldShowToggle ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.75, borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                            <Button
                                size="small"
                                onClick={handleToggleExpanded}
                                startIcon={expanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: 12,
                                    color: '#0F766E',
                                    fontWeight: 700,
                                }}
                            >
                                {expanded ? 'Collapse' : 'Show more'}
                            </Button>
                        </Box>
                    ) : null}
                </Box>

                <Backdrop
                    open={isTableOverlayOpen}
                    sx={{ zIndex: 1300, bgcolor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }}
                    onClick={() => {
                        trackResultNewEvent('agent_result_table_fullscreen_backdrop_close_click', { title: title || 'table' });
                        setIsTableOverlayOpen(false);
                    }}
                >
                    <Box
                        onClick={(event) => event.stopPropagation()}
                        sx={{
                            width: 'min(1200px, 96vw)',
                            height: 'min(860px, 92vh)',
                            borderRadius: '10px',
                            border: '1px solid #E2E8F0',
                            bgcolor: '#FFFFFF',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Box
                            sx={{
                                px: 2,
                                py: 1.25,
                                borderBottom: '1px solid #E2E8F0',
                                bgcolor: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                            }}
                        >
                            <Typography sx={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                                {title}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={handleDownloadCsv}
                                    disabled={!header.length && !bodyRows.length}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        borderColor: '#CBD5E1',
                                        color: '#475569',
                                        minWidth: 0,
                                        px: 1.25,
                                        py: 0.4,
                                        backgroundColor: '#FFFFFF',
                                    }}
                                >
                                    Download CSV
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        trackResultNewEvent('agent_result_table_fullscreen_close_click', { title: title || 'table' });
                                        setIsTableOverlayOpen(false);
                                    }}
                                    startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        borderColor: '#CBD5E1',
                                        color: '#475569',
                                        minWidth: 0,
                                        px: 1.25,
                                        py: 0.4,
                                        backgroundColor: '#FFFFFF',
                                    }}
                                >
                                    Close
                                </Button>
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                flex: 1,
                                overflow: 'auto',
                                '& table': {
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    margin: 0,
                                    borderTop: 'none',
                                },
                                '& thead tr': {
                                    borderBottom: '1px solid #CBD5E1',
                                    backgroundColor: '#F8FAFC',
                                },
                                '& thead th': {
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 1,
                                    backgroundColor: '#F8FAFC',
                                },
                                '& tbody tr': {
                                    borderBottom: '1px solid #CBD5E1',
                                },
                                '& tbody tr:last-of-type': {
                                    borderBottom: 'none',
                                },
                                '& th, & td': {
                                    textAlign: 'left',
                                    padding: '8px 10px',
                                    verticalAlign: 'middle',
                                },
                                '& th': {
                                    height: 38,
                                },
                            }}
                        >
                            <table>{children}</table>
                        </Box>
                    </Box>
                </Backdrop>
            </Box>
        );
    }

    let mainTableTitleIndex = 0;

    const markdownSummaryContent = (
        <Box
            sx={{
                fontSize: 16,
                fontWeight: 400,
                color: '#475569',
                lineHeight: 1.7,
                '& p': { margin: '0 0 0.85em 0' },
                '& ul, & ol': { margin: '0.2em 0 0.85em 1.4em', padding: 0 },
                '& li': { marginBottom: '0.25em' },
                '& h1, & h2, & h3, & h4': {
                    margin: '0.9em 0 0.45em 0',
                    color: '#0F172A',
                    fontWeight: 700,
                    lineHeight: 1.3,
                },
                '& :not(pre) > code': {
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                    backgroundColor: '#F1F5F9',
                    borderRadius: '4px',
                    padding: '0 4px',
                    fontSize: '0.92em',
                },
                '& pre': {
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '12px',
                    overflowX: 'hidden',
                    margin: '0.8em 0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                },
                '& pre code': {
                    backgroundColor: 'transparent',
                    padding: 0,
                    borderRadius: 0,
                    whiteSpace: 'inherit',
                    wordBreak: 'inherit',
                    overflowWrap: 'inherit',
                    fontSize: 'inherit',
                },
                '& table': {
                    width: '100%',
                    borderCollapse: 'collapse',
                    margin: '0.8em 0',
                    borderTop: '1px solid #CBD5E1',
                },
                '& thead tr': {
                    borderBottom: '1px solid #CBD5E1',
                },
                '& tbody tr': {
                    borderBottom: '1px solid #CBD5E1',
                },
                '& th, & td': {
                    textAlign: 'left',
                    padding: '8px 10px',
                    verticalAlign: 'top',
                },
            }}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                components={{
                    p: ({ children }) => <Typography component="p" sx={{ fontSize: 16, fontWeight: 400, color: '#475569' }}>{renderChildrenWithPmids(children, 'p', false, mainReferenceAnchorByPmid)}</Typography>,
                    li: ({ children }) => <Typography component="li" sx={{ fontSize: 16, fontWeight: 400, color: '#475569' }}>{renderChildrenWithPmids(children, 'li', false, mainReferenceAnchorByPmid)}</Typography>,
                    a: ({ href, children }) => {
                        const pmid = extractPubmedIdFromHref(href);
                        if (pmid) {
                            return renderPmidPill(pmid, 'main-a', mainReferenceAnchorByPmid);
                        }

                        return (
                            <Link
                                href={href}
                                target={href?.startsWith('#') ? undefined : '_blank'}
                                rel={href?.startsWith('#') ? undefined : 'noreferrer'}
                                sx={{ color: '#0069c2', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                onClick={(event) => scrollToReferenceAnchor(href, event)}
                            >
                                {renderChildrenWithPmids(children, 'a', true, mainReferenceAnchorByPmid)}
                            </Link>
                        );
                    },
                    strong: ({ children }) => <strong>{renderChildrenWithPmids(children, 'strong', false, mainReferenceAnchorByPmid)}</strong>,
                    em: ({ children }) => <em>{renderChildrenWithPmids(children, 'em', false, mainReferenceAnchorByPmid)}</em>,
                    h1: ({ children }) => <Typography component="h1" sx={{ fontSize: 26 }}>{renderChildrenWithPmids(children, 'h1', false, mainReferenceAnchorByPmid)}</Typography>,
                    h2: ({ children }) => <Typography component="h2" sx={{ fontSize: 22 }}>{renderChildrenWithPmids(children, 'h2', false, mainReferenceAnchorByPmid)}</Typography>,
                    h3: ({ children }) => <Typography component="h3" sx={{ fontSize: 18 }}>{renderChildrenWithPmids(children, 'h3', false, mainReferenceAnchorByPmid)}</Typography>,
                    h4: ({ children }) => <Typography component="h4" sx={{ fontSize: 16 }}>{renderChildrenWithPmids(children, 'h4', false, mainReferenceAnchorByPmid)}</Typography>,
                    th: ({ children }) => <th>{renderChildrenWithPmids(children, 'th', false, mainReferenceAnchorByPmid)}</th>,
                    td: ({ children }) => <td>{renderChildrenWithPmids(children, 'td', false, mainReferenceAnchorByPmid)}</td>,
                    table: ({ children }) => {
                        const { header, bodyRows } = extractTableMatrix(children);
                        const shouldNumberTable = !(header.length > 0 && bodyRows.length === 1);
                        if (shouldNumberTable) {
                            mainTableTitleIndex += 1;
                        }
                        return <MarkdownTableWithTools title={shouldNumberTable ? `Table ${mainTableTitleIndex}` : ''}>{children}</MarkdownTableWithTools>;
                    },
                }}
            >
                {overviewSummary}
            </ReactMarkdown>
        </Box>
    );

    return markdownSummaryContent;
}
