import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import igv from 'https://cdn.jsdelivr.net/npm/igv@3.0.2/dist/igv.esm.min.js';
import { useLocation } from 'react-router-dom';

import { Container } from '@mui/material';

import SearchResult from './result';

// Genome Browser Component - mounts only when tab is first selected
export function GenomeBrowserEmbed({ locus = "chr7:55,085,725-55,276,031", isVisible = false, tracks = null, height = 600 }) {
    const containerRef = useRef(null);
    const browserRef = useRef(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);

    const options = useMemo(() => {
        return {
            genome: "hg38",
            locus: locus,
            showNavigation: true,
            showRuler: true,
            tracks: tracks || [],
        };
    }, [locus, tracks]);

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
                        const browser = await igv.createBrowser(containerRef.current, options);

                        if (destroyed) {
                            try {
                                browser?.dispose?.();
                            } catch (e) {
                                console.warn("Error disposing browser on cleanup:", e);
                            }
                            return;
                        }

                        browserRef.current = browser;
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
    }, [isVisible, hasInitialized, options]);

    // Don't render container until tab is visible
    if (!isVisible && !hasInitialized) {
        return <div style={{ width: "100%", height }} />;
    }

    return (
        <div style={{ width: "100%" }}>
            {isLoading && (
                <div style={{ marginBottom: 12, color: "#0066cc", fontSize: 12 }}>
                    Loading genome browser...
                </div>
            )}
            {error && (
                <div style={{ marginBottom: 12, color: "#b00020", fontSize: 12, padding: "8px 12px", background: "#ffebee", borderRadius: 4 }}>
                    ⚠️ {error}
                </div>
            )}
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: height,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#fafafa",
                    position: "relative"
                }}
            />
        </div>
    );
}

export function AgentResultLayout({
    ResultView = SearchResult,
    getResultViewProps = (result, index) => ({ demoIndex: index + 1, result }),
    allowMulti = false,
    allowSearch = false,
}) {
    const location = useLocation();
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
    const menuTimersRef = useRef({ open: null, close: null });
    const resultsContainerRef = useRef(null);
    const scrollRafRef = useRef(null);
    const scrollLockRef = useRef({ active: false, until: 0, index: null });
    const canSearch = effectiveAllowMulti && allowSearch;

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
        if (searchQuery.trim()) {
            const newResult = {
                id: results.length + 1,
                query: searchQuery,
            };
            setResults([...results, newResult]);
            setSearchQuery("");
            setActiveResultIndex(results.length);

            // Scroll to new result
            setTimeout(() => {
                const resultElement = resultsContainerRef.current?.children[results.length];
                resultElement?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }
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
                position: "relative",
                backgroundColor: effectiveAllowMulti && results.length > 1 ? "#f5f5f5" : "transparent",
                marginTop: effectiveAllowMulti && results.length > 1 ? -8 : 0,
                paddingTop: effectiveAllowMulti && results.length > 1 ? 8 : 0,
                paddingBottom: 0,
            }}
        >
            {/* Results display */}
            <div ref={resultsContainerRef} style={{ paddingBottom: 40 }}>
                {results.map((result, index) => (
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
                                marginTop: index > 0 ? '12px' : '0px',
                                marginBottom: '24px',
                                paddingBottom: '24px',
                            }}>
                                <ResultView {...getResultViewProps(result, index)} />
                            </Container>
                        </div>
                    </div>
                ))}
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
                            {results.map((result, index) => (
                                <button
                                    key={result.id}
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
                                        color: activeResultIndex === index || hoveredResultIndex === index ? "#3A838B" : "#818181",
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
                                    <span style={{ fontSize: 14, fontWeight: activeResultIndex === index || hoveredResultIndex === index ? 700 : 600 }}>{result.query}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Floating search bar at bottom */}
            <div
                style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: "#fff",
                    borderTop: "1px solid #e0e0e0",
                    boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
                    padding: "16px",
                    zIndex: 99,
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
        </div>
    );
}

export default function AgentResult(props) {
    return <AgentResultLayout {...props} />;
}
