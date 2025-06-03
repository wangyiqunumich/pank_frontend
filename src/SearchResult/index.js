import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Box, Grid, List, ListItem, Link, Tab, Tabs, CircularProgress, Collapse } from '@mui/material';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { useSelector, useDispatch } from 'react-redux';
import './scoped.css';
import KnowledgeGraph from '../components/KnowledgeGraph';
import { queryAiAnswer } from '../redux/aiAnswerSlice';
import { queryViewSchema } from '../redux/viewSchemaSlice';
import { queryArticles } from '../redux/articlesSlice';
import { setProcessedQuestion } from '../redux/processedQuestionSlice';
import { replaceVariables, addHighlight } from '../utils/textProcessing';
import { queryQueryResultPage } from '../redux/queryResultPage';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlineIcon from '@mui/icons-material/InfoOutlined';
import { styled } from '@mui/material/styles';
import { setSearchTerms } from '../redux/searchSlice';
import tooltipsSchema from '../schema/tool_tips_schema.json';

const tabOptions = [
    { value: 'reference', label: 'Reference' },
    { value: 'visualization', label: 'Visualization' },
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

const SNPPlotImage = ({ imageSrc }) => {
    if (!imageSrc) return null;

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
        }}>
            <img
                src={`data:image/jpeg;base64,${imageSrc}`}
                alt="SNP p-values Plot"
                style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                }}
            />
        </div>
    );
};

