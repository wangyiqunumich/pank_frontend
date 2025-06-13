import graphSchema from '../schema/graph_viewer_schema.json';

export const nodeAutoWidth = (node) => {
  const ctx = document.createElement('canvas').getContext("2d");
  const fStyle = node.pstyle('font-style').strValue;
  const size = node.pstyle('font-size').pfValue + 'px';
  const family = node.pstyle('font-family').strValue;
  const weight = node.pstyle('font-weight').strValue;

  ctx.font = fStyle + ' ' + weight + ' ' + size + ' ' + family;
  return ctx.measureText(node.data('label')).width;
};

export const nodeAutoHeight = (node) => {
  const ctx = document.createElement('canvas').getContext("2d");
  const fStyle = node.pstyle('font-style').strValue;
  const size = node.pstyle('font-size').pfValue + 'px';
  const family = node.pstyle('font-family').strValue;
  const weight = node.pstyle('font-weight').strValue;

  ctx.font = fStyle + ' ' + weight + ' ' + size + ' ' + family;
  const metrics = ctx.measureText(node.data('label'));
  return metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
};

const defaultNodeStyle = {
  shape: "round-rectangle",
  "background-color": "white",
  "border-width": "1px",
  "border-color": "black",
  label: "data(label)",
  "font-size": "6px",
  "text-valign": "center",
  color: "#fff",
  width: nodeAutoWidth,
  height: nodeAutoHeight,
  "text-margin-y": "0.5px",
  padding: "4px",
  "text-outline-width": 0,
  "text-outline-color": "#fff",
  "text-outline-opacity": 0,
}

const defaultEdgeStyle = {
  width: 1,
  "line-color": "#d3d3d3",
  "target-arrow-color": "#545454",
  "target-arrow-shape": "vee",
  "arrow-scale": 0.4,
  "curve-style": "bezier",
  "label": "data(label)",
  "font-size": "4px",
  "text-background-opacity": 1,
  "text-background-color": "#F9FAFB",
  "color": "#000",
}

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

export const nodeColors = Object.fromEntries(
  Object.entries(graphSchema.nodes).map(([key, value]) => [key, value.node_color])
);

export const nodeTextColors = Object.fromEntries(
  Object.entries(graphSchema.nodes).map(([key, value]) => [key, value.text_color])
);

export const nodeLabels = Object.fromEntries(
  Object.entries(graphSchema.nodes).map(([key, value]) => [key, value.node_label])
);

export const edgeLabels = Object.fromEntries(
  Object.entries(graphSchema.edges).map(([key, value]) => [key, value.edge_label])
);

export const edgeLabelColors = Object.fromEntries(
  Object.entries(graphSchema.edges).map(([key, value]) => [key, value.text_color])
);

export const edgeIsInverted = Object.fromEntries(
  Object.entries(graphSchema.edges).map(([key, value]) => [key, value.inverted === "TRUE"])
);

export const legendSchema = graphSchema.legend;

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

const edgeColorsList = Object.keys(edgeLabels).reduce(
  (acc, type) => (
    [
      ...acc,
      {
        type,
        color: edgeLabelColors[type] || "#000",
      }
    ]
  ), []);

export const nodeStyle = nodeColorsList.map(({ color, type }) => ({
  // Core nodes style
  selector: `node[type = "${type}"][Level = "Core"]`,
  style: {
    ...defaultNodeStyle,
    "background-color": color,
    "border-color": color,
    color: nodeTextColors[type] || "#000",
  }
})).concat(
  nodeColorsList.map(({ color, type }) => ({
    // Neighbor nodes style
    selector: `node[type = "${type}"][Level = "Neighbor"]`,
    style: {
      ...defaultNodeStyle,
      "border-color": color,
      color: "#333",
    }
  }))
).concat([{
  selector: "edge",
  style: defaultEdgeStyle,
}])
  .concat(
    edgeColorsList.map(({ color, type }) => ({
      // Edge style
      selector: `edge[type = "${type}"]`,
      style: {
        ...defaultEdgeStyle,
        "color": color,
      },
    }))
  )
  .concat([
    // Node active state
    {
      selector: "node:active",
      style: {
        "overlay-padding": "0px",
        "overlay-opacity": 0,
      },
    },
  ]);

console.log("nodeStyle", nodeStyle);
