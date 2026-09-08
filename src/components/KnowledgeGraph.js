"use client";

import './styles.css';
import { recordedInfocardModel, recordedText } from '../vnext/recordedPresentation';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import cytoscape from 'cytoscape';
import { applyGraphRoutes, graphElements, observeGraphViewport } from '../vnext/graphBindings';
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
import { SEARCH_TARGETS } from './data/node_schema';
import {
  edgeIsInverted,
  edgeLabels,
  getContrastingColor,
  legendSchema,
  nodeStyle,
} from './style.js';

const DisableInfocardDisappear = false;

const SUPERSCRIPT_MAP = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
  '+': '⁺',
};

const toSuperscript = (value) => String(value || '')
  .split('')
  .map((char) => SUPERSCRIPT_MAP[char] || char)
  .join('');

const formatScientificNotation = (rawValue, significanceNumber = 3) => {
  const num = Number(rawValue);
  if (!Number.isFinite(num)) return null;
  if (num === 0) return '0';

  const digits = Number.isFinite(Number(significanceNumber))
    ? Math.max(1, parseInt(significanceNumber, 10))
    : 3;
  const [mantissa, exponent = '0'] = num.toExponential(digits - 1).split('e');
  const normalizedExponent = exponent.startsWith('+') ? exponent.slice(1) : exponent;

  return `${mantissa} × 10${toSuperscript(normalizedExponent)}`;
};

