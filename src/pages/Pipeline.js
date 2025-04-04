import React, { useEffect, useState } from 'react';
import { Container, Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import pipeline_content from '../schema/doc/pipeline.md';
import "./github-markdown-light.css";

function Pipeline() {
    const [markdown, setMarkdown] = useState('');

    useEffect(() => {
        fetch(pipeline_content)
            .then(response => response.text())
            .then(text => {
                setMarkdown(text);
            })
            .catch(error => {
                console.error('Error loading tutorial content:', error);
            });
    }, []);

    return (
        <>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} disableGutters>
                <Box className={'markdown-body'} sx={{
                    padding: '4px',
                    // maxWidth: '1200px',
                    p: 4, textAlign: 'left'
                }}>
                    <ReactMarkdown>
                        {markdown}
                    </ReactMarkdown>
                </Box>
            </Container>
        </>
    );
}

export default Pipeline;
