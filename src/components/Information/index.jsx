import React, { useState, useEffect } from 'react'
import './scoped.css'
import Article from './article'
import Term from './term'
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
    const [nodeDetail, setNodeDetail] = useState({});
    const [edgeDetail, setEdgeDetail] = useState({});
    const [activeKey, setActiveKey] = useState(0);

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
        async function searchInfoNode(content) {
            let detailServ = new DetailService()
            const response = await detailServ.Nid2Detail(content)
            setNodeDetail(response.data)
            setEdgeDetail({})
        }
        async function searchInfoEdge(content) {
            let detailServ = new DetailService()
            console.log(content)
            const response = await detailServ.Eid2Detail(content[0], content[1])
            console.log(response.data)
            const sample_data = [[{"node1":"Neoplasms","node2":"Breast Neoplasms","number of citations":1,"relationship label":"Semantic_relationship","relationship type":"Negative_Correlation"},
                [["Tumor suppression effect of Solanum nigrum polysaccharide fraction on Breast cancer via immunomodulation. (2016)","https://pubmed.ncbi.nlm.nih.gov/27365117/"]]],
                [{"node1":"Breast Neoplasms","node2":"Neoplasms","number of citations":2,"relationship label":"Semantic_relationship","relationship type":"Positive_Correlation"},
                    [["Immunohistochemical expression of metallothionein in invasive breast cancer in relation to proliferative activity, histology and prognosis. (1996)","https://pubmed.ncbi.nlm.nih.gov/8604236/"],["Long-term exposure to elevated levels of circulating TIMP-1 but not mammary TIMP-1 suppresses growth of mammary carcinomas in transgenic mice. (2004)","https://pubmed.ncbi.nlm.nih.gov/15166086/"]]],
                [{"node1":"Breast Neoplasms","node2":"Neoplasms","number of citations":1,"relationship label":"Semantic_relationship","relationship type":"Negative_Correlation"},[["Effect of catechol estrogens on rat mammary tumors. (1979)","https://pubmed.ncbi.nlm.nih.gov/115583/"]]],
                ]
            setEdgeDetail(sample_data);
            //setEdgeDetail(response.data)
            setNodeDetail({})
        }
        if (props.detailId) {
            if (!Array.isArray(props.detailId)) {
                searchInfoNode(props.detailId);
            }
            else{
                searchInfoEdge(props.detailId);
            }
        }
    }, [props.detailId]);


    const nodeForMap = (url) => {
        return(
            <div>
                <a href={url[1]} onClick={(event) => handleClick(event, url[1])}>{url[0]}</a>
            </div>
        )
    }
    const urls = Object.keys(nodeDetail).length !== 0 ? nodeDetail[1].map(nodeForMap) : []

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
        if (Object.keys(nodeDetail).length !== 0) {
            const elements = [];
            for (const source in nodeDetail[0].external_sources) {
                elements.push(
                    <div>
                      {source}: {nodeDetail[0].external_sources[source]}
                    </div>
                );
            }
            return elements;
        }
    }
    // if (Object.keys(nodeDetail).length !== 0) {
    //     console.log(nodeDetail[0]);
    //
    // }
    if (Object.keys(edgeDetail).length !== 0) {
        console.log(edgeDetail);

    }
    // if (!detail) {
    //     return <div>Loading</div>
    // }

//     return (
//         <div>
//             <div className={informationClass}>
//                 {Object.keys(props.detail).length != 0 && props.detailType == "article" && (
//                     <Article
//                         title={props.detail.title}
//                         authors={props.detail.authors}
//                         pmid={props.detail.pmid}
//                         abstract={props.detail.abstract}
//                         abstract_list={props.detail.abstract_list}
//                     />
//                 )}
//                 {Object.keys(props.detail).length != 0 && props.detailType == "term" && (
//                     <Term
//                         entity_id={props.detail.element_id}
//                         name={props.detail.name}
//                         aliases={props.detail.aliases}
//                         description={props.detail.description}
//                         type={props.detail.type}
//                         external_id={props.detail.external_sources}
//                     />
//                 )}
//             </div>
//             <Button
//                 onClick={props.toggleSidebar}
//                 className={buttonClass}
//             >
//                 { !props.isOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
//             </Button>
//         </div>

