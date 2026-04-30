/**
 * Functional Data Page API Service
 * 
 * Wraps all API calls to the functional data backend.
 * Base URL: http://pankgraph-functional-alb-231928945.us-east-1.elb.amazonaws.com
 */

const BASE_URL = process.env.REACT_APP_FUNCTIONAL_DATA_API_URL || 
  'http://pankgraph-functional-alb-231928945.us-east-1.elb.amazonaws.com';

/**
 * Health check endpoint
 * @returns {Promise<{status: string}>}
 */
export async function healthCheck() {
  const response = await fetch(`${BASE_URL}/health`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get summary data (options, ranges, traits, metadata)
 * @returns {Promise<{summary, options, ranges, traits}>}
 */
export async function getSummary() {
  const response = await fetch(`${BASE_URL}/api/data/summary`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch summary: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get filtered donors
 * @param {Object} filters - Filter parameters
 * @param {string} [filters.disease] - Disease filter
 * @param {string} [filters.sex] - Sex filter
 * @param {string} [filters.center] - Center filter
 * @param {number} [filters.age_min] - Minimum age
 * @param {number} [filters.age_max] - Maximum age
 * @param {number} [filters.bmi_min] - Minimum BMI
 * @param {number} [filters.bmi_max] - Maximum BMI
 * @returns {Promise<{count: number, donors: Array}>}
 */
export async function getDonors(filters = {}) {
  const params = new URLSearchParams();
  
  if (filters.disease && filters.disease !== '') params.append('disease', filters.disease);
  if (filters.sex && filters.sex !== '') params.append('sex', filters.sex);
  if (filters.center && filters.center !== '') params.append('center', filters.center);
  if (filters.age_min !== undefined && filters.age_min !== null) params.append('age_min', filters.age_min);
  if (filters.age_max !== undefined && filters.age_max !== null) params.append('age_max', filters.age_max);
  if (filters.bmi_min !== undefined && filters.bmi_min !== null) params.append('bmi_min', filters.bmi_min);
  if (filters.bmi_max !== undefined && filters.bmi_max !== null) params.append('bmi_max', filters.bmi_max);

  const url = `${BASE_URL}/api/data/donors${params.toString() ? '?' + params.toString() : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch donors: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get cohort trace data (Step 2 Response Type chart)
 * @param {string} trace_type - Type of trace (e.g., 'ins_ieq')
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>}
 */
export async function getCohortTraces(trace_type = 'ins_ieq', filters = {}) {
  const params = new URLSearchParams();
  params.append('trace_type', trace_type);
  
  if (filters.disease && filters.disease !== '') params.append('disease', filters.disease);
  if (filters.sex && filters.sex !== '') params.append('sex', filters.sex);
  if (filters.center && filters.center !== '') params.append('center', filters.center);
  if (filters.age_min !== undefined && filters.age_min !== null) params.append('age_min', filters.age_min);
  if (filters.age_max !== undefined && filters.age_max !== null) params.append('age_max', filters.age_max);
  if (filters.bmi_min !== undefined && filters.bmi_min !== null) params.append('bmi_min', filters.bmi_min);
  if (filters.bmi_max !== undefined && filters.bmi_max !== null) params.append('bmi_max', filters.bmi_max);

  const url = `${BASE_URL}/api/charts/cohort-traces?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch cohort traces: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get cohort trace chart as PNG
 * @param {string} trace_type - Type of trace
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Blob>}
 */
export async function getCohortTracesPng(trace_type = 'ins_ieq', filters = {}) {
  const params = new URLSearchParams();
  params.append('trace_type', trace_type);
  
  if (filters.disease && filters.disease !== '') params.append('disease', filters.disease);
  if (filters.sex && filters.sex !== '') params.append('sex', filters.sex);
  if (filters.center && filters.center !== '') params.append('center', filters.center);
  if (filters.age_min !== undefined && filters.age_min !== null) params.append('age_min', filters.age_min);
  if (filters.age_max !== undefined && filters.age_max !== null) params.append('age_max', filters.age_max);
  if (filters.bmi_min !== undefined && filters.bmi_min !== null) params.append('bmi_min', filters.bmi_min);
  if (filters.bmi_max !== undefined && filters.bmi_max !== null) params.append('bmi_max', filters.bmi_max);

  const url = `${BASE_URL}/api/charts/cohort-traces.png?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch trace chart image: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Get trait distribution summary (Step 3 Trait Select chart)
 * @param {string} trait - Trait name
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>}
 */
export async function getTraitSummary(trait = 'INS-IEQ G 16.7 SI', filters = {}) {
  const params = new URLSearchParams();
  params.append('trait', trait);
  
  if (filters.disease && filters.disease !== '') params.append('disease', filters.disease);
  if (filters.sex && filters.sex !== '') params.append('sex', filters.sex);
  if (filters.center && filters.center !== '') params.append('center', filters.center);
  if (filters.age_min !== undefined && filters.age_min !== null) params.append('age_min', filters.age_min);
  if (filters.age_max !== undefined && filters.age_max !== null) params.append('age_max', filters.age_max);
  if (filters.bmi_min !== undefined && filters.bmi_min !== null) params.append('bmi_min', filters.bmi_min);
  if (filters.bmi_max !== undefined && filters.bmi_max !== null) params.append('bmi_max', filters.bmi_max);

  const url = `${BASE_URL}/api/charts/trait-summary?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch trait summary: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get trait distribution chart as PNG
 * @param {string} trait - Trait name
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Blob>}
 */
export async function getTraitSummaryPng(trait = 'INS-IEQ G 16.7 SI', filters = {}) {
  const params = new URLSearchParams();
  params.append('trait', trait);
  
  if (filters.disease && filters.disease !== '') params.append('disease', filters.disease);
  if (filters.sex && filters.sex !== '') params.append('sex', filters.sex);
  if (filters.center && filters.center !== '') params.append('center', filters.center);
  if (filters.age_min !== undefined && filters.age_min !== null) params.append('age_min', filters.age_min);
  if (filters.age_max !== undefined && filters.age_max !== null) params.append('age_max', filters.age_max);
  if (filters.bmi_min !== undefined && filters.bmi_min !== null) params.append('bmi_min', filters.bmi_min);
  if (filters.bmi_max !== undefined && filters.bmi_max !== null) params.append('bmi_max', filters.bmi_max);

  const url = `${BASE_URL}/api/charts/trait-summary.png?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch trait chart image: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Get association data (scatter plot: x_key vs y_trait)
 * @param {string} x_key - X-axis variable (e.g., 'age', 'bmi')
 * @param {string} y_trait - Y-axis trait name
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>}
 */
export async function getAssociation(x_key = 'age', y_trait = 'INS-IEQ G 16.7 AUC', filters = {}) {
  const params = new URLSearchParams();
  params.append('x_key', x_key);
  params.append('y_trait', y_trait);
  
  if (filters.disease && filters.disease !== '') params.append('disease', filters.disease);
  if (filters.sex && filters.sex !== '') params.append('sex', filters.sex);
  if (filters.center && filters.center !== '') params.append('center', filters.center);
  if (filters.age_min !== undefined && filters.age_min !== null) params.append('age_min', filters.age_min);
  if (filters.age_max !== undefined && filters.age_max !== null) params.append('age_max', filters.age_max);
  if (filters.bmi_min !== undefined && filters.bmi_min !== null) params.append('bmi_min', filters.bmi_min);
  if (filters.bmi_max !== undefined && filters.bmi_max !== null) params.append('bmi_max', filters.bmi_max);

  const url = `${BASE_URL}/api/charts/association?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch association data: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get association chart as PNG
 * @param {string} x_key - X-axis variable
 * @param {string} y_trait - Y-axis trait
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Blob>}
 */
export async function getAssociationPng(x_key = 'age', y_trait = 'INS-IEQ G 16.7 AUC', filters = {}) {
  const params = new URLSearchParams();
  params.append('x_key', x_key);
  params.append('y_trait', y_trait);
  
  if (filters.disease && filters.disease !== '') params.append('disease', filters.disease);
  if (filters.sex && filters.sex !== '') params.append('sex', filters.sex);
  if (filters.center && filters.center !== '') params.append('center', filters.center);
  if (filters.age_min !== undefined && filters.age_min !== null) params.append('age_min', filters.age_min);
  if (filters.age_max !== undefined && filters.age_max !== null) params.append('age_max', filters.age_max);
  if (filters.bmi_min !== undefined && filters.bmi_min !== null) params.append('bmi_min', filters.bmi_min);
  if (filters.bmi_max !== undefined && filters.bmi_max !== null) params.append('bmi_max', filters.bmi_max);

  const url = `${BASE_URL}/api/charts/association.png?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch association chart image: ${response.statusText}`);
  }
  return response.blob();
}

export default {
  healthCheck,
  getSummary,
  getDonors,
  getCohortTraces,
  getCohortTracesPng,
  getTraitSummary,
  getTraitSummaryPng,
  getAssociation,
  getAssociationPng,
};
