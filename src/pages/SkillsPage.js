import React from 'react';

import { useNavigate } from 'react-router-dom';

import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import {
  Box,
  Button,
  Paper,
  Typography,
} from '@mui/material';

import AgentSidebar from '../components/AgentSidebar';
import {
  ReactComponent as FunctionalDataSkillLogo,
} from '../image/new_logos/functional-data-icon.svg';
import {
  ReactComponent as GwasSkillLogo,
} from '../image/new_logos/gwas-explorer-icon.svg';
import {
  ReactComponent as QtlSkillLogo,
} from '../image/new_logos/qtl-explorer-icon.svg';

function SkillLogo({ SvgIcon, size = 30, color = '#0F766E' }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        '& svg': {
          width: '100%',
          height: '100%',
          display: 'block',
        },
        '& svg *': {
          stroke: 'currentColor !important',
        },
        '& svg circle': {
          fill: 'currentColor !important',
        },
      }}
    >
      <SvgIcon />
    </Box>
  );
}

function SkillCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  accent = '#0F766E',
  iconBg = 'rgba(15,118,110,0.08)',
  iconShadow = 'none',
  cardBg = '#FFFFFF',
  actionHoverBg = 'rgba(15,118,110,0.06)',
  disabled = false,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        bgcolor: cardBg,
        minHeight: 360,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '14px',
          bgcolor: iconBg,
          boxShadow: iconShadow,
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
          disabled={disabled}
          sx={{
            textTransform: 'none',
            borderRadius: '12px',
            borderColor: disabled ? '#CBD5E1' : accent,
            color: disabled ? '#94A3B8' : accent,
            fontFamily: 'Inter',
            fontWeight: 700,
            px: 3,
            cursor: disabled ? 'not-allowed' : 'pointer',
            '&:hover': {
              borderColor: disabled ? '#CBD5E1' : accent,
              bgcolor: disabled ? 'transparent' : actionHoverBg,
            },
            '&.Mui-disabled': {
              borderColor: '#CBD5E1',
              color: '#94A3B8',
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
  const showSsgsea = false;

  return (
    <Box sx={{ flex: 1, bgcolor: '#FFFFFF', display: 'flex', minHeight: 0 }}>
      <AgentSidebar activeNav="skills" />

      <Box sx={{ flex: 1, px: { xs: 2.5, md: 6, lg: 8 }, py: { xs: 3, md: 6 } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography sx={{ fontFamily: 'Inter', fontWeight: 800, fontSize: { xs: 32, md: 40 }, color: '#111827' }}>
            Skills
          </Typography>
          <Typography sx={{ mt: 1, fontFamily: 'Inter', fontSize: 19, color: '#475569' }}>
            Specialized tools for focused analysis on PanKgraph.
          </Typography>

          <Box
            sx={{
              mt: 8,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: { xs: 3, md: 4 },
            }}
          >
            {showSsgsea ? (
              <SkillCard
                icon={<ExtensionOutlinedIcon sx={{ fontSize: 40 }} />}
                title="SsGSEA"
                description="Runs single-sample gene set enrichment analysis (ssGSEA) to score pathway activity at the sample or cell level."
                actionLabel="Launch"
                onAction={() => navigate('/functional-data?tool=ssgsea')}
                accent="#0F766E"
                disabled
              />
            ) : null}

            <SkillCard
              icon={<SkillLogo SvgIcon={QtlSkillLogo} size={50} color="#0868d1" />}
              title="QTL Explorer Tool"
              description="Configure gene and SNP-based QTL lookup with guided query setup and proceed to structured PanKgraph QTL results."
              actionLabel="Launch"
              onAction={() => navigate('/qtl-explorer')}
              accent="#0868d1"
              iconBg="#EAF3FB"
              iconShadow="0 8px 18px rgba(47, 111, 182, 0.28)"
              cardBg="#F5F9FC"
              actionHoverBg="#EAF3FB"
            />

            <SkillCard
              icon={<SkillLogo SvgIcon={GwasSkillLogo} size={50} color="#096e1b" />}
              title="GWAS Explorer Tool"
              description="Explore SNP-level GWAS evidence for T1D-focused cohorts and jump to result context in PanKgraph."
              actionLabel="Launch"
              onAction={() => navigate('/gwas-explorer')}
              accent="#096e1b"
              iconBg="#ECF8EE"
              iconShadow="0 8px 18px rgba(31, 124, 49, 0.28)"
              cardBg="#F5FBF6"
              actionHoverBg="#ECF8EE"
            />

            <SkillCard
              icon={<SkillLogo SvgIcon={FunctionalDataSkillLogo} size={50} color="#4e0f9e" />}
              title="Functional Data Tool"
              description="Generates interactive visualizations for donor-level functional response, cohort filtering, and trait association exploration."
              actionLabel="Launch"
              onAction={() => navigate('/functional-data')}
              accent="#4e0f9e"
              iconBg="#F3ECFA"
              iconShadow="0 8px 18px rgba(105, 46, 156, 0.28)"
              cardBg="#FAF7FC"
              actionHoverBg="#F3ECFA"
            />
          </Box>

          <Box sx={{ mt: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Box sx={{ width: 120, height: 1, bgcolor: '#CBD5E1' }} />
            <Typography sx={{ fontFamily: 'Inter', fontSize: 20, color: '#64748B' }}>
              More tools coming soon
            </Typography>
            <Box sx={{ width: 120, height: 1, bgcolor: '#CBD5E1' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
