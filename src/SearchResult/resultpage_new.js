import './scoped.css';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

import JSON5 from 'json5';
import ReactMarkdown from 'react-markdown';
import {
  useDispatch,
  useSelector,
} from 'react-redux';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import {
  Close as CloseIcon,
  InfoOutlined as InfoOutlineIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Mail as MailIcon,
  OpenInFull as OpenInFullIcon,
} from '@mui/icons-material';
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Link,
  Skeleton,
  styled,
  Tooltip,
  tooltipClasses,
  Typography,
} from '@mui/material';

import { flaskBackendAxiosInstanceNew } from '../axios/axios';
import { ErrorComponent } from '../components/IntermediatePage';
import KnowledgeGraph from '../components/KnowledgeGraph';
import QuestionAnswerPage, {
  PlanConfirmationPage,
  ResultComponentSkeleton,
} from '../components/ResultComponent';
import { AlertMessage } from '../components/SupportingMaterial';
import agentErrorImage from '../image/agent_error.png';
import VisuImage from '../image/output.png';
import { queryArticles } from '../redux/articlesSlice';
import { queryQueryResultPage } from '../redux/queryResultPage';
import { querySupportingMaterial } from '../redux/supportingMaterialSlice';
import { queryImage } from '../redux/typeToImageSlice';
import agentErrorSchema from '../schema/agent_error.json';
import tooltipsSchema from '../schema/tool_tips_schema.json';
import {
  appendConversationMessages,
  readConversationHistory,
  replaceConversationHistory,
  upsertRecentChat,
} from '../utils/chatSessionStorage';
import { addHighlight } from '../utils/textProcessing';
import {
  demoCoordData,
  demoGraphData,
} from './demo_graph_data';
import SearchResultLoading from './loading';
import sampleSummaryData from './sample.json';

// const tabs = [
//     { value: 'references', label: 'References' },
//     { value: 'empirical_evidence', label: 'Empirical Evidence' },
//     { value: 'pankbase_links', label: 'PanKbase Links' },
//     { value: 'external_links', label: 'External Links' }
// ];
const tabLabels = {
    references: 'References',
    empirical_evidence: 'Empirical Evidence',
    pankbase_links: 'PanKbase Links',
    external_links: 'External Links'
};

const DEBUG_STREAM_LOADING_ENTRIES = [
    {
        short_title: 'planning',
        title: 'Planning',
        steps: ['Generating execution plan...'],
    },
    {
        short_title: 'hirn',
        title: 'HIRN Literature Search',
        steps: ['Searching HIRN literature evidence...'],
    },
    {
        short_title: 'cypher_generation',
        title: 'Cypher Generation',
        steps: ['Building Cypher queries from plan...'],
    },
    {
        short_title: 'cypher_execution',
        title: 'Cypher Execution',
        steps: ['Executing Cypher against database...'],
    },
];

const getInitialStreamMilestones = () => ({
    planningDone: false,
    hirnDone: false,
    cypherGenerated: false,
    cypherExecuted: false,
});

const buildDebugStreamLoadingProgress = (milestones, options = {}) => {
    const entryStates = DEBUG_STREAM_LOADING_ENTRIES.map(() => ({ step: -1, isFinished: false }));

    if (!milestones.planningDone) {
        entryStates[0] = { step: 0, isFinished: false };
    } else {
        entryStates[0] = { step: 1, isFinished: true };
        if (!milestones.hirnDone) {
            entryStates[1] = { step: 0, isFinished: false };
        } else {
            entryStates[1] = { step: 1, isFinished: true };
            if (!milestones.cypherGenerated) {
                entryStates[2] = { step: 0, isFinished: false };
            } else {
                entryStates[2] = { step: 1, isFinished: true };
                if (!milestones.cypherExecuted) {
                    entryStates[3] = { step: 0, isFinished: false };
                } else {
                    entryStates[3] = { step: 1, isFinished: true };
                }
            }
        }
    }

    const completedCount = [
        milestones.planningDone,
        milestones.hirnDone,
        milestones.cypherGenerated,
        milestones.cypherExecuted,
    ].filter(Boolean).length;

    let shortTitle = DEBUG_STREAM_LOADING_ENTRIES[0].short_title;
    if (milestones.planningDone && !milestones.hirnDone) {
        shortTitle = DEBUG_STREAM_LOADING_ENTRIES[1].short_title;
    } else if (milestones.hirnDone && !milestones.cypherGenerated) {
        shortTitle = DEBUG_STREAM_LOADING_ENTRIES[2].short_title;
    } else if (milestones.cypherGenerated && !milestones.cypherExecuted) {
        shortTitle = DEBUG_STREAM_LOADING_ENTRIES[3].short_title;
    }

    const baseProgress = (completedCount / DEBUG_STREAM_LOADING_ENTRIES.length) * 100;
    const minimumProgress = Number(options?.minimumProgress || 0);

    return {
        title: 'Answering your question...',
        tip: 'Streaming progress is based on backend events.',
        cancel: 'Cancel and ask a new question',
        entries: DEBUG_STREAM_LOADING_ENTRIES,
        entryStates,
        shortTitle,
        progress: Math.max(baseProgress, minimumProgress),
    };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const CHAT_START_CACHE_KEY = 'pank_chat_start_cache_v1';
const CHAT_PENDING_PLAN_CACHE_KEY = 'pank_chat_pending_plan_v1';
const PMID_CITATION_PATTERN = /(\[\s*(?:pmid|pubmedid)\s*:\s*(\d{7,8})\s*\]|\(\s*(?:pmid|pubmedid)\s*:\s*(\d{7,8})\s*\)|\[\s*(\d{7,8})\s*\]\(\s*https?:\/\/(?:www\.)?pubmed(?:\.ncbi\.nlm\.nih\.gov|\.gov)\/\d{7,8}\/?[^)]*\))/gi;
const GRAPH_QUERY_INFLIGHT = new Map();
const FUNCTIONAL_DATA_BASE_URL = process.env.REACT_APP_FUNCTIONAL_DATA_API_URL || 'https://functional.pankgraph.org';

const isGetPrefixedQuery = (rawValue) => /^\s*GET\b/i.test(String(rawValue || ''));

const normalizeFunctionalDataRequestPath = (rawValue) => {
    const source = String(rawValue || '').trim().replace(/^['"`]|['"`]$/g, '');
    if (!source) return '';

    // Accept only cohort-traces API paths (e.g. "/api/charts/cohort-traces?..." )
    if (source.startsWith('/api/')) {
        if (source.startsWith('/api/charts/cohort-traces')) return source;
        return '';
    }

    // Accept embedded forms like: "- GET /api/..." or "```GET /api/...```"
    const getMatch = source.match(/\bGET\s+([^\s`"']+)/i);
    if (!getMatch) return '';

    let target = String(getMatch[1] || '').trim();
    if (!target) return '';

    if (/^https?:\/\//i.test(target)) {
        try {
            const parsed = new URL(target);
            target = `${parsed.pathname}${parsed.search || ''}`;
        } catch (err) {
            return '';
        }
    }

    if (!target.startsWith('/')) {
        target = `/${target}`;
    }

    if (target.startsWith('/api/charts/cohort-traces')) return target;
    return '';
};

const extractFunctionalDataRequestPath = (cypherQueries) => {
    if (!Array.isArray(cypherQueries)) return '';

    for (const query of cypherQueries) {
        const path = normalizeFunctionalDataRequestPath(query);
        if (path) return path;
    }

    return '';
};

const stripFunctionalDataRequestsFromCypher = (cypherQueries) => {
    if (!Array.isArray(cypherQueries)) return [];
    return cypherQueries
        .filter((query) => typeof query === 'string' && query.trim())
        .filter((query) => !isGetPrefixedQuery(query));
};

const safeParseJson = (rawValue, fallback = null) => {
    try {
        return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (err) {
        return fallback;
    }
};

const extractPmidsFromCitationText = (text, limit = 50) => {
    const source = String(text || '');
    const regex = new RegExp(PMID_CITATION_PATTERN.source, 'gi');
    const pmids = [];
    let match;

    while ((match = regex.exec(source)) !== null) {
        const pmid = String(match[2] || match[3] || match[4] || '').trim();
        if (!pmid || pmids.includes(pmid)) continue;
        pmids.push(pmid);
        if (pmids.length >= limit) break;
    }

    return pmids;
};

const buildArticleReferenceSubtitle = (ref) => {
    const authors = ref?.data?.authors || [];
    const authorText = authors.length <= 2
        ? authors.map((author) => author.name).join(', ')
        : `${authors[0].name}, ..., ${authors[authors.length - 1].name}`;
    const journal = ref?.data?.fulljournalname || '';
    const year = ref?.data?.pubdate ? ref.data.pubdate.slice(0, 4) : '';
    const volume = ref?.data?.volume || '';
    const issue = ref?.data?.issue ? `(${ref.data.issue})` : '';
    const pages = ref?.data?.pages ? `:${ref.data.pages}` : '';
    const citation = [journal, year].filter(Boolean).join(' ');
    const details = [volume, issue, pages].filter(Boolean).join('');
    return `${authorText}${citation ? ` • ${citation}` : ''}${details ? ` • ${details}` : ''} • PMID: ${ref.pmid}`;
};

export const utf8ToBase64 = (str) => btoa(unescape(encodeURIComponent(str)));
export const base64ToUtf8 = (base64) => {
    try {
        return decodeURIComponent(escape(atob(base64)));
    } catch (e) {
        console.log("Failed to decode base64 string:", e);
        return null;
    }
};

const validateQuestions = async (questions) => {
    const fetchQueryResults = async (question) => {
        const response = flaskBackendAxiosInstanceNew
            .post('/openCypherToQueryResult',
                { query: question.query }, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then((response) => response.data?.results?.[0]?.credible_sets)
        const data = await response;
        return { valid: data?.length > 0, question };
    };

    const validationResults = await Promise.all(questions.map(fetchQueryResults));

    return validationResults
        .filter(result => result.valid)
        .map(result => result.question);
};

const handleDownload2 = (folder, credibleSet) => {
    return `https://pank-s3-to-share.s3.us-east-1.amazonaws.com/${folder}/${credibleSet}.txt`;
};

const HtmlTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: '#219197',
        color: 'rgba(255, 255, 255, 0.87)',
        maxWidth: 220,
        fontSize: theme.typography.pxToRem(12),
        border: '1px solid #dadde9',
        shadow: '0 0 10px rgba(0, 0, 0, 0.1)',
    },
}));

export const TooltipComponent = ({ title, content }) => (
    <>
        &nbsp;&nbsp;<HtmlTooltip
            title={
                <React.Fragment>
                    <Typography color="inherit">{title}</Typography>
                    {tooltipsSchema.result[title] || content || ""}
                </React.Fragment>
            }
        >
            <InfoOutlineIcon sx={{
                position: 'relative',
                top: "6px",
                right: 0,
                color: '#1976d2',
                cursor: 'pointer',
                width: "0.7em",
            }} />
        </HtmlTooltip>
    </>);

const LoadingSkeleton = () => (
    <Container sx={{
        padding: 0, display: 'flex',
        flexDirection: 'column', justifyContent: 'space-evenly',
        fontFamily: 'Open Sans', fontWeight: 600,
        alignSelf: 'center',
        maxWidth: '1440px',
        minWidth: '1000px',
        marginLeft: '20px',
        marginRight: '20px',
        flexGrow: 1,
    }} disableGutters maxWidth={false}>
        <Skeleton variant="rectangular" width={"100%"} height={"150px"} sx={{
            backgroundColor: '#E4F0F1',
            marginBottom: '20px',
            marginTop: '30px',
            borderRadius: '20px'
        }} />
        <Grid container spacing={4} height={"100%"} sx={{
            alignItems: "stretch", marginBottom: '48px', marginTop: '-4px'
        }}>
            <Grid item xs={6} height={"740px"} display="flex">
                <Skeleton variant="rectangular" width={"100%"} height={"100%"} sx={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '20px',
                }} />
            </Grid>
            <Grid item xs={6} height={"740px"} display="flex">
                <Skeleton variant="rectangular" width={"100%"} height={"100%"} sx={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '20px',
                }} />
            </Grid>
        </Grid>
        <Skeleton variant="rectangular" width={"100%"} height={"200px"} sx={{
            backgroundColor: '#F9FAFB',
            marginBottom: '20px',
            borderRadius: '0px 20px 20px 20px',
        }} />
    </Container>
)

const NoGraphData = () => (
    <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        height: '100%',
        minHeight: 0,
        width: '100%',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    }}>

        <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: '16px', color: '#43AABA', marginBottom: '-12px', whiteSpace: 'nowrap' }}>
            No Knowledge Graph available for this answer.
        </Typography>

        <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 400, fontSize: '14px', color: '#6C6C6C' }}>
            Please contact PanKbase team for support.
        </Typography>

        <Button
            onClick={() => window.location.href =
                'mailto:wyq@umich.edu, runbomao@umich.edu, drjieliu@umich.edu, fan.feng@vumc.org, help@pankbase.org'}
            sx={{
                backgroundColor: "white",
                border: "1px solid #219197",
                height: "50px",
                borderRadius: "25px",
                paddingX: "32px",
                "&:hover": {
                    backgroundColor: "#CAD4DA",
                },
            }}
            startIcon={<MailIcon sx={{ color: "#219197", }} />}
        >
            <Typography sx={{
                color: "#219197",
                fontFamily: 'Open Sans',
                fontSize: "17px",
                fontWeight: "600",
                textTransform: "none",
            }}>
                Email Support
            </Typography>
        </Button>
    </Box>
);

const FunctionalDataChartPanel = ({ requestPath = '' }) => {
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);
    const imageRef = useRef(null);

    const normalizedRequestPath = React.useMemo(() => {
        const normalized = String(requestPath || '').trim();
        return normalizeFunctionalDataRequestPath(normalized);
    }, [requestPath]);

    const imageUrl = React.useMemo(() => {
        if (!normalizedRequestPath) return '';
        const mappedPath = normalizedRequestPath.includes('/api/charts/cohort-traces.png')
            ? normalizedRequestPath
            : normalizedRequestPath.replace('/api/charts/cohort-traces', '/api/charts/cohort-traces.png');
        const [pathPart, queryPart = ''] = mappedPath.split('?');
        const queryParams = new URLSearchParams(queryPart);
        queryParams.set('result_page', 'Yes');
        const nextQuery = queryParams.toString();
        return `${FUNCTIONAL_DATA_BASE_URL}${pathPart}${nextQuery ? `?${nextQuery}` : ''}`;
    }, [normalizedRequestPath]);

    React.useEffect(() => {
        setLoaded(false);
        setErrored(false);
    }, [imageUrl]);

    React.useEffect(() => {
        if (!imageUrl) return;
        const imgEl = imageRef.current;
        if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
            setLoaded(true);
            setErrored(false);
        }
    }, [imageUrl]);

    if (!normalizedRequestPath) {
        return (
            <Box sx={{ width: '100%', height: '100%', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ fontSize: 14, color: '#64748B' }}>
                    Functional Data request not found.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: '100%', minHeight: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!loaded && !errored ? (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress size={28} />
                </Box>
            ) : null}
            {errored ? (
                <Typography sx={{ fontSize: 14, color: '#64748B', textAlign: 'center', px: 2 }}>
                    Failed to load Functional Data chart.
                </Typography>
            ) : null}
            <Box
                component="img"
                ref={imageRef}
                src={imageUrl}
                alt="Functional Data chart"
                onLoad={() => setLoaded(true)}
                onError={() => {
                    setErrored(true);
                    setLoaded(false);
                }}
                sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: errored ? 'none' : 'block',
                    opacity: loaded ? 1 : 0.01,
                    backgroundColor: '#f8f9fa',
                }}
            />
        </Box>
    );
};

