import './scoped.css';

import React, {
    useEffect,
    useState,
} from 'react';

import {
    useDispatch,
    useSelector,
} from 'react-redux';

import { InfoOutlined as InfoOutlineIcon } from '@mui/icons-material';
import {
    Backdrop,
    Box,
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
import {
    ErrorComponent,
    tabsQTL,
} from '../components/IntermediatePage';
import KnowledgeGraph from '../components/KnowledgeGraph';
import QuestionAnswerPage from '../components/ResultComponent';
import VisuImage from '../image/output.png';
import { queryAiAnswer } from '../redux/aiAnswerSlice';
import { queryArticles } from '../redux/articlesSlice';
import { setProcessedQuestion } from '../redux/processedQuestionSlice';
import { queryQueryResultPage } from '../redux/queryResultPage';
import { setSearchTerms } from '../redux/searchSlice';
import { queryImage } from '../redux/typeToImageSlice';
import { queryViewSchema } from '../redux/viewSchemaSlice';
import tooltipsSchema from '../schema/tool_tips_schema.json';
import {
    addHighlight,
    replaceNextQuestion,
    replaceVariables,
} from '../utils/textProcessing';
import sampleSummaryData from './sample.json';

const defaultNextQuestion = {
    question: 'How does {INS} expression change in {beta cell} in T1D vs non-diabetic samples?',
    link: '/result?sourceTerm=gene@ENSG00000254647&targetTerm=cell_type&relationship=express_in'
}

const validateQuestions = async (questions) => {
    const fetchQueryResults = async (question) => {
        const response = flaskBackendAxiosInstanceNew
            .post('/pankgraph-neo4j',
                { query: question.query }, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then((response) => response.data?.results && response.data?.results !== "No results")
        const valid = await response;
        return { valid, question };
    };

    const validationResults = await Promise.all(questions.map(fetchQueryResults));

    return validationResults
        .filter(result => result.valid)
        .map(result => result.question);
};

const handleDownload = (data_source, credibleSet) => {
    const folder = tabsQTL.find(tab => tab.data_source === data_source)?.folder || "";
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
    const dispatch = useDispatch();

    const queryResultPage = useSelector((state) => state.queryResultPage.queryResultPage);
    const { aiAnswer } = useSelector((state) => state.aiAnswer);
    const { viewSchema } = useSelector((state) => state.viewSchema);
    const { typeToImage } = useSelector((state) => state.typeToImage);
    const { hoverId, hoverState } = useSelector((state) => state.hover);
    const [variables, setVariables] = useState({});
    const [referenceData, setReferenceData] = useState({});
    const [articlesData, setArticlesData] = useState([]);
    const [imagePopupOpen, setImagePopupOpen] = useState(false);
    const [nextQuestions, setNextQuestions] = useState([{ question: 'Loading...' }]);
    const [allNextQuestions, setAllNextQuestions] = useState(null);
    const [error, setError] = useState(false);

    const [renderedAiAnswer, setRenderedAiAnswer] = useState(null);

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
        if (viewSchema?.resources_tabs) {
            const data = viewSchema.resources_tabs;
            const newPankbaseLinks = data.pankbase_links.map((item) => item.map((i) => replaceVariables(i, variables)));
            const newExternalLinks = data.external_links.map((item) => item.map((i) => replaceVariables(i, variables)));
            setReferenceData({
                ...data,
                empirical_evidence: data.empirical_evidence && {
                    ...data.empirical_evidence,
                    link: replaceVariables(data.empirical_evidence.link, variables)
                },
                pankbase_links: newPankbaseLinks,
                external_links: newExternalLinks
            });
        }
    }, [viewSchema, variables]);

    // Fetch articles data based on aiAnswer
    useEffect(() => {
        if (aiAnswer) {
            const scoreMap = Object.fromEntries(
                aiAnswer.articles?.map(article => [article.pmid, article.score]) || []
            );
            const aiAnswerText = aiAnswer.answers ? aiAnswer.answers.join(' ') : '';
            console.log('aiAnswerText:', aiAnswerText);
            const pmidsFromText = ProcessLinks2({ text: aiAnswerText }).filter(part => part.type === "pubmedid").map(part => (part.text));
            const pmidsFromAgents = aiAnswer.articles?.map(article => (article.pmid)) || [];
            const pmids = [...new Set([
                ...pmidsFromText,
                ...pmidsFromAgents
            ])].slice(0, 50);
            dispatch(queryArticles({
                db: 'pubmed',
                id: pmids.join(','),
                retmode: 'json',
            })).then((response) => {
                if (!response.payload ||
                    Object.keys(response.payload.result || {})
                        .some(pmid => pmid !== "uids" && !response.payload.result[pmid]?.authors)
                ) {
                    setError(true);
                    return;
                }
                const sortedArticles = pmids.toSorted((a, b) => (scoreMap[b] || 0) - (scoreMap[a] || 0));
                setArticlesData(
                    sortedArticles.map(pmid => ({
                        pmid: pmid,
                        data: response.payload.result[pmid] || {},
                        doi: response.payload.result[pmid]?.articleids?.find(id => id.idtype === 'doi')?.value || ''
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
                        rdb_query_for_result_page,
                        next_questions,
                        resources_tabs
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

                        dispatch(queryQueryResultPage({ payload: { ...rdb_query, core_cypher, neighbor_cypher } })).then((response) => {
                            const coreNodes = response?.payload?.core_nodes || [];
                            const results = response?.payload?.combined_query_result || {};
                            const neighborNodes = results?.nodes?.filter(
                                node => !coreNodes.includes(node["~id"])
                            ) || [];
                            const coreRelationship = results.edges?.find(
                                edge => (edge["~start"] === coreNodes[0] && edge["~end"] === coreNodes[1])
                                    || (edge["~end"] === coreNodes[0] && edge["~start"] === coreNodes[1])
                            ) || results.edges?.find(
                                edge => (edge["~start"] === coreNodes[0] || edge["~end"] === coreNodes[1])
                                    || (edge["~end"] === coreNodes[0] || edge["~start"] === coreNodes[1])
                            );

                            const dataSource = coreRelationship?.["~properties"]?.data_source || '';
                            const credibleSetId = coreRelationship?.["~properties"]?.credible_set_id || '';
                            if (resources_tabs?.empirical_evidence?.lambda_function) {
                                const credible_set = coreRelationship?.["~properties"]?.credible_set || coreRelationship?.["~properties"]?.credible_set_id || '';
                                if (!credible_set) {
                                    console.log('[WARNING] credible_set is missing.');
                                } else {
                                    dispatch(queryImage({
                                        imageType: 'manhattan',
                                        link: `${relationship === "GWAS" ? "1_t1d-susie" : tabsQTL.find(tab => tab.data_source === dataSource)?.folder || ''}/${credible_set}`
                                    })).catch((error) => {
                                        console.log('[WARNING] Error fetching image:', error);
                                    });
                                }
                            }
                            const celltypeName = results.nodes
                                ?.filter(node => node["~labels"].includes('cell_type'))
                                ?.map(node => node["~properties"]?.name)
                                .join(', ')
                                .toLowerCase()
                                .replace(/, ([^,]*)$/, ', and $1') || '';
                            const tissueKey = coreRelationship?.["~properties"]?.tissue_name || '';

                            const neighborSource = neighborNodes.filter(
                                node => node["~labels"].includes(sourceTerm.split('@')[0])
                            );
                            const neighborTarget = neighborNodes.filter(
                                node => node["~labels"].includes(targetTerm.split('@')[0])
                            );
                            const neighbors = {
                                source: neighborSource,
                                target: neighborTarget,
                            }
                            const coloc = relationship === "COLOC" && results.edges?.find(
                                edge => (((edge["~start"] === coreNodes[0] && edge["~end"] === coreNodes[1])
                                    || (edge["~end"] === coreNodes[0] && edge["~start"] === coreNodes[1])) && edge["~type"] === "signal_COLOC_with")
                            )
                            const newVariables = {
                                additionalParams: [
                                    ...additionalParams,
                                    `tissue_name@${celltypeName}`,
                                    ...(coloc ? [`snp_id_QTL@${coloc["~properties"]?.["QTL_lead_vars"] || ''}`, `snp_id_GWAS@${coloc["~properties"]?.["GWAS_lead_vars"] || ''}`] : []),
                                ],
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
                                credibleSetId,
                            };
                            if (newVariables) { setVariables(newVariables); }
                            const processedCurrentQuestion =
                                addHighlight(
                                    replaceVariables(
                                        question_for_result,
                                        newVariables,
                                        true
                                    )
                                );
                            if (!processedCurrentQuestion) {
                                setError(true);
                                return;
                            }

                            setAllNextQuestions(next_questions.map((next_question) => replaceNextQuestion(
                                next_question,
                                newVariables,
                                neighbors
                            )));
                            const processedAiQuestions =
                                ai_question_for_result?.map(
                                    question => replaceVariables(question, newVariables, true)
                                ) || [];

                            // update Redux store
                            dispatch(setProcessedQuestion({
                                currentQuestion: processedCurrentQuestion,
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
        aiQuestions,
        aiAnswerSubtitle,
        currentQuestionType,
    } = useSelector((state) => state.processedQuestion);

    const removeConsecutiveAsterisks = (text) => {
        return text.replace(/\*\*/g, '');
    };

    const displaySummary = removeConsecutiveAsterisks(sampleSummaryData?.summary || '');

    // query AI answer when queryResultPage and aiQuestions are available
    useEffect(() => {
        if (queryResultPage?.combined_query_result?.nodes?.length !== 0 && queryResultPage?.core_nodes && aiQuestions?.length > 0) {
            dispatch(queryAiAnswer({
                "question": aiQuestions,
                "graph": {
                    combined_query_result: queryResultPage.combined_query_result,
                    core_nodes: queryResultPage.core_nodes,
                }
            })).unwrap();
        }
    }, [queryResultPage, aiQuestions]);

    const ProcessLinks2temp = ({ text }) => (
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

    function getLink(id) {
        const nodes = queryResultPage.combined_query_result.nodes;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node['~id'] === id) {
                return node['~properties']['link'];
            }
        }
        return null;
    }


    // Kai's work on dealing with **CFTR**(ENSG00000001626)
    function ProcessGeneWithId(text) {
        // replace case **CFTR**(ENSG00000001626) => <a href="link">CFTR (ENSG00000001626)</a>
        if (text == null) return [];

        const pattern = /(\*\*[A-Za-z0-9_-]+\*\*\s*\([A-Za-z0-9]+\))/;
        const output = [];
        const text_list = text.split(pattern).filter(Boolean);
        // console.log(queryResultPage);

        for (let i = 0; i < text_list.length; i++) {
            const part = text_list[i];
            const match = part.match(pattern);
            // console.log(match)

            if (match) {
                const gene = match[1];
                // console.log(gene);
                const word = removeConsecutiveAsterisks(gene).split(" ");
                const id = word[1].replace('(', '').replace(')', '');
                const link = getLink(id);
                const obj = {
                    text: word[0] + " " + word[1],
                    type: "link",
                    url: link,
                };
                output.push(obj);
            } else {
                output.push({ text: part, type: "text" });
            }
        }
        return output;
    }

    const ProcessLinks2 = ({ text }) => {
        const result = ProcessGeneWithId(text);
        const output = []
        for (let i = 0; i < result.length; i++) {
            const data = result[i];
            if (data.type === "link") {
                output.push(data);
            }
            else {
                const textPart = removeConsecutiveAsterisks(data.text);
                const list = ProcessLinks2temp({ text: textPart });
                output.push(...list);
            }
        }
        // const result = ProcessLinks2temp({ text });
        // console.log('ProcessLinks2 result:', result);
        return output;
    };

    // highlight the hover term in text
    function highlightText(text, term, keyPrefix = "hl") {
        if (!text || !term) return text;

        const regex = new RegExp(`(${term})`, "gi");
        const segs = String(text).split(regex);
        if (segs.length === 1) return text;

        return segs.map((seg, idx) => {
            const key = `${keyPrefix}-${idx}`;
            if (idx % 2 === 1) {
                return (
                    <mark key={key} className="hl">
                        {seg}
                    </mark>
                );
            }
            return <React.Fragment key={key}>{seg}</React.Fragment>;
        });
    }

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
            ) : (<span key={index}>{part.text}</span>)
        ));

    // highlist the hover term in graph viewer
    const ProcessLinksHighlighted = ({ text, term }) => {
        const parts = ProcessLinks2({ text });

        return parts.map((part, index) => {
            const children = highlightText(part.text, term, `p-${index}`);

            if (part.type === "pubmedid") {
                return (
                    <Link
                        key={index}
                        href={`#reference-item-${part.text}`}
                        sx={{
                            color: "#1976d2",
                            fontWeight: 400,
                            textDecoration: "none",
                            "&:hover": { textDecoration: "underline" },
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            const target = document.getElementById(`reference-item-${part.text}`);
                            if (target) {
                                target.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                        }}
                    >
                        {children}
                    </Link>
                );
            }

            if (part.type === "link") {
                return (
                    <a
                        key={index}
                        href={part.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#0069c2", textDecoration: "none" }}
                    >
                        {children}
                    </a>
                );
            }
            return <span key={index}>{children}</span>;
        });
    };

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

    if (error) return <ErrorComponent errorTitle={viewSchema?.result_error_title} errorMessage={viewSchema?.result_error_message} />;

    if (!(queryResultPage?.combined_query_result)) {
        return <LoadingSkeleton />;
    }

    const referencesItems = articlesData.map((ref, index) => ({
        id: index + 1,
        title: ref.data?.title || `PMID: ${ref.pmid}`,
        subtitle: buildReferenceSubtitle(ref),
        href: `https://pubmed.gov/${ref.pmid}`,
        anchorId: `reference-item-${ref.pmid}`,
    }));

    const empiricalEvidenceContent = referenceData?.empirical_evidence ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
            <Box sx={{ position: 'relative', width: '100%', maxWidth: 520 }}>
                {referenceData.empirical_evidence.lambda_function && !(typeToImage?.length) ? (
                    <Box sx={{ width: '100%', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F1F5F9', borderRadius: 2 }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : (
                    <Box
                        component="img"
                        src={referenceData.empirical_evidence.lambda_function ?
                            (typeToImage?.length ? `data:image/jpeg;base64,${typeToImage}` : "")
                            : VisuImage}
                        alt="Empirical Evidence"
                        sx={{ maxWidth: '100%', borderRadius: 2, cursor: referenceData.empirical_evidence.legend === "View" ? 'pointer' : 'default' }}
                        onClick={referenceData.empirical_evidence.legend === "View" ? () => setImagePopupOpen(true) : undefined}
                    />
                )}
            </Box>
            <Typography sx={{ fontFamily: 'Open Sans', fontSize: 16, fontWeight: 700 }}>
                {referenceData.empirical_evidence.title}
            </Typography>
            <Typography sx={{ fontFamily: 'Open Sans', fontSize: 14, fontWeight: 400, color: '#263238' }}>
                {referenceData.empirical_evidence.description}
            </Typography>
            {referenceData.empirical_evidence.link_text ? (
                <Link
                    href={referenceData.empirical_evidence.link || handleDownload(variables.dataSource, variables.credibleSetId)}
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
        pankbaseItems.length ? { label: 'PanKbase Links', items: pankbaseItems } : null,
        externalItems.length ? { label: 'External Links', items: externalItems } : null,
    ].filter(Boolean);

    const knowledgeGraphContent = (
        queryResultPage?.combined_query_result ? (
            <Box sx={{ width: '100%', height: '100%' }}>
                <KnowledgeGraph
                    graphData={queryResultPage.combined_query_result}
                    coordData={queryResultPage.xy_json}
                    sx={{ height: "100%" }}
                    containerHeight="100%"
                />
            </Box>
        ) : (
            <Box sx={{ width: '100%', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={28} />
            </Box>
        )
    );

    const aiSections = displaySummary
        ? [{
            heading: aiAnswerSubtitle || "Summary",
            body: displaySummary,
        }]
        : [];

    const pageData = {
        questionId: "Q1",
        title: stripHtml(currentQuestion) || "Question",
        aiOverview: { sections: aiSections },
        visualMaterial: {
            title: "Visual Material",
            tabs: [{ label: "Knowledge Graph", content: knowledgeGraphContent }],
        },
        evidences: evidenceTabs.length ? { title: "Evidences", tabs: evidenceTabs } : undefined,
        followUp: {
            title: "Follow Up",
            items: (nextQuestions || [])
                .filter((item) => item?.question)
                .map((item) => ({
                    label: stripHtml(item.question),
                    href: item.link?.replace(/^\/result(\b|\?)/, '/agent-result$1'),
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
            <QuestionAnswerPage data={pageData} />
        </>
    );
}

export default SearchResult;
