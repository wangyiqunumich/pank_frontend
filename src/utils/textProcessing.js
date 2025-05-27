const colorMap = {
  // gene: '#43978F',
  // sequence_variant: '#E56F5E',
  // eQTL_of: '#FBE8D5',
  // default: '#DCE9F4'
  gene: '#3A838B',
  sequence_variant: '#3A838B',
  eQTL_of: '#3A838B',
  default: '#3A838B'
};

export function addHighlight(question) {
  return question.replace(/\{([^{}@]+)\}/g, (match, term) => {
    return `<span style="color: #3A838B; font-weight: 700">${term}</span>`;
  });
}

export function replaceVariables(text, variables) {
  if (!text || !variables || !variables.sourceTerm || !variables.targetTerm) {
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
  const replacedText = Object.entries(replaceList).reduce((acc, [key, value]) => {
    const regex = new RegExp(key, 'g');
    return acc.replace(regex, value);
  }, text);
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
