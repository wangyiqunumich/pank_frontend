import React, { useState, useEffect } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useSelector } from 'react-redux';
import './scoped.css';
import KnowledgeGraph from '../components/KnowledgeGraph';
import exactData from '../exact.json';
import extendData from '../extend.json';
import ImageModal from '../components/ImageModal';
import sampleVisImage from '../image/sample_vis.jpg';

const colorMap = {
    gene: '#43978F',
    sequence_variant: '#E56F5E',
    eQTL_of: '#FBE8D5',
    default: '#DCE9F4'
};

function TypewriterEffect({ text, speed = 10, onComplete }) {
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

function SearchResult() {
    const { question, nextQuestions } = useSelector((state) => state.processedQuestion);
    const {queryResult} = useSelector((state) => state.queryResult);
    const [showTable, setShowTable] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    const answerText = `Currently <span style="color: #FFA500;">SNP rs73920612</span> is the eQTL of one gene: <span style="color: #FF69B4;">CENPO</span>

✨ Gene overview:
• <span style="color: #FF69B4;">CENPO</span> (Centromere Protein O) is a protein coding gene involved in key processes such as bipolar spindle assembly, chromosome segregation, and checkpoint signaling during mitosis. It is critical for maintaining chromosomal stability during cell division (<a href="https://pubmed.ncbi.nlm.nih.gov/36187159/" target="_blank" style="color: #8A2BE2;">PMID:36187159</a>).

✨ Specific relation to Type 1 Diabetes:
• While <span style="color: #FF69B4;">CENPO</span>'s direct association with Type 1 Diabetes is not explicitly documented, its role in immune system modulation could suggest potential indirect links. However, specific research connecting <span style="color: #FFA500;">SNP rs73920512</span> in the <span style="color: #FF69B4;">CENPO</span> gene to Type 1 Diabetes is required for a definitive association (<a href="https://pubmed.ncbi.nlm.nih.gov/37061713/" target="_blank" style="color: #8A2BE2;">PMID:37061713</a>).

This answer refers to the following resources in PanKbase:`;

    const handleTypewriterComplete = () => {
        setShowTable(true);
    };

    const handleOpenModal = () => setModalOpen(true);
    const handleCloseModal = () => setModalOpen(false);

    return (
        <Container maxWidth="xl" className="search-result-container">
            <div className="search-result-content">
                <div className="left-column">
                    <div className="styled-paper" data-title="Question">
                        <Typography variant="h6" dangerouslySetInnerHTML={{ __html: question || 'No question available' }} />
                    </div>

                    <div className="styled-paper" data-title="Answer">
                        <div className="answer-content">
                            <Typography component="div">
                                <TypewriterEffect 
                                    text={answerText} 
                                    onComplete={handleTypewriterComplete}
                                />
                            </Typography>
                            {showTable && (
                                <TableContainer component={Paper} className="answer-table">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>eQTL</TableCell>
                                                <TableCell>Analytical pipeline</TableCell>
                                                <TableCell>Dataset</TableCell>
                                                <TableCell>Donors</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>
                                                    <span 
                                                        style={{ color: '#0000FF', cursor: 'pointer', textDecoration: 'underline' }} 
                                                        onClick={handleOpenModal}
                                                    >
                                                        SNP p-values Plot (Manhattan plot)
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <a href="#" style={{ color: '#0000FF' }}>Link to PanKbase Analytical Pipeline</a>
                                                </TableCell>
                                                <TableCell>
                                                    <a href="#" style={{ color: '#0000FF' }}>Link to PanKbase Data Catalog</a>
                                                </TableCell>
                                                <TableCell>(50) HPAP 024, HPAP 027, ..</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </div>
                    </div>

                    <div className="styled-paper" data-title="Next Questions">
                        <ul className="next-questions-list">
                            {nextQuestions.map((question, index) => (
                                <li key={index}>
                                    <Typography dangerouslySetInnerHTML={{ __html: question }} />
                                </li>
                            )) || <Typography>No next questions available</Typography>}
                        </ul>
                    </div>
                </div>

                <div className="right-column">
                    <div className="styled-paper knowledge-graph" data-title="Knowledge Graph">
                        <div className="knowledge-graph-container">
                            <KnowledgeGraph exactData={{}} extendData={{}} />
                        </div>
                    </div>
                </div>
            </div>
            <ImageModal
                open={modalOpen}
                handleClose={handleCloseModal}
                imageSrc={sampleVisImage}
            />
        </Container>
    );
}

export default SearchResult;
