import React, {
    useEffect,
    useRef,
    useState,
} from 'react';

import cytoscape from 'cytoscape';

import {
    Box,
    Button,
    CircularProgress,
} from '@mui/material';

import Image from '../image/Pasted Graphic 1.png';
import sampleLinks from '../schema/sample_links.json';
import SearchResultLoading from '../SearchResult/loading';
import KnowledgeGraph from './KnowledgeGraph';
import {
    edgeIsInverted,
    edgeLabels,
    nodeStyle,
} from './style.js';

import MultiLineInputList from './DebugComponent';
import { useDispatch } from 'react-redux';
import { queryQueryResultPage } from '../redux/queryResultPage';

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
    const dispatch = useDispatch();
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