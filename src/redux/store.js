import { configureStore } from '@reduxjs/toolkit';

import aiAgentReducer from './aiAgentSlice';
import aiAnswerReducer from './aiAnswerSlice';
import articlesReducer from './articlesSlice';
// import catalogReducer from './catalogSlice';
import feedbackReducer from './feedbackSlice';
import graphviewerReducer from './graphviewerSlice';
import inputToVocabReducer from './inputToVocabSlice';
import processedQuestionReducer from './processedQuestionSlice';
import queryResultPage from './queryResultPage';
import queryResultReducer from './queryResultSlice';
// import queryVisResultReducer from './queryVisResultSlice';
import searchReducer from './searchSlice';
import supportingMaterialReducer from './supportingMaterialSlice';
import typeToImageReducer from './typeToImageSlice';
import variablesReducer from './variablesSlice';
import viewSchemaReducer from './viewSchemaSlice';
import hoverReducer from './hoverSlice';

const store = configureStore({
    reducer: {
        viewSchema: viewSchemaReducer,
        // catalog: catalogReducer,
        queryResult: queryResultReducer,
        aiAnswer: aiAnswerReducer,
        articles: articlesReducer,
        processedQuestion: processedQuestionReducer,
        typeToImage: typeToImageReducer,
        inputToVocab: inputToVocabReducer,
        search: searchReducer,
        variables: variablesReducer,
        // queryVisResult: queryVisResultReducer,
        queryResultPage: queryResultPage,
        feedback: feedbackReducer,
        graphviewer: graphviewerReducer,
        supportingMaterial: supportingMaterialReducer,
        aiAgent: aiAgentReducer,
        hover: hoverReducer,
    },
});

export { store };
