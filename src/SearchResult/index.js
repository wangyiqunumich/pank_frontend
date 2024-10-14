import React, { useState, useEffect } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useSelector } from 'react-redux';
import './scoped.css';

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
    const { viewSchema } = useSelector((state) => state.viewSchema);
    const [showTable, setShowTable] = useState(false);

    const answerText = `Currently <span style="color: #FFA500;">SNP rs73920612</span> is the eQTL of one gene: <span style="color: #FF69B4;">CENPO</span>

✨ Gene overview:
• <span style="color: #FF69B4;">CENPO</span> (Centromere Protein O) is a protein coding gene involved in key processes such as bipolar spindle assembly, chromosome segregation, and checkpoint signaling during mitosis. It is critical for maintaining chromosomal stability during cell division (<a href="https://pubmed.ncbi.nlm.nih.gov/36187159/" target="_blank" style="color: #8A2BE2;">PMID:36187159</a>).

✨ Specific relation to Type 1 Diabetes:
• While <span style="color: #FF69B4;">CENPO</span>'s direct association with Type 1 Diabetes is not explicitly documented, its role in immune system modulation could suggest potential indirect links. However, specific research connecting <span style="color: #FFA500;">SNP rs73920512</span> in the <span style="color: #FF69B4;">CENPO</span> gene to Type 1 Diabetes is required for a definitive association (<a href="https://pubmed.ncbi.nlm.nih.gov/37061713/" target="_blank" style="color: #8A2BE2;">PMID:37061713</a>).

This answer refers to the following resources in PanKbase:`;

    const handleTypewriterComplete = () => {
        setShowTable(true);
    };

    return (
        <Container maxWidth="xl" className="search-result-container">
            <div className="search-result-content">
                <div className="left-column">
                    <div className="styled-paper" data-title="Question">
                        <Typography variant="h6">
                            {viewSchema.template_question?.question || 'No question available'}
                        </Typography>
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
                                                <TableCell>Gene name</TableCell>
                                                <TableCell>Analytical lib</TableCell>
                                                <TableCell>Dataset</TableCell>
                                                <TableCell>Donor</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>
                                                    <span style={{ color: '#FF69B4' }}>CENPO</span>
                                                </TableCell>
                                                <TableCell>
                                                    <a href="#" style={{ color: '#FF0000' }}>External link</a>
                                                </TableCell>
                                                <TableCell>
                                                    <a href="#" style={{ color: '#008000' }}>Dataset ref link</a>
                                                </TableCell>
                                                <TableCell>
                                                    <a href="#" style={{ color: '#4682B4' }}>Donors</a>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </div>
                    </div>

                    <div className="styled-paper" data-title="Next Questions">
                        <ul className="next-questions-list">
                            {viewSchema.next_questions?.map((question, index) => (
                                <li key={index}>
                                    <Typography>{question}</Typography>
                                </li>
                            )) || <Typography>No next questions available</Typography>}
                        </ul>
                    </div>
                </div>

                <div className="right-column">
                    <div className="styled-paper knowledge-graph" data-title="Knowledge Graph">
                        <Typography>Knowledge graph will be displayed here</Typography>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default SearchResult;
