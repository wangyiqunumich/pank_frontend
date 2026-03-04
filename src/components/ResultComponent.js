// QuestionAnswerPage.jsx
// Requires: @mui/material @mui/icons-material @emotion/react @emotion/styled @fontsource/open-sans
import * as React from 'react';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import {
    AutoAwesome as AutoAwesomeIcon,
    ChatBubbleOutline as ChatBubbleOutlineIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    Send as SendIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    createTheme,
    CssBaseline,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    Link,
    Paper,
    Skeleton,
    Stack,
    Tab,
    Tabs,
    TextField,
    ThemeProvider,
    Typography,
    useMediaQuery,
} from '@mui/material';

/**
 * All information is passed in as a single object: `data`.
 *
 * Suggested shape:
 * {
 *   questionId: "Q1",
 *   title: "How Does ... ?",
 *   aiOverview: { sections: [{ heading: "Gene Function:", body: "..." }, ...] },
 *   visualMaterial: {
 *     title: "VISUAL MATERIAL",
 *     tabs: [{ label: "Knowledge Graph", content: <JSX/> | "string" }, { label: "Provenance", content: ... }]
 *   },
 *   evidences: {
 *     title: "Evidences",
 *     tabs: [
 *       { label: "References", items: [{ id: "1", title: "...", subtitle: "NATURE GENETICS, 2021 • PMID: ..." }, ...] },
 *       { label: "Provenance", items: [...] },
 *       { label: "Pankbase Links", items: [...] },
 *       { label: "External Links", items: [...] },
 *     ]
 *   },
 *   followUp: { title: "Follow Up", items: ["Question ...", "Question ..."] }
 * }
 */

const theme = createTheme({
    typography: {
        fontFamily: '"Open Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    },
    palette: {
        background: {
            default: "#ffffff",
        },
        text: {
            primary: "#0F172A",
            secondary: "#64748B",
        },
    },
    shape: { borderRadius: 14 },
});

function SectionCard({ title, children, sx }) {
    return (
        <Paper
            elevation={0}
            sx={{
                background: "#fff",
                ...sx,
            }}
        >
            {title ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
                    <Typography
                        sx={{
                            fontSize: 14,
                            letterSpacing: "0.08em",
                            fontWeight: 600,
                            color: "#94A3B8",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {title}
                    </Typography>
                    <Divider sx={{ flex: 1, borderColor: "#E6EAF2" }} />
                </Box>
            ) : null}
            {children}
        </Paper>
    );
}

export function ResultComponentSkeleton() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ px: { xs: 2, md: 4 }, pt: { xs: 2.5, md: 3.5 }, pb: { xs: 0.5, md: 1 }, maxWidth: 1344, width: "100%", mx: "auto" }}>
                <Stack direction="row" spacing={0} alignItems="center" sx={{ mb: '62px', columnGap: '40px' }}>
                    <Skeleton variant="rounded" width={48} height={30} />
                    <Skeleton variant="text" width="60%" height={36} />
                </Stack>

                <Grid container spacing={2.5} alignItems="stretch">
                    <Grid item xs={12} md={12} lg={7}>
                        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
                    </Grid>
                    <Grid item xs={12} md={12} lg={5}>
                        <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
                    </Grid>
                </Grid>

                <Grid container spacing={2.5} sx={{ mt: 2.5 }}>
                    <Grid item xs={12} md={12} lg={7}>
                        <Skeleton variant="rounded" height={260} sx={{ borderRadius: 3 }} />
                    </Grid>
                    <Grid item xs={12} md={12} lg={5}>
                        <Skeleton variant="rounded" height={260} sx={{ borderRadius: 3 }} />
                    </Grid>
                </Grid>
            </Box>
        </ThemeProvider>
    );
}

function ContentTabs({ tabs, value, onChange }) {
    return (
        <Tabs
            value={value}
            onChange={onChange}
            variant="scrollable"
            scrollButtons={false}
            sx={{
                minHeight: 34,
                "& .MuiTab-root": {
                    minHeight: 34,
                    pb: 2,
                    pt: 0.5,
                    px: 0,
                    minWidth: "auto",
                    marginRight: "48px",
                    textTransform: "none",
                    fontWeight: "600 !important",
                    fontSize: "14px !important",
                    color: "#94A3B8 !important",
                    "&:last-child": {
                        marginRight: 0,
                    },
                },
                "& .Mui-selected": { color: "#3A838B !important" },
                "& .MuiTabs-indicator": { backgroundColor: "#3A838B !important", height: 2 },
            }}
        >
            {tabs.map((t) => (
                <Tab key={t.label} label={t.label} />
            ))}
        </Tabs>
    );
}

