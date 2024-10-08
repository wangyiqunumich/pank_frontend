import React, {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import {CypherService} from '../../service/Cypher'
import {DetailService} from '../../service/Detail'
import 'antd/dist/reset.css';
import {Col, Row, Input, Spin, Tag, Menu} from 'antd';
import {TweenOneGroup} from 'rc-tween-one';
import './scoped.css'
import NavBarWhite from '../Units/NavBarWhite'
import GLKBLogoImg from '../../img/glkb_logo.png'
import NavBar from '../NavBar';
import UMLogo from '../../img/um_logo.jpg'
import queryString from 'query-string'
import Settings from "../Settings";
import Graph from "../Graph";
import Information from '../Information';
import axios from 'axios'
import sampleGraphData from './sampleData.json';
import SearchBarKnowledge from "../Units/SearchBarKnowledge";

const {Search} = Input;

const ResultPage = () => {
    // const urlParams = new URLSearchParams(window.location.search);
    // const alltags = urlParams.get('data');
    const location = useLocation();
    const search_data = location.state.search_data;
    const chipDataID = location.state.chipDataID;
    // const { result } = location.state;
    // console.log(location.state)
    // const otags = alltags.split('|')
    const otags = ""
    const [tags, setTags] = useState(otags);
    const [detailId, setDetailId] = useState(null);
    const [allNodes, setAllNodes] = useState([]);
    const [data, setData] = useState({});
    const [graphData, setGraphData] = useState();
    /* ====== range initialization functions ====== */
    const [minGtdcFreq, setMinGtdcFreq] = useState(Infinity);
    const handleMinGtdcFreq = (value) => {
        setMinGtdcFreq(value)
    }
    const [maxGtdcFreq, setMaxGtdcFreq] = useState(-1);
    const handleMaxGtdcFreq = (value) => {
        setMaxGtdcFreq(value)
    }
    const [minGtdcNoc, setMinGtdcNoc] = useState(Infinity);
    const handleMinGtdcNoc = (value) => {
        setMinGtdcNoc(value)
    }
    const [maxGtdcNoc, setMaxGtdcNoc] = useState(-1);
    const handleMaxGtdcNoc = (value) => {
        setMaxGtdcNoc(value)
    }

    /* ====== range activation functions ====== */

    // Genomic Terms Density Control
    // frequency
    const [gtdcFreq, setGtdcFreq] = useState([0, 0]);
    const handleGtdcFreq = (range) => {
        setGtdcFreq(range);
    }
    const handleGtdcFreq1 = (props) => {
        let value = parseInt(props.target.value);
        setGtdcFreq([value, gtdcFreq[1]]);
    }
    const handleGtdcFreq2 = (props) => {
        let value = parseInt(props.target.value);
        setGtdcFreq([gtdcFreq[0], value]);
    }

    // number of citations
    const [gtdcNoc, setGtdcNoc] = useState([0, 0]);
    const handleGtdcNoc = (range) => {
        setGtdcNoc(range);
    }
    const handleGtdcNoc1 = (props) => {
        let value = parseInt(props.target.value);
        setGtdcNoc([value, gtdcNoc[1]]);
    }
    const handleGtdcNoc2 = (props) => {
        let value = parseInt(props.target.value);
        setGtdcNoc([gtdcNoc[0], value]);
    }

    /* ====== node type ====== */


    const [searchFlag, setSearchFlag] = useState(false)
    const [chipData, setChipData] = useState([]);
    const [chipDataIDResult, setChipDataIDResult] = useState([]);
    const [informationOpen, setInformationOpen] = useState(false);
    const [graphShownData, setGraphShownData] = useState();
    const [displayArticleGraph, setDisplayArticleGraph] = useState(false);
    useEffect(() => {
        if (search_data) {
            let chipResultData = search_data.triplets.map(triplet => {
                let chip_str = [
                    `${triplet.source[1]}`,
                    `${triplet.rel}`,
                    `${triplet.target[1]}`
                ].join("-");
                return chip_str;
            });
        
            setChipData(chipResultData)
            search(search_data)
        }
        if (chipDataID) {
            const newArray = [];
            chipDataID.forEach(idArray => {newArray.push(idArray)});
            console.log(newArray)
            setChipDataIDResult(newArray);
        }
    }, [search_data, chipDataID])

    const initialize = () => {
        setSearchFlag(false)
    }

    async function search(content) {
        setSearchFlag(false)
        // nevigate(`/result?q=${content}`)
        let cypherServ = new CypherService()
        const response = await cypherServ.Triplet2Cypher(content)
        console.log('function -> ', response)
        // console.log(sampleGraphData)
        // setData(sampleGraphData[0])
        // setAllNodes(sampleGraphData[1])
        setData(response[0])
        setAllNodes(response[1])
        setSearchFlag(true)
    }

    useEffect(() => {
        let nodeIdsToKeep = []
        if (graphData) {
            for (var i = 0; i < graphData.length; i++) {
                nodeIdsToKeep.push(graphData[i])
            }
            const nodeIds = data.nodes.filter(node => nodeIdsToKeep.includes(node.data.id));
            const uniqueIds = new Set();
            const filteredNodes = [];
            nodeIds.forEach(node => {
            if (!uniqueIds.has(node.data.id)) {
                uniqueIds.add(node.data.id);
                filteredNodes.push(node);
            }
            });
            const filteredEdges = data.edges.filter(edge =>
                nodeIdsToKeep.includes(edge.data.source) && nodeIdsToKeep.includes(edge.data.target)
            );
            const filteredData = {
                nodes: filteredNodes,
                edges: filteredEdges
            };
            setGraphShownData(filteredData)
        } else {
            if (data.edges) {
                setGraphShownData(data)
                setSearchFlag(true)
            }
        }
    }, [graphData, data])

    async function handleSelect(target) {
        let temp_id
        if (target.article_source) {
            temp_id = ["edge", ...target.eid];
        } else {
            temp_id = ["node", ...target.database_id];
        }
        console.log(temp_id)
        setDetailId(temp_id);
    }

    let selectedID;

    async function handleSelectNodeID(targetID) {
        let temp_id = targetID[0];
        if (!informationOpen) {
            handleInformation();
        }
        setDetailId(temp_id);
        selectedID = temp_id;
    }

    let nevigate = useNavigate();

    const handleSearch = async (v) => {
        initialize()
        nevigate(`/result?q=${v}`)
        search(v)
    }

    const handleInformation = () => {
        setInformationOpen(!informationOpen);
    };
    console.log(graphShownData)

    return (
        <div className="result-container">

            {/*<NavBar 
                handleSearchTags = {handleSearch}
                tags = {tags}
                setTags = {setTags}
    />*/}
            <NavBarWhite />
            <SearchBarKnowledge 
                chipData = {chipData}
                chipDataIDResult = {chipDataIDResult}
                displayArticleGraph = {displayArticleGraph}
                setDisplayArticleGraph = {setDisplayArticleGraph}
            />
            {/* Main Content */}
            <div className='main-content'>
                {!searchFlag && (
                    <div className='loading-container'>
                        <Spin size='large'/>
                    </div>
                )}
                {searchFlag && (
                    <div className='result-content'>
                        <Graph
                            data={graphShownData}
                            selectedID={selectedID}
                            minGtdcFreq={minGtdcFreq}
                            maxGtdcFreq={maxGtdcFreq}
                            minGtdcNoc={minGtdcNoc}
                            maxGtdcNoc={maxGtdcNoc}
                            gtdcFreq={gtdcFreq}
                            handleGtdcFreq={handleGtdcFreq}
                            handleMinGtdcFreq={handleMinGtdcFreq}
                            handleMaxGtdcFreq={handleMaxGtdcFreq}
                            gtdcNoc={gtdcNoc}
                            handleGtdcNoc={handleGtdcNoc}
                            handleMinGtdcNoc={handleMinGtdcNoc}
                            handleMaxGtdcNoc={handleMaxGtdcNoc}
                            handleSelect={handleSelect}
                            handleInformation={handleInformation}
                            informationOpen={informationOpen}
                        />
                        <span>
                            <Settings
                                minGtdcFreq={minGtdcFreq}
                                maxGtdcFreq={maxGtdcFreq}
                                minGtdcNoc={minGtdcNoc}
                                maxGtdcNoc={maxGtdcNoc}
                                gtdcFreq={gtdcFreq}
                                handleGtdcFreq={handleGtdcFreq}
                                handleGtdcFreq1={handleGtdcFreq1}
                                handleGtdcFreq2={handleGtdcFreq2}
                                gtdcNoc={gtdcNoc}
                                handleGtdcNoc={handleGtdcNoc}
                                handleGtdcNoc1={handleGtdcNoc1}
                                handleGtdcNoc2={handleGtdcNoc2}
                                data={data}
                                allNodes={allNodes}
                                graphShownData={graphShownData}
                                setData={setData}
                                setGraphData={setGraphData}
                                handleSelectNodeID={handleSelectNodeID}
                                search={search}
                                search_data={search_data}
                                displayArticleGraph={displayArticleGraph}
                                setDisplayArticleGraph={setDisplayArticleGraph}
                                setDetailId={setDetailId}
                            />
                        </span>
                        <span>
                            <Information
                                isOpen={informationOpen}
                                toggleSidebar={handleInformation}
                                detailId={detailId}
                                displayArticleGraph={displayArticleGraph}
                            />
                        </span>
                    </div>
                )}

            </div>
        </div>

    )
}

export default ResultPage
