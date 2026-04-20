import './styles.css';

import React, {
  useEffect,
  useState,
} from 'react';

import DOMPurify from 'dompurify';
import JSON5 from 'json5';
import {
  useDispatch,
  useSelector,
} from 'react-redux';

import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  InfoOutlined as InfoOutlineIcon,
  Mail as MailIcon,
  NotificationsNone as NotificationsNoneIcon,
  Warning as WarningIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Pagination,
  Paper,
  Skeleton,
  styled,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  tooltipClasses,
  Typography,
} from '@mui/material';

import defaultErrorImage from '../image/datanotfound.png';
import notRelevant from '../image/not_relevant.png';
import { queryQueryResult } from '../redux/queryResultSlice';
import { setSearchTerms } from '../redux/searchSlice';
import { queryViewSchema } from '../redux/viewSchemaSlice';
import tooltipsSchema from '../schema/tool_tips_schema.json';
import {
  addHighlight,
  getGeneSymbol,
  replaceVariables,
} from '../utils/textProcessing';
import IntermediateKG from './IntermediateKG';

const tabsEnabled = true;

export const tabsQTL = [
  {
    "label": "Pancreatic eQTL",
    "data_source": "GTEx; SusieR",
    "folder": "1_eQTL-gtex-susie"
  },
  {
    "label": "Islet eQTL",
    "data_source": "INSPIRE; SusieR",
    "folder": "1_eQTL-inspire-susie"
  },
  {
    "label": "Pancreatic splicing QTL",
    "data_source": "splicing; GTEx",
    "folder": "1_sQTL-gtex-susie"
  },
  {
    "label": "Islet exon QTL",
    "data_source": "exon; INSPIRE",
    "folder": "1_exonQTL-inspire-susie"
  }
];

const WarningSNP = (
  <Alert
    variant="outlined"
    severity="warning"
    icon={<WarningAmberIcon fontSize="small" />}
    sx={{
      backgroundColor: "#FFF6EF",
      border: "1px solid #E77C40",
      color: "#E77C40",
      alignItems: "center",
      marginBottom: "10px",
      padding: "6px 12px",
      display: 'flex',
      fontSize: '15px',
      fontFamily: 'Open Sans',
      borderRadius: '8px',
    }}
  >
    Warning: The lead SNP of this credible set is not the SNP you searched for.
  </Alert>
);

