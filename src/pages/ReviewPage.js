import './github-markdown-light.css';
import './ApiPage.css';

import React, { useEffect } from 'react';

import {
  useDispatch,
  useSelector,
} from 'react-redux';
import { useNavigate } from 'react-router-dom';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StarIcon from '@mui/icons-material/Star';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

import KnowledgeGraph from '../components/KnowledgeGraph';
import { queryQueryResultPage } from '../redux/queryResultPage';
import { TooltipComponent } from '../SearchResult/index.js';

export function CodeCopyBtn({ children }) {
  const [copyOk, setCopyOk] = React.useState(false);

  const iconColor = copyOk ? '#0af20a' : '#ddd';
  const icon = copyOk ? 'fa-check-square' : 'fa-copy';

  const handleClick = (e) => {
    navigator.clipboard.writeText(children.props.children);

    setCopyOk(true);
    setTimeout(() => {
      setCopyOk(false);
    }, 1000);
  }

  return (
    <div className="code-copy-btn" style={{ width: '20px', height: '20px', zIndex: 1 }}>
      <i className={`fas ${icon}`} onClick={handleClick} style={{ color: iconColor, width: '20px', height: '20px', zIndex: 1 }}>
        <ContentCopyIcon />
      </i>
    </div>
  )
}

function ReviewPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryResultPage = useSelector((state) => state.queryResultPage.queryResultPage);

  useEffect(() => {
    // read parameter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const rdb_query = urlParams.get('rdb_query');
    const core_cypher = urlParams.get('core_cypher');
    const neighbor_cypher = urlParams.get('neighbor_cypher');
    if (core_cypher && neighbor_cypher) {
      dispatch(queryQueryResultPage(rdb_query ? { rdb_query, core_cypher, neighbor_cypher } : { core_cypher, neighbor_cypher }))
    } else {
      navigate('/');
    }
  }, []);

  return (
    <div className="App">
      <Box sx={{
        p: 3, bgcolor: "#F1FAFB", marginTop: "-40px", paddingTop: "60px"
      }}>
        <Box sx={{
          maxWidth: "1400px", margin: "0 auto"
        }}>

          {/* Main Grid */}
          <Grid container spacing={6}>
            {/* Left: Graph Viewer */}
            <Grid item xs={12} md={8}>
              <Paper sx={{
                p: 2,
                borderRadius: "20px",
                boxShadow: "none",
                height: 'calc(100% - 32px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {queryResultPage?.combined_query_result ? <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '32px',
                  width: "calc(100% - 40px)",
                  maxWidth: 'calc(100% - 40px)',
                  backgroundColor: '#F9FAFB',
                  border: 1,
                  borderColor: '#EEEEEE',
                  padding: '20px',
                  position: 'relative',
                  borderRadius: '20px'
                }}>
                  <Typography sx={{
                    fontFamily: 'Open Sans',
                    fontWeight: 700,
                    fontSize: "28px",
                    marginTop: '-2px',
                    verticalAlign: 'middle'
                  }}>
                    Graph Viewer<TooltipComponent title="Graph Viewer" />
                  </Typography>
                  <Box sx={{
                    position: 'relative',
                    minHeight: '450px',
                    overflow: 'visible',
                    backgroundColor: '#F9FAFB',
                    border: "none",
                    borderColor: '#EEEEEE',
                    textAlign: 'left',
                    maxWidth: '100%',
                  }}>
                    <KnowledgeGraph />
                  </Box>
                </Box> : <CircularProgress />}
              </Paper>
            </Grid>

            {/* Right: Feedback Form */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderRadius: "20px", boxShadow: "none", height: 'calc(100% - 32px)' }}>
                <Paper sx={{
                  margin: '16px', boxShadow: 'none'
                }} >
                  <Typography sx={{
                    fontFamily: 'Open Sans',
                    fontWeight: 700,
                    fontSize: "28px"
                  }}>
                    Feedback Form
                  </Typography>
                  <Typography sx={{
                    fontFamily: 'Open Sans',
                    fontWeight: 600,
                    fontSize: "17px",
                    color: "#219197"
                  }} mt={2}>
                    Add your comments
                  </Typography>
                  <TextField
                    placeholder="Share your feedback……"
                    fullWidth
                    multiline
                    rows={5}
                    inputProps={{ style: { fontFamily: 'Open Sans', fontWeight: 400, fontSize: "17px" } }}
                    sx={{ mt: 1 }}
                  />
                  <Typography sx={{
                    fontFamily: 'Open Sans',
                    fontWeight: 600,
                    fontSize: "17px",
                    color: "#219197"
                  }} mt={4}>
                    Name
                  </Typography>
                  <TextField placeholder="Enter your name" fullWidth sx={{ mt: 1 }}
                    inputProps={{ style: { fontFamily: 'Open Sans', fontWeight: 400, fontSize: "17px" } }} />
                  <Typography sx={{
                    fontFamily: 'Open Sans',
                    fontWeight: 600,
                    fontSize: "17px",
                    color: "#219197"
                  }} mt={4}>
                    Email Address
                  </Typography>
                  <TextField
                    placeholder="Enter your email"
                    fullWidth
                    sx={{ mt: 1 }}
                    inputProps={{ style: { fontFamily: 'Open Sans', fontWeight: 400, fontSize: "17px" } }}
                  />
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{
                      mt: 3, borderRadius: 2, bgcolor: "#2f7d84",
                      "&:hover": { bgcolor: "#219197" }
                    }}
                  >
                    SUBMIT
                  </Button>
                </Paper>
              </Paper>
            </Grid>
          </Grid>

          {/* Featured Feedback Section */}
          <Paper sx={{ p: 2, borderRadius: "20px", boxShadow: "none", mt: 5 }}>
            <Paper sx={{
              margin: '16px', boxShadow: 'none'
            }} >
              <Typography
                align="center"
                sx={{ mb: 3, fontFamily: 'Open Sans', fontSize: 28, fontWeight: 700 }}
              >
                <StarIcon sx={{ color: "#FFC008", verticalAlign: "middle", mr: 1, mt: '-5px' }} />
                Featured Feedback from Our Community
              </Typography>
              <Grid container spacing={2} justifyContent="center">
                {[
                  {
                    text: "As a data contributor, I'm impressed by how PanKbase integrates our CFTR expression datasets. The platform makes our research more accessible to the global pancreatic research community.",
                    name: "DR. chen, Data Owner",
                    time: "2 days ago",
                  },
                  {
                    text: "Our lab's CFTR mutation data is now being utilized by researchers worldwide through PanKbase. The data sharing process was seamless and the visualization tools are exceptional.",
                    name: "DR. Elena, Research Director",
                    time: "1 week ago",
                  },
                  {
                    text: "Contributing our CFTR functional assay data to PanKbase has accelerated collaborative research. The platform's data integration capabilities exceed our expectations.",
                    name: "DR. Rodriguez",
                    time: "2 weeks ago",
                  },
                ].map((item, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Card sx={{
                      borderRadius: 2,
                      p: 1,
                      borderLeft: "5px solid #219196",
                      backgroundColor: "#F1FAFB",
                      boxShadow: "none",
                      height: 'calc(100% - 16px)'
                    }}>
                      <CardContent>
                        <Typography sx={{ fontFamily: 'Open Sans', fontSize: 16, fontWeight: 400 }}>
                          “ {item.text} ”
                        </Typography>
                        <Box sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center', mt: 1, justifyContent: 'space-between' }}>
                          <Typography sx={{ mt: 2, fontFamily: 'Open Sans', fontSize: 16, fontWeight: 600, color: "#888888" }}
                          >
                            {item.name}
                          </Typography>
                          <Typography sx={{ mt: 2, fontFamily: 'Open Sans', fontSize: 16, fontWeight: 600, color: "#888888" }}
                          >
                            {item.time}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Paper>
        </Box>
      </Box>
    </div >
  );
}

export default ReviewPage;
