import React, { useState, useEffect, useMemo, useRef } from 'react'
import './scoped.css'
import { DetailService } from '../../service/Detail'
import { Button } from 'antd';
import { Descriptions, List, Collapse, Divider, Typography} from 'antd';
import {
    ConsoleSqlOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined
} from '@ant-design/icons';

const { Panel } = Collapse;
const { Title } = Typography;
const Information = props => {
    const informationClass = props.isOpen ? "information open" : "information";
    const buttonClass = props.isOpen ? "information-button open" : "information-button";
    const relatedClass = props.isOpen ? "related open" : "related";
    const [nodeDetails, setNodeDetails] = useState({});
    const [nodeDetail, setNodeDetail] = useState({});
    const [edgeDetail, setEdgeDetail] = useState({});
    const [urlList, seturlList] = useState({});
    const [activeKey, setActiveKey] = useState(0);

    const merge = true;

    const handleCollapseChange = key => {
        // Make the edge collapse panel act same time with the article collapse component
        setActiveKey(key);
    };

    const handleClick = (event, link) => {
        event.preventDefault();
        window.open(link, '_blank');
    };

    useEffect(() => {
        setNodeDetail({});
        setEdgeDetail({});
        setNodeDetails({});
        console.log("detail changed");
        async function searchInfoNode(content) {
            let detailServ = new DetailService()
            const response = await detailServ.Nid2Detail(content)
            setNodeDetail(response.data)
            setEdgeDetail({})
        }
        async function searchMergeInfoNode(content) {
            let detailServ = new DetailService()
            const response = await detailServ.MergeNid2Detail(content)
            console.log(response)
            // const details = responses.map(response => response.data);
            // console.log(details)
            setNodeDetails(response.data);
            console.log(nodeDetails)
            setEdgeDetail({});
        }
        async function searchInfoEdge(content) {
            console.log(content)
            let detailServ = new DetailService()
            const response = await detailServ.MergeEid2Detail(content)
            console.log(response.data)
            // const sample_data = [[{"node1":"Neoplasms","node2":"Breast Neoplasms","number of citations":1,"relationship label":"Semantic_relationship","relationship type":"Negative_Correlation"},
            //     [["Tumor suppression effect of Solanum nigrum polysaccharide fraction on Breast cancer via immunomodulation. (2016)","https://pubmed.ncbi.nlm.nih.gov/27365117/"]]],
            //     [{"node1":"Breast Neoplasms","node2":"Neoplasms","number of citations":2,"relationship label":"Semantic_relationship","relationship type":"Positive_Correlation"},
            //         [["Immunohistochemical expression of metallothionein in invasive breast cancer in relation to proliferative activity, histology and prognosis. (1996)","https://pubmed.ncbi.nlm.nih.gov/8604236/"],["Long-term exposure to elevated levels of circulating TIMP-1 but not mammary TIMP-1 suppresses growth of mammary carcinomas in transgenic mice. (2004)","https://pubmed.ncbi.nlm.nih.gov/15166086/"]]],
            //     [{"node1":"Breast Neoplasms","node2":"Neoplasms","number of citations":1,"relationship label":"Semantic_relationship","relationship type":"Negative_Correlation"},[["Effect of catechol estrogens on rat mammary tumors. (1979)","https://pubmed.ncbi.nlm.nih.gov/115583/"]]],
            //     ]
            // const sample_data = [[{"node1":"Neoplasms","node2":"Breast Neoplasms","number of citations":1,"relationship label":"Semantic_relationship","relationship type":"Negative_Correlation"},[["Tumor suppression effect of Solanum nigrum polysaccharide fraction on Breast cancer via immunomodulation. (2016)","https://pubmed.ncbi.nlm.nih.gov/27365117/",6,2016]]],[{"node1":"Breast Neoplasms","node2":"Neoplasms","number of citations":2,"relationship label":"Semantic_relationship","relationship type":"Positive_Correlation"},[["Immunohistochemical expression of metallothionein in invasive breast cancer in relation to proliferative activity, histology and prognosis. (1996)","https://pubmed.ncbi.nlm.nih.gov/8604236/",11,1996],["Long-term exposure to elevated levels of circulating TIMP-1 but not mammary TIMP-1 suppresses growth of mammary carcinomas in transgenic mice. (2004)","https://pubmed.ncbi.nlm.nih.gov/15166086/",8,2004]]],[{"node1":"Breast Neoplasms","node2":"Neoplasms","number of citations":1,"relationship label":"Semantic_relationship","relationship type":"Negative_Correlation"},[["Effect of catechol estrogens on rat mammary tumors. (1979)","https://pubmed.ncbi.nlm.nih.gov/115583/",2,1979]]],[{"node1":"Breast Neoplasms","node2":"Neoplasms","number of citations":null,"relationship label":"Hierarchical_structure","relationship type":"subclass_of"},[]]];
            // setEdgeDetail(sample_data);
            setEdgeDetail(response.data)
            setNodeDetails({})
        }
        if (props.detailId) {
            console.log(props.detailId)
            if (props.detailId[0] == "node") {
                if (!merge) {
                    searchInfoNode(props.detailId.slice(1))
                } else {
                    searchMergeInfoNode(props.detailId.slice(1))
                }
            }
            else{
                searchInfoEdge(props.detailId.slice(1));
            }
        }
    }, [props.detailId]);


    // useEffect(() => {
    //     setNodeDetails({});
    //     setNodeDetail({});
    //     setEdgeDetail({});
    //     console.log('displayArticleGraph changed:', nodeDetails);
    // },[props.displayArticleGraph])

    const displayArticleGraphRef = useRef(props.displayArticleGraph);
    const [, forceUpdate] = useState({});

    if (props.displayArticleGraph !== displayArticleGraphRef.current) {
        setNodeDetails({});
        setNodeDetail({});
        setEdgeDetail({});
        displayArticleGraphRef.current = props.displayArticleGraph;
        forceUpdate({}); // Force a render
        console.log("changed");
    }

    const nodeForMap = (url) => {
        return(
            <div className="custom-div-url">
                <a href={url[1]} onClick={(event) => handleClick(event, url[1])}>{url[0]}</a>
                {/*<span> (Number of Citation: {url[2]}, Date: {url[3]})</span>*/}
                <p>Cited by: {url[2]}, Year: {url[3]}</p>
            </div>
        )
    }
    // if (Object.keys(nodeDetails).length !== 0) {
    //     const details = nodeDetails.map((nodeDetail) => nodeDetail.data)
    //     const urls = details.map((node) => node[1].map(nodeForMap))
    //     seturlList(urls)
    // }
    // console.log(urlList);
    const urls = Object.keys(nodeDetails).length !== 0 ? (nodeDetails[1].map(nodeForMap)) : []
    console.log(urls);
    // const edgeUrl = (url) => {
    //     return(
    //         <div>
    //             <a href={url[1]} onClick={(event) => handleClick(event, url[1])}>{url[0]}</a>
    //         </div>
    //     )
    // }
    // const edgeUrls = Object.keys(edgeDetail).length !== 0 ? edgeDetail[0][1].map(edgeUrl) : []
    // const edgeUrl = (url) => (
    //     <div>
    //         <a href={url[1]} onClick={(event) => handleClick(event, url[1])}>{url[0]}</a>
    //     </div>
    // );
    //
    // const edgeUrls = Object.keys(edgeDetail).length !== 0
    //     ? edgeDetail.map(edge =>
    //         edge[1].map(url => edgeUrl(url))
    //     )
    //     : [];



    function renderExternal() {
        if (Object.keys(nodeDetails).length !== 0) {
            let elements = []
            for (const nodeDetail of nodeDetails[0]) {
                for (const source of Object.keys(nodeDetail.external_sources)) {
                    console.log(nodeDetail.external_sources[source])
                    elements.push(
                        <div>
                          {source}: {nodeDetail.external_sources[source]}
                        </div>
                    );
                }
            }
            return elements;
        }
    }


    // if (Object.keys(nodeDetails).length !== 0) {
    //     (nodeDetails.map((nodeDetail) => nodeDetail.data)).map((node, index) => console.log(node[0].type))
    
    // }
    if (Object.keys(edgeDetail).length !== 0) {
        console.log(edgeDetail);

    }
        return (
            <div>
                {props.displayArticleGraph === displayArticleGraphRef.current && (
                    <div className={informationClass}>
                        {/* {Object.keys(detail).length != 0 && props.detailType == "article" && 'title' in detail && (
                            <Article
                                title={detail.title}
                                authors={detail.authors}
                                pmid={detail.pmid}
                                abstract={detail.abstract}
                                abstract_list={detail.abstract_list}
                            />
                        )}
                        {Object.keys(detail).length != 0 && props.detailType == "term" && 'element_id' in detail && (
                            <Term
                                entity_id={detail.element_id}
                                name={detail.name}
                                aliases={detail.aliases}
                                description={detail.description}
                                type={detail.type}
                                external_id={detail.external_sources}
                            />
                        )} */}
                        {Object.keys(nodeDetails).length === 0 && Object.keys(edgeDetail).length === 0 && (
                        <div className='article-container'>
                                <div>Loading... or you have not yet select any node or edge</div>
                        </div>
                        )}
                        {Object.keys(nodeDetail).length !== 0 && !merge &&(

                            <div >
                                {/*<div className='fixed-row'>*/}
                                <div className="sticky-title">
                                    <h3 style={{color: '#014484', fontSize: 20, fontWeight: 'bold'}}>{nodeDetail[0].name.charAt(0).toUpperCase() + nodeDetail[0].name.slice(1)}</h3>
                                </div>
                                <div className='article-container'>
                                    {/*<Title level={4}>{nodeDetail[0].name}</Title>*/}
                                    <Descriptions column={1}  size="small" className="custom-descriptions" style={{borderRadius: '10px'}}>
                                        <Descriptions.Item label="Entity ID">{nodeDetail[0].element_id}</Descriptions.Item>
                                        {/*<Descriptions.Item label="Aliases">{nodeDetail[0].aliases}</Descriptions.Item>*/}

                                        <Descriptions.Item label="Type">{nodeDetail[0].type}</Descriptions.Item>
                                        <Descriptions.Item label="External ID">{renderExternal()}</Descriptions.Item>
                                        {/*<Descriptions.Item label="Description">{nodeDetail[0].description}</Descriptions.Item>*/}
                                        {
                                            nodeDetail[0].description && nodeDetail[0].description.trim() !== "" && (
                                                <Descriptions.Item label="Description">{nodeDetail[0].description}</Descriptions.Item>
                                            )
                                        }

                                        <Descriptions.Item label="Aliases">
                                            <ul>
                                                {nodeDetail[0].aliases.map((alias) => (
                                                    <li>{alias}</li>
                                                ))}
                                            </ul>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </div>
                            </div>
                        )}
                        {Object.keys(nodeDetails).length !== 0 && merge && nodeDetails[0].some(entity => 'database_id' in entity) && (

                            <div>
                                {/*<div className='fixed-row'>*/}
                                <div className="sticky-title">
                                    <h3 style={{color: '#014484', fontSize: 20, fontWeight: 'bold'}}>{nodeDetails[0][0].name.toUpperCase()}</h3>
                                </div>
                                <div className='article-container'>
                                    <Collapse accordion activeKey={activeKey} onChange={handleCollapseChange}>
                                        {(nodeDetails[0]).map((node, index) => (
                                            <Panel header={node.name} key={index}>
                                                <div className='edge-article-container'>
                                                    {/*<Descriptions title="Edge Details" bordered column={1}>*/}
                                                    <Descriptions column={1}  size="small" className="custom-descriptions" style={{borderRadius: '10px'}}>
                                                        <Descriptions.Item label="Entity ID">{node.element_id}</Descriptions.Item>
                                                        {/*<Descriptions.Item label="Aliases">{node[0].aliases}</Descriptions.Item>*/}

                                                        <Descriptions.Item label="Type">{node.type}</Descriptions.Item>
                                                        <Descriptions.Item label="External ID">{                                        
                                                            <ul>
                                                                {Object.keys(node.external_sources).map((source) => (
                                                                    <li>
                                                                        {source} : {node.external_sources[source]}
                                                                    </li>
                                                                ))}
                                                            </ul> 
                                                        }</Descriptions.Item>
                                                        {/*<Descriptions.Item label="Description">{node[0].description}</Descriptions.Item>*/}
                                                        {
                                                            node.description && node.description.trim() !== "" && (
                                                                <Descriptions.Item label="Description">{node.description}</Descriptions.Item>
                                                            )
                                                        }

                                                        <Descriptions.Item label="Aliases">
                                                            <ul>
                                                                {node.aliases.map((alias) => (
                                                                    <li>{alias}</li>
                                                                ))}
                                                            </ul>
                                                        </Descriptions.Item>
                                                    </Descriptions>
                                                </div>
                                            </Panel>
                                        ))}
                                    </Collapse>
                                </div>
                            </div>
                        )}

                        {Object.keys(nodeDetails).length !== 0 && merge && !nodeDetails[0].some(entity => 'database_id' in entity) && (

                        <div>
                            {/*<div className='fixed-row'>*/}
                            <div className="sticky-title">
                                <h3 style={{color: '#014484', fontSize: 20, fontWeight: 'bold'}}>{nodeDetails[0][0].pmid}</h3>
                            </div>
                            <div className='article-container'>
                                <Collapse accordion activeKey={activeKey} onChange={handleCollapseChange}>
                                    {(nodeDetails[0]).map((node, index) => (
                                        <Panel header={node.title} key={index}>
                                            <div className='edge-article-container'>
                                                {/*<Descriptions title="Edge Details" bordered column={1}>*/}
                                                <Descriptions column={1}  size="small" className="custom-descriptions" style={{borderRadius: '10px'}}>
                                                    <Descriptions.Item label="Title">{node.title}</Descriptions.Item>
                                                    {/*<Descriptions.Item label="Aliases">{node[0].aliases}</Descriptions.Item>*/}

                                                    <Descriptions.Item label="Pmid">{node.pmid}</Descriptions.Item>
                                                    <Descriptions.Item label="Authors">{                                        
                                                        <ul>
                                                            {node.authors != null && (node.authors).map((author) => (
                                                                <li>
                                                                    {author}
                                                                </li>
                                                            ))}
                                                        </ul> 
                                                    }</Descriptions.Item>
                                                    <Descriptions.Item label="N_citation">{node.n_citation}</Descriptions.Item>
                                                    <Descriptions.Item label="Abstract">{node.abstract}</Descriptions.Item>
                                                </Descriptions>
                                            </div>
                                        </Panel>
                                    ))}
                                </Collapse>
                            </div>
                        </div>
                        )}

                        {Object.keys(edgeDetail).length !== 0 && (
                            <div >
                                <div className="sticky-title">
                                    <h3 style={{color: '#014484', fontSize: 20, fontWeight: 'bold'}}>Edges Detail</h3>
                                </div>
                                <div className='article-container'>
                                    <Collapse accordion activeKey={activeKey} onChange={handleCollapseChange}>
                                        {edgeDetail.map((edge, index) => (
                                            <Panel header={`Edge ${index + 1}: ${edge[0].node1} - ${edge[0].node2}`} key={index}>
                                                <div className='edge-article-container'>
                                                    {/*<Descriptions title="Edge Details" bordered column={1}>*/}
                                                    <Descriptions column={1}>
                                                        <Descriptions.Item label="Node 1">{edge[0].node1}</Descriptions.Item>
                                                        <Descriptions.Item label="Node 2">{edge[0].node2}</Descriptions.Item>
                                                        <Descriptions.Item label="Relationship Label">{edge[0]['relationship label']}</Descriptions.Item>
                                                        <Descriptions.Item label="Relationship Type">{edge[0]['relationship type']}</Descriptions.Item>
                                                        <Descriptions.Item label="Number of Citations">
                                                            {/*{edge[0]['number of citations']}*/}
                                                            {edge[0]['number of citations'] !== null ? edge[0]['number of citations'] : 'N/A'}
                                                        </Descriptions.Item>
                                                    </Descriptions>
                                                </div>
                                            </Panel>
                                        ))}
                                    </Collapse>

                                </div>
                            </div>
                        )}

                    </div>
                )}
                
                <Button
                    onClick={props.toggleSidebar}
                    className={buttonClass}
                >
                    { !props.isOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                </Button>
                {props.displayArticleGraph === displayArticleGraphRef.current && (
                    <div className={relatedClass}>
                        {/* {Object.keys(detail).length != 0 && props.detailType == "article" && 'title' in detail && (
                            <Article
                                title={detail.title}
                                authors={detail.authors}
                                pmid={detail.pmid}
                                abstract={detail.abstract}
                                abstract_list={detail.abstract_list}
                            />
                        )}
                        {Object.keys(detail).length != 0 && props.detailType == "term" && 'element_id' in detail && (
                            <Term
                                entity_id={detail.element_id}
                                name={detail.name}
                                aliases={detail.aliases}
                                description={detail.description}
                                type={detail.type}
                                external_id={detail.external_sources}
                            />
                        )} */}
                        {Object.keys(nodeDetails).length !== 0 && (
                            <div>
                                {/*<div className='article-titile'>Related Articles</div>*/}
                                {/*{urls}*/}
                                {/*<div className='article-title'>Related Articles</div>*/}
                                {/*<Title level={4}>Related Articles</Title>*/}
                                <div className="sticky-title">
                                    <h3 style={{color: '#014484', fontSize: 20, fontWeight: 'bold'}}>Related Articles</h3>
                                </div>
                                <div className='article-container'>
                                    <List

                                        size="small"
                                        dataSource={urls} // Assuming 'urls' is an array of URL strings or objects
                                        renderItem={item => (
                                            <List.Item>
                                                {/* Render your URL or article title here */}
                                                {/* Example: <a href={item.url}>{item.title}</a> */}
                                                {item}
                                            </List.Item>
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                        {Object.keys(edgeDetail).length !== 0 && (
                            <div>
                                <div className="sticky-title">
                                    <h3 style={{color: '#014484', fontSize: 20, fontWeight: 'bold'}}>Related Articles</h3>
                                </div>
                                <div className='article-container'>
                                    <Collapse accordion activeKey={activeKey} onChange={handleCollapseChange}>
                                        {edgeDetail.map((edge, edgeIndex) => (
                                            <Panel header={`Edge ${edgeIndex + 1}: ${edge[0].node1} - ${edge[0].node2}`} key={edgeIndex}>
                                                {edge[1] && edge[1].length > 0 ? (
                                                    edge[1].map((url, urlIndex) => (
                                                        <div key={urlIndex} className="custom-div-edge">
                                                            <a href={url[1]} onClick={(event) => handleClick(event, url[1])}>
                                                                {url[0]}
                                                            </a>
                                                            <p> Cited by: {url[2]}, Year: {url[3]}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div>N/A</div>
                                                )}
                                            </Panel>
                                        ))}
                                    </Collapse>

                                </div>
                            </div>
                        )}

                    </div>
                )}
                
            </div>


      );
};

export default Information;