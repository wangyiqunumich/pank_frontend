"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSelector } from 'react-redux';
import cytoscape from "cytoscape";
import zoomInIcon from "../image/zoomIn.png";
import zoomOutIcon from "../image/zoomOut.png";
import { edgeLabels, nodeStyle, nodeColors, nodeLabels, getContrastingColor } from "./style.js";
import Collapse from "@mui/material/Collapse";
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import IconButton from '@mui/material/IconButton';

const LegendItem = ({ type, sx }) => (
  <span
    style={{
      padding: "4px 8px",
      borderRadius: "6px",
      backgroundColor: nodeColors[type],
      fontSize: "12px",
      color: getContrastingColor(nodeColors[type]),
      ...sx,
    }}
  >
    {nodeLabels[type] || type}
  </span>
);

// Main KnowledgeGraph component
export default function KnowledgeGraph() {
  const cyRef = useRef(null);
  const contextNodeRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const fadeOutTimeoutRef = useRef(null);
  const tooltipRef = useRef(null);
  const activeNodeRef = useRef(null);
  const [hoveredData, setHoveredData] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const queryResultPage = useSelector((state) => state.queryResultPage.queryResultPage);
  const [legendVisible, setLegendVisible] = useState(false);

  const hideContextMenu = () => {
    const menu = document.getElementById("context-menu");
    if (menu) menu.style.display = "none";
    contextNodeRef.current = null;
  };

  const handleZoomIn = () =>
    cyRef.current && cyRef.current.zoom(cyRef.current.zoom() + 0.2);
  const handleZoomOut = () =>
    cyRef.current && cyRef.current.zoom(cyRef.current.zoom() - 0.2);

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
            (node["~labels"].includes("gene") || node["~labels"].includes("OCR") || node["~id"].startsWith("CL_"))
              ? node["~properties"].name
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
        source: edge["~start"],
        target: edge["~end"],
        type: edgeLabels[edge["~type"]] || edge["~type"],
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
      // Clear any existing timers immediately
      clearTimeout(hoverTimeoutRef.current);
      clearTimeout(fadeOutTimeoutRef.current);

      document.body.style.cursor = "pointer";
      activeNodeRef.current = evt.target;

      const nodeData = evt.target.data();
      const container = document.getElementById("cy-container");
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      const ele = cyRef.current.$(evt.target);
      const { x: modelX, y: modelY } =
        ele.isNode() ? ele.position() : ele.midpoint();
      const x = modelX * cyRef.current.zoom() + cyRef.current.pan().x;
      const y = modelY * cyRef.current.zoom() + cyRef.current.pan().y;

      // Calculate tooltip offset based on node position
      // If node is in the right half of the screen, show tooltip to the left
      // If node is in the bottom half of the screen, show tooltip above
      const isRightSide = x > containerWidth / 2;
      const isBottomSide = y > containerHeight / 2;

      // Calculate tooltip x position
      const tooltipX = isRightSide
        ? x - 230 - 20 * cyRef.current.zoom() // Tooltip appears left of the node
        : x + 20 * cyRef.current.zoom(); // Tooltip appears right of the node

      // Calculate tooltip y position
      const tooltipY = isBottomSide
        ? y - 100 - 10 * cyRef.current.zoom() // Tooltip appears above the node
        : y + 10 * cyRef.current.zoom(); // Tooltip appears below the node

      setHoveredData(nodeData);
      setTooltipPosition({ x: tooltipX, y: tooltipY });

      // Use a shorter delay for better responsiveness
      hoverTimeoutRef.current = setTimeout(() => {
        setTooltipVisible(true);
      }, 80);
    };

    const handleOut = (evt) => {
      document.body.style.cursor = "default";
      clearTimeout(hoverTimeoutRef.current);

      // Only proceed with hiding if we're leaving the active node
      if (evt.target === activeNodeRef.current) {
        // Use a shorter delay for hiding to feel more responsive
        fadeOutTimeoutRef.current = setTimeout(() => {
          // More reliable way to check if mouse is over tooltip
          const tooltip = document.getElementById("tooltip");
          if (tooltip && !tooltip.matches(":hover")) {
            setTooltipVisible(false);
            activeNodeRef.current = null;
          }
        }, 300);
      }
    };

    cyRef.current.on("mouseover", "node", handleHover);
    cyRef.current.on("mouseout", "node", handleOut);
    cyRef.current.on("mouseover", "edge", handleHover);
    cyRef.current.on("mouseout", "edge", handleOut);

    cyRef.current.on("cxttap", "node", (evt) => {
      setTooltipVisible(false);
      // hideContextMenu();
      // contextNodeRef.current = evt.target;
      // const menu = document.getElementById("context-menu");
      // menu.style.left = `${evt.originalEvent.clientX}px`;
      // menu.style.top = `${evt.originalEvent.clientY}px`;
      // menu.style.display = "block";
    });

    cyRef.current.on("mouseover", "node", (evt) => {
      document.body.style.cursor = "pointer";
    });

    document.addEventListener("click", hideContextMenu);
    return () => {
      if (cyRef.current) cyRef.current.destroy();
      document.removeEventListener("click", hideContextMenu);
    };
  }, [queryResultPage]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative", justifyContent: "flex-start" }}>
      <div
        id="cy-container"
        style={{
          width: "100%",
          height: "600px",
          backgroundColor: "#fff", // Restored to white as requested
          // border: "1px solid #ddd",
          border: "none",
          borderRadius: "8px",
          position: "relative", // Add this for absolute positioning inside
          overflow: "hidden", // To keep contents within rounded corners
        }}
      >
        {/* <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "20px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "16px 20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            zIndex: 10,
            fontSize: "13px",
            width: "auto",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "12px",
              fontSize: "14px",
            }}
          >
            Legend
          </div>

          <div style={{ marginBottom: "10px" }}>
            <div
              style={{ color: "#666", fontSize: "12px", marginBottom: "8px" }}
            >
              Search result:
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
                marginBottom: "4px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    backgroundColor: nodeTypeColors.gene,
                    borderRadius: "4px",
                  }}
                />
                <div style={{ fontSize: "13px", color: "#333" }}>Gene</div>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    backgroundColor: nodeTypeColors.sequence_variant,
                    borderRadius: "4px",
                  }}
                />
                <div style={{ fontSize: "13px", color: "#333" }}>
                  Sequence variant
                </div>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    backgroundColor: nodeTypeColors.article,
                    borderRadius: "4px",
                  }}
                />
                <div style={{ fontSize: "13px", color: "#333" }}>Article</div>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    backgroundColor: nodeTypeColors.pathway,
                    borderRadius: "4px",
                  }}
                />
                <div style={{ fontSize: "13px", color: "#333" }}>Pathway</div>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    backgroundColor: nodeTypeColors.ontology,
                    borderRadius: "4px",
                  }}
                />
                <div style={{ fontSize: "13px", color: "#333" }}>Ontology</div>
              </div>
            </div>
          </div>

          <div>
            <div
              style={{ color: "#666", fontSize: "12px", marginBottom: "8px" }}
            >
              Concepts related to current search result presented in
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: "1px solid #ccc",
                  borderRadius: "3px",
                  backgroundColor: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />
            </div>
          </div>
        </div> */}
      </div>

      {(
        <div
          id="tooltip"
          ref={tooltipRef}
          onMouseEnter={() => {
            clearTimeout(fadeOutTimeoutRef.current);
          }}
          onMouseLeave={() => {
            // More responsive hide on mouse leave
            fadeOutTimeoutRef.current = setTimeout(() => {
              setTooltipVisible(false);
              activeNodeRef.current = null;
            }, 200);
          }}
          style={{
            position: "absolute",
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            background: "#fff",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "13px",
            color: "#333",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            width: "200px",
            pointerEvents: "auto",
            opacity: tooltipVisible ? 1 : 0,
            display: tooltipVisible ? "block" : "none",
            transform: "translateY(0px)",
            transition: "opacity 0.15s, display 0.15s, left 0.15s, top 0.15s",
            transitionBehavior: "allow-discrete",
            willChange: "transform, opacity", // Performance hint for smoother animations
            wordWrap: "break-word",
          }}
        >
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
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "row", gap: "200px" }}>
        {/* Zoom buttons */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "0px",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
            borderRadius: "8px",
          }}
        >
          <button
            onClick={handleZoomIn}
            className="zoom-button"
            style={{
              marginBottom: "8px",
              backgroundColor: "#ffffff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            <img
              src={zoomInIcon}
              alt="Zoom In"
              width={40}
              height={40}
              style={{ display: "block" }}
            />
          </button>
          <button
            onClick={handleZoomOut}
            className="zoom-button"
            style={{
              backgroundColor: "#ffffff",
              border: "none",
              borderRadius: "4px",

              cursor: "pointer",
            }}
          >
            <img
              src={zoomOutIcon}
              alt="Zoom Out"
              width={40}
              height={40}
              style={{ display: "block" }}
            />
          </button>
        </div>

        {/* Legend */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            left: "20px",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            padding: "24px",
            borderRadius: "8px",
            boxShadow: legendVisible ? "0 1px 4px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.2)",
            zIndex: 10,
            userSelect: "none",
            height: "fit-content",
            width: legendVisible ? "450px" : "100px",
            opacity: legendVisible ? 1 : 0.5,
            transition: "width 0.3s, height 0.3s, opacity 0.3s, box-shadow 0.3s",
          }}
        >
          {/* Title */}
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#172A3A" }}>
              Legend
            </div>
            <IconButton
              onClick={() => setLegendVisible(!legendVisible)}
              style={{ padding: "0px 4px" }}
            >
              {legendVisible ? (
                <KeyboardArrowLeftIcon style={{ color: "#172A3A", fontSize: "20px" }} />
              ) : (
                <KeyboardArrowRightIcon style={{ color: "#172A3A", fontSize: "20px" }} />
              )}
            </IconButton>
          </div>
          <Collapse in={legendVisible} timeout="auto">
            <div style={{ width: "430px", paddingTop: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "4px", fontSize: "12px" }}>
                <LegendItem type="　　" sx={{ backgroundColor: "#D9D9D9", color: "black", height: "10px" }} />
                Core Nodes
                <LegendItem type="　　" sx={{ backgroundColor: "white", color: "black", border: "1px solid #D9D9D9", height: "10px" }} />
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
                {
                  Object.keys(nodeLabels).map((type) => (
                    <LegendItem
                      type={type}
                      key={type}
                    />
                  ))
                }
              </div>
            </div>
          </Collapse>
        </div>
      </div>
    </div>
  );
}
