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
import { useNavigate } from 'react-router-dom';

import {
  ChevronRight as ChevronRightIcon,
  InfoOutlined as InfoOutlineIcon,
} from '@mui/icons-material';
import {
  Backdrop,
  Box,
  CircularProgress,
  Collapse,
  Container,
  Grid,
  Link,
  List,
  ListItem,
  Skeleton,
  styled,
  Tab,
  Tabs,
  Tooltip,
  tooltipClasses,
  Typography,
} from '@mui/material';

import { flaskBackendAxiosInstanceNew } from '../axios/axios';
import { ErrorComponent } from '../components/IntermediatePage';
import KnowledgeGraph from '../components/KnowledgeGraph';
import VisuImage from '../image/output.png';
import { queryAiAgent } from '../redux/aiAgentSlice';
import { queryArticles } from '../redux/articlesSlice';
import { queryQueryResultPage } from '../redux/queryResultPage';
import { querySupportingMaterial } from '../redux/supportingMaterialSlice';
import { queryImage } from '../redux/typeToImageSlice';
import tooltipsSchema from '../schema/tool_tips_schema.json';
import { addHighlight } from '../utils/textProcessing';
import SearchResultLoading from './loading';

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

function SearchResult() {
    const [currTab, setCurrTab] = useState('references');
    const dispatch = useDispatch();

    const [tabOptions, setTabOptions] = useState(['references']);

    const { viewSchema } = useSelector((state) => state.viewSchema);
    const { typeToImage } = useSelector((state) => state.typeToImage);
    const [aiAnswer, setAiAnswer] = useState('');
    // const [mainCypher, setMainCypher] = useState('');
    const [graphData, setGraphData] = useState({});
    const [coordData, setCoordData] = useState({});
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [variables, setVariables] = useState({});
    const [referenceData, setReferenceData] = useState({});
    const [articlesData, setArticlesData] = useState([]);
    const [activeReference, setActiveReference] = useState(null);
    const [imagePopupOpen, setImagePopupOpen] = useState(false);
    const [nextQuestions, setNextQuestions] = useState([{ question: '[WIP]' }]);
    const [allNextQuestions, setAllNextQuestions] = useState(null);
    const [error, setError] = useState(false);
    const [aiLoading, setAiLoading] = useState(true);
    const thunkref = useRef(null);
    const navigate = useNavigate();

    // scroll to active reference after it is set
    const timeoutRef = useRef(null);
    useEffect(() => {
        if (activeReference) {
            const el = document.getElementById(`reference-item-${activeReference}`);
            if (el) {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                el.scrollIntoView({ behavior: "smooth" });
                timeoutRef.current = setTimeout(() => {
                    setActiveReference(null);
                    timeoutRef.current = null; // clear ref after done
                }, 1000);
            }
        }
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [activeReference]);

    useEffect(() => {
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
        if (!!graphData) {
            dispatch(querySupportingMaterial({
                "query_result": graphData
            })).then((response) => {
                setTabOptions(
                    (tabs) => [...tabs, ...Object.keys(response.payload?.resources_tabs || {})]
                );
                const emp_evidence = response.payload?.resources_tabs?.empirical_evidence || {};
                if (emp_evidence.lambda_function == "type_to_image") {
                    dispatch(queryImage({
                        imageType: 'manhattan',
                        link: `${emp_evidence.folder}/${emp_evidence.credible_set}`
                    }));
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
        const params = new URLSearchParams(window.location.search);
        const question = base64ToUtf8(params?.get('question'));

        const thunk = dispatch(queryAiAgent({ question: question, "agent_name": "pankbase" }));
        thunkref.current = thunk;
        thunk.then((response) => {
            const agentResult = JSON.parse(response.payload.answer || '{}')?.text || {};
            console.log('AI Agent Result:', agentResult);
            if (agentResult.template_matching !== 'agent_answer') {
                //should be aaa - bbb - ccc
                //navigate to /result?sourceTerm=aaa&targetTerm=ccc&relationship=bbb
                if (!agentResult.template_matching || agentResult.template_matching.split(' - ').length !== 3) {
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
            dispatch(queryQueryResultPage({
                payload: {
                    "cypher": agentResult.cypher,
                    "rdb_query": ""
                }, agent: true
            })).then((response) => {
                if (!response.payload?.combined_query_result) {
                    setError(true);
                    return;
                }
                setGraphData(response.payload?.combined_query_result || {});
                setCoordData(response.payload?.xy_json || {});
                setAiLoading(false);
            });
        });
    }, []);

    const removeConsecutiveAsterisks = (text) => {
        return text.replace(/\*\*/g, '');
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
                        setCurrTab('references');
                        setActiveReference(part.text);
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

    // Fetch articles data based on aiAnswer
    useEffect(() => {
        if (!!aiAnswer) {
            const pmidsFromText = ProcessLinks2({ text: aiAnswer }).filter(part => part.type === "pubmedid").map(part => (part.text));
            const pmids = [...new Set(pmidsFromText)].slice(0, 50);
            dispatch(queryArticles({
                db: 'pubmed',
                id: pmids.join(','),
                retmode: 'json',
            })).then((response) => {
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

    if (error) return <ErrorComponent errorTitle={"Question Not Relevant"} errorMessage={"Your query doesn't match any relevant topic in PanKgraph. Please try rephrasing or explore related tutorials."} />;

    // Show loading skeleton if queryResultPage is not ready
    return aiLoading ?
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingY: '200px' }}>
            <SearchResultLoading handleClose={() => {
                console.log(1);
                if (thunkref.current) thunkref.current.abort();
                navigate("/");
            }} />
        </Box> :
        (<Container sx={{ width: '100%', overflowX: 'auto', maxWidth: '1440px', marginX: '20px', alignSelf: 'center', overflow: 'visible' }} maxWidth={false}>
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
            <Container sx={{
                padding: 0, display: 'flex',
                flexDirection: 'column', justifyContent: 'space-evenly',
                fontFamily: 'Open Sans', fontWeight: 600,
                alignSelf: 'center',
                maxWidth: '1440px',
                minWidth: '1000px',
                flexGrow: 1,
            }} disableGutters maxWidth={false}>
                <Box sx={{
                    padding: '20px',
                    backgroundColor: '#E4F0F1',
                    marginBottom: '20px',
                    marginTop: '30px',
                    borderRadius: '20px'
                }}>
                    <Grid container spacing={4} height={"100%"} sx={{ alignItems: "stretch" }}>
                        <Grid item xs={6} height={"100%"}>
                            <Box sx={{ width: "100%", justifyContent: "space-between", display: "flex", alignItems: "center" }}>
                                <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: 20, width: 685, textAlign: 'left', marginBottom: '10px' }}>
                                    Question <TooltipComponent title="Question" content="The question of the current search result." />
                                </Typography>
                                {/*a link*/}
                                <a href={"/"} style={{ color: "#398289", fontWeight: 600, textUnderlineOffset: "3px", fontSize: "17px", marginBottom: "10px" }}>
                                    CANCEL
                                </a>
                            </Box>
                            <Typography
                                sx={{
                                    fontFamily: 'Open Sans',
                                    flex: 1,
                                    textAlign: 'left',
                                    wordWrap: 'break-word',
                                    whiteSpace: 'normal',
                                    fontSize: 20,
                                    fontWeight: 600,
                                }}
                                dangerouslySetInnerHTML={{ __html: currentQuestion || 'No question available' }}
                            />

                        </Grid>
                        <Grid item xs={6} height={"100%"}>
                            {/*you may also ask*/}
                            <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: 20, width: 685, textAlign: 'left', marginBottom: '10px' }}>
                                You May Also Ask<TooltipComponent title="You May Also Ask" content="Links to other problems." />
                            </Typography>
                            <ul className="next-questions-list">
                                {nextQuestions ? nextQuestions.map((nextQuestion, index) => nextQuestion.question && (
                                    <li key={index}>
                                        <Link
                                            href={nextQuestion.link}
                                            style={{ textDecoration: 'none', color: 'black' }}
                                            target="_blank"
                                            rel="noopener noreferrer">
                                            <Box sx={{
                                                display: 'flex',
                                            }}>
                                                <Typography sx={{
                                                    fontFamily: 'Open Sans',
                                                    fontWeight: 400,
                                                    fontSize: 16,
                                                }} dangerouslySetInnerHTML={{ __html: nextQuestion.question }} />
                                                <span style={{ alignContent: 'center' }}><ChevronRightIcon /></span>
                                            </Box>
                                        </Link>
                                    </li>
                                )) : (
                                    <Typography sx={{ fontFamily: 'Open Sans', fontSize: 16 }}>No next questions available</Typography>
                                )}
                            </ul>
                        </Grid>
                    </Grid>
                </Box>
                <Box>
                    <Grid container spacing={4} height={"100%"} sx={{
                        alignItems: "stretch", marginBottom: '48px', marginTop: '-4px'
                    }}>
                        {/*left*/}
                        <Grid item xs={6} height={"740px"} display="flex">
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px',
                                width: "100%",
                                backgroundColor: '#F9FAFB',
                                border: 1,
                                borderColor: '#EEEEEE',
                                paddingY: '20px',
                                position: 'relative',
                                borderRadius: '20px'
                            }}>
                                <Typography sx={{
                                    fontFamily: 'Open Sans', fontWeight: 800, fontSize: 22,
                                    paddingX: '20px',
                                }}>
                                    AI's Overview<TooltipComponent title="AI's Overview" />
                                </Typography>
                                <Typography component="div" sx={{
                                    fontFamily: 'Open Sans',
                                    overflowY: 'auto',
                                    paddingX: '20px',
                                }}>
                                    {(aiAnswer) ? (
                                        <div>
                                            <Typography sx={{
                                                fontFamily: 'Open Sans',
                                                textAlign: 'left',
                                                fontSize: '16px',
                                                fontWeight: 300
                                            }}>
                                                <ProcessLinks text={removeConsecutiveAsterisks(aiAnswer)} />
                                            </Typography>
                                            {/*{index < aiAnswer.answers.length - 1 && <Divider sx={{ my: 2 }} />}*/}
                                        </div>
                                    ) : <Typography sx={{
                                        fontFamily: 'Open Sans',
                                        textAlign: 'left',
                                        gap: 1,
                                        fontWeight: 400,
                                        fontSize: '20px'
                                    }}>
                                        Loading AI's overview...
                                    </Typography>}
                                </Typography>
                            </Box>
                        </Grid>

                        {/*graph viewer, right*/}
                        <Grid item xs={6} height={"740px"} display="flex">
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '32px',
                                width: "calc(100% - 40px)",
                                maxWidth: 'calc(100% - 40px)',
                                backgroundColor: '#F9FAFB',
                                border: 1,
                                borderColor: '#EEEEEE',
                                padding: '20px',
                                position: 'relative',
                                borderRadius: '20px'
                            }}>
                                <Typography sx={{
                                    fontFamily: 'Open Sans',
                                    fontWeight: 800,
                                    fontSize: 22
                                }}>
                                    Graph Viewer<TooltipComponent title="Graph Viewer" />
                                </Typography>
                                <Box sx={{
                                    position: 'relative',
                                    minHeight: '450px',
                                    overflow: 'visible',
                                    backgroundColor: '#F9FAFB',
                                    border: "none",
                                    borderColor: '#EEEEEE',
                                    textAlign: 'left',
                                    maxWidth: '100%',
                                }}>
                                    <KnowledgeGraph graphData={graphData} coordData={coordData} />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
                <div style={{ position: 'relative', width: 'fit-content' }}>
                    <div style={{
                        position: 'absolute',
                        top: '0px',
                        left: '0px',
                        width: '100%',
                        height: '100%',
                        borderRadius: '20px 20px 0px 0px',
                        borderWidth: '1px 0px 0px',
                        borderStyle: 'solid',
                        borderColor: "#E5E5E5",
                        zIndex: 1,
                        pointerEvents: 'none',
                    }}></div>
                    <Tabs
                        value={currTab}
                        onChange={(e, value) => setCurrTab(value)}
                        variant="scrollable"
                        scrollButtons={false}
                        sx={{
                            minHeight: '48px',
                            height: '48px',
                            width: 'fit-content',
                            backgroundColor: '#F2FAFB',
                            borderRadius: '20px 20px 0px 0px',
                            border: 'none',
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontSize: '16px',
                                whiteSpace: 'normal',
                                margin: '0px',
                                '& .MuiTab-wrapper': {
                                    flexDirection: 'row',
                                    justifyContent: 'flex-start',
                                    alignItems: 'flex-start'
                                }
                            },
                            '& .MuiTab-root:first-of-type': {
                                borderTopLeftRadius: '20px',
                            },
                            '& .MuiTab-root:last-of-type': {
                                borderTopRightRadius: '20px',
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: '#398289',
                            },
                        }}
                    >
                        {tabOptions.map((option, index) => (
                            <Tab
                                sx={{
                                    minHeight: '48px',
                                    height: '48px',
                                    backgroundColor: currTab === option ? 'white' : '#F2FAFB',
                                    borderWidth:
                                        currTab === option ? '1px 1px 0px 1px' :
                                            tabOptions.findIndex((tab) => tab === currTab) > index ?
                                                '1px 0px 0px 1px' : '1px 1px 0px 0px',
                                    borderStyle: 'solid',
                                    borderColor: '#E5E5E5',
                                    borderRadius:
                                        currTab === option ? '20px 20px 0px 0px' :
                                            tabOptions.findIndex((tab) => tab === currTab) > index ?
                                                '20px 0px 0px 0px' : '0px 20px 0px 0px',
                                }}
                                key={option}
                                label={
                                    <Typography
                                        component="span"
                                        sx={{
                                            textAlign: 'left',
                                            fontFamily: 'Open Sans',
                                            fontSize: '16px',
                                            color: currTab === option ? '#398289' : 'black',
                                            fontWeight: currTab === option ? '600' : '400',
                                            marginX: '20px',
                                        }}
                                    >
                                        {tabLabels[option]}
                                    </Typography>
                                }
                                value={option}
                            />))}
                    </Tabs>
                </div>
                <Box sx={{
                    position: 'relative',
                    padding: '20px',
                    backgroundColor: '#F9FAFB',
                    marginBottom: '20px',
                    borderRadius: '0px 20px 20px 20px',
                    border: '1px solid #EEEEEE',
                    transform: 'translateY(-1px)',
                }}>
                    <Collapse in={currTab === 'references'}>
                        <List sx={{
                            padding: '0px',
                        }}>
                            {articlesData?.map((ref, index) => (
                                <Link
                                    href={"https://pubmed.gov/" + ref.pmid}
                                    sx={{
                                        color: 'black',
                                        textDecoration: 'none',
                                        '& .pmid-link:hover': {
                                            textDecoration: 'underline'
                                        }
                                    }}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    key={index}
                                >
                                    <ListItem
                                        sx={{
                                            paddingY: '0px',
                                            marginLeft: '20px',
                                            flexDirection: "column",
                                            alignItems: "flex-start",
                                            position: "relative",
                                            fontSize: '12px',
                                            fontWeight: 300,
                                            textAlign: 'left',
                                            wordWrap: 'break-word',
                                            whiteSpace: 'normal',
                                            maxWidth: 'calc(100% - 20px)',
                                            paddingTop: index === 0 ? '0px' : '15px',
                                        }}
                                        key={index}
                                        id={`reference-item-${ref.pmid}`}
                                        className={`reference-item${activeReference === ref.pmid ? '-active' : ''}`}
                                    >
                                        <Box sx={{
                                            position: 'absolute',
                                            fontSize: '16px',
                                            left: '-20px',
                                            width: '30px',
                                            height: '100%',
                                            alignItems: "flex-end",
                                        }}>
                                            <Typography
                                                sx={{ fontFamily: 'Open Sans', textAlign: 'right', fontWeight: 400 }}
                                            >{index + 1}.</Typography>
                                        </Box>
                                        <Typography
                                            sx={{ fontFamily: 'Open Sans', fontWeight: 700 }}
                                        >{ref.data?.title}</Typography>
                                        <Typography sx={{ fontFamily: 'Open Sans', color: "grey" }}>
                                            {(() => {
                                                const authors = ref.data.authors;
                                                return authors.length <= 2 ?
                                                    authors.map((author) => (author.name)).join(', ') :
                                                    `${authors[0].name}, ..., ${authors[authors.length - 1].name}`;
                                            })()}
                                        </Typography>
                                        <Typography sx={{ fontFamily: 'Open Sans', color: "grey" }}>
                                            <i>{ref.data.fulljournalname}</i>.&nbsp;
                                            {ref.data.pubdate.slice(0, 4)}
                                            {(ref.data.volume || ref.data.issue || ref.data.pages) && <>;</>}
                                            {ref.data.volume}
                                            {ref.data.issue && <>({ref.data.issue})</>}
                                            {ref.data.pages && <>:{ref.data.pages}</>}.
                                            &nbsp;<span
                                                className="pmid-link"
                                                style={{
                                                    color: '#1976d2',
                                                    fontWeight: 400,
                                                }}
                                            >PMID: {ref.pmid}</span>
                                        </Typography>
                                    </ListItem>
                                </Link>
                            ))}
                        </List>
                    </Collapse>
                    <Collapse in={currTab === 'empirical_evidence'}>
                        <List sx={{ padding: '0px' }}>
                            {referenceData?.empirical_evidence &&
                                (<Box sx={{ flexDirection: 'row', display: 'flex', gap: '45px', alignItems: 'center' }}>
                                    {(referenceData.empirical_evidence.lambda_function && !(typeToImage?.length)) ? (
                                        <Box sx={{
                                            backgroundColor: '#F2FAFB',
                                            marginY: '14px',
                                            marginLeft: '25px',
                                            borderRadius: '10px',
                                            marginRight: '10px',
                                            minWidth: '250px',
                                            minHeight: '250px',
                                            position: 'relative',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }} >
                                            <CircularProgress sx={{}} />
                                        </Box>
                                    ) : (<Box sx={{ position: 'relative' }}>
                                        <Box
                                            component="img"
                                            src={referenceData.empirical_evidence.lambda_function ?
                                                (typeToImage?.length ? `data:image/jpeg;base64,${typeToImage}` : "")
                                                : VisuImage}
                                            alt="Empirical Evidence"
                                            sx={{
                                                maxHeight: '235px',
                                                maxWidth: '500px',
                                                marginY: '14px',
                                                marginLeft: '25px',
                                                borderRadius: '10px',
                                                marginRight: '10px',
                                            }}
                                        />
                                        <Link sx={{
                                            textDecoration: 'none',
                                            "& .MuiTypography-root:hover":
                                                referenceData.empirical_evidence.legend === "View" ? {
                                                    background: '#4A4A4B66',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                } : {},
                                        }}>
                                            <Typography sx={{
                                                position: 'absolute',
                                                top: '26px',
                                                left: '35px',
                                                borderRadius: '6px',
                                                padding: '4px 12px',
                                                background: '#4A4A4BB2',
                                                fontFamily: 'Open Sans',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                color: 'white',
                                                transition: 'background 0.2s ease',
                                            }} onClick={
                                                referenceData.empirical_evidence.legend === "View" ? () => setImagePopupOpen(true) : () => { }
                                            }>
                                                {referenceData.empirical_evidence.legend}
                                            </Typography>
                                        </Link>
                                    </Box>)}
                                    <Box>
                                        <Typography sx={{ fontFamily: 'Open Sans', fontSize: '20px', fontWeight: 700 }}>
                                            {referenceData.empirical_evidence.title}
                                        </Typography>
                                        <Typography sx={{ fontFamily: 'Open Sans', fontSize: '16px', fontWeight: 400, color: "#263238", paddingY: '24px' }}>
                                            {referenceData.empirical_evidence.description}
                                        </Typography>
                                        {referenceData.empirical_evidence.link_text &&
                                            <Link
                                                href={referenceData.empirical_evidence.link || handleDownload2(referenceData.empirical_evidence.folder, referenceData.empirical_evidence.credible_set)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ textDecoration: "none" }}>
                                                <Typography sx={{
                                                    cursor: 'pointer',
                                                    fontFamily: 'Open Sans',
                                                    fontSize: '16px', paddingY: '10px', paddingX: '20px', backgroundColor: '#219197',
                                                    textAlign: 'center', borderRadius: '10px', color: 'white',
                                                    fontWeight: 600, width: 'fit-content',
                                                }}>{referenceData.empirical_evidence.link_text}
                                                </Typography>
                                            </Link>}
                                    </Box>
                                </Box>
                                )
                            }
                        </List>
                    </Collapse>
                    <Collapse in={currTab === 'pankbase_links'}>
                        <List sx={{ padding: '0px' }}>
                            {referenceData?.pankbase_links?.map((link, index) => (
                                <ListItem sx={{ paddingY: '0px' }} key={index}>
                                    •&nbsp;<Link
                                        href={link[1]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{
                                            color: '#1976d2',
                                            textDecoration: 'none',
                                            textSize: '16px',
                                            '&:hover': {
                                                textDecoration: 'underline'
                                            }
                                        }}
                                    > {link[0]}</Link>
                                </ListItem>))
                            }
                        </List>
                    </Collapse>
                    <Collapse in={currTab === 'external_links'}>
                        <List sx={{ padding: '0px' }}>
                            {referenceData?.external_links?.map((link, index) => (
                                <ListItem sx={{ paddingY: '0px' }} key={index}>
                                    •&nbsp;{link[0]}&nbsp;<Link
                                        href={link[2]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{
                                            color: '#1976d2',
                                            textDecoration: 'none',
                                            textSize: '16px',
                                            '&:hover': {
                                                textDecoration: 'underline'
                                            }
                                        }}
                                    > {link[1]}</Link>
                                </ListItem>))
                            }
                        </List>
                    </Collapse>
                </Box>
            </Container>
        </Container>
        );
}

export default SearchResult;
