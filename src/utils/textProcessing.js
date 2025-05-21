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

export function replaceTerms(question, sourceTerm, relationship, targetTerm, sourceTermSymbol, targetTermSymbol, isNextQuestion = false, addStyle = true) {
  const [sourceType, ...sourceRest] = sourceTerm.split(':');
  const sourceValue = sourceTermSymbol ? sourceTermSymbol + ' (' + sourceRest.join(':') + ')' : sourceRest.join(':') || sourceType;

  const [targetType, ...targetRest] = targetTerm.split(':');
  const targetValue = targetTermSymbol ? targetTermSymbol + ' (' + targetRest.join(':') + ')' : targetRest.join(':') || targetType;

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
      return `<span style="color: ${color}; font-weight: 700">${replacedTerm}</span>`;
    } else {
      return replacedTerm;
    }
  });
}

export function replaceVariables(text, variables) {
  if (!text || !variables || !variables.sourceTerm || !variables.relationship || !variables.targetTerm) {
    return text;
  }
  const { sourceTerm, relationship, targetTerm, sourceSymbol, targetSymbol, tissueKey, dataSource } = variables;
  const [sourceType, sourceId] = sourceTerm.split(':');
  const [targetType, targetId] = targetTerm.split(':');
  let replaceList = {};
  replaceList[`@${sourceType}_id@`] = sourceId;
  replaceList[`@${sourceType}_symbol@`] = sourceSymbol;
  replaceList[`@${targetType}_id@`] = targetId;
  replaceList[`@${targetType}_symbol@`] = targetSymbol;
  replaceList['@tissue@'] = tissueKey;
  replaceList['@method@'] = dataSource.includes('GTEx') ? 'GTEx' : 'INSPIRE';
  // start to replace
  console.log('replaceList', replaceList);
  let replacedText = text;
  for (const [key, value] of Object.entries(replaceList)) {
    const regex = new RegExp(key, 'g');
    replacedText = replacedText.replace(regex, value);
  }
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
