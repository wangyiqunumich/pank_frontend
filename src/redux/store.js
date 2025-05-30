import { configureStore } from '@reduxjs/toolkit'
import viewSchemaReducer from './viewSchemaSlice'
import queryResultReducer from './queryResultSlice'
import catalogReducer from './catalogSlice'
import aiAnswerReducer from './aiAnswerSlice'
import processedQuestionReducer from './processedQuestionSlice'
import typeToImageReducer from './typeToImageSlice'
import inputToVocabReducer from './inputToVocabSlice'
import searchReducer from './searchSlice'
import variablesReducer from './variablesSlice'
import queryVisResultReducer from './queryVisResultSlice'
import queryResultPage from './queryResultPage'
import articlesReducer from './articlesSlice'
const store = configureStore({
    reducer: {
        viewSchema: viewSchemaReducer,
        catalog: catalogReducer,
        queryResult: queryResultReducer,
        aiAnswer: aiAnswerReducer,
        articles: articlesReducer,
        processedQuestion: processedQuestionReducer,
        typeToImage: typeToImageReducer,
        inputToVocab: inputToVocabReducer,
        search: searchReducer,
        variables: variablesReducer,
        queryVisResult: queryVisResultReducer,
        queryResultPage: queryResultPage,
    },
});

export { store };