export function ErrorComponent({ errorTitle = "Data not found", errorMessage = "No answer for your question in PanKgraph", agent = true, log = undefined, errorImageSrc = undefined, homePath = '/' }) {
  return (
    <Container sx={{
      padding: 0, display: 'flex',
      justifyContent: 'space-evenly',
      alignSelf: 'stretch',
      width: '100%',
      minWidth: 0,
      maxWidth: '100%',
      marginLeft: 0,
      marginRight: 0,
      flexDirection: 'column',
      flexGrow: 1,
      transform: 'translateY(-21px)',
      marginBottom: '-21px',
    }} disableGutters maxWidth={false}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '700px',
        height: '82.3%',
        gap: 2,
        backgroundColor: '#F2FAFB'
      }}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '36px',
          width: '460px',
          paddingX: '75px',
          paddingY: '75px',
          borderRadius: '32px',
          justifyContent: 'center',
          backgroundColor: 'white',
        }}>
          <Box component="img" src={errorImageSrc || (agent ? notRelevant : defaultErrorImage)} alt="Error" sx={{ width: "200px", marginTop: "-20px", marginBottom: '-20px' }} />
          <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: '36px', color: '#43AABA', marginBottom: '-12px', whiteSpace: 'nowrap' }}>
            {errorTitle}
          </Typography>
          <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 400, fontSize: '17px', color: '#6C6C6C' }}>
            {errorMessage}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '24px' }}>
            <Button
              variant="contained"
              onClick={() => window.location.href = homePath}
              sx={{
                backgroundColor: "#219197",
                border: "1px solid #219197",
                height: "50px",
                borderRadius: "25px",
                minWidth: "184px",
                paddingX: "37px",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#1A747A",
                  boxShadow: "none",
                },
              }}
            >
              <Typography sx={{
                color: "white",
                fontFamily: 'Open Sans',
                fontSize: "17px",
                fontWeight: "600",
                textTransform: "none",
              }}>
                Back to Home
              </Typography>
            </Button>
            <Button
              onClick={() => window.location.href = '/docs/tutorial'}
              sx={{
                backgroundColor: "white",
                border: "1px solid #219197",
                height: "50px",
                borderRadius: "25px",
                minWidth: "184px",
                paddingX: "37px",
                "&:hover": {
                  backgroundColor: "#CAD4DA",
                },
              }}
            >
              <Typography sx={{
                color: "#219197",
                fontFamily: 'Open Sans',
                fontSize: "17px",
                fontWeight: "600",
                textTransform: "none",
              }}>
                View Tutorial
              </Typography>
            </Button>
          </Box>
        </Box>
      </Box>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '150px',
        height: '17.7%',
        paddingY: '50px',
        justifyContent: 'space-between',
        backgroundColor: '#D4E9EA'
      }}>
        <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: '20px', color: 'black' }}>
          Need Assistance?
        </Typography>
        <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 400, fontSize: '20px', color: '#6C6C6C' }}>
          Our support team is here to assist you with any questions or technical issues.
        </Typography>
        <Button
          onClick={() => window.open('mailto:wyq@umich.edu, runbomao@umich.edu, drjieliu@umich.edu, fan.feng@vumc.org, help@pankbase.org' + (log ? ('?subject=PanKgraph Support Request&body=' + encodeURIComponent('Hello,\n\nI need assistance with PanKgraph.\n\nHere are the details:\n' + log)) : ''), '_blank')}
          sx={{
            backgroundColor: "white",
            border: "1px solid #219197",
            height: "50px",
            borderRadius: "25px",
            minWidth: "184px",
            paddingX: "37px",
            "&:hover": {
              backgroundColor: "#CAD4DA",
            },
          }}
          startIcon={<MailIcon sx={{ color: "#219197", }} />}
        >
          <Typography sx={{
            color: "#219197",
            fontFamily: 'Open Sans',
            fontSize: "17px",
            fontWeight: "600",
            textTransform: "none",
          }}>
            Email Support
          </Typography>
        </Button>
      </Box>
    </Container>
  );
}

