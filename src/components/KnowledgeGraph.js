"use client";

import './styles.css';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import cytoscape from 'cytoscape';
import JSON5 from 'json5';
import {
  useDispatch,
  useSelector,
} from 'react-redux';
import { useLocation } from 'react-router-dom';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
  Box,
  Collapse,
  LinearProgress,
  Link,
  Typography,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';

import downloadIcon from '../image/download.svg';
import fullscreenIcon from '../image/fullscreen.svg';
import InfoEnableIcon from '../image/hover.svg';
import InfoDisableIcon from '../image/hover_disabled1.svg';
import fullscreenExitIcon from '../image/quit_fullscreen.svg';
import recenterIcon from '../image/recenter.svg';
import zoomInIcon from '../image/zoom-minus.svg';
import zoomOutIcon from '../image/zoom-plus.svg';
import {
  setHoverId,
  setHoverState,
} from '../redux/hoverSlice.js';
import graphInfocard from '../schema/graph_viewer_schema.json';
import graphInfocardReview from '../schema/review_page/graph_schema.json';
import { addWhitespace } from '../utils/textProcessing';
import {
  edgeIsInverted,
  edgeLabels,
  getContrastingColor,
  legendSchema,
  nodeColors,
  nodeStyle,
} from './style.js';

const DisableInfocardDisappear = false;

const LegendItem = ({ label, color, sx }) => (
  <span
    style={{
      padding: "4px 8px",
      borderRadius: "6px",
      backgroundColor: color || "white",
      fontSize: "12px",
      color: getContrastingColor(color) || "black",
      ...sx,
    }}
  >
    {label}
  </span>
);

