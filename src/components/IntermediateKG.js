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
    
    // 计算每种类型节点的数量
    const typeCounts = nodes.reduce((acc, node) => {
      if (node.type.includes('gene')) acc.gene++;
      else if (node.type.includes('credible_set')) acc.credible_set++;
      else if (node.type.includes('sequence_variant')) acc.variant++;
      return acc;
    }, { gene: 0, credible_set: 0, variant: 0 });

    // 计算总高度和起始位置
    const totalHeight = Math.max(typeCounts.credible_set, typeCounts.variant) * 100;
    const startY = 250 - (totalHeight / 2);

    // 创建节点数据
    const typeCount = {
      gene: 0,
      credible_set: 0,
      variant: 0
    };

    const cyNodes = nodes.map(node => {
      const baseNodeConfig = {
        group: 'nodes',
        data: {
          id: node.id,
          label: node.symbol || node.id,
          color: node.type.includes('gene') ? colorMap.gene : 
                 node.type.includes('credible_set') ? '#43978F' :
                 colorMap.sequence_variant,
          width: 120,
          height: 40,
          fontSize: '14px'
        }
      };

      let yOffset;
      if (node.type.includes('gene')) {
        // 基因节点居中
        return {
          ...baseNodeConfig,
          position: { x: 100, y: 250 }
        };
      } else if (node.type.includes('credible_set')) {
        yOffset = startY + (typeCount.credible_set++ * 100);
        return {
          ...baseNodeConfig,
          position: { x: 400, y: yOffset }
        };
      } else if (node.type.includes('sequence_variant')) {
        // 找到对应的 credible_set 节点的位置
        const relatedEdge = relationships.find(rel => 
          (rel.start === node.id || rel.end === node.id) && 
          nodes.find(n => (n.id === rel.start || n.id === rel.end) && n.type.includes('credible_set'))
        );
        
        if (relatedEdge) {
          const credibleSetNode = nodes.find(n => 
            n.type.includes('credible_set') && 
            (n.id === relatedEdge.start || n.id === relatedEdge.end)
          );
          const credibleSetIndex = nodes
            .filter(n => n.type.includes('credible_set'))
            .findIndex(n => n.id === credibleSetNode.id);
          yOffset = startY + (credibleSetIndex * 100);
        } else {
          yOffset = startY + (typeCount.variant++ * 100);
        }
        
        return {
          ...baseNodeConfig,
          position: { x: 700, y: yOffset }
        };
      }
    });

    // 创建边的数据
    const cyEdges = relationships.map((rel, index) => {
      const sourceNode = nodes.find(node => node.id === rel.start);
      const targetNode = nodes.find(node => node.id === rel.end);
      
      let label = generateEdgeLabel(rel.data_source, conversionTable);
      
      // 如果是从 credible_set 到 snp 的边，修改标签为 "lead SNP"
      if (targetNode?.type.includes('credible_set') && sourceNode?.type.includes('sequence_variant')) {
        label = 'lead SNP';
      }
      
      return {
        group: 'edges',
        data: {
          id: `e${index}`,
          source: rel.end,  // 保持反转的方向
          target: rel.start,
          label: label
        }
      };
    });

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
            'text-margin-y': -10,
            'text-background-color': '#F7F7F74D'
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
        width: 685,
        height: 472,
        backgroundColor: '#F7F7F74D',
        borderRadius: '8px',
        textAlign: 'left'
      }} 
    />
  );
}

export default IntermediateKG;
