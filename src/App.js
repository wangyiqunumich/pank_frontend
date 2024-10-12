import './App.css';
import {useDispatch, useSelector} from "react-redux";
import {queryViewSchema} from "./redux/viewSchemaSlice";
import {queryQueryResult} from "./redux/queryResultSlice";
import {queryCatalog} from "./redux/catalogSlice";
import {queryAiAnswer} from "./redux/aiAnswerSlice";

function App() {
  const {viewSchema, queryViewSchemaStatus, queryViewSchemaErrorMessage} = useSelector((state) => state.viewSchema);
  const dispatch = useDispatch();

  const testViewSchemaOnClick = () => {
      dispatch(queryViewSchema({sourceTerm: 'fdsa', relationship: 'flld', targetTerm: 'fdkl'})).unwrap();
  }
    const testQueryResultOnClick = () => {
        dispatch(queryQueryResult({query: 'MATCH (n1) RETURN (n1) LIMIT 2;'})).unwrap();
    }

    const testCatalogOnClick = () => {
        dispatch(queryCatalog({imageType: 'testtype'})).unwrap();
    }

    const testAiAnswerOnClick = () => {
        dispatch(queryAiAnswer("{question: 'testtype', graph: 'subgraph'}")).unwrap();
    }

  return (
    <div className="App">
        <button onClick={testViewSchemaOnClick}>test view schema connection</button>
        <button onClick={testQueryResultOnClick}>test query result connection</button>
        <button onClick={testCatalogOnClick}>test catalog connection</button>
        <button onClick={testAiAnswerOnClick}>test ai answer connection</button>
      <header className="App-header">
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
