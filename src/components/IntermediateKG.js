import React, { useEffect, useRef } from 'react';
import Cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import { getGeneSymbol, generateEdgeLabel } from '../utils/textProcessing';
import { nodeAutoWidth } from './style.js';

Cytoscape.use(coseBilkent);

const colorMap = {
  gene: "#ABD0F1",
  sequence_variant: "#FFB77F",
  pathway: "#F6C957",
  ontology: "#8c561b",
  article: "#e377c2",
  open_chromatin_region: "#8c564b",
  credible_set: '#43978F',
};

function IntermediateKG({ data }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const conversionTable = require('../utils/conversion_table.json');

  useEffect(() => {
    if (!containerRef.current || !data?.credible_sets?.[0]) {
      return;
    }
    console.log('data', data);
    const intersectPositions = data.intersectPositions || [];
    const credible_sets = data.credible_sets;
    const edgeOrientation = 'right';
    const edgeLabels = {
      left: generateEdgeLabel(credible_sets[0].data_source, conversionTable),
      right: data.type === "qtl_lead" ? "lead SNP" : "SNP"
    }
    const graphPaths = credible_sets.map((credible_set) => (
      {
        left: getGeneSymbol(credible_set.credible_set_id),
        mid: credible_set.credible_set,
        right: credible_set.snp
      }
    ));

    const typesDetail = {
      'left': 'gene',
      'mid': 'credible_set',
      'right': 'sequence_variant'
    };

    const nodes =
      ["left", "mid", "right"].flatMap((type) => (
        (intersectPositions.includes(type)
          ? [graphPaths[0]]
          : graphPaths
        ).map((path, index) => (
          {
            id: `node_${type}_${index}`,
            index: index,
            type: type,
            label: path[type]
          }
        ))
      ));

    const helper = (type, index) => (
      intersectPositions.includes(type)
        ? `node_${type}_0`
        : `node_${type}_${index}`
    );

    const edges = Array.from({ length: graphPaths.length }, (_, i) => ({
      id: `edge_left_${i}`,
      start: helper("left", i),
      end: helper("mid", i),
      label: edgeLabels.left
    })).concat(
      Array.from({ length: graphPaths.length }, (_, i) => ({
        id: `edge_mid_${i}`,
        start: helper("mid", i),
        end: helper("right", i),
        label: edgeLabels.right
      }))
    ).map((rel) => (
      edgeOrientation === 'left'
        ? { ...rel, start: rel.end, end: rel.start }
        : rel
    ));

    const totalHeight = (graphPaths.length - 1) * 100;
    const startY = 250 - (totalHeight / 2);

    const cyNodes = nodes.map(node => {
      const baseNodeConfig = {
        group: 'nodes',
        data: {
          id: node.id,
          label: node.label,
          color: colorMap[typesDetail[node.type]],
        },
        locked: true
      };
      // 基因节点居中
      return {
        ...baseNodeConfig,
        position: {
          x: ({ left: 0, mid: 450, right: 800 })[node.type],
          y: intersectPositions.includes(node.type)
            ? 250
            : (startY + node.index * 100)
        }
      };

    });

    // 创建边的数据
    const cyEdges = edges.map((rel, index) => (
      {
        group: 'edges',
        data: {
          id: rel.id,
          source: rel.start,
          target: rel.end,
          label: rel.label,
        }
      }
    ));

    // 确保在创建新实例前销毁旧实例
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = Cytoscape({
      container: containerRef.current,
      elements: {
        nodes: cyNodes,
        edges: cyEdges
      },
      style: [
        {
          selector: 'node',
          style: {
            'shape': 'round-rectangle',
            'height': '20px',
            'background-color': 'data(color)',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '20px',
            'padding': '15px',
            'corner-radius': '16px',
            'color': 'white',
            'width': nodeAutoWidth,
            'text-wrap': 'wrap'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#666',
            'target-arrow-color': '#666',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '18px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10
          }
        }
      ],
      layout: {
        name: 'preset',  // 使用preset布局以保持固定位置
        fit: true,
        padding: 50
      },
      userZoomingEnabled: false,
      userPanningEnabled: false,
    });

    cyRef.current = cy;

    // 添加点击事件
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      // console.log('Clicked node:', node.id());
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      style={{
        width: 672,
        height: 472,
        backgroundColor: '#F7F7F74D',
        borderRadius: '8px',
        textAlign: 'left'
      }}
    />
  );
}

export default IntermediateKG;
