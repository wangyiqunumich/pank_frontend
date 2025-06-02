import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Container,
  Link,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
} from "@mui/material";
import landingPageLogo from "../image/landing image cropped.png";
import SearchBar from "../SearchBar";
import { useNavigate } from "react-router-dom";
import TerminalIcon from "@mui/icons-material/Terminal";
import Question from "./Question";
import { useDispatch, useSelector } from "react-redux";
import { queryVocab } from "../redux/inputToVocabSlice"; // Import the action
import axios from "axios";
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
  coding_elements: "#A4D0F6",
  variants: "#FFB371",
  ontology: "#FFDE7D",
  OCR: "#61ECBC",
  article: "#F5BEFF",
};

const nodeLabels = {
  coding_elements: "Gene",
  variants: "SNP",
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
const MatchGraphViewer = ({ visualPattern, selectedQuestion }) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !selectedQuestion) {
      return;
    }

    // Parse the question to determine the visualization structure
    const parseQuestionStructure = (question) => {
      // Different question patterns and their corresponding visualizations

      // Pattern 1: "Which (SNP) serves as the quantitative trait locus (QTL) for {CFTR}?"
      if (question.includes("(SNP)") && question.includes("(QTL)")) {
        const geneMatch = question.match(/\{([^}]+)\}/);
        const geneName = geneMatch ? geneMatch[1] : "Gene";
        return {
          type: "snp_qtl_gene",
          nodes: [
            {
              id: "snp",
              label: "SNP",
              color: nodeColors.variants,
              nodeType: "variants",
              position: { x: 100, y: 150 },
            },
            {
              id: "gene",
              label: geneName,
              color: nodeColors.coding_elements,
              nodeType: "coding_elements",
              position: { x: 400, y: 150 },
            },
          ],
          edges: [
            { id: "qtl_rel", source: "snp", target: "gene", label: "QTL of" },
          ],
        };
      }

      // Pattern 2: "Is {Gene} has GWAS signal associated with (T1D)?"
      else if (question.includes("GWAS") && question.includes("(T1D)")) {
        const geneMatch = question.match(/\{([^}]+)\}/);
        const geneName = geneMatch ? geneMatch[1] : "Gene";
        return {
          type: "gene_gwas_t1d",
          nodes: [
            {
              id: "gene",
              label: geneName,
              color: nodeColors.coding_elements,
              nodeType: "coding_elements",
              position: { x: 100, y: 150 },
            },
            {
              id: "t1d",
              label: "T1D",
              color: nodeColors.ontology,
              nodeType: "ontology",
              position: { x: 400, y: 150 },
            },
          ],
          edges: [
            {
              id: "gwas_rel",
              source: "gene",
              target: "t1d",
              label: "GWAS signal",
            },
          ],
        };
      }

      // Pattern 3: "Find the GWAS-QTL co-localization contribute to T1D?"
      else if (
        question.includes("GWAS-QTL") &&
        question.includes("co-localization")
      ) {
        return {
          type: "gwas_qtl_colocalization",
          nodes: [
            {
              id: "gwas",
              label: "GWAS\nSignal",
              color: nodeColors.article,
              nodeType: "article",
              position: { x: 50, y: 100 },
            },
            {
              id: "qtl",
              label: "QTL\nSignal",
              color: nodeColors.variants,
              nodeType: "variants",
              position: { x: 50, y: 200 },
            },
            {
              id: "colocalization",
              label: "Co-localization",
              color: nodeColors.OCR,
              nodeType: "OCR",
              position: { x: 250, y: 150 },
            },
            {
              id: "t1d",
              label: "T1D",
              color: nodeColors.ontology,
              nodeType: "ontology",
              position: { x: 450, y: 150 },
            },
          ],
          edges: [
            {
              id: "gwas_coloc",
              source: "gwas",
              target: "colocalization",
              label: "contributes to",
            },
            {
              id: "qtl_coloc",
              source: "qtl",
              target: "colocalization",
              label: "contributes to",
            },
            {
              id: "coloc_t1d",
              source: "colocalization",
              target: "t1d",
              label: "contributes to",
            },
          ],
        };
      }

      // Pattern 4: "How is {CFTR}'s expression in {β cells} and it's link to T1D?"
      else if (
        question.includes("expression") &&
        question.includes("link to T1D")
      ) {
        const geneMatch = question.match(/\{([^}]+)\}/);
        const cellMatch = question.match(/\{([^}]+)\}/g);
        const geneName = geneMatch ? geneMatch[1] : "Gene";
        const cellType =
          cellMatch && cellMatch[1]
            ? cellMatch[1].replace(/[{}]/g, "")
            : "β cells";

        return {
          type: "gene_expression_cells_t1d",
          nodes: [
            {
              id: "gene",
              label: geneName,
              color: nodeColors.coding_elements,
              nodeType: "coding_elements",
              position: { x: 80, y: 150 },
            },
            {
              id: "expression",
              label: "Gene\nExpression",
              color: nodeColors.OCR,
              nodeType: "OCR",
              position: { x: 250, y: 100 },
            },
            {
              id: "cells",
              label: cellType,
              color: nodeColors.article,
              nodeType: "article",
              position: { x: 250, y: 200 },
            },
            {
              id: "t1d",
              label: "T1D",
              color: nodeColors.ontology,
              nodeType: "ontology",
              position: { x: 420, y: 150 },
            },
          ],
          edges: [
            {
              id: "gene_expr",
              source: "gene",
              target: "expression",
              label: "expressed as",
            },
            {
              id: "expr_cells",
              source: "expression",
              target: "cells",
              label: "in",
            },
            {
              id: "expr_t1d",
              source: "expression",
              target: "t1d",
              label: "linked to",
            },
          ],
        };
      }

      // Default pattern - simple SNP -> Gene relationship
      else {
        const geneMatch = question.match(/\{([^}]+)\}/);
        const geneName = geneMatch ? geneMatch[1] : "Gene";
        let geneId = "";

        // Extract gene ID from visual pattern if available
        if (visualPattern) {
          const geneIdMatch = visualPattern.match(/@([^@]+)@/);
          geneId = geneIdMatch ? geneIdMatch[1] : "";
        }

        return {
          type: "default_snp_gene",
          nodes: [
            {
              id: "snp",
              label: "SNP",
              color: nodeColors.variants,
              nodeType: "variants",
              position: { x: 100, y: 150 },
            },
            {
              id: "gene",
              label: geneId ? `${geneName}\n(${geneId})` : geneName,
              color: nodeColors.coding_elements,
              nodeType: "coding_elements",
              position: { x: 400, y: 150 },
            },
          ],
          edges: [
            { id: "eqtl", source: "snp", target: "gene", label: "eQTL of" },
          ],
        };
      }
    };

    const structure = parseQuestionStructure(selectedQuestion);

    // Create Cytoscape nodes
    const cyNodes = structure.nodes.map((node) => ({
      group: "nodes",
      data: {
        id: node.id,
        label: node.label,
        color: node.color,
        textColor: getContrastingColor(node.color),
        nodeType: node.nodeType,
        width: node.label.includes("\n") ? 140 : 120,
        height: node.label.includes("\n") ? 60 : 46,
        fontSize: node.label.length > 15 ? "14px" : "16px",
      },
      position: node.position,
      locked: true,
    }));

    // Create Cytoscape edges
    const cyEdges = structure.edges.map((edge) => ({
      group: "edges",
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
      },
    }));

    // Destroy previous instance if exists
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = Cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: [
        {
          selector: "node",
          style: {
            shape: "roundrectangle",
            width: "data(width)",
            height: "data(height)",
            "background-color": "data(color)",
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "data(fontSize)",
            color: "data(textColor)",
            "text-wrap": "wrap",
            "font-weight": "bold",
            "border-width": 2,
            "border-color": "data(color)",
            "corner-radius": 16,
            padding: "5px",
          },
        },
        {
          selector: "edge",
          style: {
            width: 3,
            "line-color": "#666",
            "target-arrow-color": "#666",
            "target-arrow-shape": "triangle",
            "curve-style":
              structure.type === "gwas_qtl_colocalization"
                ? "bezier"
                : "straight",
            label: "data(label)",
            "font-size": "14px",
            "text-margin-y": -20,
            "font-weight": "bold",
            color: "#333",
            "text-background-opacity": 1,
            "text-background-color": "white",
            "text-background-padding": "2px",
          },
        },
      ],
      layout: {
        name: "preset",
        fit: true,
        padding: 30,
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
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [visualPattern, setVisualPattern] = useState("");
  const dispatch = useDispatch();
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
    const questionFromUrl = params.get("question"); // Get the 'question' parameter
    if (questionFromUrl) {
      setSelectedQuestion(decodeURIComponent(questionFromUrl)); // 解码问题并设置它 
      setQid(qidFromUrl);
    }
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return (_) => {
      window.removeEventListener("resize", handleResize);
    };
  },[]);


  // Handle dropdown value change
  const handleDropdownChange = (value, placeholder) => {
    setSelectedQuestion(
      (prevQuestion) => prevQuestion.replace(`{${placeholder}}`, `{${value}}`) // Replace the placeholder with the selected value
    );
  };


  // Handle submit button click
  const handleSubmit = () => {
    if(selectedQuestion.startsWith('What is')){
      const url = `/result?sourceTerm=gene:${geneId.split('(')[1].slice(0, -1)}&targetTerm=cell_type:CL_0002064&relationship=express_in`
      navigate(url);
    }
    else{
    let updatedTerms = questionData.terms;
    if(geneId){
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
    else{
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

  function updateSource(newInputValue,type,index) {
    const geneName = newInputValue;
    dispatch(queryVocab({input: geneName})).unwrap() 
    .then((response) => 
      { if (response && typeof response.result === 'string') {
        console.log('response', response);
        const parsedResponse = response.result.split('@');
        if (parsedResponse.length > 1) {
          let id;
          if(parsedResponse[1]==parsedResponse[2]){
            id = parsedResponse[1];
          }else{
            id = `${geneName}(${parsedResponse[1]})`
          }
          if(type === 'gene'&& parsedResponse[0] === 'gene'){
            setGeneOptions([id]);
          }
          else if(type === 'cell'&& parsedResponse[0] === 'cell_type'){
            setCellOptions([id]);
          }
          else if(type === 'snp'&& parsedResponse[0] === 'sequence_variant'){
            setSnpOptions([id]);
          }else{
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
      }});
  };

  function renderSequence() {
    const sequence = selectedQuestion || ""; // Use the selected question or an empty string
    const parts = sequence.split(/(\{.*?\}|\(.*?\))/); // Split the string into parts based on {} or ()

    return parts.map((part, index) => {
      if (part.startsWith("(") && part.endsWith(")")) {
        // Render grey box for items enclosed in ()

        return (
          <Box
            key={index}
            sx={{
              backgroundColor: "#F2F6FC",
              border: "1px dotted #95A6A6",
              padding: "2px 8px",
              borderRadius: "8px",
              marginRight: "8px",
              display: "inline-block",
            }}
          >
            {part.slice(1, -1)} {/* Remove the enclosing parentheses */}
          </Box>
        );
  
      } else if (part.startsWith("{") && part.endsWith("}")) {
        // Render dropdown for items enclosed in {}
        const placeholder = part.slice(1, -1);

        // Dynamic options based on the placeholder content
        let options = [];
        if (placeholder === "Gene" || placeholder.includes("Gene")) {
          options = ["CFTR", "PTPN22", "INS", "HLA-DQB1", "HLA-DRB1"];
        } else if (placeholder === "CFTR") {
          options = ["CFTR", "PTPN22", "INS"];
        } else if (placeholder === "β cells" || placeholder.includes("cells")) {
          options = ["β cells", "pancreatic islets", "pancreatic tissue"];
        } else {
          // Default options
          options = ["CFTR", "PTPN22", "INS"];
        }

        return (
          <Box
            key={index}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              marginLeft: "-8px",
            }}
          >
            <Select
              defaultValue=""
              displayEmpty
              onChange={(e) =>
                handleDropdownChange(e.target.value, part.slice(1, -1))
              }
              sx={{
                backgroundColor: "#EFF5FF",
                border: "1px solid #71B9FA", // Remove the default border
                borderRadius: "8px",
                minWidth: "80px",
                mx: 1,
                "& .MuiSelect-select": {
                  padding: "2px 20px 2px 8px  !important",
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "center",
                  overflow: "hidden !important",
                  textOverflow: "ellipsis !important",
                },
                ".MuiOutlinedInput-notchedOutline": {
                  border: "none",
                  marginLeft: "0px !important",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  border: "none",
                },
                ".MuiSvgIcon-root ": {
                  position: "absolute",
                  right: "2px",
                  color: "#A9D3FC",
                },
              }}
            >
              <MenuItem value="" disabled>
                {part.slice(1, -1)}{" "}
                {/* Use the text inside the curly braces as the placeholder */}
              </MenuItem>
              {options.map((option, idx) => (
                <MenuItem key={idx} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </Box>
        );
      } else {
        // Render plain text for other parts
        return (
          <Typography
            key={index}
            sx={{
              marginRight: "8px",
              display: "inline-block",

            }}
          >
            {part}
          </Typography>
        );
      }
    });

  }
  // Function to fetch the gene pattern
  const fetchGenePattern = async (question) => {
    // Extract the gene name from the question
    const geneNameMatch = question.match(/\{(.*?)\}/); // Match text inside {}
    if (!geneNameMatch) {
      console.error("Gene name not found in the question");
      setVisualPattern("Gene name not found");
      return;
    }
    const geneName = geneNameMatch[1]; // Extract the gene name

    try {
      // Make a request to the Amazon API Gateway to fetch the gene ID
      const response = await axios.post(
        "https://vcr7lwcrnh.execute-api.us-east-1.amazonaws.com/development/inputToVocab",
        { input: geneName },
        { headers: { "Content-Type": "application/json" } }
      );
      console.log(response.data); // Log the API response for debugging
      // Extract the gene ID from the API response
      const geneId = response.data; // Assuming the API returns { "gene_id": "some_id" }

      if (!geneId) {
        console.error("Gene ID not found for the given gene name");
        setVisualPattern("Gene ID not found");
        return;
      }

      // Construct the pattern
      const pattern = `(SNP) - eqtl of -> (@${geneId.split("@")[1]}@)`;
      setVisualPattern(pattern); // Update the state with the fetched pattern
    } catch (error) {
      console.error("Error fetching gene ID:", error.message);
      setVisualPattern("Failed to fetch gene ID");
    }
  };

  // Update the gene pattern whenever selectedQuestion changes

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

  // useEffect(() => {
  //   if (selectedQuestion) {
  //     // Extract the gene name from the selected question
  //     const geneNameMatch = selectedQuestion.match(/\{(.*?)\}/); // Match text inside {}
  //     if (geneNameMatch) {
  //       const geneName = geneNameMatch[1]; // Extract the gene name

  //       // Dispatch the queryVocab action to fetch the gene ID
  //       dispatch(queryVocab(geneName))
  //         .unwrap()
  //         .then((response) => {
  //           if (response.gene_id) {
  //             // Construct the pattern using the fetched gene ID
  //             const pattern = `(SNP) - eqtl of -> (@${response.gene_id}@)`;
  //             setVisualPattern(pattern); // Update the state with the fetched pattern
  //           } else {
  //             setVisualPattern('Gene ID not found');
  //           }
  //         })
  //         .catch((error) => {
  //           console.error('Error fetching gene ID:', error.message);
  //           setVisualPattern('Failed to fetch gene ID');
  //         });
  //     } else {
  //       setVisualPattern('Gene name not found in the question');
  //     }
  //   }
  // }, [selectedQuestion, dispatch]);

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        padding: 0,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-evenly",
        flex: 1,
        alignItems: "center",
      }}
    >
      {/* 左侧图片 */}
      <Box
        sx={{
          width: "50%",
          padding: "2 auto",
          display: "block",
          "& img": {
            width: "100%",
            objectFit: "contain",
          },
        }}
      >
        <img src={landingPageLogo} alt="PanKgraph" />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
            alignItems: "center",
          }}
        >
          <TerminalIcon sx={{ width: "30px", color: "#C48E25" }} />
          <Typography sx={{ marginLeft: "10px", fontSize: "20px" }}>
            Access PanKgraph with{" "}
            <Link
              href={process.env.REACT_APP_PANKGRAPH_LINK + "/api"}
              sx={{
                textDecoration: "underline",
                color: "black",
                textAlign: "right",
              }}
            >
              API
            </Link>
          </Typography>
        </Box>
      </Box>

      {/* 右侧内容区域 */}
      <Box
        sx={{
          width: "50%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 3,
          margin: 2,
          backgroundColor: "#E4F0F1",
          borderRadius: "20px",
          padding: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: 28,
              fontWeight: 700,
              textAlign: "left",
            }}
          >
            Search for QTL
          </Typography>
          <Link
            href="/"
            sx={{
              textDecoration: "underline",
              color: "#398289",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              marginRight: 2,
            }}
          >
            CANCEL/RETURN
          </Link>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            flexDirection: "column",
          }}
        >
          <Typography
            sx={{
              marginBottom: 2,
              color: "#398289",
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            Pick a specific gene
          </Typography>
          <Box
            sx={{
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              padding: 2,
              width: "calc(100% - 32px)",
            }}
          >
            {renderSequence()}
          </Box>
        </Box>

        <Typography
          sx={{
            marginBottom: 2,
            color: "#398289",
            fontSize: 17,
            fontWeight: 600,
          }}
        >
          Graph Visualization
        </Typography>
        <Box
          sx={{
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            padding: 2,
            minHeight: "220px",
          }}
        >
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


        <Button
          variant="contained" // Use a contained button for emphasis
          color="primary" // Use the primary color
          sx={{
            backgroundColor: "#219197", // Custom background color
            color: "#FFFFFF", // Text color
            textTransform: "none", // Prevent uppercase text
            fontSize: "16px", // Adjust font size
            fontWeight: 600, // Bold text
            borderRadius: "8px", // Rounded corners
            padding: "8px 16px", // Add padding
            "&:hover": {
              backgroundColor: "#1A7A75", // Darker shade on hover
            },
          }}
          onClick={handleSubmit}
        >
          Submit
        </Button>
      </Box>
    </Container>
  );
};


export default MatchPage;
