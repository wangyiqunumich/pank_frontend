import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';
import defaultErrorImage from '../image/datanotfound.png';
import notRelevant from '../image/not_relevant.png';

const SUPPORT_EMAILS = 'wyq@umich.edu, runbomao@umich.edu, drjieliu@umich.edu, fan.feng@vumc.org, help@pankbase.org';

export default function EmptyErrorState({
  errorTitle = 'Data not found',
  errorMessage = 'No answer for your question in PanKgraph',
  agent = true,
  log,
  errorImageSrc,
  homePath = '/',
}) {
  const image = errorImageSrc || (agent ? notRelevant : defaultErrorImage);
  const emailBody = log
    ? `?subject=PanKgraph Support Request&body=${encodeURIComponent(`Hello,\n\nI need assistance with PanKgraph.\n\nHere are the details:\n${log}`)}`
    : '';

  return (
    <Container disableGutters maxWidth={false} className="pk-error-page" sx={{
      padding: 0, display: 'flex', justifyContent: 'space-evenly', alignSelf: 'stretch', width: '100%', minWidth: 0,
      maxWidth: '100%', marginLeft: 0, marginRight: 0, flexDirection: 'column', flexGrow: 1, marginBottom: '-21px',
    }}>
      <Box className="pk-error-page__stage" sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: { xs: '420px', sm: '700px' },
        height: '82.3%', gap: 2, backgroundColor: '#F2FAFB',
      }}>
        <Box className="pk-state-panel" role="status" aria-labelledby="pk-state-title" aria-describedby="pk-state-description" sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '610px', maxWidth: 'calc(100% - 32px)',
          boxSizing: 'border-box', paddingX: { xs: '24px', sm: '75px' }, paddingY: { xs: '24px', sm: '75px' }, borderRadius: '32px', justifyContent: 'center', backgroundColor: 'white',
        }}>
          <Box component="img" src={image} alt="" aria-hidden="true" sx={{ width: '200px' }} />
          <Typography component="h1" id="pk-state-title" className="pk-state-title" sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: '36px', color: '#43AABA', marginBottom: '-12px', textAlign: 'center' }}>
            {errorTitle}
          </Typography>
          <Typography component="p" id="pk-state-description" className="pk-state-description" sx={{ fontFamily: 'Open Sans', fontWeight: 400, fontSize: '17px', color: '#6C6C6C' }}>
            {errorMessage}
          </Typography>
          <Box className="pk-state-panel__actions" sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button variant="contained" onClick={() => { window.location.href = homePath; }}>Back to Home</Button>
            <Button variant="outlined" onClick={() => { window.location.href = '/docs/tutorial'; }}>View Tutorial</Button>
          </Box>
        </Box>
      </Box>
      <Box component="section" className="pk-error-page__support" aria-labelledby="pk-error-support-title" sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '150px', height: '17.7%', paddingY: '50px',
        justifyContent: 'space-between', backgroundColor: '#D4E9EA',
      }}>
        <Typography component="h2" id="pk-error-support-title" sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: '20px', color: 'black' }}>Need Assistance?</Typography>
        <Typography component="p" sx={{ fontFamily: 'Open Sans', fontWeight: 400, fontSize: '20px', color: '#6C6C6C' }}>Our support team is here to assist you with any questions or technical issues.</Typography>
        <Button
          variant="outlined"
          startIcon={<MailIcon />}
          href={`mailto:${SUPPORT_EMAILS}${emailBody}`}
          sx={{ backgroundColor: 'white', border: '1px solid #219197', height: '50px', borderRadius: '25px', minWidth: '184px', paddingX: '37px', color: '#219197', '&:hover': { backgroundColor: '#CAD4DA' } }}
        >
          Email Support
        </Button>
      </Box>
    </Container>
  );
}
