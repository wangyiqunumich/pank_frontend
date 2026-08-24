import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import igv from 'https://cdn.jsdelivr.net/npm/igv@3.0.2/dist/igv.esm.min.js';
import { useLocation } from 'react-router-dom';

import ChatBubbleOutlineRoundedIcon
  from '@mui/icons-material/ChatBubbleOutlineRounded';
import {
  Box,
  Container,
  FormControl,
  MenuItem,
  Select,
  useMediaQuery,
} from '@mui/material';

import AgentSidebar from '../components/AgentSidebar';
import FeedbackPromptDialog from '../components/FeedbackPromptDialog';
import { AlertMessage } from '../components/SupportingMaterial';
import { PLANNER_AGENT_BASE_URL } from '../constants/apiEndpoints';
import starFilledIcon from '../image/star-filled.svg';
import starIcon from '../image/star.svg';
import { readConversationHistory } from '../utils/chatSessionStorage';
import { trackGtagEvent } from '../utils/gtag';
import SearchResult from './result';

const FEEDBACK_AUTO_PROMPT_DISABLED_KEY = 'pank_feedback_auto_prompt_disabled_v1';
const FEEDBACK_AUTO_PROMPT_DELAY_MS = 30 * 1000;
const AGENT_SIDEBAR_EXPANDED_WIDTH = 264;
const AGENT_SIDEBAR_COLLAPSED_WIDTH = 80;

const decodeBase64Utf8 = (value) => {
    if (!value) return '';
    try {
        return decodeURIComponent(escape(atob(value)));
    } catch (e) {
        try {
            return atob(value);
        } catch (e2) {
            return String(value || '');
        }
    }
};

const decodeQuestionFromQueryParam = (rawQuestionParam) => {
    const raw = String(rawQuestionParam || '').trim();
    if (!raw) return '';

    const tryDecode = (input) => {
        try {
            return decodeBase64Utf8(input).trim();
        } catch (e) {
            return '';
        }
    };

    // URLSearchParams already decodes percent-encoding in most cases.
    let decoded = tryDecode(raw);
    if (decoded) return decoded;

    // Fallback for edge cases where upstream passes still-encoded content.
    try {
        decoded = tryDecode(decodeURIComponent(raw));
        if (decoded) return decoded;
    } catch (e) {
        // ignore malformed URI sequences
    }

    return raw;
};

const extractUserQuestion = (item) => {
    return String(item?.content || item?.question || item?.query || '').trim();
};

const normalizeRole = (rawRole) => {
    const role = String(rawRole || '').trim().toLowerCase();
    if (role === 'user' || role === 'human') return 'user';
    if (role === 'assistant' || role === 'ai' || role === 'model') return 'assistant';
    return '';
};