const InfocardData = ({ value, config, dataKey }) => {
  // config can be either just a type or the form "type(setting)""
  const setting = config?.match(/\(([^)]+)\)/)?.[1];
  const type = setting ? config.split('(')[0] : config;
  return !type ? (<>{value || "No Data"}</>) :
    type === "string" ? (
      <>{dataKey || "No Data"}</>
    ) :
      type === "list" ? ( //string, remove all [] and ''
        <>{value.replace(/[\[\]']+/g, '') || "None"}</>
      ) :
        type === "int" ? (
          <>{value !== undefined ? parseInt(value).toLocaleString() : "No Data"}</>
        ) :
          type === "float" ? (
            <>{value !== undefined ? parseFloat(value).toFixed(setting || 1) : "No Data"}</>
          ) : ["link", "link_static"].includes(type) ? (
            <Link href={(type === "link" ? value : dataKey) || undefined} target="_blank" rel="noopener noreferrer" sx={{
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
                cursor: "pointer",
              },
            }}>
              {(type === "link" ? value : dataKey) ? "Open Link ↗" : "Not Available"}
            </Link>
          ) : ["label_chr", "label_percentage"].includes(type) ? (
            <div style={{
              backgroundColor: setting || "#0FB47D",
              height: "14px",
              padding: "1.5px 4px",
              marginY: "-4px",
              borderRadius: "8.5px",
              textDecoration: "none",
              color: "white",
              fontFamily: "Open Sans",
              fontWeight: "700",
              fontSize: "12px"
            }}>
              {value ? (type === "label_chr" ? `Chr${value}` : `${parseFloat(value).toFixed(1)}%`) : "No Data"}
            </div>
          ) : (
            <span>{value}</span>
          );
}

const HirnEvidences = ({ evidence }) => {
  const [open, setOpen] = useState(false);
  const length = evidence.length;

  if (length === 0) { return <></>; }

  const EvidenceBox = ({ index, score, pmid, content }) => {
    // top left: index, score with color
    // top right: pmid
    // bottom: content
    const colorMap = {
      red: {
        backgroundColor: "#FFF7ED",
        color: "#EA580B",
      },
      orange: {
        backgroundColor: "#FEFCE8",
        color: "#CA8A03",
      },
      green: {
        backgroundColor: "#EFFDF4",
        color: "#17A34A",
      }
    };
    const scoreColor = score >= 0.9 ? colorMap.green : score >= 0.7 ? colorMap.orange : colorMap.red;
    return <Box sx={{
      width: "calc(100% - 32px)",
      display: "flex",
      flexDirection: "column",
      padding: "16px",
      gap: "12px",
      border: "1px solid #E5E7EB",
      backgroundColor: "#F9FAFB",
      borderRadius: "8px",
      marginTop: "12px",
    }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Typography sx={{
            fontFamily: "Open Sans",
            fontWeight: "600",
            fontSize: "12px",
            color: "#6B7880",
            lineHeight: "14px",
            marginTop: "-5px",
          }}>
            Evidence {index}
          </Typography>
          <Box sx={{
            backgroundColor: scoreColor.backgroundColor,
            borderRadius: "8.5px",
            padding: "4px 10px",
            textDecoration: "none",
            color: scoreColor.color,
            fontFamily: "Open Sans",
            fontWeight: "700",
            fontSize: "12px",
            height: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "30px",
            marginTop: "-5px",
          }}>
            {score.toFixed(4)}
          </Box>
        </Box>
        <Link href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`} target="_blank" rel="noopener noreferrer" sx={{
          textDecoration: "none",
          fontFamily: "Open Sans",
          fontWeight: "600",
          fontSize: "12px",
          color: "#007bff",
          "&:hover": {
            textDecoration: "underline",
            cursor: "pointer",
          },
          marginTop: "-5px",
        }}>
          PMID: {pmid} ↗
        </Link>
      </Box>
      <Typography sx={{
        fontFamily: "Open Sans",
        fontWeight: "400",
        fontSize: "12px",
        color: "#263238",
        lineHeight: "16px",
        marginTop: "-2px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {content}
      </Typography>
    </Box>;
  }

  return <Box sx={{
    width: "calc(100% - 32px)",
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    borderBottom: "1px solid #F0F0F0",
  }}>
    {/* Part Subtitle */}
    <Typography sx={{
      alignSelf: "center",
      fontFamily: "Open Sans",
      fontWeight: "600",
      fontSize: "10px",
      color: "#6B7880",
      lineHeight: "7px",
      textTransform: "uppercase",
    }}>
      Hirn Evidence ({length} {length > 1 ? "items" : "item"})
      {length > 1 && <IconButton onClick={() => setOpen(!open)} sx={{ marginLeft: "8px", padding: "0px", marginBottom: "-2px" }} size="small">
        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
      </IconButton>}
    </Typography>
    <EvidenceBox index={1} score={evidence[0].score} pmid={evidence[0].pmid} content={evidence[0].text} />
    {length > 1 && <Collapse in={open} timeout="auto">
      {
        evidence.slice(1).map((item, idx) => (
          <EvidenceBox key={idx + 2} index={idx + 2} score={item.score} pmid={item.pmid} content={item.text} />
        ))
      }
    </Collapse>}
  </Box>;
}

const LongList = ({ title, list }) => {
  const [open, setOpen] = useState(false);
  const length = list.length;
  const content = list.map(item => {
    const key = Object.keys(item)[0];
    return { label: key, value: item[key] };
  })

  if (length === 0) { return <></>; }

  const regex = /\('internal_embed_link',\s*'([^']*)',\s*'([^']*)'\)/g;

  function renderProcessedContent(content) {
    const matches = [...content.matchAll(regex)];
    if (matches.length === 0) return content;
    let lastIndex = 0;

    return matches.flatMap((m, idx) => {
      const [full, link, text] = m;
      const start = m.index;
      const end = start + full.length;

      const before = content.slice(lastIndex, start);
      lastIndex = end;

      return [
        before.length > 0 ? <React.Fragment key={`t-${idx}`}>{before}</React.Fragment> : null,
        <a
          key={`a-${idx}`}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", color: "#007bff", fontWeight: "600" }}
        >
          {text}
        </a>,
      ];
    }).concat(
      lastIndex < content.length
        ? <React.Fragment key="tail">{content.slice(lastIndex)}</React.Fragment>
        : []
    );
  }

  const EvidenceBox = ({ title, content }) => {
    // top left: index, score with color
    // top right: pmid
    // bottom: content
    return <Box sx={{
      width: "calc(100% - 32px)",
      display: "flex",
      flexDirection: "column",
      padding: "16px",
      gap: "12px",
      border: "1px solid #E5E7EB",
      backgroundColor: "#F9FAFB",
      borderRadius: "8px",
      marginTop: "12px",
    }}>
      <Box sx={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Typography sx={{
            fontFamily: "Open Sans",
            fontWeight: "600",
            fontSize: "12px",
            color: "#6B7880",
            lineHeight: "14px",
            marginTop: "-5px",
          }}>
            {title}
          </Typography>
        </Box>
      </Box>
      <Typography sx={{
        fontFamily: "Open Sans",
        fontWeight: "400",
        fontSize: "12px",
        color: "#263238",
        lineHeight: "16px",
        marginTop: "-2px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {renderProcessedContent(content)}
      </Typography>
    </Box>;
  }

  return <Box sx={{
    width: "calc(100% - 32px)",
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    borderBottom: "1px solid #F0F0F0",
  }}>
    {/* Part Subtitle */}
    <Typography sx={{
      alignSelf: "center",
      fontFamily: "Open Sans",
      fontWeight: "600",
      fontSize: "10px",
      color: "#6B7880",
      lineHeight: "7px",
      textTransform: "uppercase",
    }}>
      {title}
      {length > 1 && <IconButton onClick={() => setOpen(!open)} sx={{ marginLeft: "8px", padding: "0px", marginBottom: "-2px" }} size="small">
        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
      </IconButton>}
    </Typography>
    <EvidenceBox title={content[0].label} content={content[0].value} />
    {length > 1 && <Collapse in={open} timeout="auto">
      {
        content.slice(1).map((item, idx) => (
          <EvidenceBox key={idx + 2} title={item.label} content={item.value} />
        ))
      }
    </Collapse>}
  </Box>;
}


const FreqList = ({ title, string, config }) => {
  const [open, setOpen] = useState(false);
  // const content =
  //   string.split('|').map(item => {
  //     const [label, value] = item.split(':');
  //     let values = value ? value.split(',').map(v => parseFloat(v.trim())).filter(Boolean) : [];
  //     if (values.length !== 2) {
  //       console.log("Invalid freq data:", item);
  //       values = [];
  //     }
  //     return { label: label.trim(), value: values };
  //   });
  const labels = string.split('|').map(item => item.split(':')[0].trim());
  const rows = string.split('|').map(item => {
    const value = item.split(':')[1];
    return value ? value.split(',').map(v => parseFloat(v.trim())) : [];
  });

  const columns = Array.from({ length: rows[0]?.length || 0 }, (_, colIndex) =>
    rows.map(row => row[colIndex])
  );

  const columnIndices = columns.map((col, index) => col.every(Boolean) ? index : undefined).slice(1).filter(index => index !== undefined);
  if (columnIndices.length === 0) { return <></>; }
  if (columnIndices.length > 1) {
    console.warn("Multiple valid reference columns found in FreqList:", string);
  }
  const refColIndex = columnIndices[0];
  const content = labels.map((label, index) => ({
    label,
    value: [rows[index][0], rows[index][refColIndex]],
  }));
  const alleleLabels = [config[0], config[1].split(',')[refColIndex - 1] || ""];


  const length = content.length;

  if (length === 0 || config.length !== 2) { return <></>; }

  const EvidenceBox = ({ content }) => {
    // top left: index, score with color
    // top right: pmid
    // bottom: content
    return <Box sx={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      py: "12px",
    }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Typography sx={{
            fontFamily: "Open Sans",
            fontWeight: "600",
            fontSize: "12px",
            color: "#6B7880",
            lineHeight: "14px",
            marginTop: "-5px",
          }}>
            {content.label}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Typography sx={{
            fontFamily: "Open Sans",
            fontWeight: "600",
            fontSize: "9px",
            color: "#0FB47D",
            lineHeight: "14px",
            marginTop: "-5px",
          }}>
            {`${alleleLabels[0]} ${content.value[0] ? (content.value[0] * 100).toFixed(2) : "Nan"}%`}
          </Typography>
          <Typography sx={{
            fontFamily: "Open Sans",
            fontWeight: "600",
            fontSize: "9px",
            color: "#94A3B8",
            lineHeight: "14px",
            marginTop: "-5px",
          }}>
            {`${alleleLabels[1]} ${content.value[1] ? (content.value[1] * 100).toFixed(2) : "Nan"}%`}
          </Typography>
        </Box>
      </Box>
      <LinearProgress variant="determinate" sx={{
        width: '100%',
        height: '6px',
        backgroundColor: '#F0F0F0',
        borderRadius: '3px',
        ".MuiLinearProgress-bar": {
          borderRadius: '3px',
          background: 'linear-gradient(180deg, #0FB47D 0%, #049D6F 100%)'
        }
      }} value={content.value[0] ? content.value[0] * 100 : 0} />
    </Box>;
  }

  return <Box sx={{
    width: "calc(100% - 32px)",
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    borderBottom: "1px solid #F0F0F0",
  }}>
    {/* Part Subtitle */}
    <Typography sx={{
      alignSelf: "center",
      fontFamily: "Open Sans",
      fontWeight: "600",
      fontSize: "10px",
      color: "#6B7880",
      lineHeight: "7px",
      textTransform: "uppercase",
    }}>
      {title}

    </Typography>
    {
      content.slice(0, 3).map((item, idx) => (
        <EvidenceBox key={idx} content={item} />
      ))
    }
    {length > 3 && <Collapse in={open} timeout="auto">
      {
        content.slice(3).map((item, idx) => (
          <EvidenceBox key={idx + 3} content={item} />
        ))
      }
    </Collapse>}
    <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
      {length > 3 && <IconButton onClick={() => setOpen(!open)} sx={{ marginLeft: "8px", padding: "0px", marginBottom: "-2px", color: "#0FB47D" }} size="small">
        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
      </IconButton>}
    </Box>
  </Box>;
}


const parseJSON = (str) => {
  try {
    return JSON5.parse(str);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return [];
  }
};

const InfocardMenu = ({ hoveredData, review }) => {
  const isEdge = hoveredData?.source && hoveredData?.target;
  const schema =
    review ? isEdge ? graphInfocardReview?.edges["relationship"].info_panel : graphInfocardReview?.nodes["All nodes"].info_panel :
      (isEdge ? graphInfocard?.edges : graphInfocard?.nodes)?.[hoveredData?.type]?.info_panel;
  const titleColumn = schema?.find(([label, _]) => label === "Title");
  const footerInfo = schema?.find(([label, _]) => label === "Footer")?.[1];
  return (
    hoveredData && (schema?.length > 0
      ? (
        <>
          {/* Title Bar */}
          <Box sx={{
            display: "flex",
            paddingY: "17px",
            textAlign: "center",
            backgroundColor: "#E4F0F1",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Typography sx={{
              fontFamily: "Open Sans",
              fontWeight: "700",
              fontSize: "20px",
              lineHeight: "20px",
            }}>
              <InfocardData value={hoveredData[titleColumn?.[1]]?.replace(/_/g, " ")} dataKey={titleColumn?.[1]} config={titleColumn?.[2]} />
            </Typography>
          </Box>
          {
            schema.map(([title, content, config]) => {
              const setting = config?.match(/\(([^)]+)\)/)?.[1];
              const type = setting ? config.split('(')[0] : config;
              return (
                ["Title", "Footer"].includes(title) ? "" :
                  type === "HIRN_evidence" ?
                    <HirnEvidences key={title} evidence={parseJSON(hoveredData[content]) || []} />
                    : type === "long_list" ?
                      <LongList key={title} title={title} list={parseJSON(hoveredData[content]) || []} />
                      : type === "freq_list" ?
                        <FreqList key={title} title={title} string={hoveredData[content] || ""} config={setting.split(",").map(item => hoveredData[item])} />
                        : (
                          <Box key={title} sx={{
                            width: "calc(100% - 32px)",
                            display: "flex",
                            flexDirection: "column",
                            padding: "16px",
                            borderBottom: "1px solid #F0F0F0",
                            gap: "16px",
                          }}>
                            {/* Part Subtitle */}
                            <Typography sx={{
                              alignSelf: "center",
                              fontFamily: "Open Sans",
                              fontWeight: "600",
                              fontSize: "10px",
                              color: "#6B7880",
                              lineHeight: "7px",
                              textTransform: "uppercase",
                            }}>
                              {title}
                            </Typography>
                            <Box key={title} sx={{
                              width: "calc(100%)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}>
                              {
                                Array.isArray(content) ? (
                                  content.map(([label, key, config]) => ( // Data Row
                                    <Box key={key} sx={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                      <Typography sx={{
                                        fontFamily: "Open Sans",
                                        fontWeight: "600",
                                        fontSize: "12px",
                                        color: "#6B7880",
                                        lineHeight: "14px",
                                        marginTop: "-5px",
                                      }}>
                                        {label}
                                      </Typography>
                                      <Typography
                                        component="span"
                                        sx={{
                                          textAlign: "right",
                                          fontFamily: "Open Sans",
                                          fontWeight: "600",
                                          fontSize: "12px",
                                          color: "#263238",
                                          marginLeft: "8px",
                                          lineHeight: "14px",
                                          marginTop: "-5px",
                                        }}
                                      >
                                        <InfocardData value={hoveredData[key]} dataKey={key} config={config} />
                                      </Typography>
                                    </Box>
                                  )))
                                  : ( // Text Content
                                    <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                                      <Typography
                                        sx={{
                                          marginTop: "-5px",
                                          fontFamily: "Open Sans",
                                          fontWeight: "600",
                                          fontSize: "10px",
                                          lineHeight: "15px",
                                          wordWrap: "break-word",
                                          color: "#263238",
                                          textAlign: "left",
                                        }}
                                      >
                                        {(() => {
                                          const processedData = config !== "string" ? addWhitespace(hoveredData[content]) : hoveredData[content];
                                          const processedKey = config === "string" ? addWhitespace(content) : content;
                                          return <InfocardData value={processedData} dataKey={processedKey} config={config} />
                                        })()}
                                      </Typography>
                                    </Box>
                                  )
                              }
                            </Box>
                          </Box>
                        )
              )
            })
          }
          {/* Footer */}
          {footerInfo && <Box sx={{
            display: "flex",
            height: "30px",
            textAlign: "center",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(360deg, #CACFD5 -73.08%, #F4F6F8 75%)",
          }}>
            <Typography sx={{ fontWeight: "600", fontSize: "9px", color: "#5F7885" }}>
              {footerInfo?.map(
                ([label, key, config], index) =>
                  index === 0
                    ? <span key={index}>
                      {`${label}: `}
                      <InfocardData value={hoveredData[key]} dataKey={key} config={config} />
                    </span>
                    : <span key={index}>
                      {` | ${label}: `}
                      <InfocardData value={hoveredData[key]} dataKey={key} config={config} />
                    </span>
              )}
            </Typography>
          </Box>}
        </>
      )
      : (<div style={{
        padding: "16px",
        fontFamily: "Open Sans",
        fontWeight: "600",
        alignContent: "center",
      }}>
        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
          {hoveredData?.HGNC_symbol || hoveredData?.id}
        </div>
        {Object.entries(hoveredData || {})?.map(
          ([key, value]) =>
            key !== "type" &&
            (key === "link" || key === "url" ? (
              <div key={key}>
                <span style={{ fontWeight: 500 }}>{key}:</span>{" "}
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#007bff" }}
                >
                  Open Link ↗
                </a>
              </div>
            ) : (
              <div key={key}>
                <span style={{ fontWeight: 500 }}>{key}:</span> {value}
              </div>
            ))
        )}
      </div>))
  );
}

// Main KnowledgeGraph component
export default function KnowledgeGraph({ selectable = false, setSelectedNode = () => { }, sx = {}, graphData = null, coordData = null, review = false, containerHeight = "600px" }) {
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const infocardRef = useRef(null);
  const activeNodeRef = useRef(null);
  const [activeNode, setActiveNode] = useState(null);
  const location = useLocation();

  // hover functions
  const [hoveredId, setHoveredId] = useState(null);
  const [hoverExpand, setHoverExpand] = useState(false);
  // hover id ref
  const hoveredIdRef = useRef(hoveredId);
  const dispatch = useDispatch();
  useEffect(() => {
    hoveredIdRef.current = hoveredId;
  }, [hoveredId]);
  const [infocardPosition, setInfocardPosition] = useState({ x: 0, y: 0 });
  const [infocardVisible, setInfocardVisible] = useState(false);
  const [infocardHovered, setInfocardHovered] = useState(false);
  const [nodeHovered, setNodeHovered] = useState(false);

  const queryResultPage = useSelector((state) => state.queryResultPage.queryResultPage);

  // toggle buttons & graph state
  const [legendVisible, setLegendVisible] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1.5);
  const [initZoom, setInitZoom] = useState(1.5); // default zoom scale
  const [infocardEnabled, setInfocardEnabled] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const [selectedID, setSelectedID] = useState([]);
  // const [inputValue, setInputValue] = useState("")
  const inputRef = useRef("");

  const center =
    cyRef.current
      ? {
        x: (cyRef.current.width() / 2),
        y: (cyRef.current.height() / 2),
      }
      : { x: 0, y: 0 };

  const focusElementByKey = (key) => {
    const cy = cyRef.current;
    if (!cy || !key) return;

    let ele = cy.getElementById(key);
    if (!ele || ele.empty()) {
      ele = cy.elements().filter(e => e.data('label') === key);
      if (!ele || ele.empty()) {
        console.log("No node/edge with element:", key);
        return;
      }
    }

    cy.elements().unselect();
    cy.elements().removeClass('highlight');

    ele.select();
    ele.addClass('highlight');

    cy.animate(
      {
        center: { eles: ele },
        zoom: Math.max(cy.zoom(), 3.0),
      },
      { duration: 400 }
    );
  };



  const SearchBox = () => {
    return (
      <input
        defaultValue=""
        onInput={(e) => {
          inputRef.current = e.target.value;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            focusElementByKey(inputRef.current.trim());
          }
        }}
      />
    );
  };

  const handleZoomIn = () =>
    cyRef.current && cyRef.current.zoom({ level: cyRef.current.zoom() / 1.2, renderedPosition: center });
  const handleZoomOut = () =>
    cyRef.current && cyRef.current.zoom({ level: cyRef.current.zoom() * 1.2, renderedPosition: center });

  const handleRecenter = () => {
    if (cyRef.current) {
      cyRef.current.zoom(initZoom);
      cyRef.current.center();
    }
  };

  const handleDownload = () => {
    if (cyRef.current) {
      const png = cyRef.current.png({
        full: true,
        scale: 6,
      });
      const link = document.createElement("a");
      link.href = png;
      link.download = "knowledge_graph.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };



  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const { width: containerWidth, top: containerTop, left: containerLeft } = container.getBoundingClientRect();

    const ele = activeNode;
    if (!ele || !cyRef.current || !infocardEnabled) {
      return;
    }
    const { x: modelX, y: modelY } =
      ele.isNode() ? ele.position() : ele.midpoint();
    const nodeWidth = ele.isNode() ? ele.outerWidth() * cyRef.current.zoom() : 20;
    const nodeHeight = ele.isNode() ? ele.outerHeight() * cyRef.current.zoom() : 20;
    const x = modelX * cyRef.current.zoom() + cyRef.current.pan().x;
    const y = modelY * cyRef.current.zoom() + cyRef.current.pan().y;

    const infocard = infocardRef.current;
    if (!infocard) {
      console.log(x);
      console.log(y);
      return;
    }
    infocard.style.display = "block";
    // infocard.style.opacity = "1";
    const { width: infocardWidth, height: infocardHeight } = infocard.getBoundingClientRect();

    let top = y - infocardHeight - nodeHeight / 2 - 2;
    let left = x + nodeWidth / 2 + 2;

    if (left + infocardWidth > containerWidth && containerLeft + x - infocardWidth - nodeWidth / 2 > 10) {
      left = x - infocardWidth - nodeWidth / 2 - 2;
    }

    if (top + containerTop < 90) {
      top = y + nodeHeight / 2 + 2;
    }

    setInfocardPosition({ x: left, y: top });
  }, [hoveredId, nodeHovered, infocardEnabled, activeNode]);

  const toggleExpand = () => {
    const url = new URL(
      window.location.origin + location.pathname + location.search + location.hash
    );
    if (expanded) {
      url.searchParams.delete("fullscreen");
    } else {
      url.searchParams.set("fullscreen", "true");
    }
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
  }

  // useEffect(() => {
  //   // set overflow: clip for the html if expanded
  //   if (expanded) {
  //     document.documentElement.style.overflow = "clip";
  //   } else {
  //     document.documentElement.style.overflow = "auto";
  //   }
  //   const url = new URL(
  //     window.location.origin + location.pathname + location.search + location.hash
  //   );
  //   const isFullscreen = url.searchParams.get("fullscreen") === "true";
  //   if (isFullscreen !== expanded) {
  //     if (expanded) {
  //       url.searchParams.set("fullscreen", "true");
  //     } else {
  //       url.searchParams.delete("fullscreen");
  //     }
  //     window.history.pushState({}, '', url);
  //   }
  //   const timeoutId = setTimeout(() => {
  //     if (cyRef.current) {
  //       handleRecenter();
  //     }
  //   }, 200);
  //   return () => clearTimeout(timeoutId);
  // }, [expanded, location]);

  // listen to url change for fullscreen parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isFullscreen = params.get("fullscreen") === "true";
    if (isFullscreen !== expanded) setExpanded(isFullscreen);
    if (!expanded) {
      document.documentElement.style.overflow = "auto";
    } else {
      document.documentElement.style.overflow = "clip";
    }
    const timeoutId = setTimeout(() => {
      if (cyRef.current) {
        handleRecenter();
      }
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [location, expanded]);

  const appearTimeoutRef = useRef(null);
  const appearNodeIdRef = useRef(null);
  const fadeOutTimeoutRef = useRef(null);
  useEffect(() => {
    if (!infocardHovered && !nodeHovered) {
      // console.log("Preparing to hide infocard");
      clearTimeout(appearTimeoutRef.current);
      fadeOutTimeoutRef.current = setTimeout(() => {
        // console.log("Hiding infocard");
        setInfocardVisible(false);
      }, 600);
    } else if (infocardEnabled && nodeHovered) {
      // console.log("Preparing to show infocard");
      clearTimeout(fadeOutTimeoutRef.current);
      if (hoveredId !== appearNodeIdRef.current || !infocardVisible) {
        // console.log("Showing infocard for node:", hoveredId);
        appearNodeIdRef.current = hoveredId;
        appearTimeoutRef.current = setTimeout(() => {
          // console.log("Infocard shown for node:", hoveredId);
          const node = cyRef.current?.getElementById(hoveredIdRef.current);
          setActiveNode(node?.nonempty ? node : null);
          setInfocardVisible(true);
        }, 600);
      }
    }
    return () => {
      clearTimeout(fadeOutTimeoutRef.current);
      clearTimeout(appearTimeoutRef.current);
    }
  }, [infocardHovered, nodeHovered, infocardEnabled, hoveredId]);


  useEffect(() => {
    const result = graphData || queryResultPage?.combined_query_result;
    const positionData = coordData || queryResultPage?.xy_json || {};

    if (!result?.nodes || !result?.edges) {
      return undefined;
    }

    const uniqueNodesMap = {};
    result.nodes?.forEach((node) => (uniqueNodesMap[node["~id"]] = node));
    const properties = review ? "properties" : "~properties";
    const nodes = Object.values(uniqueNodesMap).map((node) => {
      // Determine type based on the labels
      const type = review ? "cell_type" : node["~labels"].find((label) => nodeColors[label]) || "coding_elements";
      // Use the provided positionData and extract the Level property.
      const posData = positionData[node["~id"]] || {
        x: Math.random() * 250 - 125,
        y: Math.random() * 200 - 125,
        Level: "Core",
      };
      const pos = { x: posData.x, y: posData.y };
      return {
        data: {
          id: node["~id"],
          ...node[properties],
          label: (
            review ? node[properties]["name"] :
              node["~labels"].includes("disease")
                ? "T1D"
                : (node["~labels"].includes("gene") ||
                  node["~labels"].includes("OCR") ||
                  node["~id"].startsWith("CL_")
                )
                  ? (node[properties].name || node[properties].id)
                  : node[properties].id
          ).replace(/_/g, " "),
          type,
          Level: posData.Level,
        },
        position: pos,
      };
    });

    const nodeNameMap =
      nodes.reduce((acc, node) => {
        acc[node.data.id] = node.data.label;
        return acc;
      }, {});

    const uniqueEdgesMap = {};
    result.edges.forEach((edge, index) => (uniqueEdgesMap[edge["~id"] || index.toString()] = edge));
    const edges = Object.values(uniqueEdgesMap).map((edge) => ({
      data: {
        id: edge["~id"],
        source: edgeIsInverted[edge["~type"]] ? edge["~end"] : edge["~start"],
        source_name: nodeNameMap[edge["~start"]],
        target: edgeIsInverted[edge["~type"]] ? edge["~start"] : edge["~end"],
        target_name: nodeNameMap[edge["~end"]],
        type: edge["~type"],
        label: edgeLabels[edge["~type"]] || edge["~type"].replace(/_/g, " "),
        ...edge[properties],
      },
    }));

    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    cyRef.current = cytoscape({
      container,
      elements: { nodes, edges },
      style: nodeStyle.concat([
        ...(selectable ? [{
          selector: "node:selected",
          style: {
            "border-width": 1,
            "border-color": "#EB5325",
          },
        }, {
          selector: "edge:selected",
          style: {
            "line-color": "#EB5325",
          }
        }] : []),
        {
          selector: '.highlight',
          style: {
            'border-width': 6,
            'border-color': '#3B82F6',
            'overlay-color': '#3B82F6',
            'overlay-opacity': 0.15,
            'overlay-padding': 10,
            'z-index': 9999
          }
        }
      ]),
      layout: { name: "preset" },
      zoom: 1.5,
      minZoom: 0.6,
      maxZoom: 4,
      selectionType: selectable ? "additive" : "none",
      pan: { x: 0, y: 0 },
    });

    const handleHover = (evt) => {
      document.body.style.cursor = "pointer";
      setNodeHovered(true);
      setHoveredId(evt.target.id());
      dispatch(setHoverState(true));
      dispatch(setHoverId(evt.target.id()));
      // console.log("Hovered ID set to:", evt.target.id());
    };

    const handleOut = (evt) => {
      // Only proceed with hiding if we're leaving the active node
      if (evt.target.id() === hoveredIdRef.current) {
        document.body.style.cursor = "default";
        dispatch(setHoverState(false));
        setNodeHovered(false);
      }
    };

    const handleLeave = (_) => {
      document.body.style.cursor = "default";
      dispatch(setHoverState(false));
      setNodeHovered(false);
    };

    const handleEdge = (handler) => ((evt) => {
      // compare mouse position with edge midpoint
      const ele = cyRef.current.$(evt.target);
      const midpoint = ele.midpoint();
      const mouseRendered = cyRef.current.renderer().projectIntoViewport(evt.originalEvent.clientX, evt.originalEvent.clientY);
      const dist = Math.sqrt(
        Math.pow(midpoint.x - mouseRendered[0], 2) +
        Math.pow(midpoint.y - mouseRendered[1], 2)
      );
      // Only trigger the handler if the distance is less than 20 pixels
      if (dist < 20) {
        handler(evt);
      }
    })

    const cy = cyRef.current;
    cy.reset();
    cy.center();
    setZoomLevel(cy.zoom());
    setInitZoom(cy.zoom());

    cy.container().addEventListener("mouseleave", handleLeave);
    cy.on("mousemove", "node", handleHover);
    cy.on("mouseout", "node", handleOut);
    cy.on("mousemove", "edge", handleEdge(handleHover));
    cy.on("mouseout", "edge", handleOut);
    cy.on("zoom", () => {
      setZoomLevel(cyRef.current.zoom());
    });
    if (selectable) {
      cy.on("select", "node, edge", (evt) => {
        const selectedId = evt.target.id();
        setSelectedID((prev) => [...prev, selectedId]);
      });
      cy.on("unselect", "node, edge", (evt) => {
        const unselectedId = evt.target.id();
        setSelectedID((prev) => prev.filter((id) => id !== unselectedId));
      });
    }

    return () => {
      document.body.style.cursor = "default";
      cyRef.current?.removeAllListeners();
      cyRef.current?.container()?.removeEventListener("mouseleave", handleLeave);
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [queryResultPage]);

  useEffect(() => {
    // update setSelectedNode() to include all nodes and edges in selectedID, plus all edges connecting 2 selected nodes
    if (selectable && cyRef.current) {
      const cy = cyRef.current;
      const additionalEdges = cy.edges().filter((edge) => {
        const sourceSelected = selectedID.includes(edge.source().id());
        const targetSelected = selectedID.includes(edge.target().id());
        return sourceSelected && targetSelected && !selectedID.includes(edge.id());
      }).map((edge) => edge.id());
      const allSelected = [...selectedID, ...additionalEdges];
      // remove duplicates
      const filteredSelected = allSelected.filter((item, index) => allSelected.indexOf(item) === index);
      setSelectedNode(filteredSelected);
    }
  }, [selectedID]);

  return (
    <div style={
      !expanded ?
        { display: "flex", flexDirection: "column", position: "relative", justifyContent: "flex-start", width: "100%", height: "100%", ...sx }
        // position whole page, on top
        : { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "white", display: "flex", flexDirection: "column", gap: "16px", padding: "0px", ...sx, zIndex: 9999 }
    }>
      {expanded && <SearchBox />}
      <div
        ref={containerRef}
        style={{
          ...{
            width: "100%",
            height: containerHeight,
            backgroundColor: "transparent",
            border: "none",
            borderRadius: "8px",
            position: "relative",
            flex: 1,
            minHeight: 0,
          }, ...(expanded ? { height: "100%", borderRadius: "0px" } : {})
        }}
      >
      </div>
      <Box sx={{
        position: "absolute",
        top: "10px",
        right: "10px",
        padding: "7px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "white",
        borderRadius: "8px",
        boxShadow: "0px 4px 15px -3px rgba(100,100,100,0.25)",
      }}>
        <IconButton
          onClick={() => { toggleExpand(); }}
          style={{ padding: "8px", background: "none", borderRadius: "4px" }}
        >
          <img src={expanded ? fullscreenExitIcon : fullscreenIcon}
            alt="Enter/Exit Fullscreen" width={20} height={20} />
        </IconButton>
        {/* button for zooming */}
        <IconButton
          onClick={handleZoomOut}
          style={{ padding: "5px", background: "none", borderRadius: "4px", opacity: zoomLevel >= 4 ? 0.5 : 1 }}
          disabled={zoomLevel >= 4}
        >
          <img src={zoomOutIcon} alt="Zoom Out" width={26} height={26} />
        </IconButton>
        <IconButton
          onClick={handleZoomIn}
          style={{ padding: "5px", background: "none", borderRadius: "4px", opacity: zoomLevel <= 0.6 ? 0.5 : 1 }}
          disabled={zoomLevel <= 0.6}
        >
          <img src={zoomInIcon} alt="Zoom In" width={26} height={26} />
        </IconButton>
        <IconButton
          onClick={handleRecenter}
          style={{ padding: "7px", background: "none", borderRadius: "4px" }}
        >
          <img src={recenterIcon} alt="Recenter" width={22} height={22} />
        </IconButton>
        {
          infocardEnabled ?
            (
              <IconButton
                onClick={() => setInfocardEnabled(false)}
                style={{ padding: "7px", background: "none", borderRadius: "4px" }}
              >
                <img src={InfoEnableIcon}
                  alt="Disable Info Card" width={22} height={22} />
              </IconButton>
            ) : (<IconButton
              onClick={() => setInfocardEnabled(true)}
              style={{ padding: "7px", background: "none", borderRadius: "4px" }}
            >
              <img src={InfoDisableIcon}
                alt="Enable Info Card" width={22} height={22} />
            </IconButton>)
        }
        <IconButton
          onClick={handleDownload}
          style={{ padding: "6px", background: "none", borderRadius: "4px" }}
        >
          <img src={downloadIcon} alt="Download" width={24} height={24} />
        </IconButton>
      </Box>
      <Box sx={{
        position: "absolute",
        bottom: "35px",
        right: "10px",
        height: "40px",
        width: "60px",
        display: "flex",
        background: "white",
        borderRadius: "6px",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0px 4px 15px -3px rgba(100,100,100,0.25)",
      }}>
        <Typography sx={{ fontSize: "16px", color: "#333" }}>
          {Math.round(zoomLevel / initZoom * 100)}%
        </Typography>
      </Box>
      <div
        ref={infocardRef}
        onMouseEnter={() => {
          setInfocardHovered(true);
        }}
        onMouseLeave={() => {
          setInfocardHovered(false);
        }}
        style={{
          fontFamily: "Open Sans",
          fontWeight: 400,
          position: "absolute",
          left: infocardPosition.x,
          top: infocardPosition.y,
          background: "#fff",
          borderRadius: "8px",
          overflow: "hidden",
          color: "#333",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1000,
          width: review ? "550px" : "280px",
          pointerEvents: infocardVisible ? "auto" : "none",
          opacity: infocardVisible ? 1 : 0,
          display: "block",
          transform: "translateY(0px)",
          transition: "opacity 0.15s, display 0.15s, left 0.15s, top 0.15s",
          transitionBehavior: "allow-discrete",
          willChange: "transform, opacity",
          wordWrap: "break-word",
        }}
      >
        <InfocardMenu hoveredData={activeNode?.data()} review={review} />
      </div>
      <div style={{ display: review ? "none" : "flex", flexDirection: "row", gap: "200px" }}>
        {/* Legend */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            left: "20px",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0px 4px 15px -3px rgba(100,100,100,0.25)",
            zIndex: 10,
            userSelect: "none",
            height: "fit-content",
            width: legendVisible ? "380px" : "100px",
            transition: "width 0.3s, height 0.3s, opacity 0.3s, box-shadow 0.3s",
          }}
        >
          {/* Title */}
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#172A3A", fontFamily: "Open Sans" }}>
              Legend
            </div>
            <IconButton
              onClick={() => setLegendVisible(!legendVisible)}
              style={{ padding: "20px", margin: "-20px" }}
            >
              {legendVisible ? (
                <KeyboardArrowLeftIcon style={{ color: "#172A3A", fontSize: "20px" }} />
              ) : (
                <KeyboardArrowRightIcon style={{ color: "#172A3A", fontSize: "20px" }} />
              )}
            </IconButton>
          </div>
          <Collapse in={legendVisible} timeout="auto">
            <div style={{ width: "430px", paddingTop: "10px", fontSize: "16px", fontFamily: "Open Sans", fontWeight: 400 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "4px", fontSize: "12px" }}>
                <LegendItem label="　　　　" sx={{ backgroundColor: "#E9E9E9", color: "black", border: "1.5px solid #E9E9E9", height: "8px" }} />
                Core Nodes
                <LegendItem label="　　　　" sx={{ backgroundColor: "white", color: "black", border: "1.5px solid #E9E9E9", height: "8px", marginLeft: "16px" }} />
                Neighbor
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                  paddingTop: "8px",
                }}
              >
                {legendSchema.map(({ label, color }) => (
                  <LegendItem
                    key={label}
                    label={label}
                    color={color}
                  />
                ))}
              </div>
            </div>
          </Collapse>
        </div>
      </div>
    </div >
  );
}
