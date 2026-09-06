import axios from 'axios';
import { apiPath } from '../vnext/api';
export const flaskBackendAxiosInstance = axios.create({ baseURL: apiPath('') });
export const flaskBackendAxiosInstanceNew = flaskBackendAxiosInstance;
