<script>
import Vue from "vue";
import { formatMetric, formatPValue } from "./ligerFormat";
import HeatTable from "./HeatTable.vue";

const GENE_SET_PREVIEW_ROWS = 25;

// Show every match by default; the thresholds are opt-in filters.
const THRESHOLDS = [
    { key: "all", label: "All matches" },
    { key: "p", label: "GSEA P < 0.05" },
    { key: "q", label: "GSEA q < 0.05" },
];

// Overview previews are top-N slices, not significance filters -- the sections
// say so beside their headings, because "top" on its own does not tell the reader
// whether a row is there because it is good or only because it is the best
// available.
const PREVIEW_GENE_ROWS = 5;
const PREVIEW_MATCH_ROWS = 3;
const PREVIEW_TRAIT_ROWS = 4;

// Inline detail for an inferred gene program.
//
// A program has no curation record: `gene-program-factor` returns the factor id,
// a label, the model and an ordered top-gene list, and nothing else. So the
// overview reports that identity plus the QC signature evidence, which is the
// only thing in the API that speaks to whether the program is worth reading
// biologically. It does not assert a quality class -- the panel used to show one
// ("Exploratory biological") that no endpoint returns.
export default Vue.component("ProgramDetails", {
    components: {
        HeatTable
    },

    props: {
        content: {
            type: Object,
            default: null
        },
        title: {
            type: String,
            default: ""
        },
        loading: {
            type: Boolean,
            default: false
        }
    },

    data() {
        return {
            activeTab: "overview",
            showAllGeneSets: false,
            thresholds: THRESHOLDS,
            matchThreshold: "all",
        };
    },

    computed: {
        // QC last: it is a caveat on the program rather than one of its biological
        // associations, so it reads as the end of the list rather than interrupting
        // the run of association tabs.
        tabs() {
            return [
                { key: "overview", label: "Overview" },
                { key: "genes", label: "Gene loadings", count: this.topGenes.rows.length },
                { key: "matches", label: "State matches", count: this.curatedMatches.length },
                { key: "traits", label: "Traits", count: this.traitRows.length },
                { key: "genesets", label: "Gene sets", count: this.geneSetRows.length },
                { key: "qc", label: "QC signatures", count: this.qcRows.length },
            ];
        },
        summaryFields() {
            return (this.content && this.content.summaryFields) || [];
        },
        qcEvidence() {
            return (this.content && this.content.qcEvidence) ||
                { total: 0, significantQ: 0, significantP: 0, selfLabelledQc: false };
        },
        qcRows() {
            return (this.content && this.content.qcRows) || [];
        },
        curatedMatches() {
            return (this.content && this.content.curatedMatches) || [];
        },
        filteredMatches() {
            if (this.matchThreshold === "p") {
                return this.curatedMatches.filter((row) => row.gseaP !== null && row.gseaP < 0.05);
            }

            if (this.matchThreshold === "q") {
                return this.curatedMatches.filter((row) => row.gseaQ !== null && row.gseaQ < 0.05);
            }

            return this.curatedMatches;
        },
        topGenes() {
            return (this.content && this.content.topGenes) || { mode: "loading", total: 0, rows: [] };
        },
        hiddenTopGeneCount() {
            return Math.max(0, (this.topGenes.total || 0) - this.topGenes.rows.length);
        },
        traitRows() {
            return (this.content && this.content.traitRows) || [];
        },
        traitRowsTotal() {
            return (this.content && this.content.traitRowsTotal) || 0;
        },
        geneSetRows() {
            return (this.content && this.content.geneSetRows) || [];
        },
        visibleGeneSetRows() {
            if (this.showAllGeneSets) {
                return this.geneSetRows;
            }

            return this.geneSetRows.slice(0, GENE_SET_PREVIEW_ROWS);
        },
        hiddenGeneSetRowCount() {
            return Math.max(0, this.geneSetRows.length - this.visibleGeneSetRows.length);
        },
        previewMatches() {
            return this.curatedMatches.slice(0, PREVIEW_MATCH_ROWS);
        },
        previewMatchesAreSignificant() {
            return this.previewMatches.some((row) => row.gseaQ !== null && row.gseaQ < 0.05);
        },
        previewGenes() {
            return this.topGenes.rows.slice(0, PREVIEW_GENE_ROWS);
        },
        previewTraits() {
            return this.traitRows.slice(0, PREVIEW_TRAIT_ROWS);
        },
        // These previews rank, they do not filter -- no significance threshold is
        // applied, so each note names the ranking statistic rather than a cutoff.
        // `previewMatchesAreSignificant` is what flags the case where the best rows
        // are still not significant.
        genePreviewRule() {
            return this.topGenes.mode === "loading"
                ? `Top ${this.previewGenes.length} by loading`
                : `First ${this.previewGenes.length} in rank order`;
        },
        matchPreviewRule() {
            return `Top ${this.previewMatches.length} by GSEA q`;
        },
        traitPreviewRule() {
            return `Top ${this.previewTraits.length} by |beta|`;
        },
        // The relationship heatmap returns GSEA P and q and nothing else, so these
        // are the only columns. It previously also showed a correlation and a
        // match score, neither of which the index sends.
        stateColumns() {
            return [
                { key: "label", label: "Cell state" },
                { key: "gseaP", label: "GSEA P", scale: "pvalue" },
                { key: "gseaQ", label: "GSEA q", scale: "pvalue" },
                { key: "negLogQ", label: "-log10(q)", scale: "sequential" },
            ];
        },
        stateRows() {
            return this.filteredMatches.map((row) => ({
                key: `${row.stateId}-${row.programId || ''}`,
                label: row.stateLabel,
                raw: row,
                values: {
                    gseaP: row.gseaP,
                    gseaQ: row.gseaQ,
                    negLogQ: row.negLogQ,
                },
            }));
        },
        traitColumns() {
            return [
                { key: "label", label: "Trait" },
                { key: "beta", label: "Joint beta", scale: "diverging" },
                { key: "betaUncorrected", label: "Marginal beta", scale: "diverging" },
            ];
        },
        // Grouped by phenotype group, as the old trait matrix was.
        traitGroups() {
            let groups = [];
            let byLabel = {};

            this.traitRows.forEach((row) => {
                let label = row.group || "Other";

                if (!byLabel[label]) {
                    byLabel[label] = { label, rows: [] };
                    groups.push(byLabel[label]);
                }

                byLabel[label].rows.push({
                    key: row.trait,
                    label: row.trait,
                    raw: row,
                    values: {
                        beta: row.beta,
                        betaUncorrected: row.betaUncorrected,
                    },
                });
            });

            return groups;
        },
    },

    watch: {
        content() {
            this.activeTab = "overview";
            this.showAllGeneSets = false;
            this.matchThreshold = "all";
        },
    },

    methods: {
        formatMetric,
        formatPValue,
        selectTab(key) {
            this.activeTab = key;
        },
        geneLoadingText(row) {
            return this.topGenes.mode === "loading"
                ? `${row.gene} ${formatMetric(row.loading)}`
                : `${row.rank}. ${row.gene}`;
        },
    },
});
</script>

