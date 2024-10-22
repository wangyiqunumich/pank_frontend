import React, { useState, useRef } from 'react';
import { Modal, Box, Button } from '@mui/material';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  maxWidth: '90vw',
  maxHeight: '90vh',
  overflow: 'auto',
};

function ImageModal({ open, handleClose, imageSrc }) {
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef(null);

  const handleZoomIn = () => {
    setZoom(prevZoom => prevZoom * 1.2);
  };

  const handleZoomOut = () => {
    setZoom(prevZoom => prevZoom / 1.2);
  };

  const handleReset = () => {
    setZoom(1);
  };

  const handleSave = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = 'snp_p_values_plot.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <div style={{ position: 'relative' }}>
          <img 
            ref={imgRef}
            src={imageSrc} 
            alt="SNP p-values Plot" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '70vh',
              transform: `scale(${zoom})`,
              transition: 'transform 0.2s'
            }} 
          />
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: '10px' }}>
            <Button variant="contained" onClick={handleZoomIn}>Zoom In</Button>
            <Button variant="contained" onClick={handleZoomOut}>Zoom Out</Button>
            <Button variant="contained" onClick={handleReset}>Reset</Button>
            <Button variant="contained" onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Box>
    </Modal>
  );
}

export default ImageModal;
