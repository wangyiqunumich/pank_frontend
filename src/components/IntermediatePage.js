import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Link,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';

import { styled } from '@mui/material/styles';
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip';

import InfoIcon from '@mui/icons-material/Info';
import InfoOutlineIcon from '@mui/icons-material/InfoOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';

import NavBar from '../NavBar';
import SearchBar from '../SearchBar';
import KnowledgeGraph from './KnowledgeGraph';
import IntermediateKG from './IntermediateKG';

import { queryQueryResult } from '../redux/queryResultSlice';
import { queryQueryVisResult } from '../redux/queryVisResultSlice';
import { queryViewSchema } from '../redux/viewSchemaSlice';
import { setProcessedQuestion } from '../redux/processedQuestionSlice';
import { setSearchTerms, setUsingFallback } from '../redux/searchSlice';
import { setVariables } from '../redux/variablesSlice';

import {
  getDataSourceInfo,
  replaceTerms,
  replaceVariables,
} from '../utils/textProcessing';

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
          <Typography color="inherit">{title}</Typography>
          {content}
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

function IntermediatePage({ onContinue }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const { viewSchema } = useSelector((state) => state.viewSchema);
  const { queryResult } = useSelector((state) => state.queryResult);
  const conversionTable = require('../utils/conversion_table.json');

  const [selectedTab, setSelectedTab] = useState('');

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [notification, setNotification] = useState(true);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize);
    return (_) => {
      window.removeEventListener('resize', handleResize);
    };
  });

  const tabOptions = [
    'Pancreatic eQTL',
    'Islet eQTL',
    'Pancreatic splicing QTL',
    'Islet Exon QTL'
  ];

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const processDataSources = () => {
    console.log('Query Result:', JSON.stringify(queryResult, null, 2));
    if (!queryResult?.results || queryResult.results.length === 0) {
      return {
        'Pancreatic': {
          'eQTL GTEx': 0,
          'eQTL InsPIRE': 0,
          'Splicing QTL GTEx': 0,
          'Exon QTL InsPIRE': 0
        },
        'Islet': {
          'eQTL GTEx': 0,
          'eQTL InsPIRE': 0,
          'Splicing QTL GTEx': 0,
          'Exon QTL InsPIRE': 0
        }
      };
    }

    const counts = {
      'Pancreatic': {
        'eQTL GTEx': 0,
        'eQTL InsPIRE': 0,
        'Splicing QTL GTEx': 0,
        'Exon QTL InsPIRE': 0
      },
      'Islet': {
        'eQTL GTEx': 0,
        'eQTL InsPIRE': 0,
        'Splicing QTL GTEx': 0,
        'Exon QTL InsPIRE': 0
      }
    };

    const results = queryResult.results;

    results.forEach(result => {
      if (!result?.credible_sets) return;

      const uniqueCredibleSets = Array.from(
        new Map(result.credible_sets.map(item => [item.id, item])).values()
      );

      uniqueCredibleSets.forEach(cs => {
        if (!cs?.data_source) return;

        const { tissue, frontendKG } = getDataSourceInfo(cs.data_source, conversionTable);
        console.log(frontendKG);
        if (tissue && frontendKG) {
          const tissueKey = tissue === 'pancreatic' ? 'Pancreatic' : 'Islet';
          counts[tissueKey][frontendKG] = (counts[tissueKey][frontendKG] || 0) + 1;
        }
      });
      console.log(counts['Pancreatic']['Exon QTL InsPIRE']);
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
      'eQTL GTEx': 'Identifies genetic variants regulating gene expression in pancreatic tissue using GTEx data.',
      'eQTL Gene-level InsPIRE': 'Identifies genetic variants regulating gene expression in islet tissue using InsPIRE data.',
      'splicing QTL GTEx': 'Identifies genetic variants influencing RNA splicing in pancreatic tissue using GTEx data.'
    };
    return descriptions[name] || '';
  };

  const items = processDataSources();

  const searchState = useSelector((state) => state.search) || {
    sourceTerm: '',
    relationship: '',
    targetTerm: '',
    targetTermSymbol: ''
  };
  console.log(searchState)

  const processedQuestion = viewSchema?.question?.[0]
    ? replaceTerms(
      viewSchema.question[0],
      searchState.sourceTerm,
      searchState.relationship,
      searchState.targetTerm,
      searchState.targetTermSymbol,
      false,  // isNextQuestion
      false   // addStyle
    )
    : 'Loading...';

  const handleSNPClick = async (snpId, dataSource, leadSnp) => {
    const { cyper_for_result_page_all_nodes_specific, question_for_result, next_questions } = viewSchema;
    if (!cyper_for_result_page_all_nodes_specific || !question_for_result) return;

    // 从 searchTerms 中获取 geneId
    let geneId = '';
    console.log(searchState);
    if (searchState.sourceTerm.startsWith('gene:')) {
      geneId = searchState.sourceTerm.split(':')[1];
    } else if (searchState.targetTerm.startsWith('gene:')) {
      geneId = searchState.targetTerm.split(':')[1];
    }

    if (!geneId) {
      console.error('No gene ID found in search terms');
      return;
    }

    // 获取组织名称和数据源前端显示名称
    const tissueMap = conversionTable.Conversion_table.Tissue_KG_tissue_name;
    const dataSourceFrontend = dataSource;

    let tissueKey = '';
    if (dataSource === 'GTEx; SusieR') {
      tissueKey = tissueMap['GTEx; SusieR'] || 'pancreatic tissue';
    } else if (dataSource === 'INSPIRE; SusieR') {
      tissueKey = tissueMap['INSPIRE; SusieR'] || 'islet tissue';
    } else if (dataSource === 'splicing; GTEx') {
      tissueKey = 'pancreas';
    }


    const params = new URLSearchParams({
      snpId: snpId,
      leadSnp: leadSnp,
      geneId: geneId,
      relationship: searchState.relationship,
      tissueKey: tissueKey,
      dataSource: dataSourceFrontend,
      geneSymbol: searchState.targetTermSymbol
    });

    window.location.href = `/result?${params.toString()}`;
    // dispatch(setVariables(variables));

    // 处理当前问题
    // const processedCurrentQuestion = replaceVariables(question_for_result, variables);
    // console.log(processedCurrentQuestion);

    // // 处理下一步问题
    // const processedNextQuestions = next_questions?.map(item => {
    //   const params = item.parameters || {};

    //   const questionVariables = {
    //     ...variables,
    //     snpId: 'rs17510162',
    //     leadSnp: 'rs17510162',
    //     geneId: 'ENSG00000134242',
    //     geneSymbol: 'ptpn22'
    //   };

    //   // 使用更新后的变量对象进行替换
    //   let processedQuestion = replaceVariables(item.question, questionVariables);

    //   console.log(processedQuestion);
    //   // 准备新的搜索条件
    //   let newSearchState = {
    //     sourceTerm: '',
    //     relationship: '',
    //     targetTerm: '',
    //     targetTermSymbol: searchState.targetTermSymbol
    //   };

    //   // 遍历参数并设置搜索条件
    //   let paramEntries = Object.entries(params);
    //   if (paramEntries.length >= 3) {
    //     // 第一个参数作为 source
    //     const [sourceKey, sourceType] = paramEntries[0];
    //     // 第二个参数作为 relationship
    //     const [_, relationship] = paramEntries[1];
    //     // 第三个参数作为 target
    //     const [targetKey, targetType] = paramEntries[2];

    //     // 处理 source term
    //     if (sourceKey.startsWith('@') && sourceKey.endsWith('@')) {
    //       const sourceTerm = sourceKey.slice(1, -1) === 'lead_snp_node' ? leadSnp :
    //                         sourceKey.slice(1, -1) === 'gene_node' ? geneId :
    //                         sourceKey.slice(1, -1) === 'tissue' ? tissueKey :
    //                         sourceKey.slice(1, -1) === 'data_source' ? dataSourceFrontend : '';
    //       newSearchState.sourceTerm = `${sourceType}:${sourceTerm}`;
    //     }

    //     // 设置 relationship
    //     newSearchState.relationship = relationship;

    //     // 处理 target term
    //     if (targetKey.startsWith('@') && targetKey.endsWith('@')) {
    //       const targetTerm = targetKey.slice(1, -1) === 'lead_snp_node' ? leadSnp :
    //                         targetKey.slice(1, -1) === 'gene_node' ? geneId :
    //                         targetKey.slice(1, -1) === 'tissue' ? tissueKey :
    //                         targetKey.slice(1, -1) === 'data_source' ? dataSourceFrontend : '';
    //       newSearchState.targetTerm = `${targetType}:${targetTerm}`;
    //     }
    //   }

    //   // 分发更新搜索条件的 action
    //   console.log(newSearchState);
    //   dispatch(setSearchTerms(newSearchState));

    //   return processedQuestion;
    // }) || [];

    // // 替换查询语句中的占位符
    // const query = cyper_for_result_page_all_nodes_specific
    //   .replace(/@snp_node@/g, snpId)
    //   .replace(/@gene_node@/g, geneId);

    // // 处理 AI 问题数组
    // const processedAiQuestions = viewSchema?.ai_question_for_result?.map(question => {
    //   let processedQuestion = question;
    //   // 替换所有可能的占位符
    //   if (snpId) processedQuestion = processedQuestion.replace(/@snp_node@/g, snpId);
    //   if (geneId) processedQuestion = processedQuestion.replace(/@gene_node@/g, geneId);
    //   if (tissueKey) processedQuestion = processedQuestion.replace(/@tissue@/g, tissueKey);
    //   if (dataSourceFrontend) processedQuestion = processedQuestion.replace(/@data_source@/g, dataSourceFrontend);
    //   return processedQuestion;
    // }) || [];

    // const processedAiAnswerTitle = viewSchema?.ai_answer_title.replace(/@snp_node@/g, snpId).replace(/@gene_id@/g, geneId);
    // const { tissue, frontendKG } = getDataSourceInfo(dataSource, conversionTable);
    // console.log(dataSource, tissue);
    // const currentQuestionType = `${frontendKG} ${tissue}` + ' Tissue';
    // try {
    //   // 保存处理后的问题和下一步问题到 redux store
    //   dispatch(setProcessedQuestion({
    //     currentQuestion: processedCurrentQuestion,
    //     nextQuestions: processedNextQuestions,
    //     aiQuestions: processedAiQuestions,
    //     aiAnswerTitle: processedAiAnswerTitle,
    //     aiAnswerSubtitle: viewSchema?.ai_answer_sub_title,
    //     currentQuestionType: currentQuestionType
    //   }));
    //   onContinue();
    //   await dispatch(queryQueryVisResult({query: query})).unwrap();
    //   await dispatch(queryQueryResult({query: query})).unwrap();
    // } catch (error) {
    //   console.error('Error executing query:', error);
    // }
  };

  // 添加一个新的辅助函数来获取 credibleSet 的显示标签
  const getCredibleSetLabel = (credibleSet) => {
    let prefix = '';
    switch (credibleSet.data_source) {
      case 'GTEx; SusieR':
        prefix = 'A';
        break;
      case 'INSPIRE; SusieR':
        prefix = 'B';
        break;
      case 'splicing; GTEx':
        prefix = 'C';
        break;
      case 'exon; INSPIRE':
        prefix = 'D';
        break;
      default:
        return credibleSet.id;
    }

    const setNumber = credibleSet.id.split('_').pop().slice(11);
    return `CredibleSet_${prefix}${setNumber}`;
  };

  const getFilteredCredibleSets = () => {
    const allCredibleSets = queryResult?.results?.flatMap(result =>
      (result?.credible_sets || []).map(cs => ({
        ...cs,
        displayLabel: getCredibleSetLabel(cs)  // 添加显示标签
      }))
    ) || [];

    // 首先根据 id 去重
    const uniqueCredibleSets = Array.from(
      new Map(allCredibleSets.map(item => [item.id, item])).values()
    );

    // 然后根据选中的 tab 进行筛选
    return uniqueCredibleSets.filter(cs => {
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
        label: 'Pancreatic eQTL',
        count: counts.Pancreatic['eQTL GTEx']
      },
      {
        label: 'Islet eQTL',
        count: counts.Islet['eQTL InsPIRE']
      },
      {
        label: 'Pancreatic splicing QTL',
        count: counts.Pancreatic['Splicing QTL GTEx']
      },
      {
        label: 'Islet exon QTL',
        count: counts.Islet['Exon QTL InsPIRE']
      }
    ];
  };

  // 添加从 URL 读取参数的逻辑
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceTerm = params.get('sourceTerm');
    const relationship = params.get('relationship');
    const targetTerm = params.get('targetTerm');
    const targetSymbol = params.get('targetSymbol');


    if (sourceTerm && relationship && targetTerm) {
      // 更新 Redux store 中的搜索条件
      dispatch(setSearchTerms({
        sourceTerm,
        relationship,
        targetTerm,
        targetTermSymbol: targetSymbol || ''
      }));

      // 使用这些参数执行查询
      dispatch(queryViewSchema({
        sourceTerm,
        relationship,
        targetTerm,
        targetTermSymbol: targetSymbol || ''
      }));


    }
  }, []); // 仅在组件挂载时执行一次

  function replaceCypherTerms(cypher, sourceTerm, targetTerm) {
    const sourceType = sourceTerm.split(':')[0];
    const sourceValue = sourceTerm.split(':')[1] || sourceType;
    const targetType = targetTerm.split(':')[0];
    const targetValue = targetTerm.split(':')[1] || targetType;

    return cypher.replace(/@([^@]+)@/g, (match, term) => {
      if (term === sourceType) {
        return sourceValue;
      } else if (term === targetType) {
        return targetValue;
      }
      return match;
    });
  }

  useEffect(() => {
    if (viewSchema.cyper_for_intermediate_page && viewSchema.cyper_for_intermediate_KG_viewer) {
      const processedCypher = replaceCypherTerms(
        viewSchema.cyper_for_intermediate_page,
        searchState.sourceTerm,
        searchState.targetTerm
      );
      const processedCypherForKGViewer = replaceCypherTerms(
        viewSchema.cyper_for_intermediate_KG_viewer,
        searchState.sourceTerm,
        searchState.targetTerm
      );
      dispatch(queryQueryVisResult({ query: processedCypherForKGViewer })).unwrap();
      dispatch(queryQueryResult({ query: processedCypher })).unwrap();
    }
  }, [viewSchema, searchState.sourceTerm, searchState.targetTerm]);

  useEffect(() => {
    if (queryResult?.results) {
      const counts = processDataSources();
      const tabOptions = [
        { label: 'Pancreatic eQTL', count: counts.Pancreatic['eQTL GTEx'] },
        { label: 'Islet eQTL', count: counts.Islet['eQTL InsPIRE'] },
        { label: 'Pancreatic splicing QTL', count: counts.Pancreatic['Splicing QTL GTEx'] },
        { label: 'Islet Exon QTL', count: counts.Islet['Exon QTL InsPIRE'] }
      ];

      // 找到第一个计数不为 0 的选项
      const firstNonZeroTab = tabOptions.find(tab => tab.count > 0);
      if (firstNonZeroTab) {
        setSelectedTab(firstNonZeroTab.label);
      } else {
        setSelectedTab('Pancreatic eQTL'); // 默认值
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
        <Typography variant="h6" color="error">
          No data found. Please try another gene.
        </Typography>
        <Button
          variant="contained"
          onClick={() => window.location.href = '/'}
          sx={{
            backgroundColor: '#219197',
            '&:hover': {
              backgroundColor: '#1A747A'
            }
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
        <Box sx={{ padding: '20px', backgroundColor: '#E4F0F1', marginTop: '60px', borderRadius: '20px' }}>
          <Box sx={{ width: "100%", justifyContent: "space-between", display: "flex", alignItems: "center" }}>
            <Typography sx={{ fontSize: '20px', textAlign: 'left', marginBottom: '10px', fontWeight: 600 }}>
              Question<TooltipComponent title="Question" content="User's question." />
            </Typography>
            {/*a link*/}
            <a href={"/"} style={{ color: "#398289", textUnderlineOffset: "3px", fontSize: "16px", marginBottom: "20px" }}>
              CANCEL
            </a>
          </Box>
          <Typography
            sx={{
              textAlign: 'left',
              fontSize: 16,
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
            <Typography sx={{ color: '#D32F2F', marginBottom: 2 }}>
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
      <Grid item xs={6} height={"700px"} display="flex">
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
              fontWeight: 800,
              fontSize: 20,
              paddingLeft: '30px', paddingTop: '30px'
              // position: 'absolute',
              // top: -44,
              // left: 0,
              // zIndex: 1
            }}>
              Result<TooltipComponent title="Result" content="Search result." />
            </Typography>
            <div className="styled-paper">
              <div className="answer-content">
                <Typography sx={{ mb: 2, fontSize: 14 }}>
                  Found four categories of Quantitative Trait Loci (QTL) data, derived from pancreatic and islet tissue samples.
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
                    display: notification ? 'flex' : 'none',
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
                        backgroundColor: selectedTab === option.label ? '#E4F0F1' : 'none'
                      }}
                      key={option.label}
                      label={
                        <Typography
                          component="span"
                          sx={{
                            textAlign: 'left',
                            fontSize: '14px',
                            color: 'black'
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
                }}>
                  <Table
                    size={getFilteredCredibleSets().length > 0 ? "small" : "medium"}
                    // size={'small'}
                    stickyHeader={true}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{
                          fontWeight: 'bold',
                          padding: getFilteredCredibleSets().length > 8 ? '8px' : '16px',
                          alignItems: 'center',
                          // display: 'flex',
                          justifyContent: 'center',
                          width: 'fit-content'
                        }}>Credible set
                          <Tooltip
                            slotProps={{
                              tooltip: {
                                sx: {
                                  backgroundColor: '#219197'
                                }
                              }
                            }}
                            title={<Typography sx={{ fontSize: '14px' }}>
                              Credible set represents a group of genetic variants within a genomic region associated with a trait, identified through statistical fine-mapping. Each variant in the set is assigned a posterior probability, indicating its likelihood of being linked to the observed trait, with the entire set typically capturing a predefined confidence level.
                            </Typography>
                            }>
                            <InfoIcon sx={{ height: '16px', verticalAlign: 'middle' }} />
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{
                          fontWeight: 'bold',
                          padding: getFilteredCredibleSets().length > 8 ? '8px' : '16px 8px',
                          alignItems: 'center',
                          // display: 'flex',
                          justifyContent: 'center',
                          width: 'fit-content'
                        }}>
                          Purity
                          <Tooltip
                            slotProps={{
                              tooltip: {
                                sx: {
                                  backgroundColor: '#219197'
                                }
                              }
                            }}
                            title={<Typography sx={{ fontSize: '14px' }}>
                              Purity represents the proportion of the genetic association signal captured by the credible set; higher purity indicates higher confidence and quality of the set.
                            </Typography>}>
                            <InfoIcon sx={{ height: '16px', verticalAlign: 'middle' }} />
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{
                          fontWeight: 'bold',
                          padding: getFilteredCredibleSets().length > 8 ? '8px' : '16px 8px',
                          alignItems: 'center',
                          // display: 'flex',
                          width: 'fit-content'
                        }}>
                          Lead SNP
                          <Tooltip
                            slotProps={{
                              tooltip: {
                                sx: {
                                  backgroundColor: '#219197'
                                }
                              }
                            }}
                            title={<Typography sx={{ fontSize: '14px' }}>
                              Lead SNP refers to the genetic variant with the strongest association signal within the credible set, often considered the most likely causal variant.
                            </Typography>}>
                            <InfoIcon sx={{ height: '16px', verticalAlign: 'middle' }} />
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{
                          fontWeight: 'bold',
                          padding: getFilteredCredibleSets().length > 8 ? '8px' : '16px 8px',
                          alignItems: 'center',
                          // display: 'flex',
                          width: 'fit-content'
                        }}>
                          PIP
                          <Tooltip
                            slotProps={{
                              tooltip: {
                                sx: {
                                  backgroundColor: '#219197'
                                }
                              }
                            }}
                            title={<Typography sx={{ fontSize: '14px' }}>
                              PIP (Posterior Inclusion Probability) quantifies the probability of a specific variant being the causal driver of the observed genetic signal; a higher PIP suggests greater confidence in causality.
                            </Typography>}>
                            <InfoIcon sx={{ height: '16px', verticalAlign: 'middle' }} />
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{
                          fontWeight: 'bold',
                          padding: getFilteredCredibleSets().length > 8 ? '8px' : '16px 8px',
                          width: 'fit-content',
                        }}
                        >
                          #
                          <Tooltip
                            slotProps={{
                              tooltip: {
                                sx: {
                                  backgroundColor: '#219197'
                                }
                              }
                            }}
                            title={<Typography sx={{ fontSize: '14px' }}>
                              # (Number of Variants) indicates the total count of genetic variants included in the credible set, encompassing all variants contributing to the signal.
                            </Typography>}>
                            <InfoIcon sx={{ height: '16px', verticalAlign: 'middle' }} />
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{
                          fontWeight: 'bold',
                          padding: getFilteredCredibleSets().length > 8 ? '8px' : '16px 8px',
                          alignItems: 'center',
                          // display: 'flex',
                          width: 'fit-content'
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
                            title={<Typography sx={{ fontSize: '14px' }}>
                              TBD
                            </Typography>}>
                            <InfoIcon sx={{ height: '16px', verticalAlign: 'middle' }} />
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getFilteredCredibleSets().map((item, index) => (
                        <TableRow
                          key={`credible-set-${index}`}
                          onClick={() => handleSNPClick(
                            item.lead_SNP,
                            item.data_source,
                            item.lead_SNP
                          )}
                          sx={{
                            cursor: 'pointer',
                            '& .MuiTableCell-root': {
                              padding: getFilteredCredibleSets().length > 8 ? '8px' : '16px'
                            },
                            ":hover": {
                              backgroundColor: "#E4F0F1",
                            }
                          }}
                        >
                          <TableCell sx={{ verticalAlign: 'middle' }}>
                            <Link
                              component="button"
                              variant="body2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSNPClick(
                                  item.lead_SNP,
                                  item.data_source,
                                  item.lead_SNP
                                );
                              }}
                              sx={{
                                textAlign: 'left', display: 'block', padding: '4px', color: 'black',
                                textDecoration: 'none',
                                hover: {
                                  textDecoration: 'none',
                                  color: 'black'
                                }
                              }}
                            >
                              {item.displayLabel?.replace('_', ' ')}
                            </Link>
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'middle' }}>{item.purity?.toFixed(2) || '-'}</TableCell>
                          <TableCell sx={{ verticalAlign: 'middle' }}>{item.lead_SNP}</TableCell>
                          <TableCell sx={{ verticalAlign: 'middle' }}>{item.pip?.toFixed(2) || '-'}</TableCell>
                          <TableCell sx={{ verticalAlign: 'middle' }}>{item.n_snp || '-'}</TableCell>
                          <TableCell sx={{ verticalAlign: 'middle' }}>
                            <Typography sx={{
                              fontSize: '14px', padding: '4px', backgroundColor: '#219197',
                              textAlign: 'center', borderRadius: '8px', color: 'white',
                            }}>Click for more</Typography>
                            {/*<Link */}
                            {/*  component="button" */}
                            {/*  variant="body2" */}
                            {/*  onClick={(e) => {*/}
                            {/*    e.stopPropagation();*/}
                            {/*    handleDownload(item);*/}
                            {/*  }}*/}
                            {/*>*/}
                            {/*  Link*/}
                            {/*</Link>*/}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </div>
          </Box>
        </Box>
      </Grid>

      {/* right侧知识图谱区域 */}
      <Grid item xs={6} height={"700px"} display="flex">
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
              fontWeight: 800,
              fontSize: 20,
              marginBottom: '16px', paddingLeft: '30px', paddingTop: '30px',
            }}>
              Graph viewer<TooltipComponent title="Graph viewer" content="Graph viewer." />
            </Typography>
            <IntermediateKG />
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
