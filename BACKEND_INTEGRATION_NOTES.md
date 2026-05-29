# FunctionalDataPage Backend Integration

## Overview
Completed full backend API integration for the FunctionalDataPage component. The page now dynamically fetches data from the functional data backend API.

## API Service
**File:** `src/utils/functionalDataApi.js`

### Configuration
- **Base URL:** `http://pankgraph-functional-alb-231928945.us-east-1.elb.amazonaws.com`
- **Configurable via env:** `REACT_APP_FUNCTIONAL_DATA_API_URL`

### Available Endpoints
1. **`healthCheck()`** - Health check
2. **`getSummary()`** - Get filter options, ranges, traits, and metadata
3. **`getDonors(filters)`** - Get filtered donor list
4. **`getCohortTraces(trace_type, filters)`** - Get trace data (JSON)
5. **`getCohortTracesPng(trace_type, filters)`** - Get trace chart (PNG image)
6. **`getTraitSummary(trait, filters)`** - Get trait distribution data (JSON)
7. **`getTraitSummaryPng(trait, filters)`** - Get trait chart (PNG image)
8. **`getAssociation(x_key, y_trait, filters)`** - Get scatter plot data (JSON)
9. **`getAssociationPng(x_key, y_trait, filters)`** - Get scatter plot chart (PNG image)

## Component Integration
**File:** `src/pages/FunctionalDataPage.js`

### State Management
- **Summary Data:** `summaryData` - filter options, ranges, traits
- **Donor Data:** `donorData` - filtered donor list with count
- **Chart Data:** `traceImageUrl`, `traitImageUrl` - PNG chart images (blob URLs)
- **Loading States:** 4 separate loading flags for parallel data fetching
- **Error States:** Captured and displayed to users

### Data Flow
1. **Component Mount** → Fetch summary (options, ranges, traits)
2. **Filter Change** → Fetch donors list (Step 5 table updates dynamically)
3. **Filter Change** → Fetch trace chart PNG (Step 2 Response Type chart)
4. **Trait Change** → Fetch trait summary PNG (Step 3 Trait Select chart)

### Enhanced Components
- **ChartPlaceholder:** Now supports loading state spinner, error messages, and actual chart images from blob URLs
- **Dynamic Donor Count:** Updates based on API response (shows `{count} donors selected (X% of total)`)
- **Donor Table:** Populates from API response with proper formatting

##Key Features
- ✅ Filter-driven data updates (Disease, Sex, Center, Age, BMI)
- ✅ Loading spinners during data fetches
- ✅ Error handling with user-friendly messages
- ✅ Chart images served as PNG blobs from backend
- ✅ Dynamic donor count and percentage calculation
- ✅ Response type and trait selection with API integration
- ✅ Parallel data fetching for optimal performance

## Configuration (Optional)
To use a different API endpoint, set environment variable before build:
```bash
REACT_APP_FUNCTIONAL_DATA_API_URL=http://your-custom-api.com npm start
```

## Testing
Health check endpoint test:
```bash
curl http://pankgraph-functional-alb-231928945.us-east-1.elb.amazonaws.com/health
```

Expected response:
```json
{"status": "ok"}
```

## Notes
- All filter parameters are optional (null/empty strings are excluded from requests)
- Chart images are fetched as PNG blobs and converted to object URLs for display
- Age and BMI range sliders trigger immediate data refetch
- Trait selection changes fetch new chart without re-fetching donor list
