import { configureStore } from '@reduxjs/toolkit';

import aiAnswerReducer from './aiAnswerSlice';
import articlesReducer from './articlesSlice';
import catalogReducer from './catalogSlice';
import feedbackReducer from './feedbackSlice';
import inputToVocabReducer from './inputToVocabSlice';
import processedQuestionReducer from './processedQuestionSlice';
import queryResultPage from './queryResultPage';
import queryResultReducer from './queryResultSlice';
import queryVisResultReducer from './queryVisResultSlice';
import searchReducer from './searchSlice';
import typeToImageReducer from './typeToImageSlice';
import variablesReducer from './variablesSlice';
import viewSchemaReducer from './viewSchemaSlice';

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
        feedback: feedbackReducer,
    },
});

export { store };
