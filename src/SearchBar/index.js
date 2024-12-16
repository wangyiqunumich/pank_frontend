import React, { useState, useEffect, useRef } from 'react';
import { Container, Box, FormControl, InputLabel, Select, MenuItem, Button, TextField } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { useSelector, useDispatch } from 'react-redux';
import { queryViewSchema } from '../redux/viewSchemaSlice';
import { queryAiAnswer } from '../redux/aiAnswerSlice';
import { queryQueryResult } from '../redux/queryResultSlice';
import { setProcessedQuestion } from '../redux/processedQuestionSlice';
import { setSearchTerms } from '../redux/searchSlice';
import { queryVocab } from '../redux/inputToVocabSlice';
import conversionTable from '../utils/conversion_table.json';
import catalog from '../utils/Catalog.json';
import { store } from '../redux/store';
import { setNextQuestionClicked } from '../redux/searchSlice';
import { queryQueryVisResult } from '../redux/queryVisResultSlice';

function SearchBar({ onSearch, disabled, style }) {
    const dispatch = useDispatch();
    const {viewSchema, queryViewSchemaStatus} = useSelector((state) => state.viewSchema);
    const {vocab, queryVocabStatus} = useSelector((state) => state.inputToVocab);
    const {queryVisResult, queryQueryVisResultStatus} = useSelector((state) => state.queryVisResult);
    const [sourceTerm, setSourceTerm] = useState('');
    const [relationship, setRelationship] = useState('');
    const [targetTerm, setTargetTerm] = useState('');
    const [sourceOptions, setSourceOptions] = useState(["sequence variant"]);
    const [targetOptions, setTargetOptions] = useState([]);
    const [isRelationshipDisabled, setIsRelationshipDisabled] = useState(true);
    const [isTargetTermDisabled, setIsTargetTermDisabled] = useState(true);
    const [displayToActualMap, setDisplayToActualMap] = useState({});

    const {aiAnswer, queryAiAnswerStatus, queryAiAnswerErrorMessage} = useSelector((state) => state.aiAnswer);
    const {queryResult, queryResultStatus, queryResultErrorMessage} = useSelector((state) => state.queryResult);

    const colorMap = {
        gene: '#43978F',
        sequence_variant: '#E56F5E',
        eQTL: '#FBE8D5',
        default: '#DCE9F4'
    };


    const relationTypes = ["eQTL of"];

    const sourceTimerRef = useRef(null);
    const targetTimerRef = useRef(null);

    const [relationshipOptions, setRelationshipOptions] = useState([]);

    const [isCustomSource, setIsCustomSource] = useState(false);

    const updateSourceTerm = async (event, newValue) => {
        if (store.getState().search.nextQuestionClicked) {
            return;
        }
        
        setSourceTerm(newValue || '');
        setRelationship('');
        setTargetTerm('');
        dispatch(queryQueryResult({ query: '' }));
        
        if (newValue) {
            const [sourceType, ...rest] = newValue.split(':');
            const sourceValue = rest.join(':');
            const predefinedTypes = ["gene", "sequence variant"];
            const isCustomInput = !predefinedTypes.includes(sourceType);
            setIsCustomSource(isCustomInput);
            
            clearTimeout(sourceTimerRef.current);
            sourceTimerRef.current = setTimeout(async () => {
                const result = await dispatch(queryVocab({input: newValue})).unwrap();
                if (result) {
                    let formattedOption;
                    if (result.includes('@')) {
                        const [type, value] = result.split('@');
                        formattedOption = `${type}:${value}`;
                        setSourceOptions([formattedOption]);
                        setSourceTerm(formattedOption);
                    } else {
                        formattedOption = `${result}:${newValue}`;
                        setSourceOptions([formattedOption]);
                    }
                }
            }, 500);
            setIsRelationshipDisabled(false);
            
            if (!isCustomInput) {
                setTargetOptions([]);
            }
        } else {
            setSourceOptions(["gene", "sequence variant"]);
            setIsRelationshipDisabled(true);
            setIsTargetTermDisabled(true);
            setIsCustomSource(false);
            setTargetOptions([]);
        }
    };

    const handleRelationshipOpen = () => {
        if (store.getState().search.nextQuestionClicked) {
            return;
        }
        const sourceType = sourceTerm.split(':')[0];
        
        const frontendToKG = conversionTable.Conversion_table.query_vocab_frontend_KG;
        const KGToFrontend = conversionTable.Conversion_table.query_vocab_KG_frontend;
        
        const kgSourceType = frontendToKG[sourceType] || sourceType;
        
        const possiblePatterns = catalog.filter(pattern => {
            const parts = pattern.split(" - ");
            return parts[0] === kgSourceType;
        });
        
        const uniqueRelationships = new Set(
            possiblePatterns.map(pattern => {
                const parts = pattern.split(" - ");
                const relationship = parts[1];
                return KGToFrontend[relationship] || relationship;
            })
        );
        
        setRelationshipOptions([...uniqueRelationships]);
    };

    const updateTargetOptions = (currentRelationship) => {
        const sourceType = sourceTerm.split(':')[0];
        const frontendToKG = conversionTable.Conversion_table.query_vocab_frontend_KG;
        const KGToFrontend = conversionTable.Conversion_table.query_vocab_KG_frontend;
        
        const kgSourceType = frontendToKG[sourceType] || sourceType;
        const kgRelationship = frontendToKG[currentRelationship] || currentRelationship;
        
        const possiblePatterns = catalog.filter(pattern => {
            const parts = pattern.split(" - ");
            return parts[0] === kgSourceType && parts[1] === kgRelationship;
        });
        
        const uniqueTargetTypes = new Set(
            possiblePatterns.map(pattern => {
                const parts = pattern.split(" - ");
                const targetType = parts[2];
                return KGToFrontend[targetType] || targetType;
            })
        );
        
        return [...uniqueTargetTypes];
    };

    const updateRelationship = (event) => {
        if (store.getState().search.nextQuestionClicked) {
            return;
        }
        const newRelationship = event.target.value;
        setRelationship(newRelationship);
        setTargetTerm('');
        dispatch(queryQueryResult({ query: '' }));
        setIsTargetTermDisabled(false);
        const targetOptions = updateTargetOptions(newRelationship);
        if (isCustomSource) {  
            setTargetOptions(targetOptions);
        }
    };

    const [targetDisplayTerm, setTargetDisplayTerm] = useState('');

    const updateTargetTerm = async (event, newValue) => {
        console.log(newValue);
        if (store.getState().search.nextQuestionClicked) {
            return;
        }
        
        setTargetDisplayTerm(newValue || '');
        
        if (newValue) {
            clearTimeout(targetTimerRef.current);
            targetTimerRef.current = setTimeout(async () => {
                try {
                    console.log(newValue);
                    const result = await dispatch(queryVocab({input: newValue})).unwrap();
                    if (result) {
                        let formattedOption;
                        if (result.includes('@')) {
                            const [type, value] = result.split('@');
                            formattedOption = `${type}:${value}`;
                            setTargetOptions([formattedOption]);
                            setTargetTerm(formattedOption);
                            dispatch(setSearchTerms({
                                ...store.getState().search,
                                targetTerm: formattedOption
                            }));
                        } else {
                            formattedOption = `${result}:${newValue}`;
                            setTargetOptions([formattedOption]);
                            setTargetTerm(formattedOption);
                            dispatch(setSearchTerms({
                                ...store.getState().search,
                                targetTerm: formattedOption
                            }));
                        }
                    }
                } catch (error) {
                    console.error('Error querying vocab:', error);
                }
            }, 500);
        } else {
            setTargetTerm('');
            setTargetDisplayTerm('');
            setTargetOptions([]);
            dispatch(setSearchTerms({
                ...store.getState().search,
                targetTerm: ''
            }));
        }
    };

    const fetchOptions = async (term, inputType) => {
        console.log(`Fetching options for ${inputType}: ${term}`);
        // 模拟API调用
        // 在实际应用，这里应该是一个真实的API调用
        const mockResults = [
            // { type: 'gene', term: `${term}` },
            { type: 'sequence variant', term: `${term}` },
        ];
        
        // 返回格式化的选项
        return mockResults.map(result => `${result.type}:${result.term}`);
    };

    function replaceTerms(question, sourceTerm, relationship, targetTerm, isNextQuestion = false) {
        const sourceType = sourceTerm.split(':')[0];
        const sourceValue = sourceTerm.split(':')[1] || sourceType;
        const targetType = targetTerm.split(':')[0];
        const targetValue = targetTerm.split(':')[1] || targetType;
        console.log(question);
        return question.replace(/\{([^@]+)@([^}]+)\}/g, (match, term, type) => {
            console.log(term);
            console.log(type);
            let replacedTerm;
            if (isNextQuestion) {
                replacedTerm = term;
            } else {
                if (type === sourceType) {
                    replacedTerm = sourceValue;
                } else if (type === targetType) {
                    replacedTerm = targetValue;
                } else if (type.toLowerCase() === relationship.toLowerCase()) {
                    replacedTerm = term;
                } else {
                    return match;
                }
            }
            const color = colorMap[type] || colorMap.default;
            console.log(type);
            return `<span style="color: ${color}">${replacedTerm}</span>`;
        });
    }

    function replaceCypherTerms(cypher, sourceTerm, targetTerm) {
        const sourceType = sourceTerm.split(':')[0];
        const sourceValue = sourceTerm.split(':')[1] || sourceType;
        const targetType = targetTerm.split(':')[0];
        const targetValue = targetTerm.split(':')[1] || targetType;

        return cypher.replace(/@([^@]+)@/g, (match, term) => {
            if (term === sourceType) {
                return sourceValue;
            } else if (term === targetType) {
                return targetValue;
            }
            return match;
        });
    }

    function convertTerms(sourceTerm, relationship, targetTerm) {
        const frontendToKG = conversionTable.Conversion_table.query_vocab_frontend_KG;
        
        const [sourceType, sourceValue] = sourceTerm.split(':').map(s => s.trim());
        const [targetType, targetValue] = targetTerm.split(':').map(s => s.trim());

        const convertedSourceType = frontendToKG[sourceType] || sourceType;
        const convertedTargetType = frontendToKG[targetType] || targetType;
        const convertedRelationship = frontendToKG[relationship] || relationship;

        return {
            sourceTerm: sourceValue ? `${convertedSourceType}:${sourceValue}` : convertedSourceType,
            relationship: convertedRelationship,
            targetTerm: targetValue ? `${convertedTargetType}:${targetValue}` : convertedTargetType
        };
    }

    const handleSearch = async () => {
        const convertedTerms = convertTerms(sourceTerm, relationship, targetTerm);
        dispatch(setSearchTerms(convertedTerms));
        await dispatch(queryViewSchema(convertedTerms));
    };

    useEffect(() => {
        const fetchData = async () => {
            if (queryViewSchemaStatus === 'fulfilled' && viewSchema.question && viewSchema.question[0] && !sourceTerm.includes(':')) {
                const processedQuestion = replaceTerms(viewSchema.question[0], sourceTerm, relationship, targetTerm);
                dispatch(setProcessedQuestion(processedQuestion));

                if (viewSchema.cyper_for_intermediate_page && viewSchema.cyper_for_intermediate_KG_viewer) {
                    const processedCypher = replaceCypherTerms(
                        viewSchema.cyper_for_intermediate_page,
                        sourceTerm,
                        targetTerm
                    );
                    const processedCypherForKGViewer = replaceCypherTerms(
                        viewSchema.cyper_for_intermediate_KG_viewer,
                        sourceTerm,
                        targetTerm
                    );
                    try {
                        await dispatch(queryQueryResult({query: processedCypher})).unwrap();
                        await dispatch(queryQueryVisResult({query: processedCypherForKGViewer})).unwrap();
                        onSearch();
                    } catch (error) {
                        console.error('Error executing query:', error);
                    }
                }
            }
        };

        fetchData();
    }, [queryViewSchemaStatus, viewSchema, sourceTerm, relationship, targetTerm]);

    const isValid = () => {
        // 检查 targetTerm 是否在 targetOptions 中
        const isTargetValid = targetOptions.includes(targetTerm);
        return sourceTerm && relationship && targetTerm && isTargetValid;   
    };

    // 添加对 nextQuestionClicked 的监听
    const { nextQuestionClicked, sourceTerm: searchSourceTerm, relationship: searchRelationship, targetTerm: searchTargetTerm } = 
        useSelector((state) => state.search);

    useEffect(() => {
        if (nextQuestionClicked && searchSourceTerm && searchRelationship && searchTargetTerm) {
            // 解析 terms
            const [sourceType, ...sourceRest] = searchSourceTerm.split(':');
            const sourceValue = sourceRest.join(':');
            const [targetType, ...targetRest] = searchTargetTerm.split(':');
            const targetValue = targetRest.join(':');
            
            // 使用 conversionTable 转换
            const KGToFrontend = conversionTable.Conversion_table.query_vocab_KG_frontend;
            
            // 转换并设置新值
            const sourceDisplay = `${KGToFrontend[sourceType]}:${sourceValue}`;
            const relationshipDisplay = KGToFrontend[searchRelationship] || searchRelationship;
            const targetDisplay = `${KGToFrontend[targetType]}:${targetValue}`;
            
            setSourceTerm(sourceDisplay);
            setIsRelationshipDisabled(false);
            setRelationship(relationshipDisplay);
            setIsTargetTermDisabled(false);
            setTargetTerm(targetDisplay);
            
            // 重置点击状态
            // dispatch(setNextQuestionClicked(false));
        }
    }, [nextQuestionClicked, searchSourceTerm, searchRelationship, searchTargetTerm]);

    return (
        <Container maxWidth="md" disableGutters sx={{ padding: 0, ...style }}>
            <Box sx={{ marginTop: 4, padding: 0 }}>
                <Box display="flex" alignItems="center" gap={2} p={2} sx={{ padding: 0 }}>
                    <FormControl fullWidth>
                        <Autocomplete
                            freeSolo
                            value={sourceTerm}
                            onInputChange={updateSourceTerm}
                            options={sourceOptions}
                            disabled={disabled}
                            renderInput={(params) => <TextField sx={{
                                backgroundColor: '#2191971A'
                            }} {...params} label="1. Source Term" />}
                        />
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel 
                            id="relationship-label"
                            sx={{
                                color: (isRelationshipDisabled || disabled) ? 'rgba(0, 0, 0, 0.38)' : 'rgba(0, 0, 0, 0.6)'
                            }}
                        >
                            2. Relationship
                        </InputLabel>
                        <Select
                            labelId="relationship-label"
                            id="2. relationship"
                            value={relationship}
                            label="2. Relationship"
                            onChange={updateRelationship}
                            onOpen={handleRelationshipOpen}
                            disabled={isRelationshipDisabled || disabled}
                            sx={{ textAlign: 'left',
                                backgroundColor: '#2191971A'
                            }}
                        >
                            {relationshipOptions.map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        {!isCustomSource ? (
                            <Autocomplete
                                value={targetTerm ? targetOptions.find(option => displayToActualMap[option] === targetTerm) || '' : ''}
                                onChange={updateTargetTerm}
                                onInputChange={(event, newInputValue) => {
                                    // 直接调用 updateTargetTerm
                                    updateTargetTerm(event, newInputValue);
                                }}
                                options={targetOptions}
                                renderInput={(params) => (
                                    <TextField
                                        sx={{
                                            backgroundColor: '#2191971A'
                                        }}
                                        {...params}
                                        label="3. Target Term"
                                        variant="outlined"
                                        onChange={(event) => {
                                            // 当输入框值改变时也触发更新
                                            updateTargetTerm(event, event.target.value);
                                        }}
                                    />
                                )}
                                disabled={isTargetTermDisabled}
                                freeSolo
                                filterOptions={(options) => options} // 保持选项不被过滤
                            />
                        ) : (
                            <>
                                <InputLabel id="target-label">3. Target Term</InputLabel>
                                <Select
                                    labelId="target-label"
                                    value={targetTerm}
                                    label="3. Target Term"
                                    onChange={(event) => setTargetTerm(event.target.value)}
                                    disabled={isTargetTermDisabled || disabled}
                                    sx={{ textAlign: 'left' }}
                                >
                                    {targetOptions.map((type) => (
                                        <MenuItem key={type} value={type}>{type}</MenuItem>
                                    ))}
                                </Select>
                            </>
                        )}
                    </FormControl>

                    <Button variant="contained" color="primary"
                        sx={{
                            minWidth:'120px',
                            backgroundColor: '#219197',
                            color: 'white',
                            '&:hover': { backgroundColor: '#4A7298' },
                            // '&:disabled': {
                        }}
                        onClick={handleSearch}
                        disabled={disabled || !isValid()}
                    >
                        Search
                    </Button>
                </Box>
            </Box>
        </Container>
    );
}

export default SearchBar;