//   );
        return (
            <div>
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
                    {Object.keys(nodeDetail).length === 0 && Object.keys(edgeDetail).length === 0 && (
                       <div className='article-container'>
                            <div>Loading... or you have not yet select any node or edge</div>
                       </div>
                    )}
                    {Object.keys(nodeDetail).length !== 0 && (

                        <div className='article-container'>
                            <Title level={4}>Node Details</Title>
                            <Descriptions bordered column={1}  size="small" className="custom-descriptions">
                                <Descriptions.Item label="Entity ID">{nodeDetail[0].element_id}</Descriptions.Item>
                                <Descriptions.Item label="Name">{nodeDetail[0].name}</Descriptions.Item>
                                <Descriptions.Item label="Aliases">{nodeDetail[0].aliases}</Descriptions.Item>
                                <Descriptions.Item label="Description">{nodeDetail[0].description}</Descriptions.Item>
                                <Descriptions.Item label="Type">{nodeDetail[0].type}</Descriptions.Item>
                                <Descriptions.Item label="External ID">{renderExternal()}</Descriptions.Item>
                            </Descriptions>
                            {/*<div className='article-titile'>Entity ID: {nodeDetail[0].element_id}</div>*/}
                            {/*<div className='article-titile'>Name: {nodeDetail[0].name}</div>*/}
                            {/*<div className='article-titile'>Aliases: {nodeDetail[0].aliases}</div>*/}
                            {/*<div className='article-titile'>Description: {nodeDetail[0].description}</div>*/}
                            {/*<div className='article-titile'>Type: {nodeDetail[0].type}</div>*/}
                            {/*<div className='article-titile'>*/}
                            {/*External ID: {renderExternal()}*/}
                            {/*</div>*/}
                        </div>
                    )}
                    {Object.keys(edgeDetail).length !== 0 && (
                        <div className='article-container'>
                            <Title level={4}>Edges Detail</Title>
                            <Collapse accordion activeKey={activeKey} onChange={handleCollapseChange}>
                                {edgeDetail.map((edge, index) => (
                                    <Panel header={`Edge ${index + 1}: ${edge[0].node1} - ${edge[0].node2}`} key={index}>
                                        <div className='edge-article-container'>
                                            {/*<Descriptions title="Edge Details" bordered column={1}>*/}
                                            <Descriptions bordered column={1}>
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
                    )}

                </div>
                <Button
                    onClick={props.toggleSidebar}
                    className={buttonClass}
                >
                    { !props.isOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                </Button>
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
                    {Object.keys(nodeDetail).length !== 0 && (
                        <div className='article-container'>
                            {/*<div className='article-titile'>Related Articles</div>*/}
                            {/*{urls}*/}
                            {/*<div className='article-title'>Related Articles</div>*/}
                            <Title level={4}>Related Articles</Title>
                            <List
                                size="small"
                                bordered
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
                    )}
                    {Object.keys(edgeDetail).length !== 0 && (
                        <div className='article-container'>
                            <Title level={4}>Related Articles</Title>
                            <Collapse accordion activeKey={activeKey} onChange={handleCollapseChange}>
                                {edgeDetail.map((edge, edgeIndex) => (
                                    <Panel header={`Edge ${edgeIndex + 1}`} key={edgeIndex}>
                                        {edge[1] && edge[1].length > 0 ? (
                                            edge[1].map((url, urlIndex) => (
                                                <div key={urlIndex}>
                                                    <a href={url[1]} onClick={(event) => handleClick(event, url[1])}>
                                                        {url[0]}
                                                    </a>
                                                </div>
                                            ))
                                        ) : (
                                            <div>N/A</div>
                                        )}
                                    </Panel>
                                ))}
                            </Collapse>
                        </div>
                    )}

                </div>
            </div>


      );
};
export default Information;
