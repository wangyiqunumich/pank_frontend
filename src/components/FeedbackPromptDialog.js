import React from 'react';

import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import { Box, Button, Typography } from '@mui/material';

export default function FeedbackPromptDialog({ open, onShareFeedback, onMaybeLater }) {
  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        bgcolor: 'rgba(15, 23, 42, 0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box
        sx={{
          width: 'min(420px, calc(100vw - 32px))',
          bgcolor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0px 8px 10px -6px rgba(0, 0, 0, 0.10), 0px 20px 25px -5px rgba(0, 0, 0, 0.10)',
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              bgcolor: '#008C8C20',
              color: '#008C8C',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: 'Open Sans, sans-serif', fontSize: 18, fontWeight: 400, color: '#0F172A', lineHeight: 1.25 }}>
              We'd Love Your Feedback!
            </Typography>
            <Typography sx={{ mt: 0.75, fontFamily: 'Open Sans, sans-serif', fontSize: 14, fontWeight: 400, color: '#64748B', lineHeight: 1.5 }}>
              Help us improve PanKgraph by sharing your thoughts. It only takes a minute.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Button
            onClick={onShareFeedback}
            sx={{
              textTransform: 'none',
              height: 44,
              borderRadius: '10px',
              fontSize: 15,
              fontWeight: 700,
              color: '#FFFFFF',
              bgcolor: '#3A838B',
              '&:hover': { bgcolor: '#2E6A70' },
            }}
          >
            Share Feedback
          </Button>
          <Button
            onClick={onMaybeLater}
            sx={{
              textTransform: 'none',
              height: 44,
              borderRadius: '10px',
              fontSize: 15,
              fontWeight: 700,
              color: '#0F172A',
              bgcolor: '#FFFFFF',
              border: '1px solid #D5DBE3',
              '&:hover': { bgcolor: '#F8FAFC' },
            }}
          >
            Maybe Later
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
