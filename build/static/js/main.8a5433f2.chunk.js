(this["webpackJsonpmy-app"]=this["webpackJsonpmy-app"]||[]).push([[0],{120:function(e,t,a){},170:function(e,t,a){},226:function(e,t,a){},254:function(e,t,a){},336:function(e,t,a){"use strict";a.r(t);var n=a(0),c=a(48),i=a.n(c),d=a(6),r=a(2),s=a(11),l=a(20),o=a(17),u=(a(175),a(348)),h=a(208),b=a(352),j=(a(226),a.p+"static/media/glkb_home_logo.b7fe247f.png"),f=a.p+"static/media/MedSchoolLogo.65898f5f.png",O=a(5),m=(h.a.Search,function(){var e=Object(o.m)(),t=function(){var t=Object(l.a)(Object(s.a)().mark((function t(a){var n;return Object(s.a)().wrap((function(t){for(;;)switch(t.prev=t.next){case 0:n=i.join("|"),console.log(n),e("/result?q=".concat(n));case 3:case"end":return t.stop()}}),t)})));return function(e){return t.apply(this,arguments)}}(),a=Object(n.useState)([]),c=Object(r.a)(a,2),i=c[0],m=c[1],p=Object(n.useState)(!1),v=Object(r.a)(p,2),g=v[0],x=v[1],y=Object(n.useState)(""),N=Object(r.a)(y,2),A=N[0],k=N[1];Object(n.useEffect)((function(){var e;g&&(null===(e=inputRef.current)||void 0===e||e.focus())}),[g]);var S=function(){A&&-1===i.indexOf(A)&&m([].concat(Object(d.a)(i),[A])),x(!1),k("")},F=i.map((function(e){var t=Object(O.jsx)(b.a,{className:"tag-box",closable:!0,onClose:function(t){t.preventDefault(),function(e){var t=i.filter((function(t){return t!==e}));console.log(t),m(t)}(e)},style:{border:"1px solid #4F4F4F",borderRadius:"18px"},children:e});return Object(O.jsx)("span",{style:{display:"inline-block"},children:t},e)}));return Object(O.jsxs)("div",{className:"home-container",children:[Object(O.jsxs)("div",{className:"home-head-container",children:[Object(O.jsx)("img",{src:j,style:{height:100}}),Object(O.jsx)("div",{className:"head-text",children:"A database and data mining platform for biomedical literature"}),Object(O.jsxs)("div",{className:"search-container",children:[Object(O.jsxs)("div",{className:"termContainer",children:[Object(O.jsx)("h2",{children:"Terms"}),Object(O.jsx)("div",{style:{marginBottom:16},children:Object(O.jsx)(u.a,{enter:{scale:.8,opacity:0,type:"from",duration:100},onEnd:function(e){"appear"!==e.type&&"enter"!==e.type||(e.target.style="display: inline-block")},leave:{opacity:0,width:0,scale:0,duration:200},appear:!1,children:F})})]}),Object(O.jsx)("button",{onClick:t,className:"map-button",children:"Map Terms!"}),Object(O.jsx)(h.a,{type:"text",size:"large",placeholder:"Input terms here, hit enter to confirm the term",className:"search-bar",value:A,onChange:function(e){k(e.target.value)},onBlur:S,onPressEnter:S})]})]}),Object(O.jsxs)("div",{className:"footer-container",children:[Object(O.jsx)("div",{className:"UMichLogo-container",children:Object(O.jsx)("img",{src:f,style:{height:100}})}),Object(O.jsx)("div",{className:"Department-container",children:"Department of Computational Medicine and Bioinformatics"}),Object(O.jsx)("div",{className:"contact-container",children:Object(O.jsx)("div",{className:"contact-heading",children:"Contacts:"})}),Object(O.jsx)("div",{className:"address-container",children:"Palmer Commons 2035D, Ann Arbor, MI 48109"}),Object(O.jsx)("div",{className:"footnote-container",children:"This website is free and open to all users and there is no login requirement. User cookies are not collected."})]})]})}),p=(a(231),a(36)),v=a(13),g=a(14),x=a(73),y=a.n(x),N=function(){function e(){Object(v.a)(this,e)}return Object(g.a)(e,[{key:"Article2Cypher",value:function(){var e=Object(l.a)(Object(s.a)().mark((function e(t){var a;return Object(s.a)().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return console.log("article to cypher"),console.log(t),a=[],{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"},params:{query:t}},e.next=6,y.a.get("/api/1.0/frontend_term2graph?query="+t).then((function(e){a=e})).catch((function(e){console.log("error",e)}));case 6:return e.abrupt("return",a);case 7:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}()}]),e}(),A=function(){function e(){Object(v.a)(this,e)}return Object(g.a)(e,[{key:"Nid2Detail",value:function(){var e=Object(l.a)(Object(s.a)().mark((function e(t){var a;return Object(s.a)().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return console.log("node to detail"),a=[],e.next=4,y.a.get("/api/1.0/frontend_node_detail/"+t).then((function(e){a=e})).catch((function(e){console.log("error",e)}));case 4:return e.abrupt("return",a);case 5:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}()},{key:"Eid2Detail",value:function(){var e=Object(l.a)(Object(s.a)().mark((function e(t){var a;return Object(s.a)().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return console.log("edge to detail"),a=[],e.next=4,y.a.get("/api/1.0/frontend_rel_detail/"+t).then((function(e){a=e})).catch((function(e){console.log("error",e)}));case 4:return e.abrupt("return",a);case 5:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}()}]),e}(),k=a(353),S=a(354),F=a(355),G=(a(254),a.p+"static/media/glkb_logo.98cc616c.png"),q=a.p+"static/media/um_logo.3d55f8ef.jpg",w=(a(255),a(120),a(351)),E=a(83),P=a(356),I=a(357),C=(a(347),w.a.Panel,a(350)),M=a(349),_=w.a.Panel,T=function(e){var t=Object(n.useState)([]),a=Object(r.a)(t,2),c=(a[0],a[1],Object(n.useState)([])),i=Object(r.a)(c,2),d=(i[0],i[1],Object(n.useState)([])),s=Object(r.a)(d,2),l=(s[0],s[1],Object(n.useState)([])),o=Object(r.a)(l,2),u=(o[0],o[1],Object(n.useState)([])),h=Object(r.a)(u,2),b=(h[0],h[1],Object(n.useState)([])),j=Object(r.a)(b,2);j[0],j[1];return Object(O.jsx)(w.a,{expandIconPosition:"end",size:"small",ghost:!0,defaultActiveKey:1,children:Object(O.jsx)(_,{header:"Genomic Terms Density Control",children:Object(O.jsxs)("div",{children:[Object(O.jsxs)("div",{children:[Object(O.jsxs)(k.a,{children:[Object(O.jsx)(S.a,{span:12,children:"Frequency"}),Object(O.jsx)(S.a,{span:6,children:Object(O.jsx)(C.a,{defaultValue:e.minGtdcFreq,value:e.gtdcFreq[0],onBlur:e.handleGtdcFreq1,onPressEnter:e.handleGtdcFreq1,min:e.minGtdcFreq,max:e.maxGtdcFreq})}),Object(O.jsx)(S.a,{span:6,children:Object(O.jsx)(C.a,{defaultValue:e.maxGtdcFreq,value:e.gtdcFreq[1],onBlur:e.handleGtdcFreq2,onPressEnter:e.handleGtdcFreq2,min:e.minGtdcFreq,max:e.maxGtdcFreq})})]}),Object(O.jsx)(M.a,{range:!0,value:e.gtdcFreq,onChange:e.handleGtdcFreq,min:e.minGtdcFreq,max:e.maxGtdcFreq})]}),Object(O.jsxs)("div",{children:[Object(O.jsxs)(k.a,{children:[Object(O.jsx)(S.a,{span:12,children:"Recency"}),Object(O.jsx)(S.a,{span:6,children:Object(O.jsx)(C.a,{value:e.adcPd[0],onBlur:e.handleAdcPd1,onPressEnter:e.handleAdcPd1,min:e.minAdcPd,max:e.maxAdcPd})}),Object(O.jsx)(S.a,{span:6,children:Object(O.jsx)(C.a,{value:e.adcPd[1],onBlur:e.handleAdcPd2,onPressEnter:e.handleAdcPd2,min:e.minAdcPd,max:e.maxAdcPd})})]}),Object(O.jsx)(M.a,{range:!0,value:e.adcPd,onChange:e.handleAdcPd,min:e.minAdcPd,max:e.maxAdcPd})]}),Object(O.jsxs)("div",{children:[Object(O.jsxs)(k.a,{children:[Object(O.jsx)(S.a,{span:12,children:"Number of Citations"}),Object(O.jsx)(S.a,{span:6,children:Object(O.jsx)(C.a,{defaultValue:e.minGtdcNoc,value:e.gtdcNoc[0],onBlur:e.handleGtdcNoc1,onPressEnter:e.handleGtdcNoc1,min:e.minGtdcNoc,max:e.maxGtdcNoc})}),Object(O.jsx)(S.a,{span:6,children:Object(O.jsx)(C.a,{defaultValue:e.maxGtdcNoc,value:e.gtdcNoc[1],onBlur:e.handleGtdcNoc2,onPressEnter:e.handleGtdcNoc2,min:e.minGtdcNoc,max:e.maxGtdcNoc})})]}),Object(O.jsx)(M.a,{range:!0,value:e.gtdcNoc,onChange:e.handleGtdcNoc,min:e.minGtdcNoc,max:e.maxGtdcNoc})]})]})},"1")})},D=a(3),R=a(8),V=a(345),B=a(346),K=function(){function e(){Object(v.a)(this,e)}return Object(g.a)(e,[{key:"AddNodes",value:function(){var e=Object(l.a)(Object(s.a)().mark((function e(t,a){var n;return Object(s.a)().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return console.log("add nodes"),n=[],e.next=4,y.a.get("/api//1.0/frontend_add_nodes?existing="+t+"&new="+a).then((function(e){n=e})).catch((function(e){console.log("error",e)}));case 4:return e.abrupt("return",n);case 5:case"end":return e.stop()}}),e)})));return function(t,a){return e.apply(this,arguments)}}()}]),e}(),L=["children"],z=["dataSource","targetKeys"],J=function(e){var t=[];if(e.data.nodes)for(var a=0;a<e.data.nodes.length;a++)t.push(e.data.nodes[a].data.id);var c=[],i={};0!=e.allNodes.length&&(e.allNodes.forEach((function(e,t){var a=e.type.split(";")[0];i[a]||(i[a]={key:a,title:a,children:[]}),i[a].children.push({key:e.id,title:e.name})})),c=Object.values(i));var o=[];if(e.data.nodes)for(var u=function(){var t=e.data.nodes[h],a=t.data.label,n={key:t.data.id,title:t.data.display},c=o.find((function(e){return e.key===a}));c?c.children.push(n):o.push({key:a,title:a,children:[n]})},h=0;h<e.data.nodes.length;h++)u();for(var b=Object(n.useState)(t),j=Object(r.a)(b,2),f=j[0],m=j[1],p=Object(n.useState)(o),v=Object(r.a)(p,2),g=v[0],x=v[1],y=[],N=0;N<o.length;N++)y.push(o[N].children.map((function(e){return e.key})).join("|"));var A=y.join("|"),k=c,S=e.isTableOpen?"table open":"table",F=function e(){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:[];return(arguments.length>0&&void 0!==arguments[0]?arguments[0]:[]).map((function(a){var n=a.children,c=Object(R.a)(a,L);return Object(D.a)(Object(D.a)({},c),{},{disabled:t.includes(c.key),children:e(n,t)})}))},G=function(e,t){var a=e.node,n=e.onItemSelect,c=e.onItemSelectAll,i=a.checked,r=a.halfCheckedKeys,s=a.node,l=s.key,o=s.children;if((null===o||void 0===o?void 0:o.length)>0){var u=[];if("left"===t){var h=!1;g.length>0?null===g||void 0===g||g.map((function(e){var t,a;(null===(t=e.childCompanies)||void 0===t?void 0:t.length)>0&&e.key==l?null===(a=childCompanies.filter((function(t){return!e.childCompanies.some((function(e){return e.key===t.key}))})))||void 0===a||a.forEach((function(e){u.push(e.key)})):h=!0})):h=!0,h&&(null===o||void 0===o||o.forEach((function(e){u.push(e.key)}))),c([].concat(u,[l]),i)}"right"===t&&(null===o||void 0===o||o.forEach((function(e){u.push(e.key)})),c([].concat(u),i))}else if(i){var b="";k.forEach((function(e){var t;null!==e&&void 0!==e&&e.children&&(null===(t=e.children)||void 0===t||t.forEach((function(t){(null===t||void 0===t?void 0:t.key)===l&&(b=null===e||void 0===e?void 0:e.key)})))})),null!==r&&void 0!==r&&r.includes(b)||""==b?n(l,i):c([l,b],i)}else{var j=[];void 0==(j=[null===r||void 0===r?void 0:r[0]]||!1)[0]&&k.forEach((function(e){var t;e.children&&(null===(t=e.children)||void 0===t||t.forEach((function(t){(null===t||void 0===t?void 0:t.key)===l&&j.push(null===e||void 0===e?void 0:e.key)})))})),c([].concat(Object(d.a)(j),[l]),i)}},q=function(e){var t=e.dataSource,a=e.targetKeys,n=Object(R.a)(e,z),c=[],i=t,r=Object(d.a)(g);return function e(){(arguments.length>0&&void 0!==arguments[0]?arguments[0]:[]).forEach((function(t){c.push(t),e(t.children)}))}(t),Object(O.jsx)(V.a,Object(D.a)(Object(D.a)({},n),{},{targetKeys:a,dataSource:c,className:"tree-transfer",showSearch:!0,showSelectAll:!0,render:function(e){return e.title},rowKey:function(e){return e.key},onSearch:function(e,a){var n="left"===e?i:g,c=null===n||void 0===n?void 0:n.map((function(e){var t;(e=Object.assign({},e)).children&&(e.children=null===(t=e.children)||void 0===t?void 0:t.filter((function(e){return e.title.indexOf(a)>-1})));return e})).filter((function(e){var t,n;(null===(t=e.children)||void 0===t?void 0:t.length)>0||0==a.length?null===(n=(e=Object.assign({},e)).children)||void 0===n||n.filter((function(t){return t.title.indexOf(a)>-1?"":e.title.indexOf(a)>-1})):e=e.title.indexOf(a)>-1;return e}));"left"===e&&(t=c),"right"===e&&(r=c)},children:function(e){var n=e.direction,c=e.onItemSelect,i=e.onItemSelectAll,s=e.selectedKeys;if("left"===n){var l=[].concat(Object(d.a)(s),Object(d.a)(a));return Object(O.jsx)(B.a,{height:200,blockNode:!0,checkable:!0,defaultExpandAll:!0,checkedKeys:l,treeData:F(t,a),fieldNames:{title:"title",key:"key",children:"children"},onCheck:function(e,t){G({node:t,onItemSelect:c,onItemSelectAll:i},n)},onSelect:function(e,t){G({node:t,onItemSelect:c,onItemSelectAll:i},n)}})}if("right"===n){var o=Object(d.a)(s);return Object(O.jsx)(B.a,{height:200,blockNode:!0,checkable:!0,defaultExpandAll:!0,checkedKeys:o,treeData:r,fieldNames:{title:"title",key:"key",children:"children"},onCheck:function(e,t){G({node:t,onItemSelect:c,onItemSelectAll:i},n)},onSelect:function(e,t){G({node:t,onItemSelect:c,onItemSelectAll:i},n)}})}}}))};function w(){return w=Object(l.a)(Object(s.a)().mark((function t(a,n){var c,i,d,r;return Object(s.a)().wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return c=new K,t.next=3,c.AddNodes(a,n);case 3:for(i=t.sent,console.log(i),d=JSON.parse(JSON.stringify(e.data)),r=0;r<i.data.nodes.length;r++)d.nodes.push({data:i.data.nodes[r]});for(r=0;r<i.data.links.length;r++)d.edges.push({data:i.data.links[r]});e.setData(d);case 9:case"end":return t.stop()}}),t)}))),w.apply(this,arguments)}return console.log(g),Object(O.jsxs)("div",{className:S,style:{width:"80%",marginLeft:"10%",alignItems:"center"},children:[Object(O.jsx)(E.a,{onClick:function(){e.isTableOpen||e.toggleTable()},type:"primary",children:"Add New Nodes"}),Object(O.jsx)(q,{dataSource:k,targetKeys:f,onChange:function(e,t,a){var n=1;"left"==t&&(n=0,e.length>0&&k.forEach((function(t){var n,c,i=e.indexOf(t.key);i>-1&&(null===(n=t.children)||void 0===n?void 0:n.length)>0&&(null===(c=t.children)||void 0===c||c.forEach((function(t){a.includes(t.key)&&e.splice(i,1)})))}))),m(e),function(e,t){var a=Object(d.a)(g);(null===e||void 0===e?void 0:e.length)>0&&(e.forEach((function(e){k.forEach((function(n){if(e===n.key){var c,i,r,s,l=a.findIndex((function(t){return t.key===e}));1===t?-1===l?a.push(n):l>-1&&(null===(c=a)||void 0===c||null===(i=c[l])||void 0===i||null===(r=i.children)||void 0===r?void 0:r.length)<(null===n||void 0===n||null===(s=n.children)||void 0===s?void 0:s.length)&&(a.splice(l,1),a.push(n)):0===t&&l>-1&&a.splice(l,1)}else{var o,u,h="",b={};if((null===n||void 0===n||null===(o=n.children)||void 0===o?void 0:o.length)>0&&n.children.forEach((function(t){e===t.key&&(h=n.key,b=t)})),(null===(u=Object.keys(b))||void 0===u?void 0:u.length)>0){var j={},f=a.findIndex((function(e){return e.key===h}));if(f>-1){var O,m=Object(d.a)(a[f].children),p=null===m||void 0===m?void 0:m.findIndex((function(e){return e.key===b.key}));-1===p&&1===t&&a[f].children.push(b),p>-1&&0===t&&(a[f].children.splice(p,1),0===(null===(O=a[f].children)||void 0===O?void 0:O.length)&&a.splice(f,1))}else 1===t?((j=Object(D.a)({},n)).children=[],j.children.push(b),a.push(j)):0===t&&(a=[])}}}))})),x(a))}(1===n?e:a,n)}}),Object(O.jsx)(E.a,{onClick:function(){if(e.isTableOpen){for(var t=[],a=0;a<g.length;a++)t.push(g[a].children.map((function(e){return e.key})).join("|"));var n=t.join("|").split("|"),c=A.split("|"),i=n.filter((function(e){return!c.includes(e)})).join("|");i&&(console.log(i),function(e,t){w.apply(this,arguments)}(A,i)),e.setGraphData(g)}},type:"primary",style:{marginLeft:"96%"},children:"Apply"})]})},U=(w.a.Panel,function(e){var t=e.isOpen?"settings open":"settings",a=e.isOpen?"settings-button open":"settings-button";return Object(O.jsxs)("div",{children:[Object(O.jsx)("div",{className:t,children:Object(O.jsx)(T,{minAdcFreq:e.minAdcFreq,maxAdcFreq:e.maxAdcFreq,minAdcPd:e.minAdcPd,maxAdcPd:e.maxAdcPd,minAdcNoc:e.minAdcNoc,maxAdcNoc:e.maxAdcNoc,minGtdcFreq:e.minGtdcFreq,maxGtdcFreq:e.maxGtdcFreq,minGtdcNoc:e.minGtdcNoc,maxGtdcNoc:e.maxGtdcNoc,adcFreq:e.adcFreq,handleAdcFreq:e.handleAdcFreq,handleAdcFreq1:e.handleAdcFreq1,handleAdcFreq2:e.handleAdcFreq2,adcPd:e.adcPd,handleAdcPd:e.handleAdcPd,handleAdcPd1:e.handleAdcPd1,handleAdcPd2:e.handleAdcPd2,adcNoc:e.adcNoc,handleAdcNoc:e.handleAdcNoc,handleAdcNoc1:e.handleAdcNoc1,handleAdcNoc2:e.handleAdcNoc2,gtdcFreq:e.gtdcFreq,handleGtdcFreq:e.handleGtdcFreq,handleGtdcFreq1:e.handleGtdcFreq1,handleGtdcFreq2:e.handleGtdcFreq2,gtdcNoc:e.gtdcNoc,handleGtdcNoc:e.handleGtdcNoc,handleGtdcNoc1:e.handleGtdcNoc1,handleGtdcNoc2:e.handleGtdcNoc2,setVisibleArticles:e.setVisibleArticles,setVisibleTerms:e.setVisibleTerms,setVisibleRelations:e.setVisibleRelations,articleNodes:e.articleNodes,termNodes:e.termNodes,relationNodes:e.relationNodes,visibleArticles:e.visibleArticles,visibleTerms:e.visibleTerms,visibleRelations:e.visibleRelations})}),Object(O.jsx)(E.a,{onClick:e.toggleSidebar,className:a,children:e.isOpen?Object(O.jsx)(I.a,{}):Object(O.jsx)(P.a,{})}),Object(O.jsx)(J,{isTableOpen:e.isTableOpen,toggleTable:e.toggleTable,data:e.data,setData:e.setData,allNodes:e.allNodes,setGraphData:e.setGraphData})]})}),X=a(173),Z=a(86),H=a.n(Z),Q=a(202),W=a.n(Q),Y=a(203),$=a.n(Y),ee=a(204),te=a.n(ee),ae=a(205),ne=a.n(ae),ce=a(206),ie=a.n(ce);H.a.use(ie.a),H.a.use(W.a),H.a.use($.a),H.a.use(ne.a),H.a.use(te.a);var de=function(e){var t=Object(n.useState)("100%"),a=Object(r.a)(t,2),c=a[0],i=(a[1],Object(n.useState)("80vh")),d=Object(r.a)(i,2),s=d[0];d[1],Object(n.useEffect)((function(){var t,a=Number.MAX_SAFE_INTEGER,n=Number.MIN_SAFE_INTEGER,c=Number.MAX_SAFE_INTEGER,i=Number.MIN_SAFE_INTEGER,d=Number.MAX_SAFE_INTEGER,r=Number.MIN_SAFE_INTEGER,s=Number.MAX_SAFE_INTEGER,l=Number.MIN_SAFE_INTEGER,o=Number.MAX_SAFE_INTEGER,u=Number.MIN_SAFE_INTEGER,h=[],b=[],j=[],f=new Set,O=new Set,m=new Set,v=Object(p.a)(e.data.nodes);try{for(v.s();!(t=v.n()).done;){var g=t.value;if("Article"==g.data.label){if(a=Math.min(a,g.data.frequency),n=Math.max(n,g.data.frequency),c=Math.min(c,g.data.date),i=Math.max(i,g.data.date),d=Math.min(d,g.data.n_citation),r=Math.max(r,g.data.n_citation),!f.has(g.data.display)){var x={key:(h.length+1).toString(),title:g.data.display,description:"article"};h.push(x),f.add(g.data.display)}}else if("Event"!=g.data.label){if(s=Math.min(s,g.data.frequency),l=Math.max(l,g.data.frequency),o=Math.min(o,g.data.n_citation),u=Math.max(u,g.data.n_citation),!O.has(g.data.display)){var y={key:(b.length+1).toString(),title:g.data.display,description:"genomic",label:g.data.label};b.push(y),O.add(g.data.display)}}else if(!f.has(g.data.display)){var N={key:(h.length+1).toString(),title:g.data.display};h.push(N),f.add(g.data.display)}}}catch(G){v.e(G)}finally{v.f()}var A,k=Object(p.a)(e.data.edges);try{for(k.s();!(A=k.n()).done;){var S=A.value;if(!m.has(S.data.label)){var F={key:(j.length+1).toString(),title:S.data.label};j.push(F),m.add(S.data.label)}0!=S.data.dates.length&&(c=Math.min(c,S.data.dates[0].year),i=Math.max(i,S.data.dates[0].year))}}catch(G){k.e(G)}finally{k.f()}e.handleMinAdcFreq(a),e.handleMaxAdcFreq(n),e.handleAdcFreq([a,n]),e.handleMinAdcPd(c),e.handleMaxAdcPd(i),e.handleAdcPd([c,i]),e.handleMinAdcNoc(d),e.handleMaxAdcNoc(r),e.handleAdcNoc([d,r]),e.handleMinGtdcFreq(s),e.handleMaxGtdcFreq(l),e.handleGtdcFreq([s,l]),e.handleMinGtdcNoc(o),e.handleMaxGtdcNoc(u),e.handleGtdcNoc([o,u]),e.setArticleNodes(h),e.setVisibleArticles(h),e.setTermNodes(b),e.setVisibleTerms(b),e.setRelationNodes(j),e.setVisibleRelations(j)}),[e.data]);var l={edges:[],nodes:[]},o={edges:[],nodes:[]},u={edges:[],nodes:[]};for(var h in e.data.nodes)"Article"===e.data.nodes[h].data.label&&l.nodes.push(e.data.nodes[h]),"Article"!==e.data.nodes[h].data.label&&"Event"!==e.data.nodes[h].data.label&&o.nodes.push(e.data.nodes[h]),"Event"!==e.data.nodes[h].data.label&&u.nodes.push(e.data.nodes[h]);for(var h in e.data.edges)"Cite"===e.data.edges[h].data.label&&l.edges.push(e.data.edges[h]),"Cite"!==e.data.edges[h].data.label&&"Contain_vocab"!==e.data.edges[h].data.label&&o.nodes.includes(e.data.nodes.find((function(t){return t.data.id===e.data.edges[h].data.source})))&&o.nodes.includes(e.data.nodes.find((function(t){return t.data.id===e.data.edges[h].data.target})))&&o.edges.push(e.data.edges[h]),"Contain_vocab"===e.data.edges[h].data.label&&u.edges.push(e.data.edges[h]);var b=Object(n.useMemo)((function(){var t={edges:[],nodes:[]},a=function(){var a=e.data.nodes[n].data;a.frequency>=e.gtdcFreq[0]&&a.frequency<=e.gtdcFreq[1]&&a.n_citation>=e.gtdcNoc[0]&&a.n_citation<=e.gtdcNoc[1]&&e.visibleTerms.find((function(e){return e.title===a.display}))&&t.nodes.push(e.data.nodes[n])};for(var n in e.data.nodes)a();var c=function(){var a=e.data.edges[i].data;void 0!=t.nodes.find((function(e){return e.data.id===a.source}))&&void 0!=t.nodes.find((function(e){return e.data.id===a.target}))&&e.visibleRelations.find((function(e){return e.title===a.label}))&&t.edges.push(e.data.edges[i])};for(var i in e.data.edges)c();if(0!=t.edges.length)for(var d=0;d<t.edges.length;d++){if(t.edges[d].data.weight=0,0!=t.edges[d].data.dates.length)for(var r=0;r<t.edges[d].data.dates.length;r++)t.edges[d].data.dates[r].year>=e.adcPd[0]&&t.edges[d].data.dates[r].year<=e.adcPd[1]&&(t.edges[d].data.weight+=t.edges[d].data.dates[r].weight);t.edges[d].data.weight<=0&&(t.edges[d].data.weight=1)}return t}),[e.adcFreq,e.adcPd,e.adcNoc,e.gtdcFreq,e.gtdcNoc,e.visibleArticles,e.visibleTerms,e.visibleRelations]),j=[["Anatomy",0],["Article",0],["Chemicals and Drugs",0],["Diseases",0],["GO",0],["Genes and Gene Products",0],["Journal",0],["Organisms",0],["Pathway",0]],f=[];for(var h in b.nodes)void 0==j.find((function(e){return e.includes(b.nodes[h].data.label)}))&&j.push([b.nodes[h].data.label,b.nodes[h].data.frequency]),j.find((function(e){return e.includes(b.nodes[h].data.label)}))[1]<b.nodes[h].data.frequency&&(j.find((function(e){return e.includes(b.nodes[h].data.label)}))[1]=b.nodes[h].data.frequency),f.push([b.nodes[h].data.id,b.nodes[h].data.label,b.nodes[h].data.frequency]);var m=[{selector:"node.hover",style:{"border-width":"6px","border-color":"#AAD8FF","border-opacity":"0.5","background-color":"#77828C",width:10,height:10,"text-outline-color":"#77828C","text-outline-width":8}},{selector:"node[type='device']",style:{shape:"rectangle"}},{selector:'edge[label="Contain_vocab"]',style:{"curve-style":"haystack",width:1,opacity:"mapData(weight, 1, 100, 0.1, 1)","line-color":"#FF7F50"}},{selector:'edge[label="co_occur"]',style:{"curve-style":"haystack",width:1,opacity:"mapData(weight, 1, 100, 0.1, 1)","line-color":"#008080"}},{selector:'edge[label="Semantic_relationship"]',style:{"curve-style":"haystack",width:1,opacity:"mapData(weight, 1, 100, 0.1, 1)","line-color":"#008080"}},{selector:'edge[label="Hierarchical_structure"]',style:{"curve-style":"haystack",width:1,opacity:"mapData(weight, 1, 100, 0.1, 1)","line-color":"#E0B0FF"}},{selector:'edge[label="Curated_relationship"]',style:{"curve-style":"haystack",width:1,opacity:"mapData(weight, 1, 100, 0.1, 1)","line-color":"#E0B0FF"}},{selector:"node.highlight",style:{"border-color":"#FFF","border-width":"2px"}},{selector:"node.semitransp",style:{opacity:"0.5"}},{selector:"edge.highlight",style:{"mid-target-arrow-color":"#FFF"}},{selector:"edge.semitransp",style:{opacity:"0.2"}}];for(var h in f){j.findIndex((function(e){return e[0]===f[h][1]}));var v="";switch(f[h][1]){case"Anatomy":v="#E43333";break;case"Chemicals and Drugs":v="#E8882F";break;case"Diseases":v="#67BE48";break;case"Genes and Gene Products":v="#46ACAC";break;case"GO":v="#5782C2";break;case"Organisms":v="#9B58C5";break;case"Pathway":v="#D829B1"}m.push({selector:'node[id = "'+f[h][0]+'"]',style:{backgroundColor:v,backgroundOpacity:1,width:10,height:10,label:"data(display)","overlay-padding":"8px","z-index":"10","text-outline-color":"white","text-outline-width":"2px",color:"#666666",fontSize:10}})}return Object(O.jsx)("div",{children:Object(O.jsx)("div",{children:Object(O.jsx)(X.a,{elements:X.a.normalizeElements(b),style:{width:c,height:s},zoomingEnabled:!0,maxZoom:2,minZoom:.5,autounselectify:!1,boxSelectionEnabled:!0,layout:{name:"cola",egdeLengthVal:45,nodeSpacing:5,bundleEdges:!0,animate:!1,animationDuration:1},stylesheet:m,cy:function(t){t,t.unbind("click"),t.on("click",(function(a){var n=a.target;n.isNode&&(n.visibility="hidden",t.elements().removeClass("semitransp"),t.elements().removeClass("highlight"),t.elements().difference(n.outgoers().union(n.incomers())).not(n).addClass("semitransp"),n.addClass("highlight").outgoers().union(n.incomers()).addClass("highlight")),n===t&&(t.elements().removeClass("semitransp"),t.elements().removeClass("highlight"),e.informationOpen&&e.handleInformation(),e.closeTable())})),t.on("mouseover","node",(function(e){e.target.addClass("hover")})),t.on("mouseout","node",(function(e){e.target.removeClass("hover")})),t.bind("click","node",(function(t){var a=t.target;e.handleSelect(a.data()),e.informationOpen||e.handleInformation()})),t.bind("click","edge",(function(t){var a=t.target;console.log(a.data()),e.handleSelect(a.data()),e.informationOpen||e.handleInformation()}))}},JSON.stringify(b))})})};a(170);var re=function(e){var t=e.isOpen?"information open":"information",a=e.isOpen?"information-button open":"information-button",c=e.isOpen?"related open":"related",i=Object(n.useState)({}),d=Object(r.a)(i,2),o=d[0],u=d[1],h=Object(n.useState)({}),b=Object(r.a)(h,2),j=b[0],f=b[1],m=function(e,t){e.preventDefault(),window.open(t,"_blank")};Object(n.useEffect)((function(){function t(){return(t=Object(l.a)(Object(s.a)().mark((function e(t){var a,n;return Object(s.a)().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return a=new A,e.next=3,a.Nid2Detail(t);case 3:n=e.sent,u(n.data),f({});case 6:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function a(){return(a=Object(l.a)(Object(s.a)().mark((function e(t){var a,n;return Object(s.a)().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return a=new A,console.log(t),e.next=4,a.Eid2Detail(t);case 4:n=e.sent,console.log(n.data),f(n.data),u({});case 8:case"end":return e.stop()}}),e)})))).apply(this,arguments)}u({}),f({}),e.detailId&&(Array.isArray(e.detailId)?function(e){a.apply(this,arguments)}(e.detailId[0]):function(e){t.apply(this,arguments)}(e.detailId))}),[e.detailId]);var p=0!==Object.keys(o).length?o[1].map((function(e){return Object(O.jsx)("div",{children:Object(O.jsx)("a",{href:e[1],onClick:function(t){return m(t,e[1])},children:e[0]})})})):[],v=0!==Object.keys(j).length?j[0][1].map((function(e){return Object(O.jsx)("div",{children:Object(O.jsx)("a",{href:e[1],onClick:function(t){return m(t,e[1])},children:e[0]})})})):[];return Object.keys(o).length,Object(O.jsxs)("div",{children:[Object(O.jsxs)("div",{className:t,children:[0==Object.keys(o).length&&0==Object.keys(j).length&&Object(O.jsx)("div",{className:"article-container",children:Object(O.jsx)("div",{children:"Loading"})}),0!=Object.keys(o).length&&Object(O.jsxs)("div",{className:"article-container",children:[Object(O.jsxs)("div",{className:"article-titile",children:["Entity ID: ",o[0].element_id]}),Object(O.jsxs)("div",{className:"article-titile",children:["Name: ",o[0].name]}),Object(O.jsxs)("div",{className:"article-titile",children:["Aliases: ",o[0].aliases]}),Object(O.jsxs)("div",{className:"article-titile",children:["Description: ",o[0].description]}),Object(O.jsxs)("div",{className:"article-titile",children:["Type: ",o[0].type]}),Object(O.jsxs)("div",{className:"article-titile",children:["External ID: ",function(){if(0!==Object.keys(o).length){var e=[];for(var t in o[0].external_sources)e.push(Object(O.jsxs)("div",{children:[t,": ",o[0].external_sources[t]]}));return e}}()]})]}),0!=Object.keys(j).length&&Object(O.jsxs)("div",{className:"article-container",children:[Object(O.jsxs)("div",{className:"article-titile",children:["Node 1: ",j[0][0].node1]}),Object(O.jsxs)("div",{className:"article-titile",children:["Node 2: ",j[0][0].node2]}),Object(O.jsxs)("div",{className:"article-titile",children:["relationship label: ",j[0][0]["relationship label"]]}),Object(O.jsxs)("div",{className:"article-titile",children:["relationship type: ",j[0][0]["relationship type"]]}),Object(O.jsxs)("div",{className:"article-titile",children:["number of citations: ",j[0][0]["number of citations"]]})]})]}),Object(O.jsx)(E.a,{onClick:e.toggleSidebar,className:a,children:e.isOpen?Object(O.jsx)(P.a,{}):Object(O.jsx)(I.a,{})}),Object(O.jsxs)("div",{className:c,children:[0!=Object.keys(o).length&&Object(O.jsxs)("div",{className:"article-container",children:[Object(O.jsx)("div",{className:"article-titile",children:"Related Articles"}),p]}),0!=Object.keys(j).length&&Object(O.jsxs)("div",{className:"article-container",children:[Object(O.jsx)("div",{className:"article-titile",children:"Related Articles"}),v]})]})]})},se=h.a.Search,le=function(){var e=new URLSearchParams(window.location.search).get("q").split("|"),t=Object(n.useState)(e),a=Object(r.a)(t,2),c=a[0],i=a[1],d=Object(n.useState)([]),h=Object(r.a)(d,2),j=h[0],f=h[1],m=Object(n.useState)({}),p=Object(r.a)(m,2),v=p[0],g=(p[1],Object(n.useState)(null)),x=Object(r.a)(g,2),y=x[0],A=x[1],w=Object(n.useState)([]),E=Object(r.a)(w,2),P=E[0],I=E[1],C=Object(n.useState)({}),M=Object(r.a)(C,2),_=M[0],T=M[1],D=Object(n.useState)(),R=Object(r.a)(D,2),V=R[0],B=R[1],K=Object(n.useState)("concentric"),L=Object(r.a)(K,2),z=L[0],J=L[1],X=Object(n.useState)(1/0),Z=Object(r.a)(X,2),H=Z[0],Q=Z[1],W=Object(n.useState)(-1),Y=Object(r.a)(W,2),$=Y[0],ee=Y[1],te=Object(n.useState)(1/0),ae=Object(r.a)(te,2),ne=ae[0],ce=ae[1],ie=Object(n.useState)(-1),le=Object(r.a)(ie,2),oe=le[0],ue=le[1],he=Object(n.useState)(1/0),be=Object(r.a)(he,2),je=be[0],fe=be[1],Oe=Object(n.useState)(-1),me=Object(r.a)(Oe,2),pe=me[0],ve=me[1],ge=Object(n.useState)(1/0),xe=Object(r.a)(ge,2),ye=xe[0],Ne=xe[1],Ae=Object(n.useState)(-1),ke=Object(r.a)(Ae,2),Se=ke[0],Fe=ke[1],Ge=Object(n.useState)(1/0),qe=Object(r.a)(Ge,2),we=qe[0],Ee=qe[1],Pe=Object(n.useState)(-1),Ie=Object(r.a)(Pe,2),Ce=Ie[0],Me=Ie[1],_e=Object(n.useState)([0,0]),Te=Object(r.a)(_e,2),De=Te[0],Re=Te[1],Ve=function(e){Re(e)},Be=Object(n.useState)([0,0]),Ke=Object(r.a)(Be,2),Le=Ke[0],ze=Ke[1],Je=function(e){ze(e)},Ue=Object(n.useState)([0,0]),Xe=Object(r.a)(Ue,2),Ze=Xe[0],He=Xe[1],Qe=function(e){He(e)},We=Object(n.useState)([0,0]),Ye=Object(r.a)(We,2),$e=Ye[0],et=Ye[1],tt=function(e){et(e)},at=Object(n.useState)([0,0]),nt=Object(r.a)(at,2),ct=nt[0],it=nt[1],dt=function(e){it(e)},rt=Object(n.useState)([]),st=Object(r.a)(rt,2),lt=st[0],ot=st[1],ut=Object(n.useState)([]),ht=Object(r.a)(ut,2),bt=ht[0],jt=ht[1],ft=Object(n.useState)([]),Ot=Object(r.a)(ft,2),mt=Ot[0],pt=Ot[1],vt=Object(n.useState)([]),gt=Object(r.a)(vt,2),xt=gt[0],yt=gt[1],Nt=Object(n.useState)([]),At=Object(r.a)(Nt,2),kt=At[0],St=At[1],Ft=Object(n.useState)([]),Gt=Object(r.a)(Ft,2),qt=Gt[0],wt=Gt[1],Et=Object(n.useState)([]),Pt=Object(r.a)(Et,2),It=(Pt[0],Pt[1]),Ct=Object(n.useState)({}),Mt=Object(r.a)(Ct,2),_t=(Mt[0],Mt[1]),Tt=Object(n.useState)(0),Dt=Object(r.a)(Tt,2),Rt=(Dt[0],Dt[1]),Vt=Object(n.useState)(!1),Bt=Object(r.a)(Vt,2),Kt=Bt[0],Lt=Bt[1],zt=Object(n.useState)(!1),Jt=Object(r.a)(zt,2),Ut=(Jt[0],Jt[1]),Xt=Object(n.useState)(""),Zt=Object(r.a)(Xt,2),Ht=Zt[0],Qt=Zt[1],Wt=Object(n.useState)(!1),Yt=Object(r.a)(Wt,2),$t=Yt[0],ea=Yt[1],ta=Object(n.useState)(!1),aa=Object(r.a)(ta,2),na=aa[0],ca=aa[1],ia=Object(n.useState)(!1),da=Object(r.a)(ia,2),ra=da[0],sa=da[1],la=Object(n.useState)(),oa=Object(r.a)(la,2),ua=oa[0],ha=oa[1];Object(n.useEffect)((function(){var e=location.search.slice(3);console.log(e),e?(It([]),Qt(e),ja(e)):It([])}),[location]);var ba=function(){It([]),_t({}),Rt(0),Lt(!1),Ut(!1),Qt("")};function ja(e){return fa.apply(this,arguments)}function fa(){return(fa=Object(l.a)(Object(s.a)().mark((function e(t){var a,n;return Object(s.a)().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return Lt(!1),ma("/result?q=".concat(t)),a=new N,e.next=5,a.Article2Cypher(t);case 5:n=e.sent,console.log("function -> ",n),T(n.data[0]),I(n.data[1]),Lt(!0);case 10:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function Oa(){return(Oa=Object(l.a)(Object(s.a)().mark((function e(t){var a;return Object(s.a)().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:a=t.article_source?[t.eid[0],0]:t.id,console.log(a),A(a);case 3:case"end":return e.stop()}}),e)})))).apply(this,arguments)}Object(n.useEffect)((function(){var e=[];if(V){console.log(_),console.log(V);for(var t=0;t<V.length;t++)for(var a=0;a<V[t].children.length;a++)e.push(V[t].children[a].key);var n=_.nodes.filter((function(t){return e.includes(t.data.id)})),c=_.edges.filter((function(t){return e.includes(t.data.source)&&e.includes(t.data.target)}));ha({nodes:n,edges:c})}else _.edges&&ha(_)}),[V,_]);var ma=Object(o.m)(),pa=function(){var e=Object(l.a)(Object(s.a)().mark((function e(t){return Object(s.a)().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:ma("/");case 1:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}(),va=function(){ca(!na)},ga=c.map((function(e){var t=Object(O.jsx)(b.a,{closable:!0,onClose:function(t){t.preventDefault(),function(e){var t=c.filter((function(t){return t!==e}));if(console.log(t),0!=t.length){i(t);var a=t.join("|");console.log(a),ba(),ma("/result?q=".concat(a)),ja(a)}else pa()}(e)},style:{border:"1px solid #4F4F4F",borderRadius:"18px"},children:e});return Object(O.jsx)("span",{style:{display:"inline-block"},children:t},e)}));return console.log(ua),Object(O.jsxs)("div",{className:"result-container",children:[Object(O.jsx)("div",{className:"heading-container",children:Object(O.jsxs)(k.a,{children:[Object(O.jsx)(S.a,{span:7,children:Object(O.jsx)("div",{className:"GLKB-container",children:Object(O.jsx)("img",{className:"GLKBLogo",src:G,onClick:pa})})}),Object(O.jsx)(S.a,{span:10,children:Object(O.jsx)("div",{className:"heading-search",children:Object(O.jsx)(se,{placeholder:"input search text",enterButton:"Search",onSearch:ja,defaultValue:Ht})})}),Object(O.jsx)(S.a,{span:7,children:Object(O.jsx)("div",{className:"UM-container",children:Object(O.jsx)("img",{className:"UMLogo",src:q})})})]})}),Object(O.jsx)("div",{className:"line"}),Object(O.jsx)("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"45px"},children:Object(O.jsx)("div",{style:{textAlign:"left",width:"600px",padding:"20px",background:"#F6F6F6",borderRadius:"14px"},children:Object(O.jsxs)("div",{style:{display:"inline-flex",alignItems:"center"},children:[Object(O.jsx)("span",{style:{marginRight:"20px"},children:"Term List:"}),Object(O.jsx)(u.a,{enter:{scale:.8,opacity:0,type:"from",duration:100},onEnd:function(e){"appear"!==e.type&&"enter"!==e.type||(e.target.style="display: inline-block")},leave:{opacity:0,width:0,scale:0,duration:200},appear:!1,children:ga})]})})}),Object(O.jsxs)("div",{className:"main-content",children:[!Kt&&Object(O.jsx)("div",{className:"loading-container",children:Object(O.jsx)(F.a,{size:"large"})}),Kt&&Object(O.jsxs)("div",{className:"result-content",children:[Object(O.jsx)(de,{data:ua,view:z,minAdcFreq:H,maxAdcFreq:$,minAdcPd:ne,maxAdcPd:oe,minAdcNoc:je,maxAdcNoc:pe,minGtdcFreq:ye,maxGtdcFreq:Se,minGtdcNoc:we,maxGtdcNoc:Ce,adcFreq:De,handleAdcFreq:Ve,handleMinAdcFreq:function(e){Q(e)},handleMaxAdcFreq:function(e){ee(e)},closeTable:function(){sa(!1)},adcPd:Le,handleAdcPd:Je,handleMinAdcPd:function(e){ce(e)},handleMaxAdcPd:function(e){ue(e)},adcNoc:Ze,handleAdcNoc:Qe,handleMinAdcNoc:function(e){fe(e)},handleMaxAdcNoc:function(e){ve(e)},gtdcFreq:$e,handleGtdcFreq:tt,handleMinGtdcFreq:function(e){Ne(e)},handleMaxGtdcFreq:function(e){Fe(e)},gtdcNoc:ct,handleGtdcNoc:dt,handleMinGtdcNoc:function(e){Ee(e)},handleMaxGtdcNoc:function(e){Me(e)},setArticleNodes:ot,setTermNodes:jt,setRelationNodes:pt,setVisibleArticles:yt,setVisibleTerms:St,setVisibleRelations:wt,visibleArticles:xt,visibleTerms:kt,visibleRelations:qt,setDetailType:f,handleSelect:function(e){return Oa.apply(this,arguments)},handleInformation:va,informationOpen:na}),Object(O.jsx)("span",{children:Object(O.jsx)(U,{minAdcFreq:H,maxAdcFreq:$,minAdcPd:ne,maxAdcPd:oe,minAdcNoc:je,maxAdcNoc:pe,minGtdcFreq:ye,maxGtdcFreq:Se,minGtdcNoc:we,maxGtdcNoc:Ce,isOpen:$t,isTableOpen:ra,toggleSidebar:function(){ea(!$t)},toggleTable:function(){sa(!0)},view:z,handleView:function(e){J(e.target.value)},adcFreq:De,handleAdcFreq:Ve,handleAdcFreq1:function(e){var t=parseInt(e.target.value);Re([t,De[1]])},handleAdcFreq2:function(e){var t=parseInt(e.target.value);Re([De[0],t])},adcPd:Le,handleAdcPd:Je,handleAdcPd1:function(e){var t=parseInt(e.target.value);ze([t,Le[1]])},handleAdcPd2:function(e){var t=parseInt(e.target.value);ze([Le[0],t])},adcNoc:Ze,handleAdcNoc:Qe,handleAdcNoc1:function(e){var t=parseInt(e.target.value);He([t,Ze[1]])},handleAdcNoc2:function(e){var t=parseInt(e.target.value);He([Ze[0],t])},gtdcFreq:$e,handleGtdcFreq:tt,handleGtdcFreq1:function(e){var t=parseInt(e.target.value);et([t,$e[1]])},handleGtdcFreq2:function(e){var t=parseInt(e.target.value);et([$e[0],t])},gtdcNoc:ct,handleGtdcNoc:dt,handleGtdcNoc1:function(e){var t=parseInt(e.target.value);it([t,ct[1]])},handleGtdcNoc2:function(e){var t=parseInt(e.target.value);it([ct[0],t])},setVisibleArticles:yt,setVisibleTerms:St,setVisibleRelations:wt,articleNodes:lt,termNodes:bt,relationNodes:mt,visibleArticles:xt,visibleTerms:kt,visibleRelations:qt,data:_,allNodes:P,setData:T,setGraphData:B})}),Object(O.jsx)("span",{children:Object(O.jsx)(re,{isOpen:na,toggleSidebar:va,detailType:j,detail:v,detailId:y})})]})]})]})},oe=a(128);i.a.render(Object(O.jsx)(oe.a,{children:Object(O.jsxs)(o.c,{children:[Object(O.jsx)(o.a,{path:"/result",element:Object(O.jsx)(le,{})}),Object(O.jsx)(o.a,{eaxt:!0,path:"/",element:Object(O.jsx)(m,{})})]})}),document.getElementById("root"))}},[[336,1,2]]]);
//# sourceMappingURL=main.8a5433f2.chunk.js.map