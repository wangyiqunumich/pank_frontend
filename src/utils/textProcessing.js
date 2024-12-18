const colorMap = {
    gene: '#43978F',
    sequence_variant: '#E56F5E',
    eQTL_of: '#FBE8D5',
    default: '#DCE9F4'
  };
  
  export function replaceTerms(question, sourceTerm, relationship, targetTerm, isNextQuestion = false, addStyle = true) {
    const [sourceType, ...sourceRest] = sourceTerm.split(':');
    const sourceValue = sourceRest.join(':') || sourceType;
    
    const [targetType, ...targetRest] = targetTerm.split(':');
    const targetValue = targetRest.join(':') || targetType;

    const replaceValue = sourceType !== sourceValue ? sourceValue : targetValue;
  
    return question.replace(/\{([^{}@]+)(@([^{}@]+)@)?\}/g, (match, term, fullType, type) => {
      let replacedTerm;
  
      if (isNextQuestion) {
        replacedTerm = term;
      } else if (fullType) {
        replacedTerm = replaceValue;
      } else {
        replacedTerm = term;
      }
  
      if (addStyle) {
        const color = colorMap[type || term] || colorMap.default;
        return `<span style="color: ${color}">${replacedTerm}</span>`;
      } else {
        return replacedTerm;
      }
    });
  }
  
  export function replaceVariables(text, variables) {
    const { leadSnp, geneId, tissueKey, dataSource, snpId } = variables;
    return text
      .replace(/@lead_snp_node@/g, leadSnp)
      .replace(/@gene_node@/g, geneId)
      .replace(/@tissue@/g, tissueKey)
      .replace(/@data_source@/g, dataSource)
      .replace(/@snp_node@/g, snpId);
  }
  
  // 从conversion table中获取数据源对应的前端显示和组织信息
  export const getDataSourceInfo = (dataSource, conversionTable) => {
    if (!dataSource || !conversionTable?.Conversion_table) {
      return {
        tissue: '',
        frontendKG: ''
      };
    }

    const tissueMap = conversionTable.Conversion_table.Tissue_KG_tissue_name || {};
    const frontendMap = conversionTable.Conversion_table.data_source_KG_frontend || {};
    return {
      tissue: tissueMap[dataSource] || '',
      frontendKG: frontendMap[dataSource] || dataSource
    };
  };

  // 生成边的标签
  export const generateEdgeLabel = (dataSource, conversionTable) => {
    const { tissue, frontendKG } = getDataSourceInfo(dataSource, conversionTable);
    if (!tissue || !frontendKG) return 'eQTL';
    
    return `${tissue} ${frontendKG}`;
  };
  