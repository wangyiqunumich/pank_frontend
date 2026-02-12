import './scoped.css';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

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
import {
  demoCoordData,
  demoGraphData,
} from './demo_graph_data';
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
        backgroundColor: '#F9FAFB',
    }}>

        <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: '24px', color: '#43AABA', marginBottom: '-12px', whiteSpace: 'nowrap' }}>
            No Knowledge Graph available for this answer.
        </Typography>

        <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 400, fontSize: '20px', color: '#6C6C6C' }}>
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

function SearchResult({ demoIndex = 1 } = {}) {
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
            setAiAnswer(agentResult.summary || {});
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
            console.log('Querying graph data...');
            dispatch(queryQueryResultPage({
                payload: {
                    "cypher": agentResult.cypher,
                    "rdb_query": ""
                }, agent: true
            })).then((response) => {
                console.log('Graph data received:', response.payload);
                if (!response.payload?.combined_query_result) {
                    console.log('[ERROR] No combined query result found');
                    setNoGraph(true);
                    // setError(true);
                    return;
                }
                setGraphData(response.payload?.combined_query_result || {});
                setCoordData(response.payload?.xy_json || {});
            });
        });
    }, []);

    const removeConsecutiveAsterisks = (text) => {
        return text.replace(/\*\*/g, '');
    };

    const summaryPlaceholder = "AI summary is generating...";
    const normalizedAnswer = typeof aiAnswer === "string" ? aiAnswer : "";
    const isAiSummaryLoading = !demoMode && !normalizedAnswer;
    const displaySummary = removeConsecutiveAsterisks(
        demoMode
            ? (sampleSummaryData?.summary || '')
            : (normalizedAnswer || summaryPlaceholder)
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

    // Fetch articles data based on aiAnswer
    useEffect(() => {
        if (demoMode) {
            return;
        }
        if (!!aiAnswer) {
            const pmidsFromText = ProcessLinks2({ text: aiAnswer })?.filter(part => part.type === "pubmedid").map(part => (part.text)) || [];
            const pmids = [...new Set(pmidsFromText)].slice(0, 50);
            console.log('Fetching articles for PMIDs:', pmids);
            dispatch(queryArticles({
                db: 'pubmed',
                id: pmids.join(','),
                retmode: 'json',
            })).then((response) => {
                console.log('Articles data received:', response.payload);
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
            });
        }
    }, [aiAnswer]);

    if (error) return <ErrorComponent errorTitle={"Question Not Relevant"} errorMessage={"Your query doesn't match any relevant topic in PanKgraph. Please try rephrasing or explore related tutorials."} log={debugMessage(question, agentRawResult)} />;

    // Show loading skeleton if queryResultPage is not ready
    if (aiLoading && !demoMode) {
        return <ResultComponentSkeleton />;
    }

    const referencesItems = articlesData.map((ref, index) => ({
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

    const evidenceTabs = [
        referencesItems.length ? { label: 'References', items: referencesItems } : null,
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
            tabs: [
                { label: "Knowledge Graph", content: demoKnowledgeGraphContent },
                {
                    label: "Pathway",
                    content: (
                        <Box sx={{ p: 2, textAlign: "center", color: "#64748B" }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>Pathway Visualization</Typography>
                            <Typography sx={{ fontSize: 13 }}>CFTR regulation pathway in pancreatic beta cells</Typography>
                        </Box>
                    )
                },
                {
                    label: "Expression",
                    content: (
                        <Box sx={{ p: 2, textAlign: "center", color: "#64748B" }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>Expression Data</Typography>
                            <Typography sx={{ fontSize: 13 }}>Tissue-specific expression profile across GTEx samples</Typography>
                        </Box>
                    )
                },
            ],
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
                    heading: isAiSummaryLoading ? undefined : "Summary",
                    body: displaySummary,
                },
            ].filter((section) => section.body),
            isLoading: isAiSummaryLoading,
        },
        graphData: graphData,
        visualMaterial: {
            title: "Visual Material",
            tabs: [
                { label: "Knowledge Graph", content: knowledgeGraphContent },
                {
                    label: "Pathway",
                    content: (
                        <Box sx={{ p: 2, textAlign: "center", color: "#64748B" }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>Pathway Visualization</Typography>
                            <Typography sx={{ fontSize: 13 }}>Pathway data visualization will appear here</Typography>
                        </Box>
                    )
                },
                {
                    label: "Expression",
                    content: (
                        <Box sx={{ p: 2, textAlign: "center", color: "#64748B" }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>Expression Data</Typography>
                            <Typography sx={{ fontSize: 13 }}>Expression data visualization will appear here</Typography>
                        </Box>
                    )
                },
            ],
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
            <QuestionAnswerPage data={demoMode ? buildDemoPageData(demoIndex) : pageData} />
        </>
    );
}

export default SearchResult;
