import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';
import defaultErrorImage from '../image/datanotfound.png';
import notRelevant from '../image/not_relevant.png';

export function ErrorComponent({ errorTitle = "Data not found", errorMessage = "No answer for your question in PanKgraph", agent = true, log = undefined, errorImageSrc = undefined, homePath = '/' }) {
  return (
    <Container sx={{
      padding: 0, display: 'flex',
      justifyContent: 'space-evenly',
      alignSelf: 'stretch',
      width: '100%',
      minWidth: 0,
      maxWidth: '100%',
      marginLeft: 0,
      marginRight: 0,
      flexDirection: 'column',
      flexGrow: 1,
      marginBottom: '-21px',
    }} disableGutters maxWidth={false}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '700px',
        height: '82.3%',
        gap: 2,
        backgroundColor: '#F2FAFB'
      }}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '36px',
          width: '460px',
          paddingX: '75px',
          paddingY: '75px',
          borderRadius: '32px',
          justifyContent: 'center',
          backgroundColor: 'white',
        }}>
          <Box component="img" src={errorImageSrc || (agent ? notRelevant : defaultErrorImage)} alt="Error" sx={{ width: "200px", marginTop: "-20px", marginBottom: '-20px' }} />
          <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: '36px', color: '#43AABA', marginBottom: '-12px', whiteSpace: 'nowrap' }}>
            {errorTitle}
          </Typography>
          <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 400, fontSize: '17px', color: '#6C6C6C' }}>
            {errorMessage}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '24px' }}>
            <Button
              variant="contained"
              onClick={() => window.location.href = homePath}
              sx={{
                backgroundColor: "#219197",
                border: "1px solid #219197",
                height: "50px",
                borderRadius: "25px",
                minWidth: "184px",
                paddingX: "37px",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#1A747A",
                  boxShadow: "none",
                },
              }}
            >
              <Typography sx={{
                color: "white",
                fontFamily: 'Open Sans',
                fontSize: "17px",
                fontWeight: "600",
                textTransform: "none",
              }}>
                Back to Home
              </Typography>
            </Button>
            <Button
              onClick={() => window.location.href = '/docs/tutorial'}
              sx={{
                backgroundColor: "white",
                border: "1px solid #219197",
                height: "50px",
                borderRadius: "25px",
                minWidth: "184px",
                paddingX: "37px",
                "&:hover": {
                  backgroundColor: "#CAD4DA",
                },
              }}
            >
              <Typography sx={{
                color: "#219197",
                fontFamily: 'Open Sans',
                fontSize: "17px",
                fontWeight: "600",
                textTransform: "none",
              }}>
                View Tutorial
              </Typography>
            </Button>
          </Box>
        </Box>
      </Box>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '150px',
        height: '17.7%',
        paddingY: '50px',
        justifyContent: 'space-between',
        backgroundColor: '#D4E9EA'
      }}>
        <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 600, fontSize: '20px', color: 'black' }}>
          Need Assistance?
        </Typography>
        <Typography sx={{ fontFamily: 'Open Sans', fontWeight: 400, fontSize: '20px', color: '#6C6C6C' }}>
          Our support team is here to assist you with any questions or technical issues.
        </Typography>
        <Button
          onClick={() => window.open('mailto:wyq@umich.edu, runbomao@umich.edu, drjieliu@umich.edu, fan.feng@vumc.org, help@pankbase.org' + (log ? ('?subject=PanKgraph Support Request&body=' + encodeURIComponent('Hello,\n\nI need assistance with PanKgraph.\n\nHere are the details:\n' + log)) : ''), '_blank')}
          sx={{
            backgroundColor: "white",
            border: "1px solid #219197",
            height: "50px",
            borderRadius: "25px",
            minWidth: "184px",
            paddingX: "37px",
            "&:hover": {
              backgroundColor: "#CAD4DA",
            },
          }}
          startIcon={<MailIcon sx={{ color: "#219197", }} />}
        >
          <Typography sx={{
            color: "#219197",
            fontFamily: 'Open Sans',
            fontSize: "17px",
            fontWeight: "600",
            textTransform: "none",
          }}>
            Email Support
          </Typography>
        </Button>
      </Box>
    </Container>
  );
}
