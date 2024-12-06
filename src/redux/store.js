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
const store = configureStore({
    reducer: {
        viewSchema: viewSchemaReducer,
        catalog: catalogReducer,
        queryResult: queryResultReducer,
        aiAnswer: aiAnswerReducer,
        processedQuestion: processedQuestionReducer,
        typeToImage: typeToImageReducer,
        inputToVocab: inputToVocabReducer,
        search: searchReducer,
        variables: variablesReducer,
        queryVisResult: queryVisResultReducer,
    },
});

export { store };
