'use client'

import React, {useEffect, useState} from 'react';
import { Stack, Chip, TextField, Button, Select, MenuItem, FormControl,
    InputLabel, Box, Container, Typography, Autocomplete, Card, Grid} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { debug } from 'console';


function SearchBar() {
    const [sourceTerm, setSourceTerm] = React.useState('');
    const [relationship, setRelationship] = React.useState('');
    const [targetTerm, setTargetTerm] = React.useState('');
    const [currentQuestion, setCurrentQuestion] = useState<string>('');

    const sourceTermTypes = ["gene", "sequence_variant"];
    const relationTypes = ["eQTL_of"];
    const targetTermTypes = ["gene", "sequence_variant"];

    const fetchCurrentQuestion = async (sourceTerm: string, relationship: string, targetTerm: string) => {
        if (!sourceTerm || !relationship || !targetTerm) {
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/api/currentQuestion/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source_term: sourceTerm,
                    relationship,
                    target_term: targetTerm,
                }),
            });

            const data = await response.json();
            setCurrentQuestion(data);
        } catch (error) {
            console.error('Error fetching current question:', error);
        }
    };

    const updateSourceTerm = async (event: SelectChangeEvent<string>) => {
        const value = event.target.value;
        setSourceTerm(value);
        fetchCurrentQuestion(value, relationship, targetTerm);
    };

    const updateRelationship = (event: SelectChangeEvent<string>) => {
        const value = event.target.value;
        setRelationship(value);
        fetchCurrentQuestion(sourceTerm, value, targetTerm);
    };

    const updateTargetTerm = (event: SelectChangeEvent<string>) => {
        const value = event.target.value;
        setTargetTerm(value);
        fetchCurrentQuestion(sourceTerm, relationship, value);
    };

    const handleSearch = async () => {

    };

    return (
        <Container maxWidth="md">
            <Box sx={{ marginTop: 4 }}>
                <Box display="flex" alignItems="center" gap={2} p={2}>
                    <FormControl fullWidth>
                        {/* <Autocomplete
                            freeSolo
                            autoHighlight={true}
                            filterOptions={filterOptions}
                            // inputValue={inputValue}
                            onInputChange={(event, newInputValue) => {
                                updateSource(event, newInputValue);
                            }}
                            options={sourceNodeOptions.length > 0 ? sourceNodeOptions.map(option => (option[1])) : []}
                            renderInput={(params) => (
                                <TextField {...params} label="Source Term" variant="outlined" />
                            )}
                        /> */}
                        <InputLabel id="SourceTerm-label">Source Term</InputLabel>
                        <Select
                            labelId="SourceTerm-label"
                            id="SourceTerm"
                            value={sourceTerm}
                            label="SourceTerm"
                            onChange={updateSourceTerm}
                        >
                            {sourceTermTypes.map((type)=>(
                                <MenuItem value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel id="relationship-label">Relationship</InputLabel>
                        <Select
                            labelId="relationship-label"
                            id="relationship"
                            value={relationship}
                            label="Relationship"
                            onChange={updateRelationship}
                        >
                            {relationTypes.map((type)=>(
                                <MenuItem value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth>
                        {/* <Autocomplete
                            freeSolo
                            autoHighlight={true}
                            filterOptions={filterOptions}
                            // inputValue={inputValue}
                            onInputChange={(event, newInputValue) => {
                                updateTarget(event, newInputValue);
                            }}
                            options={targetNodeOptions.length > 0 ? targetNodeOptions.map(option => option[1]) : []}
                            renderInput={(params) => (
                                <TextField {...params} label="Target Term" variant="outlined" />
                            )}
                        /> */}
                        <InputLabel id="TargetTerm-label">Target Term</InputLabel>
                        <Select
                            labelId="TargetTerm-label"
                            id="TargetTerm"
                            value={targetTerm}
                            label="TargetTerm"
                            onChange={updateTargetTerm}
                        >
                            {targetTermTypes.map((type)=>(
                                <MenuItem value={type}>{type}</MenuItem>
                            ))}
                        </Select>
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
    )
}

export default SearchBar;