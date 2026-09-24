import React, { useState, useEffect } from "react";
import { Box, TextField, Button, IconButton, Stack } from "@mui/material";
import Add from '@mui/icons-material/Add';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Delete from '@mui/icons-material/Delete';

/**
 * MultiLineInputList
 * Allows adding/removing multiple multi-line inputs
 * and extracts the values via onChange callback or local state.
 */
export default function MultiLineInputList({ onChange }) {
  const [inputs, setInputs] = useState([""]);

  // Notify parent whenever inputs change
  useEffect(() => {
    if (onChange) onChange(inputs);
  }, [inputs, onChange]);

  const handleChange = (index, value) => {
    const updated = [...inputs];
    updated[index] = value;
    setInputs(updated);
  };

  const handleAdd = () => {
    setInputs([...inputs, ""]);
  };

  const handleRemove = (index) => {
    const updated = inputs.filter((_, i) => i !== index);
    setInputs(updated.length ? updated : [""]); // keep at least one
  };

    const handleFormat = () => {
        // replace \\\" and \" and ' with "
        const formatted = inputs.map((input) =>
            input
                .trim()
                // replace consecutive spaces with single space
                .replace(/\s+/g, ' ')
                .replace(/\\\\\"/g, '"')
                .replace(/\\"/g, '"')
                .replace(/'/g, '"')
                // remove trailing commas
                .replace(/,+\s*$/g, '')
                // remove leading and/or trailing \"
                .replace(/^"+|"+$/g, '')
                // replace " WHERE" with " \nWHERE", " RETURN" with " \nRETURN", " MATCH" with " \nMATCH"
                .replace(/\s+WHERE/g, '\nWHERE')
                .replace(/\s+RETURN/g, '\nRETURN')
                .replace(/\s+MATCH/g, '\nMATCH')
                .replace(/\s+WITH/g, '\nWITH')
                // remove all \n within []
                .replace(/\[\s*([^]*?)\s*\]/g, (match, p1) => {
                    return '[' + p1.replace(/\n/g, ' ') + ']';
                })
        );
        setInputs(formatted);
    };

  return (
    <Box>
      <Stack spacing={2}>
        {inputs.map((value, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
            }}
          >
            <TextField
              fullWidth
              multiline
              minRows={3}
              label={`Input ${index + 1}`}
              value={value}
              onChange={(e) => handleChange(index, e.target.value)}
            />
            <IconButton
              color="error"
              onClick={() => handleRemove(index)}
              disabled={inputs.length === 1}
            >
              <Delete />
            </IconButton>
          </Box>
        ))}
        <Stack direction="row" spacing={2}>
        <Button
          startIcon={<Add />}
          variant="outlined"
          onClick={handleAdd}
          sx={{ alignSelf: "flex-start" }}
        >
          Add Another
        </Button>
        <Button
          startIcon={<AutoAwesome />}
          variant="outlined"
          onClick={handleFormat}
          sx={{ alignSelf: "flex-start" }}
        >
          Auto Format
        </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
