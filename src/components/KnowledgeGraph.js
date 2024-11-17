import React, { useEffect, useRef } from 'react';
import Cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import cola from 'cytoscape-cola';
import { useSelector } from 'react-redux';

Cytoscape.use(coseBilkent);
Cytoscape.use(cola);

function KnowledgeGraph() {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const queryResult = useSelector((state) => state.queryResult.queryResult);
  console.log(queryResult);

  useEffect(() => {
    if (containerRef.current && queryResult?.results) {
      const nodes = new Set();
      const edges = [];

      queryResult.results.forEach(result => {
        if (result.snp_node) {
          nodes.add({
            data: {
              id: result.snp_node['~id'],
              label: result.snp_node['~id'],
              type: 'main'
            }
          });
        }

        if (result.gene_node) {
          nodes.add({
            data: {
              id: result.gene_node['~id'],
              label: result.gene_node['~id'],
              type: 'main'
            }
          });
        }

        if (result.extend_node_snp) {
          nodes.add({
            data: {
              id: result.extend_node_snp['~id'],
              label: result.extend_node_snp['~id'],
              type: 'extend',
              nodeType: 'snp'
            }
          });
        }

        if (result.extend_node_gene) {
          nodes.add({
            data: {
              id: result.extend_node_gene['~id'],
              label: result.extend_node_gene['~id'],
              type: 'extend',
              nodeType: 'gene'
            }
          });
        }

        Object.entries(result).forEach(([key, value]) => {
          if (key.startsWith('r') && value['~type']) {
            edges.push({
              data: {
                id: `edge-${value['~start']}-${value['~end']}`,
                source: value['~start'],
                target: value['~end'],
                label: value['~type'],
                type: key === 'r' ? 'main' : 'extend'
              }
            });
          }
        });
      });

      const elements = [...Array.from(nodes), ...edges];

      cyRef.current = Cytoscape({
        container: containerRef.current,
        elements: elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#4a56a6',
              'label': 'data(label)',
              'width': 20,
              'height': 20,
              'font-size': 6,
              'text-valign': 'center',
              'text-halign': 'center',
              'text-outline-color': '#fff',
              'text-outline-width': 2,
              'color': '#000'
            }
          },
          {
            selector: 'node[type="extend"]',
            style: {
              'background-color': '#a6564a',
              'opacity': 0.7
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': 5,
              'text-rotation': 'autorotate',
              'text-margin-y': -10
            }
          },
          {
            selector: 'edge[type="extend"]',
            style: {
              'line-style': 'dashed',
              'opacity': 0.7,
              'line-color': '#a6564a'
            }
          }
        ],
        layout: {
          name: 'cola',
          animate: false,
          refresh: 1,
          maxSimulationTime: 1000,
          nodeSpacing: function(node) {
            return node.data('type') === 'main' ? 100 : 50;
          },
          edgeLength: function(edge) {
            return edge.data('type') === 'main' ? 100 : 150;
          }
        }
      });

      const handleZoomIn = () => {
        cyRef.current.zoom({
          level: cyRef.current.zoom() * 1.2,
          renderedPosition: { x: containerRef.current.offsetWidth / 2, y: containerRef.current.offsetHeight / 2 }
        });
      };

      const handleZoomOut = () => {
        cyRef.current.zoom({
          level: cyRef.current.zoom() / 1.2,
          renderedPosition: { x: containerRef.current.offsetWidth / 2, y: containerRef.current.offsetHeight / 2 }
        });
      };

      const handleReset = () => {
        cyRef.current.fit();
        cyRef.current.center();
      };

      const handleSave = () => {
        const png = cyRef.current.png();
        const link = document.createElement('a');
        link.href = png;
        link.download = 'knowledge-graph.png';
        link.click();
      };

      const toolbox = document.createElement('div');
      toolbox.style.position = 'absolute';
      toolbox.style.top = '20px';
      toolbox.style.right = '20px';
      toolbox.style.display = 'flex';
      toolbox.style.flexDirection = 'column';
      toolbox.style.gap = '8px';
      toolbox.style.zIndex = '1000';
      toolbox.style.backgroundColor = 'white';
      toolbox.style.padding = '8px';
      toolbox.style.borderRadius = '4px';
      toolbox.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

      const createButton = (text, onClick) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.onclick = onClick;
        button.style.padding = '6px 12px';
        button.style.minWidth = '80px';
        button.style.backgroundColor = 'white';
        button.style.border = '1px solid #ddd';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.style.transition = 'all 0.2s';
        button.style.fontSize = '14px';
        
        button.onmouseover = () => {
          button.style.backgroundColor = '#f5f5f5';
        };
        button.onmouseout = () => {
          button.style.backgroundColor = 'white';
        };
        
        return button;
      };

      toolbox.appendChild(createButton('+', handleZoomIn));
      toolbox.appendChild(createButton('-', handleZoomOut));
      toolbox.appendChild(createButton('Reset', handleReset));
      toolbox.appendChild(createButton('Save', handleSave));

      containerRef.current.appendChild(toolbox);

      const resizeGraph = () => {
        if (cyRef.current) {
          cyRef.current.resize();
          cyRef.current.fit();
        }
      };

      window.addEventListener('resize', resizeGraph);

      return () => {
        window.removeEventListener('resize', resizeGraph);
        if (cyRef.current) {
          cyRef.current.destroy();
        }
      };
    }
  }, [queryResult]);

  return <div ref={containerRef} style={{ 
    width: '100%', 
    height: '100%', 
    position: 'relative',
    overflow: 'hidden'
  }} />;
}

export default KnowledgeGraph;
