import React, { useEffect, useRef } from 'react';
import Cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import cola from 'cytoscape-cola';
import { useSelector } from 'react-redux';

Cytoscape.use(coseBilkent);
Cytoscape.use(cola);

const colorMap = {
  gene: "#ABD0F1",
  sequence_variant: "#FFB77F",
  pathway: "#F6C957",
  ontology : "#8c561b",
  article:"#e377c2",
  open_chromatin_region: "#8c564b",
};

function KnowledgeGraph() {
  const queryVisResult = useSelector((state) => state.queryVisResult?.queryVisResult) || {};
  const { aiAnswer, queryAiAnswerStatus } = useSelector((state) => state.aiAnswer);
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  console.log(queryVisResult);
  useEffect(() => {
    if (containerRef.current && queryVisResult?.results?.[0]) {
      const result = queryVisResult.results[0];
      const geneNode = result.gene_node;
      
      // 处理两种可能的数据格式
      let extendNodes = [];
      if (result.all_extend_nodes) {
        // 第一种格式：使用 all_extend_nodes
        extendNodes = Array.isArray(result.all_extend_nodes) ? result.all_extend_nodes : [];
      } else {
        // 第二种格式：合并各种类型的 extend nodes
        const extendNodeArrays = [
          result.extend_node_snps,
          result.extend_node_genes,
          result.extend_node_pathways,
          result.extend_node_ontologies,
          result.extend_node_articles,
          result.extend_node_ocrs
        ].filter(Array.isArray);
        
        extendNodes = extendNodeArrays.flat();
      }
      
      // 处理两种可能的关系数据格式
      let relationships = [];
      if (result.all_extend_rels) {
        // 第一种格式：使用 all_extend_rels
        relationships = Array.isArray(result.all_extend_rels) ? result.all_extend_rels : [];
      } else {
        // 第二种格式：合并各种类型的关系
        const relationshipArrays = [
          result.r_extend_snps,
          result.r_extend_genes,
          result.r_extend_pathways,
          result.r_extend_ontologies,
          result.r_extend_articles,
          result.r_extend_ocrs
        ].filter(Array.isArray);
        
        relationships = relationshipArrays.flat();
      }

      // 计算周围有效节点的总数
      const surroundingNodes = [
        result.snp_node,
        ...extendNodes
      ].filter(node => node && node['~id']);

      // 添加文章节点到总数计算中
      const totalNodes = surroundingNodes.length + (aiAnswer?.article?.[0] ? 1 : 0);

      // 根据节点数量调整节点大小和布局参数
      const nodeWidth = totalNodes <= 3 ? 180 : 120;
      const nodeHeight = totalNodes <= 3 ? 40 : 40;
      const fontSize = totalNodes <= 3 ? '20px' : '16px';
      const radius = totalNodes <= 3 ? 300 : 240;

      // 创建所有节点数据
      const nodes = [
        // 中心基因节点
        {
          data: {
            id: geneNode['~id'],
            label: geneNode['~properties']?.HGNC_symbol === 'nan' ? geneNode['~id'] : (geneNode['~properties']?.HGNC_symbol || geneNode['~id']),
            color: colorMap.gene,
            borderWidth: 2,
            borderColor: colorMap.gene,
            width: nodeWidth,
            height: nodeHeight,
            fontSize: fontSize,
            isMainNode: true
          },
          position: { x: 500, y: 250 }
        }
      ];

      // 创建边的数据
      const edges = [];

      // 添加其他节点并计算它们的位置
      let currentIndex = 0;

      // 如果存在 SNP 节点，添加它
      if (result.snp_node) {
        const angle = (2 * Math.PI * currentIndex) / totalNodes;
        nodes.push({
          data: {
            id: result.snp_node['~id'],
            label: result.snp_node['~id'],
            color: colorMap.sequence_variant,
            width: nodeWidth,
            height: nodeHeight,
            fontSize: fontSize,
            isMainNode: true
          },
          position: {
            x: 500 + radius * Math.cos(angle),
            y: 250 + radius * Math.sin(angle)
          }
        });
        currentIndex++;
      }

      // 如果存在文章，添加文章节点和边
      if (aiAnswer?.article?.[0]) {
        const angle = (2 * Math.PI * currentIndex) / totalNodes;
        nodes.push({
          data: {
            id: 'article_node',
            label: 'PMID: ' + aiAnswer.article[0],
            color: colorMap.article,
            width: nodeWidth,
            height: nodeHeight,
            fontSize: fontSize
          },
          position: {
            x: 500 + radius * Math.cos(angle),
            y: 250 + radius * Math.sin(angle)
          }
        });

        // 添加文章和中心基因之间的边
        edges.push({
          data: {
            id: `article_to_gene`,
            source: 'article_node',
            target: geneNode['~id'],
            label: 'mentioned'
          }
        });
        
        currentIndex++;
      }

      // 添加其他扩展节点
      surroundingNodes.forEach((node, index) => {
        if (node && node['~id'] && node['~id'] !== result.snp_node?.['~id']) {
          const angle = (2 * Math.PI * currentIndex) / totalNodes;
          nodes.push({
            data: {
              id: node['~id'],
              label: node['~properties']?.HGNC_symbol || node['~id'],
              color: getNodeColor(getNodeType(node)),
              width: nodeWidth,
              height: nodeHeight,
              fontSize: fontSize
            },
            position: {
              x: 500 + radius * Math.cos(angle),
              y: 250 + radius * Math.sin(angle)
            }
          });
          currentIndex++;
        }
      });

      // 处理主要边
      if (result.snp_node && result.r) {
        edges.push({
          data: {
            source: result.snp_node['~id'],
            target: geneNode['~id'],
            label: getEdgeLabel(result.snp_node, geneNode)
          }
        });
      }

      // 处理扩展边
      if (Array.isArray(relationships)) {
        edges.push(...relationships
          .filter(edge => edge && edge['~start'] && edge['~end'])
          .map(edge => {
            const sourceNode = [...surroundingNodes, geneNode]
              .find(node => node['~id'] === edge['~start']);
            const targetNode = [...surroundingNodes, geneNode]
              .find(node => node['~id'] === edge['~end']);
            
            return {
              data: {
                source: edge['~start'],
                target: edge['~end'],
                label: sourceNode && targetNode ? getEdgeLabel(sourceNode, targetNode) : ''
              }
            };
          }));
      }

      cyRef.current = Cytoscape({
        container: containerRef.current,
        elements: [...nodes, ...edges],
        style: [
          {
            selector: 'node',
            style: {
              'shape': 'round-rectangle',
              'width': 'data(width)',
              'height': 'data(height)',
              'background-color': 'white',
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'font-size': 'data(fontSize)',
              'font-weight': 'bold',
              'color': '#000000',
              'border-width': '2px',
              'border-color': 'data(color)',
              'border-opacity': 0.8,
              'padding': '10px',
              'text-wrap': 'wrap',
            }
          },
          {
            selector: 'node[isMainNode]',
            style: {
              'background-color': 'data(color)'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#666',
              'target-arrow-color': '#666',
              'target-arrow-shape': 'triangle',
              'arrow-scale': 1.5,
              'curve-style': 'straight',
              'label': 'data(label)',
              'font-size': '16px',
              'text-rotation': 'autorotate',
              'text-margin-y': -5,
              'text-background-color': '#F7F7F7',
              'text-background-opacity': 1,
              'text-background-padding': '2px'
            }
          },
          {
            selector: 'edge[label = "interact"]',
            style: {
              'width': 2,
              'line-color': '#666',
              'target-arrow-color': '#666',
              'source-arrow-color': '#666',
              'target-arrow-shape': 'triangle',
              'source-arrow-shape': 'triangle',
              'arrow-scale': 1.5,
              'curve-style': 'straight',
              'label': 'data(label)',
              'font-size': '10px',
              'text-rotation': 'autorotate',
              'text-margin-y': -5,
              'text-background-color': '#fff',
              'text-background-opacity': 1,
              'text-background-padding': '2px'
            }
          }
        ],
        layout: {
          name: 'preset',
          fit: false,
          padding: 100,
          zoom: 0.8,
          pan: { x: -100, y: 50 }
        },
        userZoomingEnabled: false,
        userPanningEnabled: false,
      });

      // 添加点击事件处理
      cyRef.current.on('click', 'node', function(evt) {
        const node = evt.target;
        console.log(node.id());
        if (node.id() === 'article_node') {
          const articleId = node.data('label');
          if (articleId) {
            window.open(`https://pubmed.ncbi.nlm.nih.gov/${articleId}`, '_blank');
          }
        }
      });

      return () => {
        if (cyRef.current) {
          cyRef.current.destroy();
        }
      };
    }
  }, [queryVisResult, aiAnswer]);

  // 根据节点类型返回颜色
  const getNodeColor = (nodeType) => {
    switch (nodeType) {
      case 'gene':
        return colorMap.gene;
      case 'sequence_variant':
        return colorMap.sequence_variant;
      case 'pathway':
        return colorMap.pathway;
      case 'ontology':
        return colorMap.ontology;
      case 'open_chromatin_region':
        return colorMap.open_chromatin_region;
      default:
        return colorMap.sequence_variant;
    }
  };

  // 添加一个新的辅助函数来获取节点类型
  const getNodeType = (node) => {
    const labels = node['~labels'];
    if (!labels) return null;
    
    // 尝试从labels中找到匹配colorMap中的类型
    for (const label of labels) {
      if (label in colorMap) {
        return label;
      }
    }
    return labels[0]; // 如果没有匹配的，返回第一个label
  };

  // 添加一个新的辅助函数来确定边的标签
  const getEdgeLabel = (sourceNode, targetNode) => {
    const sourceType = getNodeType(sourceNode);
    const targetType = getNodeType(targetNode);
    
    if ((sourceType === 'gene' && targetType === 'sequence_variant') ||
        (sourceType === 'sequence_variant' && targetType === 'gene')) {
      return 'eQTL of';
    }
    
    if (sourceType === 'gene' && targetType === 'gene') {
      return 'interact';
    }

    if ((sourceType === 'open_chromatin_region' && targetType === 'gene') ||
        (sourceType === 'gene' && targetType === 'open_chromatin_region')) {
      return 'locate in';
    }

    if ((sourceType === 'pathway' && targetType === 'gene') ||
        (sourceType === 'gene' && targetType === 'pathway')) {
      return 'belong to';
    }

    if ((sourceType === 'ontology' && targetType === 'gene') ||
        (sourceType === 'gene' && targetType === 'ontology')) {
      return 'annotated by';
    }

    if ((sourceType === 'article' && targetType === 'gene') ||
        (sourceType === 'gene' && targetType === 'article')) {
      return 'mentioned';
    }
    
    return ''; // 默认返回空字符串
  };

  return (
    <div ref={containerRef} style={{
      width: 685,
      height: 472,
      backgroundColor: '#F7F7F74D',
      borderRadius: '10px',
    }} />
  );
}

export default KnowledgeGraph;
