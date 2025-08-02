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

import { InfoOutlined as InfoOutlineIcon } from '@mui/icons-material';
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

import {
    ErrorComponent,
    tabsQTL,
} from '../components/IntermediatePage';
import KnowledgeGraph from '../components/KnowledgeGraph';
import {
    SearchComponent,
    SubmitButtonComponent,
    WarningComponent,
} from '../components/MatchPage';
import SubNavBar from '../components/SubNavBar';
import VisuImage from '../image/output.png';
import { queryArticles } from '../redux/articlesSlice';
import { setProcessedQuestion } from '../redux/processedQuestionSlice';
import { queryImage } from '../redux/typeToImageSlice';
import sampleResponse from '../schema/demo_query_result.json';
import sampleAiAnswer from '../schema/sample_aianswer.json';
import sampleSchema from '../schema/sample_schema_gkb.json';
import tooltipsSchema from '../schema/tool_tips_schema.json';
import { addHighlight } from '../utils/textProcessing';

const tabOptions = [
    { value: 'references', label: 'References' },
    { value: 'empirical_evidence', label: 'Empirical Evidence' },
    { value: 'pankbase_links', label: 'PanKbase Links' },
    { value: 'external_links', label: 'External Links' }
];

// const handleDownload = (data_source, credibleSet) => {
//     const folder = tabsQTL.find(tab => tab.data_source === data_source)?.folder || "";
//     return `https://pank-s3-to-share.s3.us-east-1.amazonaws.com/${folder}/${credibleSet}.txt`;
// };


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

