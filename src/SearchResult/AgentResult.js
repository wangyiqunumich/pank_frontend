import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import igv from 'https://cdn.jsdelivr.net/npm/igv@3.0.2/dist/igv.esm.min.js';

import { Container } from '@mui/material';

import SearchResult from './result';

// Genome Browser Component - mounts only when tab is first selected
function GenomeBrowserEmbed({ locus = "chr7:55,085,725-55,276,031", isVisible = false }) {
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
        };
    }, [locus]);

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

                // Clear container
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
        return <div style={{ width: "100%", height: 600 }} />;
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
                    height: 600,
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
    getResultViewProps = () => ({}),
    allowMulti = false,
    allowSearch = false,
}) {
    const [results, setResults] = useState([
        {
            id: 1,
            query: "How Does The SNP Rs2402203 Influence The Expression Of CFTR In Pancreas Tissue?",
        }
    ]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeResultIndex, setActiveResultIndex] = useState(0);
    const resultsContainerRef = useRef(null);
    const canSearch = allowMulti && allowSearch;

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
        if (!allowMulti) return;
        setActiveResultIndex(index);
        const resultElement = resultsContainerRef.current?.children[index];
        resultElement?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div
            style={{
                position: "relative",
                minHeight: "100vh",
                backgroundColor: allowMulti && results.length > 1 ? "#f5f5f5" : "transparent",
                paddingBottom: 120,
            }}
        >
            {/* Results display */}
            <div ref={resultsContainerRef} style={{ paddingBottom: 40 }}>
                {results.map((result, index) => (
                    <div
                        key={result.id}
                        style={{
                            padding: allowMulti && results.length > 1 ? "28px 16px" : "0",
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: allowMulti && results.length > 1 ? "#ffffff" : "transparent",
                                borderRadius: allowMulti && results.length > 1 ? 16 : 0,
                                boxShadow: allowMulti && results.length > 1 ? "0 6px 18px rgba(15, 23, 42, 0.08)" : "none",
                                padding: allowMulti && results.length > 1 ? "16px" : "0",
                                width: "100%",
                                maxWidth: allowMulti && results.length > 1 ? 1040 : "100%",
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

            {/* Quick redirect box - top left */}
            {allowMulti && results.length > 1 && (
                <div
                    style={{
                        position: "fixed",
                        top: 20,
                        left: 20,
                        backgroundColor: "#fff",
                        border: "1px solid #ddd",
                        borderRadius: 12,
                        padding: "16px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                        zIndex: 100,
                        minWidth: 120,
                    }}
                >
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 10 }}>
                        Results ({results.length})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {results.map((result, index) => (
                            <button
                                key={result.id}
                                onClick={() => scrollToResult(index)}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    border: activeResultIndex === index ? "2px solid #3A838B" : "1px solid #ddd",
                                    backgroundColor: activeResultIndex === index ? "#E0F2F1" : "#fff",
                                    cursor: "pointer",
                                    fontWeight: activeResultIndex === index ? 700 : 600,
                                    color: activeResultIndex === index ? "#3A838B" : "#666",
                                    fontSize: 12,
                                    transition: "all 0.2s ease",
                                }}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>
                </div>
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
