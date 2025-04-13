// graphData.js
export const graphData = {
  elements: [
    // Type 1 Nodes (Rounded Rectangle, Light Blue)
    {
      data: { id: "SNP1", label: "SNP1", type: "type1" },
      position: { x: 100, y: 200 },
    },
    {
      data: { id: "SNP2", label: "SNP2", type: "type1" },
      position: { x: 100, y: 300 },
    },

    // Type 2 Nodes (Ellipse, Light Green)
    {
      data: { id: "CFTR", label: "CFTR", type: "type2" },
      position: { x: 300, y: 250 },
    },
    {
      data: { id: "GeneX", label: "GeneX", type: "type2" },
      position: { x: 500, y: 250 },
    },

    // Type 3 Nodes (Hexagon, Light Orange)
    {
      data: { id: "ProteinA", label: "Protein A", type: "type3" },
      position: { x: 400, y: 100 },
    },
    {
      data: { id: "ProteinB", label: "Protein B", type: "type3" },
      position: { x: 600, y: 100 },
    },

    // Type 4 Nodes (Diamond, Light Purple)
    {
      data: { id: "Pathway1", label: "Pathway 1", type: "type4" },
      position: { x: 200, y: 400 },
    },
    {
      data: { id: "Pathway2", label: "Pathway 2", type: "type4" },
      position: { x: 400, y: 400 },
    },

    // Edges
    {
      data: {
        id: "edge1",
        source: "SNP1",
        target: "CFTR",
        label: "QTL of",
      },
    },
    {
      data: {
        id: "edge2",
        source: "SNP2",
        target: "CFTR",
        label: "QTL of",
      },
    },
    {
      data: {
        id: "edge3",
        source: "CFTR",
        target: "GeneX",
        label: "interacts with",
      },
    },
    {
      data: {
        id: "edge4",
        source: "SNP1",
        target: "GeneX",
        label: "associated with",
      },
    },
    {
      data: {
        id: "edge5",
        source: "SNP2",
        target: "GeneX",
        label: "regulates",
      },
    },
    {
      data: {
        id: "edge6",
        source: "ProteinA",
        target: "CFTR",
        label: "binds to",
      },
    },
    {
      data: {
        id: "edge7",
        source: "ProteinB",
        target: "GeneX",
        label: "inhibits",
      },
    },
    {
      data: {
        id: "edge8",
        source: "Pathway1",
        target: "CFTR",
        label: "activates",
      },
    },
    {
      data: {
        id: "edge9",
        source: "Pathway2",
        target: "GeneX",
        label: "suppresses",
      },
    },
  ],
  style: [
    // Style for Type 1 Nodes (Rounded Rectangle, Light Blue)
    {
      selector: 'node[type="type1"]',
      style: {
        shape: "round-rectangle",
        "background-color": "#ABD0F1",
        width: 120,
        height: 50,
        label: "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "18px",
        color: "#ffffff",
        "border-width": 2,
        "border-color": "#77A1D3",
      },
    },

    {
      selector: 'node[type="type2"]',
      style: {
        shape: "ellipse",
        "background-color": "#A1E3A1",
        width: 100,
        height: 100,
        label: "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "18px",
        color: "#ffffff",
        "border-width": 2,
        "border-color": "#6CB76C",
      },
    },

    // Style for Type 3 Nodes (Hexagon, Light Orange)
    {
      selector: 'node[type="type3"]',
      style: {
        shape: "hexagon",
        "background-color": "#F5D78E",
        width: 100,
        height: 100,
        label: "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "18px",
        color: "#333333",
        "border-width": 2,
        "border-color": "#E3A763",
      },
    },

    // Style for Type 4 Nodes (Diamond, Light Purple)
    {
      selector: 'node[type="type4"]',
      style: {
        shape: "diamond",
        "background-color": "#D4A5E3",
        width: 100,
        height: 100,
        label: "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "18px",
        color: "#ffffff",
        "border-width": 2,
        "border-color": "#A571C1",
      },
    },

    // Style for Edges
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#666",
        "target-arrow-color": "#666",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        label: "data(label)",
        "font-size": "14px",
        "text-rotation": "autorotate",
      },
    },
  ],
  layout: {
    name: "preset",
    fit: true,
    padding: 50,
  },
};
