// Original /result presentation from upstream bc27e3f; only data bindings differ.
import '../SearchResult/scoped.css';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlineIcon from '@mui/icons-material/InfoOutlined';
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

import { ErrorComponent } from '../components/IntermediatePage';
import KnowledgeGraph from '../components/KnowledgeGraph';
import tooltipsSchema from '../schema/tool_tips_schema.json';
import { sitePath } from './api';
import { safeLegacyHref } from './legacyResultData';
import { recordInteraction, referenceKey } from './telemetry';
const EMPTY = {};
const EMPTY_LIST = [];
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
        marginTop: '24px',
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

export function LegacyResultPresentation({ data = EMPTY, error = '', interactionResultId }) {
    const auditRef = useRef(null);
    useEffect(() => {
        if (!interactionResultId || !data.aiAnswer?.answers?.length || !auditRef.current || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                recordInteraction(interactionResultId, 'answer_section_displayed', 'legacy-answer', 'result');
                observer.disconnect();
            }
        });
        observer.observe(auditRef.current);
        return () => observer.disconnect();
    }, [interactionResultId, data.aiAnswer]);
    const auditResource = (event) => {
        const link = event.target.closest?.('a[href]');
        if (link) recordInteraction(interactionResultId, 'resource_accessed', referenceKey(link.getAttribute('href')), 'result');
    };
    const { queryResultPage, aiAnswer, currentQuestion, aiAnswerSubtitle, currentQuestionType,
        nextQuestions = null, referenceData = EMPTY, articlesData = EMPTY_LIST,
        viewSchema = EMPTY, hoverId, hoverState, displayNotice = '' } = data;
    const [currTab, setCurrTab] = useState('references');
    const [activeReference, setActiveReference] = useState(null);
    const [imagePopupOpen, setImagePopupOpen] = useState(false);
    const [renderedAiAnswer, setRenderedAiAnswer] = useState(null);
    const tabOptions = [
        articlesData.length ? {value:'references', label:'References'} : null,
        referenceData.empirical_evidence ? {value:'empirical_evidence', label:'Empirical Evidence'} : null,
        referenceData.pankbase_links?.length ? {value:'pankbase_links', label:'PanKbase Links'} : null,
        referenceData.external_links?.length ? {value:'external_links', label:'External Links'} : null,
    ].filter(Boolean);
    const imagePath = referenceData.empirical_evidence?.image_url || '';
    const imageUrl = imagePath.startsWith('/') && !imagePath.startsWith('//') ? sitePath(imagePath) : '';
    useEffect(() => {
        if (!tabOptions.some((option) => option.value === currTab) && tabOptions.length) setCurrTab(tabOptions[0].value);
    }, [currTab, tabOptions]);
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

    const removeConsecutiveAsterisks = (text) => {
        return text.replace(/\*\*/g, '');
    };

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
        const nodes = queryResultPage?.combined_query_result?.nodes || [];
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
                const word = removeConsecutiveAsterisks(gene).replace(/\s*\(/, " (").split(" ");
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
        // temporary disable
        return text;
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
                        setCurrTab('references');
                        setActiveReference(part.text);
                    }}
                    key={index}
                >{part.text}</Link>
            ) : part.type === "link" ? (<a
                href={safeLegacyHref(part.url)}
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
                            setCurrTab("references");
                            setActiveReference(part.text);
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
                        href={safeLegacyHref(part.url)}
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

    // useEffect(() => {
    //     console.log('hoverId in SearchResult:', hoverId);
    //     console.log('hoverState in SearchResult:', hoverState);
    // }, [hoverId, hoverState]);

    const MarkdownAnswer = ({ text }) => <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]} components={{
        p: ({ children }) => {
            const content = React.Children.map(children, (child) => typeof child === 'string' ? <ProcessLinks text={child} /> : child);
            return /\n\s*\n/.test(text) ? <p>{content}</p> : <>{content}</>;
        },
        a: ({ children, href }) => <ProcessLinks text={`[${React.Children.toArray(children).join('')}](${href})`} />,
    }}>{text}</ReactMarkdown>;
    useEffect(() => {
        setRenderedAiAnswer(aiAnswer?.answers?.map((answer) => <MarkdownAnswer text={answer} />) || null);
    }, [aiAnswer, hoverState]);

    if (error) return <ErrorComponent errorTitle={viewSchema?.result_error_title} errorMessage={error || viewSchema?.result_error_message} />;

    // Show loading skeleton if queryResultPage is not ready
    return !(queryResultPage?.combined_query_result) ? <LoadingSkeleton /> :
        (<Container ref={auditRef} onClickCapture={auditResource} sx={{ width: '100%', overflowX: 'auto', maxWidth: '1440px', marginTop: '24px', marginX: '20px', alignSelf: 'center', overflow: 'visible' }} maxWidth={false}>
            {imageUrl && <Backdrop
                sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
                open={imagePopupOpen}
                onClick={() => setImagePopupOpen(false)}
            >
                <Box
                    component="img"
                    src={imageUrl || undefined}
                    alt="Empirical Evidence"
                    sx={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                    }}
                />
            </Backdrop>}
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
                                <a href={sitePath('/')} style={{ color: "#398289", fontWeight: 600, textUnderlineOffset: "3px", fontSize: "17px", marginBottom: "10px" }}>
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
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentQuestion) || 'No question available' }}
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
                                            href={safeLegacyHref(nextQuestion.link)}
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
                                                }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(nextQuestion.question) }} />
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
                                                    {aiAnswerSubtitle[index]}
                                                </Typography>
                                            )}
                                            <Typography component="div" sx={{
                                                fontFamily: 'Open Sans',
                                                textAlign: 'left',
                                                fontSize: '16px',
                                                fontWeight: 300
                                            }}>
                                                {renderedAiAnswer ? renderedAiAnswer[index] : <></>}
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
                                        Loading AI's overview...{displayNotice ? ` ${displayNotice}` : ''}
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
                                    flex: 1,
                                    minHeight: '450px',
                                    overflow: 'visible',
                                    backgroundColor: '#F9FAFB',
                                    border: "none",
                                    borderColor: '#EEEEEE',
                                    textAlign: 'left',
                                    maxWidth: '100%',
                                }}>
                                    <KnowledgeGraph onEvidenceInspect={(id) => recordInteraction(interactionResultId, 'graph_evidence_inspected', referenceKey(id), 'result')} graphData={queryResultPage.combined_query_result} coordData={queryResultPage.xy_json} edgeRoutes={queryResultPage.edge_routes} containerHeight="100%" sx={{ height: "100%" }} />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
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
                                        href={safeLegacyHref(ref.href || (ref.pmid ? "https://pubmed.gov/" + ref.pmid : ""))}
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
                                                {ref.subtitle && <>{ref.data.authors.length > 0 && <br />}{ref.subtitle}</>}
                                            </Typography>
                                            <Typography sx={{ fontFamily: 'Open Sans', color: "grey" }}>
                                                {ref.data.fulljournalname && <><i>{ref.data.fulljournalname}</i>.&nbsp;</>}
                                                {ref.data.pubdate.slice(0, 4)}
                                                {(ref.data.volume || ref.data.issue || ref.data.pages) && <>;</>}
                                                {ref.data.volume}
                                                {ref.data.issue && <>({ref.data.issue})</>}
                                                {ref.data.pages && <>:{ref.data.pages}</>}{(ref.data.pubdate || ref.data.volume || ref.data.issue || ref.data.pages) ? '.' : ''}
                                                &nbsp;<span
                                                    className="pmid-link"
                                                    style={{
                                                        color: '#1976d2',
                                                        fontWeight: 400,
                                                    }}
                                                >{ref.pmid ? `PMID: ${ref.pmid}` : ref.id}</span>
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
                                        {(referenceData.empirical_evidence.status === "pending") ? (
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
                                                component={imageUrl ? "img" : "div"}
                                                src={imageUrl || undefined}
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
                                                    referenceData.empirical_evidence.legend === "View" && imageUrl ? () => setImagePopupOpen(true) : () => { }
                                                }>
                                                    {imageUrl ? referenceData.empirical_evidence.legend : "Plot unavailable"}
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
                                                    href={safeLegacyHref(referenceData.empirical_evidence.link || referenceData.empirical_evidence.download_url)}
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
                                            href={safeLegacyHref(link[1])}
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
                                            href={safeLegacyHref(link[2])}
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


export default LegacyResultPresentation;
