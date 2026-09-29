// Existing supplementary-panel structure and styles retained; data comes from /api/results.
import ExternalLinksPanel from './ExternalLinksPanel';
import { normalizeExternalLinks } from './externalLinks';
import React, { useState } from 'react';
import { Box, Typography, Link, CircularProgress, Backdrop } from '@mui/material';
import { sitePath } from './api';
import { trackGtagEvent as trackResultNewEvent } from '../utils/gtag';
export function useResourcePanels(referenceData = {}, resourceStatus, options) {
    const [imagePopupUrl, setImagePopupUrl] = useState('');
    const debug = false;
    const referencesLoading = resourceStatus === 'pending';
    if (!referenceData.empirical_evidence && ['partial', 'unavailable', 'failed'].includes(resourceStatus)) {
        referenceData = { ...referenceData, empirical_evidence: { status: 'unavailable', title: 'Supplementary resources unavailable', description: 'Some source files or plots could not be retrieved. This is a resource-availability limit, not evidence of biological absence.' } };
    }
    const referencesItems = Object.values(referenceData.references || {}).map((ref, i) => ({ ...ref, id: ref.citation_number || i + 1, href: /^https?:\/\//i.test(ref.href || ref.url || '') ? (ref.href || ref.url) : undefined, anchorId: ref.anchorId || `reference-item-main-${ref.pmid || ref.id || i}-${i + 1}` }));
    // Groups already exclude the main functional asset; the compatibility first
    // item must not be rendered a second time when a complete group list exists.
    const empiricalGroups = Array.isArray(referenceData.empirical_evidence_groups) && referenceData.empirical_evidence_groups.length
        ? referenceData.empirical_evidence_groups
        : referenceData.empirical_evidence ? [referenceData.empirical_evidence] : [];
    const imageUrlFor = (entry) => {
        const path = entry.image_url || '';
        return path.startsWith('/') && !path.startsWith('//') ? sitePath(path) : '';
    };
    const empiricalEvidenceContent = empiricalGroups.length ? <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{empiricalGroups.map((entry, index) => {
        const imageUrl = imageUrlFor(entry);
        return (
        <Box key={entry.id || entry.image_url || entry.download_url || index} sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'center' }}>
            {entry.status === 'pending' ? (
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
                            setImagePopupUrl(imageUrl);
                        }}
                    />
                    <Typography
                        onClick={() => {
                            trackResultNewEvent('agent_result_image_popup_open_click', { source: 'empirical_evidence_label' });
                            setImagePopupUrl(imageUrl);
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
                        {imageUrl ? (entry.legend || 'View') : 'Plot unavailable'}
                    </Typography>
                </Box>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography sx={{ fontFamily: 'Open Sans', fontSize: 16, fontWeight: 700 }}>
                    {entry.title}
                </Typography>
                <Typography sx={{ fontFamily: 'Open Sans', fontSize: 14, fontWeight: 400, color: '#263238' }}>
                    {entry.description}
                </Typography>
                {entry.link_text && (entry.link || entry.download_url) ? (
                    <Link
                        href={sitePath(entry.link || entry.download_url || "#")}
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
                        }}>{entry.link_text}
                        </Typography>
                    </Link>
                ) : null}
            </Box>
        </Box>
        );
    })}</Box> : null;

    const pankbaseItems = (referenceData?.pankbase_links || []).map((link, index) => ({
        id: index + 1,
        title: link[0],
        subtitle: link[1],
        href: link[1],
    }));

    const externalGroups = normalizeExternalLinks(referenceData);

    const registeredTabs = {
        references: (referencesItems.length || referencesLoading || debug) ? { label: 'References', items: referencesItems } : null,
        empirical_evidence: empiricalEvidenceContent ? { label: 'Empirical Evidence', content: empiricalEvidenceContent } : null,
        pankbase_links: pankbaseItems.length ? { label: 'Pankbase Links', items: pankbaseItems } : null,
        external_links: externalGroups.length ? { label: 'External Links', content: <ExternalLinksPanel key={externalGroups.map(group => group.entries.map(entry => entry.url).join('|')).join(';')} groups={externalGroups} /> } : null,
    };
    const evidenceTabs = Array.isArray(options?.tabs)
        ? options.tabs.map(({ id, label }) => registeredTabs[id] ? { ...registeredTabs[id], label: label || registeredTabs[id].label } : null).filter(Boolean)
        : Object.values(registeredTabs).filter(Boolean);

    const popupIsCurrent = imagePopupUrl && empiricalGroups.some((entry) => imageUrlFor(entry) === imagePopupUrl);
    const popup = popupIsCurrent ? <Backdrop sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })} open onClick={() => setImagePopupUrl('')}><Box component="img" src={imagePopupUrl} alt="Empirical Evidence" sx={{ maxWidth: '100%', maxHeight: '100%' }} /></Backdrop> : null;
    return { tabs: evidenceTabs, references: referencesItems, popup };
}
