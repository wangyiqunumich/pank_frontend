import './scoped.css';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import JSON5 from 'json5';
import {
  useDispatch,
  useSelector,
} from 'react-redux';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  InfoOutlined as InfoOutlineIcon,
  Mail as MailIcon,
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
  ResultComponentSkeleton,
} from '../components/ResultComponent';
import VisuImage from '../image/output.png';
import { queryAiAgent } from '../redux/aiAgentSlice';
import { queryArticles } from '../redux/articlesSlice';
import { queryQueryResultPage } from '../redux/queryResultPage';
import { querySupportingMaterial } from '../redux/supportingMaterialSlice';
import { queryImage } from '../redux/typeToImageSlice';
import tooltipsSchema from '../schema/tool_tips_schema.json';
import { addHighlight } from '../utils/textProcessing';
import { GenomeBrowserEmbed } from './AgentResult';
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

const defaultNextQuestion = {
    question: 'How does {INS} expression change in {beta cell} in T1D vs non-diabetic samples?',
    link: '/result?sourceTerm=gene@ENSG00000254647&targetTerm=cell_type&relationship=express_in'
}

const DEBUG_STREAM_LOADING_ENTRIES = [
    {
        short_title: 'complexity',
        title: 'Complexity Classification',
        steps: ['Classifying query complexity...'],
    },
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
        short_title: 'cypher',
        title: 'Cypher Generation',
        steps: ['Preparing Cypher execution...'],
    },
];

const getInitialStreamMilestones = () => ({
    complexityDone: false,
    planningDone: false,
    hirnDone: false,
    cypherStarted: false,
});

