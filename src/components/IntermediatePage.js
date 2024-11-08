import React from 'react';
import { Container, Typography, List, ListItem, ListItemText, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useSelector, useDispatch } from 'react-redux';
import { queryQueryResult } from '../redux/queryResultSlice';
import { replaceTerms } from '../utils/textProcessing';
import { setProcessedQuestion } from '../redux/processedQuestionSlice';

function IntermediatePage({ onContinue }) {
  const dispatch = useDispatch();

  const { viewSchema } = useSelector((state) => state.viewSchema);
  const { queryResult } = useSelector((state) => state.queryResult);
  const conversionTable = require('../utils/conversion_table.json');

  const processDataSources = () => {
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
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ bgcolor: '#f5f5f5', p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="span" sx={{ mr: 1 }}>
            Search Result For:
          </Typography>
          <Typography variant="h6" component="span" dangerouslySetInnerHTML={{ 
            __html: processedQuestion
          }} />
        </Box>
        
        <Box sx={{ 
          borderBottom: '2px solid #bdbdbd',
          width: '100%', 
          my: 2 
        }} />
        
        <Typography variant="body2" sx={{ mb: 3 }}>
          Displayed here are four types of QTL (quantitative trait loci) data, utilizing pancreatic or islet tissue samples to target gene/exon expression or splicing.
        </Typography>
        
        <List>
          {Object.entries(items).map(([key, item]) => (
            <ListItem 
              key={key}
              sx={{ 
                bgcolor: 'white',
                mb: 1,
                borderRadius: 1,
                flexDirection: 'column',
                alignItems: 'flex-start'
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
      </Box>
    </Container>
  );
}

export default IntermediatePage;
