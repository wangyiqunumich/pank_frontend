# Tools in the development demo

## QTL Explorer

Choose a gene, a variant, or both. Continue to the record-selection page and choose a source and credible set. The result explains that selected record and displays its graph evidence. No planning page is required.

A credible set is a group of candidate variants for a signal. PIP describes a variant's statistical support under the fine-mapping model; it is not effect size or proof of causality. A graph may show the signal's lead variant while the variant you searched for is another member of its credible set. Check which variant each statistic describes.

## GWAS Explorer

Enter a variant and select a recorded T1D GWAS signal. The result explains the selected association and its available evidence. An association does not establish that a variant causes disease. Missing indexed records or downloads do not establish that no evidence exists elsewhere.

## Functional Data

Select the donor filters and hormone response in the existing tool. Inspect its plots, then use the interpretation action to explain that exact filtered cohort. The answer receives the complete bounded mean trace and the recorded stimulus windows. It does not run a new graph or literature search.

Insulin and glucagon measurements retain their recorded units and normalization. Cohort means do not show how every individual donor responded. The answer includes the same filtered plot as supporting evidence when the source API supplies it.

The demo accesses the existing functional-data service through its own backend. It has not moved that source dataset onto jieliu3. If the source is unavailable, the tool reports that failure.

## Answers and availability

These tools use Sonnet 5 with the demo's interpretation rules and shared development budget. Refreshing an identical saved presentation does not request another answer. New data or interpretation versions can produce a new presentation.

Graph evidence, supplementary files and plots have separate availability states. A successful answer does not guarantee that every download is available. Some QTL resources are partial, and the tested GWAS source download remains unavailable. Existing documentation describes broader PanKgraph features; this page describes the isolated demo specifically.
