import React, { useEffect, useState } from 'react';
import { Container, Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import QTL_data_source_content from '../schema/doc/QTL_data_source.md';
import "./github-markdown-light.css";

function QTLDataSource() {
    const [markdown, setMarkdown] = useState('');

    useEffect(() => {
        fetch(QTL_data_source_content)
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

export default QTLDataSource;
