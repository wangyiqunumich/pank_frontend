"use client";

import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import graphData from "./data/example_cypher_query_result.json";
import positionData from "./data/example_x_y.json";

export default function KnowledgeGraph() {
  const cyRef = useRef(null);
  const contextNodeRef = useRef(null);
  const [deletedItems, setDeletedItems] = useState([]);
  const [redoItems, setRedoItems] = useState([]);
  const [hoveredData, setHoveredData] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const hideContextMenu = () => {
    const menu = document.getElementById("context-menu");
    if (menu) menu.style.display = "none";
    contextNodeRef.current = null;
  };

  const handleDeleteNode = () => {
    if (contextNodeRef.current && cyRef.current) {
      const nodeToDelete = contextNodeRef.current;
      const nodeJson = nodeToDelete.json();
      const connectedEdges = nodeToDelete
        .connectedEdges()
        .map((edge) => edge.json());
      const uniqueEdges = [];
      const edgeIds = new Set();
      connectedEdges.forEach((edge) => {
        if (!edgeIds.has(edge.data.id)) {
          edgeIds.add(edge.data.id);
          uniqueEdges.push(edge);
        }
      });
      const deletedItem = { node: nodeJson, edges: uniqueEdges };
      setDeletedItems((prev) => [...prev, deletedItem]);
      setRedoItems([]);
      nodeToDelete.remove();
      contextNodeRef.current = null;
    }
    hideContextMenu();
  };

  const handleUndo = () => {
    if (deletedItems.length > 0 && cyRef.current) {
      const lastDeletedItem = deletedItems[deletedItems.length - 1];
      cyRef.current.batch(() => {
        if (
          !cyRef.current.getElementById(lastDeletedItem.node.data.id).nonempty()
        ) {
          cyRef.current.add(lastDeletedItem.node);
        }
        lastDeletedItem.edges.forEach((edgeJson) => {
          if (!cyRef.current.getElementById(edgeJson.data.id).nonempty()) {
            const source = cyRef.current.getElementById(edgeJson.data.source);
            const target = cyRef.current.getElementById(edgeJson.data.target);
            if (source.nonempty() && target.nonempty()) {
              cyRef.current.add(edgeJson);
            }
          }
        });
      });
      setDeletedItems((prev) => prev.slice(0, -1));
      setRedoItems((prev) => [...prev, lastDeletedItem]);
    }
  };

  const handleRedo = () => {
    if (redoItems.length > 0 && cyRef.current) {
      const lastRedoItem = redoItems[redoItems.length - 1];
      const node = cyRef.current.getElementById(lastRedoItem.node.data.id);
      if (node.nonempty()) node.remove();
      setRedoItems((prev) => prev.slice(0, -1));
      setDeletedItems((prev) => [...prev, lastRedoItem]);
    }
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
      style: [
        // Protein Coding nodes: Core (filled)
        {
          selector: 'node[type = "protein_coding"][Level = "C"]',
          style: {
            shape: "round-rectangle",
            "background-color": "#a8d0e6",
            label: "data(HGNC_symbol)",
            "font-size": "6px",
            "text-valign": "center",
            color: "#333",
            width: "label",
            height: "label",
            padding: "5px",
            cursor: "pointer",
            "text-outline-width": 0.5,
            "text-outline-color": "#fff",
            "text-outline-opacity": 0.5,
          },
        },
        // Protein Coding nodes: Neighbor (transparent fill, colored border)
        {
          selector: 'node[type = "protein_coding"][Level = "N"]',
          style: {
            shape: "round-rectangle",
            "background-opacity": 0,
            "border-width": 2,
            "border-color": "#a8d0e6",
            label: "data(HGNC_symbol)",
            "font-size": "6px",
            "text-valign": "center",
            color: "#333",
            width: "label",
            height: "label",
            padding: "5px",
            cursor: "pointer",
            "text-outline-width": 0.5,
            "text-outline-color": "#fff",
            "text-outline-opacity": 0.5,
          },
        },
        // SNP nodes: Core (filled)
        {
          selector: 'node[type = "SNP"][Level = "C"]',
          style: {
            shape: "round-rectangle",
            "background-color": "#ffb3ba",
            label: "data(id)",
            "font-size": "6px",
            "text-valign": "center",
            color: "#333",
            width: "label",
            height: "label",
            padding: "5px",
            cursor: "pointer",
            "text-outline-width": 0.5,
            "text-outline-color": "#fff",
            "text-outline-opacity": 0.5,
          },
        },
        // SNP nodes: Neighbor (transparent fill, colored border)
        {
          selector: 'node[type = "SNP"][Level = "N"]',
          style: {
            shape: "round-rectangle",
            "background-opacity": 0,
            "border-width": 2,
            "border-color": "#ffb3ba",
            label: "data(id)",
            "font-size": "6px",
            "text-valign": "center",
            color: "#333",
            width: "label",
            height: "label",
            padding: "5px",
            cursor: "pointer",
            "text-outline-width": 0.5,
            "text-outline-color": "#fff",
            "text-outline-opacity": 0.5,
          },
        },
        // Ontology nodes: Core (filled)
        {
          selector: 'node[type = "ontology"][Level = "C"]',
          style: {
            shape: "round-rectangle",
            "background-color": "#b8e1a3",
            label: "data(id)",
            "font-size": "6px",
            "text-valign": "center",
            color: "#333",
            width: "label",
            height: "label",
            padding: "5px",
            cursor: "pointer",
            "text-outline-width": 0.5,
            "text-outline-color": "#fff",
            "text-outline-opacity": 0.5,
          },
        },
        // Ontology nodes: Neighbor (transparent fill, colored border)
        {
          selector: 'node[type = "ontology"][Level = "N"]',
          style: {
            shape: "round-rectangle",
            "background-opacity": 0,
            "border-width": 2,
            "border-color": "#b8e1a3",
            label: "data(id)",
            "font-size": "6px",
            "text-valign": "center",
            color: "#333",
            width: "label",
            height: "label",
            padding: "5px",
            cursor: "pointer",
            "text-outline-width": 0.5,
            "text-outline-color": "#fff",
            "text-outline-opacity": 0.5,
          },
        },
        // Node active state
        {
          selector: "node:active",
          style: {
            "overlay-padding": "0px",
            "overlay-opacity": 0,
          },
        },
        // Edge style
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "#d3d3d3",
            "target-arrow-color": "#545454",
            "target-arrow-shape": "vee",
            "arrow-scale": 0.8,
            "curve-style": "bezier",
          },
        },
      ],
      layout: { name: "preset" },
      zoom: 0.01,
      minZoom: 0.2,
      maxZoom: 3,
      pan: { x: 0, y: 0 },
    });

    cyRef.current.on("mouseover", "node", (evt) => {
      document.body.style.cursor = "pointer";

      const nodeData = evt.target.data();

      // 'renderedPosition' gives you the on-screen pixel coords of the node center
      const { x, y } = evt.renderedPosition;
      // Now compute the final tooltip position
      setTooltipPosition({
        x: x + 70, //20 is offset, change this
        y: y + 70,
      });

      setHoveredData(nodeData);
      setTimeout(() => {
        if (!document.getElementById("tooltip")?.matches(":hover")) {
          setTooltipVisible(true);
        }
      }, 200); // time delay for hover meny fading in
    });

    cyRef.current.on("mouseout", "node", () => {
      document.body.style.cursor = "default";
      setTimeout(() => {
        if (!document.getElementById("tooltip")?.matches(":hover")) {
          setTooltipVisible(false);
        }
      }, 500); //mouse delay for hover menu fading out
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

  // useEffect(() => {
  //   const handleClickOutsideTooltip = (e) => {
  //     const tooltipElement = document.getElementById("tooltip");
  //     if (tooltipElement && !tooltipElement.contains(e.target)) {
  //       setTooltipVisible(false);
  //     }
  //   };

  //   document.addEventListener("click", handleClickOutsideTooltip);
  //   return () => {
  //     document.removeEventListener("click", handleClickOutsideTooltip);
  //   };
  // }, []);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "8px",
          backgroundColor: "#f5f5f7",
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <button onClick={handleDeleteNode} style={{ marginRight: "8px" }}>
          🗑️ Delete
        </button>
        <button onClick={handleUndo} style={{ marginRight: "8px" }}>
          ↩️ Undo
        </button>
        <button onClick={handleRedo}>↪️ Redo</button>
      </div>
      <div
        id="cy-container"
        style={{
          width: "500px",
          height: "450px",
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          borderBottomLeftRadius: "8px",
          borderBottomRightRadius: "8px",
        }}
      />
      {tooltipVisible && hoveredData && (
        <div
          id="tooltip"
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
            src="/zoomIn.png"
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
            src="/zoomOut.png"
            alt="Zoom Out"
            width={40}
            height={40}
            style={{ display: "block" }}
          />
        </button>
      </div>
    </div>
  );
}
