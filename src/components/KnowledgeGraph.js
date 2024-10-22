import React, { useEffect, useRef } from 'react';
import Cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

Cytoscape.use(coseBilkent);

function KnowledgeGraph({ exactData, extendData }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const mainNodes = [
        { data: { id: 'rs73920612', label: 'rs73920612', type: 'main' } },
        { data: { id: 'ENSG00000138092', label: 'ENSG00000138092', type: 'main' } }
      ];

      const mainEdge = {
        data: {
          id: 'main-edge',
          source: 'rs73920612',
          target: 'ENSG00000138092',
          label: 'eQTL_of',
          type: 'main'
        }
      };

      const extendNodes = [
        { data: { id: 'ENSG00000138031', label: 'ENSG00000138031', type: 'extend' } }
      ];

      const extendEdges = [
        {
          data: {
            id: 'extend-edge-1',
            source: 'rs73920612',
            target: 'ENSG00000138031',
            label: 'eQTL_of',
            type: 'extend'
          }
        },
        {
          data: {
            id: 'extend-edge-2',
            source: 'rs73920612',
            target: 'ENSG00000138031',
            label: 'eQTL_credible_set',
            type: 'extend'
          }
        }
      ];

      const elements = [...mainNodes, mainEdge, ...extendNodes, ...extendEdges];

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
          name: 'cose-bilkent',
          animate: false,
          randomize: false,
          idealEdgeLength: 100,
          edgeElasticity: 0.45,
          nodeRepulsion: 4500,
          nestingFactor: 0.1,
          gravity: 0.25,
          numIter: 2500,
          tile: true,
          tilingPaddingVertical: 10,
          tilingPaddingHorizontal: 10,
          fit: true,
          padding: 30,
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

      // Add toolbox buttons
      const toolbox = document.createElement('div');
      toolbox.style.position = 'absolute';
      toolbox.style.top = '10px';
      toolbox.style.right = '10px';
      toolbox.style.display = 'flex';
      toolbox.style.flexDirection = 'column';

      const createButton = (text, onClick) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.onclick = onClick;
        button.style.marginBottom = '5px';
        return button;
      };

      toolbox.appendChild(createButton('Zoom In', handleZoomIn));
      toolbox.appendChild(createButton('Zoom Out', handleZoomOut));
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
  }, [exactData, extendData]);

  return <div ref={containerRef} style={{ width: '1000px', height: '600px', position: 'relative' }} />;
}

export default KnowledgeGraph;
