import './index.css';
import './styles/designTokens.css';
import './styles/messageStates.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './redux/store';
import { ResultSection } from './vnext/ResultView';
import run from './techDemo/run.json';
import result from './techDemo/result.json';
ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}><BrowserRouter basename="/tech_demo">
    <header style={{padding:'14px 24px',borderBottom:'1px solid #dce8e9',display:'flex',justifyContent:'space-between',gap:16}}>
      <a href="/" style={{color:'#28636a',fontWeight:700,textDecoration:'none'}}>PanKgraph</a>
      <span style={{fontSize:13,color:'#64748b'}}>Interactive scmap demo</span>
    </header>
    <main style={{maxWidth:1600,margin:'0 auto',padding:'16px',width:'100%',boxSizing:'border-box'}}>
      <ResultSection run={run} result={result} planning={false} busy={false} anchorPrefix="tech-demo" />
    </main>
  </BrowserRouter></Provider>
);
