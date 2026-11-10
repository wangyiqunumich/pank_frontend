"use client";

import '../components/styles.css';
import { compactCardModel } from './cardPresentationLayout';
import cardLayout from '../schema/card_layout_schema.json';
import { recordedInfocardModel, recordedText } from '../vnext/recordedPresentation';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import cytoscape from 'cytoscape';
import { applyGraphRoutes, graphElements, updateGraphElements, observeGraphViewport } from '../vnext/graphBindings';
import JSON5 from 'json5';
import {
  useDispatch,
  useSelector,
} from 'react-redux';
import PersistentGraphViewport from '../components/PersistentGraphViewport';
import GraphToolbar from './GraphToolbar';
import GraphInfoPanel, { GraphInfoPanelBody, GraphInfoPanelHeader, useGraphInfoPanel } from './GraphInfoPanel';
import GraphLegend from './GraphLegend';
import ObjectInformationPanel, {exactGraphRef} from './evidence/ObjectInformationPanel';

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
  Box,
  Collapse,
  LinearProgress,
  Link,
  Typography,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';

import {
  setHoverId,
  setHoverState,
} from '../redux/hoverSlice.js';
import graphInfocard from './schema/graph_viewer_schema.json';
import graphInfocardReview from '../schema/review_page/graph_schema.json';
import { addWhitespace } from '../utils/textProcessing';
import { SEARCH_TARGETS } from '../components/data/node_schema';
import {
  edgeIsInverted,
  edgeLabels,
  nodeStyle,
} from '../components/style.js';

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
  const panel = useGraphInfoPanel();
  const [openSections, setOpenSections] = useState({});
  useEffect(() => { setOpenSections({}); }, [incomingData?.id]);
  const isEdge = incomingData?.element_kind ? incomingData.element_kind === 'edge' : incomingData?.source && incomingData?.target;
  const baseSchema =
    review ? isEdge ? graphInfocardReview?.edges["relationship"].info_panel : graphInfocardReview?.nodes["All nodes"].info_panel :
      (isEdge ? graphInfocard?.edges : graphInfocard?.nodes)?.[incomingData?.type]?.info_panel;
  const fullModel = !review && incomingData?.evidence_properties ? recordedInfocardModel(incomingData, isEdge) : isEdge && !review ? edgeInfocardModel(incomingData, baseSchema)
    : { data: incomingData, schema: baseSchema, rawProperties: {} };
  const { data: hoveredData, schema, rawProperties, omitted } = panel && !panel.large && !review ? compactCardModel(fullModel) : fullModel;
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
          <GraphInfoPanelHeader canExpand={Boolean(compactCardModel(fullModel)?.omitted)} title={recordedText(hoveredData[titleColumn?.[1]])}>
            <InfocardData value={recordedText(hoveredData[titleColumn?.[1]])} dataKey={titleColumn?.[1]} config={titleDisplayConfig} />
          </GraphInfoPanelHeader>
          <GraphInfoPanelBody>
          <Box sx={{ display: "grid", gridTemplateColumns: panel?.large ? `repeat(${cardLayout.expanded.columns}, minmax(0, 1fr))` : "1fr", gap: panel?.large ? `${cardLayout.expanded.gap_px}px` : 0, "@media (max-width: 650px)": {gridTemplateColumns: "1fr"} }}>
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
                              {config === 'collapsed' && !panel?.large && <IconButton aria-label={`${openSections[title] ? 'Hide' : 'Show'} ${title.toLowerCase()}`} aria-expanded={Boolean(openSections[title])} onClick={() => setOpenSections(previous => ({...previous, [title]: !previous[title]}))} sx={{ marginLeft: "8px", padding: "0px", marginBottom: "-2px" }} size="small">
                                {openSections[title] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                              </IconButton>}
                            </Typography>
                            <Collapse in={panel?.large || config !== "collapsed" || Boolean(openSections[title])} timeout="auto">
                            <Box key={title} sx={{
                              width: "calc(100%)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}>
                              {
                                Array.isArray(content) ? (
                                  content.map(([label, key, config, sourceKey]) => ( // Data Row
                                    <Box key={key} data-field={sourceKey || key} title={sourceKey ? `Recorded field: ${sourceKey} · Exact value: ${formatEvidenceValue(rawProperties[sourceKey])}` : undefined} sx={{ display: "grid", gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)", gap: "10px", alignItems: "start", overflowWrap: "anywhere" }}>
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
                            </Collapse>
                          </Box>
                        )
              )
            })
          }
          </Box>
          {omitted > 0 && <Typography sx={{padding: "8px 16px", fontSize: 11, color: "#5F7885"}}>Enlarge for complete record</Typography>}
          </GraphInfoPanelBody>
          {/* Footer */}
          {footerInfo && <Box component="footer" className="graph-info-panel-footer" sx={{
            display: "flex",
            minHeight: "30px",
            padding: "4px 10px",
            boxSizing: "border-box",
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
      : (<>
        <GraphInfoPanelHeader title={String(hoveredData?.HGNC_symbol || hoveredData?.id || '')}>
          {hoveredData?.HGNC_symbol || hoveredData?.id}
        </GraphInfoPanelHeader>
        <GraphInfoPanelBody>
        <div style={{ padding: 16, fontWeight: 600 }}>
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
        </div>
        </GraphInfoPanelBody>
      </>))
  );
}

// A stable component type keeps focus while Cytoscape emits zoom updates.
function GraphSearch({ inputRef, onSearch }) {
  return <input aria-label="Search graph" placeholder="Search graph…"
    defaultValue={inputRef.current}
    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', font: '12px Inter, Open Sans, sans-serif', background: '#fff', color: '#334155', boxShadow: '0 1px 2px #0000000d' }}
    onInput={event => { inputRef.current = event.target.value; }}
    onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onSearch(inputRef.current.trim()); } }} />;
}

