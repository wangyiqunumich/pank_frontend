import './github-markdown-light.css';
import './ApiPage.css';

import React, {
  useEffect,
  useState,
} from 'react';

import {
  useDispatch,
  useSelector,
} from 'react-redux';
import { useNavigate } from 'react-router-dom';

import Warning from '@mui/icons-material/Warning';
import CheckCircle from '@mui/icons-material/CheckCircle';
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
import { submitFeedback } from '../redux/feedbackSlice';
// import graphdata from '../schema/review_page/graph_T1D_core.json';
// import coorddata from '../schema/review_page/graph_T1D_core_xy.json';
import ReviewContent from '../schema/reviews.json';
import { TooltipComponent } from '../SearchResult/index.js';

export function CodeCopyBtn({ children }) {
  const [copyOk, setCopyOk] = useState(false);

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
  // read URL: /review/article-1
  const queryResultPage = useSelector((state) => state.queryResultPage.queryResultPage);
  // const [reviewContent, setReviewContent] = useState([]);
  const [warningState, setWarningState] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [warningPopup, setWarningPopup] = useState(false);
  const [selectedNode, setSelectedNode] = useState([]);
  const [graphData, setGraphData] = useState(null);
  const [coordData, setCoordData] = useState(null);
  useEffect(() => {
    const path = window.location.pathname;
    const article_id = path.split('/').slice(-1)[0];
    // load ../schema/review_page/[article_id]/graph.json and ../schema/review_page/[article_id]/graph_xy.json
    const coordFactor = article_id === 'article-3' ? 4 : 2;
    import(`../schema/review_page/${article_id}/graph.json`).then((data) => {
      setGraphData(data.results[0]);
    }).catch((error) => {
      window.location.href = '/review/T1D_heterogeneity';
    });
    import(`../schema/review_page/${article_id}/graph_xy.json`).then((data) => {
      setCoordData(
        Object.fromEntries(Object.entries(data).map(([key, value]) => [key, { ...value, x: value.x * coordFactor, y: value.y * coordFactor }]))
      );
    }).catch((error) => {
      window.location.href = '/review/T1D_heterogeneity';
    });
  }, []);

  // const loaded = !!queryResultPage?.combined_query_result;
  const loaded = true;
  // const article = ReviewContent.find((item) => item.id === article_id);
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [missingField, setMissingField] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // useEffect(() => {
  //   fetch(ReviewContent)
  //     .then((res) => res.text())
  //     .then((text) => {
  //       const data = yaml.load(text);
  //       console.log(data);
  //       setReviewContent(data);
  //     })
  //     .catch((err) => console.error("Failed to load YAML", err));
  // }, []);

  const handleSubmit = () => {
    if (!loaded || submitting) return;
    if (!content) {
      setMissingField("content");
      return;
    }
    if (!name) {
      setMissingField("name");
      return;
    }
    if (!email) {
      setMissingField("email");
      return;
    }
    setMissingField(false);
    if (selectedNode.length === 0) {
      setWarningState(Math.min(warningState + 1, 2));
      if (warningState === 1) {
        setWarningPopup(true);
      }
      return;
    }
    const submission = {
      content,
      name,
      email,
      selected: selectedNode,
      graphTitle: window.location.pathname.split('/').slice(-1)[0],
    };
    console.log('Submitting feedback:', submission);
    setSubmitting(true);
    dispatch(submitFeedback(submission)).then(() => {
      setSubmitting(false);
      setCompleted(true);
      setContent('');
      setName('');
      setEmail('');
    });
  };

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

                    {graphData && <KnowledgeGraph selectable={true} setSelectedNode={(nodes) => {
                      setSelectedNode(nodes);
                      if (nodes.length > 0) {
                        setWarningState(0);
                        setWarningPopup(false);
                      }
                    }} sx={{ zIndex: 2 }}
                      review={true}
                      graphData={graphData} coordData={coordData}
                    />}
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
                    error={missingField === "content"}
                    helperText={missingField === "content" ? "This field is required" : ""}
                    fullWidth
                    multiline
                    rows={5}
                    inputProps={{ style: { fontFamily: 'Open Sans', fontWeight: 400, fontSize: "17px" } }}
                    sx={{ mt: 1 }}
                    onChange={(e) => setContent(e.target.value)}
                    value={content}
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
                    error={missingField === "name"}
                    helperText={missingField === "name" ? "This field is required" : ""}
                    inputProps={{ style: { fontFamily: 'Open Sans', fontWeight: 400, fontSize: "17px" } }}
                    onChange={(e) => setName(e.target.value)}
                    value={name}
                  />
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
                    error={missingField === "email"}
                    helperText={missingField === "email" ? "This field is required" : ""}
                    fullWidth
                    sx={{ mt: 1, mb: 1 }}
                    inputProps={{ style: { fontFamily: 'Open Sans', fontWeight: 400, fontSize: "17px" } }}
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
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
                  <Alert
                    variant="outlined"
                    severity="success"
                    icon={<CheckCircle fontSize="inherit" />}
                    sx={{
                      display: completed ? 'flex' : 'none',
                      fontSize: '15px',
                      fontFamily: 'Open Sans',
                      border: "1px solid",
                      borderColor: "inherit",
                      alignItems: "center",
                      backgroundColor: "white",
                    }}
                    action={
                      <IconButton size="small" color="inherit" onClick={() => setCompleted(false)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    Thank you for your feedback!
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
                {ReviewContent?.map((item, index) => (
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
