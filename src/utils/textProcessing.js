export function addHighlight(question, option = false) {
  return question.replace(/\{([^{}@]+)\}/g, (match, term) => (
    option ? term :
      `<span style="color: #3A838B; font-weight: 700">${term}</span>`
  ));
}

export function replaceVariables(text, variables) {
  if (!text || !variables?.sourceTerm || !variables?.targetTerm) {
    return text;
  }
  const { sourceTerm, targetTerm, sourceSymbol, targetSymbol, tissueKey, dataSource } = variables;
  const [sourceType, sourceId] = sourceTerm.split(':');
  const [targetType, targetId] = targetTerm.split(':');
  const replaceList = {
    [`@${sourceType}@`]: sourceId,
    [`@${sourceType}_id@`]: sourceId,
    [`@${sourceType}_name@`]: sourceSymbol,
    [`@${sourceType}_symbol@`]: sourceSymbol,
    [`@${targetType}@`]: targetId,
    [`@${targetType}_id@`]: targetId,
    [`@${targetType}_name@`]: targetSymbol,
    [`@${targetType}_symbol@`]: targetSymbol,
    '@tissue@': tissueKey,
    '@method@': dataSource?.includes('GTEx') ? 'GTEx' : 'INSPIRE'
  };
  const replacedText = Object.entries(replaceList).reduce((acc, [key, value]) => (
    key ? acc.replace(new RegExp(key, 'g'), value) : acc
  ), text);
  return replacedText;
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
