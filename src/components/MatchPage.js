import './styles.css';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import Cytoscape from 'cytoscape';
import { useDispatch } from 'react-redux';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import TerminalIcon from '@mui/icons-material/Terminal';
import {
  Autocomplete,
  Box,
  Button,
  Container,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import Popper from '@mui/material/Popper';

import landingPageLogo from '../image/landing image cropped.png';
import { queryVocab } from '../redux/inputToVocabSlice'; // Import the action
import { nodeAutoWidth } from './style.js';
import { queryQueryResult } from '../redux/queryResultSlice';

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
  OCR: "OCR Cluster",
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
          (node) => (node.match(/\{(?<type>[^@]+)@(?<id>[^@^\(]+)(\(.+\))?@\}/)?.groups
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
            'padding': '15px',
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
            'font-size': '20px',
            'text-rotation': 'autorotate',
            'text-margin-y': -15
          }
        }
      ],
      layout: {
        name: 'preset',  // 使用preset布局以保持固定位置
      },
      zoom: 1,
      minZoom: 1,
      maxZoom: 1,
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
        height: "120px",
        borderRadius: "8px",
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
    if (selectedQuestion.startsWith('How does')) {
      const url = `/result?sourceTerm=gene@${geneId.split('(')[1].slice(0, -1)}&targetTerm=cell_type&relationship=express_in`
      navigate(url);
    }
    else {
      let updatedTerms = questionData.terms;
      if (geneId) {
        updatedTerms = updatedTerms.replace('gene', `gene@${geneId}`);
      }
      if (cellId) {
        updatedTerms = updatedTerms.replace('cell_type', `cell_type@${cellId}`);
      }
      if (snpId) {
        updatedTerms = updatedTerms.replace('snp', `snp@${snpId}`);
      }
      const parts = updatedTerms.split('-')
      console.log('visualPatternParts', parts);
      const sourceTerm = parts[0].trim();
      const relationTerm = parts[1].trim();
      const target = parts[2].trim();
      let targetSymbol = '';
      let targetTerm = '';
      if (target.includes('(')) {
        targetSymbol = target.split('(')[0].split('@')[1];
        targetTerm = `gene@${target.split('(')[1].slice(0, -1)}`;
      }
      else {
        targetSymbol = '';
        targetTerm = target;
      }
      let url = `/intermediate?sourceTerm=${sourceTerm.toLowerCase()}&relationship=${relationTerm}&targetTerm=${targetTerm}`;
      if (targetSymbol) {
        url += `&targetSymbol=${targetSymbol}`;
      }
      navigate(url);
    }
  };

  function updateSource(newInputValue,type) {
    const keyWord = newInputValue;
    dispatch(queryQueryResult({ isNeptune: false,
      query: "SELECT id, name FROM gene_name WHERE name_tsv @@to_tsquery('simple','" + keyWord + ":*') LIMIT 5;" })).unwrap()
      .then((response) => {
        if (response) {
          console.log('response from queryQueryResult', response.results[0].credible_sets);
          const parsedResponse = response.results[0].credible_sets.map((item, index) => {
            return `${item.name}(${item.id})`;
          });
          setGeneOptions(parsedResponse);
        }
      });
  }

  function updateValidation(newInputValue, type) {
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
              setGeneId(id);
              console.log('geneId', geneId);
            }
            else if (type === 'cell' && parsedResponse[0] === 'cell_type') {
              setCellId(id);
              console.log('cellId', cellId);
            }
            else if (type === 'snp' && parsedResponse[0] === 'sequence_variant') {
              setSnpId(id);
              console.log('snpId', snpId);  
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
            {part.slice(1, -1)}
          </Box>
        );
      } else if (part.startsWith('{') && part.endsWith('}')) {
        const type = dictionary[index];
        return (
          <Box key={index} sx={{ display: 'inline-flex', alignItems: 'center', }} >
            <Autocomplete
              freeSolo
              options={type === 'gene' ? geneOptions : type === 'cell' ? cellOptions : snpOptions}
              getOptionDisabled={(option) => option.disabled}
              className={dictionary[index]}
              sx={{
                '& .MuiAutocomplete-endAdornment': {
                  right: '-4px !important', // Adjust the position of the end adornment (clear button)
                },
                '& .MuiOutlinedInput-root': {
                  paddingRight: '-12px', // Ensure enough space for the clear button
                },
              }}
              onInputChange={(event, newInputValue) => {
                if (newInputValue) {
                  updateValidation(newInputValue, type);
                  updateSource(newInputValue, type);
                  // setIsSubmitDisabled(!options.includes(newInputValue));
                } else {
                  if (type === 'gene') {
                    setGeneId('');
                    setGeneOptions([]);
                  }
                  else if (type === 'cell') {
                    setCellId('');
                    setCellOptions([]);
                  } else if (type === 'snp') {
                    setSnpId('');
                    setSnpOptions([]);
                  }
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
                }
              }}
              PopperComponent={(props) => (
                <Popper {...props} style={{ width: 'fit-content !important' }} />
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={type === 'gene' ? 'GENE' : type === 'cell' ? 'CELL' : 'SNP'}
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
  }, [geneId, cellId, snpId]);

  useEffect(() => {
    let isabled = true;
    for (const [key, value] of Object.entries(dictionary)) {
      if (value === 'gene' && !geneId) {
        isabled = false;
        continue;
      }
      if (value === 'cell' && !cellId) {
        isabled = false;
        continue;
      }
      if (value === 'snp' && !snpId) {
        isabled = false;
        continue;
      }
    }
    setIsSubmitDisabled(!isabled);
  }, [geneId, cellId, snpId]);


  return (
    <Container maxWidth={false} disableGutters sx={{
      width: '100%',
      display: 'flex',
      flexDirection: { sm: 'column', md: 'row' }, justifyContent: 'flex-start',
      flex: 1, alignItems: 'top',
      paddingTop: '40px',
      paddingLeft: { sm: 0, md: '10%' },
      paddingRight: { sm: 0, md: '10%' },
      paddingBottom: '40px',
    }}>

      {/* 左侧图片 */}
      <Box sx={{
        width: { sm: '80%', md: '50%' },
        marginTop: { sm: '0px', md: '60px' },
        display: 'block',
        textAlign: 'left',
        '& img': {
          width: '87%',
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
            gap: '2px',
          }}>
            {renderSequence()}
          </Box>
          <Typography sx={{
            color: '#4E4E4E',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Open Sans',
            fontStyle: 'italic',
            marginTop: '4px',
            marginBottom: 2,
          }}>
            {questionData.matched_page_tips}
          </Typography>
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
            height: '64px',
            borderRadius: '8px', // Rounded corners
            padding: '8px 16px', // Add padding
            fontFamily: 'Open Sans',
            boxShadow: '0px 2px 2px 0px rgba(0, 0, 0, 0.40)',
            '&:hover': {
              backgroundColor: '#1A7A75', // Darker shade on hover
            },
            '&[disabled]': {
              backgroundColor: '#F0F0F0', // Lighter shade when disabled
              boxShadow: '0px 2px 2px 0px rgba(0, 0, 0, 0.40)', // Shadow for disabled state
            },
          }}
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          SUBMIT
        </Button>


      </Box>
    </Container>
  );
};


export default MatchPage;
