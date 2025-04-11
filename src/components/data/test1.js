// graphData.js
export const graphData = {
  elements: [
    // Type 1 Nodes (Rounded Rectangle, Blue)
    {
      data: { id: "Node1", label: "Node 1", type: "type1" },
      position: { x: 200, y: 200 },
    },
    {
      data: { id: "Node2", label: "Node 2", type: "type1" },
      position: { x: 200, y: 300 },
    },

    // Type 2 Nodes (Ellipse, Green)
    {
      data: { id: "Node3", label: "Node 3", type: "type2" },
      position: { x: 400, y: 250 },
    },

    // Edges
    {
      data: {
        id: "edge1",
        source: "Node1",
        target: "Node3",
        label: "connects to",
      },
    },
    {
      data: {
        id: "edge2",
        source: "Node2",
        target: "Node3",
        label: "links to",
      },
    },
  ],
  style: [
    // Style for Type 1 Nodes (Rounded Rectangle, Blue)
    {
      selector: 'node[type="type1"]',
      style: {
        shape: "round-rectangle",
        "background-color": "#4D9DE0",
        width: 120,
        height: 50,
        label: "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "16px",
        color: "#ffffff",
        "border-width": 2,
        "border-color": "#337AB7",
      },
    },

    {
      selector: 'node[type="type2"]',
      style: {
        shape: "ellipse",
        "background-color": "#88C057",
        width: 80,
        height: 80,
        label: "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "16px",
        color: "#ffffff",
        "border-width": 2,
        "border-color": "#6C9F45",
      },
    },

    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#999",
        "target-arrow-color": "#999",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        label: "data(label)",
        "font-size": "12px",
        "text-rotation": "autorotate",
        color: "#666",
      },
    },
  ],
  layout: {
    name: "preset",
    fit: true,
    padding: 50,
  },
};
