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
  open_chromatin_region: "#8c564b"
};

function IntermediateKG() {
  const queryVisResult = useSelector((state) => state.queryVisResult?.queryVisResult);
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const conversionTable = require('../utils/conversion_table.json');

  useEffect(() => {
    if (!containerRef.current || !queryVisResult?.results?.[0]) {
      return;
    }

    const { nodes, relationships } = queryVisResult.results[0];
    
    // 创建节点数据
    const cyNodes = nodes.map(node => ({
      group: 'nodes',
      data: {
        id: node.id,
        label: node.symbol || node.id,
        color: node.type.includes('gene') ? colorMap.gene : colorMap.sequence_variant,
        width: 120,
        height: 40,
        fontSize: '14px'
      }
    }));

    // 创建边的数据
    const cyEdges = relationships.map((rel, index) => ({
      group: 'edges',
      data: {
        id: `e${index}`,
        source: rel.start,
        target: rel.end,
        label: generateEdgeLabel(rel.data_source, conversionTable)
      }
    }));

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
            'color': '#000000',
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
            'font-size': '12px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10
          }
        }
      ],
      layout: {
        name: 'cose-bilkent',
        animate: false,
        randomize: false,
        idealEdgeLength: 200,
        nodeRepulsion: 6000,
        padding: 50,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        fit: false,
      },
      zoom: 0.8,
      minZoom: 0.5,
      maxZoom: 2,
      pan: { x: 250, y: 250 },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      wheelSensitivity: 0.1,
    });

    cyRef.current = cy;

    // 添加点击事件
    cy.on('tap', 'node', function(evt) {
      const node = evt.target;
      console.log('Clicked node:', node.id());
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [queryVisResult]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        backgroundColor: 'white',
        borderRadius: '8px'
      }} 
    />
  );
}

export default IntermediateKG;
