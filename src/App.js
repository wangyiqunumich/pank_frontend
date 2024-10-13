import './App.css';
import NavBar from './NavBar';
import SearchBar from './SearchBar';
import { useSelector, useDispatch } from 'react-redux';
import { queryViewSchema } from './redux/viewSchemaSlice';
import { queryQueryResult } from './redux/queryResultSlice';
import { queryCatalog } from './redux/catalogSlice';
import { queryAiAnswer } from './redux/aiAnswerSlice';

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
      <NavBar />
      <SearchBar />
    </div>
  );
}

export default App;
