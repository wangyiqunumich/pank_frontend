const colorMap = {
    gene: '#43978F',
    sequence_variant: '#E56F5E',
    eQTL_of: '#FBE8D5',
    default: '#DCE9F4'
  };
  
  export function replaceTerms(question, sourceTerm, relationship, targetTerm, isNextQuestion = false) {
    const sourceType = sourceTerm.split(':')[0];
    const sourceValue = sourceTerm.split(':')[1] || sourceType;
    const targetType = targetTerm.split(':')[0];
    const targetValue = targetTerm.split(':')[1] || targetType;

    const replaceValue = sourceType !== sourceValue ? sourceValue : targetValue;
  
    return question.replace(/\{([^{}@]+)(@([^{}@]+)@)?\}/g, (match, term, fullType, type) => {
      let replacedTerm;
  
      if (isNextQuestion) {
        // No replacement, just show the term as-is
        replacedTerm = term;
      } else if (fullType) {
        // If the term is in {@...@} format, replace it with `replaceValue`
        replacedTerm = replaceValue;
      } else {
        // If the term is just in {...} format, don't replace, only color it
        replacedTerm = term;
      }
  
      const color = colorMap[type || term] || colorMap.default;  // Use color map based on `type` if available
      return `<span style="color: ${color}">${replacedTerm}</span>`;
    });
  }
  