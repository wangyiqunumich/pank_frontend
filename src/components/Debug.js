import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import cytoscape from 'cytoscape';
import { useDispatch } from 'react-redux';

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Typography,
} from '@mui/material';

import Image from '../image/Pasted Graphic 1.png';
import { queryQueryResultPage } from '../redux/queryResultPage';
import sampleLinks from '../schema/sample_links.json';
import { GenomeBrowserEmbed } from '../SearchResult/AgentResult';
import SearchResultLoading from '../SearchResult/loading';
import {
    clearConversationContentKeepIds,
  clearConversationStorage,
    exportConversationStorageSnapshot,
  readRecentChats,
} from '../utils/chatSessionStorage';
import MultiLineInputList from './DebugComponent';
import KnowledgeGraph from './KnowledgeGraph';
import {
  edgeIsInverted,
  edgeLabels,
  nodeStyle,
} from './style.js';

export default function DebugPage() {
    const [graphJson, setGraphJson] = useState("");
    const [loadingOpen, setLoadingOpen] = useState(true);
    // const cyRef = useRef(null);
    // const containerRef = useRef(null);
    // const [cy, setCy] = useState(null);
    // const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
    // const img = new window.Image();
    // const [cyStyle, setCyStyle] = useState([]);
    // useEffect(() => {
    //     img.src = Image;
    //     img.onload = () => {
    //         console.log("Image loaded:", img.width);
    //         setImgSize({ width: img.width, height: img.height });
    //     }
    // }, []);
    // // Initialize Cytoscape
    // useEffect(() => {
    //     console.log(imgSize);
    //     const imgSize1 = imgSize;
    //     setCyStyle([
    //         {
    //             selector: "node",
    //             style: {
    //                 label: "something here",
    //                 "text-valign": "bottom",
    //                 "font-size": "50px",
    //                 'shape': 'rectangle',
    //                 height: imgSize1.height || 100,
    //                 width: imgSize1.width || 100,
    //                 'background-opacity': 0,
    //                 'background-image': Image,
    //                 'background-fit': 'none',
    //                 'background-clip': 'none',
    //                 'background-position-x': '0%',
    //                 'background-position-y': '0%',
    //             },
    //         },
    //         {
    //             selector: "edge",
    //             style: {
    //                 "line-color": "#ccc",
    //                 "target-arrow-color": "#ccc",
    //                 "target-arrow-shape": "triangle",
    //                 "curve-style": "bezier",
    //                 "target-arrow-shape": "vee",
    //                 "arrow-scale": 5,
    //             },
    //         },
    //     ]);
    //     if (containerRef.current && !cy) {
    //         const cyInstance = cytoscape({
    //             container: containerRef.current,
    //             elements: [],
    //             style: [],
    //             layout: { name: "grid" },
    //         });
    //         setCy(cyInstance);
    //     }
    // }, [cy, imgSize]);
    const [query, setQuery] = useState("");
    const [graphData, setGraphData] = useState(null);
    const [coordData, setCoordData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [igvVisible, setIgvVisible] = useState(true);
    const [plannerHealth, setPlannerHealth] = useState({
        status: 'checking',
        label: 'Checking PlannerAgent API...',
        detail: '',
    });
    const [healthChecking, setHealthChecking] = useState(false);
    const [historyActionMessage, setHistoryActionMessage] = useState('');
    const dispatch = useDispatch();

    const checkPlannerHealth = React.useCallback(async () => {
        setHealthChecking(true);
        try {
            const response = await fetch('https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent/health');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            const status = String(data?.status || '').toLowerCase() === 'healthy' ? 'healthy' : 'degraded';
            setPlannerHealth({
                status,
                label: status === 'healthy' ? 'PlannerAgent Healthy' : 'PlannerAgent Degraded',
                detail: data?.message || '',
            });
        } catch (err) {
            setPlannerHealth({
                status: 'down',
                label: 'PlannerAgent Unreachable',
                detail: err?.message || 'Health check failed',
            });
        } finally {
            setHealthChecking(false);
        }
    }, []);

    const clearAllConversationHistory = React.useCallback(() => {
        const beforeRecent = readRecentChats().length;
        const result = clearConversationStorage({ keepRecent: 0 });
        setHistoryActionMessage(`Cleared ${result.removedHistoryKeys} history records and removed ${beforeRecent} recent items.`);
    }, []);

    const clearHistoryKeepRecentTen = React.useCallback(() => {
        const result = clearConversationStorage({ keepRecent: 10 });
        setHistoryActionMessage(`Cleared ${result.removedHistoryKeys} history records and kept ${result.keptRecent} recent items.`);
    }, []);

    const clearHistoryContentKeepIds = React.useCallback(() => {
        const result = clearConversationContentKeepIds();
        setHistoryActionMessage(`Cleared ${result.removedHistoryKeys} history records while preserving ${result.keptRecent} cached session IDs.`);
    }, []);

    const exportCachedHistory = React.useCallback(() => {
        const snapshot = exportConversationStorageSnapshot();
        const fileName = `pank_cached_history_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const payload = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const downloadUrl = window.URL.createObjectURL(blob);

        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(downloadUrl);

        setHistoryActionMessage(`Exported cache snapshot to ${fileName}.`);
    }, []);

    useEffect(() => {
        checkPlannerHealth();
    }, [checkPlannerHealth]);
    const handleQuery = (queryRaw) => {
        const query = queryRaw?.filter(line => line.trim().length > 0);
        if (!query || query.length === 0) return;
        console.log("Running query:", query);
        setLoading(true);
        setError("");
        dispatch(queryQueryResultPage({
            payload: {
                "cypher": query,
                "rdb_query": ""
            }, agent: true
        })).then((response) => {
            setLoading(false);
            console.log('Graph data received:', response.payload);
            if (!response.payload?.combined_query_result) {
                console.log('[ERROR] No combined query result found');
                setGraphData(null);
                setCoordData(null);
                setError("No combined query result found");
                return;
            }
            if (!response.payload.combined_query_result.nodes || !response.payload.combined_query_result.edges) {
                setError("No nodes or edges found in the combined query result");
                return;
            }
            setGraphData(response.payload?.combined_query_result || {});
            setCoordData(response.payload?.xy_json || {});
        });
    };

    const generateTest = (queryRaw) => {
        const jsonPayload = {
            "cypher": queryRaw?.filter(line => line.trim().length > 0),
            "rdb_query": ""
        };
        const testEvent = {
            "body": JSON.stringify(jsonPayload)
        };
        console.log("Generated Test Event:", testEvent);
        navigator.clipboard.writeText(JSON.stringify(testEvent, null, 2));
        window.alert("Test event copied to clipboard!");
    }

    // // Handle file upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                console.log("Loaded JSON:", json);
                setGraphJson(json);
            } catch (err) {
                console.error("Invalid JSON file:", err);
            }
        };
        reader.readAsText(file);
    };
    const cyRef = useRef(null);

    useEffect(() => {
        if (!graphJson || !graphJson?.graph) {
            return;
        }
        const result = graphJson?.graph;
        const positionData =
            Object.fromEntries(
                Object.entries(graphJson?.coords || {}).map(([key, value]) => [
                    key,
                    {
                        ...value,
                        x: value.x / 2.0,
                        y: value.y / 2.0,
                    },
                ])
            ) || {};

        const uniqueNodesMap = {};
        result.nodes.forEach((node) => (uniqueNodesMap[node["~id"]] = node));
        const nodes = Object.values(uniqueNodesMap).map((node) => {
            // Determine type based on the labels
            const type = node["~labels"][0];
            // Use the provided positionData and extract the Level property.
            const posData = positionData[node["~id"]] || {
                x: Math.random() * 250 - 125,
                y: Math.random() * 200 - 125,
                Level: "Core",
            };
            const pos = { x: posData.x, y: posData.y };
            return {
                data: {
                    id: node["~id"],
                    label: (
                        node["~id"]
                    ).replace(/_/g, " "),
                    type,
                    Level: posData.Level,
                },
                position: pos,
            };
        });

        const uniqueEdgesMap = {};
        result.edges.forEach((edge, index) => (uniqueEdgesMap[edge["~id"] || index.toString()] = edge));
        const edges = Object.values(uniqueEdgesMap).map((edge) => ({
            data: {
                id: edge["~id"],
                source: edgeIsInverted[edge["~type"]] ? edge["~end"] : edge["~start"],
                target: edgeIsInverted[edge["~type"]] ? edge["~start"] : edge["~end"],
                type: edge["~type"],
                label: edgeLabels[edge["~type"]] || edge["~type"],
                ...edge["~properties"],
            },
        }));

        cyRef.current = cytoscape({
            container: document.getElementById("cy-container"),
            elements: { nodes, edges },
            style: nodeStyle.concat([{
                selector: `node[type = "region"]`,
                style: {
                    "text-valign": "bottom",
                    "border-width": "0px",
                    'shape': 'rectangle',
                    "text-margin-y": "-5px",
                    "background-position-y": "0px",
                    // height: 40,
                    // width: 112,
                    height: 15,
                    width: 42,
                    'background-opacity': 0,
                    'background-image': Image,
                    'background-fit': 'contain',
                    'background-clip': 'none',
                    'background-position-x': '0%',
                    "font-size": "5px",
                },
            }]),
            layout: { name: "preset" },
            zoom: 1.5,
            minZoom: 1.2,
            maxZoom: 4,
            pan: { x: 0, y: 0 },
        });

        const cy = cyRef.current;
        cy.reset();
        cy.center();

        return () => {
            document.body.style.cursor = "default";
            cyRef.current.removeAllListeners();
        };
    }, [graphJson]);
    return (
        <>
            <Box sx={{ mx: '10px', mt: '10px', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>
                        PlannerAgent API
                    </Typography>
                    <Chip
                        label={plannerHealth.label}
                        size="small"
                        sx={{
                            fontWeight: 700,
                            backgroundColor:
                                plannerHealth.status === 'healthy'
                                    ? '#DCFCE7'
                                    : plannerHealth.status === 'checking'
                                        ? '#E2E8F0'
                                        : '#FEE2E2',
                            color:
                                plannerHealth.status === 'healthy'
                                    ? '#166534'
                                    : plannerHealth.status === 'checking'
                                        ? '#334155'
                                        : '#991B1B',
                        }}
                    />
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={checkPlannerHealth}
                        disabled={healthChecking}
                        sx={{ textTransform: 'none' }}
                    >
                        {healthChecking ? 'Checking...' : 'Refresh'}
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={clearAllConversationHistory}
                        sx={{ textTransform: 'none' }}
                    >
                        Clear Conversation History
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={clearHistoryContentKeepIds}
                        sx={{ textTransform: 'none' }}
                    >
                        Clear History Content (Keep IDs)
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={clearHistoryKeepRecentTen}
                        sx={{ textTransform: 'none' }}
                    >
                        Clear History, Keep Recent 10
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={exportCachedHistory}
                        sx={{ textTransform: 'none' }}
                    >
                        Export Cached History
                    </Button>
                    {plannerHealth.detail ? (
                        <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                            {plannerHealth.detail}
                        </Typography>
                    ) : null}
                    {historyActionMessage ? (
                        <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                            {historyActionMessage}
                        </Typography>
                    ) : null}
                </Box>
            </Box>
            <div style={{ padding: '20px', width: '1000px', border: '1px solid #ccc', marginBottom: '20px', margin: '10px' }}>
                <MultiLineInputList onChange={(data) => { setQuery(data); }} />
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, pb: 2 }}>
                    <Button variant="contained" onClick={() => generateTest(query)} sx={{ mt: 2 }}>Generate Test Event</Button>
                    <Button variant="contained" onClick={() => handleQuery(query)} sx={{ mt: 2 }}>Run Query</Button>
                    {loading && <CircularProgress size={24} />}
                </Box>

                {
                    error && (<Box sx={{ color: 'red', mb: 2 }}>{error}</Box>)
                }

                <Box sx={{ width: '600px', height: '600px', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
                    {graphData && <KnowledgeGraph selectable={false} sx={{ zIndex: 2 }}
                        graphData={graphData} coordData={coordData}
                    />}
                </Box>
            </div>
            <SearchResultLoading open={loadingOpen} onClose={() => setLoadingOpen(false)} />
            <div style={{ padding: '20px', width: '100%' }}>
                <h2>IGV.js Genome Browser - Full Width Demo</h2>
                <Box sx={{ width: '100%', height: '800px', border: '1px solid #ccc', backgroundColor: '#fafafa' }}>
                    <GenomeBrowserEmbed
                        locus="chr6:53,510,000-53,530,000"
                        isVisible={igvVisible}
                        height={800}
                        compact
                        tracks={[
                            // {
                            //     name: "Phase 3 WGS variants",
                            //     type: "variant",
                            //     format: "vcf",
                            //     url: "https://s3.amazonaws.com/1000genomes/release/20130502/ALL.wgs.phase3_shapeit2_mvncall_integrated_v5b.20130502.sites.vcf.gz",
                            //     indexURL: "https://s3.amazonaws.com/1000genomes/release/20130502/ALL.wgs.phase3_shapeit2_mvncall_integrated_v5b.20130502.sites.vcf.gz.tbi",
                            // },
                            // {
                            //     type: "alignment",
                            //     format: "bam",
                            //     name: "HG00096",
                            //     url: "https://s3.amazonaws.com/1000genomes/phase3/data/HG00096/exome_alignment/HG00096.mapped.ILLUMINA.bwa.GBR.exome.20120522.bam",
                            //     indexURL: "https://s3.amazonaws.com/1000genomes/phase3/data/HG00096/exome_alignment/HG00096.mapped.ILLUMINA.bwa.GBR.exome.20120522.bam.bai",
                            //     height: 400,
                            // },
                            {
                                name: "credibleSet1",
                                type: "qtl",
                                format: "qtl",
                                url: "https://pank-s3-to-share.s3.us-east-1.amazonaws.com/genome-browser/ENSG00000001084__GCLC__ENSG00000001084.6_53373974_53375246__credibleSet1.qtl.tsv",
                                chrColumn: 1,
                                posColumn: 2,
                                snpColumn: 3,
                                pValueColumn: 4,
                                phenotypeColumn: 5,
                                height: 164
                            }
                        ]}
                    />
                </Box>
            </div>
            <div style={{ padding: '20px', width: '1440px' }}>
                <h1>Links for Debug Quick Redirect</h1>
                {
                    [["Landing Page", "landing_page"], ["Intermediate Page", "intermediate_page"], ["Result Page", "result_page"], ["Review Page", "review_page"]].map(([title, key]) => (
                        <div key={key}>
                            <h3>{title}:</h3>
                            {
                                sampleLinks[key].map((item, index) => (
                                    <div key={index}>
                                        <a href={item.link} target="_blank" rel="noopener noreferrer" style={{
                                            wordWrap: 'break-word',
                                            maxWidth: '100%',
                                        }}>
                                            {item.link}
                                        </a>
                                        <ul>
                                            {Object.entries(item.dictionary).map(([key, value], linkIndex) => (
                                                <li key={linkIndex}>
                                                    {key}: {value}
                                                </li>
                                            ))}
                                        </ul>
                                        {item['$comment'] && (
                                            <p style={{ color: 'red' }}>
                                                {item['$comment']}
                                            </p>
                                        )}
                                    </div>
                                ))
                            }
                        </div>
                    ))
                }
            </div>
        </>
    );
}