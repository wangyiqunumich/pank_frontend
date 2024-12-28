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
import { setTargetTermSymbol } from '../redux/searchSlice';

function SearchBar({ onSearch, disabled, style }) {
    const dispatch = useDispatch();
    const {viewSchema, queryViewSchemaStatus} = useSelector((state) => state.viewSchema);
    const {vocab, queryVocabStatus} = useSelector((state) => state.inputToVocab);
    const {queryVisResult, queryQueryVisResultStatus} = useSelector((state) => state.queryVisResult);
    
    // 初始状态设置
    const [sourceTerm, setSourceTerm] = useState('sequence variant');
    const [relationship, setRelationship] = useState('eQTL of');
    const [targetTerm, setTargetTerm] = useState('');
    const [sourceOptions, setSourceOptions] = useState(['sequence variant']);
    const [targetOptions, setTargetOptions] = useState([]);
    const [targetTermSymbol, setTargetTermSymbol] = useState('');
    
    // 修改这里：设置固定的 relationshipOptions
    const [relationshipOptions, setRelationshipOptions] = useState(['eQTL of']);
    
    // 固定禁用状态
    const isRelationshipDisabled = true;
    const isSourceTermDisabled = true;
    const [isTargetTermDisabled, setIsTargetTermDisabled] = useState(false);
    
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

    const [isCustomSource, setIsCustomSource] = useState(false);

    const [searchClicked, setSearchClicked] = useState(false);

    // 添加初始化 effect
    useEffect(() => {
        // 设置初始的 relationship options
        setRelationship(['eQTL of']);
        
        // 设置初始搜索条件
        dispatch(setSearchTerms({
            sourceTerm: 'sequence_variant:',
            relationship: 'fine_mapped_eQTL',
            targetTerm: ''
        }));
    }, []);

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
            
            if (!isCustomInput) {
                setTargetOptions([]);
            }
        } else {
            setSourceOptions(["gene", "sequence variant"]);
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
        if (store.getState().search.nextQuestionClicked) {
            return;
        }
    
        // 设置用户显示值
        setTargetDisplayTerm(newValue || '');
    
        if (newValue && (newValue.includes('gene:') || newValue.includes('sequence variant'))) {
            setTargetTerm(newValue); // 设置后台实际值
            dispatch(setSearchTerms({
                ...store.getState().search,
                targetTerm: newValue
            }));
        } else {
            if (newValue) {
                clearTimeout(targetTimerRef.current);
                targetTimerRef.current = setTimeout(async () => {
                    try {
                        const result = await dispatch(queryVocab({ input: newValue })).unwrap();
                        if (result) {
                            let formattedOption;
                            let formattedTerm;
                            console.log(result);
                            if (result.includes('@')) {
                                const [type, value] = result.split('@');
                                formattedTerm = `${type}:${value}`;
                                formattedOption = `${type}:${newValue}`;
                                setTargetOptions([formattedOption]);
                                setTargetTerm(formattedTerm); // 设置后台实际值
                                setTargetTermSymbol(newValue);
                            } else {
                                // formattedOption = `${result}:${newValue}`;
                                // formattedTerm = `${result}:${newValue}`;
                                // setTargetOptions([formattedOption]);
                                // setTargetTerm(formattedTerm); // 设置后台实际值
                            }
                        }
                    } catch (error) {
                        console.error('Error querying vocab:', error);
                    }
                }, 500);
            } else {
                setTargetTerm('');
                setTargetOptions([]);
            }
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
            console.log(relationship);
            let replacedTerm;
            if (isNextQuestion) {
                replacedTerm = term;
            } else {
                if (type === sourceType) {
                    replacedTerm = sourceValue;
                } else if (type === targetType) {
                    replacedTerm = targetValue;
                } else if (type.toLowerCase() === relationship[0].toLowerCase()) {
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

    function convertTerms(sourceTerm, relationship, targetTerm, targetTermSymbol) {
        const frontendToKG = conversionTable.Conversion_table.query_vocab_frontend_KG;
        
        const [sourceType, sourceValue] = sourceTerm.split(':').map(s => s.trim());
        const [targetType, targetValue] = targetTerm.split(':').map(s => s.trim());

        const convertedSourceType = frontendToKG[sourceType] || sourceType;
        const convertedTargetType = frontendToKG[targetType] || targetType;
        const convertedRelationship = frontendToKG[relationship] || relationship;

        return {
            sourceTerm: sourceValue ? `${convertedSourceType}:${sourceValue}` : convertedSourceType,
            relationship: convertedRelationship,
            targetTerm: targetValue ? `${convertedTargetType}:${targetValue}` : convertedTargetType,
            targetTermSymbol: targetTermSymbol.toUpperCase()
        };
    }

    const handleSearch = async () => {
        setSearchClicked(true);
        const convertedTerms = convertTerms(sourceTerm, relationship, targetTerm, targetTermSymbol);
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
        // const isTargetValid = targetOptions.includes(targetTerm);
        return sourceTerm && relationship && targetTerm;   
    };

    // 添加对 nextQuestionClicked 的监听
    const { nextQuestionClicked, sourceTerm: searchSourceTerm, relationship: searchRelationship, targetTerm: searchTargetTerm } = 
        useSelector((state) => state.search);

    useEffect(() => {
        if (nextQuestionClicked && searchSourceTerm && searchRelationship && searchTargetTerm) {
            const [sourceType, ...sourceRest] = searchSourceTerm.split(':');
            const sourceValue = sourceRest.join(':');
            const [targetType, ...targetRest] = searchTargetTerm.split(':');
            const targetValue = targetRest.join(':');
            
            const KGToFrontend = conversionTable.Conversion_table.query_vocab_KG_frontend;
            
            const sourceDisplay = `${KGToFrontend[sourceType]}:${sourceValue}`;
            const relationshipDisplay = KGToFrontend[searchRelationship] || searchRelationship;
            const targetDisplay = `${KGToFrontend[targetType]}:${targetValue}`;
            
            setSourceTerm(sourceDisplay);
            setRelationship(relationshipDisplay);
            setIsTargetTermDisabled(false);
            setTargetTerm(targetDisplay);
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
                            disabled={true}
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
                            disabled={true}
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
                                freeSolo
                                value={targetDisplayTerm}
                                onChange={(event, newValue) => {
                                    if (newValue && targetOptions.includes(newValue)) {
                                        // console.log(newValue);
                                        // const parts = newValue.split(':');
                                        // setTargetDisplayTerm(parts[2]);
                                        // setTargetTerm(newValue);
                                    }
                                }}
                                onInputChange={(event, newInputValue) => {
                                    const parts = newInputValue.split(':');
                                    setTargetDisplayTerm(parts[parts.length - 1]);
                                    if (!event || event.type === 'change') {
                                        updateTargetTerm(event, newInputValue);
                                    }
                                }}
                                options={targetOptions}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="3. Target Term"
                                        variant="outlined"
                                        sx={{
                                            backgroundColor: '#2191971A'
                                        }}
                                        onChange={(event) => {
                                            updateTargetTerm(event, event.target.value);
                                        }}
                                    />
                                )}
                                disabled={isTargetTermDisabled || disabled || searchClicked}
                                filterOptions={(options) => options}
                            />

                        ) : (
                            <>
                                <InputLabel id="target-label">3. Target Term</InputLabel>
                                <Select
                                    labelId="target-label"
                                    value={targetTerm}
                                    label="3. Target Term"
                                    onChange={(event) => setTargetTerm(event.target.value)}
                                    disabled={isTargetTermDisabled || disabled || searchClicked}
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