// Genome Browser Component - mounts only when tab is first selected
export function GenomeBrowserEmbed({ locus = "chr7:55,085,725-55,276,031", isVisible = false, tracks = null, height = 600, compact = false }) {
    const containerRef = useRef(null);
    const browserRef = useRef(null);
    const fullScreenContainerRef = useRef(null);
    const fullScreenBrowserRef = useRef(null);
    const fullScreenOptionsRef = useRef(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const [fullScreenOpen, setFullScreenOpen] = useState(false);
    const [fullScreenError, setFullScreenError] = useState("");
    const [fullScreenLoading, setFullScreenLoading] = useState(false);
    const [fullScreenInitialized, setFullScreenInitialized] = useState(false);

    const trackGenomeEvent = (eventName, params = {}) => {
        trackGtagEvent(eventName, {
            source: 'genome_browser',
            ...params,
        });
    };

    const baseOptions = useMemo(() => {
        return {
            genome: "hg38",
            locus: locus,
            showNavigation: true,
            showRuler: true,
            tracks: tracks || [],
        };
    }, [locus, tracks]);

    const inlineOptions = useMemo(() => {
        if (!compact) {
            return baseOptions;
        }
        return {
            ...baseOptions,
            showNavigation: true,
            showChromosomeWidget: false,
            showSVGButton: false,
            showCursorTrackGuide: true,
        };
    }, [baseOptions, compact]);

    useEffect(() => {
        // Only initialize when tab becomes visible for the first time
        if (!isVisible || hasInitialized) return;

        let destroyed = false;
        let timeoutId;

        async function init() {
            setError("");
            setIsLoading(true);

            try {
                if (!containerRef.current) {
                    setError("Container not ready");
                    setIsLoading(false);
                    return;
                }

                containerRef.current.innerHTML = "";

                // Add a small delay to ensure DOM is fully ready
                timeoutId = setTimeout(async () => {
                    if (destroyed || !containerRef.current) return;

                    try {
                        const browser = await igv.createBrowser(containerRef.current, inlineOptions);

                        if (destroyed) {
                            try {
                                browser?.dispose?.();
                            } catch (e) {
                                console.warn("Error disposing browser on cleanup:", e);
                            }
                            return;
                        }

                        browserRef.current = browser;

                        // Hide right navbar container in inline view
                        if (browser.root) {
                            const style = document.createElement('style');
                            style.textContent = `
                                .igv-navbar-right-container {
                                    display: none !important;
                                }
                            `;
                            browser.root.appendChild(style);
                        }

                        setIsLoading(false);
                        setHasInitialized(true);
                    } catch (e) {
                        console.error("IGV initialization error:", e);
                        if (!destroyed) {
                            setError(String(e?.message || "Failed to initialize genome browser"));
                            setIsLoading(false);
                        }
                    }
                }, 100);

            } catch (e) {
                console.error("Setup error:", e);
                if (!destroyed) {
                    setError(String(e?.message || e));
                    setIsLoading(false);
                }
            }
        }

        init();

        return () => {
            destroyed = true;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isVisible, hasInitialized, inlineOptions]);

    useEffect(() => {
        fullScreenOptionsRef.current = baseOptions;
    }, [baseOptions]);

    useEffect(() => {
        if (!fullScreenOpen || fullScreenInitialized) return;

        let destroyed = false;
        let timeoutId;

        async function initFullScreen() {
            setFullScreenError("");
            setFullScreenLoading(true);

            try {
                if (!fullScreenContainerRef.current) {
                    setFullScreenError("Container not ready");
                    setFullScreenLoading(false);
                    return;
                }

                fullScreenContainerRef.current.innerHTML = "";

                timeoutId = setTimeout(async () => {
                    if (destroyed || !fullScreenContainerRef.current) return;

                    try {
                        const browser = await igv.createBrowser(fullScreenContainerRef.current, fullScreenOptionsRef.current || baseOptions);

                        if (destroyed) {
                            try {
                                browser?.dispose?.();
                            } catch (e) {
                                console.warn("Error disposing fullscreen browser on cleanup:", e);
                            }
                            return;
                        }

                        fullScreenBrowserRef.current = browser;
                        setFullScreenLoading(false);
                        setFullScreenInitialized(true);
                    } catch (e) {
                        console.error("IGV fullscreen initialization error:", e);
                        if (!destroyed) {
                            setFullScreenError(String(e?.message || "Failed to initialize fullscreen genome browser"));
                            setFullScreenLoading(false);
                        }
                    }
                }, 100);

            } catch (e) {
                console.error("Fullscreen setup error:", e);
                if (!destroyed) {
                    setFullScreenError(String(e?.message || e));
                    setFullScreenLoading(false);
                }
            }
        }

        initFullScreen();

        return () => {
            destroyed = true;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [fullScreenOpen, fullScreenInitialized]);

    useEffect(() => {
        return () => {
            if (fullScreenBrowserRef.current) {
                try {
                    fullScreenBrowserRef.current.dispose?.();
                } catch (e) {
                    console.warn("Error disposing fullscreen browser:", e);
                }
                fullScreenBrowserRef.current = null;
            }
        };
    }, []);

    const getInlineLocus = () => {
        const browser = browserRef.current;
        if (!browser) return locus;
        const referenceFrame = browser?.referenceFrameList?.[0];
        const refLocus = referenceFrame?.getLocusString?.() || referenceFrame?.locus;
        return browser?.currentLocus || browser?.locus || refLocus || locus;
    };

    const openFullScreen = () => {
        trackGenomeEvent('genome_browser_fullscreen_open_click', { locus: String(locus || '') });
        const nextLocus = getInlineLocus();
        fullScreenOptionsRef.current = {
            ...(fullScreenOptionsRef.current || baseOptions),
            locus: nextLocus,
        };
        setFullScreenOpen(true);
        if (fullScreenBrowserRef.current?.search) {
            try {
                fullScreenBrowserRef.current.search(nextLocus);
            } catch (e) {
                console.warn("Error syncing fullscreen locus:", e);
            }
        }
    };

    const closeFullScreen = () => {
        trackGenomeEvent('genome_browser_fullscreen_close_click', { locus: String(locus || '') });
        setFullScreenOpen(false);
    };

    useEffect(() => {
        if (!fullScreenOpen) return;

        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                closeFullScreen();
            }
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [fullScreenOpen]);

    const rootHeight = compact ? (height || "100%") : height;
    const minHeight = compact ? 0 : 676;

    // Don't render container until tab is visible
    if (!isVisible && !hasInitialized) {
        return <div style={{ width: "100%", height: rootHeight, minHeight }} />;
    }

    return (
        <div
            style={{
                width: "100%",
                height: rootHeight,
                minHeight,
                maxHeight: compact ? "100%" : undefined,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            {isLoading && (
                <div style={{ position: "absolute", top: 12, left: 12, zIndex: 2, color: "#0066cc", fontSize: 12, background: "rgba(255,255,255,0.9)", padding: "4px 8px", borderRadius: 4 }}>
                    Loading genome browser...
                </div>
            )}
            {error && (
                <div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 2, color: "#b00020", fontSize: 12, padding: "8px 12px", background: "#ffebee", borderRadius: 4 }}>
                    ⚠️ {error}
                </div>
            )}
            <div style={{ position: "relative", flex: 1, minHeight: 0, maxHeight: "100%", overflow: "hidden" }}>
                <div
                    ref={containerRef}
                    style={{
                        width: "100%",
                        height: "100%",
                        minHeight,
                        maxHeight: "100%",
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#fafafa",
                        position: "relative"
                    }}
                />
                <button
                    type="button"
                    onClick={openFullScreen}
                    style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #d4d4d4",
                        background: "#ffffff",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#334155",
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                    }}
                >
                    Fullscreen
                </button>
            </div>
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "#ffffff",
                    zIndex: 2000,
                    display: fullScreenOpen ? "flex" : "none",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        height: 54,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 16px",
                        borderBottom: "1px solid #e2e8f0",
                    }}
                >
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Genome Browser</div>
                    <button
                        type="button"
                        onClick={closeFullScreen}
                        style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #d4d4d4",
                            background: "#ffffff",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#334155",
                            cursor: "pointer",
                        }}
                    >
                        Exit Fullscreen
                    </button>
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                    {fullScreenLoading && (
                        <div style={{ margin: 12, color: "#0066cc", fontSize: 12 }}>
                            Loading genome browser...
                        </div>
                    )}
                    {fullScreenError && (
                        <div style={{ margin: 12, color: "#b00020", fontSize: 12, padding: "8px 12px", background: "#ffebee", borderRadius: 4 }}>
                            ⚠️ {fullScreenError}
                        </div>
                    )}
                    <div
                        ref={fullScreenContainerRef}
                        style={{
                            width: "100%",
                            height: "100%",
                            background: "#fafafa",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export function AgentResultLayout({
    ResultView = SearchResult,
    getResultViewProps = (result, index) => ({ demoIndex: index + 1, result }),
    allowSearch = false,
    showFloatingSearchBar = false,
}) {
    const location = useLocation();
    const isResultNewRoute = location.pathname === '/result-new';
    const effectiveAllowMulti = false;
    const [results, setResults] = useState([
        {
            id: 1,
            query: "How Does The SNP Rs2402203 Influence The Expression Of CFTR In Pancreas Tissue?",
        }
    ]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeResultIndex, setActiveResultIndex] = useState(0);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [hoveredResultIndex, setHoveredResultIndex] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [contentMetaByIndex, setContentMetaByIndex] = useState({});
    const [feedbackQuestions, setFeedbackQuestions] = useState([
        {
            id: 1,
            query: "How Does The SNP Rs2402203 Influence The Expression Of CFTR In Pancreas Tissue?",
        }
    ]);
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [feedbackQuestionIndex, setFeedbackQuestionIndex] = useState(0);
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackEmail, setFeedbackEmail] = useState('');
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
    const [feedbackError, setFeedbackError] = useState('');
    const [feedbackSuccessOpen, setFeedbackSuccessOpen] = useState(false);
    const [feedbackPromptOpen, setFeedbackPromptOpen] = useState(false);
    const [feedbackAutoPromptDisabled, setFeedbackAutoPromptDisabled] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(FEEDBACK_AUTO_PROMPT_DISABLED_KEY) === '1';
    });
    const [showScrollToPlanConfirmButton, setShowScrollToPlanConfirmButton] = useState(false);
    const [isAgentSidebarOpen, setIsAgentSidebarOpen] = useState(() => {
        if (typeof window === 'undefined') return true;
        const stored = window.localStorage.getItem('pank-sidebar-open');
        return stored === null ? true : stored === 'true';
    });
    const menuTimersRef = useRef({ open: null, close: null });
    const feedbackPromptTimerRef = useRef(null);
    const previousQuestionCompleteRef = useRef(false);
    const contentTopRef = useRef(null);
    const resultsContainerRef = useRef(null);
    const resultsRef = useRef([]);
    const feedbackQuestionsRef = useRef([]);
    const scrollRafRef = useRef(null);
    const routeScrollResetRef = useRef({ frameIds: [], timeoutIds: [] });
    const scrollLockRef = useRef({ active: false, until: 0, index: null });
    const activeMeta = contentMetaByIndex[activeResultIndex];
    const routeQuestionKey = useMemo(() => {
        const params = new URLSearchParams(location.search || '');
        const decodedQuestion = decodeQuestionFromQueryParam(params.get('question'));
        return `${location.pathname}::${decodedQuestion}`;
    }, [location.pathname, location.search]);
    const urlSessionId = useMemo(() => {
        const urlSessionId = new URLSearchParams(location.search).get('session_id') || '';
        return urlSessionId;
    }, [location.search]);
    const normalizedFeedbackQuestionIndex = Math.min(
        Math.max(Number.isFinite(feedbackQuestionIndex) ? feedbackQuestionIndex : 0, 0),
        Math.max(feedbackQuestions.length - 1, 0)
    );
    const selectedFeedbackQuestion = feedbackQuestions[normalizedFeedbackQuestionIndex] || feedbackQuestions[0] || null;
    const feedbackSessionId = activeMeta?.feedbackSessionId || urlSessionId || '';
    const activeQuestionComplete = activeMeta?.isQuestionComplete ?? false;
    const hideFloatingSearchBarByPhase = Boolean(activeMeta?.hideFloatingSearchBar);
    const hasFloatingInputBar = Boolean(showFloatingSearchBar && !hideFloatingSearchBarByPhase);
    const canSearch = allowSearch
        && (effectiveAllowMulti || showFloatingSearchBar)
        && !Boolean(activeMeta?.isPlanning)
        && (effectiveAllowMulti || activeQuestionComplete);
    const isSingleColumn = useMediaQuery("(max-width:1199.95px)");
    const isDesktopSidebarVisible = useMediaQuery("(min-width:1000px)");
    const navigatorMenuVisible = isSingleColumn || menuOpen;

    useEffect(() => {
        const handleSidebarToggle = (event) => {
            setIsAgentSidebarOpen(Boolean(event?.detail?.open));
        };

        window.addEventListener('pank-sidebar-toggle', handleSidebarToggle);
        return () => window.removeEventListener('pank-sidebar-toggle', handleSidebarToggle);
    }, []);

    const trackAgentEvent = (eventName, params = {}) => {
        trackGtagEvent(eventName, {
            source: 'agent_result_layout',
            ...params,
        });
    };

    const getAnchorPrefix = (index) => `result-${index + 1}`;
    const primaryAnchorPrefix = contentMetaByIndex[0]?.anchorPrefix || getAnchorPrefix(0);
    const navQuestions = feedbackQuestions.length ? feedbackQuestions : results;
    const scrollToPlanConfirmButton = useCallback(() => {
        if (typeof document === 'undefined') return;
        const activeAnchorPrefix = activeMeta?.anchorPrefix || primaryAnchorPrefix;
        const targetId = activeMeta?.planProceedAnchorId || `${activeAnchorPrefix}-plan-proceed-button`;
        const target = document.getElementById(targetId);
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [activeMeta?.anchorPrefix, activeMeta?.planProceedAnchorId, primaryAnchorPrefix]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            setShowScrollToPlanConfirmButton(false);
            return undefined;
        }

        if (!activeMeta?.isPlanning) {
            setShowScrollToPlanConfirmButton(false);
            return undefined;
        }

        const activeAnchorPrefix = activeMeta?.anchorPrefix || primaryAnchorPrefix;
        const targetId = activeMeta?.planProceedAnchorId || `${activeAnchorPrefix}-plan-proceed-button`;
        let rafId = null;
        let observer = null;

        const updateVisibility = () => {
            const target = document.getElementById(targetId);
            if (!target) {
                setShowScrollToPlanConfirmButton(false);
                return;
            }

            const rect = target.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const isInViewport = rect.bottom > 0 && rect.top < viewportHeight;
            const isBelowViewport = rect.top >= viewportHeight;
            setShowScrollToPlanConfirmButton(!isInViewport && isBelowViewport);
        };

        const onScrollOrResize = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = null;
                updateVisibility();
            });
        };

        updateVisibility();
        const target = document.getElementById(targetId);
        if (target && 'IntersectionObserver' in window) {
            observer = new IntersectionObserver(onScrollOrResize, { threshold: 0 });
            observer.observe(target);
        }

        const rootScroll = document.getElementById('root');
        const docScroll = document.scrollingElement || document.documentElement;
        window.addEventListener('scroll', onScrollOrResize, { passive: true });
        window.addEventListener('resize', onScrollOrResize);
        document.addEventListener('scroll', onScrollOrResize, { passive: true });
        rootScroll?.addEventListener('scroll', onScrollOrResize, { passive: true });
        docScroll?.addEventListener?.('scroll', onScrollOrResize, { passive: true });

        return () => {
            observer?.disconnect();
            window.removeEventListener('scroll', onScrollOrResize);
            window.removeEventListener('resize', onScrollOrResize);
            document.removeEventListener('scroll', onScrollOrResize);
            rootScroll?.removeEventListener('scroll', onScrollOrResize);
            docScroll?.removeEventListener?.('scroll', onScrollOrResize);
            if (rafId) {
                window.cancelAnimationFrame(rafId);
            }
        };
    }, [activeMeta?.anchorPrefix, activeMeta?.isPlanning, activeMeta?.planProceedAnchorId, primaryAnchorPrefix]);

    const detectCurrentQuestionIndexFromViewport = useCallback((questionCount, anchorPrefixOverride) => {
        const normalizedCount = Math.max(Number(questionCount) || 0, 0);
        if (normalizedCount <= 1 || typeof document === 'undefined') return 0;

        const activeAnchorPrefix = anchorPrefixOverride
            || primaryAnchorPrefix;
        const anchorY = 180;
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (let i = 0; i < normalizedCount; i += 1) {
            const target = document.getElementById(`${activeAnchorPrefix}-question-${i + 1}`);
            if (!target) continue;
            const rect = target.getBoundingClientRect();
            const inView = rect.top <= anchorY && rect.bottom >= anchorY;
            const distance = Math.abs(rect.top - anchorY);
            if (inView) {
                return i;
            }
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = i;
            }
        }

        return bestIndex;
    }, [primaryAnchorPrefix]);

    const buildFeedbackQuestionsFromContext = useCallback(() => {
        const params = new URLSearchParams(location.search || '');
        const nextSessionId = String(params.get('session_id') || '').trim();
        const urlQuestion = decodeQuestionFromQueryParam(params.get('question'));

        let nextQuestions = [];
        if (nextSessionId) {
            const history = readConversationHistory(nextSessionId);
            if (Array.isArray(history) && history.length) {
                nextQuestions = history
                    .filter((item) => normalizeRole(item?.role) === 'user')
                    .map((item) => extractUserQuestion(item))
                    .filter(Boolean);
            }
        }

        if (!nextQuestions.length && urlQuestion) {
            nextQuestions = [urlQuestion];
        }

        if (!nextQuestions.length) {
            nextQuestions = ["How Does The SNP Rs2402203 Influence The Expression Of CFTR In Pancreas Tissue?"];
        }

        const dedupedQuestions = [];
        const seen = new Set();
        nextQuestions.forEach((question) => {
            const normalized = String(question || '').trim();
            if (!normalized || seen.has(normalized)) return;
            seen.add(normalized);
            dedupedQuestions.push(normalized);
        });

        return dedupedQuestions.map((query, index) => ({ id: index + 1, query }));
    }, [location.search]);

    const refreshFeedbackQuestions = useCallback(({ closePanel = false, resetMeta = false } = {}) => {
        const rebuiltResults = buildFeedbackQuestionsFromContext();
        const previousLength = feedbackQuestionsRef.current.length;
        const hasNewQuestion = rebuiltResults.length > previousLength;
        const nextViewportIndex = detectCurrentQuestionIndexFromViewport(rebuiltResults.length);

        setFeedbackQuestions(rebuiltResults);
        if (resetMeta) {
            setContentMetaByIndex({});
            setActiveResultIndex(0);
            setActiveQuestionIndex(0);
        }

        if (closePanel) {
            setFeedbackQuestionIndex(0);
            setFeedbackOpen(false);
            setFeedbackError('');
            return;
        }

        if (feedbackOpen) {
            if (hasNewQuestion) {
                setFeedbackQuestionIndex(Math.max(rebuiltResults.length - 1, 0));
            } else {
                setFeedbackQuestionIndex(nextViewportIndex);
            }
        }

        setActiveQuestionIndex(hasNewQuestion ? Math.max(rebuiltResults.length - 1, 0) : nextViewportIndex);
    }, [buildFeedbackQuestionsFromContext, detectCurrentQuestionIndexFromViewport, feedbackOpen]);

    useEffect(() => {
        resultsRef.current = results;
    }, [results]);

    useEffect(() => {
        feedbackQuestionsRef.current = feedbackQuestions;
    }, [feedbackQuestions]);

    const handleContentMeta = (index) => (meta) => {
        if (!meta) return;
        setContentMetaByIndex((prev) => ({
            ...prev,
            [index]: {
                ...meta,
                anchorPrefix: meta.anchorPrefix || getAnchorPrefix(index),
            },
        }));
    };

    const scrollToAnchor = (anchorId, index, section = '') => {
        const target = document.getElementById(anchorId);
        if (!target) return;
        trackAgentEvent('agent_result_section_jump_click', {
            result_index: index + 1,
            section: section || anchorId,
        });
        setActiveQuestionIndex(index);
        target.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    useEffect(() => {
        if (navQuestions.length < 2) {
            return;
        }

        const anchorIds = Array.from(
            { length: navQuestions.length },
            (_, index) => `${primaryAnchorPrefix}-question-${index + 1}`
        );

        const commitActiveQuestionIndex = (nextIndex) => {
            setActiveQuestionIndex((prev) => (prev === nextIndex ? prev : nextIndex));
        };

        const updateActiveFromScroll = () => {
            const now = Date.now();
            if (scrollLockRef.current.active && now < scrollLockRef.current.until) {
                return;
            }
            const anchor = 180;
            let nextIndex = 0;
            let bestDistance = Number.POSITIVE_INFINITY;

            for (let index = 0; index < anchorIds.length; index += 1) {
                const item = document.getElementById(anchorIds[index]);
                if (!item) continue;
                const rect = item.getBoundingClientRect();
                const inView = rect.top <= anchor && rect.bottom >= anchor;
                const distance = Math.abs(rect.top - anchor);
                if (inView) {
                    nextIndex = index;
                    bestDistance = 0;
                    break;
                }
                if (distance < bestDistance) {
                    bestDistance = distance;
                    nextIndex = index;
                }
            }

            commitActiveQuestionIndex(nextIndex);
        };

        let observer = null;

        if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
            observer = new IntersectionObserver((entries) => {
                const now = Date.now();
                if (scrollLockRef.current.active && now < scrollLockRef.current.until) {
                    return;
                }

                const visibleEntries = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((left, right) => {
                        if (right.intersectionRatio !== left.intersectionRatio) {
                            return right.intersectionRatio - left.intersectionRatio;
                        }
                        return Math.abs(left.boundingClientRect.top - 180) - Math.abs(right.boundingClientRect.top - 180);
                    });

                if (!visibleEntries.length) {
                    return;
                }

                const nextIndex = anchorIds.findIndex((anchorId) => anchorId === visibleEntries[0].target.id);
                if (nextIndex >= 0) {
                    commitActiveQuestionIndex(nextIndex);
                }
            }, {
                root: null,
                rootMargin: '-180px 0px -55% 0px',
                threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
            });

            anchorIds.forEach((anchorId) => {
                const target = document.getElementById(anchorId);
                if (target) {
                    observer.observe(target);
                }
            });
        }

        const onScroll = () => {
            if (scrollRafRef.current) return;
            scrollRafRef.current = requestAnimationFrame(() => {
                scrollRafRef.current = null;
                updateActiveFromScroll();
            });
        };

        updateActiveFromScroll();
        const rootScroll = document.getElementById("root");
        const docScroll = document.scrollingElement || document.documentElement;
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        document.addEventListener("scroll", onScroll, { passive: true });
        rootScroll?.addEventListener("scroll", onScroll, { passive: true });
        docScroll?.addEventListener?.("scroll", onScroll, { passive: true });

        return () => {
            observer?.disconnect();
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            document.removeEventListener("scroll", onScroll);
            rootScroll?.removeEventListener("scroll", onScroll);
            docScroll?.removeEventListener?.("scroll", onScroll);
            if (scrollRafRef.current) {
                cancelAnimationFrame(scrollRafRef.current);
                scrollRafRef.current = null;
            }
        };
    }, [navQuestions.length, primaryAnchorPrefix]);

    const handleSearch = () => {
        if (!canSearch) return;
        const trimmed = searchQuery.trim();
        if (!trimmed) return;
        trackAgentEvent('agent_result_search_submit_click', {
            query_length: trimmed.length,
            active_result_index: activeResultIndex + 1,
        });

        // In chat mode the active result exposes a followUpHandler — delegate to it
        // so /chat/message is called on the existing session instead of mounting a new component.
        const followUpHandler = activeMeta?.followUpHandler;
        if (followUpHandler) {
            followUpHandler(trimmed);
            setSearchQuery("");
            return;
        }

        if (!effectiveAllowMulti) {
            return;
        }

        // Non-chat: mount a new result component as before
        const newResult = {
            id: results.length + 1,
            query: trimmed,
        };
        setResults([...results, newResult]);
        setSearchQuery("");
        setActiveResultIndex(results.length);
        setTimeout(() => {
            const resultElement = resultsContainerRef.current?.children[results.length];
            resultElement?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
    };

    const openFeedbackModal = () => {
        trackAgentEvent('agent_result_feedback_open_click');
        const latestQuestions = buildFeedbackQuestionsFromContext();
        const nextQuestionIndex = detectCurrentQuestionIndexFromViewport(latestQuestions.length);
        setFeedbackQuestions(latestQuestions);
        setFeedbackPromptOpen(false);
        setFeedbackQuestionIndex(nextQuestionIndex);
        setActiveQuestionIndex(nextQuestionIndex);
        setFeedbackError('');
        setFeedbackOpen(true);
    };

    const closeFeedbackModal = () => {
        if (feedbackSubmitting) return;
        trackAgentEvent('agent_result_feedback_close_click');
        setFeedbackOpen(false);
        setFeedbackError('');
    };

    const clearFeedbackPromptTimer = () => {
        if (!feedbackPromptTimerRef.current) return;
        clearTimeout(feedbackPromptTimerRef.current);
        feedbackPromptTimerRef.current = null;
    };

    const disableAutoFeedbackPrompt = () => {
        trackAgentEvent('agent_result_feedback_prompt_dismiss_click');
        setFeedbackAutoPromptDisabled(true);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(FEEDBACK_AUTO_PROMPT_DISABLED_KEY, '1');
        }
        clearFeedbackPromptTimer();
    };

    const handleSubmitFeedback = async () => {
        if (feedbackRating < 1 || feedbackRating > 5) {
            setFeedbackError('Please select a star rating.');
            return;
        }

        setFeedbackSubmitting(true);
        setFeedbackError('');
        trackAgentEvent('agent_result_feedback_submit_click', {
            rating: feedbackRating,
            has_feedback_text: Boolean(String(feedbackText || '').trim()),
            has_email: Boolean(String(feedbackEmail || '').trim()),
            question_index: normalizedFeedbackQuestionIndex + 1,
        });

        try {
            const payload = {
                session_id: feedbackSessionId || 'unknown-session',
                rating: feedbackRating,
                feedback: String(feedbackText || ''),
                question_index: normalizedFeedbackQuestionIndex + 1,
                question: String(selectedFeedbackQuestion?.query || ''),
            };
            const trimmedEmail = String(feedbackEmail || '').trim();
            if (trimmedEmail) {
                payload.email = trimmedEmail;
            }

            const response = await fetch(`${PLANNER_AGENT_BASE_URL}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let message = 'Failed to submit feedback.';
                try {
                    const body = await response.json();
                    message = body?.detail || body?.message || body?.error || message;
                } catch (e) {
                    // keep fallback message
                }
                throw new Error(message);
            }

            setFeedbackOpen(false);
            setFeedbackRating(0);
            setFeedbackText('');
            setFeedbackEmail('');
            setFeedbackSuccessOpen(true);
        } catch (error) {
            setFeedbackError(String(error?.message || 'Failed to submit feedback.'));
        } finally {
            setFeedbackSubmitting(false);
        }
    };

    const handleKeyPress = (e) => {
        if (!canSearch) return;
        if (e.key === "Enter") {
            trackAgentEvent('agent_result_search_submit_enter', {
                query_length: String(searchQuery || '').trim().length,
                active_result_index: activeResultIndex + 1,
            });
            handleSearch();
        }
    };

    const scrollToResult = (index) => {
        trackAgentEvent('agent_result_question_jump_click', { result_index: index + 1 });
        setActiveQuestionIndex(index);
        scrollLockRef.current = {
            active: true,
            until: Date.now() + 600,
            index,
        };
        const target = document.getElementById(`${primaryAnchorPrefix}-question-${index + 1}`);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const openMenuWithDelay = () => {
        if (menuTimersRef.current.close) {
            clearTimeout(menuTimersRef.current.close);
            menuTimersRef.current.close = null;
        }
        if (menuOpen) return;
        if (!menuTimersRef.current.open) {
            menuTimersRef.current.open = setTimeout(() => {
                setMenuOpen(true);
                menuTimersRef.current.open = null;
            }, 140);
        }
    };

    const closeMenuWithDelay = () => {
        if (menuTimersRef.current.open) {
            clearTimeout(menuTimersRef.current.open);
            menuTimersRef.current.open = null;
        }
        if (!menuOpen) return;
        if (!menuTimersRef.current.close) {
            menuTimersRef.current.close = setTimeout(() => {
                setMenuOpen(false);
                menuTimersRef.current.close = null;
            }, 260);
        }
    };

    const clearRouteScrollResetJobs = useCallback(() => {
        routeScrollResetRef.current.frameIds.forEach((frameId) => cancelAnimationFrame(frameId));
        routeScrollResetRef.current.timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
        routeScrollResetRef.current.frameIds = [];
        routeScrollResetRef.current.timeoutIds = [];
    }, []);

    const forcePageToTop = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }

        if (typeof document !== 'undefined') {
            const scrollRoot = document.getElementById('root');
            if (document.scrollingElement) {
                document.scrollingElement.scrollTop = 0;
                document.scrollingElement.scrollLeft = 0;
            }
            if (document.documentElement) {
                document.documentElement.scrollTop = 0;
                document.documentElement.scrollLeft = 0;
            }
            if (document.body) {
                document.body.scrollTop = 0;
                document.body.scrollLeft = 0;
            }
            if (scrollRoot) {
                scrollRoot.scrollTop = 0;
                scrollRoot.scrollLeft = 0;
            }
        }

        resultsContainerRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
        contentTopRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, []);

    useEffect(() => {
        const rebuiltResults = buildFeedbackQuestionsFromContext();
        setFeedbackQuestions(rebuiltResults);
    }, [location.pathname, location.search, buildFeedbackQuestionsFromContext]);

    useEffect(() => {
        clearRouteScrollResetJobs();
        forcePageToTop();

        const firstFrameId = requestAnimationFrame(() => {
            forcePageToTop();
            const secondFrameId = requestAnimationFrame(() => {
                forcePageToTop();
            });
            routeScrollResetRef.current.frameIds.push(secondFrameId);
        });
        routeScrollResetRef.current.frameIds.push(firstFrameId);

        [80, 220].forEach((delayMs) => {
            const timeoutId = setTimeout(() => {
                forcePageToTop();
            }, delayMs);
            routeScrollResetRef.current.timeoutIds.push(timeoutId);
        });

        setContentMetaByIndex({});
        setActiveResultIndex(0);
        setActiveQuestionIndex(0);
        setFeedbackQuestionIndex(0);
        setFeedbackOpen(false);
        setFeedbackError('');
        return () => {
            clearRouteScrollResetJobs();
        };
    }, [routeQuestionKey, clearRouteScrollResetJobs, forcePageToTop]);

    useEffect(() => {
        const onHistoryUpdated = (event) => {
            const updatedSessionId = String(event?.detail?.sessionId || '').trim();
            const currentSessionId = String(new URLSearchParams(location.search || '').get('session_id') || '').trim();
            if (!currentSessionId || !updatedSessionId || updatedSessionId !== currentSessionId) {
                return;
            }
            refreshFeedbackQuestions({ closePanel: false, resetMeta: false });
        };

        window.addEventListener('pank-chat-history-updated', onHistoryUpdated);
        return () => {
            window.removeEventListener('pank-chat-history-updated', onHistoryUpdated);
        };
    }, [location.search, refreshFeedbackQuestions]);

    useEffect(() => {
        return () => {
            clearRouteScrollResetJobs();
            if (menuTimersRef.current.open) clearTimeout(menuTimersRef.current.open);
            if (menuTimersRef.current.close) clearTimeout(menuTimersRef.current.close);
            clearFeedbackPromptTimer();
        };
    }, [clearRouteScrollResetJobs]);

    useEffect(() => {
        const becameComplete = activeQuestionComplete && !previousQuestionCompleteRef.current;
        previousQuestionCompleteRef.current = activeQuestionComplete;

        if (feedbackAutoPromptDisabled) {
            clearFeedbackPromptTimer();
            return;
        }

        if (!activeQuestionComplete) {
            clearFeedbackPromptTimer();
            return;
        }

        if (!becameComplete) {
            return;
        }

        clearFeedbackPromptTimer();
        feedbackPromptTimerRef.current = setTimeout(() => {
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
                return;
            }
            if (!feedbackOpen) {
                setFeedbackPromptOpen(true);
            }
        }, FEEDBACK_AUTO_PROMPT_DELAY_MS);

        return () => {
            clearFeedbackPromptTimer();
        };
    }, [activeQuestionComplete, feedbackAutoPromptDisabled, feedbackOpen]);

    const renderedResults = effectiveAllowMulti ? results : results.slice(0, 1);

    return (
        <div
            ref={contentTopRef}
            style={{
                display: "flex",
                width: "100%",
                flex: 1,
                minHeight: "100%",
                alignItems: "stretch",
            }}
        >
            <AgentSidebar activeNav="new-chat" />
            <div
                style={{
                    position: "relative",
                    flex: 1,
                    minWidth: 0,
                    backgroundColor: effectiveAllowMulti && renderedResults.length > 1 ? "#f5f5f5" : "transparent",
                    marginTop: effectiveAllowMulti && renderedResults.length > 1 ? -8 : 0,
                    paddingTop: effectiveAllowMulti && renderedResults.length > 1 ? 8 : 0,
                    paddingBottom: 0,
                }}
            >
            {/* Results display */}
            <div ref={resultsContainerRef}>
                {renderedResults.map((result, index) => {
                    const resultViewProps = getResultViewProps(result, index) || {};
                    const anchorPrefix = resultViewProps.contentAnchorPrefix || getAnchorPrefix(index);
                    const mergedProps = {
                        ...resultViewProps,
                        contentAnchorPrefix: anchorPrefix,
                        onContentMeta: resultViewProps.onContentMeta || handleContentMeta(index),
                    };

                    return (
                        <div
                            key={result.id}
                            style={{
                                padding: effectiveAllowMulti && renderedResults.length > 1 ? "28px 16px" : "0",
                                display: "flex",
                                justifyContent: "center",
                            }}
                        >
                            <div
                                style={{
                                    backgroundColor: effectiveAllowMulti && renderedResults.length > 1 ? "#ffffff" : "transparent",
                                    borderRadius: effectiveAllowMulti && renderedResults.length > 1 ? 16 : 0,
                                    boxShadow: effectiveAllowMulti && renderedResults.length > 1 ? "0 6px 18px rgba(15, 23, 42, 0.08)" : "none",
                                    padding: effectiveAllowMulti && renderedResults.length > 1 ? "16px" : "0",
                                    width: "100%",
                                    maxWidth: effectiveAllowMulti && renderedResults.length > 1 ? 1344 : "100%",
                                }}
                            >
                                <Container maxWidth={false} disableGutters sx={{
                                    display: 'flex',
                                    marginTop: index > 0 ? '12px' : (isResultNewRoute ? '24px' : '0px'),
                                    paddingBottom: '24px',
                                }}>
                                    <ResultView {...mergedProps} />
                                </Container>
                            </div>
                        </div>
                    );
                })}
            </div>

            {navQuestions.length > 1 && (
                <>
                    <div
                        onMouseEnter={isSingleColumn ? undefined : openMenuWithDelay}
                        onMouseLeave={isSingleColumn ? undefined : closeMenuWithDelay}
                        style={{
                            position: "fixed",
                            top: isSingleColumn ? 240 : 290,
                            right: isSingleColumn ? 12 : 24,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            zIndex: 1200,
                            padding: "18px 12px",
                            margin: "-18px -12px",
                        }}
                    >
                        {navQuestions.map((result, index) => {
                            const isActive = activeQuestionIndex === index;
                            const gap = index === navQuestions.length - 1 ? 0 : 14;

                            return (
                                <div
                                    key={`pos-${result.id}`}
                                    style={{
                                        width: 16,
                                        height: 3,
                                        borderRadius: 1.5,
                                        backgroundColor: isActive ? "#0F766E" : "#D9D9D9",
                                        marginBottom: gap,
                                        transition: "background-color 0.2s ease",
                                    }}
                                />
                            );
                        })}
                    </div>

                    <div
                        onMouseEnter={isSingleColumn ? undefined : openMenuWithDelay}
                        onMouseLeave={isSingleColumn ? undefined : closeMenuWithDelay}
                        style={{
                            position: "fixed",
                            top: isSingleColumn ? 180 : 240,
                            right: isSingleColumn ? 44 : 56,
                            backgroundColor: "#fff",
                            border: "1px solid #ddd",
                            borderRadius: 12,
                            padding: "16px",
                            boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                            zIndex: 1200,
                            minWidth: 220,
                            maxWidth: isSingleColumn ? "min(78vw, 265px)" : 265,
                            transform: navigatorMenuVisible ? "translateX(0)" : "translateX(110%)",
                            opacity: navigatorMenuVisible ? 1 : 0,
                            pointerEvents: navigatorMenuVisible ? "auto" : "none",
                            transition: "transform 0.25s ease, opacity 0.2s ease",
                        }}
                    >
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {navQuestions.map((result, index) => {
                                const isActive = activeQuestionIndex === index;
                                const meta = contentMetaByIndex[index];
                                const anchorPrefix = meta?.anchorPrefix || primaryAnchorPrefix;
                                const aiHeadings = meta?.aiHeadings || [];
                                const showVisual = meta?.hasVisual ?? true;
                                const showEvidences = meta?.hasEvidences ?? true;
                                const showFollowUp = meta?.hasFollowUp ?? true;

                                return (
                                    <div key={result.id}>
                                        <button
                                            onMouseEnter={() => setHoveredResultIndex(index)}
                                            onMouseLeave={() => setHoveredResultIndex(null)}
                                            onClick={() => scrollToResult(index)}
                                            style={{
                                                width: "100%",
                                                borderRadius: 8,
                                                border: "1px solid transparent",
                                                backgroundColor: hoveredResultIndex === index ? "rgba(20, 184, 166, 0.2)" : "transparent",
                                                cursor: "pointer",
                                                fontWeight: 600,
                                                color: isActive || hoveredResultIndex === index ? "#3A838B" : "#818181",
                                                fontSize: 14,
                                                fontFamily: "Open Sans, sans-serif",
                                                textAlign: "left",
                                                padding: "6px 10px",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                transition: "background-color 0.2s ease, color 0.2s ease",
                                            }}
                                            title={`Q${index + 1} ${result.query}`}
                                        >
                                            <span style={{ fontSize: 14, fontWeight: 700, marginRight: 6 }}>{`Q${index + 1}`}</span>
                                            <span style={{ fontSize: 14, fontWeight: isActive || hoveredResultIndex === index ? 700 : 600 }}>{result.query}</span>
                                        </button>

                                        {isSingleColumn && isActive ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 18, marginBottom: 6 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => scrollToAnchor(`${anchorPrefix}-ai-overview`, index, 'ai_overview')}
                                                    style={{
                                                        width: "100%",
                                                        borderRadius: 6,
                                                        border: "1px solid transparent",
                                                        background: "transparent",
                                                        color: "#64748B",
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        textAlign: "left",
                                                        padding: "4px 6px",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    AI Overview
                                                </button>
                                                {aiHeadings.map((heading) => (
                                                    <button
                                                        key={`${anchorPrefix}-heading-${heading.index}`}
                                                        type="button"
                                                        onClick={() => scrollToAnchor(`${anchorPrefix}-ai-overview-${heading.index + 1}`, index, `ai_heading_${heading.index + 1}`)}
                                                        style={{
                                                            width: "100%",
                                                            borderRadius: 6,
                                                            border: "1px solid transparent",
                                                            background: "transparent",
                                                            color: "#94A3B8",
                                                            fontSize: 11.5,
                                                            fontWeight: 600,
                                                            textAlign: "left",
                                                            padding: "2px 6px",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        {heading.label}
                                                    </button>
                                                ))}
                                                {showVisual ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => scrollToAnchor(`${anchorPrefix}-visual-material`, index, 'visual_material')}
                                                        style={{
                                                            width: "100%",
                                                            borderRadius: 6,
                                                            border: "1px solid transparent",
                                                            background: "transparent",
                                                            color: "#64748B",
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            textAlign: "left",
                                                            padding: "4px 6px",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Visual Material
                                                    </button>
                                                ) : null}
                                                {showEvidences ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => scrollToAnchor(`${anchorPrefix}-evidences`, index, 'evidences')}
                                                        style={{
                                                            width: "100%",
                                                            borderRadius: 6,
                                                            border: "1px solid transparent",
                                                            background: "transparent",
                                                            color: "#64748B",
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            textAlign: "left",
                                                            padding: "4px 6px",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Evidences
                                                    </button>
                                                ) : null}
                                                {showFollowUp ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => scrollToAnchor(`${anchorPrefix}-follow-up`, index, 'follow_up')}
                                                        style={{
                                                            width: "100%",
                                                            borderRadius: 6,
                                                            border: "1px solid transparent",
                                                            background: "transparent",
                                                            color: "#64748B",
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            textAlign: "left",
                                                            padding: "4px 6px",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Follow Up
                                                    </button>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Floating search bar at bottom */}
            {showFloatingSearchBar && !hideFloatingSearchBarByPhase ? (
                <div
                    style={{
                        position: "sticky",
                        bottom: 0,
                        backgroundColor: "#fff",
                        borderTop: "1px solid #e0e0e0",
                        boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
                        padding: "16px",
                        zIndex: 1300,
                        marginTop: 8,
                        overflow: 'visible',
                    }}
                >
                    <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 12 }}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Enter your search query..."
                            disabled={!canSearch}
                            style={{
                                flex: 1,
                                padding: "12px 16px",
                                borderRadius: 8,
                                border: canSearch ? "1px solid #ddd" : "1px solid #C7DBDE",
                                fontSize: 14,
                                fontFamily: "inherit",
                                outline: "none",
                                transition: "border-color 0.2s ease",
                                backgroundColor: canSearch ? "#fff" : "#F1F7F8",
                                color: canSearch ? "#0F172A" : "#6B7F83",
                                cursor: canSearch ? "text" : "not-allowed",
                            }}
                            onFocus={(e) => {
                                if (canSearch) e.target.style.borderColor = "#3A838B";
                            }}
                            onBlur={(e) => {
                                if (canSearch) e.target.style.borderColor = "#ddd";
                            }}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={!canSearch}
                            style={{
                                padding: "12px 24px",
                                borderRadius: 8,
                                border: "none",
                                backgroundColor: canSearch ? "#3A838B" : "#8EAEB3",
                                color: "#fff",
                                fontWeight: 600,
                                cursor: canSearch ? "pointer" : "not-allowed",
                                fontSize: 14,
                                transition: "background-color 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                if (canSearch) e.target.style.backgroundColor = "#2d6a70";
                            }}
                            onMouseLeave={(e) => {
                                if (canSearch) e.target.style.backgroundColor = "#3A838B";
                            }}
                        >
                            Search
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={openFeedbackModal}
                        style={{
                            position: 'absolute',
                            right: 24,
                            top: -60,
                            zIndex: 1300,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '12px 24px',
                            borderRadius: 10,
                            border: 'none',
                            backgroundColor: 'rgb(58, 131, 139)',
                            color: '#FFFFFF',
                            fontFamily: 'Open Sans, sans-serif',
                            fontWeight: 600,
                            fontSize: 16,
                            cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(77, 129, 138, 0.28)',
                        }}
                    >
                        <ChatBubbleOutlineRoundedIcon sx={{ color: '#FFFFFF', fontSize: 20 }} />
                        Give Feedback
                    </button>
                </div>
            ) : null}

            {!hasFloatingInputBar ? (
                <button
                    type="button"
                    onClick={openFeedbackModal}
                    style={{
                        position: 'fixed',
                        right: 24,
                        bottom: 24,
                        zIndex: 1300,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 24px',
                        borderRadius: 10,
                        border: 'none',
                        backgroundColor: 'rgb(58, 131, 139)',
                        color: '#FFFFFF',
                        fontFamily: 'Open Sans, sans-serif',
                        fontWeight: 600,
                        fontSize: 16,
                        cursor: 'pointer',
                        boxShadow: '0 8px 20px rgba(77, 129, 138, 0.28)',
                    }}
                >
                    <ChatBubbleOutlineRoundedIcon sx={{ color: '#FFFFFF', fontSize: 20 }} />
                    Give Feedback
                </button>
            ) : null}

            {showScrollToPlanConfirmButton ? (
                <Box
                    aria-hidden="false"
                    onClick={scrollToPlanConfirmButton}
                    sx={{
                        position: 'fixed',
                        left: isDesktopSidebarVisible
                            ? (isAgentSidebarOpen ? AGENT_SIDEBAR_EXPANDED_WIDTH : AGENT_SIDEBAR_COLLAPSED_WIDTH)
                            : 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1200,
                        display: 'flex',
                        justifyContent: 'center',
                        pt: 2.5,
                        pb: 2,
                        background: 'linear-gradient(to bottom, rgba(242, 247, 249, 0), rgba(242, 247, 249, 0.75) 42%, rgba(242, 247, 249, 0.9))',
                        backdropFilter: 'blur(3px)',
                        WebkitBackdropFilter: 'blur(3px)',
                        pointerEvents: 'none',
                        transition: 'left 220ms ease',
                        '@keyframes scrollHintGlow': {
                            '0%, 38%, 100%': { opacity: 0.28 },
                            '16%': { opacity: 1 },
                        },
                        '@keyframes scrollHintSweep': {
                            '0%': { backgroundPosition: '140% 0' },
                            '100%': { backgroundPosition: '-40% 0' },
                        },
                    }}
                >
                    <Box
                        component="button"
                        type="button"
                        aria-label="Scroll down and confirm"
                        sx={{
                            border: 0,
                            p: 0,
                            bgcolor: 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.25,
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            fontFamily: 'Open Sans, sans-serif',
                        }}
                    >
                        <svg
                            width="12"
                            height="20"
                            viewBox="0 0 12 20"
                            fill="none"
                            aria-hidden="true"
                            style={{
                                width: '12px',
                                minWidth: '12px',
                                maxWidth: '12px',
                                height: '20px',
                                minHeight: '20px',
                                maxHeight: '20px',
                                display: 'block',
                                flex: '0 0 12px',
                                color: '#219197',
                                overflow: 'visible',
                            }}
                        >
                            <path
                                d="M1 3L6 8L11 3"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ animation: 'scrollHintGlow 2.2s ease-in-out infinite' }}
                            />
                            <path
                                d="M1 11L6 16L11 11"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ animation: 'scrollHintGlow 2.2s ease-in-out 0.35s infinite' }}
                            />
                        </svg>
                        <Box
                            component="span"
                            sx={{
                                fontSize: 12,
                                lineHeight: 1.3,
                                fontWeight: 600,
                                background: 'linear-gradient(90deg, #000 0%, #000 40%, #7BC9C9 50%, #000 60%, #000 100%)',
                                backgroundSize: '220% 100%',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent',
                                animation: 'scrollHintSweep 2.6s ease-in-out infinite',
                            }}
                        >
                            Scroll down and confirm
                        </Box>
                    </Box>
                </Box>
            ) : null}

            <AlertMessage
                type="success"
                content="Feedback recorded. Thank you!"
                open={feedbackSuccessOpen}
                onClose={() => setFeedbackSuccessOpen(false)}
            />

            <FeedbackPromptDialog
                open={feedbackPromptOpen}
                onShareFeedback={() => {
                    trackAgentEvent('agent_result_feedback_prompt_share_click');
                    disableAutoFeedbackPrompt();
                    setFeedbackPromptOpen(false);
                    openFeedbackModal();
                }}
                onMaybeLater={() => {
                    trackAgentEvent('agent_result_feedback_prompt_later_click');
                    disableAutoFeedbackPrompt();
                    setFeedbackPromptOpen(false);
                }}
            />

            {feedbackOpen ? (
                <div
                    style={{
                        position: 'fixed',
                        zIndex: 1400,
                        right: 24,
                        bottom: 85,
                        width: 480,
                        maxWidth: 'calc(100vw - 24px)',
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            backgroundColor: '#FFFFFF',
                            borderRadius: 14,
                            padding: '24px',
                            fontFamily: 'Open Sans, sans-serif',
                            boxShadow: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            position: 'relative',
                        }}
                    >
                        <button
                            type="button"
                            onClick={closeFeedbackModal}
                            aria-label="Close feedback dialog"
                            style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                width: 32,
                                height: 32,
                                border: 'none',
                                borderRadius: 8,
                                background: 'transparent',
                                color: '#111827',
                                fontSize: 20,
                                lineHeight: '20px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            ×
                        </button>

                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 16,
                                borderRadius: 14,
                                backgroundColor: '#008C8C20',
                                marginBottom: 12,
                            }}
                        >
                            <ChatBubbleOutlineRoundedIcon sx={{ color: '#008C8C', fontSize: 48 }} />
                        </div>

                        <div style={{ fontWeight: 700, fontSize: 20, color: '#000000', lineHeight: 1.35 }}>
                            Share your feedback
                        </div>
                        <div style={{ marginTop: 6, fontWeight: 400, fontSize: 15, color: '#6A7282' }}>
                            Your feedback helps us improve PanKgraph. We'd love to know what you think about your experience.
                        </div>

                        <div style={{ height: 30 }} />

                        <div style={{ fontWeight: 400, fontSize: 13, color: '#6A7282', marginBottom: 8 }}>
                            Which question are you giving feedback on?
                        </div>
                        <FormControl
                            fullWidth
                            size="small"
                            sx={{ mb: 2, maxWidth: 420 }}
                        >
                            <Select
                                value={normalizedFeedbackQuestionIndex}
                                onChange={(event) => setFeedbackQuestionIndex(Number(event.target.value))}
                                MenuProps={{
                                    PaperProps: {
                                        sx: {
                                            maxWidth: 420,
                                        },
                                    },
                                }}
                                sx={{
                                    borderRadius: '10px',
                                    backgroundColor: '#FFFFFF',
                                    '& .MuiSelect-select': {
                                        py: 1.1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        overflow: 'hidden',
                                    },
                                }}
                                renderValue={(value) => {
                                    const current = feedbackQuestions[Number(value)] || selectedFeedbackQuestion;
                                    const qIndex = Number(value) + 1;
                                    return (
                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, width: '100%', gap: 1 }}>
                                            <Box sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: '999px',
                                                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                                                color: '#3A838B',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                flexShrink: 0,
                                            }}>
                                                {`Q${qIndex}`}
                                            </Box>
                                            <Box sx={{
                                                color: '#111827',
                                                fontSize: 13,
                                                fontWeight: 600,
                                                flex: 1,
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {current?.query || 'Current question'}
                                            </Box>
                                        </Box>
                                    );
                                }}
                            >
                                {feedbackQuestions.map((item, index) => (
                                    <MenuItem
                                        key={`feedback-question-${item.id || index}`}
                                        value={index}
                                        sx={{ maxWidth: 420 }}
                                    >
                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' }}>
                                            <Box sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: '999px',
                                                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                                                color: '#3A838B',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                flexShrink: 0,
                                            }}>
                                                {`Q${index + 1}`}
                                            </Box>
                                            <Box sx={{
                                                color: '#111827',
                                                fontSize: 13,
                                                flex: 1,
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {item?.query || 'Untitled question'}
                                            </Box>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <div style={{ fontWeight: 400, fontSize: 13, color: '#6A7282', marginBottom: 8 }}>
                            How would you rate your experience?
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {[1, 2, 3, 4, 5].map((starValue) => {
                                const filled = feedbackRating >= starValue;
                                return (
                                    <button
                                        key={starValue}
                                        type="button"
                                        onClick={() => {
                                            trackAgentEvent('agent_result_feedback_rating_click', { rating: starValue });
                                            setFeedbackRating(starValue);
                                        }}
                                        style={{
                                            width: 34,
                                            height: 34,
                                            padding: 0,
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                        }}
                                        aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
                                    >
                                        <img
                                            src={filled ? starFilledIcon : starIcon}
                                            alt={filled ? 'filled star' : 'star'}
                                            style={{ width: 28, height: 28, display: 'block' }}
                                        />
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ height: 16 }} />
                        <div style={{ fontWeight: 400, fontSize: 13, color: '#6A7282', marginBottom: 8 }}>
                            What did you think of this response? (optional)
                        </div>
                        <textarea
                            value={feedbackText}
                            onChange={(event) => setFeedbackText(event.target.value)}
                            placeholder="Share your thoughts..."
                            rows={4}
                            style={{
                                width: '100%',
                                border: '1px solid #D5DBE3',
                                borderRadius: 10,
                                padding: '10px 12px',
                                fontFamily: 'Open Sans, sans-serif',
                                fontSize: 14,
                                color: '#111827',
                                outline: 'none',
                                resize: 'vertical',
                                boxSizing: 'border-box',
                            }}
                        />

                        <div style={{ height: 16 }} />

                        <div style={{ fontWeight: 400, fontSize: 13, color: '#6A7282', marginBottom: 8 }}>
                            Email (optional)
                        </div>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={feedbackEmail}
                            onChange={(event) => setFeedbackEmail(event.target.value)}
                            style={{
                                width: '100%',
                                height: 42,
                                border: '1px solid #D5DBE3',
                                borderRadius: 10,
                                padding: '0 12px',
                                fontFamily: 'Open Sans, sans-serif',
                                fontSize: 14,
                                color: '#111827',
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />

                        {feedbackError ? (
                            <div style={{ marginTop: 10, fontSize: 13, color: '#B42318' }}>
                                {feedbackError}
                            </div>
                        ) : null}

                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button
                                type="button"
                                onClick={closeFeedbackModal}
                                disabled={feedbackSubmitting}
                                style={{
                                    border: 'none',
                                    background: '#FFFFFF',
                                    color: '#000000',
                                    fontFamily: 'Open Sans, sans-serif',
                                    fontWeight: 600,
                                    fontSize: 16,
                                    padding: '12px 18px',
                                    borderRadius: 10,
                                    cursor: feedbackSubmitting ? 'not-allowed' : 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitFeedback}
                                disabled={feedbackSubmitting}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: 10,
                                    border: 'none',
                                    backgroundColor: 'rgb(58, 131, 139)',
                                    color: '#FFFFFF',
                                    fontFamily: 'Open Sans, sans-serif',
                                    fontWeight: 600,
                                    fontSize: 16,
                                    cursor: feedbackSubmitting ? 'not-allowed' : 'pointer',
                                    opacity: feedbackSubmitting ? 0.7 : 1,
                                }}
                            >
                                {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            </div>
        </div>
    );
}

export default function AgentResult(props) {
    return <AgentResultLayout {...props} />;
}