<template>
    <div class="detail-panel-wrap">
        <div class="detail-header">
            <div class="detail-header-main f-col g-5">
                <div class="detail-eyebrow">Inferred program</div>
                <h4 class="detail-title bold">{{ title }}</h4>
                <p class="detail-lede">
                    Programs are inferred by matrix factorization. The title is the
                    factorization's own summary of the program; there is no curation record
                    behind it.
                </p>
            </div>
            <!-- Same corner as the state panel's curation record: what identifies
                 this record, opposite the name. -->
            <div class="detail-curation-summary">
                <dl v-if="summaryFields.length" class="detail-field-grid">
                    <template v-for="field in summaryFields">
                        <dt :key="`${field.label}-dt`">{{ field.label }}</dt>
                        <dd :key="`${field.label}-dd`">{{ field.value }}</dd>
                    </template>
                </dl>
                <div v-else class="empty-state">No program metadata reported.</div>
            </div>
        </div>

        <div v-if="loading" class="empty-state">Loading details...</div>

        <template v-else-if="content">
            <div class="detail-tabs">
                <button
                    v-for="tab in tabs"
                    :key="tab.key"
                    type="button"
                    class="detail-tab"
                    :class="{ active: activeTab === tab.key }"
                    @click="selectTab(tab.key)"
                >
                    {{ tab.label }}<span v-if="tab.count" class="detail-tab-count">{{ tab.count }}</span>
                </button>
            </div>

            <div class="detail-body">
                <!-- One row, one column per section: the overview is a digest,
                     so all of it should be readable at once rather than stacked. -->
                <div v-if="activeTab === 'overview'" class="detail-overview-row">
                    <div class="detail-section">
                        <div class="detail-section-head">
                            <h5>Top gene loadings</h5>
                            <span class="detail-mini">{{ genePreviewRule }}</span>
                        </div>
                        <template v-if="previewGenes.length">
                            <div class="detail-marker-list">
                                <span
                                    v-for="row in previewGenes"
                                    :key="`preview-gene-${row.gene}`"
                                    class="detail-marker"
                                >
                                    {{ geneLoadingText(row) }}
                                </span>
                            </div>
                            <button type="button" class="detail-link-button" @click="selectTab('genes')">
                                View top {{ topGenes.rows.length }} genes
                            </button>
                        </template>
                        <div v-else class="empty-state">No positive program gene loadings returned.</div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-head">
                            <h5>Top curated state matches</h5>
                            <span class="detail-mini">{{ matchPreviewRule }}</span>
                        </div>
                        <template v-if="previewMatches.length">
                            <ol class="detail-ordered-list">
                                <li
                                    v-for="row in previewMatches"
                                    :key="`${row.stateId}-${row.programId || ''}`"
                                >
                                    {{ row.stateLabel }}
                                </li>
                            </ol>
                            <button type="button" class="detail-link-button" @click="selectTab('matches')">
                                View all {{ curatedMatches.length }} matches
                            </button>
                            <div v-if="!previewMatchesAreSignificant" class="detail-mini">
                                None of these reach GSEA q &lt; 0.05.
                            </div>
                        </template>
                        <div v-else class="empty-state">No curated state matches returned.</div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-head">
                            <h5>Top trait anchors</h5>
                            <span class="detail-mini">{{ traitPreviewRule }}</span>
                        </div>
                        <template v-if="previewTraits.length">
                            <!-- Trait then its phenotype group, as on the state
                                 panel: the group is what makes a bare trait code
                                 readable. -->
                            <ul class="detail-pair-list">
                                <li v-for="row in previewTraits" :key="`preview-trait-${row.trait}`">
                                    <span class="detail-pair-name">{{ row.trait }}</span>
                                    <span class="detail-pair-meta">{{ row.group }}</span>
                                </li>
                            </ul>
                            <button type="button" class="detail-link-button" @click="selectTab('traits')">
                                View all traits
                            </button>
                        </template>
                        <div v-else class="empty-state">No program trait anchors returned.</div>
                    </div>
                </div>

                <div v-else-if="activeTab === 'genes'" class="detail-section">
                    <h5>Top gene loadings</h5>
                    <div v-if="topGenes.rows.length" class="table-wrap">
                        <div v-if="hiddenTopGeneCount" class="detail-mini">
                            Top {{ topGenes.rows.length }} of {{ topGenes.total }} genes with a positive loading.
                        </div>
                        <table v-if="topGenes.mode === 'loading'">
                            <thead>
                                <tr>
                                    <th>Gene</th>
                                    <th>Loading</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in topGenes.rows" :key="row.gene">
                                    <td>{{ row.gene }}</td>
                                    <td>{{ formatMetric(row.loading) }}</td>
                                </tr>
                            </tbody>
                        </table>
                        <!-- Fallback source: the ordered `top_genes` list on the
                             program row, which carries no loading values. -->
                        <table v-else>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Gene</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in topGenes.rows" :key="`${row.gene}-${row.rank}`">
                                    <td>{{ row.rank }}</td>
                                    <td>{{ row.gene }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div v-else class="empty-state">No positive program gene loadings returned.</div>
                </div>

                <div v-else-if="activeTab === 'matches'" class="detail-section">
                    <h5>Curated state matches</h5>
                    <div class="matrix-controls f-row g-10 align-v-center">
                        <select v-model="matchThreshold">
                            <option
                                v-for="threshold in thresholds"
                                :key="threshold.key"
                                :value="threshold.key"
                            >
                                {{ threshold.label }}
                            </option>
                        </select>
                        <span class="detail-mini">{{ filteredMatches.length }} of {{ curatedMatches.length }} · marker-set enrichment (GSEA)</span>
                    </div>
                    <heat-table
                        :columns="stateColumns"
                        :rows="stateRows"
                        clickable
                        empty-text="No states at this threshold."
                        @row-click="$emit('open-state', $event.raw)"
                    />
                </div>

                <div v-else-if="activeTab === 'qc'" class="detail-section">
                    <h5>QC signature enrichment</h5>
                    <!-- Legend first: the row colors are the fastest read in this
                         table, so what they mean has to come before it. -->
                    <div class="detail-legend-row">
                        <span class="detail-legend-item"><span class="detail-badge good">Green</span> QC GSEA P &gt;= 0.05</span>
                        <span class="detail-legend-item"><span class="detail-badge warn">Yellow</span> QC GSEA P &lt; 0.05</span>
                        <span class="detail-legend-item"><span class="detail-badge bad">Red</span> QC GSEA q &lt; 0.05</span>
                    </div>
                    <template v-if="qcRows.length">
                        <!-- The counts the removed overview column carried: they
                             summarize this table, so they belong above it. -->
                        <dl class="detail-stat-list detail-stat-inline">
                            <dt>Signatures tested</dt>
                            <dd>{{ qcEvidence.total }}</dd>
                            <dt>Enriched at q &lt; 0.05</dt>
                            <dd>{{ qcEvidence.significantQ }}</dd>
                            <dt>Enriched at P &lt; 0.05</dt>
                            <dd>{{ qcEvidence.significantP }}</dd>
                        </dl>
                        <div v-if="qcEvidence.selfLabelledQc" class="detail-mini">
                            The factorization labels this program itself as a QC or artifact program.
                        </div>
                        <div class="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>QC signature</th>
                                        <th>Category</th>
                                        <th>Tier</th>
                                        <th>GSEA P</th>
                                        <th>GSEA q</th>
                                        <th>Exclude when</th>
                                        <th>Marker genes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in qcRows" :key="row.signatureId">
                                        <td>
                                            <span class="detail-badge" :class="row.tone">{{ row.label }}</span>
                                        </td>
                                        <td>{{ row.category }}</td>
                                        <td>{{ row.tier }}</td>
                                        <td>{{ formatPValue(row.gseaP) }}</td>
                                        <td>{{ formatPValue(row.gseaQ) }}</td>
                                        <td>{{ row.excludeWhen }}</td>
                                        <td>{{ row.markers.join(', ') }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="detail-mini">
                            Signature metadata joins on the QC signature id. Tier and
                            "exclude when" describe the signature itself, not this program.
                        </div>
                    </template>
                    <div v-else class="empty-state">No QC signature results returned.</div>
                </div>

                <div v-else-if="activeTab === 'genesets'" class="detail-section">
                    <h5>Gene set associations</h5>
                    <template v-if="geneSetRows.length">
                        <div class="detail-mini">
                            {{ visibleGeneSetRows.length }} of {{ geneSetRows.length }} gene sets, ranked by absolute beta.
                        </div>
                        <div class="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Gene set</th>
                                        <th>Joint beta</th>
                                        <th>Marginal beta</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in visibleGeneSetRows" :key="row.geneSet">
                                        <td>{{ row.geneSet }}</td>
                                        <td>{{ formatMetric(row.beta) }}</td>
                                        <td>{{ formatMetric(row.betaUncorrected) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <button
                            v-if="hiddenGeneSetRowCount > 0 && !showAllGeneSets"
                            class="detail-link-button"
                            @click="showAllGeneSets = true"
                        >
                            See {{ hiddenGeneSetRowCount }} more
                        </button>
                    </template>
                    <div v-else class="empty-state">No program gene set associations returned.</div>
                </div>

                <div v-else-if="activeTab === 'traits'" class="detail-section">
                    <h5>Top anchor traits</h5>
                    <div v-if="traitRows.length" class="detail-mini">
                        Top {{ traitRows.length }} of {{ traitRowsTotal }} trait associations, ranked by absolute beta.
                    </div>
                    <heat-table
                        :columns="traitColumns"
                        :groups="traitGroups"
                        empty-text="No program trait anchors returned."
                    />
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped src="./ligerDetails.css"></style>
