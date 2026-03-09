import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import igv from 'https://cdn.jsdelivr.net/npm/igv@3.0.2/dist/igv.esm.min.js';

function LocusDebugger({ onGo }) {
    const [locus, setLocus] = useState("chr17:43,000,000-43,300,000")

    return (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <input
                value={locus}
                onChange={(e) => setLocus(e.target.value)}
                placeholder='e.g. chr7:55,085,725-55,276,031'
                style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
            />
            <button
                onClick={() => onGo(locus.trim())}
                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ccc", background: "#fff" }}
            >
                Go
            </button>
        </div>
    )
}

function TabContainer({ tabs, activeTab, onTabChange }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 16, borderBottom: "2px solid #e0e0e0" }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        style={{
                            padding: "8px 0",
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            fontWeight: activeTab === tab.id ? "600" : "400",
                            color: activeTab === tab.id ? "#0066cc" : "#666",
                            borderBottom: activeTab === tab.id ? "3px solid #0066cc" : "none",
                            marginBottom: "-2px",
                            fontSize: 14,
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default function IgvPage() {
    const containerRef = useRef(null)
    const browserRef = useRef(null)
    const [error, setError] = useState("")
    const [activeTab, setActiveTab] = useState("genome-browser")

    const tabs = [
        { id: "genome-browser", label: "Genome Browser" },
        { id: "annotation", label: "Annotation" },
        { id: "variants", label: "Variants" },
        { id: "details", label: "Details" },
    ]

    const options = useMemo(() => {
        return {
            // You can use a hosted genome by ID (easiest), OR define a reference object.
            // Genome identifiers are documented by IGV. :contentReference[oaicite:2]{index=2}
            genome: "hg38",

            // initial locus (note IGV uses "-" for ranges in many examples) :contentReference[oaicite:3]{index=3}
            locus: "chr17:43,000,000-43,300,000",

            // You can add tracks later; for initial debug keep it minimal.
            tracks: [],
        }
    }, [])

    useEffect(() => {
        let destroyed = false

        async function init() {
            setError("")
            try {
                if (!containerRef.current) return

                // Clear container to avoid duplicate embeds on hot reload
                containerRef.current.innerHTML = ""

                const browser = await igv.createBrowser(containerRef.current, options)
                if (destroyed) return
                browserRef.current = browser
            } catch (e) {
                setError(String(e?.message || e))
            }
        }

        init()

        return () => {
            destroyed = true
            try {
                browserRef.current?.dispose?.()
            } catch {
                // ignore
            }
            browserRef.current = null
        }
    }, [options])

    const goTo = async (locus) => {
        setError("")
        try {
            const b = browserRef.current
            if (!b) throw new Error("IGV browser not ready yet.")
            await b.search(locus) // IGV API supports programmatic navigation/search. :contentReference[oaicite:4]{index=4}
        } catch (e) {
            setError(String(e?.message || e))
        }
    }

    return (
        <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 12px" }}>IGV.js Viewer (hg38)</h2>
            Debugging controller for IGV.js genome browser.
            <LocusDebugger onGo={goTo} />

            <TabContainer
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {error ? (
                <div style={{ marginBottom: 12, color: "#b00020" }}>
                    {error}
                </div>
            ) : null}

            {activeTab === "genome-browser" && (
                <div
                    ref={containerRef}
                    style={{ height: 550, border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}
                />
            )}

            {activeTab === "annotation" && (
                <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8, background: "#f9f9f9" }}>
                    <p>Annotation content goes here</p>
                </div>
            )}

            {activeTab === "variants" && (
                <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8, background: "#f9f9f9" }}>
                    <p>Variants content goes here</p>
                </div>
            )}

            {activeTab === "details" && (
                <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8, background: "#f9f9f9" }}>
                    <p>Details content goes here</p>
                </div>
            )}
        </div>
    )
}
