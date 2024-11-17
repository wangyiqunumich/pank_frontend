import React from 'react';
import { Container, Typography, List, ListItem, ListItemText, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useSelector, useDispatch } from 'react-redux';
import { queryQueryResult } from '../redux/queryResultSlice';
import { replaceTerms } from '../utils/textProcessing';
import { setProcessedQuestion } from '../redux/processedQuestionSlice';
import SearchBar from '../SearchBar';
import KnowledgeGraph from './KnowledgeGraph';

function IntermediatePage({ onContinue }) {
  const dispatch = useDispatch();

  const { viewSchema } = useSelector((state) => state.viewSchema);
  const { queryResult } = useSelector((state) => state.queryResult);
  const conversionTable = require('../utils/conversion_table.json');

  const processDataSources = () => {
    console.log(queryResult);
    if (!queryResult?.results) return {};
    
    const counts = {
      'GTEx; SusieR': 0,
      'INSPIRE; SusieR': 0,
      'splicing QTL GTEx': 0
    };
    
    // 按数据源分组的结果
    const groupedResults = {
      'GTEx; SusieR': [],
      'INSPIRE; SusieR': [],
      'splicing QTL GTEx': []
    };

    queryResult.results.forEach(result => {
      const dataSource = result.belong_to_credible_set["~properties"].data_source;
      if (dataSource && counts.hasOwnProperty(dataSource)) {
        counts[dataSource]++;
        groupedResults[dataSource].push(result);
      }
    });

    const items = {};
    Object.entries(counts).forEach(([kg_name, count]) => {
      const frontend_name = conversionTable.Conversion_table.data_source_KG_frontend[kg_name];
      if (frontend_name) {
        items[frontend_name] = {
          title: `${frontend_name} (${count})`,
          description: getDescription(frontend_name),
          results: groupedResults[kg_name].map(result => ({
            snpId: result.snp_node["~id"],
            geneId: result.gene_node["~id"],
            pip: result.belong_to_credible_set["~properties"].pip,
            nSnp: result.credible_set_node["~properties"].n_snp,
            purity: result.credible_set_node["~properties"].purity,
            leadSnp: result.credible_set_node["~properties"].lead_SNP
          }))
        };
      }
    });

    return items;
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

  console.log(queryResult);
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
        searchState.targetTerm
      )
    : 'Loading...';

  const [expandedItems, setExpandedItems] = React.useState({
    eQTL: true,
    splicing: false,
    exon: false
  });

  const handleExpand = (item) => {
    setExpandedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const handleSNPClick = async (snpId, geneId, dataSource, leadSnp) => {
    const { cyper_for_result_page_all_nodes_specific, question_for_result, next_questions } = viewSchema;
    if (!cyper_for_result_page_all_nodes_specific || !question_for_result) return;

    // 获取组织名称和数据源前端显示名称
    const tissueMap = conversionTable.Conversion_table.Tissue_KG_tissue_name;
    const dataSourceFrontend = dataSource;
    
    let tissue = '';
    if (dataSource === 'eQTL GTEx') {
      tissue = tissueMap['GTEx; SusieR'] || 'pancreatic tissue';
    } else if (dataSource === 'INSPIRE; SusieR') {
      tissue = tissueMap['INSPIRE; SusieR'] || 'islet tissue';
    }

    // 替换问题中的占位符
    const processedQuestion = question_for_result
      .replace(/@snp_node@/g, snpId)
      .replace(/@gene_node@/g, geneId)
      .replace(/@tissue@/g, tissue)
      .replace(/@data_source@/g, dataSourceFrontend);

    // 处理 next questions
    const processedNextQuestions = next_questions?.map(question => 
      question
        .replace(/@lead_snp_node@/g, leadSnp)
        .replace(/@gene_node@/g, geneId)
        .replace(/@tissue@/g, tissue)
        .replace(/@data_source@/g, dataSourceFrontend)
    ) || [];

    // 替换查询语句中的占位符
    const query = cyper_for_result_page_all_nodes_specific
      .replace(/@sequence_variant@/g, snpId)
      .replace(/@gene@/g, geneId);

    try {
      // 保存处理后的问题和下一步问题到 redux store
      dispatch(setProcessedQuestion({
        currentQuestion: processedQuestion,
        nextQuestions: processedNextQuestions
      }));
      onContinue();
      await dispatch(queryQueryResult({query: query})).unwrap();
    } catch (error) {
      console.error('Error executing query:', error);
    }
  };

  return (
    <Container maxWidth="xl">
      {/* 问题显示区域 */}
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 3,
        mt: 2,
        position: 'absolute',
        top: '130px',
        width: '100%'
      }}>
        <Box sx={{ width: '60%', visibility: 'hidden' }}>
          {/* 占位，保持与 SearchBar 相同宽度 */}
        </Box>
        <Typography 
          variant="body1" 
          sx={{ 
            flex: 1,
            textAlign: 'left'
          }}
          dangerouslySetInnerHTML={{ __html: processedQuestion }}
        />
      </Box>

      {/* 主要内容区域 */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3,
        minHeight: '600px',
        mt: '60px'  // 为上方的绝对定位元素留出空间
      }}>
        {/* 左侧知识图谱 */}
        <Box sx={{ 
          width: '40%',
          position: 'relative',
          borderRadius: '20px',  // 改为圆角
          minHeight: '100px',
          boxShadow: '0px 3px 3px -2px rgba(0,0,0,0.2), 0px 3px 4px 0px rgba(0,0,0,0.14), 0px 1px 8px 0px rgba(0,0,0,0.12)',  // 添加阴影
          padding: '32px',
          paddingTop: '48px',
          '&::before': {  // 添加标题样式
            content: '"KG viewer"',
            position: 'absolute',
            top: '-15px',
            left: '20px',
            backgroundColor: 'white',
            padding: '0 10px',
            fontSize: '1.2rem',
            fontWeight: 'bold'
          }
        }}>
          <Box sx={{ 
            width: '100%', 
            height: 'calc(100% - 40px)'
          }}>
            <KnowledgeGraph />
          </Box>
        </Box>

        {/* 右侧搜索结果 */}
        <Box sx={{ 
          width: '60%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <div className="styled-paper" data-title="Answer">
            <div className="answer-content">
              <Typography variant="body2" sx={{ mb: 2 }}>
                Displayed here are four types of QTL (quantitative trait loci) data, utilizing pancreatic or islet tissue samples to target gene/exon expression or splicing.
              </Typography>
              
              <List sx={{ width: '100%' }}>
                {Object.entries(items).map(([key, item]) => (
                  <ListItem 
                    key={key}
                    sx={{ 
                      bgcolor: 'white',
                      mb: 1,
                      borderRadius: 1,
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      border: '1px solid #e0e0e0'
                    }}
                  >
                    <Box 
                      sx={{ 
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleExpand(key)}
                    >
                      <ListItemText primary={item.title} />
                      {expandedItems[key] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </Box>
                    
                    {expandedItems[key] && (
                      <Box sx={{ mt: 1, mb: 1, width: '100%' }}>
                        <Typography variant="body2" color="text.secondary">
                          {item.description}
                        </Typography>
                        {item.results.map((result, index) => (
                          <Typography 
                            key={index}
                            variant="body2" 
                            sx={{ 
                              mt: 1,
                              color: '#0000FF',
                              textDecoration: 'underline',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleSNPClick(result.snpId, result.geneId, key, result.leadSnp)}
                          >
                            SNP {result.snpId} with PIP = {result.pip} in a credible set of {result.nSnp} SNP purity = {result.purity}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </ListItem>
                ))}
              </List>
            </div>
          </div>
        </Box>
      </Box>
    </Container>
  );
}

export default IntermediatePage;