function SearchResult() {
    const [currTab, setCurrTab] = useState('reference');
    const dispatch = useDispatch();

    const queryResultPage = useSelector((state) => state.queryResultPage.queryResultPage);
    const { aiAnswer, queryAiAnswerStatus } = useSelector((state) => state.aiAnswer);
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
                    // 处理 schema 数据
                    const {
                        question_for_result,
                        next_questions,
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
                            ] : [];
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
                                    node => node["~id"] === coreNodes[0]
                                )?.["~properties"]?.name || sourceSymbol,
                                targetSymbol: results.nodes?.find(
                                    node => node["~id"] === coreNodes[1]
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

                            // 更新 Redux store
                            dispatch(setProcessedQuestion({
                                currentQuestion: processedCurrentQuestion,
                                nextQuestions: processedNextQuestions,
                                aiQuestions: processedAiQuestions,
                                aiAnswerSubtitle: ai_answer_sub_title,
                                currentQuestionType: relationship === "QTL"
                                    && (dataSource + '; ' + tissueKey + ' tissue')
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
        if (queryResultPage?.combined_query_result?.nodes?.length != 0 && queryResultPage?.core_nodes && aiQuestions?.length > 0) {
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
    const handleNextQuestionClick = (question) => {
        const nextVariables = {
            sourceTerm: 'snp@rs177069',
            targetTerm: 'gene@ENSG00000001626',
            relationship: 'QTL',
            targetSymbol: 'CFTR'
        };
        window.location.href = `/result?${new URLSearchParams(nextVariables)}`;
    };

    // process links in the AI answer text
    const ProcessLinks = ({ text }) => {
        // replace [aaa](bbb) with <a href="bbb">aaa</a>
        if (!text) return <></>;
        return (<>
            {text
                .replace(
                    /\[(.*?)\]\((.*?)\)/g, (match, p1, p2) =>
                    `<a href="${p2}" target="_blank" style="color: #0069c2; text-decoration: none">${p1}</a>`
                )
                .split(/(\[PubMed[^\]]+\]|\(PubMed[^\)]+\))/g)
                .map((part, index) =>
                    part.match(/^\[.*\]$|^\(.*\)$/)
                        ? <span key={`part-${index}`}>{
                            part.split(/(\d+)/g).map((subPart, subIndex) =>
                                //if all digit?
                                subPart.match(/^\d+$/)
                                    ? <a
                                        href={`#reference-item-${subPart}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setCurrTab('reference');
                                            setActiveReference(subPart);
                                        }}
                                        key={`subpart-${index}-${subIndex}`}>
                                        {subPart}
                                    </a>
                                    : <span key={`subpart-${index}-${subIndex}`}>{subPart}</span>
                            )}</span>
                        : <span key={`part-${index}`}>{part}</span>
                )}
        </>);
    }

    // 如果正在加载答案或答案为空，显示加载状态
    if (!queryResultPage?.combined_query_result) {
        return (
            <Container
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                }}
            >
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container sx={{
            padding: 0, display: 'flex',
            flexDirection: 'column', justifyContent: 'space-evenly',
            alignSelf: 'center',
            maxWidth: '1440px',
            minWidth: '1000px',
            marginLeft: '20px',
            marginRight: '20px',
            flexDirection: 'column',
            flexGrow: 1,
        }} disableGutters maxWidth={false}>
            {/*test question block*/}

            <Box sx={{ padding: '20px', backgroundColor: '#E4F0F1', marginBottom: '20px', marginTop: '60px', borderRadius: '20px' }}>
                <Grid container spacing={4} height={"100%"} sx={{ alignItems: "stretch" }}>
                    <Grid item xs={6} height={"100%"}>
                        <Box sx={{ width: "100%", justifyContent: "space-between", display: "flex", alignItems: "center" }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 20, width: 685, textAlign: 'left', marginBottom: '10px' }}>
                                Question <TooltipComponent title="Question" content="The question of the current search result." />
                            </Typography>
                            {/*a link*/}
                            <a href={"/"} style={{ color: "#398289", textUnderlineOffset: "3px", fontSize: "16px", marginBottom: "20px" }}>
                                CANCEL
                            </a>
                        </Box>
                        {currentQuestionType && (
                            <Typography sx={{ fontSize: 14, textAlign: 'left' }}>
                                (Your selection belongs to: {currentQuestionType})
                            </Typography>
                        )}
                        <Typography
                            sx={{
                                flex: 1,
                                textAlign: 'left',
                                wordWrap: 'break-word',
                                whiteSpace: 'normal',
                                fontSize: 16,
                                // fontWeight: 300
                            }}
                            dangerouslySetInnerHTML={{ __html: currentQuestion || 'No question available' }}
                        />

                    </Grid>
                    <Grid item xs={6} height={"100%"}>
                        {/*you may also ask*/}
                        <Typography sx={{ fontWeight: 600, fontSize: 20, width: 685, textAlign: 'left', marginBottom: '10px' }}>
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
                                            fontSize: 14,
                                            fontFamily: 'Open Sans'
                                        }} dangerouslySetInnerHTML={{ __html: nextQuestions }} />
                                        <span style={{ alignContent: 'center' }}><ChevronRightIcon /></span>
                                    </Box>
                                </li>
                            ) : (
                                <Typography sx={{ fontSize: 16 }}>No next questions available</Typography>
                            )}
                        </ul>
                    </Grid>
                </Grid>
            </Box>
            <Grid container spacing={4} height={"100%"} sx={{
                alignItems: "stretch", marginBottom: '48px', marginTop: '-4px'
            }}>
                {/*left*/}
                <Grid item xs={6} minHeight={"740px"} display="flex">
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        width: "100%",
                        backgroundColor: '#FBFBFB',
                        border: 1,
                        borderColor: '#EEEEEE',
                        padding: '20px',
                        position: 'relative',
                        borderRadius: '20px'
                    }}>
                        <Typography sx={{
                            fontWeight: 'bold', fontSize: 20
                        }}>
                            AI's Overview<TooltipComponent title="AI's Overview" content="AI's overview of the current search result." />
                        </Typography>
                        <Typography component="div">
                            {Array.isArray(aiAnswer?.answers) && aiAnswer.answers.map((answer, index) => (
                                <div key={index} style={{ marginBottom: index < aiAnswer.answers.length - 1 ? '20px' : '0' }}>
                                    {aiAnswerSubtitle && aiAnswerSubtitle[index] && (
                                        <Typography sx={{
                                            textAlign: 'left',
                                            gap: 1,
                                            fontSize: '18px'
                                        }}>
                                            <span style={{ color: '#FFD700' }}>✨</span>
                                            {aiAnswerSubtitle[index]}
                                        </Typography>
                                    )}
                                    <Typography sx={{
                                        textAlign: 'left',
                                        fontSize: '14px',
                                        fontWeight: 100
                                    }}>
                                        <ProcessLinks text={removeConsecutiveAsterisks(answer)} />
                                    </Typography>
                                    {/*{index < aiAnswer.answers.length - 1 && <Divider sx={{ my: 2 }} />}*/}
                                </div>
                            ))}
                        </Typography>
                    </Box>
                </Grid>

                {/*graph viewer, right*/}
                <Grid item xs={6} minHeight={"740px"} display="flex">
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '32px',
                        width: "calc(100% - 40px)",
                        maxWidth: 'calc(100% - 40px)',
                        backgroundColor: '#FBFBFB',
                        border: 1,
                        borderColor: '#EEEEEE',
                        padding: '20px',
                        position: 'relative',
                        borderRadius: '20px'
                    }}>
                        <Typography sx={{
                            fontWeight: 'bold',
                            fontSize: 20
                        }}>
                            Graph Viewer<TooltipComponent title="Graph Viewer" content="The graph showing the relationship between the SNP and the gene." />
                        </Typography>
                        <Box sx={{
                            position: 'relative',
                            minHeight: '450px',
                            overflow: 'visible',
                            backgroundColor: '#FBFBFB',
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
                {[
                    { value: 'reference', label: 'Reference' },
                    { value: 'visualization', label: 'Visualization' },
                    { value: 'pankbase_links', label: 'PanKbase Links' },
                    { value: 'external_links', label: 'External Links' }
                ].map((option, index) => (
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
                backgroundColor: '#FBFBFB',
                marginBottom: '20px',
                borderRadius: '0px 20px 20px 20px',
                border: '1px solid #EEEEEE',
                transform: 'translateY(-1px)',
            }}>
                <Collapse in={currTab === 'reference'}>
                    <List sx={{
                        padding: '0px',
                        ".MuiListItem-root": {
                            paddingTop: '15px',
                        },
                        ".MuiListItem-root:first-of-type": {
                            paddingTop: '0px',
                        }
                    }}>
                        {
                            articlesData?.map((ref, index) => (
                                <Link
                                    href={"https://pubmed.gov/" + ref.pmid}
                                    sx={{ textDecoration: 'none', color: '#1976d2' }}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ListItem
                                        sx={{
                                            paddingY: '0px',
                                            marginLeft: '20px',
                                            flexDirection: "column",
                                            alignItems: "flex-start",
                                            position: "relative",
                                            fontSize: '12px',
                                            fontWeight: 400,
                                            textAlign: 'left',
                                            wordWrap: 'break-word',
                                            whiteSpace: 'normal',
                                            maxWidth: 'calc(100% - 20px)',
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
                                            alignItems: "flex-end"
                                        }}>
                                            <Typography
                                                sx={{ textAlign: 'right', }}
                                            >{index + 1}.</Typography>
                                        </Box>
                                        <Typography
                                            sx={{ fontWeight: 600 }}
                                        >{ref.title}</Typography>
                                        <Typography>
                                            {(() => {
                                                const authors = ref.data.authors;
                                                return authors.length <= 2 ?
                                                    authors.map((author) => (author.name)).join(', ') :
                                                    `${authors[0].name}, ..., ${authors[authors.length - 1].name}`;
                                            })()}
                                        </Typography>
                                        <Typography sx={{ color: "grey" }}>
                                            <i>{ref.data.fulljournalname}</i>.&nbsp;
                                            {ref.data.pubdate.slice(0, 4)}
                                            {(ref.data.volume || ref.data.issue || ref.data.pages) && <>;</>}
                                            {ref.data.volume}
                                            {ref.data.issue && <>({ref.data.issue})</>}
                                            {ref.data.pages && <>:{ref.data.pages}</>}.
                                            <Link
                                                href={"https://pubmed.gov/" + ref.pmid}
                                                sx={{ textDecoration: 'none', color: '#1976d2' }}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            ><span>&nbsp;PMID: {ref.pmid}</span></Link>
                                        </Typography>
                                    </ListItem>
                                </Link>
                            ))
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
    );
}

export default SearchResult;
