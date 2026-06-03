const PRIMARY_PLANNER_AGENT_BASE_URL = 'https://jieliulab3.dcmb.med.umich.edu/pankgraph-agent';
const SECONDARY_PLANNER_AGENT_BASE_URL = 'https://agent.pankgraph.org';
const PLANNER_AGENT_BASE_URL_CANDIDATES = [
	PRIMARY_PLANNER_AGENT_BASE_URL,
	SECONDARY_PLANNER_AGENT_BASE_URL,
];
const HEALTH_CHECK_TIMEOUT_MS = 6000;

export let PLANNER_AGENT_BASE_URL = PRIMARY_PLANNER_AGENT_BASE_URL;

// unused:
// export const PLANNER_AGENT_BASE_URL = 'https://pankgraph-ai-agent-gpu-manually-381685410.us-east-1.elb.amazonaws.com';
export const STREAM_AGENT_BASE_URL = 'https://agent.pankgraph.org';

let plannerEndpointResolved = false;
let plannerEndpointCheckPromise = null;

const checkPlannerEndpointHealth = async (baseUrl) => {
	const normalized = String(baseUrl || '').trim().replace(/\/+$/, '');
	if (!normalized) return false;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

	try {
		const response = await fetch(`${normalized}/health`, {
			method: 'GET',
			signal: controller.signal,
		});
		if (!response.ok) return false;

		let payload = null;
		try {
			payload = await response.json();
		} catch (err) {
			payload = null;
		}

		const status = String(payload?.status || '').toLowerCase();
		// If backend omits status but health returned 2xx, still treat it as accessible.
		return !status || status === 'healthy' || status === 'ok';
	} catch (err) {
		return false;
	} finally {
		clearTimeout(timer);
	}
};

export const ensurePlannerAgentBaseUrl = async ({ force = false } = {}) => {
	if (plannerEndpointResolved && !force) {
		return PLANNER_AGENT_BASE_URL;
	}

	if (plannerEndpointCheckPromise && !force) {
		return plannerEndpointCheckPromise;
	}

	plannerEndpointCheckPromise = (async () => {
		for (const candidate of PLANNER_AGENT_BASE_URL_CANDIDATES) {
			const healthy = await checkPlannerEndpointHealth(candidate);
			if (healthy) {
				PLANNER_AGENT_BASE_URL = candidate;
				plannerEndpointResolved = true;
				return candidate;
			}
		}

		// Keep primary endpoint when both probes fail, preserving previous behavior.
		PLANNER_AGENT_BASE_URL = PRIMARY_PLANNER_AGENT_BASE_URL;
		plannerEndpointResolved = true;
		return PLANNER_AGENT_BASE_URL;
	})();

	try {
		return await plannerEndpointCheckPromise;
	} finally {
		plannerEndpointCheckPromise = null;
	}
};

if (typeof window !== 'undefined') {
	// Probe once when the website starts; runtime uses cached selection unless force=true.
	void ensurePlannerAgentBaseUrl();
}
