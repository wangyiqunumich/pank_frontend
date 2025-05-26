import React, { useEffect, useRef } from 'react';
import Cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import { useSelector } from 'react-redux';
import { generateEdgeLabel } from '../utils/textProcessing';

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

    const getCredibleSetLabel = (nodeId, dataSource) => {
      let prefix = '';
      switch (dataSource) {
        case 'GTEx; SusieR':
          prefix = 'A';
          break;
        case 'INSPIRE; SusieR':
          prefix = 'B';
          break;
        case 'splicing; GTEx':
          prefix = 'C';
          break;
        case 'exon; INSPIRE':
          prefix = 'D';
          break;
        default:
          return nodeId;
      }

      const setNumber = nodeId.split('_').pop().slice(11);
      return `CredibleSet_${prefix}${setNumber}`;
    };

    const credible_sets = data.credible_sets;

    const root_label = data.root;

    console.log('credible_sets', credible_sets);

    const branches = credible_sets.map((credible_set) => (
      {
        edge1: generateEdgeLabel(credible_set.data_source, conversionTable),
        node1: getCredibleSetLabel(credible_set.credible_set_id, credible_set.data_source).replace('_', ' '),
        edge2: "lead SNP",
        node2: credible_set.snp
      }
    ));

    console.log('branches', branches);

    const typesDetail = {
      'root': 'gene',
      'mid': 'credible_set',
      'leaf': 'sequence_variant'
    };

    const nodes = branches.map((branch, index) => (
      [
        {
          id: `node${index * 2}`,
          index: index * 2,
          type: 'mid',
          label: branch.node1
        },
        {
          id: `node${index * 2 + 1}`,
          index: index * 2 + 1,
          type: 'leaf',
          label: branch.node2,
        }
      ]
    )).flat().concat(
      [{
        id: 'node_root',
        index: -1,
        type: 'root',
        label: root_label
      }]
    );

    const edges = branches.map((branch, index) => (
      [
        {
          id: `edge${index * 2}`,
          start: `node_root`,
          end: `node${index * 2}`,
          label: branch.edge1
        },
        {
          id: `edge${index * 2 + 1}`,
          start: `node${index * 2}`,
          end: `node${index * 2 + 1}`,
          label: branch.edge2
        }
      ]
    )).flat();

    // 计算每种类型节点的数量
    // const typeCounts = nodes.reduce((acc, node) => {
    //   if (node.type.includes('gene')) acc.gene++;
    //   else if (node.type.includes('credible_set')) acc.credible_set++;
    //   else if (node.type.includes('sequence_variant')) acc.variant++;
    //   return acc;
    // }, { gene: 0, credible_set: 0, variant: 0 });

    // const typeCounts = nodes.reduce((acc, node) => ({
    //   ...acc,
    //   [node.type]: (acc[node.type] || 0) + 1
    // }), { root: 0, mid: 0, leaf: 0 });

    const totalHeight = (branches.length - 1) * 100;
    const startY = 250 - (totalHeight / 2);

    const cyNodes = nodes.map(node => {
      const baseNodeConfig = {
        group: 'nodes',
        data: {
          id: node.id,
          label: node.label,
          color: colorMap[typesDetail[node.type]],
          width: 170,
          height: 46,
          fontSize: '20px',
        },
        locked: true
      };

      let yOffset;
      if (node.type === 'root') {
        // 基因节点居中
        return {
          ...baseNodeConfig,
          position: { x: 0, y: 250 }
        };
      } else if (node.type === 'mid') {
        yOffset = startY + (node.index * 50);
        return {
          ...baseNodeConfig,
          position: { x: 425, y: yOffset }
        };
      } else if (node.type === 'leaf') {
        yOffset = startY + ((node.index - 1) * 50);
        return {
          ...baseNodeConfig,
          position: { x: 725, y: yOffset }
        };
      }
    });

    // 创建边的数据
    const cyEdges = edges.map((rel, index) => (
      {
        group: 'edges',
        data: {
          id: rel.id,
          source: rel.end,  // 保持反转的方向
          target: rel.start,
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
      elements: [...cyNodes, ...cyEdges],
      style: [
        {
          selector: 'node',
          style: {
            'shape': 'round-rectangle',
            'width': 'data(width)',
            'height': 'data(height)',
            'background-color': 'data(color)',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': 'data(fontSize)',
            'color': 'white',
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
