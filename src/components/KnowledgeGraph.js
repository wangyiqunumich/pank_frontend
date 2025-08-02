"use client";

import './styles.css';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import cytoscape from 'cytoscape';

import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import {
  Box,
  Collapse,
  Link,
  Typography,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';

import zoomInIcon from '../image/fontisto--zoom-minus.svg';
import zoomOutIcon from '../image/fontisto--zoom-plus.svg';
import InfoDisableIcon
  from '../image/material-symbols--ad-group-off-outline-rounded.svg';
import InfoEnableIcon
  from '../image/material-symbols--ad-group-outline-rounded.svg';
import downloadIcon from '../image/material-symbols--download-rounded.svg';
import recenterIcon from '../image/material-symbols--recenter-rounded.svg';
import sampleResponse from '../schema/demo_query_result.json';
import graphInfocard from '../schema/graph_viewer_schema.json';
import { addWhitespace } from '../utils/textProcessing';
import {
  edgeIsInverted,
  edgeLabels,
  getContrastingColor,
  legendSchema,
  nodeColors,
  nodeStyle,
} from './style.js';

const DisableInfocardDisappear = false;

const LegendItem = ({ label, color, sx }) => (
  <span
    style={{
      padding: "4px 8px",
      borderRadius: "6px",
      backgroundColor: color || "white",
      fontSize: "12px",
      color: getContrastingColor(color) || "black",
      ...sx,
    }}
  >
    {label}
  </span>
);

// Main KnowledgeGraph component
export default function KnowledgeGraph() {
  const cyRef = useRef(null);
  const fadeOutTimeoutRef = useRef(null);
  const infocardRef = useRef(null);
  const activeNodeRef = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [infocardPosition, setInfocardPosition] = useState({ x: 0, y: 0 });
  const [infocardVisible, setInfocardVisible] = useState(false);
  //const queryResultPage = useSelector((state) => state.queryResultPage.queryResultPage);
  const queryResultPage = sampleResponse;
  const [legendVisible, setLegendVisible] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1.5);
  const [initZoom, setInitZoom] = useState(1.5);
  const [infocardHovered, setInfocardHovered] = useState(false);
  const [nodeHovered, setNodeHovered] = useState(false);
  const [infocardEnabled, setInfocardEnabled] = useState(true);

  const center =
    cyRef.current
      ? {
        x: (cyRef.current.width() / 2),
        y: (cyRef.current.height() / 2),
      }
      : { x: 0, y: 0 };

  const handleZoomIn = () =>
    cyRef.current && cyRef.current.zoom({ level: cyRef.current.zoom() / 1.2, renderedPosition: center });
  const handleZoomOut = () =>
    cyRef.current && cyRef.current.zoom({ level: cyRef.current.zoom() * 1.2, renderedPosition: center });

  const handleRecenter = () => {
    if (cyRef.current) {
      cyRef.current.zoom(initZoom);
      cyRef.current.center();
    }
  };

  const handleDownload = () => {
    if (cyRef.current) {
      const png = cyRef.current.png({
        full: true,
        scale: 10,
      });
      const link = document.createElement("a");
      link.href = png;
      link.download = "knowledge_graph.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const InfocardData = ({ value, config, dataKey }) => {
    // config can be either just a type or the form "type(setting)""
    const setting = config?.match(/\(([^)]+)\)/)?.[1];
    const type = setting ? config.split('(')[0] : config;
    return !type ? (<>{value || "No Data"}</>) :
      type === "string" ? (
        <>{dataKey || "No Data"}</>
      ) :
        type === "int" ? (
          <>{value ? parseInt(value).toLocaleString() : "No Data"}</>
        ) :
          type === "float" ? (
            <>{value ? parseFloat(value).toFixed(setting || 1) : "No Data"}</>
          ) : ["link", "link_static"].includes(type) ? (
            <Link href={type === "link" ? value : dataKey} target="_blank" rel="noopener noreferrer" sx={{
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
                cursor: "pointer",
              },
            }}>
              Open Link ↗
            </Link>
          ) : ["label_chr", "label_percentage"].includes(type) ? (
            <div style={{
              backgroundColor: setting || "#0FB47D",
              height: "14px",
              padding: "1.5px 4px",
              marginY: "-4px",
              borderRadius: "8.5px",
              textDecoration: "none",
              color: "white",
              fontFamily: "Open Sans",
              fontWeight: "700",
              fontSize: "12px"
            }}>
              {value ? (type === "label_chr" ? `Chr${value}` : `${parseFloat(value).toFixed(1)}%`) : "No Data"}
            </div>
          ) : (
            <span>{value}</span>
          );
  }

  const InfocardMenu = () => {
    const hoveredData = cyRef.current?.getElementById(hoveredId)?.data();
    const isEdge = hoveredData?.source && hoveredData?.target;
    const schema = (isEdge ? graphInfocard?.edges : graphInfocard?.nodes)?.[hoveredData?.type]?.info_panel;
    const titleColumn = schema?.find(([label, _]) => label === "Title");
    const footerInfo = schema?.find(([label, _]) => label === "Footer")?.[1] || [];
    return (
      hoveredData && (schema?.length > 0
        ? (
          <>
            {/* Title Bar */}
            <Box sx={{
              display: "flex",
              paddingY: "17px",
              textAlign: "center",
              backgroundColor: "#E4F0F1",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Typography sx={{
                fontFamily: "Open Sans",
                fontWeight: "700",
                fontSize: "20px",
                lineHeight: "20px",
              }}>
                <InfocardData value={hoveredData[titleColumn?.[1]]?.replace(/_/g, " ")} dataKey={titleColumn?.[1]} config={titleColumn?.[2]} />
              </Typography>
            </Box>
            {
              schema.map(([title, content, config]) => (
                ["Title", "Footer"].includes(title) ? "" : (
                  <Box key={title} sx={{
                    width: "calc(100% - 32px)",
                    display: "flex",
                    flexDirection: "column",
                    padding: "16px",
                    borderBottom: "1px solid #F0F0F0",
                    gap: "12px",
                  }}>
                    {/* Part Subtitle */}
                    <Typography sx={{
                      alignSelf: "center",
                      fontFamily: "Open Sans",
                      fontWeight: "600",
                      fontSize: "10px",
                      color: "#6B7880",
                      lineHeight: "7px",
                      textTransform: "uppercase",
                    }}>
                      {title}
                    </Typography>
                    {
                      Array.isArray(content) ? (
                        content.map(([label, key, config]) => ( // Data Row
                          <Box key={key} sx={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <Typography sx={{
                              fontFamily: "Open Sans",
                              fontWeight: "600",
                              fontSize: "12px",
                              color: "#6B7880",
                              lineHeight: "14px",
                              marginTop: "-5px",
                            }}>
                              {label}
                            </Typography>
                            <Typography
                              component="span"
                              sx={{
                                textAlign: "right",
                                fontFamily: "Open Sans",
                                fontWeight: "600",
                                fontSize: "12px",
                                color: "#263238",
                                marginLeft: "8px",
                                lineHeight: "14px",
                                marginTop: "-5px",
                              }}
                            >
                              <InfocardData value={hoveredData[key]} dataKey={key} config={config} />
                            </Typography>
                          </Box>
                        )))
                        : ( // Text Content
                          <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                            <Typography
                              sx={{
                                marginTop: "-5px",
                                fontFamily: "Open Sans",
                                fontWeight: "600",
                                fontSize: "10px",
                                lineHeight: "15px",
                                wordWrap: "break-word",
                                color: "#263238",
                                textAlign: "justify",
                              }}
                            >
                              {(() => {
                                const processedData = config !== "string" ? addWhitespace(hoveredData[content]) : hoveredData[content];
                                const processedKey = config === "string" ? addWhitespace(content) : content;
                                return <InfocardData value={processedData} dataKey={processedKey} config={config} />
                              })()}
                            </Typography>
                          </Box>
                        )
                    }
                  </Box>
                )
              ))
            }
            {/* Footer */}
            <Box sx={{
              display: "flex",
              height: "30px",
              textAlign: "center",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(360deg, #CACFD5 -73.08%, #F4F6F8 75%)",
            }}>
              <Typography sx={{ fontWeight: "600", fontSize: "9px", color: "#5F7885" }}>
                {footerInfo?.map(
                  ([label, key, config], index) =>
                    index === 0
                      ? <span key={index}>
                        {`${label}: `}
                        <InfocardData value={hoveredData[key]} dataKey={key} config={config} />
                      </span>
                      : <span key={index}>
                        {` | ${label}: `}
                        <InfocardData value={hoveredData[key]} dataKey={key} config={config} />
                      </span>
                )}
              </Typography>
            </Box>
          </>
        )
        : (<div style={{
          padding: "16px",
          fontFamily: "Open Sans",
          fontWeight: "600",
          alignContent: "center",
        }}>
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
            {hoveredData?.HGNC_symbol || hoveredData?.id}
          </div>
          {Object.entries(hoveredData || {})?.map(
            ([key, value]) =>
              key !== "type" &&
              (key === "link" || key === "url" ? (
                <div key={key}>
                  <span style={{ fontWeight: 500 }}>{key}:</span>{" "}
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#007bff" }}
                  >
                    Open Link ↗
                  </a>
                </div>
              ) : (
                <div key={key}>
                  <span style={{ fontWeight: 500 }}>{key}:</span> {value}
                </div>
              ))
          )}
        </div>))
    );
  }

  useEffect(() => {
    const container = document.getElementById("cy-container");
    const { width: containerWidth, top: containerTop } = container.getBoundingClientRect();

    const ele = activeNodeRef.current;
    if (!ele || !cyRef.current || !infocardEnabled) {
      return;
    }
    const { x: modelX, y: modelY } =
      ele.isNode() ? ele.position() : ele.midpoint();
    const nodeWidth = ele.isNode() ? ele.outerWidth() * cyRef.current.zoom() : 20;
    const nodeHeight = ele.isNode() ? ele.outerHeight() * cyRef.current.zoom() : 20;
    const x = modelX * cyRef.current.zoom() + cyRef.current.pan().x;
    const y = modelY * cyRef.current.zoom() + cyRef.current.pan().y;

    const infocard = document.getElementById("infocard");
    if (!infocard) return;
    infocard.style.display = "block";
    infocard.style.opacity = "1";
    const { width: infocardWidth, height: infocardHeight } = infocard.getBoundingClientRect();

    let top = y - infocardHeight - nodeHeight / 2 - 2;
    let left = x + nodeWidth / 2 + 2;

    if (left + infocardWidth > containerWidth) {
      left = x - infocardWidth - nodeWidth / 2 - 2;
    }

    if (top + containerTop < 0) {
      top = y + nodeHeight / 2 + 2;
    }

    setInfocardPosition({ x: left, y: top });
  }, [hoveredId, nodeHovered, infocardEnabled]);

  useEffect(() => {
    if (!infocardHovered && !nodeHovered) {
      if (DisableInfocardDisappear) return;
      fadeOutTimeoutRef.current = setTimeout(() => {
        setInfocardVisible(false);
        activeNodeRef.current = null;
      }, 200);
    } else if (infocardEnabled) {
      clearTimeout(fadeOutTimeoutRef.current);
      setInfocardVisible(true);
    }
    return () => {
      clearTimeout(fadeOutTimeoutRef.current);
    }
  }, [infocardHovered, nodeHovered, infocardEnabled]);


  useEffect(() => {
    const result = queryResultPage?.combined_query_result;
    const positionData = queryResultPage?.xy_json || {};

    const uniqueNodesMap = {};
    result.nodes.forEach((node) => (uniqueNodesMap[node["~id"]] = node));
    const nodes = Object.values(uniqueNodesMap).map((node) => {
      // Determine type based on the labels
      const type = node["~labels"].find((label) => nodeColors[label]) || "coding_elements";
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
          ...node["~properties"],
          label: (
            node["~labels"].includes("disease")
              ? "T1D"
              : (node["~labels"].includes("gene") ||
                node["~labels"].includes("OCR") ||
                node["~id"].startsWith("CL_")
              )
                ? (node["~properties"].name || node["~properties"].id)
                : node["~properties"].id
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
      style: nodeStyle,
      layout: { name: "preset" },
      zoom: 1.5,
      minZoom: 1.2,
      maxZoom: 4,
      pan: { x: 0, y: 0 },
    });

    const handleHover = (evt) => {
      document.body.style.cursor = "pointer";
      activeNodeRef.current = evt.target;
      setNodeHovered(true);
      setHoveredId(evt.target.id());
    };

    const handleOut = (evt) => {
      // Only proceed with hiding if we're leaving the active node
      if (evt.target === activeNodeRef.current) {
        document.body.style.cursor = "default";
        setNodeHovered(false);
      }
    };

    const handleLeave = (_) => {
      document.body.style.cursor = "default";
      setNodeHovered(false);
    };

    const handleEdge = (handler) => ((evt) => {
      // compare mouse position with edge midpoint
      const ele = cyRef.current.$(evt.target);
      const midpoint = ele.midpoint();
      const mouseRendered = cyRef.current.renderer().projectIntoViewport(evt.originalEvent.clientX, evt.originalEvent.clientY);
      const dist = Math.sqrt(
        Math.pow(midpoint.x - mouseRendered[0], 2) +
        Math.pow(midpoint.y - mouseRendered[1], 2)
      );
      // Only trigger the handler if the distance is less than 20 pixels
      if (dist < 20) {
        handler(evt);
      }
    })

    const cy = cyRef.current;
    cy.reset();
    cy.center();
    setZoomLevel(cy.zoom());
    setInitZoom(cy.zoom());

    cy.container().addEventListener("mouseleave", handleLeave);
    cy.on("mousemove", "node", handleHover);
    cy.on("mouseout", "node", handleOut);
    cy.on("mousemove", "edge", handleEdge(handleHover));
    cy.on("mouseout", "edge", handleOut);
    cy.on("zoom", () => {
      setZoomLevel(cyRef.current.zoom());
    });

    return () => {
      document.body.style.cursor = "default";
      cyRef.current.removeAllListeners();
      cyRef.current?.container().removeEventListener("mouseleave", handleLeave);
    };
  }, [queryResultPage]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative", justifyContent: "flex-start" }}>
      <div
        id="cy-container"
        style={{
          width: "100%",
          height: "600px",
          backgroundColor: "#F9FAFB",
          border: "none",
          borderRadius: "8px",
          position: "relative",
        }}
      >
      </div>
      <Box sx={{
        position: "absolute",
        top: "10px",
        right: "10px",
        padding: "7px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "white",
        borderRadius: "8px",
        boxShadow: "0px 4px 15px -3px rgba(100,100,100,0.25)",
      }}>
        {/* button for zooming */}
        <IconButton
          onClick={handleZoomOut}
          style={{ padding: "8px", background: "none", borderRadius: "4px", opacity: zoomLevel >= 4 ? 0.5 : 1 }}
          disabled={zoomLevel >= 4}
        >
          <img src={zoomOutIcon} alt="Zoom Out" width={20} height={20} />
        </IconButton>
        <IconButton
          onClick={handleZoomIn}
          style={{ padding: "8px", background: "none", borderRadius: "4px", opacity: zoomLevel <= 1.2 ? 0.5 : 1 }}
          disabled={zoomLevel <= 1.2}
        >
          <img src={zoomInIcon} alt="Zoom In" width={20} height={20} />
        </IconButton>
        <IconButton
          onClick={handleRecenter}
          style={{ padding: "8px", background: "none", borderRadius: "4px" }}
        >
          <img src={recenterIcon} alt="Zoom Out" width={20} height={20} />
        </IconButton>
        <IconButton
          onClick={handleDownload}
          style={{ padding: "8px", background: "none", borderRadius: "4px" }}
        >
          <img src={downloadIcon} alt="Zoom Out" width={20} height={20} />
        </IconButton>
        <IconButton
          onClick={() => setInfocardEnabled(!infocardEnabled)}
          style={{ padding: "8px", background: "none", borderRadius: "4px" }}
        >
          <img src={infocardEnabled ? InfoEnableIcon : InfoDisableIcon}
            alt="Enable/Disable Info Card" width={20} height={20} />
        </IconButton>
      </Box>
      <Box sx={{
        position: "absolute",
        bottom: "35px",
        right: "10px",
        height: "40px",
        width: "60px",
        display: "flex",
        background: "white",
        borderRadius: "6px",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0px 4px 15px -3px rgba(100,100,100,0.25)",
      }}>
        <Typography sx={{ fontSize: "16px", color: "#333" }}>
          {Math.round(zoomLevel / initZoom * 100)}%
        </Typography>
      </Box>
      <div
        id="infocard"
        ref={infocardRef}
        onMouseEnter={() => {
          setInfocardHovered(true);
        }}
        onMouseLeave={() => {
          setInfocardHovered(false);
        }}
        style={{
          fontFamily: "Open Sans",
          fontWeight: 400,
          position: "absolute",
          left: infocardPosition.x,
          top: infocardPosition.y,
          background: "#fff",
          borderRadius: "8px",
          overflow: "hidden",
          color: "#333",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1000,
          width: "240px",
          pointerEvents: "auto",
          opacity: infocardVisible ? 1 : 0,
          display: infocardVisible ? "block" : "none",
          transform: "translateY(0px)",
          transition: "opacity 0.15s, display 0.15s, left 0.15s, top 0.15s",
          transitionBehavior: "allow-discrete",
          willChange: "transform, opacity",
          wordWrap: "break-word",
        }}
      >
        <InfocardMenu />
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: "200px" }}>
        {/* Legend */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            left: "20px",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0px 4px 15px -3px rgba(100,100,100,0.25)",
            zIndex: 10,
            userSelect: "none",
            height: "fit-content",
            width: legendVisible ? "380px" : "100px",
            transition: "width 0.3s, height 0.3s, opacity 0.3s, box-shadow 0.3s",
          }}
        >
          {/* Title */}
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#172A3A", fontFamily: "Open Sans" }}>
              Legend
            </div>
            <IconButton
              onClick={() => setLegendVisible(!legendVisible)}
              style={{ padding: "8px", margin: "-8px" }}
            >
              {legendVisible ? (
                <KeyboardArrowLeftIcon style={{ color: "#172A3A", fontSize: "20px" }} />
              ) : (
                <KeyboardArrowRightIcon style={{ color: "#172A3A", fontSize: "20px" }} />
              )}
            </IconButton>
          </div>
          <Collapse in={legendVisible} timeout="auto">
            <div style={{ width: "430px", paddingTop: "10px", fontSize: "16px", fontFamily: "Open Sans", fontWeight: 400 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "4px", fontSize: "12px" }}>
                <LegendItem label="　　　　" sx={{ backgroundColor: "#E9E9E9", color: "black", border: "1.5px solid #E9E9E9", height: "8px" }} />
                Core Nodes
                <LegendItem label="　　　　" sx={{ backgroundColor: "white", color: "black", border: "1.5px solid #E9E9E9", height: "8px", marginLeft: "16px" }} />
                Neighbor
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                  paddingTop: "8px",
                }}
              >
                {legendSchema.map(({ label, color }) => (
                  <LegendItem
                    key={label}
                    label={label}
                    color={color}
                  />
                ))}
              </div>
            </div>
          </Collapse>
        </div>
      </div>
    </div>
  );
}