const TooltipComponent = ({ title, content }) => (
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
    const [currContent, setCurrContent] = useState('result'); // AI tab, result | chat
    const [currTab, setCurrTab] = useState('references');//references tab
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // const queryResultPage = useSelector((state) => state.queryResultPage.queryResultPage);
    const [queryResultPage, setQueryResultPage] = useState({});
    // const { aiAnswer } = useSelector((state) => state.aiAnswer);
    const [aiAnswer, setAiAnswer] = useState({});
    // const { aiSchema } = useSelector((state) => state.aiSchema);
    const { typeToImage } = useSelector((state) => state.typeToImage);
    const [question, setQuestion] = useState('');
    const [questionSchema, setQuestionSchema] = useState('');
    const [aiSchema, setAiSchema] = useState({});
    // const [variables, setVariables] = useState({});
    const [referenceData, setReferenceData] = useState({});
    const [articlesData, setArticlesData] = useState([]);
    const [activeReference, setActiveReference] = useState(null);
    const [imagePopupOpen, setImagePopupOpen] = useState(false);
    const [error, setError] = useState(false);

    // Search bar components
    const [inputStatus, setInputStatus] = useState({}); // input status of boxes
    const [inputDict, setInputDict] = useState({}); // input values
    const [warning, setWarning] = useState('');

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


    const handleSubmit = () => {
        //return; //disable for now
        //redirect to result page with question replaced with input values
        const replacedQuestion = question.replace(/\{(.*?)@(.*?)@\}/g, (match, key, defaultValue) => {
            return `{${key}@${inputDict[key] || defaultValue}@}`;
        });
        navigate(`/result?question=${encodeURIComponent(replacedQuestion)}`);
    };

    // initialize the reference data from aiSchema w/ replacements
    useEffect(() => {
        if (aiSchema?.resources_tabs) {
            const data = aiSchema.resources_tabs;
            const newPankbaseLinks = data.pankbase_links;
            const newExternalLinks = data.external_links;
            setReferenceData({
                ...data,
                empirical_evidence: data.empirical_evidence && {
                    ...data.empirical_evidence,
                    link: data.empirical_evidence.link
                },
                pankbase_links: newPankbaseLinks,
                external_links: newExternalLinks
            });
        }
    }, [aiSchema]);

    // Fetch articles data based on aiAnswer
    useEffect(() => {
        if (aiAnswer?.articles?.length > 0) {
            const pmids = aiAnswer.articles.map(article => article.pmid);
            dispatch(queryArticles({
                db: 'pubmed',
                id: pmids.join(','),
                retmode: 'json',
            })).then((response) => {
                const sortedArticles = aiAnswer.articles.toSorted((a, b) => b.score - a.score);
                setArticlesData(
                    sortedArticles.map(article => ({
                        pmid: article.pmid,
                        title: article.title,
                        score: article.score,
                        data: response.payload.result[article.pmid] || {},
                        doi: response.payload.result[article.pmid]?.articleids?.find(id => id.idtype === 'doi')?.value || ''
                    }
                    ))
                );
            });
        }
    }, [aiAnswer]);

    // init: get URL parameters and dispatch actions
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        // const sourceTerm = params.get('sourceTerm');
        // const relationship = params.get('relationship');
        // const targetTerm = params.get('targetTerm');
        // const targetSymbol = params.get('targetSymbol');
        // const sourceSymbol = params.get('sourceSymbol');
        // const lead_snp = params.get('lead_snp');
        // const credible_set_id = params.get('credible_set_id');
        setQuestion(params.get('question') || '');
        console.log(params);

        const noop = () => async (dispatch, getState) => {
            // Do nothing
        };
        if (params.get('question')) {
            // dispatch(setSearchTerms({
            //     sourceTerm,
            //     relationship,
            //     targetTerm,
            //     targetTermSymbol: targetSymbol || ''
            // }));
            dispatch(
                // an empty promise as a placeholder
                noop()
            ).then(() => {
                if (1) {
                    // handle schema data
                    setAiSchema(sampleSchema);
                    const response = sampleSchema;
                    const {
                        question,
                        ai_question,
                        ai_answer_sub_title,
                        query,
                        ai_suggestions,
                        resources_tabs
                    } = response;
                    console.log('response', response);

                    if (1) {
                        dispatch(noop()).then(() => {
                            const response = sampleResponse;
                            setQueryResultPage(response);
                            const coreNodes = response?.core_nodes || [];
                            const results = response?.combined_query_result || {};
                            const neighborNodes = results?.nodes?.filter(
                                node => !coreNodes.includes(node["~id"])
                            ) || [];
                            const coreRelationship = results.edges?.find(
                                edge => (edge["~start"] === coreNodes[0] && edge["~end"] === coreNodes[1])
                                    || (edge["~end"] === coreNodes[0] && edge["~start"] === coreNodes[1])
                            );

                            const dataSource = coreRelationship?.["~properties"]?.data_source || '';
                            const credibleSetId = coreRelationship?.["~properties"]?.credible_set || '';
                            if (resources_tabs?.empirical_evidence?.lambda_function &&
                                coreRelationship?.["~properties"]?.["credible_set"]) {
                                dispatch(queryImage({
                                    imageType: 'manhattan',
                                    link: `${tabsQTL.find(tab => tab.data_source === dataSource)?.folder || ''}/${coreRelationship["~properties"]["credible_set"]}`
                                }));
                            }
                            const celltypeName = results.nodes
                                ?.filter(node => node["~labels"].includes('cell_type'))
                                ?.map(node => node["~properties"]?.name)
                                .join(', ')
                                .toLowerCase()
                                .replace(/, ([^,]*)$/, ', and $1') || '';
                            const tissueKey = coreRelationship?.["~properties"]?.tissue_name || '';

                            const processedCurrentQuestion = addHighlight(question);
                            if (!processedCurrentQuestion) {
                                setError(true);
                                return;
                            }

                            // TODO: set ai suggestions 

                            // update Redux store
                            dispatch(setProcessedQuestion({
                                currentQuestion: processedCurrentQuestion,
                                aiQuestions: ai_question || [],
                                aiAnswerSubtitle: ai_answer_sub_title
                            }));
                        });
                    }
                }
            });
        }
    }, []);

    const {
        currentQuestion,
        aiQuestions,
        aiAnswerSubtitle,
    } = useSelector((state) => state.processedQuestion);

    const removeConsecutiveAsterisks = (text) => {
        return text.replace(/\*\*/g, '');
    };

    // query AI answer when queryResultPage and aiQuestions are available
    useEffect(() => {
        if (queryResultPage?.combined_query_result?.nodes?.length !== 0 && queryResultPage?.core_nodes && aiQuestions?.length > 0) {
            // dispatch(queryAiAnswer({
            //     "question": aiQuestions,
            //     "graph": {
            //         combined_query_result: queryResultPage.combined_query_result,
            //         core_nodes: queryResultPage.core_nodes,
            //     }
            // })).unwrap();
            setAiAnswer(sampleAiAnswer);
        }
    }, [queryResultPage, aiQuestions]);

    // process links in the AI answer text
    const ProcessLinks = ({ text }) => (
        // replace [aaa](bbb) with <a href="bbb">aaa</a>
        !text ? <></> : <>{
            text.split(/(\[[^\]]+\]\([^)]+\)|\[[^\]]+\])/)
                .map((part, index) => part.match(/^\[[^\]]+\]$/) // if [text]
                    ? <span key={`part-${index}`}>{
                        part.split(/(\d+)/g).map((subPart, subIndex) =>
                            subPart.match(/^\d{8}$/) //if all digit
                                ? <Link
                                    href={`#reference-item-${subPart}`}
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
                                        setActiveReference(subPart);
                                    }}
                                    key={`subpart-${index}-${subIndex}`}
                                >{subPart}</Link>
                                : <span key={`subpart-${index}-${subIndex}`}>{subPart}</span>
                        )}
                    </span>
                    : part.match(/^\[[^\]]+\]\([^)]+\)$/)  // if [text](url)
                        ? <a
                            href={part.split("(")[1].slice(0, -1)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#0069c2", textDecoration: "none" }}
                            key={`part-${index}`}
                        >
                            {part.split("]")[0].substr(1)}
                        </a>
                        : <span key={`part-${index}`}>{part}</span>
                )
        }</>
    )

    if (error) return <ErrorComponent errorTitle={aiSchema?.result_error_title} errorMessage={aiSchema?.result_error_message} />;

    // Show loading skeleton if queryResultPage is not ready
    return !(queryResultPage?.combined_query_result) ? <LoadingSkeleton /> :
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
                    background: 'linear-gradient(90.23deg, #F5FAFF 7.49%, #FCFCFC 80.88%)',
                    boxShadow: '8px 6px 33px 0px #D8E6F8',
                    marginBottom: '20px',
                    marginTop: '30px',
                    borderRadius: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <Box sx={{
                        borderRadius: '12px',
                        alignItems: 'center',
                        display: 'flex',
                        flexWrap: 'wrap',
                        padding: 2,
                        width: 'fit-content',
                        gap: '2px',
                    }}>
                        {question && <SearchComponent
                            questionSchema={question}
                            updateValues={setInputDict}
                            setInputStatus={setInputStatus}
                            sx={{ fontSize: '20px' }}
                        />}
                    </Box>
                    <SubmitButtonComponent onClick={handleSubmit} sx={{
                        background: 'linear-gradient(142.59deg, #4A65F4 14.08%, #758BFF 78.33%)',
                        color: 'white',
                        cursor: 'pointer',
                        borderRadius: '40px',
                        height: '44px',
                        paddingX: '40px',
                        textTransform: 'none',
                        fontSize: '16px',
                        fontWeight: 600,
                        fontFamily: 'Inter',
                        boxShadow: "0px 2px 3.1px 0px #B9B9B933",
                    }} sxOnDisabled={{
                        background: 'linear-gradient(90.46deg, rgba(112, 134, 253, 0.3) 0.44%, rgba(70, 99, 254, 0.3) 99.65%)',
                        cursor: 'not-allowed',
                    }} caption={"Update"} inputStatus={inputStatus} setWarning={setWarning} />
                </Box>
                <WarningComponent
                    warning={warning}
                    setWarning={setWarning}
                />
                <Box>
                    <Grid container spacing={4} height={"100%"} sx={{
                        alignItems: "stretch", marginBottom: '24px', marginTop: '-4px'
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
                                paddingBottom: '20px',
                                position: 'relative',
                                borderRadius: '24px',
                                boxShadow: '8px 6px 33px 0px #D8E6F8',
                            }}>
                                <SubNavBar activeButton={currContent} handleToggle={
                                    () => setCurrContent(currContent === 'result' ? 'chat' : 'result')
                                } />
                                {currContent === 'result' &&
                                    <Typography component="div" sx={{
                                        fontFamily: 'Open Sans',
                                        overflowY: 'auto',
                                        paddingX: '20px',
                                    }}>
                                        {(aiAnswer?.answers?.length) ? aiAnswer.answers.map((answer, index) => (
                                            <div key={index} style={{ marginBottom: index < aiAnswer.answers.length - 1 ? '20px' : '0' }}>
                                                {aiAnswerSubtitle && aiAnswerSubtitle[index] && (
                                                    <Typography sx={{
                                                        fontFamily: 'Open Sans',
                                                        textAlign: 'left',
                                                        gap: 1,
                                                        fontWeight: 400,
                                                        fontSize: '20px'
                                                    }}>
                                                        <span style={{ color: '#FFD700' }}>✨</span>
                                                        {aiAnswerSubtitle[index]}
                                                    </Typography>
                                                )}
                                                <Typography sx={{
                                                    fontFamily: 'Open Sans',
                                                    textAlign: 'left',
                                                    fontSize: '16px',
                                                    fontWeight: 300
                                                }}>
                                                    <ProcessLinks text={removeConsecutiveAsterisks(answer)} />
                                                </Typography>
                                                {/*{index < aiAnswer.answers.length - 1 && <Divider sx={{ my: 2 }} />}*/}
                                            </div>
                                        )) : <Typography sx={{
                                            fontFamily: 'Open Sans',
                                            textAlign: 'left',
                                            gap: 1,
                                            fontWeight: 400,
                                            fontSize: '20px'
                                        }}>
                                            Loading AI's overview...
                                        </Typography>}
                                    </Typography>}
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
                                borderRadius: '24px',
                                boxShadow: '8px 6px 33px 0px #D8E6F8',
                            }}>
                                <Typography sx={{
                                    fontFamily: 'Inter',
                                    fontWeight: 700,
                                    fontSize: 20,
                                    color: '#4C5FC8',
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
                                    <KnowledgeGraph />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
                <Typography sx={{
                    fontFamily: 'Inter',
                    fontWeight: 700,
                    fontSize: 20,
                    color: '#4C5FC8',
                    textAlign: 'left',
                    marginBottom: '24px',
                }}>
                    Supporting Materials
                </Typography>
                {(aiAnswer?.answers?.length) ? (<>
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
                            zIndex: 2,
                            pointerEvents: 'none',
                        }}></div>
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
                            zIndex: 0,
                            pointerEvents: 'none',
                            boxShadow: '8px 6px 33px 0px #D8E6F8',
                        }}></div>
                        <Tabs
                            value={currTab}
                            onChange={(e, value) => setCurrTab(value)}
                            variant="scrollable"
                            scrollButtons={false}
                            sx={{
                                zIndex: 1,
                                minHeight: '48px',
                                height: '48px',
                                width: 'fit-content',
                                backgroundColor: '#C8E7FF',
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
                                    backgroundColor: '#4A65F4',
                                },
                            }}
                        >
                            {tabOptions.map((option, index) => (
                                <Tab
                                    sx={{
                                        minHeight: '48px',
                                        height: '48px',
                                        backgroundColor: currTab === option.value ? 'white' : '#C8E7FF',
                                        borderWidth:
                                            currTab === option.value ? '1px 1px 0px 1px' :
                                                tabOptions.findIndex((tab) => tab.value === currTab) > index ?
                                                    '1px 0px 0px 1px' : '1px 1px 0px 0px',
                                        borderStyle: 'solid',
                                        borderColor: '#E5E5E5',
                                        borderRadius:
                                            currTab === option.value ? '20px 20px 0px 0px' :
                                                tabOptions.findIndex((tab) => tab.value === currTab) > index ?
                                                    '20px 0px 0px 0px' : '0px 20px 0px 0px',
                                    }}
                                    key={option.value}
                                    label={
                                        <Typography
                                            component="span"
                                            sx={{
                                                textAlign: 'left',
                                                fontFamily: 'Open Sans',
                                                fontSize: '16px',
                                                color: currTab === option.value ? '#4A65F4' : 'black',
                                                fontWeight: currTab === option.value ? '600' : '400',
                                                marginX: '20px',
                                            }}
                                        >
                                            {option.label}
                                        </Typography>
                                    }
                                    value={option.value}
                                />))}
                        </Tabs>
                    </div>
                    <Box sx={{
                        position: 'relative',
                        padding: '20px',
                        backgroundColor: '#F9FAFB',
                        marginBottom: '60px',
                        borderRadius: '0px 20px 20px 20px',
                        border: '1px solid #EEEEEE',
                        boxShadow: '8px 6px 33px 0px #D8E6F8',
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
                                            >{ref.title}</Typography>
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
                                                    href={referenceData.empirical_evidence.link}
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
                </>) : (
                    <Skeleton variant="rectangular" width={"100%"} height={"200px"} sx={{
                        backgroundColor: '#F9FAFB',
                        marginBottom: '20px',
                        borderRadius: '0px 20px 20px 20px',
                    }} />
                )
                }
            </Container>
        </Container>
        );
}

export default SearchResult;