const LegendItem = ({ label, color, sx }) => (
  <span
    style={{
      padding: "2px 6px",
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

export const formatEvidenceValue = (value) => typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);

const InfocardData = ({ value, config, dataKey }) => {
  // config can be either just a type or the form "type(setting)""
  const setting = config?.match(/\(([^)]+)\)/)?.[1];
  const type = setting ? config.split('(')[0] : config;
  if (type === 'recorded') return <>{recordedText(value).match(/[\s\S]{1,24}/gu)?.map((part, index) => <React.Fragment key={index}>{part}<wbr /></React.Fragment>)}</>;
  if (type !== 'string' && type !== 'link_static' && (value === null || value === undefined || value === '')) return <>Not recorded</>;
  return type === 'raw' ? <>{formatEvidenceValue(value).match(/[\s\S]{1,16}/gu)?.map((part, index) =>
    <React.Fragment key={index}>{part}<wbr /></React.Fragment>)}</> :
    !type ? (<>{value === null || value === undefined || value === '' ? "No Data" :
      typeof value === 'object' || typeof value === 'boolean' ? formatEvidenceValue(value) : value}</>) :
    type === "string" ? (
      <>{dataKey || "No Data"}</>
    ) :
      type === "list" ? ( //string, remove all [] and ''
        <>{recordedText(value) || "None"}</>
      ) :
        type === "int" ? (
          <>{value !== undefined ? parseInt(value).toLocaleString() : "No Data"}</>
        ) :
          type === "float" ? (
            <>{value !== undefined ? parseFloat(value).toFixed(setting || 1) : "No Data"}</>
            ) :
              type === "scientific" ? (
                <>{
                  value !== undefined
                    ? (formatScientificNotation(value, setting) || value)
                    : "No Data"
                }</>
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
              {value !== undefined && value !== null && value !== '' ? (type === "label_chr" ? `Chr${value}` : `${parseFloat(value).toFixed(1)}%`) : "No Data"}
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
      width: "100%",
      boxSizing: "border-box",
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
    width: "100%",
    boxSizing: "border-box",
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
      width: "100%",
      boxSizing: "border-box",
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
    width: "100%",
    boxSizing: "border-box",
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
    width: "100%",
    boxSizing: "border-box",
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

const getSafeEdgeMidpoint = (ele) => {
  try {
    if (!ele || typeof ele.midpoint !== 'function') return null;
    const midpoint = ele.midpoint();
    if (!midpoint) return null;
    if (!Number.isFinite(midpoint.x) || !Number.isFinite(midpoint.y)) return null;
    return midpoint;
  } catch (error) {
    return null;
  }
};

const getSafeElementPosition = (ele) => {
  try {
    if (!ele || ele.nonempty === false) return null;
    if (typeof ele.removed === 'function' && ele.removed()) return null;

    if (typeof ele.isNode === 'function' && ele.isNode()) {
      if (typeof ele.position !== 'function') return null;
      const pos = ele.position();
      if (!pos) return null;
      if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
      return pos;
    }

    return getSafeEdgeMidpoint(ele);
  } catch (error) {
    return null;
  }
};

const EDGE_EVIDENCE_ALIASES = { log2FoldChange: 'log2_fold_change', median_donor_logCPM: 'median_donor_log_cpm', median_donor_CPM: 'median_donor_cpm' };
const EDGE_RENDERER_FIELDS = new Set(['id', 'source', 'target', 'source_name', 'target_name', 'type', 'raw_type', 'label', 'evidence_properties']);

export function edgeInfocardModel(data, baseSchema) {
  const rawProperties = data.evidence_properties && typeof data.evidence_properties === 'object' && !Array.isArray(data.evidence_properties)
    ? data.evidence_properties : Object.fromEntries(Object.entries(data).filter(([key]) => !EDGE_RENDERER_FIELDS.has(key)));
  const values = { ...rawProperties, ...data };
  Object.entries(EDGE_EVIDENCE_ALIASES).forEach(([legacy, canonical]) => {
    if (values[legacy] === undefined && Object.prototype.hasOwnProperty.call(rawProperties, canonical)) values[legacy] = rawProperties[canonical];
  });
  const schema = [...(baseSchema || [['Title', data.raw_type || data.type || 'Relationship evidence', 'string'],
    ['Relationship identity', [['From', 'source'], ['To', 'target']]]])];
  if (Object.keys(rawProperties).length) schema.push(['Graph evidence properties', Object.keys(rawProperties).sort().map((key) => [key, key, 'raw'])]);
  return { data: values, schema, rawProperties };
}

export const InfocardMenu = ({ hoveredData: incomingData, review }) => {
  const isEdge = incomingData?.element_kind ? incomingData.element_kind === 'edge' : incomingData?.source && incomingData?.target;
  const baseSchema =
    review ? isEdge ? graphInfocardReview?.edges["relationship"].info_panel : graphInfocardReview?.nodes["All nodes"].info_panel :
      (isEdge ? graphInfocard?.edges : graphInfocard?.nodes)?.[incomingData?.type]?.info_panel;
  const { data: hoveredData, schema, rawProperties } = !review && incomingData?.evidence_properties ? recordedInfocardModel(incomingData, isEdge) : isEdge && !review ? edgeInfocardModel(incomingData, baseSchema)
    : { data: incomingData, schema: baseSchema, rawProperties: {} };
  const titleColumn = schema?.find(([label, _]) => label === "Title");
  const footerInfo = schema?.find(([label, _]) => label === "Footer")?.[1];

  // GO 节点：按 name 长度决定标题展示 GO id 还是 GO term（name 即 ~properties.name，id 即 ~id）
  const rawId = hoveredData?.id;
  const goTerm = hoveredData?.name;
  const isGoNode = typeof rawId === "string" && rawId.startsWith("GO_");
  const titleDisplayValue = isGoNode
    ? (goTerm && goTerm.length > 15 ? rawId : (goTerm ?? rawId))
    : hoveredData?.[titleColumn?.[1]]?.replace(/_/g, " ");
  const titleDisplayConfig = isGoNode ? undefined : titleColumn?.[2];

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
              <InfocardData value={recordedText(hoveredData[titleColumn?.[1]])} dataKey={titleColumn?.[1]} config={titleDisplayConfig} />
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
                            width: "100%",
                            boxSizing: "border-box",
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
                                  content.map(([label, key, config, sourceKey]) => ( // Data Row
                                    <Box key={key} data-field={sourceKey || key} title={sourceKey ? `Recorded field: ${sourceKey}` : undefined} sx={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                      <Typography sx={{
                                        fontFamily: "Open Sans",
                                        fontWeight: "600",
                                        fontSize: "12px",
                                        color: "#6B7880",
                                        lineHeight: "14px",
                                        marginTop: "-5px",
                                      }}>
                                        {config === 'raw' ? <InfocardData value={label} config="raw" /> : label}
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
                                        <InfocardData value={config === 'raw' ? rawProperties[key] : hoveredData[key]} dataKey={key} config={config} />
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
                      <InfocardData value={hoveredData[key]} dataKey={key} config={isEdge && !review && !config && typeof hoveredData[key] === 'string' ? 'raw' : config} />
                    </span>
                    : <span key={index}>
                      {` | ${label}: `}
                      <InfocardData value={hoveredData[key]} dataKey={key} config={isEdge && !review && !config && typeof hoveredData[key] === 'string' ? 'raw' : config} />
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
export default function KnowledgeGraph({ onEvidenceInspect, selectable = false, setSelectedNode = () => { }, sx = {}, graphData = null, coordData = null, edgeRoutes = null, review = false, containerHeight = "600px", defaultLegendVisible = false }) {
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
  // Answer/resource polling replaces response objects without changing the graph.
  // Rebuild only when graph content changes, preserving the user's pan and zoom.
  const graphInputKey = JSON.stringify([graphData || queryResultPage?.combined_query_result,
    coordData || queryResultPage?.xy_json || {}, edgeRoutes || queryResultPage?.edge_routes || {}]);
  const viewportRef = useRef(null);

  // toggle buttons & graph state
  const [legendVisible, setLegendVisible] = useState(defaultLegendVisible);
  const [zoomLevel, setZoomLevel] = useState(1.5);
  const [initZoom, setInitZoom] = useState(1.5); // default zoom scale
  const [minimumZoom, setMinimumZoom] = useState(0.6);
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
    const trimmed = typeof key === 'string' ? key.trim() : '';
    if (!cy || !trimmed) return;

    const searchLower = trimmed.toLowerCase();
    const searchTargetSet = new Set(SEARCH_TARGETS);

    const valueMatches = (val) => {
      if (val == null) return false;
      if (typeof val === 'string') return val.toLowerCase().includes(searchLower);
      if (typeof val === 'number') return String(val).includes(trimmed);
      if (Array.isArray(val)) return val.some((v) => valueMatches(v));
      if (typeof val === 'object') return false;
      return String(val).toLowerCase().includes(searchLower);
    };

    const nodeMatches = (node) => {
      if (!node.isNode()) return false;
      const data = node.data();
      if (valueMatches(data.id)) return true;
      if (valueMatches(data.label)) return true;
      for (const [k, v] of Object.entries(data)) {
        if (k === 'id' || k === 'label') continue;
        if (searchTargetSet.has(k) && valueMatches(v)) return true;
      }
      return false;
    };

    const matchingNodes = cy.nodes().filter(nodeMatches);
    if (!matchingNodes.length) {
      console.log("No node matching:", trimmed);
      return;
    }

    cy.elements().unselect();
    cy.elements().removeClass('highlight');

    matchingNodes.addClass('highlight');
    if (selectable) matchingNodes.select();

    cy.animate(
      {
        center: { eles: matchingNodes },
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
    viewportRef.current?.fit();
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
    const modelPos = getSafeElementPosition(ele);
    if (!modelPos) {
      setInfocardVisible(false);
      return;
    }
    const { x: modelX, y: modelY } = modelPos;
    const nodeWidth = (typeof ele.isNode === 'function' && ele.isNode()) ? ele.outerWidth() * cyRef.current.zoom() : 20;
    const nodeHeight = (typeof ele.isNode === 'function' && ele.isNode()) ? ele.outerHeight() * cyRef.current.zoom() : 20;
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

    // Full edge measurements can be taller than the pane. Keep the existing
    // popup inside the window so its scrollable content remains reachable.
    left = Math.max(12 - containerLeft, Math.min(left, window.innerWidth - containerLeft - infocardWidth - 12));
    top = Math.max(12 - containerTop, Math.min(top, window.innerHeight - containerTop - infocardHeight - 12));
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
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const params = new URLSearchParams(location.search);
    const isFullscreen = params.get("fullscreen") === "true";
    if (isFullscreen !== expanded) setExpanded(isFullscreen);
    if (!expanded) {
      document.documentElement.style.overflow = "auto";
    } else {
      document.documentElement.style.overflow = "clip";
    }
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow || "auto";
    };
  }, [location, expanded]);

  useEffect(() => {
    if (infocardVisible && activeNode?.isEdge?.()) onEvidenceInspect?.(activeNode.id());
  }, [infocardVisible, activeNode, onEvidenceInspect]);

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
    const [result, positionData, routeData] = JSON.parse(graphInputKey);

    if (!result?.nodes || !result?.edges) {
      return undefined;
    }

    const { nodes, edges, edgeStyles } = graphElements(result, positionData, routeData,
      { review, graphInfocard, edgeIsInverted, edgeLabels, spreadCompact: true });

    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    if (cyRef.current) {
      viewportRef.current?.dispose();
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
          selector: 'node.highlight',
          style: {
            'overlay-color': '#0EA5E9',
            'overlay-opacity': 0.35,
            'overlay-padding': 4,
            'z-index': 9999,
            'transition-property': 'overlay-opacity overlay-padding',
            'transition-duration': '0.35s',
            'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)'
          }
        },
        {
          selector: 'edge.highlight',
          style: {
            'width': 5,
            'line-color': '#0EA5E9',
            'target-arrow-color': '#0EA5E9',
            'opacity': 1,
            'z-index': 9999,
            'transition-property': 'width line-color target-arrow-color',
            'transition-duration': '0.35s',
            'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)'
          }
        }
      ]),
      layout: { name: "preset", fit: false },
      zoom: 1.5,
      minZoom: 0.6,
      maxZoom: 4,
      selectionType: selectable ? "additive" : "none",
      pan: { x: 0, y: 0 },
    });
    applyGraphRoutes(cyRef.current, edgeStyles);

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
      const ele = evt?.target;
      if (!ele || ele.nonempty === false || (typeof ele.removed === 'function' && ele.removed())) return;
      // Cytoscape already hit-tests the edge/visible label. A midpoint-distance
      // gate excludes long or offset labels, especially after zooming.
      handler(evt);
    })

    const cy = cyRef.current;

    cy.container().addEventListener("mouseleave", handleLeave);
    cy.on("mousemove", "node", handleHover);
    cy.on("mouseout", "node", handleOut);
    cy.on("mousemove", "edge", handleEdge(handleHover));
    cy.on("mouseout", "edge", handleOut);
    cy.on("zoom", () => {
      setZoomLevel(cy.zoom());
    });
    const viewport = observeGraphViewport(cy, container, ({ zoom, minZoom }) => {
      setZoomLevel(zoom);
      setInitZoom(zoom);
      setMinimumZoom(minZoom);
    });
    viewportRef.current = viewport;
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
      viewport.dispose();
      if (viewportRef.current === viewport) viewportRef.current = null;
      document.body.style.cursor = "default";
      cy.removeAllListeners();
      cy.container()?.removeEventListener("mouseleave", handleLeave);
      cy.destroy();
      if (cyRef.current === cy) cyRef.current = null;
    };
  }, [graphInputKey, review, selectable]);

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
        top: "8px",
        right: "8px",
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
          style={{ padding: "5px", background: "none", borderRadius: "4px", opacity: zoomLevel <= minimumZoom ? 0.5 : 1 }}
          disabled={zoomLevel <= minimumZoom}
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
        bottom: "8px",
        right: "8px",
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
          overflowY: "auto",
          maxHeight: "calc(100vh - 24px)",
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
            bottom: "8px",
            left: "8px",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            padding: "12px",
            borderRadius: "8px",
            boxShadow: "0px 4px 15px -3px rgba(100,100,100,0.25)",
            zIndex: 10,
            userSelect: "none",
            height: "fit-content",
            width: legendVisible ? "380px" : "110px",
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
              style={{
                padding: "4px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
              }}
            >
              {legendVisible ? (
                <KeyboardArrowLeftIcon style={{ color: "#172A3A", fontSize: "20px" }} />
              ) : (
                <KeyboardArrowRightIcon style={{ color: "#172A3A", fontSize: "20px" }} />
              )}
            </IconButton>
          </div>
          <Collapse in={legendVisible} timeout="auto">
            <div style={{ width: "350px", paddingTop: "6px", fontSize: "14px", fontFamily: "Open Sans", fontWeight: 400 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "2px", fontSize: "12px" }}>
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
                  paddingTop: "4px",
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