// Main KnowledgeGraph component
export default function KnowledgeGraph({ onEvidenceInspect, releaseId, evidenceService, selectable = false, setSelectedNode = () => { }, sx = {}, graphData = null, coordData = null, edgeRoutes = null, review = false, containerHeight = "600px", defaultLegendVisible = false }) {
  const cyRef = useRef(null);
  const containerRef = useRef(null);
  const infocardRef = useRef(null);
  const [activeHover, setActiveHover] = useState(null);
  const activeNode = activeHover?.element;
  const [hoverTarget, setHoverTarget] = useState(null);
  const [panelMode, setPanelMode] = useState('hover');
  const hoverTargetRef = useRef(null);
  const dispatch = useDispatch();
  const [infocardPosition, setInfocardPosition] = useState({ x: 0, y: 0, slide: false });
  const [infocardVisible, setInfocardVisible] = useState(false);
  const [infocardHovered, setInfocardHovered] = useState(false);

  const clearHoverTarget = useCallback(() => {
    if (!hoverTargetRef.current) return;
    hoverTargetRef.current = null;
    if (containerRef.current) containerRef.current.style.cursor = '';
    dispatch(setHoverState(false));
    setHoverTarget(null);
  }, [dispatch]);
  const dismissHover = useCallback(() => {
    clearHoverTarget();
    setInfocardVisible(false);
    setInfocardHovered(false);
  }, [clearHoverTarget]);

  const queryResultPage = useSelector(state => graphData ? null : state.queryResultPage.queryResultPage);
  const sourceGraph = graphData || queryResultPage?.combined_query_result;
  const sourceCoords = coordData || queryResultPage?.xy_json;
  const sourceRoutes = edgeRoutes || queryResultPage?.edge_routes;
  // Answer/resource polling replaces response objects without changing the graph.
  // Rebuild only when graph content changes, preserving the user's pan and zoom.
  const graphInputKey = useMemo(() => JSON.stringify([sourceGraph, sourceCoords || {}, sourceRoutes || {}]), [sourceGraph, sourceCoords, sourceRoutes]);
  const bound = useMemo(() => {
    const [result, positions, routes] = JSON.parse(graphInputKey);
    return result?.nodes && result?.edges
      ? graphElements(result, positions, routes, { review, graphInfocard, edgeIsInverted, edgeLabels, spreadCompact: true })
      : null;
  }, [graphInputKey, review]);
  const previousBinding = useRef(null);
  const viewportRef = useRef(null);

  // toggle buttons & graph state
  const [zoomLevel, setZoomLevel] = useState(1.5);
  const [initZoom, setInitZoom] = useState(1.5); // default zoom scale
  const [minimumZoom, setMinimumZoom] = useState(0.6);
  const [infocardEnabled, setInfocardEnabled] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const compactPanel = panelMode === 'hover';
  const hoverEnabled = useRef(true);
  useLayoutEffect(() => {
    hoverEnabled.current = compactPanel && infocardEnabled;
  }, [compactPanel, infocardEnabled]);

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



  const handleZoomIn = () =>
    cyRef.current && cyRef.current.zoom({ level: cyRef.current.zoom() / 1.2, renderedPosition: center });
  const handleZoomOut = () =>
    cyRef.current && cyRef.current.zoom({ level: cyRef.current.zoom() * 1.2, renderedPosition: center });

  const handleRecenter = () => {
    viewportRef.current?.fit();
  };

  const saveGraphFile = (blob, filename) => {
    if (!(blob instanceof Blob) || !blob.size) throw new Error('The export is empty.');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    const dialog = containerRef.current?.closest('dialog');
    (dialog?.open ? dialog : document.body).appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleDownload = async () => {
    if (!cyRef.current) throw new Error('The graph is unavailable.');
    // A Blob avoids data-URL length limits. Cap full-graph exports so large
    // layouts remain within browser canvas limits without cropping the graph.
    const bounds = cyRef.current.elements().boundingBox();
    const png = await cyRef.current.png({ output: 'blob-promise', full: true,
      maxWidth: Math.min(4096, Math.max(1, Math.ceil(bounds.w)) * 6),
      maxHeight: Math.min(4096, Math.max(1, Math.ceil(bounds.h)) * 6) });
    saveGraphFile(png, 'knowledge_graph.png');
  };

  const handleDownloadJson = () => {
    if (!sourceGraph) throw new Error('The graph is unavailable.');
    // Export the source graph, retaining all scientific properties and IDs.
    saveGraphFile(new Blob([JSON.stringify(sourceGraph, null, 2)], { type: 'application/json' }), 'knowledge_graph.json');
  };



  useLayoutEffect(() => {
    const container = containerRef.current;
    const infocard = infocardRef.current;
    const cy = cyRef.current;
    if (!infocardVisible || !compactPanel || !activeHover || !container || !infocard || !cy) return;
    const { element } = activeHover;
    const pane = container.getBoundingClientRect();
    const node = element.isNode?.();
    const bounds = node ? element.renderedBoundingBox?.({ includeLabels: true, includeOverlays: false }) : null;
    let anchor = activeHover.fullscreen === expanded ? activeHover.anchor : null;
    if (bounds) {
      anchor = { left: pane.left + bounds.x1, right: pane.left + bounds.x2, top: pane.top + bounds.y1, bottom: pane.top + bounds.y2 };
    } else if (anchor) {
      anchor = { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
    } else {
      const position = getSafeElementPosition(element);
      if (!position) return;
      const pan = cy.pan();
      const zoom = cy.zoom();
      const x = pane.left + position.x * zoom + pan.x;
      const y = pane.top + position.y * zoom + pan.y;
      anchor = { left: x, right: x, top: y, bottom: y };
    }
    const { width } = infocard.getBoundingClientRect();
    const height = [...infocard.children].reduce((sum, child) => sum + Math.max(child.offsetHeight, child.scrollHeight), 0);
    const inset = 12, gap = 8;
    const right = anchor.right + gap;
    const left = anchor.left - gap - width;
    const maxLeft = window.innerWidth - width - inset;
    const preferLeft = right + width > Math.min(pane.right, window.innerWidth - inset) && left >= inset;
    const upper = Math.min(anchor.top - gap, window.innerHeight - inset);
    const lower = Math.max(inset, anchor.bottom + gap);
    const roomAbove = upper - inset;
    const roomBelow = window.innerHeight - inset - lower;
    const above = roomAbove >= height || roomAbove > roomBelow;
    // Anchor the nearest corner to the target. Evidence can grow without
    // shifting that corner, and the body can scroll within the available side.
    setInfocardPosition({
      x: Math.max(inset, Math.min(preferLeft ? left : right, maxLeft)),
      y: above ? upper : lower,
      above,
      slide: activeHover.slide,
    });
  }, [activeHover, compactPanel, expanded, infocardVisible]);

  const closePanel = () => { setPanelMode('hover'); dismissHover(); };
  const exitGraphFullscreen = () => { closePanel(); setExpanded(false); };
  const toggleExpand = () => { if (expanded) exitGraphFullscreen(); else { dismissHover(); setExpanded(true); } };

  const handleReset = () => {
    const cy = cyRef.current;
    if (!cy || !bound) return;
    cy.batch(() => {
      bound.modelPositions.forEach((position, id) => cy.getElementById(id).position(position));
      cy.elements().unselect();
      cy.elements().removeClass('highlight');
    });
    applyGraphRoutes(cy, bound.edgeStyles);
    setSelectedID([]);
    closePanel();
    handleRecenter();
  };

  useEffect(() => {
    if (infocardVisible && activeNode?.isEdge?.()) onEvidenceInspect?.(activeNode.id());
  }, [infocardVisible, activeNode, onEvidenceInspect]);

  useEffect(() => {
    if (!compactPanel || (!hoverTarget && !infocardVisible)) return undefined;
    const dismissOutside = event => {
      if (!(event.target instanceof Node) || !infocardRef.current?.contains(event.target)) dismissHover();
    };
    const container = containerRef.current;
    const observer = typeof IntersectionObserver !== 'undefined' && container ? new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) dismissHover();
    }) : null;
    observer?.observe(container);
    window.addEventListener('pointerdown', dismissOutside, true);
    window.addEventListener('scroll', dismissOutside, true);
    window.addEventListener('resize', dismissHover);
    window.addEventListener('blur', dismissHover);
    return () => {
      window.removeEventListener('pointerdown', dismissOutside, true);
      window.removeEventListener('scroll', dismissOutside, true);
      window.removeEventListener('resize', dismissHover);
      window.removeEventListener('blur', dismissHover);
      observer?.disconnect();
    };
  }, [compactPanel, dismissHover, hoverTarget, infocardVisible]);

  useEffect(() => {
    if (!compactPanel || !infocardEnabled || infocardHovered) return undefined;
    if (!hoverTarget) {
      if (!infocardVisible) return undefined;
      const timeout = setTimeout(() => setInfocardVisible(false), 260);
      return () => clearTimeout(timeout);
    }
    if (infocardVisible && activeNode === hoverTarget.element) return undefined;
    const timeout = setTimeout(() => {
      if (hoverTargetRef.current !== hoverTarget || hoverTarget.element.removed?.()) return;
      setActiveHover({ ...hoverTarget, fullscreen: expanded, slide: infocardVisible });
      setInfocardVisible(true);
    }, infocardVisible ? 70 : 160);
    return () => clearTimeout(timeout);
  }, [activeNode, compactPanel, expanded, hoverTarget, infocardEnabled, infocardHovered, infocardVisible]);


  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !bound) return;
    const previous = previousBinding.current;
    previousBinding.current = bound;
    const { nodes, edges, edgeStyles } = bound;
    if (cyRef.current) {
      const cy = cyRef.current;
      if (updateGraphElements(cy, bound, previous)) {
        if (hoverEnabled.current) dismissHover();
        viewportRef.current?.refreshLayout?.();
      }
      setSelectedID(ids => ids.filter(id => cy.getElementById(id).nonempty()));
      return;
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

    const cy = cyRef.current;
    container.addEventListener('mouseleave', clearHoverTarget);
    // Cytoscape emits mousemove for the new hit before mouseout for the old
    // hit. Use one hit per event so old mouseout events cannot cancel new cards.
    cy.on('mousemove', ({ target, originalEvent }) => {
      if (!hoverEnabled.current || originalEvent?.buttons || target === cy || target.removed?.()) {
        clearHoverTarget();
        return;
      }
      if (hoverTargetRef.current?.element === target) return;
      const { clientX, clientY } = originalEvent || {};
      const anchor = Number.isFinite(clientX) && Number.isFinite(clientY) ? { x: clientX, y: clientY } : null;
      const next = { element: target, anchor };
      const wasHovering = Boolean(hoverTargetRef.current);
      hoverTargetRef.current = next;
      container.style.cursor = 'pointer';
      dispatch(setHoverId(target.id()));
      if (!wasHovering) dispatch(setHoverState(true));
      setHoverTarget(next);
    });
    cy.on('viewport grab', () => { if (hoverEnabled.current) dismissHover(); });
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

    cy._disposeGraphPane = () => {
      viewport.dispose();
      cy.removeAllListeners();
      container.removeEventListener('mouseleave', clearHoverTarget);
    };
  }, [bound, clearHoverTarget, dismissHover, dispatch, selectable]);

  useLayoutEffect(() => {
    if (!activeNode?.removed?.()) return;
    setPanelMode('hover');
    dismissHover();
  }, [activeNode, bound, dismissHover]);

  useEffect(() => {
    if(review || !evidenceService?.peek || evidenceService.schema?.release_id!==releaseId) return undefined;
    // Bound background reads to the displayed graph; never prefetch evidence tables.
    const refs=(cyRef.current?.elements().map(ele=>exactGraphRef(ele.data(),evidenceService.schema)) || []).filter(Boolean).slice(0,100);
    let stopped=false, next=0;
    const warm=async()=>{
      while(!stopped && next<refs.length) {
        const ref=refs[next++];
        if(evidenceService.peek(ref)) continue;
        try { await evidenceService.request('/inspect',{release_id:releaseId,ref}); } catch { /* Hover can retry. */ }
      }
    };
    for(let i=0;i<3;i++) warm();
    return ()=>{stopped=true;};
  },[bound,evidenceService,releaseId,review]);

  useLayoutEffect(() => () => {
    const cy = cyRef.current;
    cy?._disposeGraphPane?.();
    cy?.destroy();
    cyRef.current = null;
    viewportRef.current = null;
    if (hoverTargetRef.current) dispatch(setHoverState(false));
    hoverTargetRef.current = null;
  }, [dispatch]);

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
    <PersistentGraphViewport fullscreen={expanded} onExit={exitGraphFullscreen}>
    <div className="graph-viewer" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', ...sx, userSelect: 'none', WebkitUserSelect: 'none', position: 'relative', width: '100%', height: '100%', minHeight: 0, borderRadius: expanded ? 0 : 16, background: expanded ? '#f8fafc' : undefined }}>
      {expanded && <Box sx={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', width: 'min(360px, calc(100% - 210px))', zIndex: 15 }}><GraphSearch inputRef={inputRef} onSearch={focusElementByKey} /></Box>}
      <div
        ref={containerRef}
        className="graph-canvas-host"
        style={{
          ...{
            width: "100%",
            height: containerHeight,
            // Prevent browser text-selection highlights on the interactive canvas.
            // Information-panel text remains independently selectable.
            userSelect: "none",
            WebkitUserSelect: "none",
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
      <GraphToolbar fullscreen={expanded} onFullscreen={toggleExpand}
        zoomPercent={Math.round(zoomLevel / initZoom * 100)} canZoomIn={zoomLevel < 4} canZoomOut={zoomLevel > minimumZoom}
        onZoomIn={handleZoomOut} onZoomOut={handleZoomIn} onFit={handleRecenter}
        hoverEnabled={infocardEnabled} onHover={() => { setInfocardEnabled(value => !value); if (infocardEnabled) closePanel(); }}
        onDownload={handleDownload} onDownloadJson={handleDownloadJson} onReset={handleReset}
        onDownloadMenuOpen={closePanel}
        modeLabel={sourceGraph?.presentation_mode === 'relationship_list' ? 'List mode' : 'KG mode'} />
      <div className="graph-zoom-indicator" aria-label="Graph zoom">{Math.round(zoomLevel / initZoom * 100)}%</div>
      <GraphInfoPanel schema={evidenceService?.schema} panelRef={infocardRef} host={expanded ? containerRef.current?.closest('dialog') : document.body}
        visible={infocardVisible} mode={panelMode} position={infocardPosition} review={review}
        onEnter={() => { clearHoverTarget(); setInfocardHovered(true); }} onLeave={() => setInfocardHovered(false)}
        onEnlarge={() => { clearHoverTarget(); setPanelMode('expanded'); setInfocardVisible(true); setExpanded(true); }}
        onMinimize={() => { setPanelMode('hover'); setInfocardHovered(true); }}
        onClose={closePanel}>
        {activeNode && !activeNode.removed?.() && <ObjectInformationPanel key={activeNode.id()} endpointNodes={activeNode.isEdge?.() ? [activeNode.source().data(), activeNode.target().data()] : []} data={activeNode.data()} releaseId={releaseId} service={review ? null : evidenceService} fallback={<InfocardMenu hoveredData={activeNode.data()} review={review} />} />}
      </GraphInfoPanel>
      {!review && <GraphLegend defaultOpen={defaultLegendVisible} />}
    </div>
    </PersistentGraphViewport>
  );
}
