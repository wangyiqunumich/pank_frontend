import { configureStore } from '@reduxjs/toolkit'
import viewSchemaReducer from './viewSchemaSlice'
import queryResultReducer from './queryResultSlice'
import catalogReducer from './catalogSlice'
import aiAnswerReducer from './aiAnswerSlice'
import processedQuestionReducer from './processedQuestionSlice'

const store = configureStore({
    reducer: {
        viewSchema: viewSchemaReducer,
        catalog: catalogReducer,
        queryResult: queryResultReducer,
        aiAnswer: aiAnswerReducer,
        processedQuestion: processedQuestionReducer
    },
});

export { store };
