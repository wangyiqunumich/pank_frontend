import { configureStore } from '@reduxjs/toolkit'
import viewSchemaReducer from './viewSchemaSlice'
import queryResultReducer from './queryResultSlice'
import catalogReducer from './catalogSlice'
import aiAnswerReducer from './aiAnswerSlice'
import processedQuestionReducer from './processedQuestionSlice'
import typeToImageReducer from './typeToImageSlice'

const store = configureStore({
    reducer: {
        viewSchema: viewSchemaReducer,
        catalog: catalogReducer,
        queryResult: queryResultReducer,
        aiAnswer: aiAnswerReducer,
        processedQuestion: processedQuestionReducer,
        typeToImage: typeToImageReducer,
        // [apiSlice.reducerPath]: apiSlice.reducer,
    },
});

export { store };
