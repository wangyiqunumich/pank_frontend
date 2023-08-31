import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { CypherService } from '../../service/Cypher'
import { DetailService } from '../../service/Detail'
import 'antd/dist/reset.css';
import { Col, Row, Input, Spin, Tag} from 'antd';
import { TweenOneGroup } from 'rc-tween-one';
import './scoped.css'
import GLKBLogoImg from '../../img/glkb_logo.png'
import UMLogo from '../../img/um_logo.jpg'
import queryString from 'query-string'
import Settings from "../Settings";
import Graph from "../Graph";
import Information from '../Information';
import axios from 'axios'
import graphData from '../Graph/test_graph.json';

const { Search } = Input;

const ResultPage = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const alltags = urlParams.get('q');
    const otags = alltags.split('|')
    const [tags, setTags] = useState(otags);
    const [detailType, setDetailType] = useState([]);
    const [detail, setDetail] = useState({});
    const [detailId, setDetailId] = useState(null);

    const [data, setData] = useState({});

    // view setting
    const [view, setView] = useState("concentric");
    const handleView = (props) => {
        setView(props.target.value);
    };

    /* ====== range initialization functions ====== */
    const [minAdcFreq, setMinAdcFreq] = useState(Infinity);
    const handleMinAdcFreq = (value) => {
        setMinAdcFreq(value);
    }
    const [maxAdcFreq, setMaxAdcFreq] = useState(-1);
    const handleMaxAdcFreq = (value) => {
        setMaxAdcFreq(value);
    }
    const [minAdcPd, setMinAdcPd] = useState(Infinity);
    const handleMinAdcPd = (value) => {
        setMinAdcPd(value)
    }
    const [maxAdcPd, setMaxAdcPd] = useState(-1);
    const handleMaxAdcPd = (value) => {
        setMaxAdcPd(value)
    }
    const [minAdcNoc, setMinAdcNoc] = useState(Infinity);
    const handleMinAdcNoc = (value) => {
        setMinAdcNoc(value)
    }
    const [maxAdcNoc, setMaxAdcNoc] = useState(-1);
    const handleMaxAdcNoc = (value) => {
        setMaxAdcNoc(value)
    }
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
    // Article Density Control params
    // frequency
    const [adcFreq, setAdcFreq] = useState([0, 0]);
    const handleAdcFreq = (range) => {
        setAdcFreq(range);
    }
    const handleAdcFreq1 = (props) => {
        let value = parseInt(props.target.value);
        setAdcFreq([value, adcFreq[1]]);
    }
    const handleAdcFreq2 = (props) => {
        let value = parseInt(props.target.value);
        setAdcFreq([adcFreq[0], value]);
    }

    // publication date
    const [adcPd, setAdcPd] = useState([0, 0]);
    const handleAdcPd = (range) => {
        setAdcPd(range);
    }
    const handleAdcPd1 = (props) => {
        let value = parseInt(props.target.value);
        setAdcPd([value, adcPd[1]]);
    }
    const handleAdcPd2 = (props) => {
        let value = parseInt(props.target.value);
        setAdcPd([adcPd[0], value]);
    }

    // number of citations
    const [adcNoc, setAdcNoc] = useState([0, 0]);
    const handleAdcNoc = (range) => {
        setAdcNoc(range);
    }
    const handleAdcNoc1 = (props) => {
        let value = parseInt(props.target.value);
        setAdcNoc([value, adcNoc[1]]);
    }
    const handleAdcNoc2 = (props) => {
        let value = parseInt(props.target.value);
        setAdcNoc([adcNoc[0], value]);
    }

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
    const [gtdcNoc, setGtdcNoc] = useState([0 ,0]);
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
    const [articleNodes, setArticleNodes] = useState([]);
    const [termNodes, setTermNodes] = useState([]);
    const [relationNodes, setRelationNodes] = useState([]);
    const [visibleArticles, setVisibleArticles] = useState([]);
    const [visibleTerms, setVisibleTerms] = useState([]);
    const [visibleRelations, setVisibleRelations] = useState([]);



    const [results, setResults] = useState([])
    const [articles, setArticles] = useState({})
    const [label, setLabel] = useState(0)
    const [searchFlag, setSearchFlag] = useState(false)
    const [articleFlag, setArticleFlag] = useState(false)
    const [query, setQuery] = useState('')
    

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [informationOpen, setInformationOpen] = useState(false);


    useEffect(() => {
        const parsed = location.search.slice(3)
        console.log(parsed)
        if (parsed) {
            setResults([])
            setQuery(parsed)
            search(parsed)
        } else {
            setResults([])
        }
    }, [location])

    const initialize = () => {
        setResults([])
        setArticles({})
        setLabel(0)
        setSearchFlag(false)
        setArticleFlag(false)
        setQuery('')
    }

    async function search(content) {
        setSearchFlag(false)
        nevigate(`/result?q=${content}`)
        let cypherServ = new CypherService()
        const response = await cypherServ.Article2Cypher(content)
        console.log(response)
        console.log(response.data)
        // setData(graphData)
        setData(response.data)
        setSearchFlag(true)
    }

    async function searchArticle(item) {
        let res = []
        var config = {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            params: {
                pmid: item.pmid
            }
        }
        await axios
            // .get('/api/article', config)
            .get('/article', config)
            .then(function (response) {
                // console.log(response)
                res = response
                let highlight = generateHighlight(res.data.abstract_list)
                item.abstract_list = res.data.abstract_list
                item.highlight = highlight
                setArticles(item)
                setArticleFlag(true)
            })
            .catch(function (error) {
                // console.log('error', error)
            })
    }

    async function handleSelectNode(targetNode) {
        if (targetNode.label == "Article") {
            setDetailType("article")
        } else {
            setDetailType("term")
        }
        let temp_id = targetNode.id
        setDetailId(temp_id);
        // console.log(temp_id)
        // console.log("2")
        // searchInfo(temp_id)
    }

    const addArticle = index => {
        results.filter(async (item) => {
                    if (item.id - 1 === index) {
                        searchArticle(item)
                    }
                })
    }
    
    const generateHighlight = (abstract_list) => {
        let highlight = []
        for (let item of abstract_list) {
            if (item[1] != "none" && !highlight.includes(item[1])) {
                highlight.push(item[1])
            }
        }
        return highlight
    }

    let nevigate = useNavigate();
    const backHome = async (v) => {
        nevigate(`/`)
    }

    const handleSearch = async (v) => {
        initialize()
        nevigate(`/result?q=${v}`)
        search(v)
    }

    const handleSettings = () => {
        setSettingsOpen(!settingsOpen);
    };

    const handleInformation = () => {
        setInformationOpen(!informationOpen);
    };

    const handleClose = (removedTag) => {
        const newTags = tags.filter((tag) => tag !== removedTag);
        console.log(newTags);
        setTags(newTags);
        const alltags = newTags.join("|")
        console.log(alltags)
        // console.log(v)
        nevigate(`/result?q=${alltags}`)
    };
    
    const forMap = (tag) => {
    const tagElem = (
        <Tag
        closable
        onClose={(e) => {
            e.preventDefault();
            handleClose(tag);
        }}
        style={{ border: '1px solid #4F4F4F', borderRadius: '18px' }}
        >
        {tag}
        </Tag>
    );
    return (
        <span key={tag} style={{ display: 'inline-block' }}>
        {tagElem}
        </span>
    );
    };

    const tagChild = tags.map(forMap);

    return (
        <div className="result-container">

            {/* Navigation Bar */}
            <div className="heading-container">
                <Row>
                    <Col span={7}>
                        <div className="GLKB-container">
                            <img className='GLKBLogo' src={GLKBLogoImg} onClick={backHome}/>
                        </div> 
                    </Col>
                    <Col span={10}>
                        <div className="heading-search">
                            <Search placeholder="input search text" enterButton="Search" onSearch={search} defaultValue={query}/>
                        </div>
                    </Col>
                    <Col span={7}>
                        <div className="UM-container">
                            <img className='UMLogo' src={UMLogo}/>
                        </div>
                    </Col>
                </Row>
            </div>

            {/* Filter Bar */}
            <div className="line"></div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '45px'}}>
                <div style={{ textAlign: 'left', width: '600px', padding: '20px', background: '#F6F6F6', borderRadius: '14px'}}>
                    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '20px' }}>Term List:</span>
                        <TweenOneGroup
                            enter={{
                                scale: 0.8,
                                opacity: 0,
                                type: 'from',
                                duration: 100,
                            }}
                            onEnd={(e) => {
                                if (e.type === 'appear' || e.type === 'enter') {
                                    e.target.style = 'display: inline-block';
                                }
                            }}
                            leave={{ opacity: 0, width: 0, scale: 0, duration: 200 }}
                            appear={false}
                        >
                            {tagChild}
                        </TweenOneGroup>
                    </div>
                </div>
            </div>
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
                            data={data}
                            view={view}
                            minAdcFreq={minAdcFreq}
                            maxAdcFreq={maxAdcFreq}
                            minAdcPd={minAdcPd}
                            maxAdcPd={maxAdcPd}
                            minAdcNoc={minAdcNoc} 
                            maxAdcNoc={maxAdcNoc}
                            minGtdcFreq={minGtdcFreq} 
                            maxGtdcFreq={maxGtdcFreq} 
                            minGtdcNoc={minGtdcNoc} 
                            maxGtdcNoc={maxGtdcNoc}
                            adcFreq={adcFreq}
                            handleAdcFreq={handleAdcFreq}
                            handleMinAdcFreq={handleMinAdcFreq}
                            handleMaxAdcFreq={handleMaxAdcFreq}
                            adcPd={adcPd}
                            handleAdcPd={handleAdcPd}
                            handleMinAdcPd={handleMinAdcPd}
                            handleMaxAdcPd={handleMaxAdcPd}
                            adcNoc={adcNoc}
                            handleAdcNoc={handleAdcNoc}
                            handleMinAdcNoc={handleMinAdcNoc} 
                            handleMaxAdcNoc={handleMaxAdcNoc}
                            gtdcFreq={gtdcFreq}
                            handleGtdcFreq={handleGtdcFreq}
                            handleMinGtdcFreq={handleMinGtdcFreq} 
                            handleMaxGtdcFreq={handleMaxGtdcFreq}
                            gtdcNoc={gtdcNoc}
                            handleGtdcNoc={handleGtdcNoc}
                            handleMinGtdcNoc={handleMinGtdcNoc} 
                            handleMaxGtdcNoc={handleMaxGtdcNoc}
                            setArticleNodes={setArticleNodes}
                            setTermNodes={setTermNodes}
                            setRelationNodes={setRelationNodes}
                            setVisibleArticles={setVisibleArticles}
                            setVisibleTerms={setVisibleTerms}
                            setVisibleRelations={setVisibleRelations}
                            visibleArticles={visibleArticles}
                            visibleTerms={visibleTerms}
                            visibleRelations={visibleRelations}
                            setDetailType={setDetailType}
                            // setDetail={setDetail}
                            handleSelectNode={handleSelectNode}
                            handleInformation={handleInformation}
                            informationOpen={informationOpen}
                        />
                        <span>
                            <Settings
                                minAdcFreq={minAdcFreq}
                                maxAdcFreq={maxAdcFreq}
                                minAdcPd={minAdcPd}
                                maxAdcPd={maxAdcPd}
                                minAdcNoc={minAdcNoc} 
                                maxAdcNoc={maxAdcNoc}
                                minGtdcFreq={minGtdcFreq} 
                                maxGtdcFreq={maxGtdcFreq} 
                                minGtdcNoc={minGtdcNoc} 
                                maxGtdcNoc={maxGtdcNoc} 
                                isOpen={settingsOpen}
                                toggleSidebar={handleSettings}
                                view={view}
                                handleView={handleView}
                                adcFreq={adcFreq}
                                handleAdcFreq={handleAdcFreq}
                                handleAdcFreq1={handleAdcFreq1}
                                handleAdcFreq2={handleAdcFreq2}
                                adcPd={adcPd}
                                handleAdcPd={handleAdcPd}
                                handleAdcPd1={handleAdcPd1}
                                handleAdcPd2={handleAdcPd2}
                                adcNoc={adcNoc}
                                handleAdcNoc={handleAdcNoc}
                                handleAdcNoc1={handleAdcNoc1}
                                handleAdcNoc2={handleAdcNoc2}
                                gtdcFreq={gtdcFreq}
                                handleGtdcFreq={handleGtdcFreq}
                                handleGtdcFreq1={handleGtdcFreq1}
                                handleGtdcFreq2={handleGtdcFreq2}
                                gtdcNoc={gtdcNoc}
                                handleGtdcNoc={handleGtdcNoc}
                                handleGtdcNoc1={handleGtdcNoc1}
                                handleGtdcNoc2={handleGtdcNoc2}
                                setVisibleArticles={setVisibleArticles}
                                setVisibleTerms={setVisibleTerms}
                                setVisibleRelations={setVisibleRelations}
                                articleNodes={articleNodes}
                                termNodes={termNodes}
                                relationNodes={relationNodes}
                                visibleArticles={visibleArticles}
                                visibleTerms={visibleTerms}
                                visibleRelations={visibleRelations}
                            />
                        </span>
                        <span>
                            <Information
                                isOpen={informationOpen}
                                toggleSidebar={handleInformation}
                                detailType={detailType}
                                detail={detail}
                                detailId={detailId}
                            />
                        </span>
                    </div>
                )}
                
            </div>
        </div>
        
    )
}

export default ResultPage
