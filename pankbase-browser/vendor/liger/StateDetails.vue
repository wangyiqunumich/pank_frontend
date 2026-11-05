<script>
import Vue from "vue";
import HeatTable from "./HeatTable.vue";

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
const PREVIEW_MARKER_ROWS = 10;
const PREVIEW_PROGRAM_ROWS = 3;
const PREVIEW_TRAIT_ROWS = 4;

// Inline detail for a curated cell state.
//
// Presentational only: the parent builds `content` from the API and this renders
// it. The overview answers "what is this state and how far has it been curated";
// every many-row association lives behind its own tab rather than all landing at
// once.
export default Vue.component("StateDetails", {
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
        gene: {
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
            thresholds: THRESHOLDS,
            programThreshold: "all",
        };
    },

    computed: {
        tabs() {
            return [
                { key: "overview", label: "Overview" },
                { key: "markers", label: "Marker genes", count: this.markers.length },
                { key: "programs", label: "Related programs", count: this.relatedPrograms.length },
                { key: "traits", label: "Traits", count: this.traitRows.length },
                { key: "methods", label: "Methods" },
            ];
        },
        // The two guidance blocks are long prose and were pushing the overview's
        // actual associations off screen. In the header they are one label each,
        // with the content on hover.
        headerNotes() {
            return [
                {
                    key: "gene",
                    label: `What this means for ${this.gene}`,
                    rows: this.interpretationRows,
                },
                {
                    key: "reading",
                    label: "How to read this state",
                    rows: this.readingRows,
                },
            ].filter((note) => note.rows.length);
        },
        // Reads as a lede under the title rather than as an overview section: it
        // says what the state *is*, which is header material, and as a section it
        // competed with the gene-specific reading right below it.
        summaryDescription() {
            return (this.content && this.content.summaryDescription) || "";
        },
        provenanceRows() {
            return (this.content && this.content.provenanceRows) || [];
        },
        markers() {
            return (this.content && this.content.markerDetail && this.content.markerDetail.markers) || [];
        },
        markerProvenance() {
            return (this.content && this.content.markerDetail && this.content.markerDetail.provenance) || [];
        },
        relatedPrograms() {
            return (this.content && this.content.relatedPrograms) || [];
        },
        filteredPrograms() {
            if (this.programThreshold === "p") {
                return this.relatedPrograms.filter((row) => row.gseaP !== null && row.gseaP < 0.05);
            }

            if (this.programThreshold === "q") {
                return this.relatedPrograms.filter((row) => row.gseaQ !== null && row.gseaQ < 0.05);
            }

            return this.relatedPrograms;
        },
        traitRows() {
            return (this.content && this.content.traitRows) || [];
        },
        traitRowsTotal() {
            return (this.content && this.content.traitRowsTotal) || 0;
        },
        interpretationRows() {
            return (this.content && this.content.interpretationRows) || [];
        },
        readingRows() {
            return (this.content && this.content.readingRows) || [];
        },
        methodsDetail() {
            return (this.content && this.content.methodsDetail) || { text: "", rows: [], activityWeights: [] };
        },
        // The overview shows a digest of each section; the tab shows all of it.
        previewMarkers() {
            return this.markers.slice(0, PREVIEW_MARKER_ROWS);
        },
        hiddenMarkerCount() {
            return Math.max(0, this.markers.length - this.previewMarkers.length);
        },
        // The parent sorts related programs by GSEA P ascending, so these are the
        // strongest matches.
        previewPrograms() {
            return this.relatedPrograms.slice(0, PREVIEW_PROGRAM_ROWS);
        },
        // These previews rank, they do not filter -- there is no significance
        // threshold applied, so the note names the ranking statistic instead of a
        // cutoff. `previewProgramsAreSignificant` is what flags the case where the
        // best rows are still not significant.
        programPreviewRule() {
            return `Top ${this.previewPrograms.length} by GSEA P`;
        },
        traitPreviewRule() {
            return `Top ${this.previewTraits.length} by |beta|`;
        },
        // The list is not pre-filtered to significant matches, so these are only
        // the *best* ones -- say so when none of them clear the threshold.
        previewProgramsAreSignificant() {
            return this.previewPrograms.some((row) => row.gseaP !== null && row.gseaP < 0.05);
        },
        previewTraits() {
            return this.traitRows.slice(0, PREVIEW_TRAIT_ROWS);
        },
        // The relationship heatmap returns GSEA P and q and nothing else, so these
        // are the only columns. It previously also showed cell coactivity and a
        // match score, neither of which the index sends.
        programColumns() {
            return [
                { key: "label", label: "Program" },
                { key: "gseaP", label: "GSEA P", scale: "pvalue" },
                { key: "gseaQ", label: "GSEA q", scale: "pvalue" },
                { key: "negLogQ", label: "-log10(q)", scale: "sequential" },
            ];
        },
        programRows() {
            return this.filteredPrograms.map((row) => ({
                key: row.programId,
                label: row.programLabel,
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
        // Grouped by phenotype group, as the old trait matrix was. Groups keep the
        // order the rows arrived in, which is strongest association first.
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
        // A different state means a different entity, so the reader starts at the
        // overview again rather than landing mid-way through the previous one.
        content() {
            this.activeTab = "overview";
            this.programThreshold = "all";
        },
    },

    methods: {
        selectTab(key) {
            this.activeTab = key;
        },
    },
});
</script>

<template>
    <div class="detail-panel-wrap">
        <div class="detail-header">
            <div class="detail-header-main f-col g-5">
                <div class="detail-eyebrow">Cell state</div>
                <h4 class="detail-title bold">{{ title }}</h4>
                <p v-if="summaryDescription" class="detail-lede">{{ summaryDescription }}</p>
                <!-- Interpretation guidance as hover notes: the content is several
                     paragraphs of prose, which crowded out the associations when it
                     sat in the overview, but it is the reading a curated state is
                     for, so it stays next to the description. -->
                <div v-if="headerNotes.length" class="detail-note-row">
                    <span
                        v-for="note in headerNotes"
                        :key="note.key"
                        class="detail-note"
                        tabindex="0"
                    >
                        <span class="detail-note-label">{{ note.label }}</span>
                        <span class="detail-note-bubble">
                            <dl class="detail-note-grid">
                                <template v-for="field in note.rows">
                                    <dt :key="`${note.key}-${field.label}-dt`">{{ field.label }}</dt>
                                    <dd :key="`${note.key}-${field.label}-dd`">{{ field.value }}</dd>
                                </template>
                            </dl>
                        </span>
                    </span>
                </div>
            </div>
            <div class="detail-curation-summary">
                <dl v-if="provenanceRows.length" class="detail-field-grid">
                    <template v-for="field in provenanceRows">
                        <dt :key="`${field.label}-dt`">{{ field.label }}</dt>
                        <dd :key="`${field.label}-dd`">{{ field.value }}</dd>
                    </template>
                </dl>
                <div v-else class="empty-state">No curation record reported.</div>
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
                        <h5>Marker genes</h5>
                        <div v-if="previewMarkers.length" class="detail-marker-list">
                            <span
                                v-for="marker in previewMarkers"
                                :key="marker"
                                class="detail-marker"
                            >
                                {{ marker }}
                            </span>
                            <button
                                v-if="hiddenMarkerCount"
                                type="button"
                                class="detail-link-button"
                                @click="selectTab('markers')"
                            >
                                View all {{ markers.length }}
                            </button>
                        </div>
                        <div v-else class="empty-state">No marker genes returned.</div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-head">
                            <h5>Top related programs</h5>
                            <span class="detail-mini">{{ programPreviewRule }}</span>
                        </div>
                        <template v-if="previewPrograms.length">
                            <ol class="detail-ordered-list">
                                <li v-for="row in previewPrograms" :key="row.programId">
                                    {{ row.programLabel }}
                                </li>
                            </ol>
                            <button type="button" class="detail-link-button" @click="selectTab('programs')">
                                View all {{ relatedPrograms.length }} matches
                            </button>
                            <div v-if="!previewProgramsAreSignificant" class="detail-mini">
                                None of these reach GSEA P &lt; 0.05.
                            </div>
                        </template>
                        <div v-else class="empty-state">No related programs returned.</div>
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-head">
                            <h5>Top trait anchors</h5>
                            <span class="detail-mini">{{ traitPreviewRule }}</span>
                        </div>
                        <template v-if="previewTraits.length">
                            <!-- Trait then its phenotype group: the group is what
                                 makes a bare trait code readable, so it travels with
                                 the name rather than only appearing in the tab. -->
                            <ul class="detail-pair-list">
                                <li v-for="row in previewTraits" :key="row.trait">
                                    <span class="detail-pair-name">{{ row.trait }}</span>
                                    <span class="detail-pair-meta">{{ row.group }}</span>
                                </li>
                            </ul>
                            <button
                                type="button"
                                class="detail-link-button"
                                @click="selectTab('traits')"
                            >
                                View all traits
                            </button>
                        </template>
                        <div v-else class="empty-state">No trait associations returned for this state.</div>
                    </div>
                </div>

                <div v-else-if="activeTab === 'markers'" class="detail-section">
                    <h5>Marker genes</h5>
                    <div v-if="markers.length" class="detail-marker-list">
                        <span
                            v-for="marker in markers"
                            :key="marker"
                            class="detail-marker"
                        >
                            {{ marker }}
                        </span>
                    </div>
                    <div v-else class="empty-state">No marker genes returned.</div>

                    <template v-if="markerProvenance.length">
                        <h5 class="detail-subheading">Marker provenance</h5>
                        <div class="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Gene</th>
                                        <th>Role</th>
                                        <th>Evidence</th>
                                        <th>Marker notes</th>
                                        <th>Source type</th>
                                        <th>Citations</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in markerProvenance" :key="`${row.gene}-${row.role}`">
                                        <td>{{ row.gene }}</td>
                                        <td>{{ row.role }}</td>
                                        <td>{{ row.evidence }}</td>
                                        <td>{{ row.notes }}</td>
                                        <td>{{ row.sourceType }}</td>
                                        <!-- The citations are the state's
                                             references: they belong here, attached
                                             to the gene they support, rather than
                                             in a separate list that drops the
                                             attribution. -->
                                        <td>
                                            <span
                                                v-for="(citation, index) in row.citations"
                                                :key="`${row.gene}-citation-${index}`"
                                            >
                                                <a
                                                    v-if="citation.url"
                                                    :href="citation.url"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >{{ citation.label }}</a>
                                                <span v-else>{{ citation.label }}</span>
                                                <span v-if="index < row.citations.length - 1">; </span>
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </template>
                </div>

                <div v-else-if="activeTab === 'programs'" class="detail-section">
                    <h5>Related programs</h5>
                    <div class="matrix-controls f-row g-10 align-v-center">
                        <select v-model="programThreshold">
                            <option
                                v-for="threshold in thresholds"
                                :key="threshold.key"
                                :value="threshold.key"
                            >
                                {{ threshold.label }}
                            </option>
                        </select>
                        <span class="detail-mini">{{ filteredPrograms.length }} of {{ relatedPrograms.length }} · marker-set enrichment (GSEA)</span>
                    </div>
                    <heat-table
                        :columns="programColumns"
                        :rows="programRows"
                        clickable
                        empty-text="No programs at this threshold."
                        @row-click="$emit('open-program', $event.raw)"
                    />
                </div>

                <div v-else-if="activeTab === 'traits'" class="detail-section">
                    <h5>Human genetic trait anchors</h5>
                    <div v-if="traitRows.length" class="detail-mini">
                        Top {{ traitRows.length }} of {{ traitRowsTotal }} trait associations, ranked by absolute beta.
                    </div>
                    <heat-table
                        :columns="traitColumns"
                        :groups="traitGroups"
                        empty-text="No trait associations returned for this state."
                    />
                </div>

                <div v-else-if="activeTab === 'methods'" class="detail-section">
                    <h5>Scoring and methods</h5>
                    <p v-if="methodsDetail.text">{{ methodsDetail.text }}</p>
                    <dl v-if="methodsDetail.rows.length" class="detail-field-grid">
                        <template v-for="field in methodsDetail.rows">
                            <dt :key="`${field.label}-dt`">{{ field.label }}</dt>
                            <dd :key="`${field.label}-dd`">{{ field.value }}</dd>
                        </template>
                    </dl>
                    <template v-if="methodsDetail.activityWeights.length">
                        <h5 class="detail-subheading">Activity weightings</h5>
                        <dl class="detail-field-grid">
                            <template v-for="weight in methodsDetail.activityWeights">
                                <dt :key="`${weight.id}-dt`">{{ weight.label }}</dt>
                                <dd :key="`${weight.id}-dd`">{{ weight.description }}</dd>
                            </template>
                        </dl>
                    </template>
                    <div
                        v-if="!methodsDetail.text && !methodsDetail.rows.length && !methodsDetail.activityWeights.length"
                        class="empty-state"
                    >
                        No scoring metadata returned.
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped src="./ligerDetails.css"></style>
