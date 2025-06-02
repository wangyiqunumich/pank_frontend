import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Container, Link, Autocomplete, TextField, MenuItem, Button, FormControl, InputLabel, Snackbar, Alert } from '@mui/material';
import landingPageLogo from '../image/landing image cropped.png';
import SearchBar from '../SearchBar';
import { useNavigate, useLocation } from 'react-router-dom';
import TerminalIcon from '@mui/icons-material/Terminal';
import Question from './Question';
import { useDispatch, useSelector } from 'react-redux';
import { queryVocab } from '../redux/inputToVocabSlice'; // Import the action
import Popper from '@mui/material/Popper';
import { nodeAutoWidth } from './style.js';
import './styles.css';

import Cytoscape from "cytoscape";

// Color utilities and constants
const getContrastingColor = (bgColor) => {
  if (!/^#[0-9A-F]{6}$/i.test(bgColor)) {
    return "black";
  }
  const hex = bgColor.replace(/^#/, "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "black" : "white";
};

const nodeColors = {
  gene: "#A4D0F6",
  snp: "#FFB371",
  ontology: "#FFDE7D",
  OCR: "#61ECBC",
  article: "#F5BEFF",
};

const nodeLabels = {
  gene: "Gene",
  snp: "SNP",
  ontology: "Ontology",
  OCR: "Open Chromatin Region",
  article: "Literature",
};

const edgeLabels = {
  OCR_in_cell_type: "accessible in",
  OCR_locate_in: "located in",
  express_in: "expressed in",
  function_annotation: "has function",
  fine_mapped_eQTL: "QTL for",
  regulation: "interact with",
};

// Add a simple graph viewer component for the match page
// const MatchGraphViewer = ({ visualPattern, selectedQuestion }) => {
//   const containerRef = useRef(null);
//   const cyRef = useRef(null);

//   useEffect(() => {
//     if (!containerRef.current || !selectedQuestion) {
//       return;
//     }

//     // Parse the question to determine the visualization structure
//     const parseQuestionStructure = (question) => {
//       // Different question patterns and their corresponding visualizations

//       // Pattern 1: "Which (SNP) serves as the quantitative trait locus (QTL) for {CFTR}?"
//       if (question.includes("(SNP)") && question.includes("(QTL)")) {
//         let geneMatch = question.match(/\{([^}]+)\}/);
//         let geneName = geneMatch ? geneMatch[1] : "Gene";
//         if(geneName.includes('(')){
//           geneName = geneName.split('(')[0];
//         }
//         return {
//           type: "snp_qtl_gene",
//           nodes: [
//             {
//               id: "snp",
//               label: "SNP",
//               color: nodeColors.variants,
//               nodeType: "variants",
//               position: { x: 100, y: 150 },
//             },
//             {
//               id: "gene",
//               label: geneName,
//               color: nodeColors.coding_elements,
//               nodeType: "coding_elements",
//               position: { x: 400, y: 150 },
//             },
//           ],
//           edges: [
//             { id: "qtl_rel", source: "snp", target: "gene", label: "QTL of" },
//           ],
//         };
//       }

//       // Pattern 2: "Is {Gene} has GWAS signal associated with (T1D)?"
//       else if (question.includes("GWAS") && question.includes("(T1D)")) {
//         const geneMatch = question.match(/\{([^}]+)\}/);
//         const geneName = geneMatch ? geneMatch[1] : "Gene";
//         return {
//           type: "gene_gwas_t1d",
//           nodes: [
//             {
//               id: "gene",
//               label: geneName,
//               color: nodeColors.coding_elements,
//               nodeType: "coding_elements",
//               position: { x: 100, y: 150 },
//             },
//             {
//               id: "t1d",
//               label: "T1D",
//               color: nodeColors.ontology,
//               nodeType: "ontology",
//               position: { x: 400, y: 150 },
//             },
//           ],
//           edges: [
//             {
//               id: "gwas_rel",
//               source: "gene",
//               target: "t1d",
//               label: "GWAS signal",
//             },
//           ],
//         };
//       }

//       // Pattern 3: "Find the GWAS-QTL co-localization contribute to T1D?"
//       else if (
//         question.includes("GWAS-QTL") &&
//         question.includes("co-localization")
//       ) {
//         return {
//           type: "gwas_qtl_colocalization",
//           nodes: [
//             {
//               id: "gwas",
//               label: "GWAS\nSignal",
//               color: nodeColors.article,
//               nodeType: "article",
//               position: { x: 50, y: 100 },
//             },
//             {
//               id: "qtl",
//               label: "QTL\nSignal",
//               color: nodeColors.variants,
//               nodeType: "variants",
//               position: { x: 50, y: 200 },
//             },
//             {
//               id: "colocalization",
//               label: "Co-localization",
//               color: nodeColors.OCR,
//               nodeType: "OCR",
//               position: { x: 250, y: 150 },
//             },
//             {
//               id: "t1d",
//               label: "T1D",
//               color: nodeColors.ontology,
//               nodeType: "ontology",
//               position: { x: 450, y: 150 },
//             },
//           ],
//           edges: [
//             {
//               id: "gwas_coloc",
//               source: "gwas",
//               target: "colocalization",
//               label: "contributes to",
//             },
//             {
//               id: "qtl_coloc",
//               source: "qtl",
//               target: "colocalization",
//               label: "contributes to",
//             },
//             {
//               id: "coloc_t1d",
//               source: "colocalization",
//               target: "t1d",
//               label: "contributes to",
//             },
//           ],
//         };
//       }

//       // Pattern 4: "How is {CFTR}'s expression in {β cells} and it's link to T1D?"
//       else if (
//         question.includes("expression") &&
//         question.includes("link to T1D")
//       ) {
//         const geneMatch = question.match(/\{([^}]+)\}/);
//         const cellMatch = question.match(/\{([^}]+)\}/g);
//         const geneName = geneMatch ? geneMatch[1] : "Gene";
//         const cellType =
//           cellMatch && cellMatch[1]
//             ? cellMatch[1].replace(/[{}]/g, "")
//             : "β cells";

//         return {
//           type: "gene_expression_cells_t1d",
//           nodes: [
//             {
//               id: "gene",
//               label: geneName,
//               color: nodeColors.coding_elements,
//               nodeType: "coding_elements",
//               position: { x: 80, y: 150 },
//             },
//             {
//               id: "expression",
//               label: "Gene\nExpression",
//               color: nodeColors.OCR,
//               nodeType: "OCR",
//               position: { x: 250, y: 100 },
//             },
//             {
//               id: "cells",
//               label: cellType,
//               color: nodeColors.article,
//               nodeType: "article",
//               position: { x: 250, y: 200 },
//             },
//             {
//               id: "t1d",
//               label: "T1D",
//               color: nodeColors.ontology,
//               nodeType: "ontology",
//               position: { x: 420, y: 150 },
//             },
//           ],
//           edges: [
//             {
//               id: "gene_expr",
//               source: "gene",
//               target: "expression",
//               label: "expressed as",
//             },
//             {
//               id: "expr_cells",
//               source: "expression",
//               target: "cells",
//               label: "in",
//             },
//             {
//               id: "expr_t1d",
//               source: "expression",
//               target: "t1d",
//               label: "linked to",
//             },
//           ],
//         };
//       }

//       // Default pattern - simple SNP -> Gene relationship
//       else {
//         const geneMatch = question.match(/\{([^}]+)\}/);
//         const geneName = geneMatch ? geneMatch[1] : "Gene";
//         let geneId = "";

//         // Extract gene ID from visual pattern if available
//         if (visualPattern) {
//           const geneIdMatch = visualPattern.match(/@([^@]+)@/);
//           geneId = geneIdMatch ? geneIdMatch[1] : "";
//         }

//         return {
//           type: "default_snp_gene",
//           nodes: [
//             {
//               id: "snp",
//               label: "SNP",
//               color: nodeColors.variants,
//               nodeType: "variants",
//               position: { x: 100, y: 150 },
//             },
//             {
//               id: "gene",
//               label: geneId ? `${geneName}\n(${geneId})` : geneName,
//               color: nodeColors.coding_elements,
//               nodeType: "coding_elements",
//               position: { x: 400, y: 150 },
//             },
//           ],
//           edges: [
//             { id: "eqtl", source: "snp", target: "gene", label: "eQTL of" },
//           ],
//         };
//       }
//     };

//     const structure = parseQuestionStructure(selectedQuestion);

//     // Create Cytoscape nodes
//     const cyNodes = structure.nodes.map((node) => ({
//       group: "nodes",
//       data: {
//         id: node.id,
//         label: node.label,
//         color: node.color,
//         textColor: getContrastingColor(node.color),
//         nodeType: node.nodeType,
//         width: node.label.includes("\n") ? 140 : 120,
//         height: node.label.includes("\n") ? 60 : 46,
//         fontSize: node.label.length > 15 ? "14px" : "16px",
//       },
//       position: node.position,
//       locked: true,
//     }));

//     // Create Cytoscape edges
//     const cyEdges = structure.edges.map((edge) => ({
//       group: "edges",
//       data: {
//         id: edge.id,
//         source: edge.source,
//         target: edge.target,
//         label: edge.label,
//       },
//     }));

//     // Destroy previous instance if exists
//     if (cyRef.current) {
//       cyRef.current.destroy();
//     }

//     const cy = Cytoscape({
//       container: containerRef.current,
//       elements: [...cyNodes, ...cyEdges],
//       style: [
//         {
//           selector: "node",
//           style: {
//             shape: "roundrectangle",
//             width: "data(width)",
//             height: "data(height)",
//             "background-color": "data(color)",
//             label: "data(label)",
//             "text-valign": "center",
//             "text-halign": "center",
//             "font-size": "data(fontSize)",
//             color: "data(textColor)",
//             "text-wrap": "wrap",
//             "font-weight": "bold",
//             "border-width": 2,
//             "border-color": "data(color)",
//             "corner-radius": 16,
//             padding: "5px",
//           },
//         },
//         {
//           selector: "edge",
//           style: {
//             width: 3,
//             "line-color": "#666",
//             "target-arrow-color": "#666",
//             "target-arrow-shape": "triangle",
//             "curve-style":
//               structure.type === "gwas_qtl_colocalization"
//                 ? "bezier"
//                 : "straight",
//             label: "data(label)",
//             "font-size": "14px",
//             "text-margin-y": -20,
//             "font-weight": "bold",
//             color: "#333",
//             "text-background-opacity": 1,
//             "text-background-color": "white",
//             "text-background-padding": "2px",
//           },
//         },
//       ],
//       layout: {
//         name: "preset",
//         fit: true,
//         padding: 30,
//       },
//       userZoomingEnabled: false,
//       userPanningEnabled: false,
//     });

//     cyRef.current = cy;

//     return () => {
//       if (cyRef.current) {
//         cyRef.current.destroy();
//       }
//     };
//   }, [visualPattern, selectedQuestion]);

//   return (
//     <div
//       ref={containerRef}
//       style={{
//         width: "100%",
//         height: "220px",
//         backgroundColor: "#F7F7F74D",
//         borderRadius: "8px",
//         border: "1px solid #E0E0E0",
//       }}
//     />
//   );
// };

// match string "{aaa@bbb@} - xxx -> {ccc@ddd@}" to {
// sourceType: aaa, sourceId: bbb, targetType: ccc, targetId: ddd, relationship: xxx
// and then render a graph with Cytoscape

const MatchGraphViewer = ({ visualPattern, selectedQuestion }) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !selectedQuestion) {
      return;
    }
    // Parse the visual pattern to determine the nodes and edges
    const parseVisualPattern = (pattern) => {
      const nodes = (pattern.match(/\{[^\}]+\}|\([^\)]+\)/g) || [])
        .map(
          (node) => (node.match(/\{(?<type>[^@]+)@(?<id>[^@]+)@\}/)?.groups
            || node.match(/\((?<type>[^\}]+)\)/)?.groups) || {}
        );
      const edge = pattern.match(/- (.+) ->/)?.[1] || '';
      return { nodes, edge };
    };

    const { nodes, edge } = parseVisualPattern(visualPattern);
    console.log("Visual pattern:", visualPattern);
    console.log("Parsed nodes:", nodes, "Parsed edge:", edge);
    // suppose nodes.length = 2, ignore other cases

    if (nodes.length !== 2) {
      console.error("Invalid visual pattern format. Expected 2 nodes.");
      return;
    }

    // Create Cytoscape nodes
    const cyNodes = nodes.map((node, index) => ({
      group: "nodes",
      data: {
        id: `node${index}`,
        label: node.id || nodeLabels[node.type],
        color: nodeColors[node.type] || "#CCCCCC",
      },
      locked: true,
      position: {
        x: index === 0 ? 100 : 400,
        y: 150,
      }
    }));

    const cyEdges = [
      {
        group: "edges",
        data: {
          id: "edge0",
          source: "node0",
          target: "node1",
          label: edgeLabels[edge] || edge || "related to",
        },
      },
    ];

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
            'padding': '16px',
            'corner-radius': '16px',
            'color': 'black',
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

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [visualPattern, selectedQuestion]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "220px",
        backgroundColor: "#F7F7F74D",
        borderRadius: "8px",
        border: "1px solid #E0E0E0",
      }}
    />
  );
};



