import React, { useState } from 'react';
import { Box, Button, Tabs, Tab, Typography } from '@mui/material';
import schema from './schema/result_page_schema.json';
import cellIcon from '../image/graph-toolbar/preview-cell.svg';
import openIcon from '../image/graph-toolbar/preview-open.svg';
const config = schema.main_visuals.preview_standard;
const copy = config.wording;
const scCopy = schema.main_visuals.items.single_cell_browser.wording;
// Every eligible non-graph renderer receives preview=true. Keep only one preview
// visible, and leave the persistent main panels (including graph camera) mounted.
export default function VisualPreview({ items = [], requestedId, minimized, closed, onMinimize, onClose, onRestore, onOpen }) {
  const [selection, setSelection] = useState(null);
  const requested = requestedId?.id;
  const selected = selection && selection.request === requestedId ? selection.id : requested;
  const current = items.find(item => item.id === selected) || items[0];
  if (!current || config.enabled === false) return null;
  const scOnly = items.length === 1 && current.id === 'single_cell_browser';
  const isCell = current.id === 'single_cell_browser';
  const previewHeight = isCell ? schema.main_visuals.items.single_cell_browser.preview.height : current.height || config.height;
  if (closed) return <Button onClick={onRestore} sx={{ position: 'absolute', top: 74, left: 16, zIndex: 20, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 2, color: '#115e59', fontSize: 12, textTransform: 'none' }}>{copy.show}</Button>;
  return <Box component="section" aria-label={scOnly ? scCopy.preview_region : copy.title} sx={{ position: 'absolute', top: 74, left: 16, width: isCell ? 240 : config.width, maxWidth: 'calc(100% - 88px)', maxHeight: 'calc(100% - 90px)', overflow: 'auto', boxSizing: 'border-box', zIndex: 20, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 20px 25px -5px #0000001a, 0 8px 10px -6px #0000001a' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, height: 29, boxSizing: 'border-box', bgcolor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', gap: '6px' }}>
      {isCell && <img src={cellIcon} alt="" />}
      <Typography sx={{ flex: 1, fontFamily: 'Inter, Open Sans, sans-serif', fontWeight: 700, fontSize: 12, lineHeight: '16px', color: '#1e293b' }}>{items.length > 1 ? copy.title : current.title}</Typography>
      {!scOnly && <Button size="small" sx={{ minWidth: 20, p: 0 }} aria-label={minimized ? copy.restore : copy.minimize} onClick={() => onMinimize(!minimized)}>{minimized ? '↗' : '−'}</Button>}
      <Button size="small" sx={{ minWidth: 20, width: 20, height: 24, p: 0, color: '#94a3b8', fontSize: 12, fontWeight: 700 }} aria-label={scOnly ? scCopy.preview_close : copy.close} onClick={onClose}>×</Button>
    </Box>
    {!minimized && <>
      {items.length > 1 && <Tabs aria-label={copy.switch} value={current.id} onChange={(_, id) => setSelection({ id, request: requestedId })} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 30, '& .MuiTab-root': { minHeight: 30, py: 0.5, px: 1, fontSize: 11, minWidth: 0, textTransform: 'none' } }}>{items.map(item => <Tab key={item.id} value={item.id} label={item.label} />)}</Tabs>}
      <Box sx={{ height: previewHeight + 29, position: 'relative', bgcolor: '#fff' }}>
        <Box sx={{ height: previewHeight }}>{current.content}</Box>
        <Button aria-label={scOnly ? scCopy.preview_open_accessible : current.openLabel} onClick={() => onOpen(current.id)} sx={{ position: 'absolute', inset: 0, width: '100%', borderRadius: 0, '&:hover': { bgcolor: '#3a838b08' } }}>
          <Box component="span" sx={{ position: 'absolute', bottom: 0, width: '100%', height: 29, boxSizing: 'border-box', display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc', fontFamily: 'Inter, Open Sans, sans-serif', color: '#115e59', fontSize: 12, lineHeight: '16px', fontWeight: 600, textTransform: 'none' }}>{isCell ? <>Open scBrowser <span style={{ width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><img src={openIcon} alt="" /></span></> : current.openLabel}</Box>
        </Button>
      </Box>
    </>}
  </Box>;
}
