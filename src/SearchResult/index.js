import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Box, List, ListItem, Link, CircularProgress, Divider, Collapse } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import './scoped.css';
import KnowledgeGraph from '../components/KnowledgeGraph';
import exactData from '../exact.json';
import extendData from '../extend.json';
import ImageModal from '../components/ImageModal';
import { queryImage } from "../redux/typeToImageSlice";
import { queryAiAnswer } from '../redux/aiAnswerSlice';
import { Dialpad } from '@mui/icons-material';
import { queryViewSchema } from '../redux/viewSchemaSlice';
import { setNextQuestionClicked } from '../redux/searchSlice';
import { queryQueryResult } from '../redux/queryResultSlice';
import { setProcessedQuestion } from '../redux/processedQuestionSlice';
import { setUsingFallback } from '../redux/searchSlice';
import { setVariables } from '../redux/variablesSlice';
import { replaceVariables } from '../utils/textProcessing';
import { store } from '../redux/store';
import { queryQueryVisResult } from '../redux/queryVisResultSlice';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled } from '@mui/material/styles';
import { setSearchTerms } from '../redux/searchSlice';
import SearchBar from '../SearchBar';

const colorMap = {
    gene: "#ABD0F1",
    sequence_variant: "#FFB77F",
    pathway: "#F6C957",
    ontology : "#8c561b",
    article:"#e377c2",
    open_chromatin_region: "#8c564b",
  };

// 添加一个带动画的展开按钮组件
const ExpandMore = styled((props) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

function TypewriterEffect({ text, speed = 5, onComplete }) {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timer = setTimeout(() => {
                setDisplayedText(prevText => prevText + text[currentIndex]);
                setCurrentIndex(prevIndex => prevIndex + 1);
            }, speed);

            return () => clearTimeout(timer);
        } else if (onComplete) {
            onComplete();
        }
    }, [currentIndex, text, speed, onComplete]);

    return <span dangerouslySetInnerHTML={{ __html: displayedText }} />;
}

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

