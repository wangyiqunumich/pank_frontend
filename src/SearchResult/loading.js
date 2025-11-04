import './scoped.css';

import React, {
    useEffect,
    useRef,
    useState,
} from 'react';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
    Button,
    LinearProgress,
    Box,
    Typography,
} from '@mui/material';

import loadingImage from '../image/loading.svg';

const texts = {
    "title": "Answering your question...",
    "entries": [
        {
            "short_title": "acknowledged",
            "title": "Interpreting your question",
            "steps": [
                "Agent is interpreting your question...",
                "Understanding research intent...",
                "Breaking down your query into logical steps...",
                "Identifying relevant biological entities and relationships...",
                "Choosing the best tools and data sources..."
            ]
        },
        {
            "short_title": "processing",
            "title": "Analyzing biological evidence",
            "steps": [
                "Analyzing pathways and knowledge graph connections...",
                "Retrieving evidence from literature and datasets...",
                "Synthesizing evidence from multiple sources...",
                "Processing contextual biological relationships..."
            ]
        },
        {
            "short_title": "typing",
            "title": "Preparing your answer",
            "steps": [
                "Summarizing results and drafting your answer...",
                "Formulating evidence-based explanation...",
                "Formatting data for visualization and interpretation...",
                "Finalizing structured response..."
            ]
        },
        {
            "short_title": "follow-up",
            "title": "Generating related questions",
            "steps": [
                "Graph viewer preparing your answer knowledge graph.",
                "Agent is ready for your next question."
            ]
        }
    ],
    "tip": "This may take up to 20 seconds for complex biological questions.",
    "cancel": "Cancel and ask a new question"
};