function processTextLinks(text, graphData, onPmidClick) {
    if (!text) return [];

    const removeConsecutiveAsterisks = (str) => str.replace(/\*\*/g, '');

    // Helper to get link from graph data by node ID
    const getLink = (id) => {
        if (!graphData?.nodes) return null;
        const node = graphData.nodes.find(n => n['~id'] === id);
        return node?.['~properties']?.link || null;
    };

    // Process gene with ID: **CFTR**(ENSG00000001626)
    const processGeneWithId = (str) => {
        const pattern = /(\*\*[A-Za-z0-9_-]+\*\*\s*\([A-Za-z0-9]+\))/;
        const output = [];
        const textList = str.split(pattern).filter(Boolean);

        textList.forEach(part => {
            const match = part.match(pattern);
            if (match) {
                const gene = match[1];
                const word = removeConsecutiveAsterisks(gene).split(" ");
                const id = word[1]?.replace('(', '').replace(')', '');
                const link = getLink(id);
                output.push({
                    text: word[0] + " " + word[1],
                    type: "link",
                    url: link,
                });
            } else {
                output.push({ text: part, type: "text" });
            }
        });
        return output;
    };

    // Process [text] for PMIDs and [text](url) for markdown links
    const processLinksTemp = (str) => {
        if (!str) return [];
        return str.split(/(\[[^\]]+\]\([^)]+\)|\[[^\]]+\])/)
            .flatMap(part => {
                if (part.match(/^\[[^\]]+\]$/)) {
                    // [text] - split by digits for PMID
                    return part.split(/(\d+)/g).map(subPart =>
                        subPart.match(/^\d{8}$/)
                            ? { text: subPart, type: "pubmedid" }
                            : { text: subPart, type: "text" }
                    );
                } else if (part.match(/^\[[^\]]+\]\([^)]+\)$/)) {
                    // [text](url)
                    return [{
                        text: part.split("]")[0].substr(1),
                        type: "link",
                        url: part.split("(")[1].slice(0, -1)
                    }];
                }
                return [{ text: part, type: "text" }];
            });
    };

    // Combine gene processing with link processing
    const result = processGeneWithId(text);
    const output = [];
    result.forEach(data => {
        if (data.type === "link") {
            output.push(data);
        } else {
            const textPart = removeConsecutiveAsterisks(data.text);
            const list = processLinksTemp(textPart);
            output.push(...list);
        }
    });

    return output;
}

function BodyText({ text, graphData, onPmidClick }) {
    const processedParts = React.useMemo(
        () => processTextLinks(text, graphData, onPmidClick),
        [text, graphData, onPmidClick]
    );

    return (
        <Typography
            component="div"
            sx={{
                fontSize: 16,
                fontWeight: 400,
                color: "#475569",
                whiteSpace: "pre-wrap",
            }}
        >
            {processedParts.map((part, index) => {
                if (part.type === "pubmedid") {
                    return (
                        <Link
                            key={index}
                            href={`#reference-item-${part.text}`}
                            sx={{
                                color: '#1976d2',
                                fontWeight: 400,
                                textDecoration: 'none',
                                '&:hover': {
                                    textDecoration: 'underline'
                                }
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                onPmidClick?.(part.text);
                            }}
                        >
                            {part.text}
                        </Link>
                    );
                } else if (part.type === "link") {
                    return (
                        <Link
                            key={index}
                            href={part.url}
                            target="_blank"
                            rel="noreferrer"
                            sx={{
                                color: "#0069c2",
                                textDecoration: "none",
                                '&:hover': {
                                    textDecoration: 'underline'
                                }
                            }}
                        >
                            {part.text}
                        </Link>
                    );
                }
                return <React.Fragment key={index}>{part.text}</React.Fragment>;
            })}
        </Typography>
    );
}

function MarkdownBody({ text, graphData, onPmidClick }) {
    if (!text) return null;

    const lines = text.split(/\n/);
    const blocks = [];
    let paragraph = [];
    let isFirstLineOfBlock = true;

    const flushParagraph = () => {
        if (paragraph.length === 0) return;
        const paragraphText = paragraph.join("\n");

        // Split paragraph by first line as subtitle if there are multiple lines
        if (paragraph.length > 1) {
            const firstLine = paragraph[0];
            const restLines = paragraph.slice(1).join("\n");

            blocks.push({ type: "subtitle", text: firstLine });
            blocks.push({ type: "paragraph", text: restLines });
        } else {
            blocks.push({ type: "paragraph", text: paragraphText });
        }

        paragraph = [];
    };

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("### ")) {
            flushParagraph();
            blocks.push({ type: "heading", text: trimmed.replace(/^###\s+/, "") });
            return;
        }

        if (trimmed === "") {
            flushParagraph();
            return;
        }

        paragraph.push(line);
    });

    flushParagraph();

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {blocks.map((block, index) =>
                block.type === "heading" ? (
                    <Typography
                        key={`heading-${index}`}
                        sx={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#3A838B",
                        }}
                    >
                        {block.text}
                    </Typography>
                ) : block.type === "subtitle" ? (
                    <Typography
                        key={`subtitle-${index}`}
                        sx={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#0F766E",
                            marginBottom: "-8px",
                        }}
                    >
                        {block.text}
                    </Typography>
                ) : (
                    <BodyText
                        key={`paragraph-${index}`}
                        text={block.text}
                        graphData={graphData}
                        onPmidClick={onPmidClick}
                    />
                )
            )}
        </Box>
    );
}