const buildDebugStreamLoadingProgress = (milestones) => {
    const entryStates = DEBUG_STREAM_LOADING_ENTRIES.map(() => ({ step: -1, isFinished: false }));

    if (!milestones.complexityDone) {
        entryStates[0] = { step: 0, isFinished: false };
    } else {
        entryStates[0] = { step: 1, isFinished: true };
        if (!milestones.planningDone) {
            entryStates[1] = { step: 0, isFinished: false };
        } else {
            entryStates[1] = { step: 1, isFinished: true };
            if (!milestones.hirnDone) {
                entryStates[2] = { step: 0, isFinished: false };
            } else {
                entryStates[2] = { step: 1, isFinished: true };
                entryStates[3] = { step: 0, isFinished: false };
            }
        }
    }

    const completedCount = [
        milestones.complexityDone,
        milestones.planningDone,
        milestones.hirnDone,
    ].filter(Boolean).length;

    let shortTitle = DEBUG_STREAM_LOADING_ENTRIES[0].short_title;
    if (milestones.complexityDone && !milestones.planningDone) {
        shortTitle = DEBUG_STREAM_LOADING_ENTRIES[1].short_title;
    } else if (milestones.planningDone && !milestones.hirnDone) {
        shortTitle = DEBUG_STREAM_LOADING_ENTRIES[2].short_title;
    } else if (milestones.hirnDone) {
        shortTitle = DEBUG_STREAM_LOADING_ENTRIES[3].short_title;
    }

    return {
        title: 'Answering your question...',
        tip: 'Streaming progress is based on backend events.',
        cancel: 'Cancel and ask a new question',
        entries: DEBUG_STREAM_LOADING_ENTRIES,
        entryStates,
        shortTitle,
        progress: (completedCount / DEBUG_STREAM_LOADING_ENTRIES.length) * 100,
    };
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
        height: '600px',
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

function SearchResult({ demoIndex = 1, contentAnchorPrefix, onContentMeta } = {}) {
    const dispatch = useDispatch();
    const location = useLocation();
    const demoMode = React.useMemo(
        () => new URLSearchParams(location.search).get('demo') === 'true',
        [location.search]
    );

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
    const [imagePopupOpen, setImagePopupOpen] = useState(false);
    const [nextQuestions, setNextQuestions] = useState([{ question: '[WIP]' }]);
    const [allNextQuestions, setAllNextQuestions] = useState(null);
    const [error, setError] = useState(false);
    const [aiLoading, setAiLoading] = useState(true);
    const [noGraph, setNoGraph] = useState(false);
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
    const streamSummaryRef = useRef('');
    const streamAnswerRef = useRef('');
    const thinkingBoxRef = useRef(null);

    useEffect(() => {
        if (demoMode) {
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

            const replacedList = (validatedList?.length > 0 ? validatedList : [defaultNextQuestion])
                .map(
                    (validatedQuestion) => ({
                        ...validatedQuestion,
                        question: addHighlight(validatedQuestion.question),
                    })
                )
            setNextQuestions(replacedList);
        }
        helperFunction();
    }, [allNextQuestions]);

    // initialize the reference data from viewSchema w/ replacements
    useEffect(() => {
        if (demoMode) {
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
    }, [graphData]);

    // init: get URL parameters and dispatch actions
    useEffect(() => {
        if (demoMode) {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const question = base64ToUtf8(params?.get('question'));
        setQuestion(question);
        const debug = params.get('debug') === 'true';
        setDebug(debug);
        console.log('Received question:', question);
        if (!question) {
            console.log('[ERROR] No question found in URL parameters.');
            setError(true);
            return;
        }

        if (debug) {
            setCurrentQuestion(question);
            setAiLoading(false);
            // In debug mode, don't disable graph - it will be populated from final_response event
            return;
        }

        console.log('Querying AI agent...');
        const thunk = dispatch(queryAiAgent(debug ? { debug: true } : { question: question, "agent_name": "pankbase" }));
        thunkref.current = thunk;
        thunk.then((response) => {
            const agentResult = JSON.parse(response.payload.answer || '{}')?.text || {};
            console.log('AI Agent Result:', agentResult);
            if (agentResult.template_matching !== 'agent_answer') {
                console.log('Template matching result:', agentResult.template_matching);
                //should be aaa - bbb - ccc
                //navigate to /result?sourceTerm=aaa&targetTerm=ccc&relationship=bbb
                if (!agentResult.template_matching || agentResult.template_matching.split(' - ').length !== 3) {
                    console.log('[ERROR] Invalid template matching');
                    setError(true);
                    return;
                }
                const [sourceTerm, relationship, targetTerm] = agentResult.template_matching.split(' - ');
                const page = relationship === 'express_in' ? 'result' : 'intermediate';
                const newUrl = `/${page}?sourceTerm=${sourceTerm}&targetTerm=${targetTerm}&relationship=${relationship}`;
                window.location.href = newUrl;
                return;
            }
            if (!debug) {
                setAiAnswer(agentResult.summary || {});
            }
            // setMainCypher(agentResult.cypher || '');

            setCurrentQuestion(question);
            // dispatch(queryQueryResult({ query: agentResult.cypher, isNeptune: true })).then((response) => {
            //     if (!response.payload || response.error) {
            //         setError(true);
            //         return;
            //     }
            //     // setGraphData(response.payload?.results?.[0] || {});
            //     dispatch(queryGraphviewer({ "query_result": response.payload })).then((response) => {
            //         setGraphData(response.payload?.filtered_graph?.results?.[0] || {});
            //         setCoordData(response.payload?.xy_coords || {});
            //         setAiLoading(false);
            //     });
            // });
            console.log('Cypher query:', agentResult.cypher);
            if (!agentResult.cypher || agentResult.cypher.length === 0) {
                console.log('[ERROR] Invalid Cypher query');
                setError(true);
                return;
            }
            setAiLoading(false);
            console.log('Graph query disabled: skipping queryQueryResultPage');
            setNoGraph(true);
        });
    }, []);

    useEffect(() => {
        if (!debug || demoMode) {
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
                    body: JSON.stringify({ question: question || '' }),
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
                setStreamMilestones((prev) => ({ ...prev, complexityDone: true }));
            }

            if (event?.event === 'plan_generated' || event?.event === 'planner_decision') {
                setStreamMilestones((prev) => ({ ...prev, planningDone: true }));
            }

            if (event?.event === 'hirn_result') {
                setStreamMilestones((prev) => ({ ...prev, hirnDone: true }));
            }

            if (event?.event === 'cypher_executing') {
                setStreamMilestones((prev) => ({ ...prev, cypherStarted: true }));
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
                console.log('[final_response] Raw response (first 200 chars):',
                    typeof event.data.response === 'string'
                        ? event.data.response.substring(0, 200)
                        : JSON.stringify(event.data.response).substring(0, 200)
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
                    const summary = responseData?.text?.summary || '';

                    console.log('[final_response] Extracted cypher queries:', cypherQueries.length, 'queries');
                    console.log('[final_response] Summary length:', summary.length, 'chars');

                    // Update summary from final_response
                    if (summary) {
                        console.log('[final_response] Setting summary from final_response');
                        setStreamAnswer(summary);
                        streamAnswerRef.current = summary;
                    }

                    if (cypherQueries.length > 0) {
                        console.log('[final_response] Querying graph data with', cypherQueries.length, 'queries...');
                        dispatch(queryQueryResultPage({
                            payload: {
                                "cypher": cypherQueries,
                                "rdb_query": ""
                            }, agent: true
                        })).then((response) => {
                            console.log('[final_response] Graph data received:', response?.payload);
                            if (response?.payload?.combined_query_result) {
                                setGraphData(response.payload.combined_query_result);
                                console.log('[final_response] ✓ Graph data set successfully');
                            } else {
                                console.log('[final_response] ⚠ No combined query result found');
                                setNoGraph(true);
                            }
                        }).catch((err) => {
                            console.error('[final_response] ✗ Graph query error:', err?.message || err);
                            setNoGraph(true);
                        });
                    } else {
                        console.log('[final_response] ⚠ No cypher queries found');
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
    }, [debug, demoMode, question, dispatch]);

    const removeConsecutiveAsterisks = (text) => {
        return text.replace(/\*\*/g, '');
    };

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

    // Show skeleton if we're in debug mode streaming but haven't received summary yet
    const shouldShowSkeleton = debug && !streamedSummary && !streamComplete;

    const displaySummary = removeConsecutiveAsterisks(
        demoMode
            ? (sampleSummaryData?.summary || '')
            : (activeSummary || summaryPlaceholder)
    );

    const stripHtml = (value) => (value ? value.replace(/<[^>]*>/g, '') : '');

    const buildReferenceSubtitle = (ref) => {
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
                        ? { text: part.split("]")[0].substr(1), type: "link", url: part.split("(")[1].slice(0, -1) }
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

    // Track if references are loading
    const [referencesLoading, setReferencesLoading] = useState(false);

    // Fetch articles data in PRODUCTION mode based on aiAnswer
    useEffect(() => {
        if (demoMode || debug) {
            // Skip in demo or debug mode
            return;
        }

        if (!!aiAnswer) {
            const pmidsFromText = ProcessLinks2({ text: aiAnswer })?.filter(part => part.type === "pubmedid").map(part => (part.text)) || [];
            const pmids = [...new Set(pmidsFromText)].slice(0, 50);
            console.log('[Production Mode] Fetching articles for PMIDs:', pmids);
            if (pmids.length > 0) {
                setReferencesLoading(true);
                dispatch(queryArticles({
                    db: 'pubmed',
                    id: pmids.join(','),
                    retmode: 'json',
                })).then((response) => {
                    setReferencesLoading(false);
                    console.log('[Production Mode] Articles data received:', response.payload);
                    if (!response.payload ||
                        Object.keys(response.payload.result || {})
                            .some(pmid => pmid !== "uids" && !response.payload.result[pmid]?.authors)
                    ) {
                        console.log('[ERROR] Invalid article data');
                        setError(true);
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
            }
        }
    }, [aiAnswer, demoMode, debug, dispatch]);

    // Fetch articles data in DEBUG mode based on streamComplete
    useEffect(() => {
        if (demoMode || !debug || !streamComplete) {
            // Skip in demo mode or if not in debug mode or stream not complete
            return;
        }

        const textToExtractFrom = streamAnswer || streamedSummary;

        if (!!textToExtractFrom) {
            const pmidsFromText = ProcessLinks2({ text: textToExtractFrom })?.filter(part => part.type === "pubmedid").map(part => (part.text)) || [];
            const pmids = [...new Set(pmidsFromText)].slice(0, 50);
            console.log('[Debug Mode] Fetching articles for PMIDs:', pmids);
            if (pmids.length > 0) {
                setReferencesLoading(true);
                dispatch(queryArticles({
                    db: 'pubmed',
                    id: pmids.join(','),
                    retmode: 'json',
                })).then((response) => {
                    setReferencesLoading(false);
                    console.log('[Debug Mode] Articles data received:', response.payload);
                    if (!response.payload ||
                        Object.keys(response.payload.result || {})
                            .some(pmid => pmid !== "uids" && !response.payload.result[pmid]?.authors)
                    ) {
                        console.log('[Debug Mode ERROR] Invalid article data');
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
            }
        }
    }, [streamComplete, demoMode, debug, streamAnswer, streamedSummary, dispatch]);

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
            subtitle: buildReferenceSubtitle(ref),
            href: `https://pubmed.gov/${ref.pmid}`,
            anchorId: `reference-item-${ref.pmid}`,
        }));

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

    console.log('[References Debug]', {
        debug,
        showReferenceSkeleton,
        referencesLoading,
        referencesItemsLength: referencesItems.length,
        articlesDataLength: articlesData.length,
        streamedSummary: streamedSummary ? `${streamedSummary.substring(0, 100)}...` : 'empty',
    });

    const evidenceTabs = [
        (referencesItems.length || referencesLoading || debug) ? { label: 'References', items: referencesItems } : null,
        empiricalEvidenceContent ? { label: 'Empirical Evidence', content: empiricalEvidenceContent } : null,
        pankbaseItems.length ? { label: 'Pankbase Links', items: pankbaseItems } : null,
        externalItems.length ? { label: 'External Links', items: externalItems } : null,
    ].filter(Boolean);

    console.log('[Evidences Debug]', {
        evidenceTabsLength: evidenceTabs.length,
        evidenceTabsLabels: evidenceTabs.map(t => t.label),
    });

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
    const buildVisualMaterialTabs = (graphContent) => [
        { label: "Knowledge Graph", content: graphContent },
        {
            label: "Genome Browser",
            minHeight: 676,
            content: (
                <GenomeBrowserEmbed
                    locus="chr7:55,085,725-55,276,031"
                    compact
                    height="100%"
                    tracks={[]}
                />
            ),
            fullBleed: true,
        },
    ];

    const buildDemoPageData = (index) => ({
        questionId: `Q${index}`,
        title: `Demo Question ${index}: CFTR gene function overview`,
        aiOverview: {
            sections: [
                {
                    body: displaySummary,
                },
            ],
        },
        graphData: demoGraphData,
        visualMaterial: {
            title: "Visual Material",
            tabs: buildVisualMaterialTabs(demoKnowledgeGraphContent),
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

    const pageData = {
        questionId: "Q1",
        title: currentQuestion || question || "Question",
        aiOverview: {
            sections: [
                {
                    heading: undefined,
                    body: shouldShowSkeleton ? undefined : displaySummary,
                    content: shouldShowSkeleton ? <SummarySkeleton /> : undefined,
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
            tabs: buildVisualMaterialTabs(knowledgeGraphContent),
        },
        evidences: evidenceTabs.length ? { title: "Evidences", tabs: evidenceTabs } : undefined,
        followUp: {
            title: "Follow Up",
            items: (nextQuestions || [])
                .filter((item) => item?.question)
                .map((item) => ({
                    label: stripHtml(item.question),
                    href: item.link,
                    target: "_blank",
                })),
        },
    };
    const resolvedPageData = demoMode ? buildDemoPageData(demoIndex) : pageData;
    const anchorPrefix = contentAnchorPrefix || `result-${demoIndex}`;
    const lastMetaRef = useRef("");
    const showDebugStreamLoading = !demoMode && debug && !streamComplete && !streamMilestones.cypherStarted;

    useEffect(() => {
        if (!onContentMeta) return;
        const aiHeadings = (resolvedPageData?.aiOverview?.sections ?? [])
            .map((section, index) => (section?.heading ? ({ label: section.heading, index }) : null))
            .filter(Boolean);
        const meta = {
            anchorPrefix,
            aiHeadings,
            hasVisual: Boolean(resolvedPageData?.visualMaterial),
            hasEvidences: Boolean(resolvedPageData?.evidences),
            hasFollowUp: Boolean(resolvedPageData?.followUp),
        };
        const serialized = JSON.stringify(meta);
        if (serialized === lastMetaRef.current) return;
        lastMetaRef.current = serialized;
        onContentMeta(meta);
    }, [anchorPrefix, onContentMeta, resolvedPageData]);

    if (error) {
        return <ErrorComponent errorTitle={"Question Not Relevant"} errorMessage={"Your query doesn't match any relevant topic in PanKgraph. Please try rephrasing or explore related tutorials."} log={debugMessage(question, agentRawResult)} />;
    }

    if (aiLoading && !demoMode) {
        return <ResultComponentSkeleton />;
    }

    if (showDebugStreamLoading) {
        return (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingY: '200px' }}>
                <SearchResultLoading
                    streamProgress={buildDebugStreamLoadingProgress(streamMilestones)}
                    handleClose={() => {
                        if (thunkref.current) thunkref.current.abort();
                        navigate('/');
                    }}
                />
            </Box>
        );
    }

    return (
        <>
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
                <Box sx={{ width: '100%' }}>
                    <QuestionAnswerPage data={resolvedPageData} contentAnchorPrefix={anchorPrefix} />
                </Box>
            </Box>
        </>
    );
}

export default SearchResult;
