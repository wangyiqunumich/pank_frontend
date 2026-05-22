export const DEBUG_STREAM_LOADING_ENTRIES = [
    {
        short_title: 'understanding_question',
        title: 'Understanding Question',
        steps: ['Parsing intent, entities, and biological context...'],
    },
    {
        short_title: 'selecting_evidence_sources',
        title: 'Selecting Evidence Sources',
        steps: ['Choosing relevant PanKgraph data and tools...'],
    },
    {
        short_title: 'retrieving_graph_evidence',
        title: 'Retrieving Graph Evidence',
        steps: ['Querying structured KG evidence...'],
    },
    {
        short_title: 'checking_literature_evidence',
        title: 'Checking Literature Evidence',
        steps: ['Searching supporting publications...'],
    },
];

const STREAM_STEP_WEIGHT_PERCENT = (3 / 13) * 100;
const STREAM_PRE_COMPLETE_CAP_PERCENT = STREAM_STEP_WEIGHT_PERCENT * DEBUG_STREAM_LOADING_ENTRIES.length;

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);

export const getInitialStreamMilestones = () => ({
    planningDone: false,
    hirnDone: false,
    cypherGenerated: false,
    cypherExecuted: false,
});

export const buildDebugStreamLoadingProgress = (milestones, options = {}) => {
    const entryStates = DEBUG_STREAM_LOADING_ENTRIES.map(() => ({ step: -1, isFinished: false }));

    if (!milestones.planningDone) {
        entryStates[0] = { step: 0, isFinished: false };
    } else {
        entryStates[0] = { step: 1, isFinished: true };
        if (!milestones.hirnDone) {
            entryStates[1] = { step: 0, isFinished: false };
        } else {
            entryStates[1] = { step: 1, isFinished: true };
            if (!milestones.cypherGenerated) {
                entryStates[2] = { step: 0, isFinished: false };
            } else {
                entryStates[2] = { step: 1, isFinished: true };
                if (!milestones.cypherExecuted) {
                    entryStates[3] = { step: 0, isFinished: false };
                } else {
                    entryStates[3] = { step: 1, isFinished: true };
                }
            }
        }
    }

    const completedCount = [
        milestones.planningDone,
        milestones.hirnDone,
        milestones.cypherGenerated,
        milestones.cypherExecuted,
    ].filter(Boolean).length;

    let shortTitle = DEBUG_STREAM_LOADING_ENTRIES[0].short_title;
    if (milestones.planningDone && !milestones.hirnDone) {
        shortTitle = DEBUG_STREAM_LOADING_ENTRIES[1].short_title;
    } else if (milestones.hirnDone && !milestones.cypherGenerated) {
        shortTitle = DEBUG_STREAM_LOADING_ENTRIES[2].short_title;
    } else if (milestones.cypherGenerated && !milestones.cypherExecuted) {
        shortTitle = DEBUG_STREAM_LOADING_ENTRIES[3].short_title;
    }

    const baseProgress = completedCount * STREAM_STEP_WEIGHT_PERCENT;
    const minimumProgress = Number(options?.minimumProgress || 0);

    return {
        title: 'Answering your question...',
        tip: 'Streaming progress is based on backend events.',
        cancel: 'Cancel and ask a new question',
        entries: DEBUG_STREAM_LOADING_ENTRIES,
        entryStates,
        shortTitle,
        progress: Math.min(STREAM_PRE_COMPLETE_CAP_PERCENT, Math.max(baseProgress, minimumProgress)),
        useFakeTimer: Boolean(options?.useFakeTimer),
        responseReady: Boolean(options?.responseReady),
        timerKey: Number(options?.timerKey || 0),
    };
};

export const computeFirstStepMinimumProgress = (elapsedMs, options = {}) => {
    const durationMs = Math.max(1, Number(options?.durationMs || 5200));
    const firstStepWeight = Math.max(0.01, Number(options?.firstStepWeight || (100 / 6)));
    const ratio = clamp01((Number(elapsedMs) || 0) / durationMs);
    return easeOutCubic(ratio) * firstStepWeight;
};