function MatchPage() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [qid, setQid] = useState('');
  const dispatch = useDispatch();
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);
  const [geneId, setGeneId] = useState('');
  const [cellId, setCellId] = useState('');
  const [snpId, setSnpId] = useState('');
  const [geneOptions, setGeneOptions] = useState([]);
  const [cellOptions, setCellOptions] = useState([]);
  const [snpOptions, setSnpOptions] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const questionData = location.state;
  const [visualPattern, setVisualPattern] = useState(questionData.pattern_for_the_matched_page);

  const partofquestion = questionData.question.split(/(\s+|\{.*?\}|\(.*?\))/); // 根据{} 或（）将字符串分割成部分，其余按照空格分割成部分
  const dictionary = partofquestion.reduce((acc, part, index) => {
    if (part.startsWith('{') && part.endsWith('}')) {
      acc[index] = part.slice(1, -1).split('@')[0]; // Extract the type from the part
    }
    return acc;
  }, {});
  // console.log('dictionary', dictionary);

  // Extract this page's question and qid from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const questionFromUrl = params.get('question'); // 获取'question'参数
    const qidFromUrl = params.get('qid'); // 获取'qid'参数
    if (questionFromUrl) {
      setSelectedQuestion(decodeURIComponent(questionFromUrl)); // 解码问题并设置它 
      setQid(qidFromUrl);
    }
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize);
    return (_) => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);


  // Handle submit button click
  const handleSubmit = () => {
    if (selectedQuestion.startsWith('What is')) {
      const url = `/result?sourceTerm=gene:${geneId.split('(')[1].slice(0, -1)}&targetTerm=cell_type:CL_0002064&relationship=express_in`
      navigate(url);
    }
    else {
      let updatedTerms = questionData.terms;
      if (geneId) {
        updatedTerms = updatedTerms.replace('gene', `gene:${geneId}`);
      }
      if (cellId) {
        updatedTerms = updatedTerms.replace('cell_type', `cell_type:${cellId}`);
      }
      if (snpId) {
        updatedTerms = updatedTerms.replace('snp', `snp:${snpId}`);
      }
      const parts = updatedTerms.split('-')
      console.log('visualPatternParts', parts);
      const sourceTerm = parts[0].trim();
      const relationTerm = parts[1].trim();
      const target = parts[2].trim();
      let targetSymbol = '';
      let targetTerm = '';
      if (target.includes('(')) {
        targetSymbol = target.split('(')[0].split(':')[1];
        targetTerm = `gene:${target.split('(')[1].slice(0, -1)}`;
      }
      else {
        targetSymbol = '';
        targetTerm = target;
      }
      // const consequenceMatch = selectedQuestion.match(/\{(.*?)\}|\(.*?\)/g);
      // const sourceTerm = consequenceMatch[0] ? consequenceMatch[0].replace(/[{}()]/g, '') : '';
      // const relationTerm = consequenceMatch[1] ? consequenceMatch[1].match(/\((.*?)\)/)[1] : '';
      // const target = consequenceMatch[2] ? consequenceMatch[2].replace(/[{})]/g, '') : '';
      let url = `/intermediate?sourceTerm=${sourceTerm.toLowerCase()}&relationship=${relationTerm}&targetTerm=${targetTerm}`;
      if (targetSymbol) {
        url += `&targetSymbol=${targetSymbol}`;
      }
      navigate(url);
    }
  };

  function updateSource(newInputValue, type, index) {
    const geneName = newInputValue;
    dispatch(queryVocab({ input: geneName })).unwrap()
      .then((response) => {
        if (response && typeof response.result === 'string') {
          console.log('response', response);
          const parsedResponse = response.result.split('@');
          if (parsedResponse.length > 1) {
            let id;
            if (parsedResponse[1] == parsedResponse[2]) {
              id = parsedResponse[1];
            } else {
              id = `${geneName}(${parsedResponse[1]})`
            }
            if (type === 'gene' && parsedResponse[0] === 'gene') {
              setGeneOptions([id]);
            }
            else if (type === 'cell' && parsedResponse[0] === 'cell_type') {
              setCellOptions([id]);
            }
            else if (type === 'snp' && parsedResponse[0] === 'sequence_variant') {
              setSnpOptions([id]);
            } else {
              const errorMessage = `Wrong input type`;
              if (type === 'gene') {
                setGeneOptions([{ label: errorMessage, disabled: true }]);
              } else if (type === 'cell') {
                setCellOptions([{ label: errorMessage, disabled: true }]);
              } else if (type === 'snp') {
                setSnpOptions([{ label: errorMessage, disabled: true }]);
              }
            }

          }
        }
      });
  };

  function renderSequence() {
    const sequence = selectedQuestion || ''; // 使用选定的问题或空字符串
    const parts = sequence.split(/(\s+|\{.*?\}|\(.*?\))/); // 根据{} 或（）将字符串分割成部分，其余按照空格分割成部分
    return parts.map((part, index) => {
      if (part.startsWith('(') && part.endsWith(')')) {
        return (
          <Box
            key={index}
            sx={{
              // backgroundColor: '#F2F6FC',
              // border: '1px dotted #95A6A6',
              // padding: '2px 8px',
              // borderRadius: '8px',
              // marginRight: '8px',
              // display: 'inline-block',
              fontStyle: 'italic',
              fontFamily: 'Open Sans',
              fontWeight: 600,
            }}
          >
            {part.slice(1, -1)} {/* Remove the enclosing parentheses */}
          </Box>
        );
      } else if (part.startsWith('{') && part.endsWith('}')) {
        const type = dictionary[index];
        return (
          <Box key={index} sx={{ display: 'inline-flex', alignItems: 'center', marginLeft: '-8px' }} >
            <Autocomplete
              freeSolo
              options={type === 'gene' ? geneOptions : type === 'cell' ? cellOptions : snpOptions}
              getOptionDisabled={(option) => option.disabled}
              className={dictionary[index]}
              onInputChange={(event, newInputValue) => {
                if (newInputValue) {
                  updateSource(newInputValue, type);
                  setIsSubmitDisabled(!options.includes(newInputValue));
                } else {
                  if (type === 'gene') {
                    setGeneOptions([]);
                  }
                  else if (type === 'cell') {
                    setCellOptions([]);
                  } else if (type === 'snp') {
                    setSnpOptions([]);
                  }
                  setIsSubmitDisabled(true);
                }
              }}
              onChange={(event, newValue) => {
                if (newValue) {
                  if (type === 'gene') {
                    setGeneId(newValue);
                  }
                  else if (type === 'cell') {
                    setCellId(newValue);
                  } else if (type === 'snp') {
                    setSnpId(newValue);
                  }

                  if (selectedQuestion) {
                    setSelectedQuestion((prevQuestion) => {
                      if (!prevQuestion) return '';
                      return prevQuestion.replace(`{${part.slice(1, -1)}}`, `{${newValue}}`);
                    });
                  }
                  setIsSubmitDisabled(!newValue);
                }
              }}
              PopperComponent={(props) => (
                <Popper {...props} style={{ width: 'fit-content !important' }} />
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={part.slice(1, -1).split('@')[1]}
                  onChange={(e) => {
                    setInputValue(e.target.value);  // 更新输入值
                    if (e.target.value) {
                      updateSource(e.target.value);
                    }
                  }}
                  sx={{
                    width: 'auto !important',
                    fontFamily: 'Open Sans',
                    fontWeight: 600,
                    mx: 1,
                    '& .MuiAutocomplete-input': {
                      width: '60px !important',
                    },
                    '& .MuiOutlinedInput-root': {
                      width: '100%',
                      padding: '0!important',
                      '& fieldset': {
                        border: 'none',
                      },
                      '&:hover fieldset': {
                        border: 'none',
                      },
                      '&.Mui-focused fieldset': {
                        border: 'none',
                      },
                    },
                    '& .MuiInputBase-input': {
                      padding: '2px 18px 2px 8px !important',
                    },
                  }}
                />
              )}
            />
          </Box>
        );
      } else {
        // Render plain text for other parts
        return (
          <Typography
            key={index}
            sx={{
              marginRight: '4px',
              display: 'inline-block',
              fontFamily: 'Open Sans',
              fontWeight: 600,
            }}
          >
            {part}
          </Typography>
        );
      }
    });
  };

  useEffect(() => {
    if (selectedQuestion) {
      let connectedString = visualPattern;
      if (geneId) {
        connectedString = connectedString.replace(/\{gene@.*?@}/, `{gene@${geneId}@}`);
      }
      if (cellId) {
        connectedString = connectedString.replace(/\{ontology@.*?@}/, `{ontology@${cellId}@}`);
      }
      if (snpId) {
        connectedString = connectedString.replace(/\{snp@.*?@}/, `{snp@${snpId}@}`);
      }
      setVisualPattern(connectedString);

    }
  }, [selectedQuestion, geneId, cellId, snpId]);



  return (
    <Container maxWidth={false} disableGutters sx={{
      display: 'flex',
      flexDirection: { sm: 'column', md: 'row' }, justifyContent: 'center',
      flex: 1, alignItems: 'top',
      paddingTop: '40px',
      paddingLeft: { sm: 0, md: '10%' },
      paddingRight: { sm: 0, md: '10%' },
      paddingBottom: '40px',
      gap: { sm: 0, md: '40px' },
    }}>

      {/* 左侧图片 */}
      <Box sx={{
        width: { sm: '100%', md: '50%' },
        marginTop: { sm: '0px', md: '60px' },
        display: 'block',
        textAlign: 'left',
        '& img': {
          width: '80%',
          objectFit: 'contain',
        }
      }}>
        <img src={landingPageLogo} alt="PanKgraph" />
        <Box sx={{ width: '80%', display: 'flex', justifyContent: 'center', marginTop: '20px', alignItems: 'center' }}>
          <TerminalIcon sx={{ width: '30px', color: '#C48E25' }} />
          <Typography sx={{ marginLeft: '10px', fontSize: '20px' }}>
            Access PanKgraph with <Link
              href={process.env.REACT_APP_PANKGRAPH_LINK + '/api'}
              sx={{ textDecoration: 'underline', color: 'black', textAlign: 'right' }}>API</Link>
          </Typography>
        </Box>
      </Box>

      {/* 右侧内容区域 */}
      <Box sx={{
        width: { sm: '80%', md: '50%' },
        height: '100%',
        marginTop: { sm: '0px', md: '20px' },
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        backgroundColor: '#E4F0F1',
        borderRadius: '20px',
        padding: 3,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{
            fontSize: 28,
            fontWeight: 700,
            textAlign: 'left',
            fontFamily: 'Open Sans',
          }}>
            {questionData.matched_page_title}
          </Typography>
          <Link
            href="/"
            sx={{
              textDecoration: 'underline',
              color: '#398289',
              fontSize: 16,
              fontWeight: 600,
              fontFamily: 'Open Sans',
              cursor: 'pointer',
              marginRight: 2,
            }}
          >
            CANCEL
          </Link>
        </Box>
        <Box sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          flexDirection: 'column',
        }}>
          <Typography sx={{
            marginBottom: 2,
            color: '#398289',
            fontSize: 17,
            fontWeight: 600,
            fontFamily: 'Open Sans',
          }}>
            {questionData.matched_page_sub_title}
          </Typography>
          <Box sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            padding: 2,
            width: 'calc(100% - 32px)',
            gap: 0,
          }}>
            {renderSequence()}
          </Box>
        </Box>
        <Box sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          flexDirection: 'column',
        }}>
          <Typography sx={{
            color: '#398289',
            fontSize: 17,
            fontWeight: 600,
            fontFamily: 'Open Sans',
            marginBottom: 2,
          }}>
            Graph visualization
          </Typography>
          <Box sx={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            padding: 2,
            width: 'calc(100% - 32px)',
            fontFamily: 'Open Sans',
            fontWeight: 600,
          }}>
            {visualPattern}
            {visualPattern ? (
              <MatchGraphViewer
                visualPattern={visualPattern}
                selectedQuestion={selectedQuestion}
              />
            ) : (
              <Typography sx={{ color: "#666", fontStyle: "italic" }}>
                Select a gene to see the visualization
              </Typography>
            )}
          </Box>
        </Box>
        <Button
          variant="contained" // Use a contained button for emphasis
          color="primary" // Use the primary color
          sx={{
            backgroundColor: '#219197', // Custom background color
            color: '#FFFFFF', // Text color
            textTransform: 'none', // Prevent uppercase text
            fontSize: '16px', // Adjust font size
            fontWeight: 600, // Bold text
            borderRadius: '8px', // Rounded corners
            padding: '8px 16px', // Add padding
            fontFamily: 'Open Sans',
            '&:hover': {
              backgroundColor: '#1A7A75', // Darker shade on hover
            },
          }}
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          Submit
        </Button>


      </Box>
    </Container>
  );
};


export default MatchPage;