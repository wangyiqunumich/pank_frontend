import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import AgentSidebar from '../components/AgentSidebar';
import { askHirn } from '../utils/hirnLiteratureApi';

const REQUEST_STATE = Object.freeze({
  IDLE: 'idle',
  STREAMING: 'streaming',
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELLED: 'cancelled',
});

const DEFAULT_PROGRESS = 'Connecting to the HIRN literature service…';

const humanizeLabel = (value) => {
  const normalized = String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getProgressText = (event) => {
  if (!event || event.type !== 'progress') return '';
  return typeof event.label === 'string' ? event.label.trim() : '';
};

const getSafeUrl = (value) => {
  const candidate = String(value || '').trim();
  if (!candidate) return '';

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch (_error) {
    return '';
  }
};

const normalizeReference = (reference, index) => {
  const source = reference && typeof reference === 'object' ? reference : {};
  const pmid = String(source.pmid || '').trim();
  const documentId = String(source.id || pmid || `source-${index + 1}`).trim();
  const authors = Array.isArray(source.authors)
    ? source.authors.map((author) => String(author || '').trim()).filter(Boolean)
    : String(source.authors || '').trim()
      ? [String(source.authors).trim()]
      : [];

  return {
    listNumber: index + 1,
    id: documentId,
    anchorId: `hirn-reference-${documentId.replace(/[^A-Za-z0-9_-]/g, '-')}`,
    title: String(source.title || '').trim() || `HIRN source ${documentId}`,
    pmid,
    url: getSafeUrl(source.url),
    fulltextUrl: getSafeUrl(source.fulltext_url),
    journal: String(source.journal || '').trim(),
    date: source.date === null || source.date === undefined ? '' : String(source.date).trim(),
    authors,
    source: humanizeLabel(source.source),
    consortia: String(source.consortia || '').trim(),
    citationCount: source.n_citation === null || source.n_citation === undefined
      ? null
      : source.n_citation,
  };
};

const linkInternalCitations = (answer, references) => {
  let linked = String(answer || '');
  references.filter((reference) => !reference.pmid).forEach((reference) => {
    const escapedId = reference.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const marker = new RegExp(`\\[${escapedId}\\](?!\\()`, 'g');
    linked = linked.replace(marker, `[${reference.id}](#${reference.anchorId})`);
  });
  return linked;
};

function SafeMarkdown({ children }) {
  return (
    <Box
      sx={{
        color: '#334155',
        fontSize: { xs: 14, md: 15 },
        lineHeight: 1.75,
        overflowWrap: 'anywhere',
        overflowX: 'auto',
        '& > :first-of-type': { mt: 0 },
        '& > :last-child': { mb: 0 },
        '& p': { my: 1.15 },
        '& ul, & ol': { my: 1.15, pl: 3 },
        '& li': { mb: 0.55 },
        '& blockquote': {
          m: '16px 0',
          pl: 2,
          borderLeft: '3px solid #8FCBC5',
          color: '#475569',
        },
        '& table': {
          width: '100%',
          borderCollapse: 'collapse',
          my: 2,
        },
        '& th, & td': {
          border: '1px solid #DCE5E8',
          px: 1.25,
          py: 1,
          textAlign: 'left',
          verticalAlign: 'top',
        },
        '& th': { bgcolor: '#F3F8F8', color: '#1E4F55' },
        '& code': {
          bgcolor: '#F1F5F9',
          borderRadius: '4px',
          px: 0.55,
          py: 0.15,
          fontSize: '0.92em',
        },
        '& pre': {
          bgcolor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          p: 1.5,
          overflowX: 'auto',
        },
        '& pre code': { bgcolor: 'transparent', p: 0 },
      }}
    >
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: linkChildren }) => {
            const target = String(href || '');
            if (target.startsWith('#hirn-reference-')) {
              return <Link href={target} underline="hover" sx={{ color: '#087F7B', fontWeight: 700 }}>{linkChildren}</Link>;
            }
            const safeHref = getSafeUrl(target);
            return safeHref ? (
              <Link href={safeHref} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#087F7B', fontWeight: 700 }}>
                {linkChildren}
              </Link>
            ) : <>{linkChildren}</>;
          },
          img: () => null,
          h1: ({ children: heading }) => (
            <Typography component="h2" sx={{ mt: 2.5, mb: 1, fontSize: 20, fontWeight: 700, color: '#0F172A' }}>
              {heading}
            </Typography>
          ),
          h2: ({ children: heading }) => (
            <Typography component="h3" sx={{ mt: 2.25, mb: 1, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
              {heading}
            </Typography>
          ),
          h3: ({ children: heading }) => (
            <Typography component="h4" sx={{ mt: 2, mb: 0.75, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
              {heading}
            </Typography>
          ),
        }}
      >
        {String(children || '')}
      </ReactMarkdown>
    </Box>
  );
}

function ReferenceCard({ reference }) {
  const metadata = [reference.source, reference.journal, reference.date, reference.consortia].filter(Boolean);
  const hasCitationCount = reference.citationCount !== null
    && reference.citationCount !== undefined
    && String(reference.citationCount).trim() !== '';
  const citationLabel = hasCitationCount
    ? `${reference.citationCount} ${Number(reference.citationCount) === 1 ? 'citation' : 'citations'}`
    : '';
  const title = (
    <Typography
      component="span"
      sx={{
        color: reference.url ? '#087F7B' : '#1E293B',
        fontSize: { xs: 14, md: 15 },
        fontWeight: 700,
        lineHeight: 1.45,
      }}
    >
      {reference.title}
    </Typography>
  );

  return (
    <Paper
      component="article"
      id={reference.anchorId}
      elevation={0}
      sx={{
        border: '1px solid #E0E8EA',
        borderRadius: '14px',
        p: { xs: 1.75, sm: 2.25 },
        bgcolor: '#FFFFFF',
        transition: 'border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          borderColor: '#9CCEC9',
          boxShadow: '0 8px 24px rgba(39, 91, 91, 0.08)',
        },
      }}
    >
      <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="flex-start">
        <Box
          aria-hidden="true"
          sx={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: '1px solid #168C86',
            color: '#087F7B',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 800,
            mt: 0.15,
          }}
        >
          {reference.listNumber}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {reference.url ? (
            <Link
              href={reference.url}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ textDecorationColor: '#70B8B2' }}
            >
              {title}
            </Link>
          ) : title}

          <Stack
            direction="row"
            useFlexGap
            flexWrap="wrap"
            alignItems="center"
            spacing={0.75}
            sx={{ mt: 0.85 }}
          >
            {reference.pmid ? (
              reference.url ? (
                <Link
                  href={reference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ color: '#087F7B', fontSize: 11, fontWeight: 700 }}
                >
                  PMID {reference.pmid}
                </Link>
              ) : (
                <Typography sx={{ color: '#64748B', fontSize: 11, fontWeight: 700 }}>
                  PMID {reference.pmid}
                </Typography>
              )
            ) : (
              <Typography sx={{ color: '#52666D', fontSize: 11, fontWeight: 800 }}>
                {reference.id}
              </Typography>
            )}
            {metadata.map((item, metadataIndex) => (
              <Chip
                key={`${item}-${metadataIndex}`}
                label={item}
                size="small"
                sx={{
                  height: 21,
                  bgcolor: '#F1F6F7',
                  color: '#52666D',
                  fontSize: 10,
                  '& .MuiChip-label': { px: 0.9 },
                }}
              />
            ))}
            {citationLabel ? (
              <Chip
                label={citationLabel}
                size="small"
                sx={{
                  height: 21,
                  bgcolor: '#EEF6F2',
                  color: '#33715F',
                  fontSize: 10,
                  '& .MuiChip-label': { px: 0.9 },
                }}
              />
            ) : null}
          </Stack>

          {reference.authors.length ? (
            <Typography
              sx={{
                mt: 1,
                color: '#64748B',
                fontSize: 11.5,
                lineHeight: 1.55,
                overflowWrap: 'anywhere',
              }}
            >
              <Box component="span" sx={{ fontWeight: 700, color: '#475569' }}>Authors: </Box>
              {reference.authors.join(', ')}
            </Typography>
          ) : null}
          {reference.fulltextUrl && reference.fulltextUrl !== reference.url ? (
            <Link href={reference.fulltextUrl} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ display: 'inline-block', mt: 1, color: '#087F7B', fontSize: 11.5, fontWeight: 700 }}>
              Read full text
            </Link>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
}

