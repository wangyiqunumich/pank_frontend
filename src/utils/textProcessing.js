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
    const { leadSnp, geneId, tissue, dataSource, snpId } = variables;
    return text
      .replace(/@lead_snp_node@/g, leadSnp)
      .replace(/@gene_node@/g, geneId)
      .replace(/@tissue@/g, tissue)
      .replace(/@data_source@/g, dataSource)
      .replace(/@snp_node@/g, snpId);
  }
  