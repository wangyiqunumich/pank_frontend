import axios from 'axios';

export const flaskBackendAxiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL + '/' + process.env.REACT_APP_API_GATEWAY_STAGE_NAME
});
