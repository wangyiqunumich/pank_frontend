// QuestionAnswerPage.jsx
// Requires: @mui/material @mui/icons-material @emotion/react @emotion/styled @fontsource/open-sans
import * as React from 'react';

import {
  Box,
  Chip,
  createTheme,
  CssBaseline,
  Divider,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  ThemeProvider,
  Typography,
  useMediaQuery,
} from '@mui/material';

/**
 * All information is passed in as a single object: `data`.
 *
 * Suggested shape:
 * {
 *   questionId: "Q1",
 *   title: "How Does ... ?",
 *   aiOverview: { sections: [{ heading: "Gene Function:", body: "..." }, ...] },
 *   visualMaterial: {
 *     title: "VISUAL MATERIAL",
 *     tabs: [{ label: "Knowledge Graph", content: <JSX/> | "string" }, { label: "Provenance", content: ... }]
 *   },
 *   evidences: {
 *     title: "Evidences",
 *     tabs: [
 *       { label: "References", items: [{ id: "1", title: "...", subtitle: "NATURE GENETICS, 2021 • PMID: ..." }, ...] },
 *       { label: "Provenance", items: [...] },
 *       { label: "Pankbase Links", items: [...] },
 *       { label: "External Links", items: [...] },
 *     ]
 *   },
 *   followUp: { title: "Follow Up", items: ["Question ...", "Question ..."] }
 * }
 */

const theme = createTheme({
    typography: {
        fontFamily: '"Open Sans", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    },
    palette: {
        background: {
            default: "#ffffff",
        },
        text: {
            primary: "#0F172A",
            secondary: "#64748B",
        },
    },
    shape: { borderRadius: 14 },
});

function SectionCard({ title, children, sx }) {
    return (
        <Paper
            elevation={0}
            sx={{
                background: "#fff",
                ...sx,
            }}
        >
            {title ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
                    <Typography
                        sx={{
                            fontSize: 14,
                            letterSpacing: "0.08em",
                            fontWeight: 600,
                            color: "#94A3B8",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {title}
                    </Typography>
                    <Divider sx={{ flex: 1, borderColor: "#E6EAF2" }} />
                </Box>
            ) : null}
            {children}
        </Paper>
    );
}

function ContentTabs({ tabs, value, onChange }) {
    return (
        <Tabs
            value={value}
            onChange={onChange}
            variant="scrollable"
            scrollButtons={false}
            sx={{
                minHeight: 34,
                "& .MuiTab-root": {
                    minHeight: 34,
                    pb: 2,
                    pt: 0.5,
                    px: 0,
                    minWidth: "auto",
                    marginRight: "48px",
                    textTransform: "none",
                    fontWeight: "600 !important",
                    fontSize: "14px !important",
                    color: "#94A3B8 !important",
                    "&:last-child": {
                        marginRight: 0,
                    },
                },
                "& .Mui-selected": { color: "#3A838B !important" },
                "& .MuiTabs-indicator": { backgroundColor: "#3A838B !important", height: 2 },
            }}
        >
            {tabs.map((t) => (
                <Tab key={t.label} label={t.label} />
            ))}
        </Tabs>
    );
}

function BodyText({ text }) {
    // keep simple paragraph formatting while looking like the screenshot
    return (
        <Typography
            sx={{
                fontSize: 16,
                fontWeight: 400,
                lineHeight: 1.75,
                color: "#475569",
                whiteSpace: "pre-wrap",
            }}
        >
            {text}
        </Typography>
    );
}

function EvidenceItem({ item }) {
    return (
        <Paper
            elevation={0}
            sx={{
                background: "#fff",
                border: "1px solid #E7EBEF",
                borderRadius: "16px",
                p: 2,
            }}
        >
            <Stack direction="row" spacing={3} alignItems="flex-start">
                <Chip
                    label={String(item.id)}
                    size="small"
                    sx={{
                        mt: 0.2,
                        fontWeight: 900,
                        fontSize: "10px",
                        bgcolor: "transparent",
                        color: "#008C8C",
                        border: "1px solid #008C8C",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        "& .MuiChip-label": {
                            padding: 0,
                        },
                    }}
                />
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#008C8C",
                            mb: 0.35,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                        }}
                    >
                        {item.title}
                    </Typography>
                    {item.subtitle ? (
                        <Typography
                            sx={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: "#94A3B8",
                                letterSpacing: "0.02em",
                            }}
                        >
                            {item.subtitle}
                        </Typography>
                    ) : null}
                </Box>
            </Stack>
        </Paper>
    );
}

