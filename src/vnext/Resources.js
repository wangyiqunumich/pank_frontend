// Existing supplementary-panel structure and styles retained; data comes from /api/results.
import React, { useState } from 'react';
import { Box, Typography, Link, CircularProgress, Backdrop } from '@mui/material';
import { sitePath } from './api';
import { trackGtagEvent as trackResultNewEvent } from '../utils/gtag';
export function useResourcePanels(referenceData = {}, resourceStatus) {
    const [imagePopupOpen, setImagePopupOpen] = useState(false);
    const debug = false;
    const referencesLoading = resourceStatus === 'pending';
    if (!referenceData.empirical_evidence && ['partial', 'unavailable', 'failed'].includes(resourceStatus)) {
        referenceData = { ...referenceData, empirical_evidence: { status: 'unavailable', title: 'Supplementary resources unavailable', description: 'Some source files or plots could not be retrieved. This is a resource-availability limit, not evidence of biological absence.' } };
    }
    const referencesItems = Object.values(referenceData.references || {}).map((ref, i) => ({ ...ref, id: ref.id || i + 1, href: /^https?:\/\//i.test(ref.href || ref.url || '') ? (ref.href || ref.url) : undefined, anchorId: ref.anchorId || `reference-item-main-${ref.pmid || ref.id || i}-${i + 1}` }));
    const imagePath = referenceData.empirical_evidence?.image_url || '';
    const imageUrl = imagePath.startsWith('/') && !imagePath.startsWith('//') ? sitePath(imagePath) : '';
    const empiricalEvidenceContent = referenceData?.empirical_evidence ? (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'center' }}>
            {referenceData.empirical_evidence.status === 'pending' ? (
                <Box sx={{
                    backgroundColor: '#F2FAFB',
                    borderRadius: 2,
                    width: '100%',
                    maxWidth: { xs: '100%', md: 520 },
                    minHeight: 200,
                    maxHeight: 260,
                    height: 260,
                    minWidth: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <CircularProgress size={28} />
                </Box>
            ) : (
                <Box sx={{ position: 'relative', width: '100%', maxWidth: { xs: '100%', md: 520 }, minHeight: 200, maxHeight: 260 }}>
                    <Box
                        component={imageUrl ? "img" : "div"}
                        src={imageUrl}
                        alt="Empirical Evidence"
                        sx={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 2, cursor: 'pointer' }}
                        onClick={() => {
                            trackResultNewEvent('agent_result_image_popup_open_click', { source: 'empirical_evidence' });
                            setImagePopupOpen(true);
                        }}
                    />
                    <Typography
                        onClick={() => {
                            trackResultNewEvent('agent_result_image_popup_open_click', { source: 'empirical_evidence_label' });
                            setImagePopupOpen(true);
                        }}
                        sx={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            borderRadius: '6px',
                            padding: '4px 10px',
                            background: 'rgba(74, 74, 75, 0.7)',
                            fontFamily: 'Open Sans',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'white',
                            transition: 'background 0.2s ease',
                            cursor: 'pointer',
                            '&:hover': {
                                background: 'rgba(74, 74, 75, 0.4)',
                            },
                        }}
                    >
                        {imageUrl ? (referenceData.empirical_evidence.legend || 'View') : 'Plot unavailable'}
                    </Typography>
                </Box>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography sx={{ fontFamily: 'Open Sans', fontSize: 16, fontWeight: 700 }}>
                    {referenceData.empirical_evidence.title}
                </Typography>
                <Typography sx={{ fontFamily: 'Open Sans', fontSize: 14, fontWeight: 400, color: '#263238' }}>
                    {referenceData.empirical_evidence.description}
                </Typography>
                {referenceData.empirical_evidence.link_text ? (
                    <Link
                        href={sitePath(referenceData.empirical_evidence.link || referenceData.empirical_evidence.download_url || "#")}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ textDecoration: 'none' }}
                    >
                        <Typography sx={{
                            cursor: 'pointer',
                            fontFamily: 'Open Sans',
                            fontSize: 14,
                            paddingY: 1,
                            paddingX: 2,
                            backgroundColor: '#219197',
                            textAlign: 'center',
                            borderRadius: 2,
                            color: 'white',
                            fontWeight: 600,
                            width: 'fit-content',
                        }}>{referenceData.empirical_evidence.link_text}
                        </Typography>
                    </Link>
                ) : null}
            </Box>
        </Box>
    ) : null;

    const pankbaseItems = (referenceData?.pankbase_links || []).map((link, index) => ({
        id: index + 1,
        title: link[0],
        subtitle: link[1],
        href: link[1],
    }));

    const externalItems = (referenceData?.external_links || []).map((link, index) => ({
        id: index + 1,
        title: link[0],
        subtitle: link[1],
        href: link[2],
    }));

    const evidenceTabs = [
        (referencesItems.length || referencesLoading || debug) ? { label: 'References', items: referencesItems } : null,
        empiricalEvidenceContent ? { label: 'Empirical Evidence', content: empiricalEvidenceContent } : null,
        pankbaseItems.length ? { label: 'Pankbase Links', items: pankbaseItems } : null,
        externalItems.length ? { label: 'External Links', items: externalItems } : null,
    ].filter(Boolean);

    const popup = imageUrl ? <Backdrop sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })} open={imagePopupOpen} onClick={() => setImagePopupOpen(false)}><Box component="img" src={imageUrl} alt="Empirical Evidence" sx={{ maxWidth: '100%', maxHeight: '100%' }} /></Backdrop> : null;
    return { tabs: evidenceTabs, references: referencesItems, popup };
}
