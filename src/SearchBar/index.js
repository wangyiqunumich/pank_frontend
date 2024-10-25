import React, { useState, useEffect, useRef } from 'react';
import { Container, Box, FormControl, InputLabel, Select, MenuItem, Button, TextField } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { useSelector, useDispatch } from 'react-redux';
import { queryViewSchema } from '../redux/viewSchemaSlice';
import { queryAiAnswer } from '../redux/aiAnswerSlice';
import { queryQueryResult } from '../redux/queryResultSlice';
import { setProcessedQuestion, setProcessedNextQuestions } from '../redux/processedQuestionSlice';

function SearchBar({ onSearch }) {
    const dispatch = useDispatch();
    const {viewSchema, queryViewSchemaStatus} = useSelector((state) => state.viewSchema);
    const [sourceTerm, setSourceTerm] = useState('');
    const [relationship, setRelationship] = useState('');
    const [targetTerm, setTargetTerm] = useState('');
    const [sourceOptions, setSourceOptions] = useState(["gene", "sequence_variant"]);
    const [targetOptions, setTargetOptions] = useState(["gene", "sequence_variant"]);
    const [isRelationshipDisabled, setIsRelationshipDisabled] = useState(true);
    const [isTargetTermDisabled, setIsTargetTermDisabled] = useState(true);

    const {aiAnswer, queryAiAnswerStatus, queryAiAnswerErrorMessage} = useSelector((state) => state.aiAnswer);
    const {queryResult, queryResultStatus, queryResultErrorMessage} = useSelector((state) => state.queryResult);

    const colorMap = {
        gene: '#43978F',
        sequence_variant: '#E56F5E',
        eQTL_of: '#FBE8D5',
        default: '#DCE9F4'
    };


    const relationTypes = ["eQTL_of"];

    const sourceTimerRef = useRef(null);
    const targetTimerRef = useRef(null);

    const updateSourceTerm = async (event, newValue) => {
        setSourceTerm(newValue || '');
        if (newValue) {
            clearTimeout(sourceTimerRef.current);
            sourceTimerRef.current = setTimeout(async () => {
                const response = await fetchOptions(newValue, 'source');
                setSourceOptions(response);
            }, 1000);
            setIsRelationshipDisabled(false);
        } else {
            setSourceOptions(["gene", "sequence_variant"]);
            setIsRelationshipDisabled(true);
            setIsTargetTermDisabled(true);
        }
    };

    const updateRelationship = (event) => {
        const value = event.target.value;
        setRelationship(value);
        setIsTargetTermDisabled(false);
    };

    const updateTargetTerm = async (event, newValue) => {
        setTargetTerm(newValue || '');
        if (newValue) {
            clearTimeout(targetTimerRef.current);
            targetTimerRef.current = setTimeout(async () => {
                const response = await fetchOptions(newValue, 'target');
                setTargetOptions(response);
            }, 1000);
        } else {
            setTargetOptions(["gene", "sequence_variant"]);
        }
    };

    const fetchOptions = async (term, inputType) => {
        console.log(`Fetching options for ${inputType}: ${term}`);
        // 模拟API调用
        // 在实际应用中，这里应该是一个真实的API调用
        const mockResults = [
            { type: 'gene', term: `${term}_gene1` },
            { type: 'gene', term: `${term}_gene2` },
            { type: 'sequence_variant', term: `${term}_variant1` },
            { type: 'sequence_variant', term: `${term}_variant2` },
        ];
        
        // 返回格式化的选项
        return mockResults.map(result => `${result.type}:${result.term}`);
    };

    function replaceTerms(question, sourceTerm, relationship, targetTerm, isNextQuestion = false) {
        const sourceType = sourceTerm.split(':')[0];
        const sourceValue = sourceTerm.split(':')[1] || sourceType;
        const targetType = targetTerm.split(':')[0];
        const targetValue = targetTerm.split(':')[1] || targetType;

        return question.replace(/\{([^@]+)@([^}]+)\}/g, (match, term, type) => {
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
            return `<span style="color: ${color}">${replacedTerm}</span>`;
        });
    }

    const handleSearch = async () => {
        // 首先dispatch viewSchema查询
        await dispatch(queryViewSchema({ sourceTerm, relationship, targetTerm }));
        // 不要在这里调用onSearch，我们会在useEffect中处理
    };

    useEffect(() => {
        if (queryViewSchemaStatus === 'fulfilled' && viewSchema.questions && viewSchema.questions[0]) {
            const processedQuestion = replaceTerms(viewSchema.questions[0], sourceTerm, relationship, targetTerm);
            dispatch(setProcessedQuestion(processedQuestion));

            if (viewSchema.next_questions) {
                const processedNextQuestions = viewSchema.next_questions.map(question => 
                    replaceTerms(question, sourceTerm, relationship, targetTerm, true)
                );
                dispatch(setProcessedNextQuestions(processedNextQuestions));
            }

            if (viewSchema.open_cyper) {
                console.log(viewSchema.open_cyper);
                dispatch(queryQueryResult({query: "MATCH (n1:sequence_variant)-[r:eQTL_of]->(n2:gene) WHERE n1.id = 'rs73920612' RETURN n1, r, n2;"})).unwrap();
            }

            dispatch(queryAiAnswer('{"question": "a test question", "graph": "unknown format subgraph"}')).unwrap();
            console.log(aiAnswer);

            onSearch();
        }
    }, [queryViewSchemaStatus, viewSchema, sourceTerm, relationship, targetTerm]);

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
                            renderInput={(params) => <TextField {...params} label="Source Term" />}
                        />
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel id="relationship-label">Relationship</InputLabel>
                        <Select
                            labelId="relationship-label"
                            id="relationship"
                            value={relationship}
                            label="Relationship"
                            onChange={updateRelationship}
                            disabled={isRelationshipDisabled}
                            sx={{ textAlign: 'left' }}
                        >
                            {relationTypes.map((type) => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <Autocomplete
                            freeSolo
                            value={targetTerm}
                            onInputChange={updateTargetTerm}
                            options={targetOptions}
                            disabled={isTargetTermDisabled}
                            renderInput={(params) => <TextField {...params} label="Target Term" />}
                        />
                    </FormControl>

                    <Button variant="contained" color="primary"
                        sx={{ minWidth:'120px', backgroundColor: '#8BB5D1', color: 'black', '&:hover': { backgroundColor: '#4A7298' } }}
                        onClick={handleSearch}>
                        Search
                    </Button>
                </Box>
            </Box>
        </Container>
    );
}

export default SearchBar;
