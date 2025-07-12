export function addHighlight(question, option = false) {
  return question?.replace(/\{([^{}@]+)\}/g, (_, term) => (
    option ? term :
      `<span style="color: #3A838B; font-weight: 700">${term}</span>`
  ));
}

export function replaceVariables(text, variables, replaceUnderscore = false) {
  if (!text || !variables?.sourceTerm || !variables?.targetTerm) {
    return text;
  }
  const { tissueKey, dataSource, neighbor } = variables;
  let { sourceTerm, targetTerm, sourceSymbol, targetSymbol } = variables;
  let additionalParams = (variables.additionalParams || []).map(param => param.split('@'));
  let [sourceType, sourceId] = sourceTerm.split('@');
  let [targetType, targetId] = targetTerm.split('@');
  const additionalParamsList = additionalParams.reduce((acc, [key, value]) => {
    acc[`@${key}@`] = value;
    return acc;
  }, {});
  const replaceList = {
    ...additionalParamsList,
    [`@${sourceType}@`]: sourceId,
    [`@${sourceType}_id@`]: sourceId,
    [`@${sourceType}_symbol@`]: sourceSymbol,
    [`@${targetType}@`]: targetId,
    [`@${targetType}_id@`]: targetId,
    [`@${targetType}_symbol@`]: targetSymbol,
    [`@nbr_${sourceType}_id@`]: neighbor?.sourceTerm,
    [`@nbr_${sourceType}_symbol@`]: neighbor?.sourceSymbol,
    [`@nbr_${targetType}_id@`]: neighbor?.targetTerm,
    [`@nbr_${targetType}_symbol@`]: neighbor?.targetSymbol,
    '@tissue@': tissueKey,
    '@method@': dataSource?.includes('GTEx') ? 'GTEx' : 'InsPIRE'
  };
  const replaceUnderscoreList = replaceUnderscore ?
    Object.entries(replaceList)
      .reduce((acc, [key, value]) => {
        acc[key] = value?.replace(/_/g, ' ');
        return acc;
      }, {}) :
    replaceList;
  const replacedText = Object.entries(replaceUnderscoreList).reduce((acc, [key, value]) => (
    key && acc?.includes(key) ?
      value && value?.trim()?.length >= 1 ? acc?.replace(new RegExp(key, 'g'), value)
        : (() => { console.log("Mismatch key:", key); return undefined; })()
      : acc
  ), text);
  return replacedText;
}

export function replaceVariablesNextQuestion(text, variables, neighbors, replaceUnderscore = false) {
  if (!variables || !text) {
    return text;
  }
  const sourceReplace =
    neighbors?.source?.map(nbr => replaceVariables(text, {
      ...variables,
      neighbor: {
        sourceTerm: nbr['~id'],
        sourceSymbol: nbr['~properties']?.name,
      }
    }, replaceUnderscore)) || [];
  const targetReplace =
    neighbors?.target?.map(nbr => replaceVariables(text, {
      ...variables,
      neighbor: {
        targetTerm: nbr['~id'],
        targetSymbol: nbr['~properties']?.name,
      }
    }, replaceUnderscore)) || [];
  return [...sourceReplace, ...targetReplace];
}

export function replaceNextQuestion(question, variables, neighbors) {
  if (!question || !variables) {
    return question;
  }
  const replacedQuery = replaceVariablesNextQuestion(question.query, variables, neighbors, true);
  const replacedLink = replaceVariablesNextQuestion(question.link, variables, neighbors);
  const replacedQuestion = replaceVariablesNextQuestion(question.question, variables, neighbors, true);
  const questions = replacedQuery?.map((q, index) => ({
    query: q,
    link: replacedLink[index] || '',
    question: replacedQuestion[index] || '',
  })).filter(q => q?.link && q?.query && q?.question) || [];
  return questions;
}

export const getGeneSymbol = (nodeId) => {
  if (!nodeId) return '';
  const parts = nodeId.split('_');
  if (parts?.length < 3) return '';
  return parts[2];
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

//manually add whitespace after ":" and ";" if not already present
export const addWhitespace = (text) => {
  if (!text) return text;
  return text.replace(/([:;.,&])(?=\S)/g, '$1 ');
}
