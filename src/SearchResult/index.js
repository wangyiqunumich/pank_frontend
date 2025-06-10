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
  ChevronRight as ChevronRightIcon,
  InfoOutlined as InfoOutlineIcon,
} from '@mui/icons-material';
import {
  Box,
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

import { tabsQTL } from '../components/IntermediatePage';
import KnowledgeGraph from '../components/KnowledgeGraph';
import { queryAiAnswer } from '../redux/aiAnswerSlice';
import { queryArticles } from '../redux/articlesSlice';
import { setProcessedQuestion } from '../redux/processedQuestionSlice';
import { queryQueryResultPage } from '../redux/queryResultPage';
import { setSearchTerms } from '../redux/searchSlice';
import { queryViewSchema } from '../redux/viewSchemaSlice';
import tooltipsSchema from '../schema/tool_tips_schema.json';
import {
  addHighlight,
  replaceVariables,
} from '../utils/textProcessing';

const tabOptions = [
    { value: 'references', label: 'References' },
    { value: 'pankbase_links', label: 'PanKbase Links' },
    { value: 'external_links', label: 'External Links' }
];

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
            marginTop: '60px',
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

    const queryResultPage = useSelector((state) => state.queryResultPage.queryResultPage);
    const { aiAnswer } = useSelector((state) => state.aiAnswer);
    const { viewSchema } = useSelector((state) => state.viewSchema);
    const [variables, setVariables] = useState({});
    const [referenceData, setReferenceData] = useState({});
    const [articlesData, setArticlesData] = useState([]);
    const [activeReference, setActiveReference] = useState(null);

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

    // initialize the reference data from viewSchema w/ replacements
    useEffect(() => {
        if (viewSchema?.resources_tabs) {
            const data = viewSchema.resources_tabs;
            const newPankbaseLinks = data.pankbase_links.map((item) => item.map((i) => replaceVariables(i, variables)));
            const newExternalLinks = data.external_links.map((item) => item.map((i) => replaceVariables(i, variables)));
            setReferenceData({
                ...data,
                pankbase_links: newPankbaseLinks,
                external_links: newExternalLinks
            });
        }
    }, [viewSchema, variables]);

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
        const sourceTerm = params.get('sourceTerm');
        const relationship = params.get('relationship');
        const targetTerm = params.get('targetTerm');
        const targetSymbol = params.get('targetSymbol');
        const sourceSymbol = params.get('sourceSymbol');
        const lead_snp = params.get('lead_snp');
        const credible_set_id = params.get('credible_set_id');
        if (sourceTerm && relationship && targetTerm) {
            dispatch(setSearchTerms({
                sourceTerm,
                relationship,
                targetTerm,
                targetTermSymbol: targetSymbol || ''
            }));
            dispatch(queryViewSchema({
                sourceTerm,
                relationship,
                targetTerm
            })).then((response) => {
                if (response.payload) {
                    // handle schema data
                    const {
                        question_for_result,
                        ai_question_for_result,
                        ai_answer_sub_title,
                        cypher_for_result_page_core,
                        cypher_for_result_page_nbr,
                        rdb_query_for_result_page
                    } = response.payload;

                    if (cypher_for_result_page_core && cypher_for_result_page_nbr) {
                        const additionalParams =
                            lead_snp && credible_set_id ? [
                                `lead_snp@${lead_snp}`,
                                `credible_set_id@${credible_set_id}`
                            ] : [`lead_${sourceTerm}`];
                        const temporaryVariables = {
                            additionalParams,
                            sourceTerm,
                            targetTerm,
                        };
                        const core_cypher = replaceVariables(cypher_for_result_page_core, temporaryVariables);
                        const neighbor_cypher = replaceVariables(cypher_for_result_page_nbr, temporaryVariables);
                        const rdb_query =
                            lead_snp && credible_set_id ? { rdb_query: replaceVariables(rdb_query_for_result_page, temporaryVariables) } : {};

                        dispatch(queryQueryResultPage({ ...rdb_query, core_cypher, neighbor_cypher })).then((response) => {
                            console.log('Query result:', response.payload);
                            const coreNodes = response?.payload?.core_nodes || [];
                            const results = response?.payload?.combined_query_result || {};
                            const coreRelationship = results.edges?.find(
                                edge => (edge["~start"] === coreNodes[0] && edge["~end"] === coreNodes[1])
                                    || (edge["~end"] === coreNodes[0] && edge["~start"] === coreNodes[1])
                            );

                            const dataSource = coreRelationship?.["~properties"]?.data_source || '';
                            const tissueKey = coreRelationship?.["~properties"]?.tissue_name || '';

                            const newVariables = {
                                additionalParams,
                                sourceTerm,
                                relationship,
                                targetTerm,
                                sourceSymbol: results.nodes?.find(
                                    node => node["~id"] === (sourceTerm.split('@')[1] || sourceTerm)
                                )?.["~properties"]?.name || sourceSymbol,
                                targetSymbol: results.nodes?.find(
                                    node => node["~id"] === (targetTerm.split('@')[1] || targetTerm)
                                )?.["~properties"]?.name || targetSymbol,
                                tissueKey,
                                dataSource,
                            };
                            if (newVariables) { setVariables(newVariables); }
                            const nextVariables = newVariables;

                            const processedCurrentQuestion =
                                addHighlight(
                                    replaceVariables(
                                        question_for_result,
                                        newVariables,
                                        true
                                    )
                                );
                            // nextVariables = {
                            //     sourceTerm: 'snp:rs177069',
                            //     targetTerm: 'gene:ENSG00000001626',
                            //     dataSource: 'splicing; GTEx',
                            //     tissueKey: 'pancreas',
                            //     targetSymbol: 'CFTR'
                            // };
                            const processedNextQuestions =
                                addHighlight(
                                    replaceVariables(
                                        question_for_result,
                                        nextVariables,
                                        true
                                    ),
                                    true
                                );
                            const processedAiQuestions =
                                ai_question_for_result?.map(
                                    question => replaceVariables(question, newVariables, true)
                                ) || [];

                            // update Redux store
                            dispatch(setProcessedQuestion({
                                currentQuestion: processedCurrentQuestion,
                                nextQuestions: processedNextQuestions,
                                aiQuestions: processedAiQuestions,
                                aiAnswerSubtitle: ai_answer_sub_title,
                                currentQuestionType: tabsQTL.find(
                                    tab => tab.data_source === dataSource
                                )?.label,
                            }));
                        });
                    }
                }
            });
        }
    }, []);

    const {
        currentQuestion,
        nextQuestions,
        aiQuestions,
        aiAnswerSubtitle,
        currentQuestionType,
    } = useSelector((state) => state.processedQuestion);

    const removeConsecutiveAsterisks = (text) => {
        return text.replace(/\*\*/g, '');
    };

    // query AI answer when queryResultPage and aiQuestions are available
    useEffect(() => {
        if (queryResultPage?.combined_query_result?.nodes?.length !== 0 && queryResultPage?.core_nodes && aiQuestions?.length > 0) {
            console.log('Querying AI answer with questions: ', aiQuestions);
            dispatch(queryAiAnswer({
                "question": aiQuestions,
                "graph": {
                    combined_query_result: queryResultPage.combined_query_result,
                    core_nodes: queryResultPage.core_nodes,
                }
            })).unwrap();
        }
    }, [queryResultPage, aiQuestions]);

    // Handle next question click
    const handleNextQuestionClick = (_) => {
        const nextVariables = {
            sourceTerm: 'snp@rs177069',
            targetTerm: 'gene@ENSG00000001626',
            relationship: 'QTL',
            targetSymbol: 'CFTR'
        };
        window.location.href = `/result?${new URLSearchParams(nextVariables)}`;
    };

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

    // Show loading skeleton if queryResultPage is not ready
    return !queryResultPage?.combined_query_result ? <LoadingSkeleton /> :
        (<Container sx={{ width: '100%', overflowX: 'auto', maxWidth: '1440px', marginX: '20px', alignSelf: 'center', overflow: 'visible' }} maxWidth={false}>
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
                    marginTop: '60px',
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
                            {currentQuestionType && (
                                <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: 16, textAlign: 'left', color: '#7F7D7D' }}>
                                    (Your selection belongs to: {currentQuestionType})
                                </Typography>
                            )}
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
                                {nextQuestions ? (
                                    <li onClick={() => handleNextQuestionClick(nextQuestions)}
                                        style={{ cursor: 'pointer' }}>
                                        <Box sx={{
                                            display: 'flex',
                                        }}>
                                            <Typography sx={{
                                                fontFamily: 'Open Sans',
                                                fontWeight: 400,
                                                fontSize: 16,
                                            }} dangerouslySetInnerHTML={{ __html: nextQuestions }} />
                                            <span style={{ alignContent: 'center' }}><ChevronRightIcon /></span>
                                        </Box>
                                    </li>
                                ) : (
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
                                    <KnowledgeGraph />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
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
                        zIndex: 2,
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        top: '0px',
                        left: '0px',
                        width: '100%',
                        height: '100%',
                        borderRadius: '20px 20px 0px 0px',
                        borderWidth: '1px 1px 0px 1px',
                        borderStyle: 'solid',
                        borderColor: "#E5E5E5",
                    }}></div>
                    {tabOptions.map((option, index) => (
                        <Tab
                            sx={{
                                minHeight: '48px',
                                height: '48px',
                                backgroundColor: currTab === option.value ? 'white' : '#F2FAFB',
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
                                        color: currTab === option.value ? '#398289' : 'black',
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
