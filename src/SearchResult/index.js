import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Grid, List, ListItem, Link, Tab, Tabs, CircularProgress, Collapse } from '@mui/material';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';
import { useSelector, useDispatch } from 'react-redux';
import './scoped.css';
import KnowledgeGraph from '../components/KnowledgeGraph';
import { queryAiAnswer } from '../redux/aiAnswerSlice';
import { queryViewSchema } from '../redux/viewSchemaSlice';
import { setProcessedQuestion } from '../redux/processedQuestionSlice';
import { replaceVariables, addHighlight } from '../utils/textProcessing';
import { queryQueryResultPage } from '../redux/queryResultPage';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlineIcon from '@mui/icons-material/InfoOutlined';
import { styled } from '@mui/material/styles';
import { setSearchTerms } from '../redux/searchSlice';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import tooltipsSchema from '../schema/tool_tips_schema.json';

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
    useEffect(() => {
        if (viewSchema?.resources_tabs) {
            let data = viewSchema.resources_tabs;
            let newPankbaseLinks = data.pankbase_links.map((item) => item.map((i) => replaceVariables(i, variables)));
            let newExternalLinks = data.external_links.map((item) => item.map((i) => replaceVariables(i, variables)));
            setReferenceData({
                ...data,
                pankbase_links: newPankbaseLinks,
                external_links: newExternalLinks
            });
        }
    }, [viewSchema, variables]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sourceTerm = params.get('sourceTerm');
        const relationship = params.get('relationship');
        const targetTerm = params.get('targetTerm');
        let targetSymbol = params.get('targetSymbol');
        let sourceSymbol = params.get('sourceSymbol');

        if (sourceTerm && relationship && targetTerm) {
            dispatch(setSearchTerms({
                sourceTerm,
                relationship,
                targetTerm,
                targetTermSymbol: targetSymbol || ''
            }));

            const getIdFromTerm = (term) => {
                return term.split(':')[1] || term;
            };

            const getTypeFromTerm = (term) => {
                return term.split(':')[0] || term;
            };

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
                    } = response.payload;

                    if (cypher_for_result_page_core && cypher_for_result_page_nbr) {
                        const temporaryVariables = {
                            sourceTerm,
                            targetTerm,
                        };
                        const core_cypher = replaceVariables(cypher_for_result_page_core, temporaryVariables);
                        const neighbor_cypher = replaceVariables(cypher_for_result_page_nbr, temporaryVariables);
                        dispatch(queryQueryResultPage({ core_cypher, neighbor_cypher })).then((response) => {
                            console.log('Query result:', response.payload);
                            const coreNodes = response?.payload?.core_nodes || [];
                            const coreRelationship = response?.payload?.combined_query_result?.edges?.find(
                                edge => (edge["~start"] === coreNodes[0] && edge["~end"] === coreNodes[1])
                                    || (edge["~end"] === coreNodes[0] && edge["~start"] === coreNodes[1])
                            );
                            sourceSymbol = response?.payload?.combined_query_result?.nodes?.find(
                                node => node["~id"] === coreNodes[0]
                            )?.["~properties"]?.name || sourceSymbol;
                            targetSymbol = response?.payload?.combined_query_result?.nodes?.find(
                                node => node["~id"] === coreNodes[1]
                            )?.["~properties"]?.name || targetSymbol;
                            const dataSource = coreRelationship?.["~properties"]?.data_source || '';
                            const tissueKey = coreRelationship?.["~properties"]?.tissue_name || '';
                            let newVariables = {
                                sourceTerm,
                                relationship,
                                targetTerm,
                                sourceSymbol,
                                targetSymbol,
                                tissueKey,
                                dataSource,
                            };
                            if (newVariables) { setVariables(newVariables); }
                            let processedCurrentQuestion = addHighlight(replaceVariables(question_for_result, newVariables));
                            let nextVariables = newVariables;
                            // nextVariables = {
                            //     sourceTerm: 'snp:rs177069',
                            //     targetTerm: 'gene:ENSG00000001626',
                            //     dataSource: 'splicing; GTEx',
                            //     tissueKey: 'pancreas',
                            //     targetSymbol: 'CFTR'
                            // };
                            let processedNextQuestions = addHighlight(replaceVariables(question_for_result, nextVariables), true);

                            const processedAiQuestions = ai_question_for_result?.map(question => replaceVariables(question, newVariables)) || [];

                            // 更新 Redux store
                            dispatch(setProcessedQuestion({
                                currentQuestion: processedCurrentQuestion,
                                nextQuestions: processedNextQuestions,
                                aiQuestions: processedAiQuestions,
                                aiAnswerSubtitle: ai_answer_sub_title,
                                currentQuestionType: dataSource + '; ' + tissueKey + ' tissue'
                            }));
                        });
                    }

                    // 处理查询
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
    useEffect(() => {
        if (queryResultPage?.combined_query_result?.nodes?.length != 0 && queryResultPage?.core_nodes && aiQuestions?.length > 0) {
            const processedQuestions = aiQuestions.map(question =>
                `${question} (answer the question in 50 words)`
            );
            console.log("processedQuestions", {
                "question": processedQuestions,
                "graph": {
                    combined_query_result: queryResultPage.combined_query_result,
                    core_nodes: queryResultPage.core_nodes,
                }
            });
            dispatch(queryAiAnswer({
                "question": processedQuestions,
                "graph": {
                    combined_query_result: queryResultPage.combined_query_result,
                    core_nodes: queryResultPage.core_nodes,
                }
            })).unwrap();
        }
    }, [queryResultPage, aiQuestions]);

    const handleNextQuestionClick = (question) => {
        const nextVariables = {
            sourceTerm: 'snp:rs177069',
            targetTerm: 'gene:ENSG00000001626',
            relationship: 'QTL',
            targetSymbol: 'CFTR'
        };
        window.location.href = `/result?${new URLSearchParams(nextVariables)}`;
    };

    const processLinks = (text) => {
        // replace (aaa)[bbb] with <a href="bbb">aaa</a>
        const regex = /\[(.*?)\]\((.*?)\)/g;
        return text.replace(regex, (match, p1, p2) => {
            return `<a href="${p2}" target="_blank" style="color: #0069c2; text-decoration: none">${p1}</a>`;
        });
    }

    // 如果正在加载答案或答案为空，显示加载状态
    if (queryAiAnswerStatus === "pending" || !aiAnswer?.answers) {
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
                alignItems: "stretch", marginBottom: '20px', marginTop: '-20px'
            }}>
                {/*left*/}
                <Grid item xs={6} height={"740px"} display="flex">

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
                                        textAlign: 'justify',
                                        fontSize: '14px',
                                        fontWeight: 100
                                    }}>
                                        <span dangerouslySetInnerHTML={{ __html: processLinks(removeConsecutiveAsterisks(answer)) }} />
                                    </Typography>
                                    {/*{index < aiAnswer.answers.length - 1 && <Divider sx={{ my: 2 }} />}*/}
                                </div>
                            ))}
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
                    '& .MuiTab-root:first-child': {
                        borderTopLeftRadius: '20px',
                    },
                    '& .MuiTab-root:last-child': {
                        borderTopRightRadius: '20px',
                    },
                }}
            >
                {[
                    { value: 'reference', label: 'Reference' },
                    { value: 'visualization', label: 'Visualization' },
                    { value: 'pankbase_links', label: 'PanKbase Links' },
                    { value: 'external_links', label: 'External Links' }
                ].map((option) => (
                    <Tab
                        sx={{
                            minHeight: '48px',
                            height: '48px',
                            backgroundColor: currTab === option.value ? 'white' : '#F2FAFB',
                            borderWidth: '1px 1px 0px 1px',
                            borderStyle: currTab === option.value ? 'solid' : 'none',
                            borderColor: currTab === option.value ? '#DDDDDD' : '#EEEEEE',
                            borderRadius: currTab === option.value ? '20px 20px 0px 0px' : 'default',
                        }}
                        key={option.value}
                        label={
                            <Typography
                                component="span"
                                sx={{
                                    textAlign: 'left',
                                    fontFamily: 'Open Sans',
                                    fontSize: '16px',
                                    color: currTab === option.value ? '#3A838B' : 'black',
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
            <Box sx={{ position: 'relative', padding: '20px', backgroundColor: '#E4F0F1', marginBottom: '20px', borderRadius: '0px 20px 20px 20px' }}>
                <Collapse in={currTab === 'pankbase_links'}>
                    <List sx={{ padding: '0px' }}>
                        <ListItem sx={{ paddingY: '0px' }}>
                            •&nbsp;<Link
                                href={process.env.REACT_APP_PANKGRAPH_LINK + '/qtldatasource'}
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
                            >QTL Data Source</Link>
                        </ListItem>
                        <ListItem sx={{ paddingY: '0px' }}>
                            •&nbsp;<Link
                                href={process.env.REACT_APP_PANKGRAPH_LINK + '/pipeline'}
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
                            >QTL Pipeline</Link>
                        </ListItem>
                        <ListItem sx={{ paddingY: '0px' }}>
                            •&nbsp;<Link
                                href={process.env.REACT_APP_PANKBASE_LINK + '/single-cell.html'}
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
                            >
                                Integrated Cell Browser
                            </Link>
                        </ListItem>
                    </List>
                </Collapse>
                <Collapse in={currTab === 'external_links'}>
                    <List sx={{ padding: '0px' }}>
                        {referenceData?.external_links?.map((link, index) => (
                            <ListItem sx={{ paddingY: '0px' }} key={index}>
                                • {link[0]}&nbsp;<Link
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
