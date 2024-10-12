import axios from 'axios';
// import * as https from "https";

export const flaskBackendAxiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL + '/' + process.env.REACT_APP_API_GATEWAY_STAGE_NAME
});

// const https = require('https');
// const agent = new https.Agent({
//     rejectUnauthorized: false,
//     requestCert: false,
//     agent: false,
// });
// export const glkbAxiosInstance = axios.create({ //all axios can be used, shown in axios documentation
//     baseURL: process.env.REACT_APP_API_URL,
//     responseType: 'json',
//     withCredentials: true,
//     httpsAgent: agent
// });
