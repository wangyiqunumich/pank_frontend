import React, { useState } from 'react';
import { Box, Button, Tabs, Tab, Typography } from '@mui/material';
import schema from './schema/result_page_schema.json';
const config = schema.main_visuals.preview_standard;
const copy = config.wording;
const scCopy = schema.main_visuals.items.single_cell_browser.wording;
// Every eligible non-graph renderer receives preview=true. Keep only one preview
// visible, and leave the persistent main panels (including graph camera) mounted.
export default function VisualPreview({ items = [], requestedId, minimized, closed, onMinimize, onClose, onRestore, onOpen }) {
  const [selection, setSelection] = useState(null);
  const requested = requestedId?.id;
  const selected = selection?.request === requestedId ? selection.id : requested;
  const current = items.find(item => item.id === selected) || items[0];
  if (!current || config.enabled === false) return null;
  const scOnly = items.length === 1 && current.id === 'single_cell_browser';
  if (closed) return <Button onClick={onRestore} sx={{ position: 'absolute', top: 12, right: 64, zIndex: 20, bgcolor: '#fff', fontSize: 11 }}>{copy.show}</Button>;
  return <Box component="section" aria-label={scOnly ? scCopy.preview_region : copy.title} sx={{ position: 'absolute', right: { xs: 8, sm: 62 }, top: { xs: 'auto', sm: 18 }, bottom: { xs: 82, sm: 'auto' }, left: { xs: 8, sm: 'auto' }, width: { xs: 'auto', sm: config.width }, maxWidth: 'calc(100% - 78px)', maxHeight: 'calc(100% - 90px)', overflow: 'auto', zIndex: 20, bgcolor: '#fff', border: '1px solid #a9ced1', borderRadius: '14px', boxShadow: '0 8px 24px #163e481c' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', px: 1.25, py: 0.5, bgcolor: '#E4F0F1', gap: 0.5 }}>
      <Typography sx={{ flex: 1, fontWeight: 600, fontSize: 11, color: '#28636a' }}>{items.length > 1 ? copy.title : current.title}</Typography>
      <Button size="small" sx={{ minWidth: 24, p: 0.25 }} aria-label={scOnly ? minimized ? scCopy.preview_restore : scCopy.preview_minimize : minimized ? copy.restore : copy.minimize} onClick={() => onMinimize(!minimized)}>{minimized ? '↗' : '−'}</Button>
      <Button size="small" sx={{ minWidth: 24, p: 0.25 }} aria-label={scOnly ? scCopy.preview_close : copy.close} onClick={onClose}>×</Button>
    </Box>
    {!minimized && <>
      {items.length > 1 && <Tabs aria-label={copy.switch} value={current.id} onChange={(_, id) => setSelection({ id, request: requestedId })} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 30, '& .MuiTab-root': { minHeight: 30, py: 0.5, px: 1, fontSize: 11, minWidth: 0, textTransform: 'none' } }}>{items.map(item => <Tab key={item.id} value={item.id} label={item.label} />)}</Tabs>}
      <Box sx={{ height: (current.height || config.height) + 24, position: 'relative', bgcolor: '#fafcfc' }}>
        <Box sx={{ height: current.height || config.height }}>{current.content}</Box>
        <Button aria-label={scOnly ? scCopy.preview_open_accessible : current.openLabel} onClick={() => onOpen(current.id)} sx={{ position: 'absolute', inset: 0, width: '100%', borderRadius: 0, '&:hover': { bgcolor: '#3a838b08' } }}>
          <Box component="span" sx={{ position: 'absolute', bottom: 0, width: '100%', height: 24, lineHeight: '24px', borderTop: '1px solid #e4eff0', bgcolor: '#f6fafb', color: '#28636a', fontSize: 11, fontWeight: 600, textTransform: 'none' }}>{current.openLabel}</Box>
        </Button>
      </Box>
    </>}
  </Box>;
}
