export const getContrastingColor = (bgColor) => {
  if (!/^#[0-9A-F]{6}$/i.test(bgColor)) {
    return 'black';
  }
  const hex = bgColor.replace(/^#/, '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? 'black' : 'white';
}

const nodeAutoWidth = (node) => {
  const ctx = document.createElement('canvas').getContext("2d");
  const fStyle = node.pstyle('font-style').strValue;
  const size = node.pstyle('font-size').pfValue + 'px';
  const family = node.pstyle('font-family').strValue;
  const weight = node.pstyle('font-weight').strValue;

  ctx.font = fStyle + ' ' + weight + ' ' + size + ' ' + family;
  return ctx.measureText(node.data('label')).width;
};

export const nodeColors = {
  "coding_elements": "#A4D0F6",
  "variants": "#FFB371",
  "ontology": "#FFDE7D",
  "OCR": "#61ECBC",
  "article": "#F5BEFF"
};

export const nodeLabels = {
  "coding_elements": "Gene",
  "variants": "SNP",
  "ontology": "Ontology",
  "OCR": "OCR",
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
    label: "data(label)",
    "font-size": "6px",
    "text-valign": "center",
    color: getContrastingColor(color),
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
      "background-opacity": 1,
      "background-color": "white",
      "border-width": 2,
      "border-color": color,
      label: "data(label)",
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
