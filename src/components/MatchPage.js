import './styles.css';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import Cytoscape from 'cytoscape';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

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

import { queryVocab } from '../redux/inputToVocabSlice'; // Import the action
import { queryQueryResult } from '../redux/queryResultSlice';
import { nodeAutoWidth } from './style.js';
import { AlertMessage } from './SupportingMaterial';

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
  ontology: "Cell Type",
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

const MatchGraphViewer = ({ visualPattern, question }) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !question) {
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
  }, [visualPattern, question]);

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

function InputComponent({ type, setValue, setInputStatus, disabled, clearTrigger, defaultValue, sx = { fontSize: '16px' } }) { // input state: valid, mismatch, empty
  const dispatch = useDispatch();
  const [clearTriggerState, setClearTriggerState] = useState(clearTrigger);
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

  useEffect(() => {
    if (defaultValue) {
      setInputValue(defaultValue);
      setValidatedValue('');
      setInputStatus('mismatch');
      setSelfOptions([]); // to trigger rendering the dropdown
      if (type === 'gene') {
        setSimIsLoading(true);
        updateSource(defaultValue, type);
      }
      setValIsLoading(true);
      updateValidation(defaultValue, type);
    }
  }, [defaultValue]);

  const inputChangeTimer = useRef(null);

  useEffect(() => {
    if (clearTriggerState === clearTrigger) return;
    setClearTriggerState(clearTrigger);
    if (inputChangeTimer.current) {
      clearTimeout(inputChangeTimer.current);
    }
    setValue('');
    setInputValue('');
    setInputStatus('empty');
    setValidatedValue('');
  }, [clearTrigger]);

  function updateSource(newInputValue) { // similarity match, specific for gene
    const keyWord = newInputValue.split('(')[0].trim();
    if (newInputValue === '') {
      setSelfOptions([]);
      setSimIsLoading(false);
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
    const geneName = newInputValue.split('(')[0].trim();
    const typeMap = {
      gene: 'gene',
      cell: 'cell_type',
      snp: 'sequence_variant'
    };
    Promise.all(
      [dispatch(queryVocab({ input: geneName })).unwrap(),
      ...(type === 'snp' ? [dispatch(queryQueryResult({
        isNeptune: false,
        rawResponse: true,
        query: `SELECT snp FROM QTL_DATA WHERE snp = '${geneName}' LIMIT 1;`
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
        (type === 'gene' ? `${geneName}(${responseList[1]})` : responseList[1]) :
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

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }} >
      <Autocomplete
        freeSolo
        autoFocus
        options={(() => {
          const options = [...(validatedValue ? [validatedValue] : []), ...selfOptions];
          const uniqueOptions = [...new Set(options.map(option => option.label || option))];
          return uniqueOptions.length > 0 ? (type === 'gene' ? uniqueOptions : []) : [{ label: `No ${type} found`, disabled: true, notFound: true }];
        })()}
        disabled={disabled}
        getOptionDisabled={(option) => option.disabled}
        className={type}
        filterOptions={(options) => options}
        sx={{
          ...(disabled ? { border: '1px dashed #ACB1B0' } : {
            '& .MuiAutocomplete-endAdornment': {
              right: '-4px !important', // Adjust the position of the end adornment (clear button)
            },
            '& .MuiOutlinedInput-root': {
              paddingRight: '-12px', // Ensure enough space for the clear button
            },
          }),
          margin: "0px 4px",
          borderRadius: '8px',
          '& .Mui-disabled .MuiAutocomplete-input::placeholder': {
            color: 'black',
            opacity: 1,
          },
          zIndex: 9999,
        }}
        inputValue={inputValue}
        onInputChange={(event, newInputValue, reason) => {
          setInputValue(newInputValue);
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
            if (newInputValue) {
              setInputStatus('mismatch');
              inputChangeTimer.current = setTimeout(() => {
                setSelfOptions([]); // to trigger rendering the dropdown
                if (type === 'gene') {
                  setSimIsLoading(true);
                  updateSource(newInputValue, type);
                }
                setValIsLoading(true);
                updateValidation(newInputValue, type);
              }, 300); // Delay the input change handling
            } else {
              setInputStatus('empty');
              setSimIsLoading(false);
              setValIsLoading(false);
              setSelfOptions([]);
            }

          }
        }}
        onChange={() => { }}
        ListboxComponent={(props) => {
          if (!inputValue) {
            return <></>;
          }
          const loading = simIsLoading || valIsLoading;
          if (loading) {
            return (
              <ul {...props}>
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
              // <ul {...props} style={{ ...props.style, padding: 0, margin: 0, height: 'fit-content', weight: 'fit-content' }}>
              //   <Skeleton variant="rectangular" width={200} height={50} />
              // </ul>
            );
          }
          return <ul {...props} />;
        }}
        PopperComponent={(props) => (
          <Popper {...props} style={{ width: 'fit-content !important' }} />
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            disabled={disabled}
            placeholder={
              disabled ? type.toUpperCase() :
                type === 'gene' ? 'GENE' : type === 'cell' ? 'CELL' : 'SNP'
            }
            sx={{
              ...sx,
              width: 'auto !important',
              fontFamily: 'Open Sans',
              fontWeight: 600,
              mx: 1,
              '& .MuiAutocomplete-input': {
                width: disabled ? `calc(${sx.fontSize} * 3) !important` : `calc(${sx.fontSize} * 5) !important`,
                ...sx,
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
                padding: disabled ? '2px 0px 2px 0px !important' : '2px 18px 2px 0px !important',
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

export const SearchComponent = ({ questionSchema, clearTrigger = 0, updateValues, setInputStatus, sx = { fontSize: '16px' } }) => {
  const [parts, setParts] = useState([]);
  const [partsMap, setPartsMap] = useState({});
  const [defaultValues, setDefaultValues] = useState({});

  useEffect(() => {
    const sequence = questionSchema || '';
    console.log("Parsing question schema:", sequence);

    const parts = sequence.split(/(\{.*?\}|\(.*?\))/);
    const [partsMap, defaultValues] = parts.reduce(
      ([acc1, acc2], part, index) => {
        if (part.startsWith('{') && part.endsWith('}')) {
          const [key, defaultValue = ''] = part.slice(1, -1).split('@');
          acc1[index] = key;
          acc2[index] = key === defaultValue ? '' : defaultValue;
        }
        return [acc1, acc2];
      },
      [{}, {}] // Correct initial accumulator: an array of two empty objects
    );
    setParts(parts);
    setPartsMap(partsMap);
    setDefaultValues(defaultValues);
    console.log("Default values set:", defaultValues);
  }, [questionSchema]);

  return parts.map((part, index) => {
    if (part.startsWith('(') && part.endsWith(')')) {
      return (<InputComponent
        sx={sx}
        disabled={true}
        key={index}
        type={part.slice(1, -1)}
        setValue={() => { }}
        setInputStatus={() => { }}
        defaultValue={''}
      />);
    } else if (part.startsWith('{') && part.endsWith('}')) {
      const type = partsMap[index];
      return (<InputComponent
        sx={sx}
        key={index}
        type={type}
        clearTrigger={clearTrigger}
        setValue={(value) => {
          updateValues((prev) => ({ ...prev, [type]: value }));
        }}
        setInputStatus={(status) => {
          setInputStatus((prevStatus) => ({ ...prevStatus, [index]: status }));
        }}
        defaultValue={defaultValues[index] || ''}
      />);
    } else {
      // Render plain text for other parts
      return (
        <Typography
          key={index}
          sx={{
            ...sx,
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
}

export const SubmitButtonComponent = ({ sx, sxOnDisabled, caption, onClick, inputStatus, setWarning }) => {
  const warnings = {
    empty: 'Please ensure all boxes are filled out before submitting',
    mismatch: 'We couldn\'t find one or more entities from our database. Try use a different gene or SNP.',
    allEmpty: 'All boxes are already empty.',
  }
  const [existEmptyBox, setExistEmptyBox] = useState(true);
  const [existMismatchBox, setExistMismatchBox] = useState(false);

  useEffect(() => {
    setExistEmptyBox(
      Object.entries(inputStatus).reduce((acc, curr) => acc + (curr[1] === 'empty' ? 1 : 0), 0) > 0
    );
    setExistMismatchBox(
      Object.entries(inputStatus).reduce((acc, curr) => acc + (curr[1] === 'mismatch' ? 1 : 0), 0) > 0
    );
  }, [inputStatus]);

  const handleClick = () => {
    if (existEmptyBox) {
      setWarning(warnings['empty']);
      return;
    }
    if (existMismatchBox) {
      setWarning(warnings['mismatch']);
      return;
    }
    onClick();
  };
  return (
    <Button
      onClick={handleClick}
      sx={{
        ...sx,
        ...(existEmptyBox || existMismatchBox ? sxOnDisabled : {}),
      }}
    >
      {caption}
    </Button>
  );
};

const ClearButtonComponent = ({ sx, sxOnDisabled, caption, onClick, inputStatus, setWarning }) => {
  const warnings = {
    empty: 'Please ensure all boxes are filled out before submitting',
    mismatch: 'We couldn\'t find one or more entities from our database. Try use a different gene or SNP.',
    allEmpty: 'All boxes are already empty.',
  }
  const [allEmptyBox, setAllEmptyBox] = useState(true);


  useEffect(() => {
    setAllEmptyBox(
      Object.entries(inputStatus).reduce((acc, curr) => acc + (curr[1] === 'empty' ? 0 : 1), 0) === 0
    );
  }, [inputStatus]);

  const handleClick = () => {
    if (allEmptyBox) {
      setWarning(warnings['allEmpty']);
      return;
    }
    onClick();
  };
  return (
    <Button
      onClick={handleClick}
      sx={{
        ...sx,
        ...(allEmptyBox ? sxOnDisabled : {}),
      }}
    >
      {caption}
    </Button>
  );
};

export const WarningComponent = ({ warning, setWarning }) => {
  const [lastWarning, setLastWarning] = useState('');
  useEffect(() => {
    if (!!warning) {
      setLastWarning(warning);
    }
  }, [warning]);
  const clearWarningsTimer = useRef(null);
  useEffect(() => {
    if (!!warning) {
      clearWarningsTimer.current = setTimeout(() => {
        setWarning('');
      }, 3000);
    }
    else {
      clearTimeout(clearWarningsTimer.current);
    }
    return () => clearTimeout(clearWarningsTimer.current);
  }, [warning]);
  return (
    <AlertMessage
      type="warning"
      content={lastWarning}
      open={!!warning}
      onClose={() => setWarning('')}
    />
  )
};

function MatchPage() {
  const [question, setQuestion] = useState('');
  const [inputStatus, setInputStatus] = useState({}); // input status of boxes
  const [inputDict, setInputDict] = useState({}); // input values
  const [warning, setWarning] = useState('');

  const navigate = useNavigate();
  const [emptyPattern, setEmptyPattern] = useState('');
  const [visualPattern, setVisualPattern] = useState("");
  const [searchInput, setSearchInput] = useState(''); // user input question
  const [clearTrigger, clearInputComponent] = useState(0); // 0/1 trigger to clear all input

  // Extract this page's question and qid from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const question = params.get('question');
    if (question) {
      setQuestion(decodeURIComponent(question));
    } else {
      navigate('/');
    }
    if (params.get("pattern")) {
      setEmptyPattern(decodeURIComponent(params.get("pattern")));
    }
    if (params.get("input")) {
      const input = decodeURIComponent(params.get("input"));
      //const styledInput = input.replace(/\(([^)]+)\)/g, (match, p1) => <span style={{ color: '#3872f6' }}>({p1})</span>);
      const styledInput =
        input.split(/(\s+|\{.*?\}|\(.*?\))/).map((part, index) => {
          if (part.startsWith('(') && part.endsWith(')')) {
            return <span key={index} style={{ color: '#3872f6' }}>{part.slice(1, -1)}</span>;
          }
          return part;
        });
      setSearchInput(styledInput);
    }
  }, []);

  // Handle submit button click
  const handleSubmit = () => {
    //return; //disable for now
    //redirect to result page with question replaced with input values
    const replacedQuestion = question.replace(/\{(.*?)@(.*?)@\}/g, (match, key, defaultValue) => {
      return `{${key}@${inputDict[key] || defaultValue}@}`;
    });
    navigate(`/result?question=${encodeURIComponent(replacedQuestion)}`);
  };

  useEffect(() => {
    let connectedString = emptyPattern || '';
    console.log("inputDict:", inputDict);
    if (inputDict['gene']) {
      connectedString = connectedString.replace(/\{gene@.*?@}/, `{gene@${inputDict['gene']}@}`);
    }
    if (inputDict['cell']) {
      connectedString = connectedString.replace(/\{ontology@.*?@}/, `{ontology@${inputDict['cell']}@}`);
    }
    if (inputDict['snp']) {
      connectedString = connectedString.replace(/\{snp@.*?@}/, `{snp@${inputDict['snp']}@}`);
    }
    setVisualPattern(connectedString);
  }, [emptyPattern, inputDict]);

  return (
    <Container maxWidth={false} disableGutters sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: '40px',
      paddingLeft: { sm: 0, md: '6%' },
      paddingRight: { sm: 0, md: '6%' },
      paddingBottom: '40px',
    }}>
      <Box className="content-wrapper" sx={{
        width: '100%',
        maxWidth: '1200px',
        justifyContent: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Top Content Box */}
        <Box sx={{
          width: "calc(100% - 72px)",
          minHeight: '200px',
          marginTop: { sm: '5px', md: '20px' },
          marginRight: 1,
          marginLeft: { sm: '5%', md: 0 },
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          background: 'linear-gradient(90.7deg, #F5FAFF 10.46%, #FCFCFC 82.06%)',
          borderRadius: '20px',
          boxShadow: '8px 6px 33px 0px #D8E6F8',
          padding: '36px',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{
              fontSize: 28,
              fontWeight: 700,
              textAlign: 'left',
              fontFamily: 'Inter',
              color: '#1C3C68',
            }}>
              {"Please confirm we understand your query correctly:"}
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
            backgroundColor: '#EBF0FE',
            borderRadius: '12px',
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            padding: 2,
            width: 'calc(100% - 32px)',
            border: '1px solid #C2CCFF',
            gap: '2px',
          }}>
            <SearchComponent
              questionSchema={question}
              clearTrigger={clearTrigger}
              updateValues={setInputDict}
              setInputStatus={setInputStatus}
            />
          </Box>
          <Typography sx={{
            color: '#1C3C68',
            fontSize: 18,
            fontWeight: 400,
            fontFamily: 'Inter',
            marginTop: '4px',
            marginBottom: 2,
          }}>
            {"Your original search request: "} <br />
            {searchInput || 'No input provided'}
          </Typography>
          <WarningComponent
            warning={warning}
            setWarning={setWarning}
          />
        </Box>
        {/* Graph Visualization Box */}
        <Typography sx={{
          color: '#1C3C68',
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'Inter',
          marginTop: '40px',
          width: '100%',
          textAlign: 'left',
        }}>Graph visualization</Typography>
        <Box sx={{
          position: 'relative',
          width: "calc(100% - 72px)",
          minHeight: '300px',
          marginTop: '5px',
          marginRight: 1,
          marginLeft: { sm: '5%', md: 0 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '18px',
          background: 'linear-gradient(90.7deg, #F5FAFF 10.46%, #FCFCFC 82.06%)',
          borderRadius: '20px',
          boxShadow: '8px 6px 33px 0px #D8E6F8',
          padding: '36px',
        }}>
          <Box sx={{
            backgroundColor: 'transparent',
            borderRadius: '12px',
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            padding: 2,
            width: 'calc(100% - 32px)',
            maxWidth: "600px",
            fontFamily: 'Open Sans',
            fontWeight: 600,
          }}>
            {visualPattern ? (<>
              <MatchGraphViewer
                visualPattern={visualPattern}
                question={question}
              />
              <Link
                href="#"
                sx={{
                  position: 'absolute',
                  top: '36px',
                  right: '36px',
                  textDecoration: 'underline',
                  color: '#398289',
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: 'Open Sans',
                  cursor: 'pointer',
                  marginRight: 2,
                  zIndex: 9999,
                }}
              >
                Edit in graph Query
              </Link>
            </>
            ) : (
              <Typography sx={{ color: "#666", fontStyle: "italic" }}>
                Select a gene to see the visualization
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: '16px', width: 'calc(100% - 72px)', marginTop: '20px', justifyContent: 'flex-end' }}>
          {/* Clear Button */}
          <ClearButtonComponent onClick={() => {
            clearInputComponent(1 - clearTrigger);
          }} sx={{
            alignSelf: 'flex-end', marginTop: '16px',
            background: 'white',
            color: 'black',
            cursor: 'pointer',
            borderRadius: '40px',
            height: '44px',
            paddingX: '40px',
            border: '1px solid #CCD4FFA8',
            textTransform: 'none',
            fontSize: '16px',
            fontWeight: 600,
            fontFamily: 'Inter',
            boxShadow: "0px 2px 3.1px 0px #B9B9B933",
          }} sxOnDisabled={{
            color: 'gray',
            cursor: 'not-allowed',
          }} caption={"Clear All"} inputStatus={inputStatus} setWarning={setWarning} />
          {/* Submit Button */}
          <SubmitButtonComponent onClick={handleSubmit} sx={{
            alignSelf: 'flex-end', marginTop: '16px',
            background: 'linear-gradient(142.59deg, #4A65F4 14.08%, #758BFF 78.33%)',
            color: 'white',
            cursor: 'pointer',
            borderRadius: '40px',
            height: '44px',
            paddingX: '40px',
            textTransform: 'none',
            fontSize: '16px',
            fontWeight: 600,
            fontFamily: 'Inter',
            boxShadow: "0px 2px 3.1px 0px #B9B9B933",
          }} sxOnDisabled={{
            background: 'linear-gradient(90.46deg, rgba(112, 134, 253, 0.3) 0.44%, rgba(70, 99, 254, 0.3) 99.65%)',
            cursor: 'not-allowed',
          }} caption={"Submit"} inputStatus={inputStatus} setWarning={setWarning} />
        </Box>
      </Box>


    </Container>
  );
};


export default MatchPage;
