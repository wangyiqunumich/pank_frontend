export const MOCK_PLAN_NEW_QUERY_PENDING = {
  session_id: '96375bf8c6c9',
  answer: '',
  answer_markdown: '',
  route: 'new_query_pending',
  round: 1,
  plan_markdown: `## Interpreted Question

What are the key trends, stimulus responses, and donor variability in insulin secretion by IEQ for the HPAP center, for donors aged 3–65 with BMI 12–45.5?

## Query Plan (parallel)

Comprehensive insulin secretion analysis: fetch cohort traces for insulin (IEQ-normalized) and trait summaries for key stimulation indices, all filtered by center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5.

### Steps

1. [Functional] Get functional data summary for center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5 — **20 rows**
2. [Functional] Get insulin cohort traces (ins_ieq) for center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5 — **114 rows**
3. [Functional] Get trait summary for INS-G 16.7 SI, top 8 donors, center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5 — **0 rows**
4. [Functional] Get trait summary for INS-G 16.7 + IBMX 100 SI, top 8 donors, center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5 — **0 rows**
5. [Functional] Get trait summary for INS-KCl 20 AUC (ng/100 IEQs), top 8 donors, center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5 — **0 rows**
6. [Functional] Get trait summary for INS-1st AUC (ng/100 IEQs), top 8 donors, center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5 — **0 rows**
7. [Functional] Get donors with center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5 — **114 rows**
8. **Literature retrieval** — **enabled**

**Scope:** islet functional assays, literature (pending)

---
Type a revision, **confirm** to generate the answer, or **new** for a different question.`,
  plan_json: {
    plan_type: 'parallel',
    interpreted_question:
      'What are the key trends, stimulus responses, and donor variability in insulin secretion by IEQ for the HPAP center, for donors aged 3–65 with BMI 12–45.5?',
    reasoning:
      'Comprehensive insulin secretion analysis: fetch cohort traces for insulin (IEQ-normalized) and trait summaries for key stimulation indices, all filtered by center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5.',
    steps: [
      {
        id: 1,
        natural_language:
          'Get functional data summary for center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5',
        source: 'functional_data',
        join_var: null,
        depends_on: null,
        cypher: '',
        functional_data_api: {
          endpoint: '/api/data/summary',
          url: 'https://functional.pankgraph.org/api/data/summary',
          params: {},
        },
      },
      {
        id: 2,
        natural_language:
          'Get insulin cohort traces (ins_ieq) for center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5',
        source: 'functional_data',
        join_var: null,
        depends_on: null,
        cypher: '',
        functional_data_api: {
          endpoint: '/api/charts/cohort-traces',
          url: 'https://functional.pankgraph.org/api/charts/cohort-traces?trace_type=ins_ieq&center=HPAP&age_min=3.0&age_max=65.0&bmi_min=12.0&bmi_max=45.5',
          params: {
            trace_type: 'ins_ieq',
            center: 'HPAP',
            age_min: 3.0,
            age_max: 65.0,
            bmi_min: 12.0,
            bmi_max: 45.5,
          },
        },
      },
      {
        id: 3,
        natural_language:
          'Get trait summary for INS-G 16.7 SI, top 8 donors, center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5',
        source: 'functional_data',
        join_var: null,
        depends_on: null,
        cypher: '',
        functional_data_api: {
          endpoint: '/api/charts/trait-summary',
          url: 'https://functional.pankgraph.org/api/charts/trait-summary?trait=INS-G+16.7+SI&limit=8&center=HPAP&age_min=3.0&age_max=65.0&bmi_min=12.0&bmi_max=45.5',
          params: {
            trait: 'INS-G 16.7 SI',
            limit: 8,
            center: 'HPAP',
            age_min: 3.0,
            age_max: 65.0,
            bmi_min: 12.0,
            bmi_max: 45.5,
          },
        },
      },
      {
        id: 4,
        natural_language:
          'Get trait summary for INS-G 16.7 + IBMX 100 SI, top 8 donors, center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5',
        source: 'functional_data',
        join_var: null,
        depends_on: null,
        cypher: '',
        functional_data_api: {
          endpoint: '/api/charts/trait-summary',
          url: 'https://functional.pankgraph.org/api/charts/trait-summary?trait=INS-G+16.7+%2B+IBMX+100+SI&limit=8&center=HPAP&age_min=3.0&age_max=65.0&bmi_min=12.0&bmi_max=45.5',
          params: {
            trait: 'INS-G 16.7 + IBMX 100 SI',
            limit: 8,
            center: 'HPAP',
            age_min: 3.0,
            age_max: 65.0,
            bmi_min: 12.0,
            bmi_max: 45.5,
          },
        },
      },
      {
        id: 5,
        natural_language:
          'Get trait summary for INS-KCl 20 AUC (ng/100 IEQs), top 8 donors, center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5',
        source: 'functional_data',
        join_var: null,
        depends_on: null,
        cypher: '',
        functional_data_api: {
          endpoint: '/api/charts/trait-summary',
          url: 'https://functional.pankgraph.org/api/charts/trait-summary?trait=INS-KCl+20+AUC+%28ng%2F100+IEQs%29&limit=8&center=HPAP&age_min=3.0&age_max=65.0&bmi_min=12.0&bmi_max=45.5',
          params: {
            trait: 'INS-KCl 20 AUC (ng/100 IEQs)',
            limit: 8,
            center: 'HPAP',
            age_min: 3.0,
            age_max: 65.0,
            bmi_min: 12.0,
            bmi_max: 45.5,
          },
        },
      },
      {
        id: 6,
        natural_language:
          'Get trait summary for INS-1st AUC (ng/100 IEQs), top 8 donors, center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5',
        source: 'functional_data',
        join_var: null,
        depends_on: null,
        cypher: '',
        functional_data_api: {
          endpoint: '/api/charts/trait-summary',
          url: 'https://functional.pankgraph.org/api/charts/trait-summary?trait=INS-1st+AUC+%28ng%2F100+IEQs%29&limit=8&center=HPAP&age_min=3.0&age_max=65.0&bmi_min=12.0&bmi_max=45.5',
          params: {
            trait: 'INS-1st AUC (ng/100 IEQs)',
            limit: 8,
            center: 'HPAP',
            age_min: 3.0,
            age_max: 65.0,
            bmi_min: 12.0,
            bmi_max: 45.5,
          },
        },
      },
      {
        id: 7,
        natural_language:
          'Get donors with center=HPAP, age_min=3, age_max=65, bmi_min=12, bmi_max=45.5',
        source: 'functional_data',
        join_var: null,
        depends_on: null,
        cypher: '',
        functional_data_api: {
          endpoint: '/api/data/donors',
          url: 'https://functional.pankgraph.org/api/data/donors?center=HPAP&age_min=3.0&age_max=65.0&bmi_min=12.0&bmi_max=45.5',
          params: {
            center: 'HPAP',
            age_min: 3.0,
            age_max: 65.0,
            bmi_min: 12.0,
            bmi_max: 45.5,
          },
        },
      },
    ],
  },
  pending_plan_session_id: '09dbc74af8da',
  history_compressed: false,
  processing_time_ms: 53288.64598274231,
};
