import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import igv from 'https://cdn.jsdelivr.net/npm/igv@3.0.2/dist/igv.esm.min.js';
import { useLocation } from 'react-router-dom';

import {
  Container,
  useMediaQuery,
} from '@mui/material';

import AgentSidebar from '../components/AgentSidebar';
import SearchResult from './result';

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
    allowMulti = false,
    allowSearch = false,
    showFloatingSearchBar = false,
}) {
    const location = useLocation();
    const isResultNewRoute = location.pathname === '/result-new';
    const demoMode = useMemo(
        () => new URLSearchParams(location.search).get('demo') === 'true',
        [location.search]
    );
    const effectiveAllowMulti = allowMulti || demoMode;
    const [results, setResults] = useState([
        {
            id: 1,
            query: "How Does The SNP Rs2402203 Influence The Expression Of CFTR In Pancreas Tissue?",
        }
    ]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeResultIndex, setActiveResultIndex] = useState(0);
    const [hoveredResultIndex, setHoveredResultIndex] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [contentMetaByIndex, setContentMetaByIndex] = useState({});
    const menuTimersRef = useRef({ open: null, close: null });
    const resultsContainerRef = useRef(null);
    const scrollRafRef = useRef(null);
    const scrollLockRef = useRef({ active: false, until: 0, index: null });
    const activeMeta = contentMetaByIndex[activeResultIndex];
    const activeQuestionComplete = activeMeta?.isQuestionComplete ?? false;
    const hideFloatingSearchBarByPhase = Boolean(activeMeta?.hideFloatingSearchBar);
    const canSearch = allowSearch
        && (effectiveAllowMulti || showFloatingSearchBar)
        && !Boolean(activeMeta?.isPlanning)
        && (effectiveAllowMulti || activeQuestionComplete);
    const isSingleColumn = useMediaQuery("(max-width:1199.95px)");

    const getAnchorPrefix = (index) => `result-${index + 1}`;
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

    const scrollToAnchor = (anchorId, index) => {
        const target = document.getElementById(anchorId);
        if (!target) return;
        setActiveResultIndex(index);
        target.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    useEffect(() => {
        if (demoMode && results.length < 2) {
            setResults([
                {
                    id: 1,
                    query: "How Does The SNP Rs2402203 Influence The Expression Of CFTR In Pancreas Tissue?",
                },
                {
                    id: 2,
                    query: "What is the functional impact of CFTR QTLs in pancreas tissue?",
                },
                {
                    id: 3,
                    query: "Which variants modulate CFTR expression in ductal cells?",
                },
                {
                    id: 4,
                    query: "How does CFTR relate to T1D immune regulation?",
                },
            ]);
        }
    }, [demoMode, results.length]);

    useEffect(() => {
        if (!effectiveAllowMulti || results.length < 2) {
            return;
        }

        const updateActiveFromScroll = () => {
            const now = Date.now();
            if (scrollLockRef.current.active && now < scrollLockRef.current.until) {
                return;
            }
            const container = resultsContainerRef.current;
            if (!container) return;
            const items = Array.from(container.children);
            if (!items.length) return;

            const anchor = 140;
            let nextIndex = 0;
            let bestDistance = Number.POSITIVE_INFINITY;

            items.forEach((item, index) => {
                const rect = item.getBoundingClientRect();
                const inView = rect.top <= anchor && rect.bottom >= anchor;
                const distance = Math.abs(rect.top - anchor);
                if (inView) {
                    nextIndex = index;
                    bestDistance = 0;
                    return;
                }
                if (distance < bestDistance) {
                    bestDistance = distance;
                    nextIndex = index;
                }
            });

            setActiveResultIndex(nextIndex);
        };

        const onScroll = () => {
            if (scrollRafRef.current) return;
            scrollRafRef.current = requestAnimationFrame(() => {
                scrollRafRef.current = null;
                updateActiveFromScroll();
            });
        };

        updateActiveFromScroll();
        const rootScroll = document.getElementById("root");
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        rootScroll?.addEventListener("scroll", onScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            rootScroll?.removeEventListener("scroll", onScroll);
            if (scrollRafRef.current) {
                cancelAnimationFrame(scrollRafRef.current);
                scrollRafRef.current = null;
            }
        };
    }, [effectiveAllowMulti, results.length]);

    const handleSearch = () => {
        if (!canSearch) return;
        const trimmed = searchQuery.trim();
        if (!trimmed) return;

        // In chat mode the active result exposes a followUpHandler — delegate to it
        // so /chat/message is called on the existing session instead of mounting a new component.
        const followUpHandler = activeMeta?.followUpHandler;
        if (followUpHandler) {
            followUpHandler(trimmed);
            setSearchQuery("");
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

    const handleKeyPress = (e) => {
        if (!canSearch) return;
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const scrollToResult = (index) => {
        if (!effectiveAllowMulti) return;
        setActiveResultIndex(index);
        scrollLockRef.current = {
            active: true,
            until: Date.now() + 600,
            index,
        };
        const resultElement = resultsContainerRef.current?.children[index];
        resultElement?.scrollIntoView({ behavior: "smooth", block: "start" });
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

    useEffect(() => {
        return () => {
            if (menuTimersRef.current.open) clearTimeout(menuTimersRef.current.open);
            if (menuTimersRef.current.close) clearTimeout(menuTimersRef.current.close);
        };
    }, []);

    return (
        <div
            style={{
                display: "flex",
                width: "100%",
            }}
        >
            <AgentSidebar activeNav="new-chat" />
            <div
                style={{
                    position: "relative",
                    flex: 1,
                    minWidth: 0,
                    backgroundColor: effectiveAllowMulti && results.length > 1 ? "#f5f5f5" : "transparent",
                    marginTop: effectiveAllowMulti && results.length > 1 ? -8 : 0,
                    paddingTop: effectiveAllowMulti && results.length > 1 ? 8 : 0,
                    paddingBottom: 0,
                }}
            >
            {/* Results display */}
            <div ref={resultsContainerRef}>
                {results.map((result, index) => {
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
                                padding: effectiveAllowMulti && results.length > 1 ? "28px 16px" : "0",
                                display: "flex",
                                justifyContent: "center",
                            }}
                        >
                            <div
                                style={{
                                    backgroundColor: effectiveAllowMulti && results.length > 1 ? "#ffffff" : "transparent",
                                    borderRadius: effectiveAllowMulti && results.length > 1 ? 16 : 0,
                                    boxShadow: effectiveAllowMulti && results.length > 1 ? "0 6px 18px rgba(15, 23, 42, 0.08)" : "none",
                                    padding: effectiveAllowMulti && results.length > 1 ? "16px" : "0",
                                    width: "100%",
                                    maxWidth: effectiveAllowMulti && results.length > 1 ? 1344 : "100%",
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

            {results.length > 1 && (
                <>
                    <div
                        onMouseEnter={openMenuWithDelay}
                        onMouseLeave={closeMenuWithDelay}
                        style={{
                            position: "fixed",
                            top: 290,
                            right: 24,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            zIndex: 100,
                            padding: "18px 12px",
                            margin: "-18px -12px",
                        }}
                    >
                        {results.map((result, index) => {
                            const isActive = activeResultIndex === index;
                            const gap = index === results.length - 1 ? 0 : 14;

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
                        onMouseEnter={openMenuWithDelay}
                        onMouseLeave={closeMenuWithDelay}
                        style={{
                            position: "fixed",
                            top: 240,
                            right: 56,
                            backgroundColor: "#fff",
                            border: "1px solid #ddd",
                            borderRadius: 12,
                            padding: "16px",
                            boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                            zIndex: 100,
                            minWidth: 220,
                            maxWidth: 265,
                            transform: menuOpen ? "translateX(0)" : "translateX(110%)",
                            opacity: menuOpen ? 1 : 0,
                            pointerEvents: menuOpen ? "auto" : "none",
                            transition: "transform 0.25s ease, opacity 0.2s ease",
                        }}
                    >
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {results.map((result, index) => {
                                const isActive = activeResultIndex === index;
                                const meta = contentMetaByIndex[index];
                                const anchorPrefix = meta?.anchorPrefix || getAnchorPrefix(index);
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
                                                    onClick={() => scrollToAnchor(`${anchorPrefix}-ai-overview`, index)}
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
                                                        onClick={() => scrollToAnchor(`${anchorPrefix}-ai-overview-${heading.index + 1}`, index)}
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
                                                        onClick={() => scrollToAnchor(`${anchorPrefix}-visual-material`, index)}
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
                                                        onClick={() => scrollToAnchor(`${anchorPrefix}-evidences`, index)}
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
                                                        onClick={() => scrollToAnchor(`${anchorPrefix}-follow-up`, index)}
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
                        zIndex: 900,
                        marginTop: 8,
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
                                border: "1px solid #ddd",
                                fontSize: 14,
                                fontFamily: "inherit",
                                outline: "none",
                                transition: "border-color 0.2s ease",
                                backgroundColor: canSearch ? "#fff" : "#F1F5F9",
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
                                backgroundColor: canSearch ? "#3A838B" : "#94A3B8",
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
                </div>
            ) : null}
            </div>
        </div>
    );
}

export default function AgentResult(props) {
    return <AgentResultLayout {...props} />;
}