const Legend = () => (
  // <div className="styled-paper" data-title="Legend">
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
        position: 'relative',
        padding: '20px',
        backgroundColor: '#FBFBFB',
        border: 1,
        borderColor: '#EEEEEE',
        marginBottom: '20px'
    }}>
        <Typography sx={{
            fontWeight: 'bold',
            fontSize: 22,
            position: 'absolute',
            top: -44,
            left: 0,
            zIndex: 1
        }}>
            Legend
        </Typography>
      {/* 第一行 */}
        <Box>
            <Typography sx={{ textAlign: 'left' }}>Search result:</Typography>
        </Box>
        {/* 第2行 */}
      <Box sx={{ 
        display: 'flex',
        // gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 2
      }}>
        <Box sx={{ flex: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#ABD0F1', borderRadius: '4px' }} />
          <Typography variant="body2">Gene</Typography>
        </Box>
        <Box sx={{ flex: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#FFB77F', borderRadius: '4px' }} />
          <Typography variant="body2">Sequence variant</Typography>
        </Box>
        <Box sx={{ flex: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#F6C957', borderRadius: '4px' }} />
          <Typography variant="body2">Pathway</Typography>
        </Box>
          <Box sx={{ flex: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 20, height: 20, backgroundColor: '#e377c2', borderRadius: '4px' }} />
              <Typography variant="body2">Article</Typography>
          </Box>
      </Box>
      {/* 第3行 */}
      <Box sx={{ 
        display: 'flex',
        // gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 2
      }}>
          <Typography>Concepts related to current search result presented in </Typography>
          <Box sx={{ width: 20, height: 20, backgroundColor: 'white', borderRadius: '4px', border: '2px solid #C0C0C0' }} />
        {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#8c561b', borderRadius: '4px' }} />
          <Typography variant="body2">Ontology</Typography>
        </Box> */}
        {/*<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>*/}
        {/*  <Box sx={{ width: 20, height: 20, backgroundColor: '#C0C0C0', borderRadius: '4px' }} />*/}
        {/*  <Typography variant="body2">Current Searched Node</Typography>*/}
        {/*</Box>*/}
        {/*<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>*/}
        {/*  <Box sx={{ width: 20, height: 20, backgroundColor: 'white', borderRadius: '4px', border: '2px solid #C0C0C0' }} />*/}
        {/*  <Typography variant="body2">Extend Node</Typography>*/}
        {/*</Box>*/}
      </Box>
    </Box>
  // </div>
);

function SearchResult() {
    const [showTable, setShowTable] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [expanded, setExpanded] = useState(false);
    const dispatch = useDispatch();

    // 从 viewSchema 中获取数据
    const { viewSchema } = useSelector((state) => state.viewSchema);
    const queryResult = useSelector((state) => state.queryResult.queryResult);
    const { aiAnswer, queryAiAnswerStatus } = useSelector((state) => state.aiAnswer);
    const searchState = useSelector((state) => state.search);
    const snpPlotImage = useSelector((state) => state.typeToImage.typeToImage);
    const queryTypeToImageStatus = useSelector((state) => state.typeToImage.queryTypeToImageStatus);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sourceTerm = params.get('snpId');
        const relationship = params.get('relationship');
        const targetTerm = params.get('geneId');
        const targetSymbol = params.get('geneSymbol');
        const leadSnp = params.get('leadSnp');
        const dataSource = params.get('dataSource');
        const tissueKey = params.get('tissueKey');
        
        if (sourceTerm && relationship && targetTerm) {
            dispatch(setSearchTerms({
                sourceTerm,
                relationship,
                targetTerm,
                targetTermSymbol: targetSymbol || ''
            }));

            const getIdFromTerm = (term) => {
                return term;
            };

            dispatch(setVariables({
                snpId: getIdFromTerm(sourceTerm),
                leadSnp: leadSnp,
                geneId: getIdFromTerm(targetTerm),
                dataSource: dataSource,
                tissueKey: tissueKey,
                geneSymbol: targetSymbol || ''
            }));

            const fixedSourceTerm = 'sequence_variant';
            const fixedTargetTerm = 'gene:' + getIdFromTerm(targetTerm);
            
            dispatch(queryViewSchema({
                sourceTerm: fixedSourceTerm,
                relationship,
                targetTerm: fixedTargetTerm
            })).then((response) => {
                if (response.payload) {
                    // 处理 schema 数据
                    const { 
                        question_for_result,
                        next_questions,
                        ai_question_for_result,
                        ai_answer_title,
                        ai_answer_sub_title,
                        cyper_for_result_page_all_nodes_specific 
                    } = response.payload;

                    // 处理问题和变量替换
                    const variables = {
                        snpId: getIdFromTerm(sourceTerm),
                        leadSnp: leadSnp,
                        geneId: getIdFromTerm(targetTerm),
                        dataSource: dataSource,
                        tissueKey: tissueKey,
                        geneSymbol: targetSymbol || ''
                    };

                    const processedCurrentQuestion = replaceVariables(
                        question_for_result,
                        variables
                    );

                    let nextVariables;
                    if (leadSnp == 'rs17510162') {
                        nextVariables = {
                            snpId: '9:95214406_TC_T',
                            leadSnp: '9:95214406_TC_T',
                            geneId: 'ENSG00000188312',
                            dataSource: 'GTEx; SusieR',
                            tissueKey: 'pancreatic',
                            geneSymbol: 'CENPP'
                        };
                    } else {
                        nextVariables = {
                            snpId: 'rs17510162',
                            leadSnp: 'rs17510162',
                            geneId: 'ENSG00000134242',
                            dataSource: 'GTEx; SusieR',
                            tissueKey: 'pancreatic',
                            geneSymbol: 'ptpn22'
                        };
                    }

                    const processedNextQuestions = next_questions?.map(q => 
                        replaceVariables(q.question, nextVariables)
                    ) || [];

                    const processedAiQuestions = ai_question_for_result?.map(question => {
                        let processedQuestion = question;
                        if (sourceTerm) {
                            processedQuestion = processedQuestion.replace(/@snp_node@/g, getIdFromTerm(sourceTerm));
                        }
                        if (targetTerm) {
                            processedQuestion = processedQuestion.replace(/@gene_node@/g, getIdFromTerm(targetTerm));
                        }
                        return processedQuestion;
                    }) || [];

                    const processedAiAnswerTitle = ai_answer_title
                        ?.replace(/@snp_node@/g, getIdFromTerm(sourceTerm))
                        ?.replace(/@gene_id@/g, getIdFromTerm(targetTerm));

                    // 更新 Redux store
                    dispatch(setProcessedQuestion({
                        currentQuestion: processedCurrentQuestion,
                        nextQuestions: processedNextQuestions,
                        aiQuestions: processedAiQuestions,
                        aiAnswerTitle: processedAiAnswerTitle,
                        aiAnswerSubtitle: ai_answer_sub_title,
                        currentQuestionType: dataSource + '; ' + tissueKey + ' tissue'
                    }));

                    // 处理查询
                    if (cyper_for_result_page_all_nodes_specific) {
                        const query = cyper_for_result_page_all_nodes_specific
                            .replace(/@snp_node@/g, sourceTerm)
                            .replace(/@gene_node@/g, targetTerm);
                        
                        dispatch(queryQueryResult({ query }));
                        dispatch(queryQueryVisResult({ query }));
                    }
                }
            });
        }
    }, [dispatch]);

    const { currentQuestion, nextQuestions, aiQuestions, aiAnswerTitle, aiAnswerSubtitle, currentQuestionType } = useSelector((state) => state.processedQuestion);
    useEffect(() => {
        function handleResize() {
            setWindowWidth(window.innerWidth)
        }
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        if (queryTypeToImageStatus === 'fulfilled') {
            setImageLoading(false);
        }
    }, [queryTypeToImageStatus]);

    const removeConsecutiveAsterisks = (text) => {
        return text.replace(/\*\*/g, '');
    };
    useEffect(() => {
        if (queryResult.results?.length != 0 && queryResult.results?.[0]?.gene_node) {
            const processedQuestions = aiQuestions.map(question => 
                `${question} (answer the question in 50 words)`
            );
            console.log(processedQuestions);
            dispatch(queryAiAnswer({
                "question": processedQuestions, 
                "graph": queryResult
            })).unwrap();
        }
    }, [queryResult, currentQuestion, aiQuestions, dispatch]);
    console.log(aiAnswer);
    const answerText = `Currently <span style="color: #FFA500;">SNP rs73920612</span> is the eQTL of one gene: <span style="color: #FF69B4;">CENPO</span>

✨ Gene overview:
• <span style="color: #FF69B4;">CENPO</span> (Centromere Protein O) is a protein coding gene involved in key processes such as bipolar spindle assembly, chromosome segregation, and checkpoint signaling during mitosis. It is critical for maintaining chromosomal stability during cell division (<a href="https://pubmed.ncbi.nlm.nih.gov/36187159/" target="_blank" style="color: #8A2BE2;">PMID:36187159</a>).

✨ Specific relation to Type 1 Diabetes:
• While <span style="color: #FF69B4;">CENPO</span>'s direct association with Type 1 Diabetes is not explicitly documented, its role in immune system modulation could suggest potential indirect links. However, specific research connecting <span style="color: #FFA500;">SNP rs73920512</span> in the <span style="color: #FF69B4;">CENPO</span> gene to Type 1 Diabetes is required for a definitive association (<a href="https://pubmed.ncbi.nlm.nih.gov/37061713/" target="_blank" style="color: #8A2BE2;">PMID:37061713</a>).

This answer refers to the following resources in PanKbase:`;

    const handleTypewriterComplete = () => {
        setShowTable(true);
    };

    const handleOpenModal = () => {
        setModalOpen(true);
        setImageLoading(true);
        dispatch(queryImage({imageType: 'snp_p_values_plot'}));
    };
    
    const handleCloseModal = () => setModalOpen(false);

    const handleNextQuestionClick = (question) => {
        // if (searchState.sourceTerm && searchState.relationship && searchState.targetTerm) {
        //     dispatch(setNextQuestionClicked(true));
        //     const currentState = store.getState();
        //     const isUsingFallback = currentState.search.usingFallback;
            
        //     let queryParams = {
        //         sourceTerm: searchState.sourceTerm,
        //         relationship: searchState.relationship,
        //         targetTerm: searchState.targetTerm,
        //         targetTermSymbol: searchState.targetTermSymbol
        //     };

        //     if (isUsingFallback) {
        //         dispatch(setUsingFallback(false));
        //     } else {
        //         dispatch(setUsingFallback(true));
        //         queryParams = {
        //             sourceTerm: 'sequence_variant:rs17510162',
        //             relationship: 'fine_mapped_eQTL',
        //             targetTerm: 'gene:ENSG00000134242',
        //             targetTermSymbol: 'ptpn22'
        //         };
        //     }

        //     const processNextQuestion = async () => {
        //         // 使用正则表达式来分割 sourceTerm 和 targetTerm
        //         const getIdFromTerm = (term) => {
        //             const match = term.match(/^[^:]+:(.+)$/);
        //             return match ? match[1] : term;
        //         };

        //         dispatch(setVariables({
        //             snpId: getIdFromTerm(queryParams.sourceTerm),
        //             leadSnp: getIdFromTerm(queryParams.sourceTerm),
        //             geneId: getIdFromTerm(queryParams.targetTerm),
        //             dataSource: 'GTEx; SusieR',
        //             tissueKey: 'pancreatic',
        //             geneSymbol: queryParams.targetTermSymbol
        //         }));

        //         await Promise.resolve();
        //         const response = await dispatch(queryViewSchema(queryParams));
                
        //         if (response.payload && response.payload.cyper_for_result_page_all_nodes_specific) {
        //             const query = response.payload.cyper_for_result_page_all_nodes_specific
        //                 .replace(/@snp_node@/g, getIdFromTerm(queryParams.sourceTerm))
        //                 .replace(/@gene_node@/g, getIdFromTerm(queryParams.targetTerm));
                    
        //             const updatedState = store.getState();
        //             console.log('Variables after update:', updatedState.variables);
                    
        //             const processedCurrentQuestion = replaceVariables(
        //                 response.payload.question_for_result, 
        //                 updatedState.variables
        //             );

        //             console.log(response.payload.question_for_result);

        //             const variables = {
        //                 snpId: isUsingFallback ? 'rs17510162' : getIdFromTerm(searchState.sourceTerm),
        //                 leadSnp: isUsingFallback ? 'rs17510162' : getIdFromTerm(searchState.sourceTerm),
        //                 geneId: isUsingFallback ? 'ENSG00000134242' : getIdFromTerm(searchState.targetTerm),
        //                 dataSource: 'GTEx; SusieR',
        //                 tissueKey: 'pancreatic',
        //                 geneSymbol: isUsingFallback ? 'ptpn22' : searchState.targetTermSymbol
        //             };  

        //             const processedNextQuestions = response.payload.next_questions.map(q => 
        //                 replaceVariables(q.question, variables)
        //             );

        //             const processedAiQuestions = response.payload?.ai_question_for_result?.map(question => {
        //                 let processedQuestion = question;
        //                 if (queryParams.sourceTerm.split(':')[1]) {
        //                     processedQuestion = processedQuestion.replace(
        //                         /@snp_node@/g, 
        //                         queryParams.sourceTerm.split(':')[1]
        //                     );
        //                 }
        //                 if (queryParams.targetTerm.split(':')[1]) {
        //                     processedQuestion = processedQuestion.replace(
        //                         /@gene_node@/g, 
        //                         queryParams.targetTerm.split(':')[1]
        //                     );
        //                 }
        //                 return processedQuestion;
        //             }) || [];

        //             const processedAiAnswerTitle = response.payload?.ai_answer_title
        //                 .replace(/@snp_node@/g, queryParams.sourceTerm.split(':')[1])
        //                 .replace(/@gene_id@/g, queryParams.targetTerm.split(':')[1]);
                    
        //             dispatch(setProcessedQuestion({
        //                 currentQuestion: processedCurrentQuestion,
        //                 nextQuestions: processedNextQuestions,
        //                 aiQuestions: processedAiQuestions,
        //                 aiAnswerTitle: processedAiAnswerTitle,
        //                 aiAnswerSubtitle: response.payload?.ai_answer_sub_title,
        //                 currentQuestionType: currentQuestionType
        //             }));
                    
        //             dispatch(queryQueryResult({ query }));
        //             dispatch(queryQueryVisResult({ query }));
        //         }
        //     };

        //     processNextQuestion();
        // }
        let nextVariables;
        if (searchState.sourceTerm == 'rs17510162') {
            nextVariables = {
                snpId: '9:95214406_TC_T',
                leadSnp: '9:95214406_TC_T',
                geneId: 'ENSG00000188312',
                dataSource: 'GTEx; SusieR',
                tissueKey: 'pancreatic',
                geneSymbol: 'CENPP'
            };
        } else {
            nextVariables = {
                snpId: 'rs17510162',
                leadSnp: 'rs17510162',
                geneId: 'ENSG00000134242',
                dataSource: 'GTEx; SusieR',
                tissueKey: 'pancreatic',
                geneSymbol: 'ptpn22'
            };
        }
        const params = new URLSearchParams({
            snpId: nextVariables.snpId,
            leadSnp: nextVariables.leadSnp,
            geneId: nextVariables.geneId,
            relationship: searchState.relationship,
            tissueKey: nextVariables.tissueKey,
            dataSource: nextVariables.dataSource,
            geneSymbol: nextVariables.geneSymbol
        });
        window.location.href = `/result?${params.toString()}`;
    };

    const handleExpandClick = () => {
        setExpanded(!expanded);
    };

    // 如果正在加载答案或答案为空，显示加载状态
    if (queryAiAnswerStatus === 'pending' || !aiAnswer?.answers) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container disableGutters maxWidth={false}>
            {/*left*/}
            <Box sx={{
                // display: 'flex',
                alignItems: 'center',
                gap: 0,
                position: 'absolute',
                top: '130px',
                right: windowWidth * 0.5 + 44,
                width: 685,
                minHeight: '950px'
            }}>
                <Typography sx={{ fontSize: 22, width: 685, textAlign: 'left', marginBottom: '10px' }}>
                    Question
                </Typography>
                <Box sx={{ width: 685, padding: '20px', backgroundColor: '#E4F0F1'}}>
                    {currentQuestionType && (
                        <Typography sx={{ fontSize: 14, width: 685, textAlign: 'left' }}>
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
                </Box>
            </Box>
            <SearchBar 
                source={searchState.sourceTerm}
                target={searchState.targetTermSymbol}
                disabled={true}
                resultPageShown={true}
            />
            {/*graph viewer, right*/}
            <Box sx={{
                width: 672,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                position: 'absolute',
                top: 330,
                left: windowWidth * 0.5 + 44
            }}>
                <Typography sx={{
                    fontWeight: 'bold',
                    fontSize: 22,
                    position: 'absolute',
                    top: -44,
                    left: 0,
                    zIndex: 1
                }}>
                    Graph viewer
                </Typography>
                <Box sx={{
                    position: 'relative',
                    minHeight: '472px',
                    overflow: 'visible',
                    backgroundColor: '#FBFBFB',
                    border: 1,
                    borderColor: '#EEEEEE',
                    textAlign: 'left'
                }}>
                    <KnowledgeGraph />
                </Box>
                <Legend />
            </Box>

            {/*AI's overview, left*/}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: '0px',
                margin: '0px',
                width: 685,
                position: 'absolute',
                right: windowWidth * 0.5 + 44,
                top: 390
            }}>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '32px',
                    width: 685,
                    backgroundColor: '#FBFBFB',
                    border: 1,
                    borderColor: '#EEEEEE',
                    padding: '20px',
                    position: 'relative',
                }}>
                    <Typography sx={{
                        fontWeight: 'bold',
                        fontSize: 22,
                        position: 'absolute',
                        top: -44,
                        left: 0,
                        zIndex: 1
                    }}>
                        AI' overview
                    </Typography>
                    <Typography component="div">
                        {Array.isArray(aiAnswer?.answers) && aiAnswer.answers.map((answer, index) => (
                            <div key={index} style={{ marginBottom: index < aiAnswer.answers.length - 1 ? '20px' : '0' }}>
                                {aiAnswerSubtitle && aiAnswerSubtitle[index] && (
                                    <Typography sx={{
                                        textAlign: 'left',
                                        gap: 1,
                                        fontSize: '20px'
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
                                    <span dangerouslySetInnerHTML={{ __html: removeConsecutiveAsterisks(answer) }} />
                                </Typography>
                                {/*{index < aiAnswer.answers.length - 1 && <Divider sx={{ my: 2 }} />}*/}
                            </div>
                        ))}
                    </Typography>
                    <Box>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <Typography sx={{ fontWeight: 500, fontSize: 20, textAlign: 'left' }}>
                                <span>📎</span> Resources
                            </Typography>
                            <ExpandMore
                                expand={expanded}
                                onClick={handleExpandClick}
                                aria-expanded={expanded}
                                aria-label="show more"
                            >
                                <ExpandMoreIcon />
                            </ExpandMore>
                        </Box>
                        <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <List sx={{ padding: '0px' }}>
                                <ListItem sx={{ paddingY: '0px' }}>
                                    <Link
                                        href="https://pankbase.org"
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
                                        • PanKbase resources
                                    </Link>
                                </ListItem>
                                <ListItem sx={{ paddingY: '0px' }}>
                                    <Link
                                        href={`https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=${searchState.targetTerm.split(':')[1]}`}
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
                                        • Link to Ensembl: {searchState.targetTerm.split(':')[1]}
                                    </Link>
                                </ListItem>
                            </List>
                        </Collapse>
                    </Box>
                </Box>
                {/*you may also ask*/}
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '32px',
                    width: 672,
                    backgroundColor: '#FBFBFB',
                    border: 1,
                    borderColor: '#EEEEEE',
                    padding: '20px',
                    position: 'relative'
                }}>
                    <Typography sx={{
                        fontWeight: 'bold',
                        fontSize: 22,
                        position: 'absolute',
                        top: -44,
                        left: 0,
                        zIndex: 1
                    }}>
                        You may also ask
                    </Typography>
                    <ul className="next-questions-list">
                        {nextQuestions?.length > 0 ? (
                            nextQuestions.map((question, index) => (
                                <li key={index}
                                    onClick={() => handleNextQuestionClick(question)}
                                    style={{ cursor: 'pointer' }}>
                                    <Box sx={{
                                        display: 'flex',
                                    }}>
                                        <Typography sx={{
                                            fontSize: 14,
                                            fontFamily: 'Open Sans'
                                        }} dangerouslySetInnerHTML={{ __html: question }} />
                                        <span style={{ alignContent: 'center' }}><ChevronRightIcon /></span>
                                    </Box>
                                </li>
                            ))
                        ) : (
                            <Typography sx={{ fontSize: 16 }}>No next questions available</Typography>
                        )}
                    </ul>
                </Box>
            </Box>
            <ImageModal
                open={modalOpen}
                handleClose={handleCloseModal}
                loading={imageLoading}
            >
                <SNPPlotImage imageSrc={snpPlotImage} />
            </ImageModal>
        </Container>
    );
}

export default SearchResult;
