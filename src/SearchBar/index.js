import React, { useState } from 'react';
import { Container, Box, FormControl, InputLabel, Select, MenuItem, Button, TextField } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';

function SearchBar() {
    const [sourceTerm, setSourceTerm] = useState('');
    const [relationship, setRelationship] = useState('');
    const [targetTerm, setTargetTerm] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [sourceOptions, setSourceOptions] = useState(["gene", "sequence_variant"]);
    const [targetOptions, setTargetOptions] = useState(["gene", "sequence_variant"]);
    const [isRelationshipDisabled, setIsRelationshipDisabled] = useState(true);
    const [isTargetTermDisabled, setIsTargetTermDisabled] = useState(true);

    const relationTypes = ["eQTL_of"];

    const updateSourceTerm = async (event, newValue) => {
        setSourceTerm(newValue || '');
        if (newValue && sourceOptions.includes(newValue)) {
            setIsRelationshipDisabled(false);
            setTargetOptions([]);
        } else if (newValue) {
            const response = await fetchOptions(newValue, 'source');
            setSourceOptions(response);
        } else {
            setSourceOptions(["gene", "sequence_variant"]);
            setIsRelationshipDisabled(true);
            setIsTargetTermDisabled(true);
        }
        fetchCurrentQuestion(newValue || '', relationship, targetTerm);
    };

    const updateRelationship = (event) => {
        const value = event.target.value;
        setRelationship(value);
        setIsTargetTermDisabled(false);
        fetchCurrentQuestion(sourceTerm, value, targetTerm);
    };

    const updateTargetTerm = async (event, newValue) => {
        setTargetTerm(newValue || '');
        if (newValue && !sourceOptions.includes(sourceTerm)) {
            const response = await fetchOptions(newValue, 'target');
            setTargetOptions(response);
        } else if (!newValue) {
            setTargetOptions(["gene", "sequence_variant"]);
        }
        fetchCurrentQuestion(sourceTerm, relationship, newValue || '');
    };

    const fetchOptions = async (term, type) => {
        // 这里应该是向后端发送请求获取选项的函数
        // 返回一个选项数组
        return ["option1", "option2", "option3"];
    };

    const fetchCurrentQuestion = (source, relation, target) => {
        // 这里应该是向后端发送请求获取当前问题的函数
        setCurrentQuestion(`${source} ${relation} ${target}`);
    };

    const handleSearch = () => {
        // 处理搜索逻辑
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ marginTop: 4 }}>
                <Box display="flex" alignItems="center" gap={2} p={2}>
                    <FormControl fullWidth>
                        <Autocomplete
                            freeSolo
                            value={sourceTerm}
                            onChange={updateSourceTerm}
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
                            onChange={updateTargetTerm}
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
                <Box>
                    Current Question: {currentQuestion}
                </Box>
            </Box>
        </Container>
    );
}

export default SearchBar;
