import axios from 'axios';

import {
  createAsyncThunk,
  createSlice,
} from '@reduxjs/toolkit';
import { QueryStatus } from '@reduxjs/toolkit/query';

const PUBMED_CACHE_KEY = "pank_pubmed_esummary_cache_v1";
const PUBMED_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const canUseLocalStorage = () => (
    typeof window !== "undefined"
    && typeof window.localStorage !== "undefined"
);

const readPubmedCache = () => {
    if (!canUseLocalStorage()) return {};
    try {
        const raw = window.localStorage.getItem(PUBMED_CACHE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
        return {};
    }
};

const writePubmedCache = (cacheMap) => {
    if (!canUseLocalStorage()) return;
    try {
        window.localStorage.setItem(PUBMED_CACHE_KEY, JSON.stringify(cacheMap));
    } catch (e) {
        // Ignore storage errors (quota/private mode).
    }
};

const normalizePmids = (rawIds) => {
    const source = Array.isArray(rawIds) ? rawIds.join(",") : String(rawIds || "");
    const seen = new Set();
    return source
        .split(",")
        .map((id) => String(id || "").trim())
        .filter((id) => {
            if (!id) return false;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
};

export const queryArticles = createAsyncThunk('/queryArticles',
    async (payload) => {
        const requestedPmids = normalizePmids(payload?.id);
        if (!requestedPmids.length) {
            return { result: { uids: [] } };
        }

        const now = Date.now();
        const cacheMap = readPubmedCache();

        const isExpired = (entry) => {
            const updatedAt = Number(entry?.updatedAt || 0);
            if (!updatedAt) return true;
            return (now - updatedAt) > PUBMED_CACHE_TTL_MS;
        };

        const pmidsToFetch = requestedPmids.filter((pmid) => {
            const entry = cacheMap?.[pmid];
            if (!entry || !entry.data) return true;
            return isExpired(entry);
        });

        let fetchedData = {};
        if (pmidsToFetch.length) {
            const response = await axios.post(
                'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi',
                {
                    ...payload,
                    id: pmidsToFetch.join(","),
                },
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );
            fetchedData = response?.data || {};

            const fetchedResult = fetchedData?.result || {};
            pmidsToFetch.forEach((pmid) => {
                if (fetchedResult?.[pmid]) {
                    cacheMap[pmid] = {
                        data: fetchedResult[pmid],
                        updatedAt: now,
                    };
                }
            });
            writePubmedCache(cacheMap);
        }

        const mergedResult = {
            ...(fetchedData?.result || {}),
            uids: requestedPmids,
        };

        requestedPmids.forEach((pmid) => {
            if (mergedResult[pmid]) return;
            const cached = cacheMap?.[pmid]?.data;
            if (cached) {
                mergedResult[pmid] = cached;
            }
        });

        return {
            ...fetchedData,
            result: mergedResult,
        };
    });

export const ArticlesSlice = createSlice({
    name: 'articles',
    initialState: {
        Articles: {},
        queryArticlesStatus: QueryStatus.uninitialized, // This is auto updated
        queryArticlesErrorMessage: ''
    },
    // reducers: {}
    extraReducers: (builder) => {
        builder
            .addCase(queryArticles.pending, (state) => {
                state.queryArticlesStatus = QueryStatus.pending;
            })
            .addCase(queryArticles.fulfilled, (state, action) => {
                state.Articles = action.payload;
                state.queryArticlesStatus = QueryStatus.fulfilled;
            })
            .addCase(queryArticles.rejected, (state, action) => {
                state.queryArticlesErrorMessage = action.error.message;
                state.queryArticlesStatus = QueryStatus.rejected;
            });
    }
});

// export const {} = ArticlesSlice.actions;

export default ArticlesSlice.reducer;
