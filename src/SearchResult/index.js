import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Box, List, ListItem, Link, CircularProgress, Divider } from '@mui/material';
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
import { setVariables } from '../redux/variablesSlice';
import { replaceVariables } from '../utils/textProcessing';
import { store } from '../redux/store';

const colorMap = {
    gene: "#ABD0F1",
    sequence_variant: "#FFB77F",
    pathway: "#F6C957",
    ontology : "#8c561b",
    article:"#e377c2",
    open_chromatin_region: "#8c564b",
  };

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
  <div className="styled-paper" data-title="Legend">
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}>
      {/* 第一行 */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#ABD0F1', borderRadius: '4px' }} />
          <Typography variant="body2">Gene</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#FFB77F', borderRadius: '4px' }} />
          <Typography variant="body2">Sequence Variant</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#F6C957', borderRadius: '4px' }} />
          <Typography variant="body2">Pathway</Typography>
        </Box>
      </Box>
      {/* 第二行 */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#8c561b', borderRadius: '4px' }} />
          <Typography variant="body2">Ontology</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#e377c2', borderRadius: '4px' }} />
          <Typography variant="body2">Article</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#8c564b', borderRadius: '4px' }} />
          <Typography variant="body2">Open Chromatin Region</Typography>
        </Box>
      </Box>
    </Box>
  </div>
);

function SearchResult() {
    const { currentQuestion, nextQuestions, aiQuestions } = useSelector((state) => state.processedQuestion);
    const queryResult = useSelector((state) => state.queryResult.queryResult);
    const { aiAnswer, queryAiAnswerStatus } = useSelector((state) => state.aiAnswer);
    const searchState = useSelector((state) => state.search);
    const [showTable, setShowTable] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const dispatch = useDispatch();
    const snpPlotImage = useSelector((state) => state.typeToImage.typeToImage);
    const queryTypeToImageStatus = useSelector((state) => state.typeToImage.queryTypeToImageStatus);
    useEffect(() => {
        if (queryResult.results.length != 0) {
            console.log(aiQuestions);
            dispatch(queryAiAnswer({
                "question": aiQuestions, 
                "graph": queryResult
            })).unwrap();
        }
    }, [queryResult, currentQuestion, dispatch]);
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

    useEffect(() => {
        if (queryTypeToImageStatus === 'fulfilled') {
            setImageLoading(false);
        }
    }, [queryTypeToImageStatus]);

    const handleNextQuestionClick = (question) => {
        if (searchState.sourceTerm && searchState.relationship && searchState.targetTerm) {
            dispatch(setNextQuestionClicked(true));
            dispatch(queryViewSchema({
                sourceTerm: searchState.sourceTerm,
                relationship: searchState.relationship,
                targetTerm: searchState.targetTerm
            })).then((response) => {
                if (response.payload && response.payload.cyper_for_result_page_all_nodes_specific) {
                    const query = response.payload.cyper_for_result_page_all_nodes_specific
                        .replace(/@sourceTerm@/g, searchState.sourceTerm.split(':')[1])
                        .replace(/@targetTerm@/g, searchState.targetTerm.split(':')[1]);
                    
                    const currentState = store.getState();
                    const processedCurrentQuestion = replaceVariables(response.payload.question_for_result, currentState.variables);
                    console.log(response.payload.next_questions);
                    const processedNextQuestions = response.payload.next_questions.map(q => 
                        replaceVariables(q.question, currentState.variables)
                    );
                    
                    dispatch(setProcessedQuestion({
                        currentQuestion: processedCurrentQuestion,
                        nextQuestions: processedNextQuestions
                    }));
                    
                    dispatch(queryQueryResult({ query }));
                }
            });
        }
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
        <Container maxWidth={false} sx={{ maxWidth: '98vw' }} className="search-result-container">
            <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 3,
                mt: 2,
                position: 'absolute',
                top: '120px',
                width: '98%',
                pl: 2
            }}>
                <Box sx={{ width: '60%', visibility: 'hidden' }} />
                <Typography 
                    variant="body1" 
                    sx={{ 
                        flex: 1, 
                        textAlign: 'left',
                        pr: 10,
                        wordWrap: 'break-word',
                        whiteSpace: 'normal',
                        lineHeight: 1.5
                    }}
                    dangerouslySetInnerHTML={{ __html: currentQuestion || 'No question available' }}
                />
            </Box>

            <div className="search-result-content" style={{ marginTop: '60px' }}>
                <div className="right-column">
                    <div className="styled-paper knowledge-graph" data-title="KG viewer">
                        <div className="knowledge-graph-container">
                            <KnowledgeGraph />
                        </div>
                    </div>
                    <Legend />
                </div>

                <div className="left-column">
                    <div className="styled-paper" data-title="Answer">
                        <div className="answer-content">
                            <Typography component="div">
                                {Array.isArray(aiAnswer?.answers) && aiAnswer.answers.map((answer, index) => (
                                    <div key={index} style={{ marginBottom: index < aiAnswer.answers.length - 1 ? '20px' : '0' }}>
                                        <span dangerouslySetInnerHTML={{ __html: answer }} />
                                        {index < aiAnswer.answers.length - 1 && <Divider sx={{ my: 2 }} />}
                                    </div>
                                ))}
                            </Typography>
                        </div>
                    </div>

                    <div className="styled-paper" data-title="You May Also Ask">
                        <ul className="next-questions-list">
                            {nextQuestions.length > 0 ? (
                                nextQuestions.map((question, index) => (
                                    <li key={index} 
                                        onClick={() => handleNextQuestionClick(question)}
                                        style={{ cursor: 'pointer' }}>
                                        <Typography dangerouslySetInnerHTML={{ __html: question }} />
                                    </li>
                                ))
                            ) : (
                                <Typography>No next questions available</Typography>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
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
