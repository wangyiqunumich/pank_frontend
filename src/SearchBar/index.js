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

function SearchBar({ onSearch, disabled }) {
    const dispatch = useDispatch();
    const {viewSchema, queryViewSchemaStatus} = useSelector((state) => state.viewSchema);
    const {vocab, queryVocabStatus} = useSelector((state) => state.inputToVocab);
    const [sourceTerm, setSourceTerm] = useState('');
    const [relationship, setRelationship] = useState('');
    const [targetTerm, setTargetTerm] = useState('');
    const [sourceOptions, setSourceOptions] = useState(["gene", "sequence variant"]);
    const [targetOptions, setTargetOptions] = useState([]);
    const [isRelationshipDisabled, setIsRelationshipDisabled] = useState(true);
    const [isTargetTermDisabled, setIsTargetTermDisabled] = useState(true);

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
            const sourceType = newValue.split(':')[0];
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

    const updateTargetTerm = async (event, newValue) => {
        if (store.getState().search.nextQuestionClicked) {
            dispatch(setNextQuestionClicked(false));
            return;
        }
        setTargetTerm(newValue || '');
        dispatch(queryQueryResult({ query: '' }));
        
        if (newValue) {
            clearTimeout(targetTimerRef.current);
            targetTimerRef.current = setTimeout(async () => {
                const result = await dispatch(queryVocab({input: newValue})).unwrap();
                if (result) {
                    let inputType;
                    if (result.includes('@')) {
                        const [type, value] = result.split('@');
                        inputType = type;
                    } else {
                        inputType = result;
                    }
                    
                    // 获取当前的 sourceTerm 和 relationship
                    const sourceType = sourceTerm.split(':')[0];
                    const frontendToKG = conversionTable.Conversion_table.query_vocab_frontend_KG;
                    const KGToFrontend = conversionTable.Conversion_table.query_vocab_KG_frontend;
                    
                    // 转换为 KG 格式
                    const kgSourceType = frontendToKG[sourceType] || sourceType;
                    const kgRelationship = frontendToKG[relationship] || relationship;
                    
                    // 在 catalog 中查找可能的目标类型
                    const possiblePatterns = catalog.filter(pattern => {
                        const parts = pattern.split(" - ");
                        return parts[0] === kgSourceType && parts[1] === kgRelationship;
                    });
                    
                    const validTargetTypes = new Set(
                        possiblePatterns.map(pattern => {
                            const parts = pattern.split(" - ");
                            const targetType = parts[2];
                            return KGToFrontend[targetType] || targetType;
                        })
                    );

                    // 检查API返回的类型是否有效
                    if (!validTargetTypes.has(inputType)) {
                        setTargetOptions([]);
                        return;
                    }
                    
                    // 如果类型有效，设置选项
                    let formattedOption;
                    if (result.includes('@')) {
                        const [type, value] = result.split('@');
                        formattedOption = `${type}:${value}`;
                        setTargetOptions([formattedOption]);
                        setTargetTerm(formattedOption); // 立即设置选中值
                    } else {
                        formattedOption = `${result}:${newValue}`;
                        setTargetOptions([formattedOption]);
                    }
                }
            }, 500);
        } else {
            setTargetOptions([]);
        }
    };

    const fetchOptions = async (term, inputType) => {
        console.log(`Fetching options for ${inputType}: ${term}`);
        // 模拟API调用
        // 在实际应用，这里应该是一个真实的API调用
        const mockResults = [
            { type: 'gene', term: `${term}` },
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
            if (queryViewSchemaStatus === 'fulfilled' && viewSchema.question && viewSchema.question[0]) {
                const processedQuestion = replaceTerms(viewSchema.question[0], sourceTerm, relationship, targetTerm);
                dispatch(setProcessedQuestion(processedQuestion));

                if (viewSchema.cyper_for_intermediate_page) {
                    const processedCypher = replaceCypherTerms(
                        viewSchema.cyper_for_intermediate_page,
                        sourceTerm,
                        targetTerm
                    );
                    console.log(processedCypher);
                    try {
                        await dispatch(queryQueryResult({query: processedCypher})).unwrap();
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
            const [sourceType, sourceValue] = searchSourceTerm.split(':');
            const [targetType, targetValue] = searchTargetTerm.split(':');
            
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
        <Container maxWidth="md">
            <Box sx={{ marginTop: 4 }}>
                <Box display="flex" alignItems="center" gap={2} p={2}>
                    <FormControl fullWidth>
                        <Autocomplete
                            freeSolo
                            value={sourceTerm}
                            onInputChange={updateSourceTerm}
                            options={sourceOptions}
                            disabled={disabled}
                            renderInput={(params) => <TextField {...params} label="1. Source Term" />}
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
                            sx={{ textAlign: 'left' }}
                        >
                            {relationshipOptions.map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        {!isCustomSource ? (
                            <Autocomplete
                                freeSolo
                                value={targetTerm}
                                onInputChange={updateTargetTerm}
                                options={targetOptions}
                                disabled={isTargetTermDisabled || disabled}
                                renderInput={(params) => <TextField {...params} label="3. Target Term" />}
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
                        sx={{ minWidth:'120px', backgroundColor: '#8BB5D1', color: 'black', '&:hover': { backgroundColor: '#4A7298' } }}
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
