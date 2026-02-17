import React, { useState } from 'react';

import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material';

/**
 * DebugThinkingPanel - Embedded thinking process viewer for result pages
 * Shows agent's thinking process when debug flag is enabled
 * Extractable stream_events from raw agent result
 */
export function DebugThinkingPanel({ agentRawResult, question }) {
    const [expanded, setExpanded] = useState(false);

    // Try to extract stream events from raw result
    const streamEvents = React.useMemo(() => {
        if (!agentRawResult) return [];

        // Try to parse if it's stringified JSON
        let result = agentRawResult;
        if (typeof agentRawResult === 'string') {
            try {
                result = JSON.parse(agentRawResult);
            } catch {
                return [];
            }
        }

        // Look for stream_events in various places
        if (result.stream_events && Array.isArray(result.stream_events)) {
            return result.stream_events;
        }
        if (result.text?.stream_events && Array.isArray(result.text.stream_events)) {
            return result.text.stream_events;
        }

        return [];
    }, [agentRawResult]);

    if (!streamEvents || streamEvents.length === 0) {
        return (
            <Card sx={{ marginTop: '20px', backgroundColor: '#fff3e0' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon sx={{ color: '#f57c00', fontSize: '20px' }} />
                        <Typography variant="body2" sx={{ color: '#f57c00' }}>
                            No thinking process data available. Stream events not included in agent response.
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ marginTop: '20px', backgroundColor: '#f0f7ff', borderLeft: '4px solid #1976d2' }}>
            <Box
                sx={{
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '#e3f2fd' },
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
                        Agent Thinking Process
                    </Typography>
                    <Chip
                        label={`${streamEvents.length} events`}
                        size="small"
                        variant="outlined"
                        color="primary"
                    />
                </Box>
                <IconButton size="small">
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Box>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <CardContent sx={{ borderTop: '1px solid #e0e0e0' }}>
                    {question && (
                        <Box sx={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e0e0e0' }}>
                            <Typography variant="subtitle2" sx={{ color: '#666', fontWeight: 600 }}>
                                Question:
                            </Typography>
                            <Typography variant="body2" sx={{ marginTop: '4px', fontStyle: 'italic' }}>
                                {question}
                            </Typography>
                        </Box>
                    )}

                    <Typography variant="body2">Stream events data viewer would go here</Typography>
                </CardContent>
            </Collapse>
        </Card>
    );
}

export default DebugThinkingPanel;
