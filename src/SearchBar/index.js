import React, { useState, useRef } from 'react';
import { Container, Box, FormControl, InputLabel, Select, MenuItem, Button, TextField } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { useSelector, useDispatch } from 'react-redux';
import { queryViewSchema } from '../redux/viewSchemaSlice';
import { queryAiAnswer } from '../redux/aiAnswerSlice';

function SearchBar({ onSearch }) {
    const [sourceTerm, setSourceTerm] = useState('');
    const [relationship, setRelationship] = useState('');
    const [targetTerm, setTargetTerm] = useState('');
    const [sourceOptions, setSourceOptions] = useState(["gene", "sequence_variant"]);
    const [targetOptions, setTargetOptions] = useState(["gene", "sequence_variant"]);
    const [isRelationshipDisabled, setIsRelationshipDisabled] = useState(true);
    const [isTargetTermDisabled, setIsTargetTermDisabled] = useState(true);

    const {viewSchema, queryViewSchemaStatus, queryViewSchemaErrorMessage} = useSelector((state) => state.viewSchema);
    const {aiAnswer, queryAiAnswerStatus, queryAiAnswerErrorMessage} = useSelector((state) => state.aiAnswer);
    const dispatch = useDispatch();
  

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

    const handleSearch = () => {
        dispatch(queryViewSchema({sourceTerm: sourceTerm, relationship: relationship, targetTerm: targetTerm})).unwrap();
        dispatch(queryAiAnswer({})).unwrap();
        console.log(aiAnswer);
        onSearch(); // 触发父组件中的搜索结果显示
    };

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