function Composer({
  question,
  onQuestionChange,
  onSubmit,
  onCancel,
  onRetry,
  status,
  canRetry,
}) {
  const isStreaming = status === REQUEST_STATE.STREAMING;
  const isEmpty = !question.trim();

  const handleKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!isStreaming && !isEmpty) onSubmit();
    }
  };

  return (
    <Paper
      component="section"
      aria-labelledby="hirn-question-heading"
      elevation={0}
      sx={{
        border: '1px solid #DDE7E9',
        borderRadius: '16px',
        p: { xs: 2, sm: 2.5 },
        bgcolor: '#FFFFFF',
        boxShadow: '0 12px 36px rgba(29, 78, 78, 0.06)',
      }}
    >
      <Typography id="hirn-question-heading" sx={{ color: '#0F172A', fontSize: 15, fontWeight: 700, mb: 0.45 }}>
        Ask a question about HIRN literature
      </Typography>
      <Typography sx={{ color: '#64748B', fontSize: 12, mb: 1.5 }}>
        Use plain language. The answer will be grounded in relevant biomedical articles.
      </Typography>

      <TextField
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isStreaming}
        placeholder="For example: What is the role of ZnT8/SLC30A8 in type 1 diabetes?"
        fullWidth
        multiline
        minRows={4}
        maxRows={10}
        inputProps={{
          'aria-label': 'Ask a question about HIRN literature',
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            alignItems: 'flex-start',
            borderRadius: '12px',
            bgcolor: isStreaming ? '#F8FAFC' : '#FFFFFF',
            fontFamily: 'Inter',
            fontSize: 14,
            lineHeight: 1.55,
            '& fieldset': { borderColor: '#CBDADF' },
            '&:hover fieldset': { borderColor: '#80B8B5' },
            '&.Mui-focused fieldset': { borderColor: '#3A838B', borderWidth: 1.5 },
          },
        }}
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.25}
        sx={{ mt: 1.5 }}
      >
        <Typography sx={{ color: '#94A3B8', fontSize: 10.5 }}>
          Press Ctrl/⌘ + Enter to submit
        </Typography>
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1}>
          {canRetry && !isStreaming ? (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
              sx={{
                textTransform: 'none',
                color: '#3A838B',
                borderColor: '#9CC8C5',
                borderRadius: '10px',
                px: 2,
                '&:hover': { borderColor: '#3A838B', bgcolor: '#F3F9F8' },
              }}
            >
              Retry
            </Button>
          ) : null}
          {isStreaming ? (
            <Button
              variant="outlined"
              startIcon={<CancelOutlinedIcon />}
              onClick={onCancel}
              sx={{
                textTransform: 'none',
                color: '#A84C4C',
                borderColor: '#E2B3B3',
                borderRadius: '10px',
                px: 2.25,
                '&:hover': { borderColor: '#C66C6C', bgcolor: '#FFF8F8' },
              }}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="contained"
              endIcon={<SendRoundedIcon />}
              onClick={onSubmit}
              disabled={isEmpty}
              sx={{
                textTransform: 'none',
                bgcolor: '#3A838B',
                borderRadius: '10px',
                px: 2.25,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#2F737A', boxShadow: 'none' },
                '&.Mui-disabled': { bgcolor: '#DCE5E8', color: '#8B9BA2' },
              }}
            >
              Ask HIRN Literature
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function HIRNLiteraturePage() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [status, setStatus] = useState(REQUEST_STATE.IDLE);
  const [progress, setProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [finalEvent, setFinalEvent] = useState(null);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    // React Router preserves the document scroll position between tool pages.
    // Reset it so launching the fourth card always reveals this page's heading.
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => () => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
  }, []);

  const startRequest = useCallback(async (rawQuestion) => {
    const normalizedQuestion = String(rawQuestion || '').trim();
    if (!normalizedQuestion) return;

    abortControllerRef.current?.abort();
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSubmittedQuestion(normalizedQuestion);
    setQuestion(normalizedQuestion);
    setStatus(REQUEST_STATE.STREAMING);
    setProgress(DEFAULT_PROGRESS);
    setErrorMessage('');
    setFinalEvent(null);

    try {
      const completedEvent = await askHirn(normalizedQuestion, {
        signal: controller.signal,
        onEvent: (event) => {
          if (requestId !== requestIdRef.current || controller.signal.aborted) return;
          const nextProgress = getProgressText(event);
          if (nextProgress) setProgress(nextProgress);
        },
      });

      if (requestId !== requestIdRef.current || controller.signal.aborted) return;
      setFinalEvent(completedEvent);
      setProgress('');
      setStatus(REQUEST_STATE.SUCCESS);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      if (controller.signal.aborted || error?.name === 'AbortError') {
        setStatus(REQUEST_STATE.CANCELLED);
        setProgress('');
        setErrorMessage('');
      } else {
        const message = typeof error?.message === 'string' && error.message.trim()
          ? error.message.trim()
          : 'The HIRN literature request could not be completed.';
        setStatus(REQUEST_STATE.ERROR);
        setProgress('');
        setErrorMessage(message);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  const handleCancel = useCallback(() => {
    const controller = abortControllerRef.current;
    if (!controller) return;

    requestIdRef.current += 1;
    abortControllerRef.current = null;
    controller.abort();
    setStatus(REQUEST_STATE.CANCELLED);
    setProgress('');
    setErrorMessage('');
  }, []);

  const handleAskAnother = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setQuestion('');
    setSubmittedQuestion('');
    setFinalEvent(null);
    setProgress('');
    setErrorMessage('');
    setStatus(REQUEST_STATE.IDLE);
  }, []);

  const references = useMemo(
    () => (Array.isArray(finalEvent?.references) ? finalEvent.references : [])
      .map(normalizeReference),
    [finalEvent]
  );
  const isSuccess = status === REQUEST_STATE.SUCCESS;
  const isRefusal = isSuccess && references.length === 0;
  const renderedAnswer = useMemo(
    () => linkInternalCitations(finalEvent?.response, references),
    [finalEvent, references]
  );
  const canRetry = Boolean(submittedQuestion)
    && (status === REQUEST_STATE.ERROR || status === REQUEST_STATE.CANCELLED);

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', bgcolor: '#F8FBFB', fontFamily: 'Inter' }}>
      <AgentSidebar activeNav="skills" />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          overflowY: 'auto',
          px: { xs: 2, sm: 3, lg: 4 },
          py: { xs: 2, sm: 2.5, lg: 3 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 1060, mx: 'auto', pb: { xs: 4, md: 6 } }}>
          <Button
            startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/skills')}
            sx={{
              textTransform: 'none',
              color: '#2F6F6A',
              fontSize: 12,
              mb: { xs: 2, md: 2.5 },
              px: 0,
              minWidth: 0,
            }}
          >
            Back to Tools
          </Button>

          <Box sx={{ mb: { xs: 2.5, md: 3.5 } }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#E1F2EF',
                  color: '#287C77',
                  flexShrink: 0,
                }}
              >
                <AutoStoriesOutlinedIcon sx={{ fontSize: 23 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography component="h1" sx={{ color: '#0F172A', fontSize: { xs: 22, sm: 25 }, fontWeight: 700, lineHeight: 1.25 }}>
                  HIRN Literature QA
                </Typography>
                <Typography sx={{ color: '#52727A', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', mt: 0.25 }}>
                  Human Islet Research Network
                </Typography>
              </Box>
            </Stack>
            <Typography sx={{ maxWidth: 720, color: '#64748B', fontSize: { xs: 13, md: 14 }, lineHeight: 1.65 }}>
              Ask a biomedical question and receive an answer grounded only in the closed HIRN literature library. If the library cannot support an answer, it will say so directly.
            </Typography>
            <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75} sx={{ mt: 1.5 }}>
              {['Closed HIRN corpus', 'Source-linked answers', 'Single-turn search'].map((label) => (
                <Chip
                  key={label}
                  label={label}
                  size="small"
                  sx={{ height: 24, bgcolor: '#EAF4F3', color: '#3A6F70', fontSize: 10.5, fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Box>

          {isSuccess ? (
            <Stack spacing={2.5}>
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid #DDE7E9',
                  borderRadius: '14px',
                  p: { xs: 1.75, sm: 2 },
                  bgcolor: '#F4F9F9',
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                  spacing={1.5}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ color: '#688086', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 0.4 }}>
                      Your question
                    </Typography>
                    <Typography sx={{ color: '#1E293B', fontSize: 14, fontWeight: 600, lineHeight: 1.55, overflowWrap: 'anywhere' }}>
                      {submittedQuestion}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleAskAnother}
                    sx={{
                      flexShrink: 0,
                      textTransform: 'none',
                      color: '#3A838B',
                      borderColor: '#9CC8C5',
                      borderRadius: '9px',
                      '&:hover': { borderColor: '#3A838B', bgcolor: '#FFFFFF' },
                    }}
                  >
                    Ask another question
                  </Button>
                </Stack>
              </Paper>

              <Paper
                component="section"
                aria-labelledby="hirn-answer-heading"
                elevation={0}
                sx={{
                  border: isRefusal ? '1px solid #D8DEE8' : '1px solid #DDE7E9',
                  borderRadius: '16px',
                  p: { xs: 2, sm: 2.75, md: 3 },
                  bgcolor: isRefusal ? '#F8FAFC' : '#FFFFFF',
                  boxShadow: '0 12px 36px rgba(29, 78, 78, 0.05)',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  {isRefusal ? (
                    <AutoStoriesOutlinedIcon sx={{ color: '#64748B', fontSize: 21 }} />
                  ) : (
                    <CheckCircleOutlineIcon sx={{ color: '#24847C', fontSize: 21 }} />
                  )}
                  <Typography id="hirn-answer-heading" component="h2" sx={{ color: '#173E43', fontSize: 16, fontWeight: 700 }}>
                    {isRefusal ? 'Not found in this library' : 'Direct answer'}
                  </Typography>
                  {finalEvent?.execution_time ? (
                    <Typography sx={{ color: '#94A3B8', fontSize: 11 }}>
                      {Number(finalEvent.execution_time).toFixed(1)}s
                    </Typography>
                  ) : null}
                </Stack>
                {renderedAnswer.trim() ? (
                  <SafeMarkdown>{renderedAnswer}</SafeMarkdown>
                ) : (
                  <Typography sx={{ color: '#64748B', fontSize: 14 }}>
                    The literature service completed without returning answer text.
                  </Typography>
                )}
              </Paper>

              {!isRefusal ? (
              <Box component="section" aria-labelledby="hirn-references-heading">
                <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1.25 }}>
                  <Typography id="hirn-references-heading" component="h2" sx={{ color: '#173E43', fontSize: 16, fontWeight: 700 }}>
                    References
                  </Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: 11.5 }}>
                    {references.length}
                  </Typography>
                </Stack>
                <Stack spacing={1.25}>
                  {references.map((reference) => (
                    <ReferenceCard key={reference.id} reference={reference} />
                  ))}
                </Stack>
              </Box>
              ) : (
                <Alert severity="info" sx={{ borderRadius: '12px', border: '1px solid #C8E0E4' }}>
                  This is a successful closed-corpus result, not a service error. No outside source or fallback search was used.
                </Alert>
              )}
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {status === REQUEST_STATE.ERROR ? (
                <Alert
                  severity="error"
                  icon={<ErrorOutlineIcon fontSize="inherit" />}
                  sx={{ borderRadius: '12px', border: '1px solid #F0CACA', alignItems: 'center' }}
                >
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>Unable to complete the literature search</Typography>
                  <Typography sx={{ fontSize: 12 }}>{errorMessage}</Typography>
                </Alert>
              ) : null}

              {status === REQUEST_STATE.CANCELLED ? (
                <Alert severity="info" sx={{ borderRadius: '12px', border: '1px solid #C8E0E4', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>Request cancelled</Typography>
                  <Typography sx={{ fontSize: 12 }}>Your question is ready to edit, retry, or submit again.</Typography>
                </Alert>
              ) : null}

              <Composer
                question={question}
                onQuestionChange={setQuestion}
                onSubmit={() => startRequest(question)}
                onCancel={handleCancel}
                onRetry={() => startRequest(submittedQuestion)}
                status={status}
                canRetry={canRetry}
              />

              {status === REQUEST_STATE.STREAMING ? (
                <Paper
                  component="section"
                  role="status"
                  aria-live="polite"
                  elevation={0}
                  sx={{
                    border: '1px solid #CFE3E2',
                    borderRadius: '14px',
                    p: { xs: 1.75, sm: 2 },
                    bgcolor: '#F2F8F7',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <CircularProgress size={22} thickness={4.5} sx={{ color: '#3A838B', flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: '#24595D', fontSize: 12.5, fontWeight: 700 }}>
                        Searching HIRN literature
                      </Typography>
                      <Typography sx={{ color: '#5F747A', fontSize: 12, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                        {progress || DEFAULT_PROGRESS}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ) : null}
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}