function IntermediatePage({ onContinue }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const { viewSchema } = useSelector((state) => state.viewSchema);
  const { queryResult } = useSelector((state) => state.queryResult);
  const [cleanedQueryResult, setCleanedQueryResult] = useState(null);
  const [isNeptune, setIsNeptune] = useState(false);

  useEffect(() => {
    if (queryResult?.results) {
      // console.log(queryResult.results);
      let cleanedResult;
      if (isNeptune) {
        cleanedResult = JSON5.parse(queryResult.results) || [];
        // const lines = queryResult.results.trim().split('\n').slice(1);
        // cleanedResult = lines.map((line) => {
        //   const [dataSource, credibleSets] = JSON5.parse(`[${line}]`);
        //   return ({
        //     "data_source": dataSource,
        //     "credible_sets": credibleSets
        //   });
        // }
        // );
      }
      else {
        cleanedResult = queryResult.results?.[0]?.credible_sets?.map((cs) => ({
          "data_source": cs.data_source,
          "credible_sets": [cs]
        }));
      }
      if (!cleanedResult || cleanedResult.length === 0) { return; }
      setCleanedQueryResult({ results: cleanedResult });
    }
  }, [queryResult]);

  const searchState = useSelector((state) => state.search) || {
    sourceTerm: '',
    relationship: '',
    targetTerm: '',
    targetTermSymbol: '',
    sourceTermSymbol: '',
  };

  const [selectedTab, setSelectedTab] = useState('Pancreatic eQTL');
  const [currPage, setCurrPage] = useState(1);

  const [notification, setNotification] = useState(true);
  const [tableColumns, setTableColumns] = useState([]);

  const [toolTipsData, setToolTipsData] = useState({});
  const [queryData, setQueryData] = useState([]);

  const HtmlTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} classes={{ popper: className }} />
  ))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
      backgroundColor: '#219197',
      color: 'rgba(255, 255, 255, 0.87)',
      maxWidth: 220,
      fontSize: theme.typography.pxToRem(12),
      border: '1px solid #dadde9',
      shadow: '0 0 10px rgba(0, 0, 0, 0.1)',
    },
  }));

  const TooltipComponent = ({ title, content }) => (
    <>
      &nbsp;&nbsp;<HtmlTooltip
        title={
          <React.Fragment>
            <Typography color="inherit" sx={{ fontFamily: 'Open Sans' }}>{title}</Typography>
            {content || toolTipsData?.intermediate?.[title] || ""}
          </React.Fragment>
        }
      >
        <InfoOutlineIcon sx={{
          position: 'relative',
          top: "6px",
          right: 0,
          color: '#1976d2',
          cursor: 'pointer',
          width: "0.7em",
        }} />
      </HtmlTooltip>
    </>);

  const floatKeys = [
    "purity",
    "pip",
    "lead_pip"
  ];

  const tableValue = (item, column) => {
    // replace parts of the column.key that are not '(', ')', or ' '
    if (!item || !column || !column.key) return "-";
    const resultText = column.key.replace(/([^(\s)]+)/g, (match) => (
      item[match]
        ? (floatKeys.includes(match)
          ? item[match].toFixed(2)
          : item[match]
        ) : "-"
    ));
    if (column.key === "snp (pip)" && item.lead_snp && item.lead_snp !== item.snp) {
      return (
        <Box sx={{
          display: 'flex', flexDirection: 'row', alignItems: 'center', color: '#E77C40'
        }}>
          {resultText}
          <Tooltip title={WarningSNP} slotProps={{
            tooltip: {
              sx: {
                background: "none",
              },
            },
          }}>
            <WarningIcon />
          </Tooltip>
        </Box>
      );
    }
    return resultText;
  };

  const handleTabChange = (_, newValue) => {
    setCurrPage(1);
    setSelectedTab(newValue);
  };

  const handlePageChange = (_, newPage) => {
    setCurrPage(newPage);
  };

  useEffect(() => {
    const allResults = cleanedQueryResult?.results?.flatMap(result =>
      (result?.credible_sets || []).map(cs => ({
        ...cs,
        gene_symbol: getGeneSymbol(cs.credible_set_id),
      }))
    ) || [];
    // Group by data_source
    const groupedResults = allResults.reduce((acc, item) => (
      {
        ...acc,
        [item.data_source]: [
          ...(acc[item.data_source] || []),
          item
        ]
      }
    ), {});
    // Map to tabs or single result
    const mappedResult = tabsEnabled ? tabsQTL.map(({ label, data_source }) => (
      {
        label,
        result: groupedResults[data_source] || []
      }
    )) : [
      {
        label: "Pancreatic eQTL",
        result: allResults
      }
    ];
    // deduplicate results within each group
    const deduplicatedResults = mappedResult.map(({ label, result }) => ({
      label,
      result: [
        ...new Map(
          result.map(
            (cs, index) =>
              [cs.credible_set_id,
              { ...cs, credible_set: getCredibleSetLabel(cs, index + 1) }
              ]
          )
        ).values()
      ]
    }));
    // Jump to first SNP if only one result
    if (deduplicatedResults.flatMap((group) => (group.result)).length === 1) {
      const firstResult = deduplicatedResults.flatMap((group) => (group.result))[0];
      handleSNPClick(firstResult);
      return;
    }
    setQueryData(deduplicatedResults);
  }, [cleanedQueryResult]);

  useEffect(() => {
    if (queryData.flatMap((group) => (group.result)).length === 1) {
      const firstResult = queryData.flatMap((group) => (group.result))[0];
      handleSNPClick(firstResult);
    }
  }, [queryData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!cleanedQueryResult?.results || cleanedQueryResult.results.length === 0) {
        console.log("No results found within timeout period.");
        setError(true);
      }
      setLoading(false);
    }, 15000);

    // Clear error if results are found in 3 seconds
    if (cleanedQueryResult?.results && cleanedQueryResult.results.length > 0) {
      console.log("Results found, clearing error.");
      setError(false);
      setLoading(false);
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [cleanedQueryResult]);

  // const getDescription = (name) => {
  //   const descriptions = {
  //     "eQTL GTEx":
  //       "Identifies genetic variants regulating gene expression in pancreatic tissue using GTEx data.",
  //     "eQTL Gene-level InsPIRE":
  //       "Identifies genetic variants regulating gene expression in islet tissue using InsPIRE data.",
  //     "splicing QTL GTEx":
  //       "Identifies genetic variants influencing RNA splicing in pancreatic tissue using GTEx data.",
  //   };
  //   return descriptions[name] || "";
  // };

  const processedQuestion = viewSchema?.question?.[0]
    ? addHighlight(replaceVariables(
      viewSchema.question[0],
      {
        sourceTerm: searchState.sourceTerm,
        targetTerm: searchState.targetTerm,
        sourceSymbol: searchState.sourceTermSymbol,
        targetSymbol: searchState.targetTermSymbol,
      }
    ))
    : 'Loading...';

  const handleSNPClick = (item) => {
    if (!viewSchema.question_for_result) return;
    const {
      sourceTerm,
      targetTerm,
      relationship
    } = searchState;

    const additionalParams = sourceTerm.includes("snp@") ?
      {
        lead_snp: item.lead_snp,
        credible_set_id: item.credible_set_id,
      } : {};

    const params = new URLSearchParams({
      ...additionalParams,
      sourceTerm: sourceTerm.includes("@") ? sourceTerm : `${sourceTerm}@${item[sourceTerm]}`,
      targetTerm: targetTerm.includes("@") ? targetTerm : `${targetTerm}@${item[targetTerm]}`,
      relationship,
    });
    const resultLayout = new URLSearchParams(window.location.search).get('resultLayout');
    const resultPath = resultLayout === 'old' ? '/result' : '/result-new';
    window.location.href = `${resultPath}?${params.toString()}`;
  };

  // function to get the credible set label based on the data source and index
  const getCredibleSetLabel = (credibleSet, num) => {
    const prefix = {
      "GTEx; SusieR": "A",
      "INSPIRE; SusieR": "B",
      "splicing; GTEx": "C",
      "exon; INSPIRE": "D",
    }[credibleSet.data_source] || "";
    if (!prefix) return credibleSet.credible_set_id;
    return `CredibleSet_${prefix}${num}`;
  };

  const getFilteredResults = () => (
    queryData.find(item => item.label === selectedTab)?.result || []
  );

  const handleDownload = (category, credibleSet) => {
    const folder = tabsQTL.find(tab => tab.label === category)?.folder || "";
    const url = `https://pank-s3-to-share.s3.us-east-1.amazonaws.com/${folder}/${credibleSet}.txt`;
    window.open(url, "_blank");
    // fetch(url)
    //   .then(response => {
    //     if (!response.ok) {
    //       throw new Error('Network response was not ok');
    //     }
    //     return response.text();
    //   })
    //   .then(data => {
    //     const blob = new Blob([data], { type: 'text/plain' });
    //     const link = document.createElement('a');
    //     link.href = window.URL.createObjectURL(blob);
    //     link.download = `${credibleSet}__ld.txt`;
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    //   })
    //   .catch(error => {
    //     console.error('There was a problem with the fetch operation:', error);
    //   });
  };

  // read URL parameters and update Redux store
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceTerm = params.get('sourceTerm');
    const relationship = params.get('relationship');
    const targetTerm = params.get('targetTerm');
    const sourceSymbol = params.get('sourceSymbol') || "";
    const targetSymbol = params.get('targetSymbol') || params.get('targetTerm')?.split('@')[1] || "";
    if (sourceTerm && relationship && targetTerm) {
      dispatch(
        setSearchTerms({
          sourceTerm,
          relationship,
          targetTerm,
          targetTermSymbol: targetSymbol || "",
          sourceTermSymbol: sourceSymbol || "",
        })
      );

      dispatch(
        queryViewSchema({
          sourceTerm,
          relationship,
          targetTerm,
        })
      );

      const questionType = `${sourceTerm.split("@")[0]} - ${relationship} - ${targetTerm.split("@")[0]}`;
      const specificType = `${sourceTerm.includes("@") ? "specific" : "general"} - relationship - ${targetTerm.includes("@") ? "specific" : "general"}`;
      setToolTipsData(tooltipsSchema[questionType]?.[specificType]);
    }
  }, []);

  useEffect(() => {
    if (viewSchema?.cyper_for_intermediate_page) {
      const processedCypher = replaceVariables(
        viewSchema.cyper_for_intermediate_page,
        {
          sourceTerm: searchState.sourceTerm,
          targetTerm: searchState.targetTerm
        }
      );

      setIsNeptune(!searchState.sourceTerm.includes("snp@"));

      dispatch(queryQueryResult({
        query: processedCypher,
        // query rds if sourceTerm is a SNP
        // otherwise query neptune db
        isNeptune: !searchState.sourceTerm.includes("snp@"),
      })).unwrap();
    }
  }, [viewSchema, searchState.sourceTerm, searchState.targetTerm]);

  useEffect(() => {
    setTableColumns(
      viewSchema?.intermediate_page_table?.map((column) => ({
        label: Object.keys(column)[0] || "",
        key: Object.values(column)[0] || "",
      }))
    );
  }, [viewSchema]);

  useEffect(() => {
    if (queryData.length > 0) {
      setSelectedTab(queryData.find(group => group.result.length > 0)?.label || 'Pancreatic eQTL');
    }
  }, [queryData]);

  // error component for no data found
  if (error) return <ErrorComponent errorTitle={viewSchema?.inter_error_title} errorMessage={viewSchema?.inter_error_message} />;

  return (<Container sx={{
    padding: 0, display: 'flex',
    justifyContent: 'space-evenly',
    alignSelf: 'center',
    maxWidth: '1440px',
    minWidth: '1000px',
    marginTop: '24px',
    marginLeft: '20px',
    marginRight: '20px',
    flexDirection: 'column',
    flexGrow: 1,
  }} disableGutters maxWidth={false}>
    {/* Question box */}
    <Grid container spacing={2} height={"100%"} sx={{ alignItems: "stretch" }}>
      <Grid item xs={12} height={"100%"}>
        <Box sx={{ padding: '32px', backgroundColor: '#F2FAFB', marginTop: '30px', borderRadius: '20px' }}>
          <Box sx={{ width: "100%", justifyContent: "space-between", display: "flex", alignItems: "center" }}>
            <Typography sx={{ fontFamily: 'Open Sans', fontSize: '20px', textAlign: 'left', marginBottom: '10px', fontWeight: 600 }}>
              Question<TooltipComponent title="Question" />
            </Typography>
            {/*a link*/}
            <a href={"/"} style={{ color: "#398289", textDecoration: "none" }}>
              <Typography sx={{ fontFamily: 'Open Sans', color: "#398289", textDecoration: "underline", textUnderlineOffset: "3px", fontSize: "17px", marginBottom: "20px", fontWeight: 600 }}>
                CANCEL
              </Typography>
            </a>
          </Box>
          <Typography
            sx={{
              fontFamily: 'Open Sans',
              textAlign: 'left',
              fontSize: 24,
              fontWeight: 600,
            }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedQuestion) }}
          />
        </Box>
      </Grid>
    </Grid>
    {/* Result and KG Viewer */}
    {loading ?
      <Box sx={{ marginTop: '32px', marginBottom: '30px', display: 'flex', justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }}>
        <Skeleton variant="rectangular" sx={{ width: "50%", height: '700px', marginRight: '15px', borderRadius: '20px', }} />
        <Skeleton variant="rectangular" sx={{ width: "50%", height: '700px', marginLeft: '15px', borderRadius: '20px', }} />
      </Box> :
      <Grid container spacing={4} height={"100%"} sx={{ alignItems: "stretch", marginBottom: '20px' }}>
        {!loading && error && (
          <Grid item xs={12} height={"100%"}>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                backgroundColor: '#FFF3F3',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #FFB6B6',
                zIndex: 1000
              }}
            >
              <Typography sx={{ fontFamily: 'Open Sans', color: '#D32F2F', marginBottom: 2 }}>
                No data found. Please refresh the page and try again.
              </Typography>
              <Button
                variant="contained"
                onClick={() => window.location.href = '/'}
                sx={{
                  backgroundColor: '#D32F2F',
                  '&:hover': {
                    backgroundColor: '#B71C1C'
                  }
                }}
              >
                Refresh Page
              </Button>
            </Box>
          </Grid>
        )}

        {/* left side */}
        <Grid item xs={6} display="flex">
          <Box sx={{
            width: "100%",
            display: 'flex',
            flexDirection: 'column',
            paddingTop: '30px',
            flex: 1,
          }}>

            {/* search result */}

            <Box sx={{
              backgroundColor: '#F9FAFB',
              border: 1,
              borderColor: '#EEEEEE',
              borderRadius: '20px',
              flex: 1,
            }}>
              <Typography sx={{
                fontFamily: 'Open Sans',
                fontWeight: 800,
                fontSize: 22,
                paddingLeft: '30px', paddingTop: '30px'
              }}>
                Result<TooltipComponent title="Result" />
              </Typography>
              <div className="styled-paper" style={{ padding: '10px 32px' }}>
                <div className="answer-content">
                  <Typography sx={{ mb: 2, fontSize: 16, fontFamily: 'Open Sans', fontWeight: "400" }}>
                    Found <span style={{ color: "#3A838B", fontWeight: "700" }}>four</span> categories of Quantitative Trait Loci (QTL) data, derived from pancreatic and islet tissue samples.
                  </Typography>

                  <Alert
                    variant="outlined"
                    severity="info"
                    icon={<NotificationsNoneIcon fontSize="small" />}
                    sx={{
                      backgroundColor: "white",
                      border: "1px solid",
                      borderColor: "#23A6F0",
                      color: "#23A6F0",
                      alignItems: "center",
                      marginBottom: "10px",
                      padding: "6px 12px",
                      display: notification ? 'flex' : 'none',
                      fontSize: '15px',
                      fontFamily: 'Open Sans',
                      borderRadius: '8px',
                    }}
                    action={
                      <IconButton size="small" color="inherit" onClick={() => setNotification(false)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    Select an SNP entry below and click "View" to see detailed relationship data
                  </Alert>

                  {/* Tabs */}
                  {tabsEnabled && <Tabs
                    value={selectedTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons={false}

                    sx={{
                      '& .MuiButtonBase-root': {
                        padding: '10px'
                      },
                      '& .MuiTab-root': {
                        textTransform: 'none',
                        fontSize: '16px',
                        whiteSpace: 'normal',
                        margin: '0px',
                        '& .MuiTab-wrapper': {
                          flexDirection: 'row',
                          justifyContent: 'flex-start',
                          alignItems: 'flex-start'
                        }
                      },
                      '& .MuiTabs-flexContainer': {
                        gap: '0px',
                        justifyContent: 'space-between'
                      },
                      '& .MuiTabs-indicator': {
                        backgroundColor: '#3A838B',
                      }
                    }}
                  >
                    {queryData.map((option) => (
                      <Tab
                        sx={{
                          backgroundColor: 'none'
                        }}
                        key={option.label}
                        label={
                          <Typography
                            component="span"
                            sx={{
                              textAlign: 'left',
                              fontFamily: 'Open Sans',
                              fontSize: '16px',
                              color: selectedTab === option.label ? '#3A838B' : 'black',
                              fontWeight: selectedTab === option.label ? '800' : '500',
                            }}
                          >
                            {option.label} ({option.result.length})
                          </Typography>
                        }
                        value={option.label}
                      />
                    ))}
                  </Tabs>}

                  {/* table */}
                  <TableContainer component={Paper} sx={{
                    border: '1px solid #727272',
                    boxShadow: '0px 0px 0px 0px rgba(0,0,0,0.2)',
                    height: '100%',
                    maxHeight: '600px',
                    borderRadius: '8px',
                  }}>
                    <Table
                      size={getFilteredResults().length > 0 ? "small" : "medium"}
                      stickyHeader={true}
                      sx={{ minWidth: '600px' }}
                    >
                      <TableHead>
                        <TableRow>
                          {
                            tableColumns?.map((column, index) => (
                              <TableCell sx={{
                                fontWeight: 'bold',
                                padding: index === 0 ? '16px' : '16px 4px',
                                width: 'fit-content',
                                verticalAlign: 'middle',
                                textAlign: 'center',
                              }} key={column.key}>{column.label === "num" ? "#" : column.label}
                                <Tooltip
                                  slotProps={{
                                    tooltip: {
                                      sx: {
                                        backgroundColor: '#219197'
                                      }
                                    }
                                  }}
                                  title={<Typography sx={{ fontFamily: 'Open Sans', fontSize: '14px' }}>
                                    {toolTipsData?.intermediate_page_table?.[column.label] || ""}
                                  </Typography>
                                  }>
                                  <InfoIcon sx={{ height: '16px', verticalAlign: 'middle' }} />
                                </Tooltip>
                              </TableCell>
                            ))
                          }
                          <TableCell sx={{
                            fontWeight: 'bold',
                            padding: '16px 8px',
                            alignItems: 'center',
                            width: 'fit-content',
                            verticalAlign: 'middle',
                            textAlign: 'center',
                          }}>
                            Action
                            <Tooltip
                              slotProps={{
                                tooltip: {
                                  sx: {
                                    backgroundColor: '#219197'
                                  }
                                }
                              }}
                              title={<Typography sx={{ fontFamily: 'Open Sans', fontSize: '14px' }}>
                                {toolTipsData?.intermediate_page_table?.["Action"] || "TBD"}
                              </Typography>
                              }>
                              <InfoIcon sx={{ height: '16px', verticalAlign: 'middle' }} />
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getFilteredResults()
                          .concat(Array(5).fill({}))
                          .slice((currPage - 1) * 5, currPage * 5)
                          ?.map((item, index) => (
                            Object.keys(item).length === 0 ? (
                              <TableRow key={`empty-row-${index}`} sx={{
                                '& .MuiTableCell-root': {
                                  padding: '21.75px'
                                }
                              }}>
                                <TableCell colSpan={6} sx={{ textAlign: 'center', padding: '16px' }}>
                                  <Typography sx={{ fontFamily: 'Open Sans', fontSize: '19px', color: '#B0B0B0' }}>
                                    &nbsp;
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ) : (
                              <TableRow
                                key={`credible-set-${index}`}
                                sx={{
                                  '& .MuiTableCell-root': {
                                    padding: '16px'
                                  },
                                  ":hover": {
                                    backgroundColor: "#E4F0F1",
                                  }
                                }}
                              >
                                {tableColumns?.map((column, index) => (
                                  <TableCell sx={{ verticalAlign: 'middle', textAlign: 'center' }} key={column.key}>
                                    {index === 0
                                      ? (<Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        {item[column.key]}
                                        <IconButton
                                          aria-label="download"
                                          sx={{ color: '#3A838B', padding: '2px' }}
                                          onClick={() => handleDownload(selectedTab, item.credible_set_id)}
                                        >
                                          <DownloadIcon />
                                        </IconButton>
                                      </Box>)
                                      : tableValue(item, column, column)
                                    }
                                  </TableCell>))
                                }
                                <TableCell sx={{ verticalAlign: 'middle' }}>
                                  <Typography sx={{
                                    cursor: 'pointer',
                                    fontFamily: 'Open Sans',
                                    fontSize: '16px', paddingY: '8px', paddingX: '12px', backgroundColor: '#219197',
                                    textAlign: 'center', borderRadius: '8px', color: 'white',
                                    fontWeight: 700,
                                  }} onClick={() => handleSNPClick(item)}>View</Typography>
                                </TableCell>
                              </TableRow>
                            )
                          ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ padding: '6px 16px' }}>
                            <Pagination
                              count={Math.ceil(getFilteredResults().length / 5)}
                              page={currPage}
                              onChange={handlePageChange}
                              sx={{
                                display: 'flex',
                                justifyContent: 'center',
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </TableContainer>
                </div>
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  <Typography sx={{
                    fontFamily: 'Open Sans',
                    fontWeight: 600,
                    fontSize: 16,
                  }}>
                    Total records: {getFilteredResults().length}
                  </Typography>
                </Box>
              </div>
            </Box>
          </Box>
        </Grid>

        {/* right intermediate KG */}
        <Grid item xs={6} display="flex">
          <Box sx={{
            width: "100%",
            display: 'flex',
            flexDirection: 'column',
            paddingTop: '30px',
            flex: 1,
          }}>

            {/* KG Viewer */}
            <Box sx={{
              position: 'relative',
              minHeight: '472px',
              height: '100%',
              overflow: 'visible',
              backgroundColor: '#F9FAFB',
              border: 1,
              borderColor: '#EEEEEE',
              borderRadius: '20px'
            }}>
              <Typography sx={{
                fontFamily: 'Open Sans',
                fontWeight: 800,
                fontSize: 22,
                marginBottom: '16px', paddingLeft: '30px', paddingTop: '30px',
              }}>
                Graph Viewer<TooltipComponent title="Graph Viewer" />
              </Typography>
              <IntermediateKG data={{
                credible_sets: getFilteredResults().slice((currPage - 1) * 5, currPage * 5),
                type: searchState.sourceTerm.includes("snp@") ? "qtl" : "qtl_lead",
                intersectPositions: [
                  searchState.sourceTerm.includes("@") ? ["right"] : [],
                  searchState.targetTerm.includes("@") ? ["left"] : []
                ].flat(),
              }} />
            </Box>
            {/* Legend TBD */}
          </Box>
        </Grid>
      </Grid>}
  </Container >
  );
}

export default IntermediatePage;
