const nodeAutoWidth = (node) => {
  const ctx = document.createElement('canvas').getContext("2d");
  const fStyle = node.pstyle('font-style').strValue;
  const size = node.pstyle('font-size').pfValue + 'px';
  const family = node.pstyle('font-family').strValue;
  const weight = node.pstyle('font-weight').strValue;

  ctx.font = fStyle + ' ' + weight + ' ' + size + ' ' + family;
  return ctx.measureText(node.data('name')).width;
};

export const nodeColors = {
  "coding_elements;gene": "#A4D0F6",
  "variants;sequence_variant;snp": "#FFB371",
  "ontology;pathway": "#FFDE7D",
  "ontology;cell_type": "#FFDE7D",
  "ocr": "#61ECBC",
  "article": "#F5BEFF"
};

export const nodeLabels = {
  "coding_elements;gene": "Gene",
  "variants;sequence_variant;snp": "SNP",
  "ontology;pathway": "Ontology",
  "ocr": "OCR",
  "article": "Literature",
};

const nodeColorsList = Object.keys(nodeColors).reduce(
  (acc, type) => (
    [
      ...acc,
      {
        type,
        color: nodeColors[type],
      }
    ]
  ), []);
console.log("nodeColorsList", nodeColorsList);

export const nodeStyle = nodeColorsList.map(({ color, type }) => ({
  // Core nodes style
  selector: `node[type = "${type}"][Level = "Core"]`,
  style: {
    shape: "round-rectangle",
    "background-color": color,
    label: type === "coding_elements;gene" ? "data(name)" : "data(id)",
    "font-size": "6px",
    "text-valign": "center",
    color: "#fff",
    width: nodeAutoWidth,
    height: "6px",
    padding: "5px",
    "text-outline-width": 0,
    "text-outline-color": "#fff",
    "text-outline-opacity": 0,
  },
})).concat(
  nodeColorsList.map(({ color, type }) => ({
    // Neighbor nodes style
    selector: `node[type = "${type}"][Level = "Neighbor"]`,
    style: {
      shape: "round-rectangle",
      "background-opacity": 0,
      "border-width": 2,
      "border-color": color,
      label: type === "coding_elements;gene" ? "data(name)" : "data(id)",
      "font-size": "6px",
      "text-valign": "center",
      color: "#333",
      width: nodeAutoWidth,
      height: "6px",
      padding: "5px",
      "text-outline-width": 0,
      "text-outline-color": "#fff",
      "text-outline-opacity": 0,
    },
  }))
).concat([
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
]);

console.log("nodeStyle", nodeStyle);
