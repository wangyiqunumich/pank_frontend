import './scoped.css';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  Box,
  Button,
  LinearProgress,
  Typography,
} from '@mui/material';

import loadingImage from '../image/loading.svg';
import texts from './loading_text.json';
import { easeOutCubic } from './streamLoadingProgress';

const STREAM_STEP_WEIGHT_PERCENT = (3 / 13) * 100;
const STREAM_PRE_COMPLETE_CAP_PERCENT = STREAM_STEP_WEIGHT_PERCENT * 4;

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
    const visibleText = isFinished
        ? (steps[steps.length - 1] || currText || '')
        : (currText || stepText || steps[0] || '');

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
                                {visibleText}
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

export default function SearchResultLoading({ open, handleClose, streamProgress, onFakeTimerComplete }) {
    const resolvedEntries = streamProgress?.entries || texts.entries;
    const resolvedTitle = streamProgress?.title || texts.title;
    const resolvedTip = streamProgress?.tip || texts.tip;
    const resolvedCancel = streamProgress?.cancel || texts.cancel;
    const fakeTimerMode = Boolean(streamProgress?.useFakeTimer);
    const keepLastStepInProgress = Boolean(streamProgress?.keepLastStepInProgress);
    const responseReady = Boolean(streamProgress?.responseReady);
    const fakeTimerKey = Number(streamProgress?.timerKey || 0);
    const isControlled = Boolean(streamProgress);

    const [entryStates, setEntryStates] = useState(
        resolvedEntries.map((entry, index) => ({
            step: index === 0 ? 0 : -1,
            isFinished: false,
        }))
    );
    const timeForEach = [2000, 5000, 5000, 5000, 1000];
    const entryStatesRef = useRef(entryStates);
    const [progress, setProgress] = useState(0);
    const [shortTitle, setShortTitle] = useState(resolvedEntries[0]?.short_title || '');

    const displayedEntryStates = isControlled ? (streamProgress?.entryStates || []) : entryStates;
    const displayedProgress = isControlled ? (streamProgress?.progress || 0) : progress;
    const displayedShortTitle = isControlled ? (streamProgress?.shortTitle || resolvedEntries[0]?.short_title || '') : shortTitle;

    const [fakeEntryStates, setFakeEntryStates] = useState(
        resolvedEntries.map((entry, index) => ({
            step: index === 0 ? 0 : -1,
            isFinished: false,
        }))
    );
    const [fakeProgress, setFakeProgress] = useState(0);
    const [fakeShortTitle, setFakeShortTitle] = useState(resolvedEntries[0]?.short_title || '');
    const fakeEntryStatesRef = useRef(fakeEntryStates);
    const fakeLastRenderedProgressRef = useRef(0);
    const fakeTimerRef = useRef(null);
    const fakeAnimationRef = useRef(null);
    const fakeStepAnimationRef = useRef({
        startedAt: 0,
        durationMs: 1,
        baseProgress: 0,
        targetProgress: 0,
    });
    const fakeDoneNotifiedRef = useRef(false);
    const fakeFinalizeTriggeredRef = useRef(false);
    const responseReadyRef = useRef(responseReady);
    const onFakeTimerCompleteRef = useRef(onFakeTimerComplete);

    useEffect(() => {
        fakeEntryStatesRef.current = fakeEntryStates;
    }, [fakeEntryStates]);

    useEffect(() => {
        responseReadyRef.current = responseReady;
    }, [responseReady]);

    useEffect(() => {
        onFakeTimerCompleteRef.current = onFakeTimerComplete;
    }, [onFakeTimerComplete]);

    const getFakeDelayMs = React.useCallback((stepIndex = 0) => {
        const currentStep = Math.max(0, Number(stepIndex) || 0);
        // Keep legacy random range for the first two steps.
        const useLegacySlowRange = currentStep <= 1;
        const isReady = Boolean(responseReadyRef.current);
        const baseSeconds = useLegacySlowRange ? 7 : (isReady ? 2 : 7);
        const jitterSeconds = useLegacySlowRange ? 2 : (isReady ? 1 : 2);
        const offset = (Math.random() * 2 - 1) * jitterSeconds;
        const nextSeconds = Math.max(0.2, baseSeconds + offset);
        return Math.round(nextSeconds * 1000);
    }, []);

    const getCompletedEntryCount = React.useCallback((states) => {
        return states.reduce((acc, state) => (state?.isFinished ? acc + 1 : acc), 0);
    }, []);

    const notifyFakeDone = React.useCallback(() => {
        if (!responseReadyRef.current || fakeDoneNotifiedRef.current) {
            return;
        }
        fakeDoneNotifiedRef.current = true;
        if (typeof onFakeTimerCompleteRef.current === 'function') {
            onFakeTimerCompleteRef.current();
        }
    }, []);

    const stopFakeSchedulers = React.useCallback(() => {
        if (fakeTimerRef.current) {
            clearTimeout(fakeTimerRef.current);
            fakeTimerRef.current = null;
        }
        if (fakeAnimationRef.current) {
            clearInterval(fakeAnimationRef.current);
            fakeAnimationRef.current = null;
        }
    }, []);

    const startStepAnimation = React.useCallback((baseProgress, targetProgress, durationMs) => {
        const safeDurationMs = Math.max(1, Number(durationMs) || 1);
        const safeBase = Math.max(0, Math.min(100, Number(baseProgress) || 0));
        const safeTarget = Math.max(safeBase, Math.min(100, Number(targetProgress) || safeBase));

        fakeStepAnimationRef.current = {
            startedAt: Date.now(),
            durationMs: safeDurationMs,
            baseProgress: safeBase,
            targetProgress: safeTarget,
        };

        fakeLastRenderedProgressRef.current = safeBase;
        setFakeProgress(safeBase);

        if (fakeAnimationRef.current) {
            clearInterval(fakeAnimationRef.current);
        }

        fakeAnimationRef.current = setInterval(() => {
            const animation = fakeStepAnimationRef.current;
            const elapsedMs = Math.max(0, Date.now() - animation.startedAt);
            const ratio = Math.min(1, elapsedMs / animation.durationMs);
            const easedRatio = easeOutCubic(ratio);
            // Keep a decelerating feel, but blend in linear motion so progress never visually stalls.
            const blendedRatio = Math.min(1, (easedRatio * 0.72) + (ratio * 0.28));
            const rawProgress = animation.baseProgress + ((animation.targetProgress - animation.baseProgress) * blendedRatio);
            const minVisibleDelta = 0.06;
            const floorProgress = Math.min(animation.targetProgress, fakeLastRenderedProgressRef.current + minVisibleDelta);
            const nextProgress = Math.max(rawProgress, floorProgress);
            fakeLastRenderedProgressRef.current = nextProgress;
            setFakeProgress(nextProgress);
        }, 90);
    }, []);

    const beginNextFakeStep = React.useCallback((fromStates, overrideDelayMs) => {
        const stepToProceed = fromStates.findIndex((es) => !es.isFinished);
        if (stepToProceed === -1) {
            if (!responseReadyRef.current) {
                stopFakeSchedulers();
                setFakeProgress(STREAM_PRE_COMPLETE_CAP_PERCENT);
                fakeLastRenderedProgressRef.current = STREAM_PRE_COMPLETE_CAP_PERCENT;
                return;
            }

            if (!fakeFinalizeTriggeredRef.current) {
                fakeFinalizeTriggeredRef.current = true;
                startStepAnimation(STREAM_PRE_COMPLETE_CAP_PERCENT, 100, 650);
                fakeTimerRef.current = setTimeout(() => {
                    setFakeProgress(100);
                    notifyFakeDone();
                    stopFakeSchedulers();
                }, 680);
            }
            return;
        }

        const completedEntries = getCompletedEntryCount(fromStates);
        const baseProgress = Math.min(STREAM_PRE_COMPLETE_CAP_PERCENT, completedEntries * STREAM_STEP_WEIGHT_PERCENT);
        const targetProgress = Math.min(STREAM_PRE_COMPLETE_CAP_PERCENT, (completedEntries + 1) * STREAM_STEP_WEIGHT_PERCENT);
        const delayMs = Math.max(200, Number(overrideDelayMs) || getFakeDelayMs(stepToProceed));

        startStepAnimation(baseProgress, targetProgress, delayMs);

        fakeTimerRef.current = setTimeout(() => {
            const prevStates = fakeEntryStatesRef.current;
            const activeIndex = prevStates.findIndex((es) => !es.isFinished);
            if (activeIndex === -1) {
                beginNextFakeStep(prevStates, 650);
                return;
            }

            const nextStatesSnapshot = [...prevStates];
            const current = { ...nextStatesSnapshot[activeIndex] };
            current.step += 1;
            const isLastEntry = activeIndex === (resolvedEntries.length - 1);
            if (keepLastStepInProgress && isLastEntry) {
                current.step = Math.min(current.step, resolvedEntries[activeIndex].steps.length - 1);
                current.isFinished = false;
            } else {
                current.isFinished = current.step >= resolvedEntries[activeIndex].steps.length;
            }
            nextStatesSnapshot[activeIndex] = current;

            if (current.isFinished && activeIndex + 1 < nextStatesSnapshot.length) {
                nextStatesSnapshot[activeIndex + 1] = {
                    step: 0,
                    isFinished: false,
                };
                setFakeShortTitle(resolvedEntries[activeIndex + 1].short_title);
            }

            fakeEntryStatesRef.current = nextStatesSnapshot;
            setFakeEntryStates(nextStatesSnapshot);

            const completedAfterStep = getCompletedEntryCount(nextStatesSnapshot);
            const exactProgress = Math.min(STREAM_PRE_COMPLETE_CAP_PERCENT, completedAfterStep * STREAM_STEP_WEIGHT_PERCENT);
            setFakeProgress(exactProgress);
            fakeLastRenderedProgressRef.current = exactProgress;

            if (keepLastStepInProgress && isLastEntry) {
                setFakeProgress(STREAM_PRE_COMPLETE_CAP_PERCENT);
                fakeLastRenderedProgressRef.current = STREAM_PRE_COMPLETE_CAP_PERCENT;
                stopFakeSchedulers();
                if (responseReadyRef.current) {
                    notifyFakeDone();
                }
                return;
            }

            beginNextFakeStep(nextStatesSnapshot);
        }, delayMs);
    }, [getCompletedEntryCount, getFakeDelayMs, keepLastStepInProgress, notifyFakeDone, resolvedEntries, startStepAnimation, stopFakeSchedulers]);

    useEffect(() => {
        if (!fakeTimerMode) {
            stopFakeSchedulers();
            return;
        }

        stopFakeSchedulers();

        const initialStates = resolvedEntries.map((entry, index) => ({
            step: index === 0 ? 0 : -1,
            isFinished: false,
        }));
        fakeEntryStatesRef.current = initialStates;

        setFakeEntryStates(initialStates);
        setFakeProgress(0);
        setFakeShortTitle(resolvedEntries[0]?.short_title || '');
        fakeDoneNotifiedRef.current = false;
        fakeFinalizeTriggeredRef.current = false;
        beginNextFakeStep(initialStates);

        return () => {
            stopFakeSchedulers();
        };
    }, [fakeTimerMode, fakeTimerKey, resolvedEntries, beginNextFakeStep, stopFakeSchedulers]);

    useEffect(() => {
        if (!fakeTimerMode || !responseReady) {
            return;
        }

        if (keepLastStepInProgress) {
            const lastIndex = Math.max(0, resolvedEntries.length - 1);
            const completedBeforeLast = fakeEntryStatesRef.current
                .slice(0, lastIndex)
                .every((state) => state?.isFinished);
            const lastState = fakeEntryStatesRef.current[lastIndex];
            const lastStepActive = Boolean(lastState && !lastState.isFinished && lastState.step >= 0);

            if (completedBeforeLast && lastStepActive) {
                notifyFakeDone();
                stopFakeSchedulers();
            }
            return;
        }

        const allFinished = fakeEntryStatesRef.current.every((state) => state?.isFinished);
        if (!allFinished || fakeFinalizeTriggeredRef.current) {
            return;
        }

        beginNextFakeStep(fakeEntryStatesRef.current, 650);
    }, [fakeTimerMode, responseReady, beginNextFakeStep, keepLastStepInProgress, notifyFakeDone, resolvedEntries, stopFakeSchedulers]);

    const effectiveEntryStates = fakeTimerMode ? fakeEntryStates : displayedEntryStates;
    const effectiveProgress = fakeTimerMode ? fakeProgress : displayedProgress;
    const effectiveShortTitle = fakeTimerMode ? fakeShortTitle : displayedShortTitle;
    const statusLabel = String(effectiveShortTitle || '').replace(/_/g, ' ');

    useEffect(() => {
        entryStatesRef.current = entryStates;
    }, [entryStates]);

    useEffect(() => {
        if (isControlled) {
            return;
        }
        setEntryStates(
            resolvedEntries.map((entry, index) => ({
                step: index === 0 ? 0 : -1,
                isFinished: false,
            }))
        );
        setProgress(0);
        setShortTitle(resolvedEntries[0]?.short_title || '');
    }, [isControlled, resolvedEntries]);

    const timeoutRef = useRef(null);
    useEffect(() => {
        if (isControlled) {
            return;
        }
        // simulate progress through steps
        // 2s per step, from first to last entry
        const timeoutHandler = () => {
            let stepToProceed = entryStatesRef.current.findIndex(es => !es.isFinished);
            if (stepToProceed === -1) {
                // all finished
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                return;
            }
            setEntryStates(prevStates => {
                let newStates = [...prevStates];
                let entryState = { ...newStates[stepToProceed] };
                entryState.step++;
                entryState.isFinished = entryState.step >= resolvedEntries[stepToProceed].steps.length;
                newStates[stepToProceed] = entryState;
                if (entryState.isFinished) {
                    // start the next entry
                    if (stepToProceed + 1 < newStates.length) {
                        newStates[stepToProceed + 1] = {
                            step: 0,
                            isFinished: false,
                        };
                        setShortTitle(resolvedEntries[stepToProceed + 1].short_title);
                    }
                    stepToProceed++;
                }
                setProgress(prog => (prog + 100 / resolvedEntries.map(({ steps }) => steps.length).reduce((a, b) => a + b, 0)));
                return newStates;
            });
            timeoutRef.current = setTimeout(timeoutHandler, timeForEach[stepToProceed] * (Math.random() * 0.5 + 0.75));
        };
        timeoutRef.current = setTimeout(timeoutHandler, timeForEach[0] * (Math.random() * 0.5 + 0.75));
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        }
    }, [isControlled, resolvedEntries]);
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
            <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: '24px', color: '#263824' }}>{resolvedTitle}</Typography>
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
                Agent Status:&nbsp;<span style={{ color: '#078AA3', fontWeight: 600, textDecoration: 'none' }}>{statusLabel}</span>
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
            {resolvedEntries.map((entry, entryIndex) => (
                <LoadingEntry
                    key={entryIndex}
                    entry={entry}
                    step={effectiveEntryStates?.[entryIndex]?.step ?? -1}
                    totalSteps={entry.steps.length} />
            ))}
        </Box>
        <LinearProgress variant="determinate" sx={{
            width: '100%',
            height: '8px',
            borderRadius: '999px',
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: '#F2FAFB',
            WebkitMaskImage: '-webkit-radial-gradient(white, black)',
            ".MuiLinearProgress-bar": {
                backgroundColor: '#078AA3',
                borderRadius: 'inherit',
                transformOrigin: 'left center',
                willChange: 'transform',
            }
        }} value={effectiveProgress} />
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 400, fontSize: '14px', color: '#9E9E9E' }}>
                {resolvedTip}
            </Typography>
            <Button sx={{ backgroundColor: 'white', textTransform: 'none', borderRadius: '16.5px' }} onClick={handleClose}>
                <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: '14px', color: '#078AA3', px: '4px' }}>
                    {resolvedCancel}
                </Typography>
            </Button>
        </Box>
    </Box>;
}