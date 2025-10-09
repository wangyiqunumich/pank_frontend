import './github-markdown-light.css';
import './ApiPage.css';

import React, { useEffect } from 'react';

import yaml from 'js-yaml';
import {
  useDispatch,
  useSelector,
} from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { Warning } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StarIcon from '@mui/icons-material/Star';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

import KnowledgeGraph from '../components/KnowledgeGraph';
import graphdata from '../schema/review_page/graph_T1D_core.json';
import coorddata from '../schema/review_page/graph_T1D_core_xy.json';
import ReviewContent from '../schema/reviews.yaml';
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
  const [reviewContent, setReviewContent] = React.useState([]);
  const [warningState, setWarningState] = React.useState(0);
  const [warningPopup, setWarningPopup] = React.useState(false);
  const [selectedNode, setSelectedNode] = React.useState([]);
  const fixedCoord = // x, y times 10
    Object.fromEntries(Object.entries(coorddata).map(([key, value]) => [key, { ...value, x: value.x * 2, y: value.y * 2 }]));
  // const loaded = !!queryResultPage?.combined_query_result;
  const loaded = true;


  useEffect(() => {
    fetch(ReviewContent)
      .then((res) => res.text())
      .then((text) => {
        const data = yaml.load(text);
        setReviewContent(data);
      })
      .catch((err) => console.error("Failed to load YAML", err));
  }, []);

  useEffect(() => {
    // read parameter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const rdb_query = urlParams.get('rdb_query');
    const core_cypher = urlParams.get('core_cypher');
    const neighbor_cypher = urlParams.get('neighbor_cypher');
    // if (core_cypher && neighbor_cypher) {
    //   dispatch(queryQueryResultPage(rdb_query ? { rdb_query, core_cypher, neighbor_cypher } : { core_cypher, neighbor_cypher }))
    // } else {
    //   navigate('/');
    // }
  }, []);

  const handleSubmit = () => {
    if (!loaded) return;
    if (selectedNode.length === 0) {
      setWarningState(Math.min(warningState + 1, 2));
      if (warningState === 1) {
        setWarningPopup(true);
      }
      return;
    }
  }

  return (
    <div className="App">
      {/* page mask */}
      <div style={{
        display: warningState === 2 ? 'block' : 'none',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#A9ACB04D',
        zIndex: 1,
        borderRadius: '20px'
      }}></div>
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
                {loaded ? <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
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
                  <Typography sx={{
                    fontFamily: 'Open Sans',
                    fontWeight: 400,
                    fontSize: "14px",
                    marginTop: '-2px',
                    color: '#888888',
                    paddingBottom: '11px'
                  }}>
                    Click on any node to select it for your feedback
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
                    <Alert
                      variant="outlined"
                      severity="warning"
                      icon={<Warning fontSize="inherit" />}
                      sx={{
                        display: warningPopup ? 'flex' : 'none',
                        position: 'absolute',
                        left: '50%',
                        top: '10px',
                        fontSize: '15px',
                        fontFamily: 'Open Sans',
                        border: "1px solid rgb(102, 60, 0)",
                        alignItems: "center",
                        backgroundColor: "#FEF7E0",
                        zIndex: 3,
                        transform: 'translateX(-50%)',
                      }}
                      action={
                        <IconButton size="small" color="inherit" onClick={() => setWarningPopup(false)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      Please select elements related to your comment
                    </Alert>

                    <KnowledgeGraph selectable={true} setSelectedNode={(nodes) => {
                      setSelectedNode(nodes);
                      if (nodes.length > 0) {
                        setWarningState(0);
                        setWarningPopup(false);
                      }
                    }} sx={{ zIndex: 2 }}
                      review={true}
                      graphData={graphdata.results[0]} coordData={fixedCoord}
                    />
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
                    sx={{ mt: 1, mb: 1 }}
                    inputProps={{ style: { fontFamily: 'Open Sans', fontWeight: 400, fontSize: "17px" } }}
                  />
                  <Alert
                    variant="outlined"
                    severity="warning"
                    icon={<Warning fontSize="inherit" />}
                    sx={{
                      display: warningState === 1 ? 'flex' : 'none',
                      fontSize: '15px',
                      fontFamily: 'Open Sans',
                      border: "1px solid",
                      borderColor: "inherit",
                      alignItems: "center",
                      backgroundColor: "#FEF7E0",
                    }}
                    action={
                      <IconButton size="small" color="inherit" onClick={() => setWarningState(0)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    Please select elements related to your comment
                  </Alert>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{
                      mt: 3, borderRadius: 2, bgcolor: "#2f7d84",
                      "&:hover": { bgcolor: "#219197" },
                      ...(
                        !(loaded) || selectedNode.length === 0 ?
                          { bgcolor: "#F0F0F0", color: "#39828980", "&:hover": { bgcolor: "#F0F0F0" } } : {}
                      )
                    }}
                    onClick={handleSubmit}
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
                {reviewContent?.map((item, index) => (
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
