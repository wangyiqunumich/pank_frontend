import React from 'react';

import { useNavigate } from 'react-router-dom';

import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import {
  Box,
  Button,
  Paper,
  Typography,
} from '@mui/material';

import AgentSidebar from '../components/AgentSidebar';

function SkillCard({ icon, title, description, actionLabel, onAction, accent = '#0F766E' }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        minHeight: 278,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '14px',
          bgcolor: 'rgba(15,118,110,0.08)',
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontFamily: 'Inter', fontSize: 36 / 1.8, fontWeight: 700, color: '#111827', mb: 1.5 }}>
        {title}
      </Typography>
      <Typography sx={{ fontFamily: 'Inter', fontSize: 16, color: '#475569', lineHeight: 1.65, flex: 1 }}>
        {description}
      </Typography>
      <Box sx={{ pt: 3 }}>
        <Button
          variant="outlined"
          onClick={onAction}
          sx={{
            textTransform: 'none',
            borderRadius: '12px',
            borderColor: accent,
            color: accent,
            fontFamily: 'Inter',
            fontWeight: 700,
            px: 3,
            '&:hover': {
              borderColor: accent,
              bgcolor: 'rgba(15,118,110,0.06)',
            },
          }}
        >
          {actionLabel}
        </Button>
      </Box>
    </Paper>
  );
}

export default function SkillsPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ flex: 1, bgcolor: '#FFFFFF', display: 'flex', minHeight: 0 }}>
      <AgentSidebar activeNav="skills" />

      <Box sx={{ flex: 1, px: { xs: 2, md: 6 }, py: { xs: 3, md: 6 } }}>
        <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
          <Typography sx={{ fontFamily: 'Inter', fontWeight: 800, fontSize: { xs: 32, md: 40 }, color: '#111827' }}>
            Skills
          </Typography>
          <Typography sx={{ mt: 1, fontFamily: 'Inter', fontSize: 19, color: '#475569' }}>
            Specialized tools for focused analysis on PanKbase data.
          </Typography>

          <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <SkillCard
              icon={<ExtensionOutlinedIcon sx={{ fontSize: 30 }} />}
              title="SsGSEA"
              description="Runs single-sample gene set enrichment analysis (ssGSEA) to score pathway activity at the sample or cell level."
              actionLabel="Launch"
              onAction={() => navigate('/functional-data?tool=ssgsea')}
              accent="#0F766E"
            />

            <SkillCard
              icon={<InsightsOutlinedIcon sx={{ fontSize: 30 }} />}
              title="Functional Data Explorer"
              description="Generates interactive visualizations for donor-level functional response, cohort filtering, and trait association exploration."
              actionLabel="Launch"
              onAction={() => navigate('/functional-data')}
              accent="#2563EB"
            />
          </Box>

          <Box sx={{ mt: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Box sx={{ width: 120, height: 1, bgcolor: '#CBD5E1' }} />
            <Typography sx={{ fontFamily: 'Inter', fontSize: 20, color: '#64748B' }}>
              More skills coming soon
            </Typography>
            <Box sx={{ width: 120, height: 1, bgcolor: '#CBD5E1' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