export default function QuestionAnswerPage({ data }) {
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));

    const [visualTab, setVisualTab] = React.useState(0);
    const [evidenceTab, setEvidenceTab] = React.useState(0);

    const handleVisualTabChange = (newTab) => {
        setVisualTab(newTab);
        data?.visualMaterial?.onTabChange?.(newTab);
    };

    const visualTabs = data?.visualMaterial?.tabs ?? [];
    const evidenceTabs = data?.evidences?.tabs ?? [];

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />

            <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2.5, md: 3.5 }, maxWidth: 1200, mx: "auto" }}>
                {/* Header */}
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <Chip
                        label={data.questionId || "Q1"}
                        sx={{
                            bgcolor: "#0F766E",
                            color: "#fff",
                            fontWeight: 800,
                            borderRadius: 2,
                            height: 30,
                        }}
                    />
                    <Typography
                        sx={{
                            fontSize: 32, // required
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                            color: "#1E293B",
                            lineHeight: 1.15,
                        }}
                    >
                        {data.title}
                    </Typography>
                </Stack>

                <Divider sx={{ mb: 2.5, borderColor: "#E6EAF2" }} />

                {/* Main two-column area (AI Overview + Visual Material) */}
                <Grid container spacing={2.5} alignItems="stretch">
                    {/* AI Overview */}
                    <Grid item xs={12} md={7} order={{ xs: 1, md: 1 }}>
                        <SectionCard title="AI Overview">
                            <Stack spacing={1.5}>
                                {(data?.aiOverview?.sections ?? []).map((sec, idx) => (
                                    <Box key={`${sec.heading}-${idx}`}>
                                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#3A838B", mb: 0.6 }}>
                                            {sec.heading}
                                        </Typography>
                                        <BodyText text={sec.body} />
                                    </Box>
                                ))}
                            </Stack>
                        </SectionCard>
                    </Grid>

                    {/* Visual Material */}
                    <Grid item xs={12} md={5} order={{ xs: 2, md: 2 }}>
                        <SectionCard title={data?.visualMaterial?.title ?? "Visual Material"} sx={{ height: "100%" }}>
                            <Box sx={{ mb: 1 }}>
                                <ContentTabs
                                    tabs={visualTabs.length ? visualTabs : [{ label: "Knowledge Graph" }, { label: "Provenance" }]}
                                    value={visualTab}
                                    onChange={(_, v) => handleVisualTabChange(v)}
                                />
                            </Box>

                            {visualTabs.map((tab, idx) => (
                                <Paper
                                    key={`visual-tab-${idx}`}
                                    elevation={0}
                                    sx={{
                                        border: "1px solid #E6EAF2",
                                        borderRadius: 3,
                                        minHeight: 310,
                                        bgcolor: "#F7F9FD",
                                        display: visualTab === idx ? "flex" : "none",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        p: 2,
                                    }}
                                >
                                    {tab.content ? (
                                        typeof tab.content === "string" ? (
                                            <BodyText text={tab.content} />
                                        ) : (
                                            tab.content
                                        )
                                    ) : (
                                        <Typography sx={{ fontSize: 13, color: "#94A3B8", fontWeight: 700 }}>
                                            Visual content goes here
                                        </Typography>
                                    )}
                                </Paper>
                            ))}
                        </SectionCard>
                    </Grid>

                    {/* Evidences */}
                    <Grid item xs={12} md={7} order={{ xs: 3, md: 3 }}>
                        <SectionCard title={data?.evidences?.title ?? "Evidences"}>
                            <Box sx={{ mb: 1 }}>
                                <ContentTabs
                                    tabs={
                                        evidenceTabs.length
                                            ? evidenceTabs
                                            : [{ label: "References" }, { label: "Provenance" }, { label: "Pankbase Links" }, { label: "External Links" }]
                                    }
                                    value={evidenceTab}
                                    onChange={(_, v) => setEvidenceTab(v)}
                                />
                            </Box>

                            <Stack spacing={1.25}>
                                {evidenceTabs.map((tab, tabIdx) => (
                                    <Box
                                        key={`evidence-tab-${tabIdx}`}
                                        sx={{ display: evidenceTab === tabIdx ? "block" : "none" }}
                                    >
                                        {tab.items && tab.items.length ? (
                                            <Stack spacing={1.25}>
                                                {tab.items.map((it) => (
                                                    <EvidenceItem key={`${it.id}-${it.title}`} item={it} />
                                                ))}
                                            </Stack>
                                        ) : (
                                            <Typography sx={{ fontSize: 13, color: "#94A3B8", fontWeight: 700, py: 2 }}>
                                                No evidence items for this tab.
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                            </Stack>
                        </SectionCard>
                    </Grid>

                    {/* Follow Up */}
                    <Grid item xs={12} md={5} order={{ xs: 4, md: 4 }}>
                        <SectionCard title={data?.followUp?.title ?? "Follow Up"} sx={{ height: "100%" }}>
                            <Stack spacing={1.25}>
                                {(data?.followUp?.items ?? []).map((q, idx) => (
                                    <Paper
                                        key={`${idx}-${q}`}
                                        elevation={0}
                                        sx={{
                                            bgcolor: "#F8FAFC",
                                            py: 2,
                                            px: 3,
                                            borderRadius: "16px",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                            "&:hover": {
                                                bgcolor: "#EFF6FF",
                                            },
                                        }}
                                    >
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>{q}</Typography>
                                    </Paper>
                                ))}

                                {!data?.followUp?.items?.length ? (
                                    <Typography sx={{ fontSize: 13, color: "#94A3B8", fontWeight: 700, py: 2 }}>
                                        No follow-up questions.
                                    </Typography>
                                ) : null}
                            </Stack>
                        </SectionCard>
                    </Grid>
                </Grid>

                {/* Note:
            Responsive behavior requirement:
            On small widths, the Grid `order` makes the layout become one column in this exact order:
            AI overview -> visual material -> evidences -> follow up.
            On md+ widths it becomes a 2-column layout like the screenshot.
        */}
            </Box>
        </ThemeProvider>
    );
}

/* ------------------ Example usage ------------------

import React from "react";
import QuestionAnswerPage from "./QuestionAnswerPage";

const pageData = {
  questionId: "Q1",
  title: "How Does The SNP Rs2402203 Influence The Expression Of CFTR In Pancreas Tissue, As Reported By GTEx?",
  aiOverview: {
    sections: [
      {
        heading: "Gene Function:",
        body:
          "The gene CFTR ... (your text here)",
      },
      {
        heading: "QTL Link:",
        body:
          "The SNP rs2402203 ... (your text here)",
      },
      {
        heading: "Specific Relation To Type 1 Diabetes:",
        body:
          "The gene CFTR ... (your text here)",
      },
    ],
  },
  visualMaterial: {
    title: "VISUAL MATERIAL",
    tabs: [
      { label: "Knowledge Graph", content: "" }, // can be JSX too
      { label: "Provenance", content: "" },
    ],
  },
  evidences: {
    title: "Evidences",
    tabs: [
      {
        label: "References",
        items: [
          { id: 1, title: "Fine-Mapping, Trans-Ancestral And Genomic Analyses Identify Causal Variants...", subtitle: "NATURE GENETICS, 2021 • PMID: 34127860" },
          { id: 2, title: "Fine-Mapping, Trans-Ancestral And Genomic Analyses Identify Causal Variants...", subtitle: "NATURE GENETICS, 2021 • PMID: 34127860" },
          { id: 3, title: "Fine-Mapping, Trans-Ancestral And Genomic Analyses Identify Causal Variants...", subtitle: "NATURE GENETICS, 2021 • PMID: 34127860" },
          { id: 4, title: "Fine-Mapping, Trans-Ancestral And Genomic Analyses Identify Causal Variants...", subtitle: "NATURE GENETICS, 2021 • PMID: 34127860" },
        ],
      },
      { label: "Provenance", items: [] },
      { label: "Pankbase Links", items: [] },
      { label: "External Links", items: [] },
    ],
  },
  followUp: {
    title: "Follow Up",
    items: [
      "What are the target cells for CFTR in the pancreas?",
      "How Does CFTR Interact With CSK In Autoimmune Processes?",
      "Are There Other SNPs In The Same Locus Linked To T1D?",
    ],
  },
};

export default function App() {
  return <QuestionAnswerPage data={pageData} />;
}

---------------------------------------------------- */
