import { apiPath } from '../vnext/api';
export const PLANNER_AGENT_BASE_URL = apiPath('/agent');
export const STREAM_AGENT_BASE_URL = PLANNER_AGENT_BASE_URL;
export const ensurePlannerAgentBaseUrl = async () => PLANNER_AGENT_BASE_URL;
