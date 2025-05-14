"use client";

import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import graphData from "./data/example_cypher_query_result.json";
import positionData from "./data/example_x_y.json";
import zoomInIcon from "../image/zoomIn.png";
import zoomOutIcon from "../image/zoomOut.png";
import { nodeStyle } from "./style.js";

// Define the node type colors for the legend
const nodeTypeColors = {
  gene: "#ABD0F1", // Blue color for protein_coding/gene nodes
  sequence_variant: "#FFB77F", // Orange color for SNP/sequence_variant nodes
  pathway: "#F6C957", // Yellow color for pathway nodes
  article: "#e377c2", // Pink color for article nodes
  ontology: "#B57E47", // Brown color for ontology nodes
};

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
    const result = graphData.results[0];
    const uniqueNodesMap = {};
    result.nodes.forEach((node) => (uniqueNodesMap[node["~id"]] = node));
    const nodes = Object.values(uniqueNodesMap).map((node) => {
      // Determine type based on the labels
      const type = node["~labels"].includes("gene")
        ? "protein_coding"
        : node["~labels"].includes("variants")
        ? "SNP"
        : node["~labels"].includes("pathway")
        ? "pathway"
        : node["~labels"].includes("article")
        ? "article"
        : node["~labels"].includes("ontology")
        ? "ontology"
        : "other";
      // Use the provided positionData and extract the Level property.
      const posData = positionData[node["~id"]] || {
        x: Math.random() * 600 + 100,
        y: Math.random() * 400 + 100,
        Level: "C",
      };
      const pos = { x: posData.x, y: posData.y };
      return {
        data: {
          id: node["~id"],
          ...node["~properties"],
          type,
          Level: posData.Level,
        },
        position: pos,
      };
    });

    const uniqueEdgesMap = {};
    result.edges.forEach((edge) => (uniqueEdgesMap[edge["~id"]] = edge));
    const edges = Object.values(uniqueEdgesMap).map((edge) => ({
      data: {
        id: edge["~id"],
        source: edge["~start"],
        target: edge["~end"],
        ...edge["~properties"],
      },
    }));

    cyRef.current = cytoscape({
      container: document.getElementById("cy-container"),
      elements: { nodes, edges },
      style: nodeStyle,
      layout: { name: "preset" },
      zoom: 0.01,
      minZoom: 0.2,
      maxZoom: 3,
      pan: { x: 0, y: 0 },
    });

    cyRef.current.on("mouseover", "node", (evt) => {
      // Clear any existing timers immediately
      clearTimeout(hoverTimeoutRef.current);
      clearTimeout(fadeOutTimeoutRef.current);

      document.body.style.cursor = "pointer";
      activeNodeRef.current = evt.target;

      const nodeData = evt.target.data();
      const { x, y } = evt.renderedPosition;
      const container = document.getElementById("cy-container");
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      // Calculate tooltip offset based on node position
      // If node is in the right half of the screen, show tooltip to the left
      // If node is in the bottom half of the screen, show tooltip above
      const isRightSide = x > containerWidth / 2;
      const isBottomSide = y > containerHeight / 2;

      // Calculate tooltip x position
      const tooltipX = isRightSide
        ? x - 120 // Tooltip appears left of the node
        : x + 70; // Tooltip appears right of the node

      // Calculate tooltip y position
      const tooltipY = isBottomSide
        ? y - 100 // Tooltip appears above the node
        : y + 20; // Tooltip appears below the node

      setHoveredData(nodeData);
      setTooltipPosition({ x: tooltipX, y: tooltipY });

      // Use a shorter delay for better responsiveness
      hoverTimeoutRef.current = setTimeout(() => {
        setTooltipVisible(true);
      }, 80);
    });

    cyRef.current.on("mouseout", "node", (evt) => {
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
    });

    cyRef.current.on("cxttap", "node", (evt) => {
      setTooltipVisible(false);
      hideContextMenu();
      contextNodeRef.current = evt.target;
      const menu = document.getElementById("context-menu");
      menu.style.left = `${evt.originalEvent.clientX}px`;
      menu.style.top = `${evt.originalEvent.clientY}px`;
      menu.style.display = "block";
    });

    document.addEventListener("click", hideContextMenu);
    return () => {
      if (cyRef.current) cyRef.current.destroy();
      document.removeEventListener("click", hideContextMenu);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        id="cy-container"
        style={{
          width: "100%",
          height: "600px",
          backgroundColor: "#fff", // Restored to white as requested
          border: "1px solid #ddd",
          borderRadius: "8px",
          position: "relative", // Add this for absolute positioning inside
          overflow: "hidden", // To keep contents within rounded corners
        }}
      >
        <div
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
        </div>
      </div>

      {tooltipVisible && hoveredData && (
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
            maxWidth: "320px",
            pointerEvents: "auto",
            opacity: 1, // Always fully visible when rendered
            transform: "translateY(0px)",
            transition: "opacity 0.15s ease-out, transform 0.15s ease-out",
            willChange: "transform, opacity", // Performance hint for smoother animations
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
            {hoveredData.HGNC_symbol || hoveredData.id}
          </div>
          {Object.entries(hoveredData).map(
            ([key, value]) =>
              key !== "type" &&
              (key === "link" ? (
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
            right: "20px",
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
            bottom: 20,
            left: 20,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            background: "#fff",
            padding: "12px",
            borderRadius: "8px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            zIndex: 10,
            userSelect: "none",
          }}
        >
          {/* Title */}
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#172A3A" }}>
            Legend
          </div>

          {/* Search‑result pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "12px", color: "#666" }}>
              Search result:
            </span>

            {/* map these instead if you like */}
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "12px",
                backgroundColor: nodeTypeColors.gene,
                fontSize: "12px",
                color: "#172A3A",
              }}
            >
              Gene
            </span>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "12px",
                backgroundColor: nodeTypeColors.sequence_variant,
                fontSize: "12px",
                color: "#172A3A",
              }}
            >
              Sequence variant
            </span>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "12px",
                backgroundColor: nodeTypeColors.pathway,
                fontSize: "12px",
                color: "#172A3A",
              }}
            >
              Pathway
            </span>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "12px",
                backgroundColor: nodeTypeColors.article,
                fontSize: "12px",
                color: "#172A3A",
              }}
            >
              Article
            </span>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "12px",
                backgroundColor: nodeTypeColors.ontology,
                fontSize: "12px",
                color: "#172A3A",
              }}
            >
              Ontology
            </span>
          </div>

          {/* Related‑concept indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#666" }}>
              Concepts related to current search result presented in
            </span>
            <span
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "3px",
                border: "1px solid #ccc",
                background: "#fff",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