function EvidenceItem({ item, onSelect, isActive }) {
    const isLink = Boolean(item?.href && !item?.isSkeleton);
    const clickable = Boolean((isLink || item?.onClick || onSelect) && !item?.isSkeleton);
    const Component = isLink ? "a" : clickable ? "button" : "div";
    const handleClick = (event) => {
        if (item?.isSkeleton) return;
        item?.onClick?.(item, event);
        onSelect?.(item, event);
    };

    return (
        <Paper
            elevation={0}
            component={Component}
            href={isLink ? item.href : undefined}
            target={isLink ? item.target || "_blank" : undefined}
            rel={isLink ? "noreferrer" : undefined}
            onClick={clickable ? handleClick : undefined}
            type={Component === "button" ? "button" : undefined}
            id={item?.anchorId}
            sx={{
                background: isActive ? "#ECFEFF" : "#fff",
                border: isActive ? "1px solid #67E8F9" : "1px solid #E7EBEF",
                borderRadius: "16px",
                p: 2,
                textAlign: "left",
                width: "100%",
                cursor: clickable ? "pointer" : "default",
                textDecoration: "none",
                transition: clickable ? "all 0.2s ease" : "none",
                "&:hover": clickable
                    ? {
                        background: "#F8FAFC",
                        borderColor: "#CFE3EA",
                    }
                    : undefined,
            }}
        >
            <Stack direction="row" spacing={3} alignItems="flex-start">
                {item.isSkeleton ? (
                    <Skeleton
                        variant="circular"
                        width={24}
                        height={24}
                        sx={{
                            mt: 0.2,
                            flexShrink: 0,
                        }}
                    />
                ) : (
                    <Chip
                        label={String(item.id)}
                        size="small"
                        sx={{
                            mt: 0.2,
                            flexShrink: 0,
                            fontWeight: 900,
                            fontSize: "10px",
                            bgcolor: "transparent",
                            color: "#008C8C",
                            border: "1px solid #008C8C",
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            "& .MuiChip-label": {
                                padding: 0,
                            },
                        }}
                    />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {item.isSkeleton ? (
                        <>
                            <Skeleton variant="text" width="85%" height={20} sx={{ mb: 0.5 }} />
                            <Skeleton variant="text" width="75%" height={20} sx={{ mb: 1 }} />
                            <Skeleton variant="text" width="60%" height={16} />
                        </>
                    ) : (
                        <>
                            <Typography
                                sx={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: "#008C8C",
                                    mb: 0.35,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                }}
                            >
                                {item.title}
                            </Typography>
                            {item.subtitle ? (
                                <Typography
                                    sx={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: "#94A3B8",
                                        letterSpacing: "0.02em",
                                    }}
                                >
                                    {item.subtitle}
                                </Typography>
                            ) : null}
                        </>
                    )}
                </Box>
            </Stack>
        </Paper>
    );
}

