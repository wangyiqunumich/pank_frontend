import React from 'react';
import { 
  Container, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Box,
  Link,
  Tabs,
  Tab
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useSelector, useDispatch } from 'react-redux';
import { queryQueryResult } from '../redux/queryResultSlice';
import { replaceTerms } from '../utils/textProcessing';
import { setProcessedQuestion } from '../redux/processedQuestionSlice';
import { queryQueryVisResult } from '../redux/queryVisResultSlice';
import SearchBar from '../SearchBar';
import KnowledgeGraph from './KnowledgeGraph';
import { setSearchTerms } from '../redux/searchSlice';
import { setVariables } from '../redux/variablesSlice';
import { replaceVariables } from '../utils/textProcessing';
import IntermediateKG from './IntermediateKG';
import { getDataSourceInfo } from '../utils/textProcessing';
import { useState } from 'react';

function IntermediatePage({ onContinue }) {
  const dispatch = useDispatch();

  const { viewSchema } = useSelector((state) => state.viewSchema);
  const { queryResult } = useSelector((state) => state.queryResult);
  const conversionTable = require('../utils/conversion_table.json');

  const [selectedTab, setSelectedTab] = useState('Pancreatic eQTL');
  
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
    if (!queryResult?.results?.[0]) return {
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
    targetTerm: '' 
  };

  const processedQuestion = viewSchema?.question?.[0]
    ? replaceTerms(
        viewSchema.question[0], 
        searchState.sourceTerm, 
        searchState.relationship, 
        searchState.targetTerm,
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
    if (dataSource === 'eQTL GTEx') {
      tissueKey = tissueMap['GTEx; SusieR'] || 'pancreatic tissue';
    } else if (dataSource === 'INSPIRE; SusieR') {
      tissueKey = tissueMap['INSPIRE; SusieR'] || 'islet tissue';
    }
    
    // 保存变量到 Redux store
    const variables = {
      snpId,
      leadSnp,
      geneId,
      tissueKey,
      dataSource: dataSourceFrontend
    };
    
    dispatch(setVariables(variables));

    // 处理当前问题
    const processedCurrentQuestion = replaceVariables(question_for_result, variables);
    console.log(processedCurrentQuestion);

    // 处理下一步问题
    const processedNextQuestions = next_questions?.map(item => {
      const params = item.parameters || {};
      
      // 使用 replaceVariables 处理问题文本
      let processedQuestion = replaceVariables(item.question, variables);

      // 准备新的搜索条件
      let newSearchState = {
        sourceTerm: '',
        relationship: '',
        targetTerm: ''
      };

      // 遍历参数并设置搜索条件
      let paramEntries = Object.entries(params);
      if (paramEntries.length >= 3) {
        // 第一个参数作为 source
        const [sourceKey, sourceType] = paramEntries[0];
        // 第二个参数作为 relationship
        const [_, relationship] = paramEntries[1];
        // 第三个参数作为 target
        const [targetKey, targetType] = paramEntries[2];

        // 处理 source term
        if (sourceKey.startsWith('@') && sourceKey.endsWith('@')) {
          const sourceTerm = sourceKey.slice(1, -1) === 'lead_snp_node' ? leadSnp :
                            sourceKey.slice(1, -1) === 'gene_node' ? geneId :
                            sourceKey.slice(1, -1) === 'tissue' ? tissueKey :
                            sourceKey.slice(1, -1) === 'data_source' ? dataSourceFrontend : '';
          newSearchState.sourceTerm = `${sourceType}:${sourceTerm}`;
        }

        // 设置 relationship
        newSearchState.relationship = relationship;

        // 处理 target term
        if (targetKey.startsWith('@') && targetKey.endsWith('@')) {
          const targetTerm = targetKey.slice(1, -1) === 'lead_snp_node' ? leadSnp :
                            targetKey.slice(1, -1) === 'gene_node' ? geneId :
                            targetKey.slice(1, -1) === 'tissue' ? tissueKey :
                            targetKey.slice(1, -1) === 'data_source' ? dataSourceFrontend : '';
          newSearchState.targetTerm = `${targetType}:${targetTerm}`;
        }
      }

      // 分发更新搜索条件的 action
      console.log(newSearchState);
      dispatch(setSearchTerms(newSearchState));

      return processedQuestion;
    }) || [];

    // 替换查询语句中的占位符
    const query = cyper_for_result_page_all_nodes_specific
      .replace(/@snp_node@/g, snpId)
      .replace(/@gene_node@/g, geneId);

    // 处理 AI 问题数组
    const processedAiQuestions = viewSchema?.ai_question_for_result?.map(question => {
      let processedQuestion = question;
      // 替换所有可能的占位符
      if (snpId) processedQuestion = processedQuestion.replace(/@snp_node@/g, snpId);
      if (geneId) processedQuestion = processedQuestion.replace(/@gene_node@/g, geneId);
      if (tissueKey) processedQuestion = processedQuestion.replace(/@tissue@/g, tissueKey);
      if (dataSourceFrontend) processedQuestion = processedQuestion.replace(/@data_source@/g, dataSourceFrontend);
      return processedQuestion;
    }) || [];

    const processedAiAnswerTitle = viewSchema?.ai_answer_title.replace(/@snp_node@/g, snpId).replace(/@gene_id@/g, geneId);
    const { tissue, frontendKG } = getDataSourceInfo(dataSource, conversionTable);
    console.log(dataSource, tissue);
    const currentQuestionType = `${frontendKG} ${tissue}` + ' Tissue';
    try {
      // 保存处理后的问题和下一步问题到 redux store
      dispatch(setProcessedQuestion({
        currentQuestion: processedCurrentQuestion,
        nextQuestions: processedNextQuestions,
        aiQuestions: processedAiQuestions,
        aiAnswerTitle: processedAiAnswerTitle,
        aiAnswerSubtitle: viewSchema?.ai_answer_sub_title,
        currentQuestionType: currentQuestionType
      }));
      onContinue();
      await dispatch(queryQueryVisResult({query: query})).unwrap();
      await dispatch(queryQueryResult({query: query})).unwrap();
    } catch (error) {
      console.error('Error executing query:', error);
    }
  };

  const getFilteredCredibleSets = () => {
    const allCredibleSets = queryResult?.results?.flatMap(result => 
      result?.credible_sets || []
    ) || [];

    // 首先根据 id 去重
    const uniqueCredibleSets = Array.from(
      new Map(allCredibleSets.map(item => [item.id, item])).values()
    );

    // 然后根据选中的 tab 进行筛选
    return uniqueCredibleSets.filter(cs => {
      switch(selectedTab) {
        case 'Pancreatic eQTL':
          return cs.data_source === 'GTEx; SusieR';
        case 'Islet eQTL':
          return cs.data_source === 'INSPIRE; SusieR';
        case 'Pancreatic splicing QTL':
          return cs.data_source === 'GTEx; Splicing';
        case 'Islet Exon QTL':
          return cs.data_source === 'exon; INSPIRE';
        default:
          return true;
      }
    });
  };

  return (
    <Container sx={{ padding: 0 }} disableGutters>
      {/* 问题显示区域 */}
      <Box
          flexDirection="column"
          sx={{
        // display: 'flex',
        alignItems: 'center',
        gap: 0,
        position: 'absolute',
        top: '162px',
        right: window.innerWidth * 0.5 + 44,
        width: 685
      }}>
        {/*<Box sx={{ width: '60%', visibility: 'hidden' }} />*/}
        <Typography sx={{ fontSize: 24, width: 685, textAlign: 'left', fontWeight: 'bold' }}>
          Current question
        </Typography>
        <Typography
          sx={{ 
            width: 685,
            textAlign: 'left',
            fontSize: 20,
          }}
          dangerouslySetInnerHTML={{ __html: processedQuestion }}
        />
      </Box>

      {/* 主要内容区域 */}
      <Box sx={{ 
        display: 'flex',
        minHeight: '950px',
      }}>
        {/* 左侧知识图谱区域 */}
        <Box sx={{ 
          width: 685,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          position: 'absolute',
          top: 354,
          right: window.innerWidth * 0.5 + 44
        }}>
          <Typography sx={{
            fontWeight: 'bold',
            fontSize: 24,
            position: 'absolute',
            top: -20,
            left: 20,
            zIndex: 1
          }}>
            Graph viewer
          </Typography>
          {/* KG Viewer */}
          <Box sx={{ 
            position: 'relative',
            borderRadius: '16px',
            minHeight: '472px',
            boxShadow: '0px 4px 4px 0px rgba(0,0,0,0.25)',
            overflow: 'visible',
            backgroundColor: '#F7F7F7'
          }}>
              <IntermediateKG />
          </Box>

          {/* Legend */}
          <Box sx={{
            position: 'relative',
            borderRadius: '16px',
            padding: '32px',
            backgroundColor: '#F7F7F74D',
            boxShadow: '0px 3px 3px -2px rgba(0,0,0,0.2), 0px 3px 4px 0px rgba(0,0,0,0.14), 0px 1px 8px 0px rgba(0,0,0,0.12)',
          }}>
            <Typography sx={{
              fontWeight: 'bold',
              fontSize: 24,
              position: 'absolute',
              top: -20,
              left: 20,
              zIndex: 1
            }}>
              Legend
            </Typography>
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              {/* 第一行 */}
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, backgroundColor: '#ABD0F1', borderRadius: '4px' }} />
                  <Typography variant="body2">Gene</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, backgroundColor: '#FFB77F', borderRadius: '4px' }} />
                  <Typography variant="body2">Sequence Variant</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, backgroundColor: '#F6C957', borderRadius: '4px' }} />
                  <Typography variant="body2">Pathway</Typography>
                </Box>
              </Box>
              {/* 第二行 */}
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, backgroundColor: '#8c561b', borderRadius: '4px' }} />
                  <Typography variant="body2">Ontology</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, backgroundColor: '#e377c2', borderRadius: '4px' }} />
                  <Typography variant="body2">Article</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 20, height: 20, backgroundColor: '#8c564b', borderRadius: '4px' }} />
                  <Typography variant="body2">Open Chromatin Region</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* 右侧搜索结果 */}
        <Box sx={{ 
          width: 672,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          position: 'absolute',
          left: window.innerWidth * 0.5 + 44,
          top: 354,
          backgroundColor: '#F7F7F799'
        }}>
          <Typography sx={{
            fontWeight: 'bold',
            fontSize: 24,
            position: 'absolute',
            top: -20,
            left: 20,
            zIndex: 1
          }}>
            Result
          </Typography>
          <div className="styled-paper">
            <div className="answer-content">
              <Typography sx={{ mb: 2, fontSize: 16 }}>
                Found four categories of Quantitative Trait Loci (QTL) data, derived from pancreatic and islet tissue samples.
              </Typography>
              
              {/* 添加 Tabs */}
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                sx={{
                  mb: 2,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontSize: '14px',
                    minHeight: '40px'
                  }
                }}
              >
                {tabOptions.map((tab) => (
                  <Tab 
                    key={tab}
                    label={tab}
                    value={tab}
                    sx={{
                      borderRadius: '4px 4px 0 0',
                      '&.Mui-selected': {
                        backgroundColor: '#B0CFD04D'
                      }
                    }}
                  />
                ))}
              </Tabs>

              {/* 详细结果表格 */}
              <TableContainer component={Paper} sx={{ 
                border: '1px solid #727272',
                boxShadow: '0px 0px 0px 0px rgba(0,0,0,0.2)'
              }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Credible set</TableCell>
                      <TableCell>Purity</TableCell>
                      <TableCell>Lead SNP</TableCell>
                      <TableCell>PIP</TableCell>
                      <TableCell>#</TableCell>
                      <TableCell>Download</TableCell>
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
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)'
                          }
                        }}
                      >
                        <TableCell sx={{ textDecoration: 'underline', color: 'blue' }}>
                          {`Credible set ${index + 1}`}
                        </TableCell>
                        <TableCell>{item.purity?.toFixed(2) || '-'}</TableCell>
                        <TableCell>{item.lead_SNP || '-'}</TableCell>
                        <TableCell>{item.pip?.toFixed(2) || '-'}</TableCell>
                        <TableCell>{item.n_snp || '-'}</TableCell>
                        <TableCell>
                          <Link 
                            component="button"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            Link
                          </Link>
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
    </Container>
  );
}

export default IntermediatePage;
