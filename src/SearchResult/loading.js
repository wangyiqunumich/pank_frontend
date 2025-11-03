import './scoped.css';

import React, {
    useEffect,
    useRef,
    useState,
} from 'react';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
    Backdrop,
    Box,
    Typography,
} from '@mui/material';

import loadingImage from '../image/loading.svg';

const texts = {
    "title": "Answering your question...",
    "entries": [
        {
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
            "title": "Analyzing biological evidence",
            "steps": [
                "Analyzing pathways and knowledge graph connections...",
                "Retrieving evidence from literature and datasets...",
                "Synthesizing evidence from multiple sources...",
                "Processing contextual biological relationships..."
            ]
        },
        {
            "title": "Preparing your answer",
            "steps": [
                "Summarizing results and drafting your answer...",
                "Formulating evidence-based explanation...",
                "Formatting data for visualization and interpretation...",
                "Finalizing structured response..."
            ]
        },
        {
            "title": "Follow-up",
            "steps": [
                "Graph viewer preparing your answer knowledge graph.",
                "Agent is ready for your next question."
            ]
        }
    ]
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

    const titleColor = isIdle || isFinished ? 'text.secondary' : 'text.primary';
    const textColor = isIdle || isFinished ? 'text.secondary' : 'text.primary';

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            {/* ICON */}
            <Box sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isIdle && (
                    <Box
                        sx={{
                            width: 20,
                            height: 20,
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

                {isFinished && <CheckCircleIcon sx={{ color: 'success.main', fontSize: 24 }} />}
            </Box>

            {/* TEXT */}
            <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: titleColor }}>
                    {entry.title}
                </Typography>

                {!isIdle && (
                    <Box sx={{ position: 'relative', minHeight: 24, display: 'inline-block', flex: 1 }} ref={containerRef}>
                        <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} >
                            <Typography
                                variant="body1"
                                sx={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    transform: `translateY(${yPos}px)`,
                                    opacity,
                                    transition: transition ? 'transform 0.2s, opacity 0.2s' : 'none',
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
                    }
                }
                newStates[stepToProceed] = entryState;
                return newStates;
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);
    return <Backdrop
        sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
        open={open}
        onClick={() => { }}
    >
        <Box sx={{
            width: '768px',
            height: '543px',
            margin: '32px',
            gap: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white',
            color: 'black'
        }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px' }}>
                <Typography variant="h6" sx={{ color: 'black' }}>{texts.title}</Typography>
                <div style={{ color: 'black' }}>
                    Agent Status:<span style={{ color: 'green' }}>Follow-up</span>
                </div>
            </Box>
            {texts.entries.map((entry, entryIndex) => (
                <LoadingEntry
                    key={entryIndex}
                    entry={entry}
                    step={entryStates[entryIndex].step}
                    totalSteps={entry.steps.length} />
            ))}
        </Box>
    </Backdrop>;
}