function SearchResult({ demoIndex = 1, contentAnchorPrefix, onContentMeta } = {}) {
    const dispatch = useDispatch();
    const location = useLocation();
    const searchParams = React.useMemo(
        () => new URLSearchParams(location.search),
        [location.search]
    );
    const demoMode = React.useMemo(
        () => searchParams.get('demo') === 'true',
        [searchParams]
    );
    const terminalMode = React.useMemo(
        () => searchParams.get('terminal') === 'true' || searchParams.get('debug') === 'true',
        [searchParams]
    );
    const planDemoMode = React.useMemo(
        () => searchParams.get('plandemo') === 'true',
        [searchParams]
    );
    const planDemoQuestion = React.useMemo(() => {
        const encoded = searchParams.get('question');
        if (!encoded) {
            return 'What is the function of TP53 in type 1 diabetes context?';
        }
        return base64ToUtf8(encoded) || encoded;
    }, [searchParams]);
    const chatSessionIdFromUrl = React.useMemo(() => searchParams.get('session_id') || '', [searchParams]);
    const pendingPlanSessionIdFromUrl = React.useMemo(() => searchParams.get('pending_plan_session_id') || '', [searchParams]);
    const chatRouteFromUrl = React.useMemo(() => searchParams.get('route') || '', [searchParams]);
    const functionalAutoPromptRef = React.useRef(searchParams.get('prompt_source') === 'functional_data_auto');

    const { viewSchema } = useSelector((state) => state.viewSchema);
    const { typeToImage } = useSelector((state) => state.typeToImage);
    const { agentRawResult } = useSelector((state) => state.aiAgent);
    const [aiAnswer, setAiAnswer] = useState('');
    // const [mainCypher, setMainCypher] = useState('');
    const [graphData, setGraphData] = useState(null);
    const [coordData, setCoordData] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [variables, setVariables] = useState({});
    const [referenceData, setReferenceData] = useState({});
    const [articlesData, setArticlesData] = useState([]);
    const [referencesLoading, setReferencesLoading] = useState(false);
    const [literatureLoading, setLiteratureLoading] = useState(false);
    const [imagePopupOpen, setImagePopupOpen] = useState(false);
    const [nextQuestions, setNextQuestions] = useState([]);
    const [allNextQuestions, setAllNextQuestions] = useState(null);
    const [agentErrorType, setAgentErrorType] = useState(null);
    const [aiLoading, setAiLoading] = useState(true);
    const [noGraph, setNoGraph] = useState(false);
    const [functionalDataRequestPath, setFunctionalDataRequestPath] = useState('');
    const thunkref = useRef(null);
    const navigate = useNavigate();
    const [debug, setDebug] = useState(false);
    const [question, setQuestion] = useState('');
    const [streamedSummary, setStreamedSummary] = useState('');
    const [streamedEvents, setStreamedEvents] = useState([]);
    const [thinkingLines, setThinkingLines] = useState([]);
    const [streamAnswer, setStreamAnswer] = useState('');
    const [streamComplete, setStreamComplete] = useState(false);
    const [streamMilestones, setStreamMilestones] = useState(getInitialStreamMilestones());
    const [terminalPhase, setTerminalPhase] = useState('idle');
    const [terminalLoading, setTerminalLoading] = useState(false);
    const [terminalConfirming, setTerminalConfirming] = useState(false);
    const [terminalSummaryLoading, setTerminalSummaryLoading] = useState(false);
    const [planSummary, setPlanSummary] = useState('');
    const [planParsedTitle, setPlanParsedTitle] = useState('');
    const [planSessionId, setPlanSessionId] = useState('');
    const [planRevisionWarningOpen, setPlanRevisionWarningOpen] = useState(false);
    const [planRevisionWarningMessage, setPlanRevisionWarningMessage] = useState('');
    const [questionLoadingStartedAt, setQuestionLoadingStartedAt] = useState(null);
    const [questionLoadingNow, setQuestionLoadingNow] = useState(Date.now());
    const streamSummaryRef = useRef('');
    const streamAnswerRef = useRef('');
    const thinkingBoxRef = useRef(null);
    const terminalInitializedQuestionRef = useRef('');
    const chatBootstrapRef = useRef('');
    const chatBootstrapRunIdRef = useRef(0);
    const activeGraphQueryKeyRef = useRef('');
    const activeGraphQueryPromiseRef = useRef(null);
    const [chatSessionId, setChatSessionId] = useState(chatSessionIdFromUrl);
    const [followUpDraft, setFollowUpDraft] = useState('');
    const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
    const [chatHistoryCompressed, setChatHistoryCompressed] = useState(false);
    const [followUpBlocks, setFollowUpBlocks] = useState([]);
    const followUpSendHandlerRef = useRef(null);
    const [conversationRound, setConversationRound] = useState(1);
    const followUpPendingAnchorRef = useRef(null);
    const [chatStartPendingPlanSessionId, setChatStartPendingPlanSessionId] = useState('');
    const [chatStartRevisionPrompt, setChatStartRevisionPrompt] = useState('');
    const [chatStartQuestion, setChatStartQuestion] = useState('');
    const [chatStartPlanConfirming, setChatStartPlanConfirming] = useState(false);
    const [isPlanRevisionInProgress, setIsPlanRevisionInProgress] = useState(false);
    const [isPlanGraphQueryLoading, setIsPlanGraphQueryLoading] = useState(false);
    const [planHasGraphQuery, setPlanHasGraphQuery] = useState(false);
    const [chatRouteState, setChatRouteState] = useState('');
    const [forceResultView, setForceResultView] = useState(false);
    const chatSessionIdRef = useRef(chatSessionIdFromUrl || '');
    const chatStartPendingPlanSessionIdRef = useRef('');
    const planSummaryRef = useRef('');
    const aiAnswerRef = useRef('');
    const isChatApiMode = terminalMode && !debug && !demoMode && !planDemoMode;
    const isAgentResultRoute = location.pathname === '/result-new2' || location.pathname === '/agent-result';

    useEffect(() => {
        chatSessionIdRef.current = chatSessionId || '';
    }, [chatSessionId]);

    useEffect(() => {
        chatStartPendingPlanSessionIdRef.current = chatStartPendingPlanSessionId || '';
    }, [chatStartPendingPlanSessionId]);

    useEffect(() => {
        planSummaryRef.current = planSummary || '';
    }, [planSummary]);

    useEffect(() => {
        aiAnswerRef.current = aiAnswer || '';
    }, [aiAnswer]);

    const resolveAgentErrorType = React.useCallback((err, fallbackType = 'critical_error') => {
        const status = err?.response?.status;
        const code = String(err?.code || '').toLowerCase();
        const detail = String(err?.response?.data?.detail || '');
        const message = String(err?.response?.data?.message || err?.message || '');
        const merged = `${detail} ${message}`.toLowerCase();

        if (status === 408 || status === 504 || code.includes('timeout') || code.includes('econnaborted') || merged.includes('timeout') || merged.includes('timed out')) {
            return 'time_out';
        }

        if (merged.includes('plan') || merged.includes('session_id') || merged.includes('/plan')) {
            return 'planning_failed';
        }

        if (merged.includes('answer') || merged.includes('summary') || merged.includes('final_response')) {
            return 'fail_to_give_answer';
        }

        return fallbackType;
    }, []);

    const getAgentErrorPayload = React.useCallback((errorType) => {
        const fallback = agentErrorSchema?.critical_error || {};
        const selected = agentErrorSchema?.[errorType] || fallback;
        const imageMap = {
            'agent_error.png': agentErrorImage,
        };

        return {
            title: selected?.title || fallback?.title || 'Critical Error',
            content: selected?.content || fallback?.content || 'An unexpected error occurred.',
            imageSrc: imageMap[selected?.image] || agentErrorImage,
        };
    }, []);

    const stripCypherQueriesSection = React.useCallback((markdownText) => {
        const normalized = String(markdownText || '').replace(/\r\n/g, '\n');
        return normalized
            // Keep literature sections ("## Literature Evidence" / "## References") in AI summary.
            .replace(/\s+$/g, '');
    }, []);

    const parseSummaryFromRawOutput = (rawOutput) => {
        let summaryText = '';
        let parsedResult = null;

        try {
            parsedResult = typeof rawOutput === 'string' ? JSON5.parse(rawOutput) : rawOutput;
            summaryText = parsedResult?.text?.summary || '';
        } catch (err) {
            try {
                parsedResult = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
                summaryText = parsedResult?.text?.summary || '';
            } catch (err2) {
                // noop
            }
        }

        if (!summaryText && typeof rawOutput === 'string') {
            const match = rawOutput.match(/"summary"\s*:\s*"([\s\S]*?)"\s*[},]/);
            if (match?.[1]) {
                summaryText = match[1]
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\');
            }
        }

        if (summaryText.startsWith('Answer\n')) {
            summaryText = summaryText.slice('Answer\n'.length);
        }

        return stripCypherQueriesSection(summaryText);
    };

    const parseFinalResponsePayload = (rawResponse) => {
        const responseData = typeof rawResponse === 'string'
            ? JSON5.parse(rawResponse)
            : rawResponse;
        return {
            summary: stripCypherQueriesSection(responseData?.text?.summary || ''),
            cypherQueries: responseData?.text?.cypher || [],
            followUpQuestions: responseData?.text?.follow_up_questions || [],
        };
    };

    const parseAnswerStringPayload = (answerString) => {
        const outer = JSON5.parse(answerString || '{}');
        const text = outer?.text;
        if (!text) {
            return { summary: '', cypherQueries: [], followUpQuestions: [] };
        }
        if (typeof text === 'string') {
            return { summary: stripCypherQueriesSection(text), cypherQueries: [], followUpQuestions: [] };
        }
        return {
            summary: stripCypherQueriesSection(text.summary || ''),
            cypherQueries: text.cypher || [],
            followUpQuestions: text.follow_up_questions || [],
        };
    };

    const normalizeFollowUpItems = React.useCallback((items) => {
        if (!Array.isArray(items)) return [];
        return items
            .filter((item) => typeof item === 'string' && item.trim())
            .map((item) => ({ question: item.trim(), link: '' }));
    }, []);

    const parseChatResponseContent = React.useCallback((payload) => {
        const answerMarkdown = String(payload?.answer_markdown || '').trim();
        let parsedFollowUps = [];

        try {
            const parsed = parseAnswerStringPayload(payload?.answer || '{}');
            parsedFollowUps = normalizeFollowUpItems(parsed.followUpQuestions || []);
        } catch (err) {
            parsedFollowUps = [];
        }

        const topLevelFollowUps = normalizeFollowUpItems(payload?.follow_up_questions);
        const mergedFollowUps = parsedFollowUps.length ? parsedFollowUps : topLevelFollowUps;

        if (answerMarkdown) {
            return {
                summary: answerMarkdown,
                followUpQuestions: mergedFollowUps,
            };
        }

        try {
            const parsed = parseAnswerStringPayload(payload?.answer || '{}');
            return {
                summary: parsed.summary || '',
                followUpQuestions: mergedFollowUps,
            };
        } catch (err) {
            return {
                summary: '',
                followUpQuestions: mergedFollowUps,
            };
        }
    }, [normalizeFollowUpItems]);

    const summaryHasLiteratureSection = React.useCallback((summaryText) => {
        const text = String(summaryText || '');
        return /##\s*Literature\s*Evidence/i.test(text) || /##\s*References/i.test(text);
    }, []);

    const stripLiteratureSupportingSections = React.useCallback((markdownText) => {
        const text = String(markdownText || '').replace(/\r\n/g, '\n');
        if (!text) return '';

        const lines = text.split('\n');
        const output = [];
        let skippingSection = false;

        const isExcludedHeading = (lineText) => /^##\s*(Additional\s+HIRN\s+Evidence|References)\s*$/i.test(lineText.trim());
        const isLevel2Heading = (lineText) => /^##\s+/.test(lineText.trim());

        for (const line of lines) {
            if (isExcludedHeading(line)) {
                skippingSection = true;
                continue;
            }

            if (skippingSection && isLevel2Heading(line)) {
                skippingSection = false;
            }

            if (!skippingSection) {
                output.push(line);
            }
        }

        return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }, []);

    const getReferenceParsingBody = React.useCallback((markdownText) => {
        return stripLiteratureSupportingSections(markdownText || '');
    }, [stripLiteratureSupportingSections]);

    const appendLiteratureBlock = React.useCallback((summaryText, literatureMarkdown) => {
        const base = String(summaryText || '').trim();
        const block = stripLiteratureSupportingSections(literatureMarkdown || '');
        if (!base || !block) return base;
        if (summaryHasLiteratureSection(base)) return base;
        return `${base}\n\n${block}`;
    }, [summaryHasLiteratureSection, stripLiteratureSupportingSections]);

    const fetchLiteratureMarkdown = React.useCallback(async (sessionId) => {
        const sid = String(sessionId || '').trim();
        if (!sid) return '';

        setLiteratureLoading(true);
        try {
            const response = await flaskBackendAxiosInstanceNew.post(
                'https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/literature',
                { session_id: sid },
                { headers: { 'Content-Type': 'application/json' } }
            );
            return String(response?.data?.markdown || '').trim();
        } catch (err) {
            console.error('[Literature] fetch failed:', err?.response?.data || err?.message || err);
            return '';
        } finally {
            setLiteratureLoading(false);
        }
    }, []);

    const revisePlanSession = React.useCallback(async (sessionId, prompt) => {
        const response = await flaskBackendAxiosInstanceNew.post(
            'https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/plan/revise',
            {
                session_id: sessionId,
                prompt,
            },
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );
        return response?.data || {};
    }, []);

    const hasPendingFollowUpWork = React.useMemo(
        () => followUpSubmitting || followUpBlocks.some((block) => block?.type === 'loading' || block?.type === 'plan' || block?.confirming),
        [followUpSubmitting, followUpBlocks]
    );
    const isFollowUpPlanRevisionInProgress = React.useMemo(
        () => followUpBlocks.some((block) => Boolean(block?.revising)),
        [followUpBlocks]
    );

    const isQuestionComplete = React.useMemo(
        () => !aiLoading && !terminalLoading && !terminalSummaryLoading && terminalPhase !== 'confirm' && !hasPendingFollowUpWork,
        [aiLoading, terminalLoading, terminalSummaryLoading, terminalPhase, hasPendingFollowUpWork]
    );

    const buildFollowUpAnswerData = React.useCallback((block, index) => {
        let followUpTableTitleIndex = 0;
        const title = block?.title || block?.question || `Follow-up ${index + 1}`;
        const answerText = block?.summary || (block?.confirming ? 'AI summary is generating...' : '');
        const showGraphSection = String(block?.route || '') !== 'follow_up';
        const pmids = extractPmidsFromCitationText(getReferenceParsingBody(block?.summary), 30);
        const referencesData = Array.isArray(block?.referencesData) && block.referencesData.length
            ? block.referencesData
            : pmids.map((pmid) => ({ pmid, data: {} }));
        const followUpReferenceItems = referencesData.map((ref, pmidIndex) => ({
            id: pmidIndex + 1,
            title: ref?.data?.title || `PMID: ${ref.pmid}`,
            subtitle: buildArticleReferenceSubtitle(ref),
            href: `https://pubmed.gov/${ref.pmid}`,
            pmid: ref.pmid,
            anchorId: `reference-item-followup-${block?.id || index + 1}-${ref.pmid}-${pmidIndex + 1}`,
        }));
        const followUpAnchorByPmid = followUpReferenceItems.reduce((acc, item) => {
            if (!acc[item.pmid]) {
                acc[item.pmid] = item.anchorId;
            }
            return acc;
        }, {});
        const followUpEvidenceTabs = followUpReferenceItems.length
            ? [{ label: 'References', items: followUpReferenceItems }]
            : [];
        const followUpKnowledgeGraphContent = block?.graphData ? (
            <Box sx={{ width: '100%', height: '100%' }}>
                <KnowledgeGraph
                    graphData={block.graphData}
                    coordData={block.coordData}
                    sx={{ height: '100%' }}
                    containerHeight="100%"
                />
            </Box>
        ) : block?.graphLoading ? (
            <Box sx={{ width: '100%', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={28} />
            </Box>
        ) : block?.noGraph ? (
            <NoGraphData />
        ) : (
            <NoGraphData />
        );
        const followUpFunctionalTab = block?.functionalDataRequestPath
            ? {
                label: 'Functional Data',
                content: <FunctionalDataChartPanel requestPath={block.functionalDataRequestPath} />,
            }
            : null;
        const followUpVisualTabs = (isAgentResultRoute && followUpFunctionalTab)
            ? [
                followUpFunctionalTab,
                { label: 'Knowledge Graph', content: followUpKnowledgeGraphContent },
            ]
            : [
                { label: 'Knowledge Graph', content: followUpKnowledgeGraphContent },
                ...(followUpFunctionalTab ? [followUpFunctionalTab] : []),
            ];

        return {
            questionId: `Q${index + 2}`,
            title,
            aiOverview: {
                sections: [
                    {
                        content: (
                            <Box sx={{ fontSize: 16, color: '#475569', lineHeight: 1.7 }}>
                                {block?.confirming ? (
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                        <Typography component="span" sx={{ fontSize: 16, color: '#475569' }}>
                                            AI summary is generating...
                                        </Typography>
                                        <CircularProgress size={14} />
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeRaw]}
                                            components={{
                                                p: ({ children }) => <Typography component="p" sx={{ fontSize: 16, fontWeight: 400, color: '#475569' }}>{renderChildrenWithPmids(children, `followup-p-${block?.id || index}`, false, followUpAnchorByPmid)}</Typography>,
                                                li: ({ children }) => <Typography component="li" sx={{ fontSize: 16, fontWeight: 400, color: '#475569' }}>{renderChildrenWithPmids(children, `followup-li-${block?.id || index}`, false, followUpAnchorByPmid)}</Typography>,
                                                a: ({ href, children }) => {
                                                    const pmid = extractPubmedIdFromHref(href);
                                                    if (pmid) {
                                                        return renderPmidPill(pmid, `followup-a-${block?.id || index}`, followUpAnchorByPmid);
                                                    }

                                                    return (
                                                        <Link
                                                            href={href}
                                                            target={href?.startsWith('#') ? undefined : '_blank'}
                                                            rel={href?.startsWith('#') ? undefined : 'noreferrer'}
                                                            sx={{ color: '#0069c2', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                                            onClick={(event) => scrollToReferenceAnchor(href, event)}
                                                        >
                                                            {renderChildrenWithPmids(children, `followup-a-${block?.id || index}`, true, followUpAnchorByPmid)}
                                                        </Link>
                                                    );
                                                },
                                                strong: ({ children }) => <strong>{renderChildrenWithPmids(children, `followup-strong-${block?.id || index}`, false, followUpAnchorByPmid)}</strong>,
                                                em: ({ children }) => <em>{renderChildrenWithPmids(children, `followup-em-${block?.id || index}`, false, followUpAnchorByPmid)}</em>,
                                                table: ({ children }) => {
                                                    const { header, bodyRows } = extractTableMatrix(children);
                                                    const shouldNumberTable = !(header.length > 0 && bodyRows.length === 1);
                                                    if (shouldNumberTable) {
                                                        followUpTableTitleIndex += 1;
                                                    }
                                                    return <MarkdownTableWithTools title={shouldNumberTable ? `Table ${followUpTableTitleIndex}` : ''}>{children}</MarkdownTableWithTools>;
                                                },
                                            }}
                                        >
                                            {answerText}
                                        </ReactMarkdown>
                                        {block?.literatureLoading ? (
                                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                                <Typography component="span" sx={{ fontSize: 16, color: '#475569' }}>
                                                    Summarizing literature...
                                                </Typography>
                                                <CircularProgress size={14} />
                                            </Box>
                                        ) : null}
                                    </Box>
                                )}
                            </Box>
                        ),
                    },
                ],
            },
            ...(showGraphSection ? {
                visualMaterial: {
                    title: 'Visual Material',
                    noGraph: Boolean(block?.noGraph && !block?.functionalDataRequestPath),
                    tabs: followUpVisualTabs,
                },
            } : {}),
            ...(followUpEvidenceTabs.length ? {
                evidences: {
                    title: 'Evidences',
                    tabs: followUpEvidenceTabs,
                },
            } : {}),
            followUp: {
                title: 'Follow Up',
                disabled: !isQuestionComplete,
                items: (block?.followUpQuestions || []).map((item) => ({ label: stripHtml(item.question) })),
                onSelect: (item, event) => {
                    event?.preventDefault?.();
                    const text = stripHtml(item?.label || item?.question || '');
                    if (!text) return;
                    if (!isQuestionComplete) return;
                    if (isChatApiMode) {
                        followUpSendHandlerRef.current?.(text);
                        return;
                    }
                    const encodedQuery = encodeURIComponent(utf8ToBase64(text));
                    navigate(`/result-new2?question=${encodedQuery}&terminal=true`);
                },
            },
        };
    }, [isQuestionComplete, isChatApiMode, navigate, getReferenceParsingBody]);

    const extractParsedTitle = (summaryText, fallbackQuestion) => {
        const lines = (summaryText || '')
            .split('\n')
            .map((line) => line.replace(/^#+\s*/, '').trim())
            .filter(Boolean);
        return lines[0] || fallbackQuestion || 'Agent-generated execution plan';
    };

    const removeTerminalPromptTail = (markdownText) => {
        const lines = String(markdownText || '').replace(/\r\n/g, '\n').split('\n');
        // Drop the last 2 lines because they are agent terminal prompt instructions.
        const trimmedLines = lines.length > 2 ? lines.slice(0, -2) : [];
        return trimmedLines.join('\n').replace(/\s+$/g, '');
    };

    const parsePlanMarkdownForUI = (markdownText) => {
        const cleaned = removeTerminalPromptTail(markdownText || '');
        const lines = cleaned.split('\n');

        let firstNonEmpty = 0;
        while (firstNonEmpty < lines.length && !lines[firstNonEmpty].trim()) {
            firstNonEmpty += 1;
        }

        if (lines[firstNonEmpty]?.trim() !== '## Interpreted Question') {
            return {
                interpretedQuestion: '',
                planMarkdown: cleaned,
            };
        }

        let cursor = firstNonEmpty + 1;
        while (cursor < lines.length && !/^##\s+/.test(lines[cursor].trim())) {
            cursor += 1;
        }

        const interpretedQuestion = (
            lines
                .slice(firstNonEmpty + 1, cursor)
                .find((line) => line.trim()) || ''
        ).trim();

        const remaining = [
            ...lines.slice(0, firstNonEmpty),
            ...lines.slice(cursor),
        ];

        while (remaining.length && !remaining[0].trim()) {
            remaining.shift();
        }

        return {
            interpretedQuestion,
            planMarkdown: remaining.join('\n').replace(/^\s*\n+/, ''),
        };
    };

    const extractPlanCypherQueries = React.useCallback((planJson) => {
        const steps = Array.isArray(planJson?.steps) ? planJson.steps : [];
        return steps
            .map((step) => (typeof step?.cypher === 'string' ? step.cypher : ''))
            .filter((cypher) => typeof cypher === 'string' && cypher.length > 0);
    }, []);

    const extractPayloadCypherQueries = React.useCallback((payload) => {
        const answerCypherQueries = (() => {
            try {
                const parsed = parseAnswerStringPayload(payload?.answer || '{}');
                return Array.isArray(parsed?.cypherQueries) ? parsed.cypherQueries : [];
            } catch (err) {
                return [];
            }
        })();

        const topLevelCypherQueries = [
            ...(Array.isArray(payload?.text?.cypher) ? payload.text.cypher : []),
            ...(Array.isArray(payload?.cypher) ? payload.cypher : []),
            ...(Array.isArray(payload?.cypherQueries) ? payload.cypherQueries : []),
        ];

        const planCypherQueries = extractPlanCypherQueries(payload?.plan_json || {});
        const merged = [...answerCypherQueries, ...topLevelCypherQueries, ...planCypherQueries]
            .filter((query) => typeof query === 'string');

        return merged;
    }, [extractPlanCypherQueries]);

    const queryGraphFromCypher = React.useCallback(async (cypherQueries) => {
        const graphCypherQueries = (Array.isArray(cypherQueries) ? cypherQueries : [])
            .filter((query) => typeof query === 'string' && query.trim())
            .filter((query) => !isGetPrefixedQuery(query));

        const hasRenderableGraph = (combinedQueryResult) => {
            const nodes = Array.isArray(combinedQueryResult?.nodes) ? combinedQueryResult.nodes : [];
            const edges = Array.isArray(combinedQueryResult?.edges) ? combinedQueryResult.edges : [];
            return nodes.length > 0 || edges.length > 0;
        };

        if (!graphCypherQueries?.length) {
            return {
                graphData: null,
                coordData: null,
                noGraph: true,
            };
        }

        const queryKey = JSON.stringify(graphCypherQueries);
        if (GRAPH_QUERY_INFLIGHT.has(queryKey)) {
            return GRAPH_QUERY_INFLIGHT.get(queryKey);
        }

        const requestPromise = (async () => {
            try {
                const response = await dispatch(queryQueryResultPage({
                    payload: {
                        cypher: graphCypherQueries,
                        rdb_query: '',
                    },
                    agent: true,
                }));

                if (hasRenderableGraph(response?.payload?.combined_query_result)) {
                    return {
                        graphData: response.payload.combined_query_result,
                        coordData: response?.payload?.xy_json || null,
                        noGraph: false,
                    };
                }

                return {
                    graphData: null,
                    coordData: null,
                    noGraph: true,
                };
            } catch (err) {
                console.error('[Terminal Flow] Graph query error:', err?.message || err);
                return {
                    graphData: null,
                    coordData: null,
                    noGraph: true,
                };
            } finally {
                GRAPH_QUERY_INFLIGHT.delete(queryKey);
            }
        })();

        GRAPH_QUERY_INFLIGHT.set(queryKey, requestPromise);
        return requestPromise;
    }, [dispatch]);

    const fetchReferenceArticles = React.useCallback(async (summaryText) => {
        const bodyText = getReferenceParsingBody(summaryText);
        const pmids = extractPmidsFromCitationText(bodyText, 50);
        if (!pmids.length) {
            return [];
        }

        try {
            const response = await dispatch(queryArticles({
                db: 'pubmed',
                id: pmids.join(','),
                retmode: 'json',
            }));
            const result = response?.payload?.result || {};
            return pmids.map((pmid) => ({
                pmid,
                data: result[pmid] || {},
                doi: result[pmid]?.articleids?.find((id) => id.idtype === 'doi')?.value || '',
            }));
        } catch (err) {
            console.error('[Follow-up] Article fetch error:', err);
            return [];
        }
    }, [dispatch, getReferenceParsingBody]);

    const fetchGraphFromCypher = React.useCallback(async (cypherQueries) => {
        setFunctionalDataRequestPath(extractFunctionalDataRequestPath(cypherQueries));
        const cypherKey = JSON.stringify(Array.isArray(cypherQueries) ? cypherQueries : []);

        if (activeGraphQueryKeyRef.current === cypherKey && activeGraphQueryPromiseRef.current) {
            await activeGraphQueryPromiseRef.current;
            return;
        }

        const graphPromise = (async () => {
            const graphResult = await queryGraphFromCypher(cypherQueries);
            if (graphResult.graphData) {
                setGraphData(graphResult.graphData);
                setCoordData(graphResult.coordData || null);
                setNoGraph(false);
            } else {
                setGraphData(null);
                setCoordData(null);
                setNoGraph(true);
            }
        })();

        activeGraphQueryKeyRef.current = cypherKey;
        activeGraphQueryPromiseRef.current = graphPromise;

        try {
            await graphPromise;
        } finally {
            if (activeGraphQueryKeyRef.current === cypherKey) {
                activeGraphQueryPromiseRef.current = null;
            }
        }
    }, [queryGraphFromCypher]);

    const updateMilestoneSequence = (stage) => {
        if (stage === 'start') {
            setStreamMilestones(getInitialStreamMilestones());
        } else if (stage === 'revise') {
            setStreamMilestones(getInitialStreamMilestones());
        }
    };

    const runPlanLoadingMilestones = React.useCallback(async () => {
        setStreamMilestones((prev) => ({ ...prev, planningDone: true }));
        await sleep(1200);
        setStreamMilestones((prev) => ({ ...prev, hirnDone: true }));
        await sleep(1200);
        setStreamMilestones((prev) => ({ ...prev, cypherGenerated: true }));
    }, []);

    useEffect(() => {
        if (demoMode || planDemoMode) {
            return;
        }
        const helperFunction = async () => {
            if (!allNextQuestions) {
                return;
            }
            const validatedList = (await Promise.all(
                allNextQuestions.map(async (nextQuestion) =>
                    await validateQuestions(nextQuestion)
                )
            )).flatMap(
                (validatedQuestion) =>
                    validatedQuestion[0] ? [validatedQuestion[0]] : []
            )

            const replacedList = (validatedList?.length > 0 ? validatedList : [])
                .map(
                    (validatedQuestion) => ({
                        ...validatedQuestion,
                        question: addHighlight(validatedQuestion.question),
                    })
                )
            setNextQuestions(replacedList);
        }
        helperFunction();
    }, [allNextQuestions, demoMode, planDemoMode]);

    // initialize the reference data from viewSchema w/ replacements
    useEffect(() => {
        if (demoMode || planDemoMode) {
            return;
        }
        if (!!graphData) {
            dispatch(querySupportingMaterial({
                "query_result": graphData
            })).then((response) => {
                const emp_evidence = response.payload?.resources_tabs?.empirical_evidence || {};
                if (emp_evidence.lambda_function == "type_to_image") {
                    console.log('Fetching image for empirical evidence:', emp_evidence);
                    dispatch(queryImage({
                        imageType: 'manhattan',
                        link: `${emp_evidence.folder}/${emp_evidence.credible_set}`
                    })).catch((error) => {
                        console.log('[WARNING] Error fetching image:', error);
                    });
                }
                setReferenceData(response.payload?.resources_tabs || {});
            });
        }
        // if (viewSchema?.resources_tabs) {
        //     const data = viewSchema.resources_tabs;
        //     const newPankbaseLinks = data.pankbase_links.map((item) => item.map((i) => replaceVariables(i, variables)));
        //     const newExternalLinks = data.external_links.map((item) => item.map((i) => replaceVariables(i, variables)));
        //     setReferenceData({
        //         ...data,
        //         empirical_evidence: data.empirical_evidence && {
        //             ...data.empirical_evidence,
        //             link: replaceVariables(data.empirical_evidence.link, variables)
        //         },
        //         pankbase_links: newPankbaseLinks,
        //         external_links: newExternalLinks
        //     });
        // }
    }, [graphData, demoMode, planDemoMode]);

    // init: get URL parameters and dispatch actions
    useEffect(() => {
        if (demoMode || planDemoMode) {
            return;
        }
        const decodedQuestion = base64ToUtf8(searchParams?.get('question'));
        setQuestion(decodedQuestion);
        const debug = searchParams.get('debug') === 'true';
        setDebug(debug);
        console.log('Received question:', decodedQuestion);
        if (!decodedQuestion) {
            console.log('[ERROR] No question found in URL parameters.');
            setAgentErrorType('critical_error');
            return;
        }

        setAgentErrorType(null);
        setNextQuestions([]);

        if (terminalMode) {
            setCurrentQuestion(decodedQuestion);
            setAiLoading(false);
            return;
        }

        if (debug) {
            setCurrentQuestion(decodedQuestion);
            setAiLoading(false);
            // In debug mode, don't disable graph - it will be populated from final_response event
            return;
        }
    }, [demoMode, planDemoMode, terminalMode, searchParams]);

    useEffect(() => {
        if (!debug || terminalMode || demoMode || planDemoMode) {
            return undefined;
        }

        let chunkTimer = null;
        setStreamedEvents([]);
        setThinkingLines([]);
        setStreamAnswer('');
        streamAnswerRef.current = '';
        setStreamedSummary('');
        streamSummaryRef.current = '';
        setStreamComplete(false);
        setStreamMilestones(getInitialStreamMilestones());

        // Call real streaming API
        const callStreamingAPI = async () => {
            try {
                console.log('[Stream API] Calling:', 'https://agent.pankgraph.org/query/stream', 'with question:', question);
                const response = await fetch('https://agent.pankgraph.org/query/stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ question: question || '', agent_name: 'pankbase' }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines[lines.length - 1];

                    for (let i = 0; i < lines.length - 1; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        // Skip lines that don't look like JSON (filter out server logs)
                        if (!line.startsWith('{') && !line.startsWith('[')) {
                            console.debug('[Stream API] Skipping non-JSON line:', line.substring(0, 50));
                            continue;
                        }

                        try {
                            const event = JSON.parse(line);
                            console.log('[Stream API] Event received:', event.event);
                            // Process event with the same handler as simulator
                            handleStreamEvent(event);
                        } catch (e) {
                            console.error('[Stream API] Failed to parse event line:', e, 'line:', line.substring(0, 100));
                        }
                    }
                }

                // Process any remaining buffer
                if (buffer.trim()) {
                    // Skip if buffer doesn't look like JSON
                    if (buffer.trim().startsWith('{') || buffer.trim().startsWith('[')) {
                        try {
                            const event = JSON.parse(buffer);
                            console.log('[Stream API] Final event:', event.event);
                            handleStreamEvent(event);
                        } catch (e) {
                            console.error('[Stream API] Failed to parse final event:', e);
                        }
                    } else {
                        console.debug('[Stream API] Skipping non-JSON buffer:', buffer.substring(0, 50));
                    }
                }

                // Mark stream as complete
                setStreamComplete(true);
            } catch (error) {
                console.error('[Stream API] Error:', error);
                setStreamComplete(true);
            }
        };

        const handleStreamEvent = (event) => {
            setStreamedEvents((prev) => [...prev, event]);

            if (event?.event === 'complexity_classified') {
                setStreamMilestones((prev) => ({ ...prev, planningDone: true }));
            }

            if (event?.event === 'plan_generated' || event?.event === 'planner_decision') {
                setStreamMilestones((prev) => ({ ...prev, planningDone: true, cypherGenerated: true }));
            }

            if (event?.event === 'hirn_result') {
                setStreamMilestones((prev) => ({ ...prev, hirnDone: true }));
            }

            if (event?.event === 'cypher_executing') {
                setStreamMilestones((prev) => ({ ...prev, cypherGenerated: true }));
            }

            if (event?.event === 'cypher_result') {
                setStreamMilestones((prev) => ({ ...prev, cypherExecuted: true }));
            }

            if (event?.event === 'stream_complete') {
                if (streamAnswerRef.current || streamSummaryRef.current) {
                    setStreamComplete(true);
                }
                return;
            }

            if (event?.event === 'format_done') {
                if (streamAnswerRef.current || streamSummaryRef.current) {
                    setStreamComplete(true);
                }
            }

            if (event?.event === 'format_raw_output' && event?.data?.output) {
                let summaryText = '';
                let parsedResult = null;
                let parseError = null;
                const rawOutput = event.data.output;

                console.log('[format_raw_output] ========== RAW OUTPUT ==========');
                console.log('[format_raw_output] Type:', typeof rawOutput);
                console.log('[format_raw_output] Length:', typeof rawOutput === 'string' ? rawOutput.length : 'N/A');
                console.log('[format_raw_output] Content:', rawOutput);
                console.log('[format_raw_output] ===================================');
                console.log('[format_raw_output] Attempting to parse output...');

                // Try JSON5 first (more lenient parser)
                try {
                    parsedResult = typeof rawOutput === 'string' ? JSON5.parse(rawOutput) : rawOutput;
                    summaryText = parsedResult?.text?.summary || '';
                    console.log('[format_raw_output] ✓ JSON5 parse successful, summary length:', summaryText.length);
                } catch (err) {
                    parseError = err;
                    console.error('[format_raw_output] JSON5 parse failed:', err.message);

                    // Try standard JSON.parse as fallback
                    try {
                        parsedResult = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
                        summaryText = parsedResult?.text?.summary || '';
                        console.log('[format_raw_output] ✓ JSON.parse fallback successful, summary length:', summaryText.length);
                    } catch (err2) {
                        console.error('[format_raw_output] JSON.parse fallback also failed:', err2.message);
                        console.error('[format_raw_output] Raw output preview:', typeof rawOutput === 'string' ? rawOutput.substring(0, 200) : rawOutput);
                    }
                }

                // If parsing failed, try regex extraction
                if (!summaryText && typeof rawOutput === 'string') {
                    console.log('[format_raw_output] Attempting regex extraction...');
                    const match = rawOutput.match(/"summary"\s*:\s*"([\s\S]*?)"\s*[},]/);
                    if (match?.[1]) {
                        summaryText = match[1]
                            .replace(/\\n/g, '\n')
                            .replace(/\\"/g, '"')
                            .replace(/\\\\/g, '\\');
                        console.log('[format_raw_output] ✓ Regex extraction successful, summary length:', summaryText.length);
                    } else {
                        console.error('[format_raw_output] ✗ Regex extraction failed - no match found');
                    }
                }

                if (summaryText.startsWith('Answer\n')) {
                    summaryText = summaryText.slice('Answer\n'.length);
                }

                if (!summaryText) {
                    console.error('[format_raw_output] ✗ FINAL RESULT: No summary text extracted');
                    if (parseError) {
                        console.error('[format_raw_output] Parse error details:', parseError);
                    }
                    return;
                }

                summaryText = stripCypherQueriesSection(summaryText);
                console.log('[format_raw_output] ✓ FINAL RESULT: Summary ready, length:', summaryText.length);

                setStreamAnswer(summaryText);
                streamAnswerRef.current = summaryText;

                if (chunkTimer) {
                    clearInterval(chunkTimer);
                }

                const chunkSize = 160;
                setStreamedSummary(summaryText.slice(0, chunkSize));
                streamSummaryRef.current = summaryText.slice(0, chunkSize);
                let index = 0;
                chunkTimer = setInterval(() => {
                    index += chunkSize;
                    const nextChunk = summaryText.slice(0, index);
                    setStreamedSummary(nextChunk);
                    streamSummaryRef.current = nextChunk;
                    if (index >= summaryText.length) {
                        clearInterval(chunkTimer);
                        chunkTimer = null;
                        setStreamedSummary(summaryText);
                        streamSummaryRef.current = summaryText;
                    }
                }, 200);
            }

            if (!event?.event) {
                return;
            }

            if (event?.event === 'final_response' && event?.data?.response) {
                console.log('[final_response] Processing final response...');
                console.log('[final_response] Raw response type:', typeof event.data.response);
                console.log('[final_response] Raw response:',
                    typeof event.data.response === 'string'
                        ? event.data.response
                        : JSON.stringify(event.data.response)
                );

                try {
                    let responseData = typeof event.data.response === 'string'
                        ? JSON5.parse(event.data.response)
                        : event.data.response;

                    console.log('[final_response] Parsed response data:', responseData);
                    console.log('[final_response] Response structure:', {
                        hasTo: !!responseData?.to,
                        hasText: !!responseData?.text,
                        hasTemplate: !!responseData?.text?.template_matching,
                        hasCypher: !!responseData?.text?.cypher,
                        hasSummary: !!responseData?.text?.summary,
                    });

                    const cypherQueries = responseData?.text?.cypher || [];
                    const summary = stripCypherQueriesSection(responseData?.text?.summary || '');
                    const followUpQuestions = responseData?.text?.follow_up_questions || [];

                    console.log('[final_response] Extracted cypher queries:', cypherQueries.length, 'queries');
                    console.log('[final_response] Summary length:', summary.length, 'chars');

                    // Update summary from final_response
                    if (summary) {
                        console.log('[final_response] Setting summary from final_response');
                        setStreamAnswer(summary);
                        streamAnswerRef.current = summary;
                    }

                    if (Array.isArray(followUpQuestions) && followUpQuestions.length > 0) {
                        setNextQuestions(
                            followUpQuestions
                                .filter((item) => typeof item === 'string' && item.trim())
                                .map((item) => ({ question: item.trim(), link: '' }))
                        );
                    }

                    if (cypherQueries.length > 0) {
                        console.log('[final_response] Querying graph data with', cypherQueries.length, 'queries...');
                        fetchGraphFromCypher(cypherQueries).catch((err) => {
                            console.error('[final_response] ✗ Graph query error:', err?.message || err);
                            setNoGraph(true);
                        });
                    } else {
                        console.log('[final_response] ⚠ No cypher queries found');
                        setGraphData(null);
                        setNoGraph(true);
                        setFunctionalDataRequestPath('');
                    }
                } catch (err) {
                    console.error('[final_response] ✗ Error processing response:');
                    console.error('[final_response] Error message:', err.message);
                    console.error('[final_response] Error stack:', err.stack);
                    console.error('[final_response] Raw response:', event.data.response);
                }
            }

            const formatTime = (ts) => {
                if (!ts) return '';
                try {
                    return new Date(ts * 1000).toLocaleTimeString();
                } catch (err) {
                    return '';
                }
            };
            const compactData = (data, eventName) => {
                if (!data) return '';
                if (eventName === 'format_raw_output') {
                    const outputValue = data?.output;
                    const size = typeof outputValue === 'string'
                        ? outputValue.length
                        : JSON.stringify(outputValue || {}).length;
                    return `output_chars=${size}`;
                }
                const raw = JSON.stringify(data);
                if (!raw) return '';
                return raw.length > 180 ? `${raw.slice(0, 180)}...` : raw;
            };

            const timeText = formatTime(event.ts);
            const dataText = compactData(event.data, event.event);
            const line = [timeText, event.event, dataText].filter(Boolean).join(' | ');
            setThinkingLines((prev) => [...prev, line]);
        };

        callStreamingAPI();

        return () => {
            if (chunkTimer) {
                clearInterval(chunkTimer);
            }
        };
    }, [debug, terminalMode, demoMode, planDemoMode, question, dispatch, fetchGraphFromCypher]);

    const runPlanningCycle = React.useCallback(async (inputText) => {
        if (!inputText) return;
        setPlanRevisionWarningOpen(false);
        setTerminalLoading(true);
        setIsPlanRevisionInProgress(Boolean(planSessionId));
        updateMilestoneSequence(planSessionId ? 'revise' : 'start');
        setStreamedEvents([]);
        setThinkingLines([]);
        setStreamComplete(false);
        setStreamedSummary('');
        setStreamAnswer('');
        streamSummaryRef.current = '';
        streamAnswerRef.current = '';
        try {
            if (!planSessionId) {
                const startResponse = await flaskBackendAxiosInstanceNew.post('https://agent.pankgraph.org/plan/start', {
                    question: inputText,
                    rigor: true,
                    use_literature: true,
                }, {
                    headers: { 'Content-Type': 'application/json' },
                });
                const startData = startResponse?.data || {};
                if (!startData?.session_id) {
                    throw new Error(startData?.error || 'Missing session_id from /plan/start');
                }
                setPlanSessionId(startData.session_id);
                const { interpretedQuestion, planMarkdown } = parsePlanMarkdownForUI(startData?.plan_markdown || '');
                setPlanSummary(planMarkdown);
                setPlanParsedTitle(interpretedQuestion || '');
                setAiAnswer(planMarkdown);
                await runPlanLoadingMilestones();
                const planCypherQueries = extractPlanCypherQueries(startData?.plan_json);
                if (planCypherQueries.length) {
                    await fetchGraphFromCypher(planCypherQueries);
                    setStreamMilestones((prev) => ({ ...prev, cypherExecuted: true }));
                } else {
                    setGraphData(null);
                    setNoGraph(true);
                    setFunctionalDataRequestPath('');
                    setStreamMilestones((prev) => ({ ...prev, cypherExecuted: true }));
                }
            } else {
                const reviseResponse = await flaskBackendAxiosInstanceNew.post('https://agent.pankgraph.org/plan/revise', {
                    session_id: planSessionId,
                    prompt: inputText,
                }, {
                    headers: { 'Content-Type': 'application/json' },
                });
                const reviseData = reviseResponse?.data || {};
                if (reviseData?.error !== null && reviseData?.error !== undefined) {
                    const failureMessage = typeof reviseData.error === 'string'
                        ? reviseData.error
                        : JSON.stringify(reviseData.error);
                    setPlanRevisionWarningMessage(failureMessage || 'Plan revision failed. Previous plan is kept.');
                    setPlanRevisionWarningOpen(true);
                    setTerminalPhase('confirm');
                    setStreamComplete(true);
                    return;
                }
                const { interpretedQuestion, planMarkdown } = parsePlanMarkdownForUI(reviseData?.plan_markdown || '');
                setPlanSummary(planMarkdown);
                setPlanParsedTitle(interpretedQuestion || planParsedTitle || '');
                setAiAnswer(planMarkdown);
                await runPlanLoadingMilestones();
                const planCypherQueries = extractPlanCypherQueries(reviseData?.plan_json);
                if (planCypherQueries.length) {
                    await fetchGraphFromCypher(planCypherQueries);
                    setStreamMilestones((prev) => ({ ...prev, cypherExecuted: true }));
                } else {
                    setGraphData(null);
                    setNoGraph(true);
                    setFunctionalDataRequestPath('');
                    setStreamMilestones((prev) => ({ ...prev, cypherExecuted: true }));
                }
            }
            setTerminalPhase('confirm');
            setStreamComplete(true);
        } catch (err) {
            console.error('[Terminal Flow] Planning cycle failed:', err);
            setAgentErrorType(resolveAgentErrorType(err, 'planning_failed'));
        } finally {
            setTerminalLoading(false);
            setIsPlanRevisionInProgress(false);
        }
    }, [planSessionId, currentQuestion, question, planParsedTitle, extractPlanCypherQueries, fetchGraphFromCypher, runPlanLoadingMilestones, resolveAgentErrorType]);

    const runConfirmCycle = React.useCallback(async () => {
        if (!planSessionId) {
            setAgentErrorType('planning_failed');
            return;
        }
        setAiAnswer('');
        setStreamAnswer('');
        setStreamedSummary('');
        streamAnswerRef.current = '';
        streamSummaryRef.current = '';
        setTerminalConfirming(true);
        setTerminalSummaryLoading(true);
        setTerminalPhase('result');
        setStreamComplete(false);
        try {
            const confirmResponse = await flaskBackendAxiosInstanceNew.post('https://agent.pankgraph.org/plan/confirm', {
                session_id: planSessionId,
            }, {
                headers: { 'Content-Type': 'application/json' },
            });
            const confirmData = confirmResponse?.data || {};
            const { summary, followUpQuestions } = parseAnswerStringPayload(confirmData.answer || '{}');
            if (summary) {
                setAiAnswer(summary);
                setStreamAnswer(summary);
                setStreamedSummary(summary);
                streamAnswerRef.current = summary;
                streamSummaryRef.current = summary;
            } else {
                setAgentErrorType('fail_to_give_answer');
                return;
            }
            if (Array.isArray(followUpQuestions) && followUpQuestions.length > 0) {
                setNextQuestions(
                    followUpQuestions
                        .filter((item) => typeof item === 'string' && item.trim())
                        .map((item) => ({ question: item.trim(), link: '' }))
                );
            }
            setStreamComplete(true);
            setPlanSessionId('');
        } catch (err) {
            console.error('[Terminal Flow] Confirm failed:', err);
            setAgentErrorType(resolveAgentErrorType(err, 'fail_to_give_answer'));
        } finally {
            setTerminalConfirming(false);
            setTerminalSummaryLoading(false);
        }
    }, [planSessionId, resolveAgentErrorType]);

    useEffect(() => {
        setChatSessionId(chatSessionIdFromUrl || '');
    }, [chatSessionIdFromUrl]);

    const applyMainChatResponse = React.useCallback(async (payload, fallbackQuestion, preferredTitle = '') => {
        const parsed = parseChatResponseContent(payload);
        const resolvedQuestion = fallbackQuestion || currentQuestion || question;
        const route = String(payload?.route || 'new_query');
        const responseSessionId = String(payload?.session_id || chatSessionId || '').trim();
        const planCypherQueries = extractPayloadCypherQueries(payload);

        // Trigger graph/functional loading immediately after confirm returns,
        // so Functional Data API does not wait for literature append.
        const graphPromise = planCypherQueries.length
            ? fetchGraphFromCypher(planCypherQueries)
            : Promise.resolve().then(() => {
                setGraphData(null);
                setNoGraph(true);
                setFunctionalDataRequestPath('');
            });

        setCurrentQuestion(resolvedQuestion);
        setChatRouteState(route);
        setAiAnswer(parsed.summary || '');
        setStreamAnswer(parsed.summary || '');
        setStreamedSummary(parsed.summary || '');
        streamAnswerRef.current = parsed.summary || '';
        streamSummaryRef.current = parsed.summary || '';
        setPlanParsedTitle(preferredTitle || planParsedTitle || '');
        setNextQuestions(parsed.followUpQuestions || []);
        setChatHistoryCompressed(Boolean(payload?.history_compressed));
        setConversationRound(Number(payload?.round || 1));
        setTerminalPhase('result');
        setTerminalSummaryLoading(false);
        setTerminalLoading(false);
        setStreamComplete(true);

        if (route === 'new_query' && parsed.summary && responseSessionId) {
            const literatureMarkdown = await fetchLiteratureMarkdown(responseSessionId);
            const mergedSummary = appendLiteratureBlock(parsed.summary, literatureMarkdown);
            if (mergedSummary && mergedSummary !== parsed.summary) {
                setAiAnswer(mergedSummary);
                setStreamAnswer(mergedSummary);
                setStreamedSummary(mergedSummary);
                streamAnswerRef.current = mergedSummary;
                streamSummaryRef.current = mergedSummary;
            }
        }

        await graphPromise;
    }, [parseChatResponseContent, currentQuestion, question, chatSessionId, extractPayloadCypherQueries, fetchGraphFromCypher, fetchLiteratureMarkdown, appendLiteratureBlock]);

    const handleConfirmPendingPlan = React.useCallback(async (blockId) => {
        const block = followUpBlocks.find((item) => item.id === blockId);
        if (!block || !chatSessionId || !block.planSessionId) {
            return;
        }

        setFollowUpBlocks((prev) => prev.map((item) => (
            item.id === blockId
                ? {
                    ...item,
                    type: 'answer',
                    summary: '',
                    followUpQuestions: [],
                    confirming: true,
                    error: '',
                }
                : item
        )));

        try {
            const response = await flaskBackendAxiosInstanceNew.post(
                'https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/plan/confirm',
                {
                    chat_session_id: chatSessionId,
                    plan_session_id: block.planSessionId,
                    revision_prompt: block.revisionPrompt || null,
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            const payload = response?.data || {};
            const parsed = parseChatResponseContent(payload);
            const route = String(payload?.route || 'new_query');
            const planCypherQueries = extractPayloadCypherQueries(payload);
            const functionalPath = extractFunctionalDataRequestPath(planCypherQueries);
            const hasGraphCypherQueries = stripFunctionalDataRequestsFromCypher(planCypherQueries).length > 0;
            let summaryText = parsed.summary || '';

            setFollowUpBlocks((prev) => prev.map((item) => (
                item.id === blockId
                    ? {
                        ...item,
                        type: 'answer',
                        summary: summaryText,
                        followUpQuestions: parsed.followUpQuestions,
                        title: item.title || item.question,
                        route,
                        referencesData: [],
                        graphData: null,
                        coordData: null,
                        noGraph: route === 'follow_up' ? true : !hasGraphCypherQueries,
                        graphLoading: route !== 'follow_up' && hasGraphCypherQueries,
                        functionalDataRequestPath: functionalPath,
                        literatureLoading: route === 'new_query',
                        confirming: false,
                        error: '',
                    }
                    : item
            )));

            if (route === 'new_query' && summaryText && chatSessionId) {
                const literatureMarkdown = await fetchLiteratureMarkdown(chatSessionId);
                const mergedSummary = appendLiteratureBlock(summaryText, literatureMarkdown);
                summaryText = mergedSummary || summaryText;
            }

            const referencesData = await fetchReferenceArticles(summaryText);

            setFollowUpBlocks((prev) => prev.map((item) => (
                item.id === blockId
                    ? {
                        ...item,
                        summary: summaryText,
                        referencesData,
                        literatureLoading: false,
                    }
                    : item
            )));

            if (route !== 'follow_up' && hasGraphCypherQueries) {
                const graphResult = await queryGraphFromCypher(planCypherQueries);
                setFollowUpBlocks((prev) => prev.map((item) => (
                    item.id === blockId
                        ? {
                            ...item,
                            graphData: graphResult.graphData,
                            coordData: graphResult.coordData,
                            noGraph: graphResult.noGraph,
                            graphLoading: false,
                                functionalDataRequestPath: functionalPath,
                        }
                        : item
                )));
            }

            appendConversationMessages(chatSessionId, [
                { role: 'user', content: String(block.question || '').trim() },
                {
                    role: 'assistant',
                    content: summaryText,
                    route,
                    cypherQueries: planCypherQueries,
                    followUpQuestions: parsed.followUpQuestions || [],
                },
            ]);
            const followUpInterpretedTitle = String(block?.title || '').trim();
            if (followUpInterpretedTitle) {
                upsertRecentChat({ sessionId: chatSessionId, firstQuestion: followUpInterpretedTitle });
            }
            setChatHistoryCompressed(Boolean(payload?.history_compressed));
            setConversationRound(Number(payload?.round || conversationRound));
        } catch (err) {
            setFollowUpBlocks((prev) => prev.map((item) => (
                item.id === blockId
                    ? {
                        ...item,
                        type: 'plan',
                        confirming: false,
                        graphLoading: false,
                        error: err?.response?.data?.detail || err?.message || 'Failed to confirm plan.',
                    }
                    : item
            )));
        }
    }, [followUpBlocks, chatSessionId, parseChatResponseContent, extractPayloadCypherQueries, queryGraphFromCypher, question, currentQuestion, conversationRound, fetchReferenceArticles, fetchLiteratureMarkdown, appendLiteratureBlock]);

    const handleSendFollowUp = React.useCallback(async (value) => {
        const cleaned = stripHtml(value || '').trim();
        if (!cleaned || !chatSessionId) {
            return;
        }

        const blockId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setFollowUpSubmitting(true);
        setFollowUpDraft('');
        setFollowUpBlocks((prev) => [...prev, { id: blockId, question: cleaned, type: 'loading', error: '' }]);

        try {
            const response = await flaskBackendAxiosInstanceNew.post(
                'https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/message',
                {
                    session_id: chatSessionId,
                    question: cleaned,
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            const payload = response?.data || {};
            const parsed = parseChatResponseContent(payload);
            const planCypherQueries = extractPayloadCypherQueries(payload);
            const functionalPath = extractFunctionalDataRequestPath(planCypherQueries);
            const hasGraphCypherQueries = stripFunctionalDataRequestsFromCypher(planCypherQueries).length > 0;
            let summaryText = parsed.summary || '';
            setChatRouteState(String(payload?.route || ''));
            setChatHistoryCompressed(Boolean(payload?.history_compressed));
            setConversationRound(Number(payload?.round || conversationRound));

            if (payload?.route === 'new_query_pending') {
                const { interpretedQuestion } = parsePlanMarkdownForUI(payload?.plan_markdown || '');
                setFollowUpBlocks((prev) => prev.map((item) => (
                    item.id === blockId
                        ? {
                            ...item,
                            type: 'plan',
                            route: 'new_query_pending',
                            title: interpretedQuestion || cleaned,
                            planMarkdown: payload?.plan_markdown || '',
                            planSessionId: payload?.pending_plan_session_id || '',
                            revisionPrompt: '',
                            confirming: false,
                            error: '',
                        }
                        : item
                )));
            } else if (payload?.route === 'follow_up' || payload?.route === 'new_query') {
                const route = String(payload?.route || 'follow_up');
                setFollowUpBlocks((prev) => prev.map((item) => (
                    item.id === blockId
                        ? {
                            ...item,
                            type: 'answer',
                            summary: summaryText,
                            followUpQuestions: parsed.followUpQuestions,
                            referencesData: [],
                            route,
                            graphData: null,
                            coordData: null,
                            noGraph: route === 'follow_up' ? true : !hasGraphCypherQueries,
                            graphLoading: route !== 'follow_up' && hasGraphCypherQueries,
                            functionalDataRequestPath: functionalPath,
                            title: cleaned,
                            literatureLoading: route === 'new_query',
                            error: '',
                        }
                        : item
                )));

                if (route === 'new_query' && summaryText && chatSessionId) {
                    const literatureMarkdown = await fetchLiteratureMarkdown(chatSessionId);
                    const mergedSummary = appendLiteratureBlock(summaryText, literatureMarkdown);
                    summaryText = mergedSummary || summaryText;
                }

                const referencesData = await fetchReferenceArticles(summaryText);

                setFollowUpBlocks((prev) => prev.map((item) => (
                    item.id === blockId
                        ? {
                            ...item,
                            summary: summaryText,
                            referencesData,
                            literatureLoading: false,
                        }
                        : item
                )));

                if (route !== 'follow_up' && hasGraphCypherQueries) {
                    const graphResult = await queryGraphFromCypher(planCypherQueries);
                    setFollowUpBlocks((prev) => prev.map((item) => (
                        item.id === blockId
                            ? {
                                ...item,
                                graphData: graphResult.graphData,
                                coordData: graphResult.coordData,
                                noGraph: graphResult.noGraph,
                                graphLoading: false,
                                functionalDataRequestPath: functionalPath,
                            }
                            : item
                    )));
                }

                appendConversationMessages(chatSessionId, [
                    { role: 'user', content: cleaned },
                    {
                        role: 'assistant',
                        content: summaryText,
                        route,
                        cypherQueries: planCypherQueries,
                        followUpQuestions: parsed.followUpQuestions || [],
                    },
                ]);
            } else {
                throw new Error(`Unsupported chat/message route: ${String(payload?.route || 'unknown')}`);
            }

            const followUpInterpretedTitle = String(payload?.interpreted_question || payload?.interpretedTitle || '').trim();
            if (followUpInterpretedTitle) {
                upsertRecentChat({ sessionId: chatSessionId, firstQuestion: followUpInterpretedTitle });
            }
        } catch (err) {
            setFollowUpBlocks((prev) => prev.map((item) => (
                item.id === blockId
                    ? {
                        ...item,
                        type: 'error',
                        error: err?.response?.data?.detail || err?.message || 'Follow-up request failed.',
                    }
                    : item
            )));
        } finally {
            setFollowUpSubmitting(false);
        }
    }, [chatSessionId, parseChatResponseContent, conversationRound, question, currentQuestion, parsePlanMarkdownForUI, extractPayloadCypherQueries, queryGraphFromCypher, fetchReferenceArticles, fetchLiteratureMarkdown, appendLiteratureBlock]);

    useEffect(() => {
        followUpSendHandlerRef.current = handleSendFollowUp;
    }, [handleSendFollowUp]);

    const runChatStartConfirmCycle = React.useCallback(async () => {
        if (!chatSessionId || !chatStartPendingPlanSessionId) {
            setAgentErrorType('planning_failed');
            return;
        }

        const confirmPlanSessionId = chatStartPendingPlanSessionId;
        const confirmQuestionText = chatStartQuestion || question;
        // Cancel any in-flight bootstrap conversation work so it cannot re-open planner state.
        chatBootstrapRunIdRef.current += 1;

        flushSync(() => {
            setChatStartPlanConfirming(true);
            setTerminalSummaryLoading(true);
            setTerminalLoading(false);
            setForceResultView(true);
            setTerminalPhase('result');
            setStreamComplete(false);
            // Immediately switch out of planner view while waiting for confirm response.
            setChatRouteState('new_query');
            setChatStartPendingPlanSessionId('');
            setAiAnswer('');
            setStreamAnswer('');
            setStreamedSummary('');
        });
        streamAnswerRef.current = '';
        streamSummaryRef.current = '';

        // Drop pending-plan URL markers immediately so remounts cannot restore planner while confirm is in-flight.
        navigate(`/result-new2?question=${encodeURIComponent(utf8ToBase64(confirmQuestionText))}&terminal=true&session_id=${encodeURIComponent(chatSessionId)}`, { replace: true });

        try {
            const confirmResponse = await flaskBackendAxiosInstanceNew.post(
                'https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/plan/confirm',
                {
                    chat_session_id: chatSessionId,
                    plan_session_id: confirmPlanSessionId,
                    revision_prompt: chatStartRevisionPrompt || null,
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            const confirmPayload = confirmResponse?.data || {};
            await applyMainChatResponse(confirmPayload, confirmQuestionText, planParsedTitle || '');
            setChatRouteState('new_query');
            setChatStartPendingPlanSessionId('');
            setChatStartRevisionPrompt('');
            sessionStorage.removeItem(CHAT_START_CACHE_KEY);
            sessionStorage.removeItem(CHAT_PENDING_PLAN_CACHE_KEY);

            const summaryForHistory = String(streamAnswerRef.current || confirmPayload?.answer_markdown || '').trim();
            if (summaryForHistory) {
                const confirmParsed = parseChatResponseContent(confirmPayload);
                const confirmInterpretedTitle = String(planParsedTitle || '').trim();
                if (confirmInterpretedTitle) {
                    upsertRecentChat({ sessionId: chatSessionId, firstQuestion: confirmInterpretedTitle });
                }
                replaceConversationHistory(chatSessionId, [
                    { role: 'user', content: confirmQuestionText },
                    {
                        role: 'assistant',
                        content: summaryForHistory,
                        route: String(confirmPayload?.route || 'new_query'),
                        cypherQueries: extractPayloadCypherQueries(confirmPayload),
                        followUpQuestions: confirmParsed.followUpQuestions || [],
                        interpretedTitle: planParsedTitle || '',
                    },
                ]);
            }
        } catch (err) {
            console.error('[Chat Flow] First-turn plan confirm failed:', err);
            // Restore planner state so the user can retry confirm/revise.
            setForceResultView(false);
            setTerminalPhase('confirm');
            setChatRouteState('new_query_pending');
            setChatStartPendingPlanSessionId(confirmPlanSessionId);
            navigate(`/result-new2?question=${encodeURIComponent(utf8ToBase64(confirmQuestionText))}&terminal=true&session_id=${encodeURIComponent(chatSessionId)}&pending_plan_session_id=${encodeURIComponent(confirmPlanSessionId)}&route=new_query_pending`, { replace: true });
            setAgentErrorType(resolveAgentErrorType(err, 'planning_failed'));
        } finally {
            setChatStartPlanConfirming(false);
            setTerminalSummaryLoading(false);
            setTerminalLoading(false);
        }
    }, [chatSessionId, chatStartPendingPlanSessionId, chatStartRevisionPrompt, applyMainChatResponse, chatStartQuestion, question, resolveAgentErrorType, planParsedTitle, navigate]);

    const runChatStartPlanReviseCycle = React.useCallback(async (prompt) => {
        const cleaned = String(prompt || '').trim();
        if (!chatStartPendingPlanSessionId || !cleaned) {
            return;
        }

        setPlanRevisionWarningOpen(false);
        setTerminalLoading(true);
        setIsPlanRevisionInProgress(true);

        try {
            const revised = await revisePlanSession(chatStartPendingPlanSessionId, cleaned);
            if (revised?.error !== null && revised?.error !== undefined) {
                const failureMessage = typeof revised.error === 'string'
                    ? revised.error
                    : JSON.stringify(revised.error);
                setPlanRevisionWarningMessage(failureMessage || 'Plan revision failed. Previous plan is kept.');
                setPlanRevisionWarningOpen(true);
                return;
            }

            const { interpretedQuestion, planMarkdown } = parsePlanMarkdownForUI(revised?.plan_markdown || '');
            setPlanSummary(planMarkdown || revised?.plan_markdown || '');
            setPlanParsedTitle(interpretedQuestion || planParsedTitle || '');
            setChatStartRevisionPrompt(cleaned);

            const planCypherQueries = extractPlanCypherQueries(revised?.plan_json || {});
            if (planCypherQueries.length) {
                setPlanHasGraphQuery(true);
                setIsPlanGraphQueryLoading(true);
                try {
                    await fetchGraphFromCypher(planCypherQueries);
                } finally {
                    setIsPlanGraphQueryLoading(false);
                }
            } else {
                setPlanHasGraphQuery(false);
                setIsPlanGraphQueryLoading(false);
                setGraphData(null);
                setNoGraph(true);
                setFunctionalDataRequestPath('');
            }
        } catch (err) {
            const failureMessage = err?.response?.data?.detail || err?.message || 'Plan revision failed. Previous plan is kept.';
            setPlanRevisionWarningMessage(failureMessage);
            setPlanRevisionWarningOpen(true);
        } finally {
            setTerminalLoading(false);
            setIsPlanRevisionInProgress(false);
        }
    }, [chatStartPendingPlanSessionId, revisePlanSession, parsePlanMarkdownForUI, chatStartQuestion, question, planParsedTitle, extractPlanCypherQueries, fetchGraphFromCypher]);

    useEffect(() => {
        if (!isChatApiMode || !question) {
            return;
        }

        const bootstrapKey = `${chatSessionIdFromUrl || 'new'}::${question}`;
        if (chatBootstrapRef.current === bootstrapKey) {
            return;
        }
        chatBootstrapRef.current = bootstrapKey;

        const bootstrapConversation = async () => {
            const runId = ++chatBootstrapRunIdRef.current;
            const isStale = () => runId !== chatBootstrapRunIdRef.current;
            const shouldPreserveGraphDuringPendingBootstrap = Boolean(
                chatSessionIdFromUrl && (pendingPlanSessionIdFromUrl || chatRouteFromUrl === 'new_query_pending')
            );

            setForceResultView(false);
            setChatRouteState('');
            setTerminalPhase('loading');
            setTerminalLoading(true);
            setStreamComplete(false);
            setAiAnswer('');
            setFollowUpBlocks([]);
            setAgentErrorType(null);
            if (!shouldPreserveGraphDuringPendingBootstrap) {
                setGraphData(null);
                setNoGraph(false);
            }
            setQuestionLoadingStartedAt(Date.now());

            try {
                const cachedPendingPlan = safeParseJson(sessionStorage.getItem(CHAT_PENDING_PLAN_CACHE_KEY), null);

                if (
                    cachedPendingPlan
                    && cachedPendingPlan.question === question
                    && cachedPendingPlan.sessionId
                    && cachedPendingPlan.pendingPlanSessionId
                    && cachedPendingPlan.payload?.route === 'new_query_pending'
                ) {
                    const cachedPayload = cachedPendingPlan.payload || {};
                    const { interpretedQuestion, planMarkdown } = parsePlanMarkdownForUI(cachedPayload?.plan_markdown || '');

                    setChatSessionId(cachedPendingPlan.sessionId);
                    setChatRouteState('new_query_pending');
                    setChatStartPendingPlanSessionId(cachedPendingPlan.pendingPlanSessionId);
                    setChatStartRevisionPrompt('');
                    setChatStartQuestion(question);
                    setCurrentQuestion(question);
                    setPlanSummary(planMarkdown || cachedPayload?.plan_markdown || '');
                    setPlanParsedTitle(interpretedQuestion || '');
                    setTerminalPhase('confirm');
                    setTerminalLoading(false);
                    setStreamComplete(true);

                    const planCypherQueries = extractPlanCypherQueries(cachedPayload?.plan_json || {});
                    if (planCypherQueries.length) {
                        setPlanHasGraphQuery(true);
                        setIsPlanGraphQueryLoading(true);
                        try {
                            await fetchGraphFromCypher(planCypherQueries);
                        } finally {
                            setIsPlanGraphQueryLoading(false);
                        }
                    } else {
                        setPlanHasGraphQuery(false);
                        setIsPlanGraphQueryLoading(false);
                        setGraphData(null);
                        setNoGraph(true);
                        setFunctionalDataRequestPath('');
                    }

                    if (isStale()) return;

                    const desiredPendingUrl = `/result-new2?question=${encodeURIComponent(utf8ToBase64(question))}&terminal=true&session_id=${encodeURIComponent(cachedPendingPlan.sessionId)}&pending_plan_session_id=${encodeURIComponent(cachedPendingPlan.pendingPlanSessionId)}&route=new_query_pending`;
                    const currentUrl = `${location.pathname}${location.search}`;
                    if (currentUrl !== desiredPendingUrl) {
                        navigate(desiredPendingUrl, { replace: true });
                    }
                    return;
                }

                if (chatSessionIdFromUrl && (pendingPlanSessionIdFromUrl || chatRouteFromUrl === 'new_query_pending')) {
                    if (
                        cachedPendingPlan
                        && cachedPendingPlan.sessionId === chatSessionIdFromUrl
                        && cachedPendingPlan.pendingPlanSessionId === pendingPlanSessionIdFromUrl
                        && cachedPendingPlan.question === question
                    ) {
                        const cachedPayload = cachedPendingPlan.payload || {};
                        const { interpretedQuestion, planMarkdown } = parsePlanMarkdownForUI(cachedPayload?.plan_markdown || '');

                        setChatSessionId(chatSessionIdFromUrl);
                        setChatRouteState('new_query_pending');
                        setChatStartPendingPlanSessionId(pendingPlanSessionIdFromUrl || cachedPayload?.pending_plan_session_id || '');
                        setChatStartRevisionPrompt('');
                        setChatStartQuestion(question);
                        setCurrentQuestion(question);
                        setPlanSummary(planMarkdown || cachedPayload?.plan_markdown || '');
                        setPlanParsedTitle(interpretedQuestion || '');
                        setTerminalPhase('confirm');
                        setTerminalLoading(false);
                        setStreamComplete(true);

                        const planCypherQueries = extractPlanCypherQueries(cachedPayload?.plan_json || {});
                        if (planCypherQueries.length) {
                            setPlanHasGraphQuery(true);
                            setIsPlanGraphQueryLoading(true);
                            try {
                                await fetchGraphFromCypher(planCypherQueries);
                            } finally {
                                setIsPlanGraphQueryLoading(false);
                            }
                        } else {
                            setPlanHasGraphQuery(false);
                            setIsPlanGraphQueryLoading(false);
                            setGraphData(null);
                            setNoGraph(true);
                            setFunctionalDataRequestPath('');
                        }

                        if (isStale()) return;
                        return;
                    }

                    // Pending-plan cache is intentionally not persisted anymore.
                    // If we already have matching pending-plan state in memory,
                    // keep rendering confirm view instead of showing a false planning error.
                    if (
                        chatSessionIdRef.current
                        && chatSessionIdRef.current === chatSessionIdFromUrl
                        && chatStartPendingPlanSessionIdRef.current
                        && chatStartPendingPlanSessionIdRef.current === pendingPlanSessionIdFromUrl
                        && String(planSummaryRef.current || aiAnswerRef.current || '').trim()
                    ) {
                        setChatRouteState('new_query_pending');
                        setTerminalPhase('confirm');
                        setTerminalLoading(false);
                        setStreamComplete(true);
                        return;
                    }

                    setTerminalLoading(false);
                    setStreamComplete(false);
                    setAgentErrorType('planning_failed');
                    return;
                }

                if (chatSessionIdFromUrl) {
                    const cachedHistory = readConversationHistory(chatSessionIdFromUrl);
                    let history = cachedHistory;
                    if (!history.length) {
                        const historyResponse = await flaskBackendAxiosInstanceNew.get(
                            'https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/history',
                            {
                                params: { session_id: chatSessionIdFromUrl },
                            }
                        );
                        if (isStale()) return;
                        history = Array.isArray(historyResponse?.data?.history) ? historyResponse.data.history : [];
                        replaceConversationHistory(chatSessionIdFromUrl, history);
                    }

                    const firstUserTurn = history.find((item) => item?.role === 'user');
                    const firstQuestion = firstUserTurn?.content || question;
                    const exchanges = [];
                    let pendingUserQuestion = '';

                    history.forEach((item) => {
                        if (item?.role === 'user') {
                            pendingUserQuestion = String(item?.content || '').trim();
                            return;
                        }

                        if (item?.role === 'assistant' && pendingUserQuestion) {
                            exchanges.push({
                                question: pendingUserQuestion,
                                assistant: item,
                            });
                            pendingUserQuestion = '';
                        }
                    });

                    const primaryExchange = exchanges[0] || null;
                    const primarySummary = String(primaryExchange?.assistant?.content || '').trim();
                    const primaryInterpretedTitle = String(primaryExchange?.assistant?.interpretedTitle || '').trim();
                    const latestExchange = exchanges[exchanges.length - 1] || primaryExchange;

                    setChatSessionId(chatSessionIdFromUrl);
                    setCurrentQuestion(firstQuestion);
                    setAiAnswer(primarySummary);
                    setPlanParsedTitle(primaryInterpretedTitle);
                    setTerminalPhase('result');
                    setTerminalLoading(false);
                    setStreamComplete(true);

                    if (primaryExchange) {
                        const latestFollowUpQuestions = Array.isArray(latestExchange?.assistant?.followUpQuestions)
                            ? latestExchange.assistant.followUpQuestions
                            : parseChatResponseContent({ answer_markdown: latestExchange?.assistant?.content || '' }).followUpQuestions;
                        setNextQuestions(latestFollowUpQuestions || []);

                        const primaryCypher = Array.isArray(primaryExchange?.assistant?.cypherQueries)
                            ? primaryExchange.assistant.cypherQueries
                            : [];
                        if (primaryCypher.length) {
                            await fetchGraphFromCypher(primaryCypher);
                        } else {
                            setGraphData(null);
                            setNoGraph(true);
                            setFunctionalDataRequestPath('');
                        }

                        const rebuiltFollowUps = exchanges.slice(1).map((exchange, idx) => {
                            const assistant = exchange.assistant || {};
                            const summary = String(assistant?.content || '').trim();
                            const parsed = parseChatResponseContent({ answer_markdown: summary });
                            const cypherQueries = Array.isArray(assistant?.cypherQueries) ? assistant.cypherQueries : [];
                            const functionalPath = extractFunctionalDataRequestPath(cypherQueries);
                            const hasGraphCypherQueries = stripFunctionalDataRequestsFromCypher(cypherQueries).length > 0;
                            const route = String(assistant?.route || (cypherQueries.length ? 'new_query' : 'follow_up'));
                            const restoredFollowUps = Array.isArray(assistant?.followUpQuestions)
                                ? assistant.followUpQuestions
                                : (parsed.followUpQuestions || []);
                            return {
                                id: `restored-${idx + 1}`,
                                question: exchange.question,
                                title: exchange.question,
                                type: 'answer',
                                summary,
                                followUpQuestions: restoredFollowUps,
                                route,
                                referencesData: [],
                                graphData: null,
                                coordData: null,
                                noGraph: route === 'follow_up' ? true : !hasGraphCypherQueries,
                                graphLoading: route !== 'follow_up' && hasGraphCypherQueries,
                                functionalDataRequestPath: functionalPath,
                                cypherQueries,
                                confirming: false,
                                error: '',
                            };
                        });

                        setFollowUpBlocks(rebuiltFollowUps);

                        const referencesPromises = rebuiltFollowUps.map((block) => fetchReferenceArticles(block.summary || ''));
                        const referencesByBlock = await Promise.all(referencesPromises);
                        if (isStale()) return;

                        setFollowUpBlocks((prev) => prev.map((block, idx) => ({
                            ...block,
                            referencesData: referencesByBlock[idx] || [],
                        })));

                        const graphPromises = rebuiltFollowUps.map(async (block) => {
                            const graphCypherQueries = stripFunctionalDataRequestsFromCypher(block.cypherQueries);
                            if (block.route === 'follow_up' || !graphCypherQueries.length) {
                                return {
                                    graphData: null,
                                    coordData: null,
                                    noGraph: block.route === 'follow_up' ? true : Boolean(!block.functionalDataRequestPath),
                                };
                            }
                            return queryGraphFromCypher(graphCypherQueries);
                        });
                        const graphsByBlock = await Promise.all(graphPromises);
                        if (isStale()) return;

                        setFollowUpBlocks((prev) => prev.map((block, idx) => {
                            const graphResult = graphsByBlock[idx] || {};
                            return {
                                ...block,
                                graphData: graphResult.graphData || null,
                                coordData: graphResult.coordData || null,
                                noGraph: block.route === 'follow_up' ? true : Boolean(graphResult.noGraph),
                                graphLoading: false,
                            };
                        }));
                    } else {
                        setGraphData(null);
                        setNoGraph(true);
                        setFunctionalDataRequestPath('');
                        setNextQuestions([]);
                        setFollowUpBlocks([]);
                    }

                    if (primaryInterpretedTitle) {
                        upsertRecentChat({ sessionId: chatSessionIdFromUrl, firstQuestion: primaryInterpretedTitle });
                    }
                    return;
                }

                const startResponse = await flaskBackendAxiosInstanceNew.post(
                    'https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/chat/start',
                    {
                        question,
                        rigor: true,
                        use_literature: true,
                    },
                    {
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
                if (isStale()) return;

                const payload = startResponse?.data || {};
                const sessionId = payload?.session_id || '';
                if (!sessionId) {
                    throw new Error('Missing session_id from /chat/start');
                }

                setChatSessionId(sessionId);

                if (payload?.route === 'new_query_pending') {
                    setChatRouteState('new_query_pending');
                    const { interpretedQuestion, planMarkdown } = parsePlanMarkdownForUI(payload?.plan_markdown || '');
                    setChatStartPendingPlanSessionId(payload?.pending_plan_session_id || '');
                    setChatStartRevisionPrompt('');
                    setChatStartQuestion(question);
                    setPlanSummary(planMarkdown || payload?.plan_markdown || '');
                    setPlanParsedTitle(interpretedQuestion || '');
                    // Show planner page immediately; graph area shows its own spinner while fetching.
                    setTerminalPhase('confirm');
                    setTerminalLoading(false);
                    setStreamComplete(true);

                    const planCypherQueries = extractPlanCypherQueries(payload?.plan_json || {});
                    if (planCypherQueries.length) {
                        setPlanHasGraphQuery(true);
                        setIsPlanGraphQueryLoading(true);
                        try {
                            await fetchGraphFromCypher(planCypherQueries);
                        } finally {
                            setIsPlanGraphQueryLoading(false);
                        }
                    } else {
                        setPlanHasGraphQuery(false);
                        setIsPlanGraphQueryLoading(false);
                        setGraphData(null);
                        setNoGraph(true);
                        setFunctionalDataRequestPath('');
                    }
                    if (isStale()) return;
                    navigate(`/result-new2?question=${encodeURIComponent(utf8ToBase64(question))}&terminal=true&session_id=${encodeURIComponent(sessionId)}&pending_plan_session_id=${encodeURIComponent(payload?.pending_plan_session_id || '')}&route=new_query_pending`, { replace: true });
                } else if (payload?.route === 'follow_up' || payload?.route === 'new_query') {
                    setChatRouteState(String(payload?.route || 'new_query'));
                    await applyMainChatResponse(payload, question);
                    if (isStale()) return;
                    const summaryForHistory = String(streamAnswerRef.current || payload?.answer_markdown || '').trim();
                    if (summaryForHistory) {
                        const startParsed = parseChatResponseContent(payload);
                        const startInterpretedTitle = String(payload?.interpreted_question || payload?.interpretedTitle || planParsedTitle || '').trim();
                        if (startInterpretedTitle) {
                            upsertRecentChat({ sessionId, firstQuestion: startInterpretedTitle });
                        }
                        replaceConversationHistory(sessionId, [
                            { role: 'user', content: question },
                            {
                                role: 'assistant',
                                content: summaryForHistory,
                                route: String(payload?.route || 'new_query'),
                                cypherQueries: extractPayloadCypherQueries(payload),
                                followUpQuestions: startParsed.followUpQuestions || [],
                                interpretedTitle: planParsedTitle || '',
                            },
                        ]);
                    }
                    navigate(`/result-new2?question=${encodeURIComponent(utf8ToBase64(question))}&terminal=true&session_id=${encodeURIComponent(sessionId)}`, { replace: true });
                } else {
                    throw new Error(`Unsupported chat/start route: ${String(payload?.route || 'unknown')}`);
                }
            } catch (err) {
                if (isStale()) return;
                setTerminalLoading(false);
                setStreamComplete(false);
                setAgentErrorType(resolveAgentErrorType(err, 'critical_error'));
            }
        };

        bootstrapConversation();
    }, [
        isChatApiMode,
        question,
        chatSessionIdFromUrl,
        pendingPlanSessionIdFromUrl,
        chatRouteFromUrl,
        applyMainChatResponse,
        parseChatResponseContent,
        fetchReferenceArticles,
        queryGraphFromCypher,
        extractParsedTitle,
        extractPlanCypherQueries,
        extractPayloadCypherQueries,
        fetchGraphFromCypher,
        navigate,
        resolveAgentErrorType,
    ]);

    const handleCancelAndGoHome = React.useCallback(() => {
        // Prevent in-flight planning/bootstrap completion from re-navigating after user cancels.
        chatBootstrapRunIdRef.current += 1;
        if (thunkref.current) thunkref.current.abort();
        navigate('/');
    }, [navigate]);

    useEffect(() => {
        if (!terminalMode || demoMode || planDemoMode || isChatApiMode || !question || terminalInitializedQuestionRef.current === question) {
            return;
        }
        terminalInitializedQuestionRef.current = question;
        setPlanSessionId('');
        setTerminalPhase('loading');
        setQuestionLoadingStartedAt(Date.now());
        setStreamComplete(false);
        setNoGraph(false);
        setGraphData(null);
        setAiAnswer('');
        runPlanningCycle(question);
    }, [terminalMode, demoMode, planDemoMode, isChatApiMode, question, runPlanningCycle]);

    useEffect(() => {
        if (!isChatApiMode || !followUpBlocks.length) {
            return;
        }
        const latestBlock = followUpBlocks[followUpBlocks.length - 1];
        if (latestBlock?.type !== 'plan') {
            return;
        }
        requestAnimationFrame(() => {
            followUpPendingAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, [isChatApiMode, followUpBlocks]);

    useEffect(() => {
        const shouldAnimatePreset =
            terminalMode
            && terminalLoading
            && terminalPhase === 'loading'
            && !!questionLoadingStartedAt
            && !streamMilestones.planningDone;

        if (!shouldAnimatePreset) {
            return;
        }

        setQuestionLoadingNow(Date.now());
        const intervalId = setInterval(() => {
            setQuestionLoadingNow(Date.now());
        }, 120);

        return () => clearInterval(intervalId);
    }, [terminalMode, terminalLoading, terminalPhase, questionLoadingStartedAt, streamMilestones.planningDone]);

    const presetFirstStepProgress = React.useMemo(() => {
        const shouldApplyPreset =
            terminalMode
            && terminalLoading
            && terminalPhase === 'loading'
            && !!questionLoadingStartedAt
            && !streamMilestones.planningDone;

        if (!shouldApplyPreset) {
            return 0;
        }

        const elapsedMs = Math.max(0, questionLoadingNow - questionLoadingStartedAt);
        const ratio = Math.min(elapsedMs / 5000, 1);
        return ratio * (100 / 6);
    }, [terminalMode, terminalLoading, terminalPhase, questionLoadingStartedAt, questionLoadingNow, streamMilestones.planningDone]);

    const isPlanningPhase = terminalPhase === 'confirm' || hasPendingFollowUpWork;

    const startFollowUpQuestion = React.useCallback((label) => {
        const cleanQuestion = stripHtml(label || '').trim();
        if (!cleanQuestion) return;
        if (!isQuestionComplete) return;
        if (isChatApiMode) {
            handleSendFollowUp(cleanQuestion);
            return;
        }
        const encodedQuery = encodeURIComponent(utf8ToBase64(cleanQuestion));
        navigate(`/result-new2?question=${encodedQuery}&terminal=true`);
    }, [isQuestionComplete, isChatApiMode, handleSendFollowUp, navigate]);

    // Skeleton placeholder for summary loading
    const SummarySkeleton = () => (
        <Box sx={{ width: '100%' }}>
            <Skeleton variant="text" width="90%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="95%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="88%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="92%" height={24} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="85%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="93%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="70%" height={24} />
        </Box>
    );

    const summaryPlaceholder = "AI summary is generating...";
    const normalizedAnswer = typeof aiAnswer === "string" ? aiAnswer : "";
    const activeSummary = debug
        ? (streamComplete ? (streamAnswer || streamedSummary) : streamedSummary)
        : normalizedAnswer;
    const isAiSummaryLoading = !demoMode && !activeSummary;

    // Auto-scroll thinking process if near bottom
    useEffect(() => {
        if (!thinkingBoxRef.current) return;
        const element = thinkingBoxRef.current;
        // Check if user is near the bottom (within 50px)
        const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
        if (isNearBottom) {
            // Scroll to bottom on next frame
            requestAnimationFrame(() => {
                element.scrollTop = element.scrollHeight;
            });
        }
    }, [thinkingLines]);

    // Show skeleton during debug streaming and terminal confirm-in-flight summary generation.
    const shouldShowSkeleton =
        (debug && !streamedSummary && !streamComplete)
        || (terminalMode && terminalPhase === 'result' && terminalSummaryLoading && !isChatApiMode);

    const displaySummary = (
        demoMode
            ? (sampleSummaryData?.summary || '')
            : (activeSummary || summaryPlaceholder)
    );

    const showLiteratureSummarizing =
        !demoMode
        && !planDemoMode
        && literatureLoading
        && terminalPhase === 'result';

    const overviewSummary = stripCypherQueriesSection(displaySummary);

    const scrollToReferenceAnchor = (href, event) => {
        if (!href || !href.startsWith('#')) {
            return;
        }
        event.preventDefault();
        const anchorId = href.slice(1);
        let target = document.getElementById(anchorId);
        if (!target) {
            const pmidMatch = anchorId.match(/(\d{8})/);
            if (pmidMatch?.[1]) {
                target = document.querySelector(`[data-pmid="${pmidMatch[1]}"]`);
            }
        }
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                        backgroundColor: '#DFF2F0',
                        borderColor: '#7FB8B1',
                    },
                }}
                onClick={(event) => scrollToReferenceAnchor(href, event)}
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
                        border: '1px solid #9BCFC8',
                        color: '#006766',
                        backgroundColor: '#EAF7F5',
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.6,
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
            const pmid = String(match[2] || match[3] || match[4] || '').trim();

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
        }, [findScrollableAncestor]);

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
                                    onClick={() => setIsTableOverlayOpen(true)}
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
                    onClick={() => setIsTableOverlayOpen(false)}
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
                                    onClick={() => setIsTableOverlayOpen(false)}
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
                rehypePlugins={[rehypeRaw]}
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

    const stripHtml = (value) => (value ? value.replace(/<[^>]*>/g, '') : '');

    const ProcessLinks2 = ({ text }) => (
        // replace [aaa](bbb) with <a href="bbb">aaa</a>
        !text ? [] :
            text.split(/(\[[^\]]+\]\([^)]+\)|\[[^\]]+\])/)
                .flatMap((part, index) => part.match(/^\[[^\]]+\]$/) // if [text]
                    ?
                    part.split(/(\d+)/g).map((subPart, subIndex) =>
                        subPart.match(/^\d{8}$/) //if all digit
                            ? { text: subPart, type: "pubmedid" }
                            : { text: subPart, type: "text" }
                    )
                    : [part.match(/^\[[^\]]+\]\([^)]+\)$/)  // if [text](url)
                        ? (() => {
                            const textPart = part.split("]")[0].substr(1);
                            const urlPart = part.split("(")[1].slice(0, -1);
                            const pubmedMatch = String(urlPart).match(/^https?:\/\/(?:www\.)?pubmed(?:\.ncbi\.nlm\.nih\.gov|\.gov)\/(\d{7,8})\/?/i);
                            if (pubmedMatch?.[1]) {
                                return { text: pubmedMatch[1], type: "pubmedid" };
                            }
                            return { text: textPart, type: "link", url: urlPart };
                        })()
                        : { text: part, type: "text" }]
                )
    )

    // process links in the AI answer text
    const ProcessLinks = ({ text }) => (
        // replace [aaa](bbb) with <a href="bbb">aaa</a>
        ProcessLinks2({ text: text }).map((part, index) =>
            part.type === "pubmedid" ? (
                <Link
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
                        const target = document.getElementById(`reference-item-${part.text}`);
                        if (target) {
                            target.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                    }}
                    key={index}
                >{part.text}</Link>
            ) : part.type === "link" ? (<a
                href={part.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#0069c2", textDecoration: "none" }}
                key={index}
            >
                {part.text}
            </a>
            ) : (<span key={index}>
                {part.text.split("\n").map((line, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <br />}{line}
                    </React.Fragment>
                ))}
            </span>)
        ));

    const debugMessage = (question, agentRawResult) => {
        return "\n\n\n==LOG===========================\nQuestion:\n" + question + "\n\nRaw AI Agent Result:\n" + JSON.stringify(agentRawResult, null, 2);
    }

    // Fetch articles data in PRODUCTION mode based on aiAnswer
    useEffect(() => {
        if (demoMode || planDemoMode || debug) {
            // Skip in demo or debug mode
            return;
        }

        if (!!aiAnswer) {
            const pmids = extractPmidsFromCitationText(getReferenceParsingBody(aiAnswer), 50);
            if (pmids.length > 0) {
                setReferencesLoading(true);
                dispatch(queryArticles({
                    db: 'pubmed',
                    id: pmids.join(','),
                    retmode: 'json',
                })).then((response) => {
                    setReferencesLoading(false);
                    if (!response.payload ||
                        Object.keys(response.payload.result || {})
                            .some(pmid => pmid !== "uids" && !response.payload.result[pmid]?.authors)
                    ) {
                        setAgentErrorType('fail_to_give_answer');
                        return;
                    }
                    setArticlesData(
                        pmids.map(pmid => ({
                            pmid: pmid,
                            data: response.payload.result[pmid] || {},
                            doi: response.payload.result[pmid]?.articleids?.find(id => id.idtype === 'doi')?.value || ''
                        }))
                    );
                }).catch((err) => {
                    setReferencesLoading(false);
                    console.error('[Production Mode] Article fetch error:', err);
                });
            } else {
                setArticlesData([]);
            }
        } else {
            setArticlesData([]);
        }
    }, [aiAnswer, demoMode, planDemoMode, debug, dispatch, getReferenceParsingBody]);

    // Fetch articles data in DEBUG mode based on streamComplete
    useEffect(() => {
        if (demoMode || planDemoMode || !debug || !streamComplete) {
            // Skip in demo mode or if not in debug mode or stream not complete
            return;
        }

        const textToExtractFrom = streamAnswer || streamedSummary;

        if (!!textToExtractFrom) {
            const pmids = extractPmidsFromCitationText(getReferenceParsingBody(textToExtractFrom), 50);
            if (pmids.length > 0) {
                setReferencesLoading(true);
                dispatch(queryArticles({
                    db: 'pubmed',
                    id: pmids.join(','),
                    retmode: 'json',
                })).then((response) => {
                    setReferencesLoading(false);
                    if (!response.payload ||
                        Object.keys(response.payload.result || {})
                            .some(pmid => pmid !== "uids" && !response.payload.result[pmid]?.authors)
                    ) {
                        // Don't set error in debug mode - just skip articles
                        return;
                    }
                    setArticlesData(
                        pmids.map(pmid => ({
                            pmid: pmid,
                            data: response.payload.result[pmid] || {},
                            doi: response.payload.result[pmid]?.articleids?.find(id => id.idtype === 'doi')?.value || ''
                        }))
                    );
                }).catch((err) => {
                    setReferencesLoading(false);
                    console.error('[Debug Mode] Article fetch error:', err);
                });
            } else {
                setArticlesData([]);
            }
        } else {
            setArticlesData([]);
        }
    }, [streamComplete, demoMode, planDemoMode, debug, streamAnswer, streamedSummary, dispatch, getReferenceParsingBody]);

    // Create skeleton placeholder items for references while loading
    const referencesSkeletonItems = Array.from({ length: 3 }, (_, index) => ({
        id: `skeleton-${index}`,
        title: '',
        subtitle: '',
        isSkeleton: true,
    }));

    // Show skeleton while loading, otherwise show actual articles
    const showReferenceSkeleton = referencesLoading && articlesData.length === 0;

    const referencesItems = showReferenceSkeleton
        ? referencesSkeletonItems
        : articlesData.map((ref, index) => ({
            id: index + 1,
            title: ref.data?.title || `PMID: ${ref.pmid}`,
            subtitle: buildArticleReferenceSubtitle(ref),
            href: `https://pubmed.gov/${ref.pmid}`,
            pmid: ref.pmid,
            anchorId: `reference-item-main-${ref.pmid}-${index + 1}`,
        }));

    const mainReferenceAnchorByPmid = React.useMemo(
        () => referencesItems.reduce((acc, item) => {
            if (item?.pmid && !acc[item.pmid]) {
                acc[item.pmid] = item.anchorId;
            }
            return acc;
        }, {}),
        [referencesItems]
    );

    const empiricalEvidenceContent = referenceData?.empirical_evidence ? (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'center' }}>
            {referenceData.empirical_evidence.lambda_function && !(typeToImage?.length) ? (
                <Box sx={{
                    backgroundColor: '#F2FAFB',
                    borderRadius: 2,
                    width: '100%',
                    maxWidth: { xs: '100%', md: 520 },
                    minHeight: 200,
                    maxHeight: 260,
                    height: 260,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <CircularProgress size={28} />
                </Box>
            ) : (
                <Box sx={{ position: 'relative', width: '100%', maxWidth: { xs: '100%', md: 520 }, minHeight: 200, maxHeight: 260 }}>
                    <Box
                        component="img"
                        src={referenceData.empirical_evidence.lambda_function ?
                            (typeToImage?.length ? `data:image/jpeg;base64,${typeToImage}` : "")
                            : VisuImage}
                        alt="Empirical Evidence"
                        sx={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 2, cursor: 'pointer' }}
                        onClick={() => setImagePopupOpen(true)}
                    />
                    <Typography
                        onClick={() => setImagePopupOpen(true)}
                        sx={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            borderRadius: '6px',
                            padding: '4px 10px',
                            background: 'rgba(74, 74, 75, 0.7)',
                            fontFamily: 'Open Sans',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'white',
                            transition: 'background 0.2s ease',
                            cursor: 'pointer',
                            '&:hover': {
                                background: 'rgba(74, 74, 75, 0.4)',
                            },
                        }}
                    >
                        View
                    </Typography>
                </Box>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography sx={{ fontFamily: 'Open Sans', fontSize: 16, fontWeight: 700 }}>
                    {referenceData.empirical_evidence.title}
                </Typography>
                <Typography sx={{ fontFamily: 'Open Sans', fontSize: 14, fontWeight: 400, color: '#263238' }}>
                    {referenceData.empirical_evidence.description}
                </Typography>
                {referenceData.empirical_evidence.link_text ? (
                    <Link
                        href={referenceData.empirical_evidence.link || handleDownload2(referenceData.empirical_evidence.folder, referenceData.empirical_evidence.credible_set)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ textDecoration: 'none' }}
                    >
                        <Typography sx={{
                            cursor: 'pointer',
                            fontFamily: 'Open Sans',
                            fontSize: 14,
                            paddingY: 1,
                            paddingX: 2,
                            backgroundColor: '#219197',
                            textAlign: 'center',
                            borderRadius: 2,
                            color: 'white',
                            fontWeight: 600,
                            width: 'fit-content',
                        }}>{referenceData.empirical_evidence.link_text}
                        </Typography>
                    </Link>
                ) : null}
            </Box>
        </Box>
    ) : null;

    const pankbaseItems = (referenceData?.pankbase_links || []).map((link, index) => ({
        id: index + 1,
        title: link[0],
        subtitle: link[1],
        href: link[1],
    }));

    const externalItems = (referenceData?.external_links || []).map((link, index) => ({
        id: index + 1,
        title: link[0],
        subtitle: link[1],
        href: link[2],
    }));

    const evidenceTabs = [
        (referencesItems.length || referencesLoading || debug) ? { label: 'References', items: referencesItems } : null,
        empiricalEvidenceContent ? { label: 'Empirical Evidence', content: empiricalEvidenceContent } : null,
        pankbaseItems.length ? { label: 'Pankbase Links', items: pankbaseItems } : null,
        externalItems.length ? { label: 'External Links', items: externalItems } : null,
    ].filter(Boolean);

    const knowledgeGraphContent = (
        graphData ? (
            <Box sx={{ width: '100%', height: '100%' }}>
                <KnowledgeGraph
                    graphData={graphData}
                    coordData={coordData}
                    sx={{ height: "100%" }}
                    containerHeight="100%"
                />
            </Box>
        ) : noGraph ? (
            <NoGraphData />
        ) : (
            <Box sx={{ width: '100%', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={28} />
            </Box>
        )
    );

    const planKnowledgeGraphContent = (
        graphData ? (
            <Box sx={{ width: '100%', height: '100%' }}>
                <KnowledgeGraph
                    graphData={graphData}
                    coordData={coordData}
                    sx={{ height: "100%" }}
                    containerHeight="100%"
                    defaultLegendVisible={false}
                />
            </Box>
        ) : noGraph ? (
            <NoGraphData />
        ) : (
            <Box sx={{ width: '100%', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={28} />
            </Box>
        )
    );

    const demoKnowledgeGraphContent = (
        <Box sx={{ width: '100%', height: '100%' }}>
            <KnowledgeGraph
                graphData={demoGraphData}
                coordData={demoCoordData}
                sx={{ height: "100%" }}
                containerHeight="100%"
            />
        </Box>
    );

    // Reusable visual material tabs definition
    const buildVisualMaterialTabs = (graphContent, functionalRequestPath = '') => {
        const functionalTab = functionalRequestPath
            ? {
                label: 'Functional Data',
                content: <FunctionalDataChartPanel requestPath={functionalRequestPath} />,
            }
            : null;

        if (isAgentResultRoute && functionalTab) {
            return [
                functionalTab,
                { label: 'Knowledge Graph', content: graphContent },
            ];
        }

        return [
            { label: 'Knowledge Graph', content: graphContent },
            ...(functionalTab ? [functionalTab] : []),
        ];
    };

    const buildDemoPageData = (index) => ({
        questionId: `Q${index}`,
        title: `Demo Question ${index}: CFTR gene function overview`,
        aiOverview: {
            sections: [
                {
                    content: markdownSummaryContent,
                },
                parsePlanMarkdownForUI,
            ],
        },
        graphData: demoGraphData,
        visualMaterial: {
            title: "Visual Material",
            tabs: buildVisualMaterialTabs(demoKnowledgeGraphContent, ''),
        },
        evidences: {
            title: "Evidences",
            tabs: [
                {
                    label: "References",
                    items: [
                        { id: 1, title: "Fine-mapping links CFTR to T1D", subtitle: "NATURE GENETICS, 2021 • PMID: 34127860" },
                        { id: 2, title: "CFTR regulatory variants in pancreas", subtitle: "NATURE GENETICS, 2021 • PMID: 34127860" },
                    ],
                },
                {
                    label: "eQTL Data",
                    items: [
                        { id: 3, title: "GTEx Pancreas eQTL for rs2402203", subtitle: "GTEx PORTAL • V8" },
                        { id: 4, title: "Multi-tissue eQTL analysis", subtitle: "GTEX CONSORTIUM, 2020 • PMID: 32913098" },
                    ],
                },
                {
                    label: "GWAS",
                    items: [
                        { id: 5, title: "Type 1 diabetes GWAS meta-analysis", subtitle: "DIABETOLOGIA, 2021 • PMID: 33686435" },
                        { id: 6, title: "Pancreatic function GWAS", subtitle: "NAT GENET, 2019 • PMID: 31413320" },
                    ],
                },
            ],
        },
        followUp: {
            title: "Follow Up",
            items: [
                { label: "How does rs2402203 affect CFTR expression?", href: "#" },
                { label: "What tissues show CFTR QTL signals?", href: "#" },
            ],
        },
    });

    const buildPlanDemoPageData = () => ({
        questionId: 'PLAN',
        title: 'Confirm Query & Execution Steps',
        originalQuestion: planDemoQuestion,
        parsedTitle: 'TP53 function, ontology annotations, and T1D-relevant evidence synthesis',
        agentPlan: `### Planned Steps
1. Validate the original query intent and core entities.
2. Retrieve TP53 functional and ontology evidence from PanKgraph.
3. Cross-check literature support for T1D-relevant context.
4. Prepare response summary and related graph visualization.

Please review this plan and provide edits if needed.`,
        onSendFeedback: (text) => {
            console.log('[Plan Demo] User feedback:', text);
        },
        onProceed: () => {
            console.log('[Plan Demo] Proceed confirmed');
        },
        graphData: demoGraphData,
        visualMaterial: {
            title: 'Visual Material',
            tabs: [{ label: 'Knowledge Graph', content: demoKnowledgeGraphContent }],
        },
    });

    const buildTerminalPlanPageData = () => ({
        questionId: 'PLAN',
        title: 'Confirm Query & Execution Steps',
        originalQuestion: currentQuestion || question,
        hideOriginalQueryBox: functionalAutoPromptRef.current,
        parsedTitle: planParsedTitle || '',
        agentPlan: planSummary || streamAnswer || streamedSummary || 'No plan generated yet.',
        onSendFeedback: async (text) => {
            if (isChatApiMode && chatStartPendingPlanSessionId) {
                await runChatStartPlanReviseCycle(text || '');
                return;
            }
            await runPlanningCycle(text);
        },
        onProceed: async () => {
            setPlanRevisionWarningOpen(false);
            if (isChatApiMode && chatStartPendingPlanSessionId) {
                if (chatStartPlanConfirming) return;
                await runChatStartConfirmCycle();
                return;
            }
            if (terminalConfirming) return;
            await runConfirmCycle();
        },
        disableRevise: planHasGraphQuery && isPlanGraphQueryLoading,
        disableProceed: planHasGraphQuery && isPlanGraphQueryLoading,
        graphData,
        visualMaterial: {
            title: 'Visual Material',
            tabs: [{ label: 'Knowledge Graph', content: planKnowledgeGraphContent }],
        },
    });

    const pageData = {
        styleVariant: 'pank1',
        questionId: "Q1",
        title: planParsedTitle || '',
        aiOverview: {
            sections: [
                {
                    heading: undefined,
                    content: shouldShowSkeleton
                        ? <SummarySkeleton />
                        : ((terminalMode && terminalPhase === 'result' && terminalSummaryLoading && !activeSummary)
                            ? (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                    <Typography component="span" sx={{ fontSize: 16, color: '#475569' }}>
                                        AI summary is generating...
                                    </Typography>
                                    <CircularProgress size={14} />
                                </Box>
                            )
                            : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                    {markdownSummaryContent}
                                    {showLiteratureSummarizing ? (
                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                            <Typography component="span" sx={{ fontSize: 16, color: '#475569' }}>
                                                Summarizing literature...
                                            </Typography>
                                            <CircularProgress size={14} />
                                        </Box>
                                    ) : null}
                                </Box>
                            )),
                },
                debug && !streamComplete ? {
                    heading: "Thinking Process",
                    content: (
                        <Box ref={thinkingBoxRef} sx={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            overflowX: "auto",
                            overflowY: "auto",
                            maxHeight: 300,
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                            fontSize: 12,
                            color: "#334155",
                            backgroundColor: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                            borderRadius: 2,
                            padding: 2,
                        }}>
                            {thinkingLines.length
                                ? thinkingLines.join("\n")
                                : "Waiting for stream events..."}
                        </Box>
                    ),
                } : null,
            ].filter((section) => section && (section.body || section.content)),
            isLoading: isAiSummaryLoading,
            scrollToTop: streamComplete,
        },
        graphData: graphData,
        visualMaterial: {
            title: "Visual Material",
            noGraph: noGraph && !functionalDataRequestPath,
            tabs: buildVisualMaterialTabs(knowledgeGraphContent, functionalDataRequestPath),
        },
        evidences: evidenceTabs.length ? { title: "Evidences", tabs: evidenceTabs } : undefined,
        followUp: {
            title: "Follow Up",
            loading: (terminalMode && !isChatApiMode && (!streamComplete || terminalSummaryLoading || terminalPhase !== 'result')) || hasPendingFollowUpWork,
            disabled: !isQuestionComplete,
            onSelect: (item, event) => {
                event?.preventDefault?.();
                startFollowUpQuestion(item?.label || item?.question || '');
            },
            items: (nextQuestions || [])
                .filter((item) => item?.question)
                .map((item) => ({
                    label: stripHtml(item.question),
                })),
        },
    };
    const shouldShowPlannerPage = planDemoMode
        || (!forceResultView && (
            (terminalMode && terminalPhase === 'confirm')
            || (isChatApiMode && chatRouteState === 'new_query_pending')
            || (isChatApiMode && Boolean(chatStartPendingPlanSessionId))
        ));
    const hideFloatingSearchBar = terminalMode
        && !hasPendingFollowUpWork
        && (terminalPhase === 'loading' || terminalPhase === 'confirm');

    const resolvedPageData = planDemoMode
        ? buildPlanDemoPageData()
        : (shouldShowPlannerPage
            ? buildTerminalPlanPageData()
            : (demoMode ? buildDemoPageData(demoIndex) : pageData));
    const anchorPrefix = contentAnchorPrefix || `result-${demoIndex}`;
    const lastMetaRef = useRef("");
    const showDebugStreamLoading = !terminalMode && !demoMode && !planDemoMode && debug && !streamComplete && !streamMilestones.cypherGenerated;

    useEffect(() => {
        if (!onContentMeta) return;
        const aiHeadings = (resolvedPageData?.aiOverview?.sections ?? [])
            .map((section, index) => (section?.heading ? ({ label: section.heading, index }) : null))
            .filter(Boolean);
        const serializableMeta = {
            anchorPrefix,
            aiHeadings,
            hasVisual: Boolean(resolvedPageData?.visualMaterial),
            hasEvidences: Boolean(resolvedPageData?.evidences),
            hasFollowUp: Boolean(resolvedPageData?.followUp),
            isQuestionComplete,
            isPlanning: isPlanningPhase,
            hideFloatingSearchBar,
        };
        const serialized = JSON.stringify(serializableMeta);
        if (serialized === lastMetaRef.current) return;
        lastMetaRef.current = serialized;
        onContentMeta({ ...serializableMeta, followUpHandler: isChatApiMode ? handleSendFollowUp : null });
    }, [anchorPrefix, onContentMeta, resolvedPageData, isQuestionComplete, isPlanningPhase, hideFloatingSearchBar, isChatApiMode, handleSendFollowUp]);

    if (agentErrorType) {
        const agentErrorPayload = getAgentErrorPayload(agentErrorType);
        return (
            <ErrorComponent
                errorTitle={agentErrorPayload.title}
                errorMessage={agentErrorPayload.content}
                errorImageSrc={agentErrorPayload.imageSrc}
                homePath="/"
                log={debugMessage(question, agentRawResult)}
            />
        );
    }

    if (aiLoading && !demoMode && !planDemoMode) {
        return <ResultComponentSkeleton />;
    }

    if (terminalMode && terminalLoading && terminalPhase !== 'confirm') {
        return (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingY: '200px' }}>
                <SearchResultLoading
                    streamProgress={buildDebugStreamLoadingProgress(streamMilestones, { minimumProgress: presetFirstStepProgress })}
                    handleClose={handleCancelAndGoHome}
                />
            </Box>
        );
    }

    if (showDebugStreamLoading) {
        return (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingY: '200px' }}>
                <SearchResultLoading
                    streamProgress={buildDebugStreamLoadingProgress(streamMilestones)}
                    handleClose={handleCancelAndGoHome}
                />
            </Box>
        );
    }

    return (
        <>
            <AlertMessage
                type="warning"
                content={
                    /^Revision Failed:/i.test(planRevisionWarningMessage || '')
                        ? planRevisionWarningMessage
                        : `Revision Failed: ${planRevisionWarningMessage || ''}`.trim()
                }
                open={planRevisionWarningOpen}
                onClose={() => setPlanRevisionWarningOpen(false)}
                sx={{
                    '& .MuiSnackbar-root': {
                        position: 'static',
                        transform: 'none',
                        top: 'auto',
                        left: 'auto',
                        right: 'auto',
                        bottom: 'auto',
                    },
                    '& .MuiAlert-root': {
                        marginBottom: '10px',
                    }
                }}
            />
            <Backdrop
                sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 2 })}
                open={followUpSubmitting}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <CircularProgress size={32} sx={{ color: '#FFFFFF' }} />
                    <Typography sx={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600 }}>
                        Analyzing your question...
                    </Typography>
                </Box>
            </Backdrop>
            <Backdrop
                sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 2 })}
                open={isPlanRevisionInProgress || isFollowUpPlanRevisionInProgress}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <CircularProgress size={32} sx={{ color: '#FFFFFF' }} />
                    <Typography sx={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600 }}>
                        Revising plan...
                    </Typography>
                </Box>
            </Backdrop>
            {referenceData?.empirical_evidence ? (
                <Backdrop
                    sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
                    open={imagePopupOpen}
                    onClick={() => setImagePopupOpen(false)}
                >
                    <Box
                        component="img"
                        src={referenceData.empirical_evidence?.lambda_function ? (typeToImage?.length && `data:image/jpeg;base64,${typeToImage}`) : VisuImage}
                        alt="Empirical Evidence"
                        sx={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                        }}
                    />
                </Backdrop>
            ) : null}
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', px: { xs: 2, md: 3 }, py: 3 }}>
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {planDemoMode ? (
                        <PlanConfirmationPage data={resolvedPageData} contentAnchorPrefix={anchorPrefix} />
                    ) : shouldShowPlannerPage ? (
                        <PlanConfirmationPage data={resolvedPageData} contentAnchorPrefix={anchorPrefix} />
                    ) : (
                        <QuestionAnswerPage data={resolvedPageData} contentAnchorPrefix={anchorPrefix} />
                    )}

                    {isChatApiMode ? followUpBlocks.map((block, index) => {
                        if (block.type === 'loading') {
                            return null;
                        }

                        if (block.type === 'plan') {
                            const followUpPlanData = {
                                questionId: `Q${index + 2}`,
                                title: 'Confirm Follow-up Plan',
                                originalQuestion: block.question,
                                parsedTitle: block.title || block.question,
                                agentPlan: block.planMarkdown || '',
                                onSendFeedback: async (text) => {
                                    const revisedPrompt = String(text || '').trim();
                                    if (!revisedPrompt) return;
                                    setFollowUpBlocks((prev) => prev.map((item) => (
                                        item.id === block.id ? { ...item, error: '', revising: true } : item
                                    )));
                                    try {
                                        const revised = await revisePlanSession(block.planSessionId, revisedPrompt);
                                        if (revised?.error !== null && revised?.error !== undefined) {
                                            const failureMessage = typeof revised.error === 'string' ? revised.error : JSON.stringify(revised.error);
                                            setFollowUpBlocks((prev) => prev.map((item) => (
                                                item.id === block.id ? { ...item, revising: false, error: failureMessage || 'Plan revision failed. Previous plan is kept.' } : item
                                            )));
                                            return;
                                        }

                                        const { interpretedQuestion, planMarkdown } = parsePlanMarkdownForUI(revised?.plan_markdown || '');
                                        setFollowUpBlocks((prev) => prev.map((item) => (
                                            item.id === block.id
                                                ? {
                                                    ...item,
                                                    title: interpretedQuestion || item.question,
                                                    planMarkdown: planMarkdown || revised?.plan_markdown || item.planMarkdown,
                                                    revisionPrompt: revisedPrompt,
                                                    revising: false,
                                                    error: '',
                                                }
                                                : item
                                        )));

                                        const planCypherQueries = extractPlanCypherQueries(revised?.plan_json || {});
                                        if (planCypherQueries.length) {
                                            await fetchGraphFromCypher(planCypherQueries);
                                        }
                                    } catch (err) {
                                        setFollowUpBlocks((prev) => prev.map((item) => (
                                            item.id === block.id
                                                ? { ...item, revising: false, error: err?.response?.data?.detail || err?.message || 'Plan revision failed. Previous plan is kept.' }
                                                : item
                                        )));
                                    }
                                },
                                onProceed: async () => {
                                    await handleConfirmPendingPlan(block.id);
                                },
                            };

                            return (
                                <Box key={block.id} ref={index === followUpBlocks.length - 1 ? followUpPendingAnchorRef : undefined}>
                                    <PlanConfirmationPage data={followUpPlanData} contentAnchorPrefix={`${anchorPrefix}-followup-plan-${index + 1}`} />
                                    {block.error ? (
                                        <Typography sx={{ color: '#B91C1C', fontSize: 13, mt: 1 }}>{block.error}</Typography>
                                    ) : null}
                                </Box>
                            );
                        }

                        if (block.type === 'answer') {
                            return (
                                <QuestionAnswerPage
                                    key={block.id}
                                    data={buildFollowUpAnswerData(block, index)}
                                    contentAnchorPrefix={`${anchorPrefix}-followup-${index + 1}`}
                                />
                            );
                        }

                        return (
                            <Box key={block.id} sx={{ border: '1px solid #FECACA', borderRadius: 2, p: 2, bgcolor: '#FEF2F2' }}>
                                <Typography sx={{ color: '#B91C1C', fontSize: 14 }}>
                                    {block.error || 'Follow-up request failed.'}
                                </Typography>
                            </Box>
                        );
                    }) : null}

                    {isChatApiMode && chatHistoryCompressed ? (
                        <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                            Older messages were summarized by the server to fit context.
                        </Typography>
                    ) : null}
                </Box>
            </Box>
        </>
    );
}

export default SearchResult;
