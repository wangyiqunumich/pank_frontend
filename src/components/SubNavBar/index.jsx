import './scoped.css'; // reuse the same stylesheet

// SubNavBar.js
import React from 'react';

import { useLocation } from 'react-router-dom';

import {
    Box,
    Button,
} from '@mui/material';

function SubNavBar({ activeButton, handleToggle }) {
    const location = useLocation();

    const handleResultClick = () => {
        if (activeButton === "chat") {
            handleToggle();
        }
    };

    const handleChatClick = () => {
        if (activeButton === "result") {
            handleToggle();
        }
    };

    const buttonStyle = {
        width: '250px',
        minWidth: '250px',
        height: '60px',
        border: 'none',
        fontSize: 'clamp(14px, 2vw, 20px)', // Set font size
        paddingRight: '32px',
        fontWeight: 'bold',
        borderRadius: '0px',
        boxShadow: 'none',
        textTransform: 'none',
        '&:hover': {
            border: 'none',
            boxShadow: 'none',
            backgroundColor: '#C4CCFE'
        }
    };

    return (
        <Box
            sx={{
                width: 'fit-content',
                maxWidth: '833px', // Set the box width to 883px
                margin: '0px', // Center the box horizontally on the page
                marginBottom: '-15px',
                flexBasis: '0px',
                display: 'flex',
                justifyContent: 'flex-start',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                gap: '0px',
                borderRadius: '0px',
                borderTopLeftRadius: '24px',
                borderBottomRightRadius: '24px',
                border: '3px solid #f0f5fe',
            }}
        >
            <Button
                variant={activeButton === 'result' ? 'contained' : 'outlined'}
                sx={{
                    ...buttonStyle,
                    background: activeButton === 'result' ? 'linear-gradient(to top, #4A65F4, #758BFF)' : 'white',
                    color: activeButton === 'result' ? 'white' : '#1E416D', // Text color based on active state
                    borderTopLeftRadius: '24px',
                    paddingLeft: '0px',
                    clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0% 100%)',
                }}
                onClick={handleResultClick}
            >
                AI's Overview
            </Button>
            <Button
                variant={activeButton === 'chat' ? 'contained' : 'outlined'}
                sx={{
                    ...buttonStyle,
                    background: activeButton === 'chat' ? 'linear-gradient(to left, #4A65F4, #758BFF)' : 'white',
                    color: activeButton === 'chat' ? 'white' : '#1E416D', // Text color based on active state
                    borderBottomRightRadius: '24px',
                    paddingRight: '0px',
                    clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)', // Leaning left edge
                    marginLeft: '-50px'
                }}
                onClick={handleChatClick}
            >
                AI Chat
            </Button>
        </Box >
    );
}

export default SubNavBar;
