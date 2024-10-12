import { configureStore } from '@reduxjs/toolkit'
import viewSchemaReducer from './viewSchemaSlice'
import queryResultReducer from './queryResultSlice'
import catalogReducer from './catalogSlice'
import aiAnswerReducer from './aiAnswerSlice'

const store = configureStore({
    reducer: {
        // ui: uiReducer,
        viewSchema: viewSchemaReducer,
        catalog: catalogReducer,
        queryResult: queryResultReducer,
        aiAnswer: aiAnswerReducer
        // [apiSlice.reducerPath]: apiSlice.reducer,
    },
    // middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware)
});

export { store };