export function PlanConfirmationPage({ data, contentAnchorPrefix }) {
    const [visualTab, setVisualTab] = React.useState(0);
    const [feedbackText, setFeedbackText] = React.useState('');
    const isSingleColumn = useMediaQuery("(max-width:1199.95px)");
    const visualTabs = data?.visualMaterial?.tabs ?? [];
    const normalizedVisualIndex = visualTab < visualTabs.length ? visualTab : 0;
    const activeVisualMinHeight = visualTabs[normalizedVisualIndex]?.minHeight;
    const anchorPrefix = React.useMemo(() => {
        if (contentAnchorPrefix) return contentAnchorPrefix;
        if (data?.questionId) {
            return `result-${String(data.questionId).replace(/[^a-zA-Z0-9-_]/g, "-")}`;
        }
        return "result";
    }, [contentAnchorPrefix, data?.questionId]);
    const buildAnchorId = React.useCallback(
        (suffix) => `${anchorPrefix}-${suffix}`,
        [anchorPrefix]
    );
    const singleColumnHeight = "clamp(420px, 55vw, 560px)";
    const desktopHeight = activeVisualMinHeight
        ? `max(${activeVisualMinHeight}px, 520px)`
        : "520px";
    const visualPanelHeight = isSingleColumn ? singleColumnHeight : desktopHeight;
    const confirmationColumnsHeight = isSingleColumn ? 'auto' : visualPanelHeight;

    React.useEffect(() => {
        if (visualTab > 0 && visualTab >= visualTabs.length) {
            setVisualTab(0);
        }
    }, [visualTab, visualTabs.length]);

    const originalQuestion = data?.originalQuestion || "";
    const parsedTitle = data?.parsedTitle || "";
    const agentPlanText = data?.agentPlan || '';

    const handleSendFeedback = React.useCallback(() => {
        const trimmed = feedbackText.trim();
        if (!trimmed) return;
        data?.onSendFeedback?.(trimmed);
        setFeedbackText('');
    }, [feedbackText, data]);

    const handleProceed = React.useCallback(() => {
        data?.onProceed?.();
    }, [data]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ px: { xs: 2, md: 4 }, pt: { xs: 2.5, md: 3.5 }, pb: { xs: 0.5, md: 1 }, maxWidth: 1344, width: "100%", mx: "auto" }}>
                <Typography
                    sx={{
                        fontFamily: 'Open Sans',
                        fontWeight: 700,
                        fontSize: 20,
                        color: '#1E293B',
                        textAlign: 'left',
                        mb: 2,
                    }}
                >
                    {data?.title || 'Confirm Query & Execution Steps'}
                </Typography>

                <Box
                    sx={{
                        width: '100%',
                        borderRadius: '12px',
                        border: '2px solid #EDF0F4',
                        overflow: 'hidden',
                        mb: 2.5,
                    }}
                >
                    <Box
                        sx={{
                            height: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 2,
                            backgroundColor: '#FFFFFF',
                            gap: 2,
                        }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                            <ChatBubbleOutlineIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
                            <Typography
                                sx={{
                                    color: '#94A3B8',
                                    fontSize: 16,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {originalQuestion}
                            </Typography>
                        </Stack>
                        <Typography
                            sx={{
                                color: '#94A3B8',
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Original Query
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            height: '130px',
                            backgroundColor: '#F2F7F9',
                            px: 2,
                            py: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: 0.75,
                        }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <AutoAwesomeIcon sx={{ color: '#3A838B', fontSize: 22 }} />
                            <Typography sx={{ fontFamily: 'Open Sans', fontSize: 20, fontWeight: 700, color: '#3A838B' }}>
                                AI Interpretation
                            </Typography>
                        </Stack>
                        <Typography
                            sx={{
                                fontFamily: 'Open Sans',
                                fontSize: 20,
                                fontWeight: 600,
                                color: '#0F172A',
                                lineHeight: 1.2,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {parsedTitle}
                        </Typography>
                    </Box>
                </Box>

                <Grid container spacing={2.5} alignItems="stretch">
                    <Grid item xs={12} md={12} lg={7} id={buildAnchorId('agent-plan')} sx={{ display: 'flex', height: confirmationColumnsHeight }}>
                        <Stack spacing={2} sx={{ width: '100%', height: '100%', minWidth: 0 }}>
                            <SectionCard title="Agent Plan" sx={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ flex: 1, minHeight: 0, overflowY: isSingleColumn ? 'visible' : 'auto', pr: 0.5 }}>
                                    {agentPlanText ? (
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
                                                rehypePlugins={[rehypeRaw]}
                                                components={{
                                                    p: ({ children }) => <Typography component="p" sx={{ fontSize: 16, fontWeight: 400, color: '#475569' }}>{children}</Typography>,
                                                    li: ({ children }) => <Typography component="li" sx={{ fontSize: 16, fontWeight: 400, color: '#475569' }}>{children}</Typography>,
                                                    a: ({ href, children }) => (
                                                        <Link
                                                            href={href}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            sx={{ color: '#0069c2', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                                        >
                                                            {children}
                                                        </Link>
                                                    ),
                                                    h1: ({ children }) => <Typography component="h1" sx={{ fontSize: 26 }}>{children}</Typography>,
                                                    h2: ({ children }) => <Typography component="h2" sx={{ fontSize: 22 }}>{children}</Typography>,
                                                    h3: ({ children }) => <Typography component="h3" sx={{ fontSize: 18 }}>{children}</Typography>,
                                                    h4: ({ children }) => <Typography component="h4" sx={{ fontSize: 16 }}>{children}</Typography>,
                                                }}
                                            >
                                                {agentPlanText}
                                            </ReactMarkdown>
                                        </Box>
                                    ) : (
                                        <Typography sx={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>
                                            No plan text available.
                                        </Typography>
                                    )}
                                </Box>
                            </SectionCard>

                            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: '100%' }}>
                                <Box
                                    component="form"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        handleSendFeedback();
                                    }}
                                    sx={{
                                        flex: 1,
                                        border: '1px solid #ECF0F5',
                                        borderRadius: '12px',
                                        p: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        backgroundColor: '#FFFFFF',
                                        boxShadow: '0px 2px 8px -3px #64646F40'
                                    }}
                                >
                                    <TextField
                                        value={feedbackText}
                                        onChange={(event) => setFeedbackText(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' && !event.shiftKey) {
                                                event.preventDefault();
                                                handleSendFeedback();
                                            }
                                        }}
                                        placeholder="Tell me if I missed anything..."
                                        variant="standard"
                                        fullWidth
                                        InputProps={{
                                            disableUnderline: true,
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <ChatBubbleOutlineIcon sx={{ color: '#94A3B8', fontSize: 20, marginLeft: '4px' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiInputBase-input': {
                                                fontSize: 14,
                                                color: '#334155',
                                            },
                                        }}
                                    />
                                    <IconButton
                                        type="submit"
                                        aria-label="send"
                                        sx={{
                                            borderRadius: '999px',
                                            color: '#3A838B',
                                            width: 34,
                                            height: 34,
                                            '&:hover': {
                                                backgroundColor: '#F0FAFB',
                                            },
                                        }}
                                    >
                                        <SendIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                </Box>

                                <Button
                                    type="button"
                                    variant="contained"
                                    startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 18 }} />}
                                    onClick={handleProceed}
                                    sx={{
                                        whiteSpace: 'nowrap',
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        fontSize: 14,
                                        color: '#FFFFFF',
                                        backgroundColor: '#3A838B',
                                        border: '1px solid #ECF0F5',
                                        borderRadius: '12px',
                                        boxShadow: '0px 2px 8px -3px #64646F40',
                                        px: 2.25,
                                        height: 52,
                                        '&:hover': {
                                            backgroundColor: '#2F6E75',
                                            border: '1px solid #DCE5EE',
                                            boxShadow: '0px 2px 8px -3px #64646F40',
                                        },
                                    }}
                                >
                                    Looks Good, Proceed
                                </Button>
                            </Stack>
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={12} lg={5} id={buildAnchorId('visual-material')} sx={{ display: 'flex', height: confirmationColumnsHeight }}>
                        <SectionCard title={data?.visualMaterial?.title || 'Visual Material'} sx={{ height: '100%', width: '100%', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            {visualTabs.length > 1 ? (
                                <Box sx={{ mb: 1 }}>
                                    <ContentTabs
                                        tabs={visualTabs}
                                        value={visualTab}
                                        onChange={(_, v) => setVisualTab(v)}
                                    />
                                </Box>
                            ) : null}

                            {visualTabs.length ? (
                                visualTabs.map((tab, idx) => {
                                    const isActive = visualTabs.length === 1 || visualTab === idx;
                                    const isFullBleed = Boolean(tab.fullBleed);

                                    return (
                                        <Paper
                                            key={`plan-visual-tab-${idx}`}
                                            elevation={0}
                                            sx={{
                                                border: isFullBleed ? 'none' : '1px solid #E6EAF2',
                                                borderRadius: isFullBleed ? 0 : 3,
                                                height: isSingleColumn ? visualPanelHeight : '100%',
                                                width: '100%',
                                                bgcolor: isFullBleed ? 'transparent' : '#F7F9FD',
                                                display: isActive ? 'flex' : 'none',
                                                alignItems: isFullBleed ? 'stretch' : 'center',
                                                justifyContent: isFullBleed ? 'stretch' : 'center',
                                                p: isFullBleed ? 0 : 2,
                                            }}
                                        >
                                            {tab.content ? (
                                                typeof tab.content === 'string' ? (
                                                    <BodyText text={tab.content} graphData={data?.graphData} />
                                                ) : React.isValidElement(tab.content) ? (
                                                    typeof tab.content.type === 'function'
                                                        ? React.cloneElement(tab.content, {
                                                            isVisible: visualTabs.length === 1 || visualTab === idx,
                                                        })
                                                        : tab.content
                                                ) : (
                                                    tab.content
                                                )
                                            ) : (
                                                <Typography sx={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>
                                                    No visual material for this answer.
                                                </Typography>
                                            )}
                                        </Paper>
                                    );
                                })
                            ) : (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        border: '1px solid #E6EAF2',
                                        borderRadius: 3,
                                        height: isSingleColumn ? visualPanelHeight : '100%',
                                        width: '100%',
                                        bgcolor: '#F7F9FD',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        p: 2,
                                    }}
                                >
                                    <Typography sx={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>
                                        No visual material for this answer.
                                    </Typography>
                                </Paper>
                            )}
                        </SectionCard>
                    </Grid>
                </Grid>
            </Box>
        </ThemeProvider>
    );
}

export default function QuestionAnswerPage({ data, contentAnchorPrefix }) {
    const [visualTab, setVisualTab] = React.useState(0);
    const [evidenceTab, setEvidenceTab] = React.useState(0);
    const [activeReference, setActiveReference] = React.useState(null);
    const aiOverviewRef = React.useRef(null);
    const [aiOverviewHeight, setAiOverviewHeight] = React.useState(0);
    const isSingleColumn = useMediaQuery("(max-width:1199.95px)");
    const visualTabs = data?.visualMaterial?.tabs ?? [];
    const normalizedVisualIndex = visualTab < visualTabs.length ? visualTab : 0;
    const activeVisualMinHeight = visualTabs[normalizedVisualIndex]?.minHeight;
    const singleColumnHeight = (minPx, vw, maxPx) => `clamp(${minPx}px, ${vw}vw, ${maxPx}px)`;
    const desktopClamp = "clamp(260px, 28vw, 420px)";
    const maxAiOverviewHeight = 520;
    const baseSingleHeight = singleColumnHeight(400, 55, 520);
    const cappedAiOverviewHeight = aiOverviewHeight
        ? Math.min(aiOverviewHeight, maxAiOverviewHeight)
        : 0;
    const baseDesktopHeight = cappedAiOverviewHeight
        ? `max(${desktopClamp}, ${cappedAiOverviewHeight}px)`
        : desktopClamp;
    const visualPanelHeight = activeVisualMinHeight
        ? `max(${activeVisualMinHeight}px, ${isSingleColumn ? baseSingleHeight : baseDesktopHeight})`
        : (isSingleColumn ? baseSingleHeight : baseDesktopHeight);
    const visualPanelMaxWidth = isSingleColumn ? 640 : "100%";

    const handleVisualTabChange = (newTab) => {
        setVisualTab(newTab);
        data?.visualMaterial?.onTabChange?.(newTab);
    };

    const handleEvidenceTabChange = (newTab) => {
        setEvidenceTab(newTab);
        data?.evidences?.onTabChange?.(newTab);
    };

    const referencesTabIndex = React.useMemo(
        () => data?.evidences?.tabs?.findIndex(tab => tab.label?.toLowerCase() === "references") ?? -1,
        [data?.evidences?.tabs]
    );

    const handlePmidClick = React.useCallback((pmid) => {
        setActiveReference(pmid);
        if (referencesTabIndex >= 0) {
            setEvidenceTab(referencesTabIndex);
        }
    }, [referencesTabIndex]);

    const referenceTimeoutRef = React.useRef(null);
    React.useEffect(() => {
        if (!activeReference) return undefined;
        if (referencesTabIndex < 0 || evidenceTab !== referencesTabIndex) return undefined;

        const el = document.getElementById(`reference-item-${activeReference}`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            if (referenceTimeoutRef.current) {
                clearTimeout(referenceTimeoutRef.current);
            }
            referenceTimeoutRef.current = setTimeout(() => {
                setActiveReference(null);
                referenceTimeoutRef.current = null;
            }, 1200);
        }

        return () => {
            if (referenceTimeoutRef.current) {
                clearTimeout(referenceTimeoutRef.current);
            }
        };
    }, [activeReference, evidenceTab, referencesTabIndex]);

    const evidenceTabs = data?.evidences?.tabs ?? [];
    const showVisualSection = Boolean(data?.visualMaterial);
    const showEvidenceSection = Boolean(data?.evidences);
    const showFollowUpSection = Boolean(data?.followUp);
    const anchorPrefix = React.useMemo(() => {
        if (contentAnchorPrefix) return contentAnchorPrefix;
        if (data?.questionId) {
            return `result-${String(data.questionId).replace(/[^a-zA-Z0-9-_]/g, "-")}`;
        }
        return "result";
    }, [contentAnchorPrefix, data?.questionId]);
    const buildAnchorId = React.useCallback(
        (suffix) => `${anchorPrefix}-${suffix}`,
        [anchorPrefix]
    );

    React.useEffect(() => {
        if (visualTab > 0 && visualTab >= visualTabs.length) {
            setVisualTab(0);
        }
    }, [visualTab, visualTabs.length]);

    React.useEffect(() => {
        if (evidenceTab > 0 && evidenceTab >= evidenceTabs.length) {
            setEvidenceTab(0);
        }
    }, [evidenceTab, evidenceTabs.length]);

    React.useEffect(() => {
        const element = aiOverviewRef.current;
        if (!element || typeof ResizeObserver === "undefined") return;

        const observer = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                setAiOverviewHeight(Math.ceil(entry.contentRect.height));
            });
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, [data?.aiOverview?.sections]);

    // Handle scroll to top signal from parent
    React.useEffect(() => {
        if (data?.scrollToTop && aiOverviewRef.current) {
            requestAnimationFrame(() => {
                aiOverviewRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }, [data?.scrollToTop]);

    const getItemLabel = (item) => {
        if (typeof item === "string") return item;
        return item?.label || item?.question || item?.title || "";
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />

            <Box sx={{ px: { xs: 2, md: 4 }, pt: { xs: 2.5, md: 3.5 }, pb: { xs: 0.5, md: 1 }, maxWidth: 1344, width: "100%", mx: "auto" }}>
                {/* Header */}
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: '62px', columnGap: '40px' }}>
                    <Chip
                        label={data.questionId || "Q1"}
                        sx={{
                            bgcolor: "#0F766E",
                            color: "#fff",
                            fontWeight: 800,
                            borderRadius: 2,
                            height: 30,
                        }}
                    />
                    <Typography
                        sx={{
                            fontSize: 32, // required
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                            color: "#1E293B",
                            lineHeight: 1.15,
                        }}
                    >
                        {data.title}
                    </Typography>
                </Stack>

                {/* Main two-column area (AI Overview + Visual Material) */}
                <Grid container spacing={2.5} alignItems="stretch">
                    {/* AI Overview */}
                    <Grid item xs={12} md={12} lg={7} order={{ xs: 1, md: 1, lg: 1 }} id={buildAnchorId("ai-overview")}>
                        <SectionCard title="AI Overview">
                            <Box
                                sx={{
                                    height: 520,
                                    minHeight: 520,
                                    maxHeight: 520,
                                    overflowY: "auto",
                                    overflowX: "hidden",
                                    pr: { xs: 0, lg: 1 },
                                }}
                                ref={aiOverviewRef}
                            >
                                <Stack spacing={1.5}>
                                    {(data?.aiOverview?.sections ?? []).map((sec, idx) => (
                                        <Box key={`${sec.heading}-${idx}`} id={buildAnchorId(`ai-overview-${idx + 1}`)}>
                                            {sec.heading && !(typeof sec.body === "string" && sec.body.includes("###")) ? (
                                                <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#3A838B", mb: 0.6 }}>
                                                    <span style={{ marginRight: '6px' }}>✨</span>
                                                    {sec.heading}
                                                </Typography>
                                            ) : null}
                                            {sec.content ? sec.content : <MarkdownBody text={sec.body} graphData={data?.graphData} onPmidClick={handlePmidClick} />}
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        </SectionCard>
                    </Grid>

                    {/* Visual Material */}
                    {showVisualSection ? (
                        <Grid item xs={12} md={12} lg={5} order={{ xs: 2, md: 2, lg: 2 }} id={buildAnchorId("visual-material")}>
                            <SectionCard title={isSingleColumn ? (data?.visualMaterial?.title || "Visual Material") : null} sx={{ height: "100%" }}>
                                {visualTabs.length > 1 ? (
                                    <Box sx={{ mb: 1 }}>
                                        <ContentTabs
                                            tabs={visualTabs}
                                            value={visualTab}
                                            onChange={(_, v) => handleVisualTabChange(v)}
                                        />
                                    </Box>
                                ) : null}

                                {visualTabs.length ? (
                                    visualTabs.map((tab, idx) => {
                                        const isActive = visualTabs.length === 1 || visualTab === idx;
                                        const isFullBleed = Boolean(tab.fullBleed);

                                        return (
                                            <Paper
                                                key={`visual-tab-${idx}`}
                                                elevation={0}
                                                sx={{
                                                    border: isFullBleed ? "none" : "1px solid #E6EAF2",
                                                    borderRadius: isFullBleed ? 0 : 3,
                                                    height: visualPanelHeight,
                                                    width: "100%",
                                                    maxWidth: visualPanelMaxWidth,
                                                    mx: isSingleColumn ? "auto" : 0,
                                                    bgcolor: isFullBleed ? "transparent" : "#F7F9FD",
                                                    display: isActive ? "flex" : "none",
                                                    alignItems: isFullBleed ? "stretch" : "center",
                                                    justifyContent: isFullBleed ? "stretch" : "center",
                                                    p: isFullBleed ? 0 : 2,
                                                }}
                                            >
                                                {tab.content ? (
                                                    typeof tab.content === "string" ? (
                                                        <BodyText
                                                            text={tab.content}
                                                            graphData={data?.graphData}
                                                            onPmidClick={handlePmidClick}
                                                        />
                                                    ) : React.isValidElement(tab.content) ? (
                                                        typeof tab.content.type === "function"
                                                            ? React.cloneElement(tab.content, {
                                                                isVisible: visualTabs.length === 1 || visualTab === idx,
                                                            })
                                                            : tab.content
                                                    ) : (
                                                        tab.content
                                                    )
                                                ) : (
                                                    <Typography sx={{ fontSize: 13, color: "#94A3B8", fontWeight: 700 }}>
                                                        Visual content goes here
                                                    </Typography>
                                                )}
                                            </Paper>
                                        );
                                    })
                                ) : (
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            border: "1px solid #E6EAF2",
                                            borderRadius: 3,
                                            height: visualPanelHeight,
                                            width: "100%",
                                            maxWidth: visualPanelMaxWidth,
                                            mx: isSingleColumn ? "auto" : 0,
                                            bgcolor: "#F7F9FD",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            p: 2,
                                        }}
                                    >
                                        <Typography sx={{ fontSize: 13, color: "#94A3B8", fontWeight: 700 }}>
                                            No visual material for this answer.
                                        </Typography>
                                    </Paper>
                                )}
                            </SectionCard>
                        </Grid>
                    ) : null}

                    {/* Evidences */}
                    {showEvidenceSection ? (
                        <Grid item xs={12} md={12} lg={7} order={{ xs: 3, md: 3, lg: 3 }} id={buildAnchorId("evidences")}>
                            <SectionCard title={isSingleColumn ? (data?.evidences?.title || "Evidences") : null}>
                                {evidenceTabs.length > 0 ? (
                                    <Box sx={{ mb: 1 }}>
                                        <ContentTabs
                                            tabs={evidenceTabs}
                                            value={evidenceTab}
                                            onChange={(_, v) => handleEvidenceTabChange(v)}
                                        />
                                    </Box>
                                ) : null}

                                <Stack spacing={1.25}>
                                    {evidenceTabs.length ? (
                                        evidenceTabs.map((tab, tabIdx) => (
                                            <Box
                                                key={`evidence-tab-${tabIdx}`}
                                                sx={{ display: evidenceTabs.length === 1 || evidenceTab === tabIdx ? "block" : "none" }}
                                            >
                                                {tab.content ? (
                                                    tab.content
                                                ) : tab.items && tab.items.length ? (
                                                    <Stack spacing={1.25}>
                                                        {tab.items.map((it) => (
                                                            <EvidenceItem
                                                                key={`${it.id}-${it.title}`}
                                                                item={it}
                                                                onSelect={data?.evidences?.onSelect}
                                                                isActive={Boolean(activeReference) && it.anchorId === `reference-item-${activeReference}`}
                                                            />
                                                        ))}
                                                    </Stack>
                                                ) : (
                                                    <Typography sx={{ fontSize: 13, color: "#94A3B8", fontWeight: 700, py: 2 }}>
                                                        No evidence items for this tab.
                                                    </Typography>
                                                )}
                                            </Box>
                                        ))
                                    ) : (
                                        <Typography sx={{ fontSize: 13, color: "#94A3B8", fontWeight: 700, py: 2 }}>
                                            No evidence items for this answer.
                                        </Typography>
                                    )}
                                </Stack>
                            </SectionCard>
                        </Grid>
                    ) : null}

                    {/* Follow Up */}
                    {showFollowUpSection ? (
                        <Grid item xs={12} md={12} lg={5} order={{ xs: 4, md: 4, lg: 4 }} id={buildAnchorId("follow-up")}>
                            <SectionCard title={data?.followUp?.title ?? "Follow Up"} sx={{ height: "100%" }}>
                                <Stack spacing={1.25}>
                                    {data?.followUp?.loading ? (
                                        Array.from({ length: 3 }).map((_, idx) => (
                                            <Paper
                                                key={`follow-up-skeleton-${idx}`}
                                                elevation={0}
                                                sx={{
                                                    bgcolor: "#F8FAFC",
                                                    py: 2,
                                                    px: 3,
                                                    borderRadius: "16px",
                                                }}
                                            >
                                                <Skeleton variant="text" width="92%" height={20} sx={{ mb: 0.5 }} />
                                                <Skeleton variant="text" width="74%" height={18} />
                                            </Paper>
                                        ))
                                    ) : null}

                                    {!data?.followUp?.loading ? (
                                        (data?.followUp?.items ?? []).map((item, idx) => {
                                            const label = getItemLabel(item);
                                            const isLink = Boolean(item?.href);
                                            const clickable = Boolean(isLink || item?.onClick || data?.followUp?.onSelect);
                                            const Component = isLink ? "a" : clickable ? "button" : "div";
                                            const handleClick = (event) => {
                                                item?.onClick?.(item, event);
                                                data?.followUp?.onSelect?.(item, event);
                                            };

                                            return (
                                                <Paper
                                                    key={`${idx}-${label}`}
                                                    elevation={0}
                                                    component={Component}
                                                    href={isLink ? item.href : undefined}
                                                    target={isLink ? item.target || "_blank" : undefined}
                                                    rel={isLink ? "noreferrer" : undefined}
                                                    onClick={clickable ? handleClick : undefined}
                                                    type={Component === "button" ? "button" : undefined}
                                                    sx={{
                                                        bgcolor: "#F8FAFC",
                                                        py: 2,
                                                        px: 3,
                                                        borderRadius: "16px",
                                                        border: "none",
                                                        outline: "none",
                                                        appearance: "none",
                                                        cursor: clickable ? "pointer" : "default",
                                                        transition: clickable ? "all 0.2s ease" : "none",
                                                        textAlign: "left",
                                                        textDecoration: "none",
                                                        "&:hover": clickable
                                                            ? {
                                                                bgcolor: "#EFF6FF",
                                                            }
                                                            : undefined,
                                                    }}
                                                >
                                                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>{label}</Typography>
                                                </Paper>
                                            );
                                        })
                                    ) : null}

                                    {!data?.followUp?.loading && !data?.followUp?.items?.length ? (
                                        <Typography sx={{ fontSize: 13, color: "#94A3B8", fontWeight: 700, py: 2 }}>
                                            No follow-up questions.
                                        </Typography>
                                    ) : null}
                                </Stack>
                            </SectionCard>
                        </Grid>
                    ) : null}
                </Grid>

                {/* Note:
            Responsive behavior requirement:
            On small widths, the Grid `order` makes the layout become one column in this exact order:
            AI overview -> visual material -> evidences -> follow up.
            On md+ widths it becomes a 2-column layout like the screenshot.
        */}
            </Box>
        </ThemeProvider>
    );
}

/* ------------------ Example usage ------------------

import React from "react";
import QuestionAnswerPage from "./QuestionAnswerPage";

const pageData = {
  questionId: "Q1",
  title: "How Does The SNP Rs2402203 Influence The Expression Of CFTR In Pancreas Tissue, As Reported By GTEx?",
  aiOverview: {
    sections: [
      {
        heading: "Gene Function:",
        body:
          "The gene CFTR ... (your text here)",
      },
      {
        heading: "QTL Link:",
        body:
          "The SNP rs2402203 ... (your text here)",
      },
      {
        heading: "Specific Relation To Type 1 Diabetes:",
        body:
          "The gene CFTR ... (your text here)",
      },
    ],
  },
  visualMaterial: {
    title: "VISUAL MATERIAL",
    tabs: [
      { label: "Knowledge Graph", content: "" }, // can be JSX too
      { label: "Provenance", content: "" },
    ],
  },
  evidences: {
    title: "Evidences",
    tabs: [
      {
        label: "References",
        items: [
          { id: 1, title: "Fine-Mapping, Trans-Ancestral And Genomic Analyses Identify Causal Variants...", subtitle: "NATURE GENETICS, 2021 • PMID: 34127860" },
          { id: 2, title: "Fine-Mapping, Trans-Ancestral And Genomic Analyses Identify Causal Variants...", subtitle: "NATURE GENETICS, 2021 • PMID: 34127860" },
          { id: 3, title: "Fine-Mapping, Trans-Ancestral And Genomic Analyses Identify Causal Variants...", subtitle: "NATURE GENETICS, 2021 • PMID: 34127860" },
          { id: 4, title: "Fine-Mapping, Trans-Ancestral And Genomic Analyses Identify Causal Variants...", subtitle: "NATURE GENETICS, 2021 • PMID: 34127860" },
        ],
      },
      { label: "Provenance", items: [] },
      { label: "Pankbase Links", items: [] },
      { label: "External Links", items: [] },
    ],
  },
  followUp: {
    title: "Follow Up",
    items: [
      "What are the target cells for CFTR in the pancreas?",
      "How Does CFTR Interact With CSK In Autoimmune Processes?",
      "Are There Other SNPs In The Same Locus Linked To T1D?",
    ],
  },
};

export default function App() {
  return <QuestionAnswerPage data={pageData} />;
}

---------------------------------------------------- */
