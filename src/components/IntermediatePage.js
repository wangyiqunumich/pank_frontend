import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Paper,
  Pagination,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  Tabs,
  Typography,
} from '@mui/material';

import { styled } from '@mui/material/styles';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';

import InfoIcon from '@mui/icons-material/Info';
import InfoOutlineIcon from '@mui/icons-material/InfoOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';

import IntermediateKG from './IntermediateKG';

import { queryQueryResult } from '../redux/queryResultSlice';
import { queryViewSchema } from '../redux/viewSchemaSlice';
import { setSearchTerms } from '../redux/searchSlice';
import tooltipsSchema from '../schema/tool_tips_schema.json';

import './styles.css'

import {
  getDataSourceInfo,
  replaceVariables,
  addHighlight,
} from '../utils/textProcessing';



function IntermediatePage({ onContinue }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const { viewSchema } = useSelector((state) => state.viewSchema);
  const { queryResult } = useSelector((state) => state.queryResult);
  const conversionTable = require("../utils/conversion_table.json");
  const [rootLabel, setRootLabel] = useState("");

  const [selectedTab, setSelectedTab] = useState('');
  const [currPage, setCurrPage] = useState(1);

  const [notification, setNotification] = useState(true);
  const [tableColumns, setTableColumns] = useState([]);

  const [toolTipsData, setToolTipsData] = useState({});

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
            {toolTipsData?.intermediate?.[title] || ""}
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
  ];

  const handleTabChange = (event, newValue) => {
    setCurrPage(1);
    setSelectedTab(newValue);
  };

  const handlePageChange = (event, newPage) => {
    setCurrPage(newPage);
  };

  const processDataSources = () => {
    console.log("Query Result:", JSON.stringify(queryResult, null, 2));
    if (!queryResult?.results || queryResult.results.length === 0) {
      return {
        Pancreatic: {
          "eQTL GTEx": 0,
          "eQTL InsPIRE": 0,
          "Splicing QTL GTEx": 0,
          "Exon QTL InsPIRE": 0,
        },
        Islet: {
          "eQTL GTEx": 0,
          "eQTL InsPIRE": 0,
          "Splicing QTL GTEx": 0,
          "Exon QTL InsPIRE": 0,
        },
      };
    }

    const counts = {
      Pancreatic: {
        "eQTL GTEx": 0,
        "eQTL InsPIRE": 0,
        "Splicing QTL GTEx": 0,
        "Exon QTL InsPIRE": 0,
      },
      Islet: {
        "eQTL GTEx": 0,
        "eQTL InsPIRE": 0,
        "Splicing QTL GTEx": 0,
        "Exon QTL InsPIRE": 0,
      },
    };

    const results = queryResult.results;

    results.forEach(result => {
      if (!result?.credible_sets) return;


      const uniqueCredibleSets = Array.from(
        new Map(result.credible_sets.map(item => [item.credible_set_id, item])).values()
      );

      uniqueCredibleSets.forEach((cs) => {
        if (!cs?.data_source) return;

        const { tissue, frontendKG } = getDataSourceInfo(cs.data_source, conversionTable);
        if (tissue && frontendKG) {
          const tissueKey = tissue === "pancreatic" ? "Pancreatic" : "Islet";
          counts[tissueKey][frontendKG] =
            (counts[tissueKey][frontendKG] || 0) + 1;
        }
      });
      console.log(counts["Pancreatic"]["Exon QTL InsPIRE"]);
    });

    return counts;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!queryResult?.results || queryResult.results.length === 0) {
        setError(true);
      }
      setLoading(false);
    }, 3000);

    // 如果在 3s 内获取到了数据,清除错误状态
    if (queryResult?.results && queryResult.results.length > 0) {
      setError(false);
      setLoading(false);
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [queryResult]);

  const getDescription = (name) => {
    const descriptions = {
      "eQTL GTEx":
        "Identifies genetic variants regulating gene expression in pancreatic tissue using GTEx data.",
      "eQTL Gene-level InsPIRE":
        "Identifies genetic variants regulating gene expression in islet tissue using InsPIRE data.",
      "splicing QTL GTEx":
        "Identifies genetic variants influencing RNA splicing in pancreatic tissue using GTEx data.",
    };
    return descriptions[name] || "";
  };

  const items = processDataSources();

  const searchState = useSelector((state) => state.search) || {
    sourceTerm: '',
    relationship: '',
    targetTerm: '',
    targetTermSymbol: '',
    sourceTermSymbol: '',
  };
  console.log(searchState);
  console.log(viewSchema?.question);

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

  const handleSNPClick = async (item) => {
    const {
      question_for_result,
      next_questions,
    } = viewSchema;
    console.log(1);
    let {
      sourceTerm,
      targetTerm,
      sourceTermSymbol,
      targetTermSymbol,
      relationship
    } = searchState;
    if (!question_for_result)
      return;

    let sourceSymbol = sourceTermSymbol;
    let targetSymbol = targetTermSymbol;

    // 从 searchTerms 中获取 geneId
    if (!sourceTerm.includes(":")) {
      sourceTerm = sourceTerm + ":" + (item[sourceTerm] || item[`${sourceTerm}_id`] || sourceTerm);
    }
    if (!targetTerm.includes(":")) {
      targetTerm = targetTerm + ":" + (item[targetTerm] || item[`${targetTerm}_id`] || targetTerm);
    }

    const params = new URLSearchParams({
      sourceTerm,
      targetTerm,
      sourceSymbol,
      targetSymbol,
      relationship,
    });

    window.location.href = `/result?${params.toString()}`;
  };

  // 添加一个新的辅助函数来获取 credibleSet 的显示标签
  const getCredibleSetLabel = (credibleSet) => {
    let prefix = "";
    switch (credibleSet.data_source) {
      case "GTEx; SusieR":
        prefix = "A";
        break;
      case "INSPIRE; SusieR":
        prefix = "B";
        break;
      case "splicing; GTEx":
        prefix = "C";
        break;
      case "exon; INSPIRE":
        prefix = "D";
        break;
      default:
        return credibleSet.credible_set_id;
    }

    const setNumber = credibleSet.credible_set_id.split('_').pop().slice(11);
    return `CredibleSet_${prefix}${setNumber}`;
  };

  const getFilteredResults = () => {
    const allResults = queryResult?.results?.flatMap(result =>
      (result?.credible_sets || []).map(cs => ({
        ...cs,
        credible_set_id: getCredibleSetLabel(cs).replace('_', ' ')  // 添加显示标签
      }))
    ) || [];

    const selectedResults = allResults.filter(cs => {
      switch (selectedTab) {
        case 'Pancreatic eQTL':
          return cs.data_source === 'GTEx; SusieR';
        case 'Islet eQTL':
          return cs.data_source === 'INSPIRE; SusieR';
        case 'Pancreatic splicing QTL':
          return cs.data_source === 'splicing; GTEx';
        case 'Islet exon QTL':
          return cs.data_source === 'exon; INSPIRE';
        default:
          return true;
      }
    });

    return Array.from(
      new Map(selectedResults.map(item => [item.credible_set_id, item])).values()
    );
  };

  const handleCredibleSetClick = (credibleSet) => {
    console.log(credibleSet);
  };

  const handleDownload = (credibleSet) => {
    console.log(credibleSet);
  };

  const getTabOptions = () => {
    const counts = processDataSources();
    return [
      {
        label: "Pancreatic eQTL",
        count: counts.Pancreatic["eQTL GTEx"],
      },
      {
        label: "Islet eQTL",
        count: counts.Islet["eQTL InsPIRE"],
      },
      {
        label: "Pancreatic splicing QTL",
        count: counts.Pancreatic["Splicing QTL GTEx"],
      },
      {
        label: "Islet exon QTL",
        count: counts.Islet["Exon QTL InsPIRE"],
      },
    ];
  };

  // 添加从 URL 读取参数的逻辑
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let sourceTerm = params.get('sourceTerm');
    const relationship = params.get('relationship');
    let targetTerm = params.get('targetTerm');
    let sourceSymbol = params.get('sourceSymbol') || "";
    let targetSymbol = params.get('targetSymbol') || "";
    console.log(sourceTerm, relationship, targetTerm);
    setRootLabel(targetSymbol || "");
    if (sourceTerm && relationship && targetTerm) {
      // 更新 Redux store 中的搜索条件
      dispatch(
        setSearchTerms({
          sourceTerm,
          relationship,
          targetTerm,
          targetTermSymbol: targetSymbol || "",
          sourceTermSymbol: sourceSymbol || "",
        })
      );

      // 使用这些参数执行查询
      dispatch(
        queryViewSchema({
          sourceTerm,
          relationship,
          targetTerm,
        })
      );

      let questionType = `${sourceTerm.split(":")[0]} - ${relationship} - ${targetTerm.split(":")[0]}`;
      let specificType = `${sourceTerm.includes(":") ? "specific" : "general"} - relationship - ${targetTerm.includes(":") ? "specific" : "general"}`;
      setToolTipsData(tooltipsSchema[questionType]?.[specificType]);
    }
  }, []); // 仅在组件挂载时执行一次

  function replaceCypherTerms(cypher, sourceTerm, targetTerm, sourceSymbol = "", targetSymbol = "") {
    const sourceType = sourceTerm.split(":")[0];
    const sourceValue = sourceTerm.split(":")[1] || sourceType;
    const targetType = targetTerm.split(":")[0];
    const targetValue = targetTerm.split(":")[1] || targetType;

    return cypher.replace(/@([^@]+)@/g, (match, term) => {
      if (term === sourceType || term === `${sourceType}_id`) {
        return sourceValue;
      } else if (term === targetType || term === `${targetType}_id`) {
        return targetValue;
      } else if (term === `${sourceType}_symbol`) {
        return sourceSymbol;
      } else if (term === `${targetType}_symbol`) {
        return targetSymbol;
      }
      return match;
    });
  }

  useEffect(() => {
    if (viewSchema.cyper_for_intermediate_page) {
      const processedCypher = replaceCypherTerms(
        viewSchema.cyper_for_intermediate_page,
        searchState.sourceTerm,
        searchState.targetTerm
      );
      console.log("Processed Cypher:", processedCypher);
      dispatch(queryQueryResult({ query: processedCypher })).unwrap();
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
    if (queryResult?.results) {
      const counts = processDataSources();
      const tabOptions = [
        { label: "Pancreatic eQTL", count: counts.Pancreatic["eQTL GTEx"] },
        { label: "Islet eQTL", count: counts.Islet["eQTL InsPIRE"] },
        {
          label: "Pancreatic splicing QTL",
          count: counts.Pancreatic["Splicing QTL GTEx"],
        },
        { label: "Islet Exon QTL", count: counts.Islet["Exon QTL InsPIRE"] },
      ];


      // 找到第一个计数不为 0 的选项
      const firstNonZeroTab = tabOptions.find((tab) => tab.count > 0);
      if (firstNonZeroTab) {
        setSelectedTab(firstNonZeroTab.label);
      } else {
        setSelectedTab("Pancreatic eQTL"); // 默认值
      }
    }
  }, [queryResult]);

  // 添加错误提示组件
  if (error) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 2
      }}>
        <Typography variant="h6" color="error" sx={{ fontFamily: 'Open Sans' }}>
          No data found. Please try another gene.
        </Typography>
        <Button
          variant="contained"
          onClick={() => window.location.href = '/'}
          sx={{
            backgroundColor: "#219197",
            "&:hover": {
              backgroundColor: "#1A747A",
            },
          }}
        >
          Back to Home
        </Button>
      </Box>
    );
  }

  return (<Container sx={{
    padding: 0, display: 'flex',
    flexDirection: 'column', justifyContent: 'space-evenly',
    alignSelf: 'center',
    maxWidth: '1440px',
    minWidth: '1000px',
    marginLeft: '20px',
    marginRight: '20px',
    flexDirection: 'column',
    flexGrow: 1,
  }} disableGutters maxWidth={false}>
    {/* 问题显示区域 */}
    <Grid container spacing={2} height={"100%"} sx={{ alignItems: "stretch" }}>
      <Grid item xs={12} height={"100%"}>
        <Box sx={{ padding: '32px', backgroundColor: '#F2FAFB', marginTop: '60px', borderRadius: '20px' }}>
          <Box sx={{ width: "100%", justifyContent: "space-between", display: "flex", alignItems: "center" }}>
            <Typography sx={{ fontFamily: 'Open Sans', fontSize: '20px', textAlign: 'left', marginBottom: '10px', fontWeight: 600 }}>
              Question<TooltipComponent title="Question" content="User's question." />
            </Typography>
            {/*a link*/}
            <a href={"/"} style={{ color: "#398289", textDecoration: "none" }}>
              <Typography sx={{ color: "#398289", textDecoration: "underline", textUnderlineOffset: "3px", fontSize: "16px", marginBottom: "20px", fontWeight: 600 }}>
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
            dangerouslySetInnerHTML={{ __html: processedQuestion }}
          />
        </Box>
      </Grid>
    </Grid>
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

          {/* 搜索结果 */}

          <Box sx={{
            backgroundColor: '#FBFBFB',
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
              // position: 'absolute',
              // top: -44,
              // left: 0,
              // zIndex: 1
            }}>
              Result<TooltipComponent title="Result" content="Search result." />
            </Typography>
            <div className="styled-paper" style={{ padding: '10px 32px' }}>
              <div className="answer-content">
                <Typography sx={{ mb: 2, fontSize: 16, fontFamily: 'Open Sans' }}>
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
                    display: "flex",
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
                  Select an SNP entry below and click "Click for more" to see detailed relationship data
                </Alert>

                {/* 添加 Tabs */}
                <Tabs
                  value={selectedTab}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons={false}
                  sx={{
                    '& .MuiButtonBase-root': {
                      padding: '10px'
                    },
                    '& .MuiTab-root': {
                      // minHeight: '60px',
                      textTransform: 'none',
                      fontSize: '16px',
                      whiteSpace: 'normal',
                      // lineHeight: '1.2',
                      // width: '120px',
                      // minWidth: '120px',
                      // maxWidth: '120px',
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
                    }
                  }}
                >
                  {getTabOptions().map((option) => (
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
                            // lineHeight: 1.2,
                            // wordWrap: 'break-word'
                          }}
                        >
                          {option.label} ({option.count})
                        </Typography>
                      }
                      value={option.label}
                    />
                  ))}
                </Tabs>

                {/* 详细结果表格 */}
                <TableContainer component={Paper} sx={{
                  border: '1px solid #727272',
                  boxShadow: '0px 0px 0px 0px rgba(0,0,0,0.2)',
                  height: '100%',
                  maxHeight: '410px',
                  borderRadius: '8px',
                }}>
                  <Table
                    size={getFilteredResults().length > 0 ? "small" : "medium"}
                    // size={'small'}
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
                          // display: 'flex',
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
                              TBD
                            </Typography>}>
                            <InfoIcon sx={{ height: '16px', verticalAlign: 'middle' }} />
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getFilteredResults()
                        .concat(Array(5).fill({}))
                        .slice((currPage - 1) * 5, currPage * 5)
                        .map((item, index) => (
                          Object.keys(item).length === 0 ? (
                            <TableRow key={`empty-row-${index}`} sx={{
                              '& .MuiTableCell-root': {
                                padding: '16.25px'
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
                              onClick={() => handleSNPClick(item)}
                              sx={{
                                cursor: 'pointer',
                                '& .MuiTableCell-root': {
                                  padding: '16px'
                                },
                                ":hover": {
                                  backgroundColor: "#E4F0F1",
                                }
                              }}
                            >
                              {tableColumns.map((column, index) => (
                                <TableCell sx={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                  {index === 0
                                    ? (<Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                      {item[column.key]}
                                      <IconButton aria-label="download" sx={{ color: '#3A838B', padding: '2px' }}>
                                        <DownloadIcon />
                                      </IconButton>
                                    </Box>)
                                    : (item[column.key]
                                      ? (floatKeys.includes(column.key)
                                        ? item[column.key].toFixed(2)
                                        : item[column.key]
                                      ) : "-"
                                    )
                                  }
                                </TableCell>))
                              }
                              <TableCell sx={{ verticalAlign: 'middle' }}>
                                <Typography sx={{
                                  fontFamily: 'Open Sans',
                                  fontSize: '14px', padding: '4px', backgroundColor: '#219197',
                                  textAlign: 'center', borderRadius: '8px', color: 'white',
                                  fontWeight: 700,
                                }} onClick={() => handleSNPClick(item)}>Click for more</Typography>
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
                  Total rows: {getTabOptions().map((option) => (option.count)).reduce((a, b) => a + b, 0)}
                </Typography>
              </Box>
            </div>
          </Box>
        </Box>
      </Grid>

      {/* right侧知识图谱区域 */}
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
            backgroundColor: '#FBFBFB',
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
              Graph viewer<TooltipComponent title="Graph viewer" content="Graph viewer." />
            </Typography>
            <IntermediateKG data={{ credible_sets: getFilteredResults().slice((currPage - 1) * 5, currPage * 5), root: rootLabel }} />
          </Box>

          {/* Legend */}
          {/* <Box sx={{
          position: 'relative',
          padding: '20px',
          backgroundColor: '#FBFBFB',
          border: 1,
          borderColor: '#EEEEEE',
          marginBottom: '40px'
        }}>
          <Typography sx={{
            fontWeight: 800,
            fontSize: 20,
            position: 'absolute',
            top: -44,
            left: 0,
            zIndex: 1
          }}>
            Legend
          </Typography>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            {/* 第一行 
            <Box sx={{
              display: 'flex',
              // gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2
            }}>
              <Box sx={{ flex: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, backgroundColor: '#ABD0F1', borderRadius: '4px' }} />
                <Typography variant="body2">Gene</Typography>
              </Box>
              <Box sx={{ flex: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, backgroundColor: '#FFB77F', borderRadius: '4px' }} />
                <Typography variant="body2">Sequence variant</Typography>
              </Box>
              <Box sx={{ flex: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 20, backgroundColor: '#43978F', borderRadius: '4px' }} />
                <Typography variant="body2">Credible set</Typography>
              </Box>
            </Box>
          </Box>
        </Box> */}
        </Box>
      </Grid>
    </Grid>
  </Container >
  );
}

export default IntermediatePage;