function LoadingEntry({ step, entry }) {
    const containerRef = useRef(null);
    const steps = entry?.steps || [];
    const currentIndex = step;

    const lastStepRef = useRef(currentIndex);
    const didMountRef = useRef(false);

    const [prevStepIndex, setPrevStepIndex] = useState(null);
    const [yPos, setYPos] = useState(0);
    const [opacity, setOpacity] = useState(1);
    const [transition, setTransition] = useState(true);
    const [currText, setCurrText] = useState(steps[currentIndex] || '');

    useEffect(() => {
        // Skip animation on initial mount only
        if (!didMountRef.current) {
            didMountRef.current = true;
            lastStepRef.current = currentIndex;
            return;
        }

        if (currentIndex === lastStepRef.current || currentIndex === steps.length) return;

        setPrevStepIndex(lastStepRef.current);

        setOpacity(0);
        setYPos(-20);

        const t1 = setTimeout(() => {
            setCurrText(steps[currentIndex] || '');
            setTransition(false);
            setYPos(20);
        }, 200);

        const t2 = setTimeout(() => {
            setOpacity(1);
            setYPos(0);
            setTransition(true);
        }, 250);

        lastStepRef.current = currentIndex;

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [currentIndex]);

    // Determine current visual state
    const isIdle = step < 0;
    const isFinished = step >= steps.length;
    const isInProgress = !isIdle && !isFinished;

    const prevText = prevStepIndex != null ? steps[prevStepIndex] : null;
    const stepText = isFinished ? steps[steps.length - 1] : steps[currentIndex] ?? '';

    const titleColor = isIdle || isFinished ? '#9E9E9E' : '#263824';
    const textColor = isIdle || isFinished ? '#B0B0B0' : '#656565';

    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, width: '100%' }}>
            {/* ICON */}
            <Box sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isIdle && (
                    <Box
                        sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: '2px solid',
                            borderColor: 'grey.400',
                        }}
                    />
                )}

                {isInProgress && loadingImage && (
                    <Box
                        component="img"
                        src={loadingImage}
                        alt="loading"
                        sx={{
                            width: 24,
                            height: 24,
                            animation: 'spin 1.2s linear infinite',
                            '@keyframes spin': {
                                from: { transform: 'rotate(0deg)' },
                                to: { transform: 'rotate(360deg)' },
                            },
                        }}
                    />
                )}

                {isFinished && <span className="popup-icon">
                    <CheckCircleIcon sx={{ color: '#078AA3', fontSize: 24 }} />
                </span>}
            </Box>

            {/* TEXT */}
            <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <Typography sx={{ fontWeight: '700', fontSize: '18px', fontFamily: 'Open Sans', color: titleColor }}>
                    {entry.title}
                </Typography>
                {/* {isIdle && <Box sx={{ position: 'relative', minHeight: 24, display: 'inline-block'}}/>} */}

                {!isIdle && (
                    <Box sx={{ position: 'relative', minHeight: 24, display: 'inline-block', flex: 1 }} ref={containerRef}>
                        <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} >
                            <Typography
                                sx={{
                                    fontWeight: '300', fontSize: '15px', fontFamily: 'Open Sans', 
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    transform: `translateY(${yPos}px)`,
                                    opacity,
                                    transition: transition ? 'transform 0.2s, opacity 0.2s' : 'none',
                                    color: textColor
                                }}
                            >
                                {currText}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

export default function SearchResultLoading({ open, handleClose }) {
    const [entryStates, setEntryStates] = useState(
        texts.entries.map((entry, index) => ({
            step: index === 0 ? 0 : -1,
            isFinished: false,
        }))
    );
    const entryStatesRef = useRef(entryStates);
    const [progress, setProgress] = useState(0);
    const [shortTitle, setShortTitle] = useState(texts.entries[0].short_title);
    useEffect(() => {
        entryStatesRef.current = entryStates;
    }, [entryStates]);
    useEffect(() => {
        // simulate progress through steps
        // 2s per step, from first to last entry
        let interval = setInterval(() => {
            let stepToProceed = entryStatesRef.current.findIndex(es => !es.isFinished);
            if (stepToProceed === -1) {
                // all finished
                clearInterval(interval);
                return;
            }
            setEntryStates(prevStates => {
                let newStates = [...prevStates];
                let entryState = { ...newStates[stepToProceed] };
                entryState.step++;
                entryState.isFinished = entryState.step >= texts.entries[stepToProceed].steps.length;
                if (entryState.isFinished) {
                    // start the next entry
                    if (stepToProceed + 1 < newStates.length) {
                        newStates[stepToProceed + 1] = {
                            step: 0,
                            isFinished: false,
                        };
                        setShortTitle(texts.entries[stepToProceed + 1].short_title);
                    }
                }
                newStates[stepToProceed] = entryState;
                setProgress(prog => (prog + 100/texts.entries.map(({steps}) => steps.length).reduce((a,b)=>a+b, 0)));
                return newStates;
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);
    return <Box sx={{
            width: '704px',
            padding: '32px',
            borderRadius: '20px',
            gap: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            color: 'black',
            border: '0.63px solid #EEEEEE',
            boxShadow: '0px 4px 6px -4px #0000001A, 0px 10px 15px -3px #0000001A',
            boxSizing: 'content-box',
        }}>
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: '24px', color: '#263824' }}>{texts.title}</Typography>
                <Box sx={{ 
                    color: 'black',
                    border: '0.63px solid #E0F0F3',
                    backgroundColor: '#F2FAFB',
                    px: '16px',
                    height: '38px',
                    borderRadius: '19px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Open Sans',
                    color: '#7F7D7D',
                    fontSize: '14px',
                }}>
                    Agent Status:&nbsp;<span style={{ color: '#078AA3', fontWeight: 600 }}>{shortTitle}</span>
                </Box>
            </Box>
            <Box sx={{
                width: '100%', 
                position: 'relative', 
                gap: '24px',
                display: 'flex',
                alignItems: 'center',
                flexDirection: 'column',
                justifyContent: 'center',
                }}>
            {texts.entries.map((entry, entryIndex) => (
                <LoadingEntry
                    key={entryIndex}
                    entry={entry}
                    step={entryStates[entryIndex].step}
                    totalSteps={entry.steps.length} />
            ))}
            </Box>
            <LinearProgress variant="determinate" sx={{ 
                width: '100%', 
                backgroundColor: '#F2FAFB',
                ".MuiLinearProgress-bar": {
                    backgroundColor: '#078AA3'
                }
            }} value={progress} />
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 400, fontSize: '14px', color: '#9E9E9E' }}>
                    {texts.tip}
                </Typography>
                <Button sx={{backgroundColor: 'white', textTransform: 'none', borderRadius: '16.5px'}}>
                    <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: '14px', color: '#078AA3', px: '4px' }}>
                        {texts.cancel}
                    </Typography>
                </Button>
                
            </Box>
        </Box>;
}