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
  CircularProgress,
  Container,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import Popper from '@mui/material/Popper';

import landingPageLogo from '../image/landing image cropped.png';
import { queryVocab } from '../redux/inputToVocabSlice'; // Import the action
import { queryQueryResult } from '../redux/queryResultSlice';
import landingPageSchema from '../schema/landing_page_schema.json';
import { nodeAutoWidth } from './style.js';
import { AlertMessage } from './SupportingMaterial';

const nodeColors = {
  gene: "#A4D0F6",
  snp: "#FFB371",
  ontology: "#FFDE7D",
  OCR: "#61ECBC",
  article: "#F5BEFF",
  "cell type": "#F5BEFF",
  "T1D": "#FFADAD",
};

const nodeLabels = {
  gene: "Gene",
  snp: "SNP",
  ontology: "Cell Type",
  OCR: "OCR Cluster",
  article: "Literature",
  "cell type": "Cell Type",
  "T1D": "T1D",
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
        label: node.id === node.type ? nodeLabels[node.type] : (node.id || nodeLabels[node.type]),
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
        height: "140px",
        borderRadius: "8px",
      }}
    />
  );
};

function InputComponent({ type, setValue, setInputStatus, GWAS = false, defaultList = [], restricted = false }) { // input state: valid, mismatch, empty
  const dispatch = useDispatch();
  const [selfOptions, setSelfOptions] = useState([]);

  const [simIsLoading, setSimIsLoading] = useState(false); //similarity search loading state
  const [valIsLoading, setValIsLoading] = useState(false); // validation loading state

  const [validatedValue, setValidatedValue] = useState(''); // validated value after checking with vocab
  useEffect(() => {
    setValue(validatedValue);
  }, [validatedValue]);

  const [inputValue, setInputValue] = useState('');
  const inputValueRef = useRef(inputValue); // to keep the latest input value for async validation
  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  const inputChangeTimer = useRef(null);

  function updateSource(newInputValue) { // similarity match + default list
    const keyWord = newInputValue.split('(')[0].trim();
    if (restricted) {
      // filter defaultList based on input, 5 at most
      const filteredList = defaultList.filter(item => item.toLowerCase().includes(keyWord.toLowerCase()));
      setSelfOptions(filteredList.slice(0, 5));
      if (newInputValue === inputValueRef.current) {
        setSimIsLoading(false);
      }
      return;
    }
    if (newInputValue.length <= 2) {
      setSelfOptions(defaultList);
      if (newInputValue === inputValueRef.current) {
        setSimIsLoading(false);
      }
      return;
    }
    if (type !== 'gene') {
      setSelfOptions([]);
      if (newInputValue === inputValueRef.current) {
        setSimIsLoading(false);
      }
      return;
    }
    dispatch(queryQueryResult({
      isNeptune: false,
      query: "SELECT id, name FROM gene_name WHERE name % '" + keyWord + "'ORDER BY similarity(name, '" + keyWord + "') DESC LIMIT 5;"
    })).unwrap()
      .then((response) => {
        if (response && newInputValue === inputValueRef.current) {
          const parsedResponse = response.results[0].credible_sets.map((item, index) => {
            return `${item.name}(${item.id})`;
          });
          if (parsedResponse.length === 0) {
            setSelfOptions([{ label: `${type} not found`, disabled: true, notFound: true }]);
          } else {
            setSelfOptions(parsedResponse);
          }
        }
      }).finally(() => {
        if (newInputValue === inputValueRef.current) {
          setSimIsLoading(false);
        }
      });
  }

  function updateValidation(newInputValue, type) { // validate the input value with vocab
    if (newInputValue.length <= 2 || restricted) {
      setValidatedValue('');
      setValIsLoading(false);
      return;
    }
    const termName = newInputValue.split('(')[0].trim();
    const typeMap = {
      gene: 'gene',
      cell: 'cell_type',
      snp: 'sequence_variant'
    };
    Promise.all(
      //TODO: optimize code structure
      [(type !== 'snp' ? dispatch(queryVocab({ input: termName })).unwrap() : Promise.resolve(null)),
      ...(type === 'snp' ? [dispatch(queryQueryResult({
        isNeptune: false,
        rawResponse: true,
        query: `SELECT snp FROM ${GWAS ? "GWAS_DATA" : "QTL_DATA"} WHERE snp = '${termName}' LIMIT 1;`
      })).unwrap()] : [])
      ]
    ).then(([response, response2]) => {
      if (newInputValue !== inputValueRef.current) return; // discard outdated response
      if (validatedValue === newInputValue) {
        setValidatedValue(newInputValue);
        setInputStatus('valid');
        return;
      } // skip repeated response
      const responseList = (response?.result || '').split('@') || [''];
      const id1 = typeMap[type] === responseList[0] ?
        (type === 'gene' ? `${termName}(${responseList[1]})` : responseList[1]) :
        '';
      const id2 = response2?.results?.[0]?.[type];
      const id = id1 || id2 || '';
      if (id) {
        if (type === 'gene') {
          setInputStatus('valid');
          setValidatedValue(id.toUpperCase());
        }
        else if (type === 'cell' || type === 'snp') {
          setInputStatus('valid');
          setValidatedValue(id);
        }
        else {
          setValidatedValue('');
        }
      } else {
        setValidatedValue('');
      }
    }).finally(() => {
      if (newInputValue === inputValueRef.current) {
        setValIsLoading(false);
      }
    });
  };

  const ListboxComponent = React.forwardRef(function ListboxComponent(props, ref) {
    const loading = simIsLoading || valIsLoading;

    if (loading) {
      return (
        <ul {...props} ref={ref}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: type === 'gene' ? 2 : 1,
              width: type === 'gene' ? '200px' : '115px'
            }}
          >
            <CircularProgress size={20} />
          </Box>
        </ul>
      );
    }

    return <ul {...props} ref={ref} />;
  });

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }} >
      <Autocomplete
        freeSolo
        autoFocus
        options={(() => {
          const options = [...(validatedValue ? [validatedValue] : []), ...selfOptions];
          const uniqueOptions = [...new Set(options.map(option => option.label || option))];
          return uniqueOptions.length > 0 ? (uniqueOptions) : (type !== 'gene' ? [] : [{ label: `No ${type} found`, disabled: true, notFound: true }]);
        })()}
        getOptionDisabled={(option) => option.disabled}
        className={type}
        filterOptions={(options) => options}
        sx={{
          '& .MuiAutocomplete-endAdornment': {
            right: '-4px !important', // Adjust the position of the end adornment (clear button)
          },
          '& .MuiOutlinedInput-root': {
            paddingRight: '-12px', // Ensure enough space for the clear button
          },
          zIndex: 9999,
          marginTop: '2px',
        }}
        onFocus={() => {
          if (!inputValue && selfOptions.length === 0) {
            setValidatedValue('');
            updateSource('', type);
          }
        }}
        onInputChange={(event, newInputValue, reason) => {
          if (inputChangeTimer.current) {
            clearTimeout(inputChangeTimer.current);
          }
          if (reason === 'reset') {
            if (newInputValue) {
              setInputStatus('valid');
              setValidatedValue(newInputValue);
            } else {
              setInputStatus('empty');
              setValidatedValue('');
            }
          } else {
            setValidatedValue('');
            setInputValue(newInputValue);
            // if (newInputValue) {
            setInputStatus('mismatch');
            inputChangeTimer.current = setTimeout(() => {
              setSelfOptions([]); // to trigger rendering the dropdown
              // if (type === 'gene') {
              setSimIsLoading(true);
              updateSource(newInputValue, type);
              // }
              setValIsLoading(true);
              updateValidation(newInputValue, type);
            }, 300); // Delay the input change handling
            // } else {
            //   setInputStatus('empty');
            //   setSimIsLoading(false);
            //   setValIsLoading(false);
            //   setSelfOptions([]);
            // }

          }
        }}
        onChange={() => { }}
        ListboxComponent={ListboxComponent}
        PopperComponent={(props) => (
          <Popper {...props} style={{ width: 'fit-content !important' }} />
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={type === 'gene' ? 'GENE' : type === 'cell' ? 'CELL' : 'SNP'}
            sx={{
              width: 'auto !important',
              fontFamily: 'Open Sans',
              fontWeight: 600,
              fontSize: 19,
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
        renderOption={(props, option) => {
          return (
            <li
              {...props}
              key={option.label || option}
              style={{
                color: option.notFound ? '#E0232E' : 'inherit',
                cursor: option.disabled ? 'not-allowed' : 'pointer',
                fontStyle: option.notFound ? 'italic' : 'normal'
              }}
            >
              {option.label || option}
            </li>
          );
        }}
      />
    </Box>
  );
}

function MatchPage() {
  // const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  // const [qid, setQid] = useState('');
  const [inputStatus, setInputStatus] = useState({});
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);
  const [geneId, setGeneId] = useState('');
  const [cellId, setCellId] = useState('');
  const [snpId, setSnpId] = useState('');
  const [showBoxEmptyWarning, setShowBoxEmptyWarning] = useState(false);
  const [showBoxFilledWarning, setShowBoxFilledWarning] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [questionData, setQuestioData] = useState(null);
  const [visualPattern, setVisualPattern] = useState(questionData?.pattern_for_the_matched_page);

  useEffect(() => {
    setVisualPattern(questionData?.pattern_for_the_matched_page || '');
  }, [questionData]);

  const [dictionary, setDictionary] = useState({});

  useEffect(() => {
    if (!questionData) return;
    const partofquestion = questionData.question.split(/(\s+|\{.*?\}|\(.*?\))/); // 根据{} 或（）将字符串分割成部分，其余按照空格分割成部分
    setDictionary(partofquestion.reduce((acc, part, index) => {
      if (part.startsWith('{') && part.endsWith('}')) {
        acc[index] = part.slice(1, -1).split('@')[0]; // Extract the type from the part
      }
      return acc;
    }, {}));
  }, [questionData]);
  // console.log('dictionary', dictionary);

  // Extract this page's question and qid from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const questionFromUrl = params.get('qid'); // 获取'question'参数
    if (!landingPageSchema?.[parseInt(questionFromUrl)]) {
      navigate('/');
      return;
    }
    const questionData = landingPageSchema[parseInt(questionFromUrl)];
    setQuestioData(questionData);
    setSelectedQuestion(questionData.question);
  }, []);

  // useEffect(() => {
  //   function handleResize() {
  //     setWindowWidth(window.innerWidth)
  //   }
  //   window.addEventListener('resize', handleResize);
  //   return (_) => {
  //     window.removeEventListener('resize', handleResize);
  //   };
  // }, []);


  // Handle submit button click
  const handleSubmit = () => {
    if (isSubmitDisabled) {
      if (Object.entries(inputStatus).reduce((acc, curr) => acc + (curr[1] === 'empty' ? 1 : 0), 0) > 0) {
        setShowBoxEmptyWarning(true);
      }
      else if (Object.entries(inputStatus).reduce((acc, curr) => acc + (curr[1] === 'mismatch' ? 1 : 0), 0) > 0) {
        setShowBoxFilledWarning(true);
      }
      return;
    }

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
      const parts = updatedTerms.split(' - ');
      const source = parts[0].trim();
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
      let sourceSymbol = '';
      let sourceTerm = '';
      if (source.includes('(')) {
        sourceSymbol = source.split('(')[0].split('@')[1];
        sourceTerm = `gene@${source.split('(')[1].slice(0, -1)}`;
      }
      else {
        sourceSymbol = '';
        // if (source.startsWith('rs'))
        sourceTerm = source;
      }
      let url = `/${targetTerm === "disease" ? "result" : "intermediate"}?sourceTerm=${sourceTerm}&relationship=${relationTerm}&targetTerm=${targetTerm}`;
      if (targetSymbol) {
        url += `&targetSymbol=${targetSymbol}`;
      }
      navigate(url);
    }
  };

  function renderSequence() {
    const GWAS = questionData?.terms.includes('GWAS');
    const sequence = selectedQuestion || ''; // 使用选定的问题或空字符串
    const parts = sequence.split(/(\s+|\{.*?\}|\(.*?\))/); // 根据{} 或（）将字符串分割成部分，其余按照空格分割成部分
    const termList = questionData?.default_terms_list;
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
              fontSize: 19,
            }}
          >
            {part.slice(1, -1)}
          </Box>
        );
      } else if (part.startsWith('{') && part.endsWith('}')) {
        const type = dictionary[index];
        const defaultList = termList?.[type] || [];
        const restricted = questionData?.terms === "gene - COLOC - disease";
        return (<InputComponent
          key={index}
          type={type}
          setValue={(value) => {
            if (type === 'gene') {
              setGeneId(value);
            } else if (type === 'cell') {
              setCellId(value);
            } else if (type === 'snp') {
              setSnpId(value);
            }
          }}
          setInputStatus={(status) => {
            setInputStatus((prevStatus) => ({ ...prevStatus, [index]: status }));
          }}
          GWAS={GWAS}
          defaultList={defaultList}
          restricted={restricted}
        />);
      } else {
        // Render plain text for other parts
        return (
          <Typography
            key={index}
            sx={{
              display: 'inline-block',
              fontFamily: 'Open Sans',
              fontWeight: 600,
              fontSize: 19,
            }}
          >
            {part}
          </Typography>
        );
      }
    });
  };

  useEffect(() => {
    let connectedString = questionData?.pattern_for_the_matched_page;
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
    if (dictionary.length === 0) {
      setIsSubmitDisabled(true);
      return;
    }
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
  }, [geneId, cellId, snpId, dictionary]);

  useEffect(() => {
    if (showBoxEmptyWarning) {
      const timer = setTimeout(() => {
        setShowBoxEmptyWarning(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showBoxEmptyWarning]);

  return (
    <Container maxWidth={false} disableGutters sx={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      marginTop: '0px',
      marginBottom: '40px',
    }}>
      <Container maxWidth={false} disableGutters sx={{
        display: 'flex',
        flexDirection: { sm: 'column', md: 'row' }, justifyContent: 'center',
        alignItems: 'top',
        paddingTop: '0px',
        paddingLeft: { sm: 0, md: '6%' },
        paddingRight: { sm: 0, md: '6%' },
        paddingBottom: '0px',
      }}>

        {/* 左侧图片 */}
        <Box sx={{
          flex: 1,
          position: 'relative',
          display: 'block',
          '& img': {
            width: { sm: '100%', md: '100%' },
            maxHeight: '425px',
            objectFit: 'contain',
            objectPosition: 'left',
            marginTop: { sm: '0px', md: '50px' },
            marginLeft: { sm: '0px', md: '0' },
            transform: { sm: 'none', md: 'translateX(-4%)' }
          },
        }}>
          <Box sx={{
            position: { sm: 'relative', md: 'absolute' },
            top: { sm: '0', md: '0' },
            left: 0,
            right: 0,
            bottom: 0,
            margin: 'auto',
            display: 'flex', flexDirection: 'column', justifyContent: 'top', alignItems: 'flex-start',
          }}>
            <img src={landingPageLogo} alt="PanKgraph" />
            <Box sx={{
              display: 'flex',
              position: "relative",
              justifyContent: 'center',
              marginTop: '20px',
              alignItems: 'center',
              left: "calc(min(50%, 330px) - 23px)",
              transform: { sm: 'none', md: 'translateX(-50%)' }
            }}>
              <TerminalIcon sx={{ width: '30px', color: '#C48E25' }} />
              <Typography sx={{ marginLeft: '10px', fontSize: '20px' }}>
                Access PanKgraph with <Link
                  href={'/api'}
                  sx={{ textDecoration: 'underline', color: 'black', textAlign: 'right' }}>API</Link>
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* 右侧内容区域 */}
        {questionData?.question && <Box sx={{
          width: { sm: '90%', md: '40vw' },
          marginTop: { sm: '0px', md: '20px' },
          marginRight: 0,
          marginLeft: { sm: '5%', md: 0 },
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          backgroundColor: '#E4F0F1',
          borderRadius: '20px',
          padding: '32px',
          minHeight: '300px'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{
              fontSize: 28,
              fontWeight: 700,
              textAlign: 'left',
              fontFamily: 'Open Sans',
            }}>
              {questionData?.matched_page_title}
            </Typography>
            <Link
              href="/"
              sx={{
                textDecoration: 'underline',
                color: '#398289',
                fontSize: 17,
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
              marginBottom: '10px',
              color: '#398289',
              fontSize: 17,
              fontWeight: 600,
              fontFamily: 'Open Sans',
            }}>
              {questionData?.matched_page_sub_title}
            </Typography>
            <Box sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              alignItems: 'center',
              display: 'flex',
              flexWrap: 'wrap',
              padding: 2,
              height: '68px',
              width: 'calc(100% - 40px)',
              gap: '2px',
              paddingX: '20px'
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
            }}>
              {questionData?.matched_page_tips}
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
          <AlertMessage
            type="warning"
            content="Please ensure all boxes are filled out before submitting"
            open={showBoxEmptyWarning}
            onClose={() => setShowBoxEmptyWarning(false)}
            sx={{
              '& .MuiSnackbar-root': {
                position: 'static',
                transform: 'none',
                top: 'auto',
                left: 'auto',
                right: 'auto',
                bottom: 'auto',
              },
              '& .MuiAlert-root': {
                marginBottom: '10px',
              }
            }}
          />
          <AlertMessage
            type="warning"
            content="We couldn't find one or more entities from our database. Try use a different gene or SNP."
            open={showBoxFilledWarning}
            onClose={() => setShowBoxFilledWarning(false)}
            sx={{
              '& .MuiSnackbar-root': {
                position: 'static',
                transform: 'none',
                top: 'auto',
                left: 'auto',
                right: 'auto',
                bottom: 'auto',
              },
              '& .MuiAlert-root': {
                marginBottom: '10px',
              }
            }}
          />
          <Button
            variant="contained" // Use a contained button for emphasis
            color="primary" // Use the primary color
            sx={{
              backgroundColor: isSubmitDisabled ? '#F0F0F0' : '#219197', // Custom background color
              color: isSubmitDisabled ? 'rgba(57, 130, 137, 0.4)' : 'rgba(255, 255, 255)', // Text color
              textTransform: 'none', // Prevent uppercase text
              fontSize: '16px', // Adjust font size
              fontWeight: 600, // Bold text
              height: '64px',
              borderRadius: '8px', // Rounded corners
              padding: '8px 16px', // Add padding
              fontFamily: 'Open Sans',
              boxShadow: '0px 2px 2px 0px rgba(0, 0, 0, 0.40)',
              '&:hover': {
                backgroundColor: isSubmitDisabled ? '#F0F0F0' : '#1A7A75', // Darker shade on hover
              },
              '&[disabled]': {
                backgroundColor: '#F0F0F0', // Lighter shade when disabled
                boxShadow: '0px 2px 2px 0px rgba(0, 0, 0, 0.40)', // Shadow for disabled state
              },
            }}
            onClick={handleSubmit}
          >
            SUBMIT
          </Button>


        </Box>}
      </Container>
    </Container>
  );
};


export default MatchPage;
