<script>
import Vue from "vue";
import { readBioIndex } from "../../data.mjs";
import { formatMetric, formatPValue, isFiniteNumber } from "./ligerFormat";
import { clamp, mixColor, heatColor } from "./ligerHeat";
import CellStateInfographic from "./CellStateInfographic.vue";
import StateDetails from "./StateDetails.vue";
import ProgramDetails from "./ProgramDetails.vue";

const LIGER_DEV_HUGEAMP_BIOINDEX_HOST = "https://bioindex-dev.hugeamp.org";
const LIGER_PROD_HUGEAMP_BIOINDEX_HOST = "https://bioindex.hugeamp.org";
const LIGER_LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "0.0.0.0"];
const LIGER_RUNTIME_HOSTNAME = typeof window !== "undefined" ? window.location.hostname : "";
// Dev when served locally, or when any label of the hostname other than the TLD
// says dev -- so dev.pankbase.org, cmd.dev.hugeamp.org, bioindex-dev.hugeamp.org
// and kp4cd-dev.org all count, while hugeamp.org does not. Checking only the
// first label would miss cmd.dev.hugeamp.org, where dev sits in the middle.
const LIGER_USE_DEV_HOST = false; // Pin public production data independently of host URL.
// /api/portal/phenotypes and /api/bio/match/gene are only served by the hugeamp
// bioindex (other portals return 501), so they stay pinned to hugeamp regardless
// of the configured prod/dev hosts -- routing them through `config.prodHost` /
// `config.devHost` would drag them to a host that does not serve them.
const LIGER_HUGEAMP_HOST = LIGER_USE_DEV_HOST
    ? LIGER_DEV_HUGEAMP_BIOINDEX_HOST
    : LIGER_PROD_HUGEAMP_BIOINDEX_HOST;
const LIGER_PROGRAM_MODEL = "mouse_msigdb";
// The two accent colors, exposed as CSS variables on the component root so the
// child components and `ligerDetails.css` pick them up by inheritance. Defaults
// are the colors that were hardcoded before: `--blue` for the primary accent
// (buttons, links, bars) and #175cd3 for the secondary one (badges, notes).
const LIGER_DEFAULT_PRIMARY_COLOR = "#0277b6";
const LIGER_DEFAULT_SECONDARY_COLOR = "#175cd3";
const LIGER_DEFAULT_CONFIG = {
    pageTitle: "Cell State & Program Explorer",
    documentationUrl: "/research.html?pageid=kp_liger_documentation",
    // Which bioindex serves the LIGER indexes. `devHost` is used when the page is
    // served locally or from a dev subdomain, `prodHost` otherwise. Trailing
    // slashes are trimmed, so both "https://host" and "https://host/" work.
    prodHost: LIGER_PROD_HUGEAMP_BIOINDEX_HOST,
    devHost: LIGER_DEV_HUGEAMP_BIOINDEX_HOST,
    primaryColor: LIGER_DEFAULT_PRIMARY_COLOR,
    secondaryColor: LIGER_DEFAULT_SECONDARY_COLOR,
    tissues: [],
    hideTissueCardIfOneOption: false,
    // Shown on the landing state only. Set to [] to hide the row entirely; the
    // defaults are not guaranteed to exist in every portal's data.
    exampleGenes: ["PPARG", "PCSK9", "INS"],
    expressionAxis: null,
    specificityAxis: null,
};
// Expression bars are drawn against a FIXED axis, not the min/max of whatever
// rows happen to be on screen. Rescaling per section made every gene look the
// same: the weakest row always sat at the floor and the strongest always filled
// the track, so a cell-type-specific marker and a gene that is absent everywhere
// produced identical pictures. With a fixed domain the bar finally means
// something on its own, and is comparable across cards, genes, and tissues.
//
// The bar is drawn from 10^log10_cpk, not from log10_cpk itself.
//
// A filled bar asserts a meaningful zero: length is supposed to be proportional
// to the quantity. log10_cpk has no such zero - log10_cpk = 0 just means "1 CPK"
// - and it runs negative for most genes, so a bar drawn from it starts at an
// arbitrary point on a log axis and its length means nothing. Undoing the
// pipeline's outer log recovers the underlying positive quantity, which does
// have a true zero, so the bar becomes legitimate: empty really is "none".
//
// This is not a new metric, just the linear form of the value the API already
// returns. The raw log10_cpk is still what we show on hover.
//
// It also reads far better. In linear form a cell-type-specific gene separates
// cleanly (SST: 94% on delta, then 15/13/10/9...) while an absent gene collapses
// to nothing (A1BG: 1.6% down to 0), which is exactly the right message for each.
//
// The axis top scales to the gene being viewed, since a user only ever looks at
// one gene at a time - a global ceiling set by the islet hormones (INS 1.54)
// left a mid-expressed gene like PRSS1 (max 0.24) using the bottom 15% of every
// track.
//
// This is NOT the per-section rescaling this component started with. That was
// broken for two separate reasons: it ran from the section MINIMUM rather than
// zero, so an absent gene still filled the track, and the axis was unlabeled so
// nothing revealed the scale had moved. Here the bar keeps a true zero and the
// ticks are labeled with real values, so a shifting top is visible rather than
// hidden. One axis is shared by all three cards so they stay mutually readable.
//
// The floor stops a barely-expressed gene from filling its own bar: A1BG peaks
// at 0.025, and without this it would scale up to look strongly expressed.
// Chosen against the observed distribution (p50 = 0.088, p75 = 0.47), so a gene
// has to reach roughly the upper quartile before the axis starts tracking it.
const LIGER_EXPRESSION_AXIS_FLOOR = 0.5;
// log2 fold-change is signed and symmetric around a true zero, so it gets a
// symmetric domain and a center-anchored bar.
//
// The top is per-card, not global. Cell-type specificity is measured against the
// other cell types in the tissue, while state and program specificity is measured
// against the parent cell type - different denominators, so those numbers were
// never comparable and must not share a scale. Ranges differ enormously in
// practice: one portal returns cell-type values spanning -4.65..+7.56 while its
// own state and program values sit inside +/-1.4.
//
// The floor keeps the pre-existing behavior where values cluster at zero
// (p75 = +0.115 on the pankbase sweep); without it a card whose values are all
// tiny would scale up and imply enrichment that isn't there.
const LIGER_SPECIFICITY_AXIS_FLOOR = 1.5;
// p_value underflows to 5e-324 for the strongest hits, so it is only usable as a
// significance flag - never as a continuous ranking.
const LIGER_SIGNIFICANCE_P = 0.05;
// Keep this code-level toggle in place so we can quickly compare raw API traits
// versus portal-labeled traits without introducing UI controls yet.
const LIGER_FILTER_UNLABELED_HEATMAP_TRAITS = true;
// Both are top-N slices of indexes that return thousands of rows, so the tables
// report the total alongside the slice.
const TOP_GENE_ROWS = 30;
const TOP_TRAIT_ROWS = 20;
// Portals do not agree on how a tissue is identified. Some return a tissue label
// on the gene-level expression rows, others return only a dataset ID, and the
// dataset IDs themselves differ between portals for the same tissue. So each
// tissue lists every dataset ID we know it by, and we resolve in whichever
// direction the response happens to give us.
const LIGER_TISSUE_CONFIG = {
    artery: {
        label: "Artery",
        datasetIds: ["FNIH_Artery_scRNA_v2.2"],
    },
    heart: {
        label: "Heart",
        datasetIds: ["FNIH_Heart_scRNA_v3.2"],
    },
    hypothalamus: {
        label: "Hypothalamus",
        datasetIds: ["FNIH_Hypothalamus_scRNA_v2.2"],
    },
    kidney: {
        label: "Kidney",
        datasetIds: ["FNIH_Kidney_scRNA_v2.2"],
    },
    liver: {
        label: "Liver",
        datasetIds: ["FNIH_Liver_scRNA_v3.2"],
    },
    muscle: {
        label: "Muscle",
        datasetIds: ["FNIH_Muscle_scRNA_v2.2"],
    },
    pancreas: {
        label: "Pancreas",
        datasetIds: ["FNIH_Pancreas_scRNA_v2.2", "islet_of_Langerhans_scRNA_v3-4"],
    },
    sat: {
        label: "SAT",
        datasetIds: ["FNIH_SAT_scRNA_v2.2"],
    },
    vat: {
        label: "VAT",
        datasetIds: ["FNIH_VAT_scRNA_v2.2"],
    }
};

const LIGER_DATASET_TISSUE_MAP = Object.keys(LIGER_TISSUE_CONFIG).reduce((map, tissueKey) => {
    (LIGER_TISSUE_CONFIG[tissueKey].datasetIds || []).forEach((datasetId) => {
        map[datasetId] = tissueKey;
    });
    return map;
}, {});

export default Vue.component('LigerBrowser', {
    components: {
        CellStateInfographic,
        StateDetails,
        ProgramDetails
    },

    props: {
        config: {
            type: Object,
            default: () => ({})
        }
    },

    data() {
        return {
            searchedGene: "",
            selectedGene: null,
            geneSuggestions: [],
            availableTissues: [],
            // tissue key -> dataset ID as reported by this portal for the
            // current gene. Empty when the portal returns tissue labels instead.
            observedDatasetIds: {},
            // Whether this portal's cell-state endpoints are keyed by dataset ID
            // rather than tissue. Derived from the gene search response.
            cellStateUsesDatasetKey: false,
            selectedTissue: null,
            // Gene-level rows across every tissue, kept from the initial search so
            // the tissue and cell-type hover previews can count what lies ahead
            // without issuing a request per row.
            geneLevelCellStateRows: [],
            geneLevelProgramRows: [],
            // The scope selectors reopen together. Only meaningful once a cell
            // type is selected; before that the relevant steps are open anyway.
            scopeEditing: false,
            // Reopening the gene search is independent of the scope: changing
            // the gene invalidates everything below it, changing the tissue does
            // not touch the gene.
            searchEditing: false,
            cellTypeExpressionRows: [],
            selectedCellType: null,
            // Row click links the two cards: picking a state filters the program
            // card to its significant matches, and vice versa. One at a time.
            // { type: "state" | "program", key } or null.
            linkedSelection: null,
            viewStateInfo: false,
            viewProgramInfo: false,
            cellStateExpressionRows: [],
            programExpressionRows: [],
            cellStateMetadataRows: [],
            geneProgramInfoRows: [],
            relationshipHeatmapRows: [],
            phenotypeTraitRows: [],
            qcMetadataRows: [],
            stateTraitRowsCache: {},
            programTraitRowsCache: {},
            programGeneSetRowsCache: {},
            programGeneRowsCache: {},
            programQcRowsCache: {},
            detailOpen: false,
            detailLoading: false,
            detailTitle: "Select a state or program",
            detailContent: null,
            detailTargetId: "",
            isHydratingFromQuery: false,
            isLoadingGeneSuggestions: false,
            isLoadingGeneData: false,
            isLoadingCellTypes: false,
            isLoadingCellStateSection: false,
            isLoadingGeneProgramSection: false,
            isLoadingRelationshipHeatmap: false,
            geneSearchError: null,
            cellTypeLoadError: null,
            cellStateSectionError: null,
            geneProgramSectionError: null,
            relationshipHeatmapError: null,
            noGeneSuggestions: false,
            geneSuggestionTimer: null,
            skipGeneSuggestionLookup: false,
            // The row-action tooltip is separate from the row's own metadata
            // tooltip: hovering the filter button must not read as hovering the row.
            floatingActionTooltip: {
                visible: false,
                x: 0,
                y: 0,
                text: "",
            },
            // Lightweight hover preview for the tissue / cell-type selectors.
            // Deliberately smaller than the state/program tooltip: it answers
            // "is this worth clicking", not "what does this mean".
            floatingPreviewTooltip: {
                visible: false,
                x: 0,
                y: 0,
                title: "",
                rows: [],
                note: "",
            },
            floatingExpressionTooltip: {
                visible: false,
                x: 0,
                y: 0,
                // Viewport y of the hovered row's center, and the arrow's offset
                // from the card's own top. Kept apart so the arrow can stay on
                // the row when the card is clamped by a viewport edge.
                anchorY: 0,
                arrowY: 0,
                // Which row the card is currently describing, so mousemove within
                // one row is a no-op.
                rowKey: "",
                side: "right",
                columns: [],
            },
        };
    },

    computed: {
        ligerConfig() {
            return {
                ...LIGER_DEFAULT_CONFIG,
                ...(this.config || {}),
            };
        },
        // Every LIGER index URL is built from this: `config.devHost` when the page is
        // served locally or from a dev subdomain, `config.prodHost` otherwise. Both
        // default to the hugeamp bioindexes.
        apiHost() {
            let configured = LIGER_USE_DEV_HOST
                ? this.ligerConfig.devHost
                : this.ligerConfig.prodHost;
            let host = String(configured || "").trim().replace(/\/+$/, "");

            return host || (LIGER_USE_DEV_HOST
                ? LIGER_DEV_HUGEAMP_BIOINDEX_HOST
                : LIGER_PROD_HUGEAMP_BIOINDEX_HOST);
        },
        // Bound to the component root, so both accents reach the child components
        // and `ligerDetails.css` by inheritance -- those styles are scoped, which
        // rules out overriding their rules from here, but CSS variables still cross
        // the scope boundary.
        //
        // `--blue` is overridden rather than replaced everywhere: it is already the
        // primary accent throughout this component, so redefining it locally is the
        // whole change. The definition in the global `:root` block below stays as
        // the default for anything outside this root.
        themeStyle() {
            return {
                "--blue": this.ligerConfig.primaryColor || LIGER_DEFAULT_PRIMARY_COLOR,
                "--liger-secondary": this.ligerConfig.secondaryColor || LIGER_DEFAULT_SECONDARY_COLOR,
            };
        },
        pageTitle() {
            return this.ligerConfig.pageTitle || LIGER_DEFAULT_CONFIG.pageTitle;
        },
        documentationUrl() {
            return this.ligerConfig.documentationUrl || LIGER_DEFAULT_CONFIG.documentationUrl;
        },
        configuredTissueKeys() {
            let configuredTissues = Array.isArray(this.ligerConfig.tissues)
                ? this.ligerConfig.tissues
                : [];

            return configuredTissues
                .map((tissue) => this.normalizeKey(tissue))
                .filter((tissueKey) => !!tissueKey);
        },
        hideTissueCardIfOneOption() {
            return this.ligerConfig.hideTissueCardIfOneOption === true;
        },
        hasSingleTissueOption() {
            return this.availableTissues.length === 1;
        },
        shouldHideTissueCard() {
            return this.hideTissueCardIfOneOption && this.hasSingleTissueOption;
        },
        // One pass over the gene-level rows, keyed by tissue label and by
        // tissue label + cell type. Everything the previews show is a
        // distinct-value count, never a derived metric.
        //
        // Keyed by label, not tissue key, because `availableTissues` holds labels
        // and an unrecognized tissue has a label but no key -- keying by key would
        // silently report zeros for it.
        geneScopeCounts() {
            let byTissue = {};
            let byCellType = {};

            let tissueBucket = (tissueKey) => {
                if (!byTissue[tissueKey]) {
                    byTissue[tissueKey] = { cellTypes: {}, states: {}, programs: {} };
                }

                return byTissue[tissueKey];
            };
            let cellTypeBucket = (tissueKey, cellTypeKey) => {
                let bucketKey = `${tissueKey}::${cellTypeKey}`;

                if (!byCellType[bucketKey]) {
                    byCellType[bucketKey] = { states: {}, programs: {} };
                }

                return byCellType[bucketKey];
            };

            this.geneLevelCellStateRows.forEach((row) => {
                let tissueKey = this.tissueLabel(row);
                let cellTypeKey = this.cellTypeKey(row);
                let stateId = this.stateKey(row);

                if (!tissueKey || !cellTypeKey || !stateId) {
                    return;
                }

                let tissue = tissueBucket(tissueKey);
                tissue.cellTypes[cellTypeKey] = true;
                tissue.states[stateId] = true;
                cellTypeBucket(tissueKey, cellTypeKey).states[stateId] = true;
            });

            this.geneLevelProgramRows.forEach((row) => {
                let tissueKey = this.tissueLabel(row);
                let cellTypeKey = this.cellTypeKey(row);
                let programId = this.programKey(row);

                if (!tissueKey || !cellTypeKey || !programId) {
                    return;
                }

                let tissue = tissueBucket(tissueKey);
                tissue.cellTypes[cellTypeKey] = true;
                tissue.programs[programId] = true;
                cellTypeBucket(tissueKey, cellTypeKey).programs[programId] = true;
            });

            return { byTissue, byCellType };
        },
        // Significant state <-> program pairs, from the relationship heatmap.
        // Same threshold the detail panels already use for "related programs" and
        // "curated state matches", so the cards and the panels agree on what a
        // match is.
        significantMatchIndex() {
            let programsByState = {};
            let statesByProgram = {};

            this.relationshipHeatmapRows.forEach((row) => {
                if (this.isQcStateRow(row)) {
                    return;
                }

                let stateKey = this.stateKey(row);
                let programKey = this.programKey(row);
                let gseaP = this.gseaPValue(row);

                if (!stateKey || !programKey || gseaP === null || gseaP >= LIGER_SIGNIFICANCE_P) {
                    return;
                }

                (programsByState[stateKey] = programsByState[stateKey] || {})[programKey] = true;
                (statesByProgram[programKey] = statesByProgram[programKey] || {})[stateKey] = true;
            });

            return { programsByState, statesByProgram };
        },
        // The card that is *not* the one clicked in. A state selection filters
        // programs; a program selection filters states.
        matchedProgramKeys() {
            if (!this.linkedSelection || this.linkedSelection.type !== "state") {
                return null;
            }

            return this.significantMatchIndex.programsByState[this.linkedSelection.key] || {};
        },
        matchedStateKeys() {
            if (!this.linkedSelection || this.linkedSelection.type !== "program") {
                return null;
            }

            return this.significantMatchIndex.statesByProgram[this.linkedSelection.key] || {};
        },
        linkedSelectionLabel() {
            if (!this.linkedSelection) {
                return "";
            }

            if (this.linkedSelection.type === "state") {
                return this.stateLabel(this.stateMetadataById[this.linkedSelection.key] || { state_id: this.linkedSelection.key });
            }

            return this.programLabel(this.geneProgramInfoById[this.linkedSelection.key] || { program_id: this.linkedSelection.key });
        },
        // What the heatmaps should highlight. Entity details highlight themselves;
        // a relationship or association detail highlights both of its ends, which
        // is what ties the matrices to the panel above them.
        highlightedStateKey() {
            if (!this.detailContent) {
                return "";
            }

            return this.detailContent.type === "state" ? this.detailTargetId : "";
        },
        highlightedProgramKey() {
            if (!this.detailContent) {
                return "";
            }

            return this.detailContent.type === "program" ? this.detailTargetId : "";
        },
        exampleGenes() {
            return Array.isArray(this.ligerConfig.exampleGenes)
                ? this.ligerConfig.exampleGenes.filter((gene) => !!gene)
                : [];
        },
        // The page has two macro states: the landing state, which orients the
        // user and sells the search, and the exploration state, which is scoped
        // by the context header. Everything else keys off these.
        isLandingState() {
            return !this.selectedGene;
        },
        hasGeneContext() {
            return !!this.selectedGene && this.availableTissues.length > 0;
        },
        // Also stays open when a gene resolved but produced no tissues, otherwise
        // there would be no way to search again from that dead end.
        showGeneSearchInput() {
            return this.isLandingState || !this.hasGeneContext || this.searchEditing;
        },
        showScopeChange() {
            return this.hasGeneContext && !!this.selectedCellType;
        },
        // Once a cell type is chosen the scoping selectors have done their job and
        // collapse into the context header, so the states/programs workspace is
        // what the user sees. Before that, both stay open: the tissue list is
        // still useful context while picking a cell type.
        showTissueSelector() {
            if (this.shouldHideTissueCard) {
                return false;
            }

            return !this.selectedCellType || this.scopeEditing;
        },
        showCellTypeSelector() {
            if (!this.selectedTissue) {
                return false;
            }

            return !this.selectedCellType || this.scopeEditing;
        },
        showSelectorRow() {
            return this.showTissueSelector || this.showCellTypeSelector || this.isLoadingCellTypes;
        },
        showAnalysisState() {
            return !!this.selectedCellType;
        },
        // The scope layer's question is static, so this states the resolved scope
        // instead: it is the one place the full context is spelled out.
        discoverQuestion() {
            if (!this.showAnalysisState) {
                return "";
            }

            return `Cell states and gene programs associated with ${this.selectedGene} in ${this.selectedTissue} ${this.selectedCellType.label} cells`;
        },
        // One axis for the whole gene view, computed across all three cards so
        // a cell type, a state and a program are read on the same scale. It
        // steps once when the state/program sections finish loading, which is a
        // single predictable reflow rather than each card drifting on its own.
        expressionAxisMax() {
            let configured = Number(this.ligerConfig.expressionAxis);
            if (Number.isFinite(configured) && configured > 0) {
                return configured;
            }

            let observed = []
                .concat(this.cellTypeExpressionRows, this.cellStateExpressionRows, this.programExpressionRows)
                .map((row) => this.absoluteExpressionValue(row))
                .filter((value) => Number.isFinite(value))
                .reduce((max, value) => Math.max(max, Math.pow(10, value)), 0);

            return this.niceAxisMax(Math.max(observed, LIGER_EXPRESSION_AXIS_FLOOR));
        },
        cellTypeSpecificityAxis() {
            return this.specificityAxisFor(this.cellTypeExpressionRows);
        },
        cellStateSpecificityAxis() {
            return this.specificityAxisFor(this.cellStateExpressionRows);
        },
        programSpecificityAxis() {
            return this.specificityAxisFor(this.programExpressionRows);
        },
        // Ticks are rendered under each bar column so the scale is readable
        // without hovering anything.
        expressionAxisTicks() {
            let max = this.expressionAxisMax;
            return [0, max / 2, max].map((value) => ({
                value,
                label: this.formatAxisTick(value),
                offset: `${(value / max) * 100}%`,
            }));
        },
        cellTypeSpecificityTicks() {
            return this.specificityTicksFor(this.cellTypeSpecificityAxis);
        },
        cellStateSpecificityTicks() {
            return this.specificityTicksFor(this.cellStateSpecificityAxis);
        },
        programSpecificityTicks() {
            return this.specificityTicksFor(this.programSpecificityAxis);
        },
        // Naming this "CPK" would assert counts-per-thousand, which the observed
        // magnitudes contradict (INS in beta comes out at 1.54, orders of
        // magnitude too low). Stating the transform instead is exact and
        // inherits the pipeline's own naming rather than inventing a unit.
        expressionUnitLabel() {
            return "10^log₁₀CPK";
        },
        specificityUnitLabel() {
            return "log₂ fold-change";
        },
        // The three cards measure against different backgrounds. Collapsing them
        // to one tooltip described the wrong denominator on two of the three.
        absoluteExpressionTooltipByKind() {
            let basis = "The bar shows 10^log₁₀CPK, the linear form of the pipeline's log₁₀ CPK value, so the bar starts at a true zero and an empty bar means none detected. Hover a row for the raw value.";

            return {
                cellType: `Mean expression across cells of this cell type. ${basis}`,
                state: `State-weighted mean expression: cells are weighted by curated state activity. ${basis}`,
                program: `Program-weighted mean expression: cells are weighted by inferred program activity. ${basis}`,
            };
        },
        specificityTooltipByKind() {
            return {
                cellType: "Specificity is log₂ fold-change of this cell type versus the other cell types in the tissue. Not currently reported for cell types.",
                state: "Specificity is log₂ fold-change of the state-weighted expression versus the parent cell-type background. Positive means enriched in this state.",
                program: "Specificity is log₂ fold-change of the program-weighted expression versus the parent cell-type background. Positive means enriched in this program.",
            };
        },
        showGeneSuggestions() {
            return this.searchedGene.length > 1 &&
                (this.geneSuggestions.length > 0 || this.isLoadingGeneSuggestions || this.noGeneSuggestions);
        },
        tissueCount() {
            return this.availableTissues.length;
        },
        cellTypeCount() {
            return this.availableCellTypes.length;
        },
        cellStateCount() {
            if (!this.selectedCellType) {
                return 0;
            }

            return this.allCellStateExpressionList.length;
        },
        geneProgramCount() {
            if (!this.selectedCellType) {
                return 0;
            }

            return this.allGeneProgramExpressionList.length;
        },
        availableCellTypes() {
            return this.toExpressionList(this.cellTypeExpressionRows, "cellType");
        },
        allCellStateExpressionList() {
            return this.toExpressionList(this.cellStateExpressionRows, "state");
        },
        allGeneProgramExpressionList() {
            return this.toExpressionList(this.programExpressionRows, "program");
        },
        cellStateExpressionList() {
            if (!this.matchedStateKeys) {
                return this.allCellStateExpressionList;
            }

            return this.allCellStateExpressionList.filter((item) => !!this.matchedStateKeys[item.key]);
        },
        geneProgramExpressionList() {
            if (!this.matchedProgramKeys) {
                return this.allGeneProgramExpressionList;
            }

            return this.allGeneProgramExpressionList.filter((item) => !!this.matchedProgramKeys[item.key]);
        },
        // Shown next to the count so a filtered card never looks like a card with
        // less data in it.
        cellStateFilterNote() {
            if (!this.matchedStateKeys) {
                return "";
            }

            return `matching ${this.linkedSelectionLabel}`;
        },
        geneProgramFilterNote() {
            if (!this.matchedProgramKeys) {
                return "";
            }

            return `matching ${this.linkedSelectionLabel}`;
        },
        // gene-program-expression-cell-type returns log2fc_weighted_vs_all_parent
        // as null on every row, so the cell-type card hides the column entirely
        // rather than printing a wall of 0.00 that reads as "measured, no
        // enrichment". If the pipeline starts populating it this lights up on its
        // own.
        showCellTypeSpecificity() {
            return this.availableCellTypes.some((item) => Number.isFinite(item.spec));
        },
        cellStateInfoList() {
            let expressionOrder = this.cellStateExpressionList.map((row) => row.key);
            let expressionOrderMap = expressionOrder.reduce((map, key, index) => {
                map[key] = index;
                return map;
            }, {});

            return this.cellStateMetadataRows
                .map((row) => ({
                    key: this.stateKey(row),
                    label: this.stateLabel(row),
                    description: this.stateDescription(row),
                    genes: this.joinDisplayList(this.extractMarkerGenes(row)),
                }))
                .filter((row) => !!row.key)
                .filter((row) => !this.matchedStateKeys || !!this.matchedStateKeys[row.key])
                .sort((a, b) => {
                    let aIndex = Object.prototype.hasOwnProperty.call(expressionOrderMap, a.key) ? expressionOrderMap[a.key] : Number.MAX_SAFE_INTEGER;
                    let bIndex = Object.prototype.hasOwnProperty.call(expressionOrderMap, b.key) ? expressionOrderMap[b.key] : Number.MAX_SAFE_INTEGER;

                    if (aIndex !== bIndex) {
                        return aIndex - bIndex;
                    }

                    return a.label.localeCompare(b.label);
                });
        },
        geneProgramInfoList() {
            let expressionOrder = this.geneProgramExpressionList.map((row) => row.key);
            let expressionOrderMap = expressionOrder.reduce((map, key, index) => {
                map[key] = index;
                return map;
            }, {});

            return this.geneProgramInfoRows
                .map((row) => ({
                    key: this.programKey(row),
                    label: this.programLabel(row),
                    description: this.programDescription(row),
                    genes: this.joinDisplayList(this.extractGenes(row, ["top_genes", "genes", "gene_symbols"])),
                }))
                .filter((row) => !!row.key)
                .filter((row) => !this.matchedProgramKeys || !!this.matchedProgramKeys[row.key])
                .sort((a, b) => {
                    let aIndex = Object.prototype.hasOwnProperty.call(expressionOrderMap, a.key) ? expressionOrderMap[a.key] : Number.MAX_SAFE_INTEGER;
                    let bIndex = Object.prototype.hasOwnProperty.call(expressionOrderMap, b.key) ? expressionOrderMap[b.key] : Number.MAX_SAFE_INTEGER;

                    if (aIndex !== bIndex) {
                        return aIndex - bIndex;
                    }

                    return a.label.localeCompare(b.label);
                });
        },
        stateMetadataById() {
            let map = {};
            this.cellStateMetadataRows.forEach((row) => {
                let key = this.stateKey(row);
                if (key) {
                    map[key] = row;
                }
            });
            return map;
        },
        geneProgramInfoById() {
            let map = {};
            this.geneProgramInfoRows.forEach((row) => {
                let key = this.programKey(row);
                if (key) {
                    map[key] = row;
                }
            });
            return map;
        },
        qcMetadataById() {
            let map = {};
            this.qcMetadataRows.forEach((row) => {
                let key = String(this.field(row, ["qc_signature_id", "state_id", "state_name"]) || "");
                if (key) {
                    map[key] = row;
                }
            });
            return map;
        },
        traitPhenotypeLookup() {
            let map = {};

            this.phenotypeTraitRows.forEach((row) => {
                let keys = [
                    row.name,
                    row.description,
                    row.label,
                    row.trait,
                ]
                    .filter((value) => !!value)
                    .map((value) => this.normalizeKey(value));

                keys.forEach((key) => {
                    map[key] = row;
                });
            });

            return map;
        },
    },

    watch: {
        searchedGene(value) {
            let queryValue = (value || "").trim();

            this.geneSearchError = null;

            if (this.skipGeneSuggestionLookup) {
                this.skipGeneSuggestionLookup = false;
                return;
            }

            if (this.geneSuggestionTimer) {
                clearTimeout(this.geneSuggestionTimer);
                this.geneSuggestionTimer = null;
            }

            if (queryValue.length < 2) {
                this.geneSuggestions = [];
                this.isLoadingGeneSuggestions = false;
                this.noGeneSuggestions = false;
                return;
            }

            this.isLoadingGeneSuggestions = true;
            this.noGeneSuggestions = false;
            this.geneSuggestionTimer = setTimeout(() => {
                this.lookupGenes(queryValue);
            }, 200);
        }
    },

    async created() {
        if (typeof window !== "undefined") {
            window.addEventListener("keydown", this.onWindowKeydown);
        }

        await this.initializeFromQuery();
    },

    beforeDestroy() {
        if (this.geneSuggestionTimer) {
            clearTimeout(this.geneSuggestionTimer);
        }

        if (typeof window !== "undefined") {
            window.removeEventListener("keydown", this.onWindowKeydown);
        }
    },

    methods: {
        async fetchJson(url) {
            return readBioIndex(url);
        },
        currentQueryParams() {
            let params = new URLSearchParams(this.embedQuery || "");

            return {
                gene: params.get("gene") || "",
                tissue: params.get("tissue") || "",
                cell_type: params.get("cell_type") || "",
                cell_state: params.get("cell_state") || "",
                gene_program: params.get("gene_program") || "",
            };
        },
        setQueryParams(paramMap = {}, { replace = false } = {}) {
            const params = new URLSearchParams(this.embedQuery || "");
            Object.entries(paramMap).forEach(([key, value]) => {
                if (value === null || value === undefined || value === "") params.delete(key);
                else params.set(key, value);
            });
            this.embedQuery = params.toString();
        },
        syncQueryParams(paramMap = {}, options = {}) {
            this.setQueryParams(paramMap, {
                replace: this.isHydratingFromQuery || options.replace,
            });
        },
        async initializeFromQuery() {
            let query = this.currentQueryParams();
            let initialGene = query.gene || (this.config && this.config.gene ? String(this.config.gene) : "");

            if (!initialGene) {
                return;
            }

            this.isHydratingFromQuery = true;

            try {
                this.skipGeneSuggestionLookup = true;
                this.geneSuggestions = [];
                this.noGeneSuggestions = false;
                this.isLoadingGeneSuggestions = false;
                if (this.geneSuggestionTimer) {
                    clearTimeout(this.geneSuggestionTimer);
                    this.geneSuggestionTimer = null;
                }
                this.searchedGene = String(initialGene).toUpperCase();
                await this.submitGeneSearch(this.searchedGene);

                if (query.tissue) {
                    let requestedTissue = LIGER_TISSUE_CONFIG[query.tissue]
                        ? LIGER_TISSUE_CONFIG[query.tissue].label
                        : this.availableTissues.find((tissue) => this.tissueKeyFromLabel(tissue) === this.normalizeKey(query.tissue) || this.normalizeKey(tissue) === this.normalizeKey(query.tissue));

                    if (requestedTissue) {
                        await this.selectTissue(requestedTissue);
                    }
                }

                if (query.cell_type && this.selectedTissue) {
                    let requestedCellType = this.availableCellTypes.find((cellType) => {
                        return this.normalizeKey(cellType.key) === this.normalizeKey(query.cell_type) ||
                            this.normalizeKey(cellType.label) === this.normalizeKey(query.cell_type);
                    });

                    if (requestedCellType) {
                        await this.selectCellType(requestedCellType);
                    }
                }

                if (query.cell_state && this.selectedCellType) {
                    await this.openStateDetail(query.cell_state, this.stateMetadataById[query.cell_state] || this.cellStateExpressionRows.find((row) => this.stateKey(row) === query.cell_state));
                } else if (query.gene_program && this.selectedCellType) {
                    await this.openProgramDetail(query.gene_program, this.geneProgramInfoById[query.gene_program] || this.programExpressionRows.find((row) => this.programKey(row) === query.gene_program));
                }
            } finally {
                this.syncQueryParams({
                    gene: this.selectedGene || "",
                    tissue: this.selectedTissue ? this.tissueKeyFromLabel(this.selectedTissue) : "",
                    cell_type: this.selectedCellType ? this.selectedCellType.key : "",
                    cell_state: this.detailOpen && this.detailContent && this.detailContent.type === "state" ? this.detailTargetId : "",
                    gene_program: this.detailOpen && this.detailContent && this.detailContent.type === "program" ? this.detailTargetId : "",
                }, { replace: true });
                this.isHydratingFromQuery = false;
            }
        },
        buildMatchUrl(queryValue) {
            return `${LIGER_HUGEAMP_HOST}/api/bio/match/gene?q=${encodeURIComponent(queryValue)}`;
        },
        buildCellStateExpressionUrl(gene) {
            return `${this.apiHost}/api/bio/query/gene-program-expression-cell-state?q=${encodeURIComponent(gene)}`;
        },
        buildProgramExpressionUrl(gene) {
            return `${this.apiHost}/api/bio/query/gene-program-expression-program?q=${encodeURIComponent(gene)}`;
        },
        // The tissueQuery argument comes from tissueQueryKey(): a dataset ID on
        // dataset-keyed portals, a tissue key on tissue-keyed ones.
        buildCellTypeExpressionUrl(tissueQuery, gene) {
            return `${this.apiHost}/api/bio/query/gene-program-expression-cell-type?q=${encodeURIComponent(`${tissueQuery},${gene}`)}`;
        },
        buildCellStateSectionExpressionUrl(tissueQuery, cellType, gene) {
            return `${this.apiHost}/api/bio/query/gene-program-expression-cell-state?q=${encodeURIComponent(`${tissueQuery},${cellType},${gene}`)}`;
        },
        buildProgramSectionExpressionUrl(datasetId, cellType, gene) {
            return `${this.apiHost}/api/bio/query/gene-program-expression-program?q=${encodeURIComponent(`${datasetId},${cellType},${LIGER_PROGRAM_MODEL},${gene}`)}`;
        },
        buildCellStateMetadataUrl(tissue, cellType) {
            return `${this.apiHost}/api/bio/query/gene-program-cell-state-metadata-extended?q=${encodeURIComponent(`${tissue},${cellType}`)}`;
        },
        buildGeneProgramInfoUrl(datasetId, cellType) {
            return `${this.apiHost}/api/bio/query/gene-program-factor?q=${encodeURIComponent(`${datasetId},${cellType},${LIGER_PROGRAM_MODEL}`)}`;
        },
        buildProgramGeneInfoUrl(datasetId, cellType, programId) {
            return `${this.apiHost}/api/bio/query/gene-program-gene-factor?q=${encodeURIComponent(`${datasetId},${cellType},${LIGER_PROGRAM_MODEL},${programId}`)}`;
        },
        buildProgramGeneSetInfoUrl(datasetId, cellType, programId) {
            return `${this.apiHost}/api/bio/query/gene-program-gene-set-factor?q=${encodeURIComponent(`${datasetId},${cellType},${LIGER_PROGRAM_MODEL},${programId}`)}`;
        },
        buildProgramQcInfoUrl(datasetId, cellType, programId) {
            return `${this.apiHost}/api/bio/query/gene-program-qc-factor?q=${encodeURIComponent(`${datasetId},${cellType},${LIGER_PROGRAM_MODEL},${programId}`)}`;
        },
        buildQcMetadataUrl() {
            return `${this.apiHost}/api/bio/query/gene-program-qc-metadata-extended?q=1`;
        },
        buildRelationshipHeatmapUrl(tissueQuery, cellType) {
            return `${this.apiHost}/api/bio/query/gene-program-heatmap?q=${encodeURIComponent(`${tissueQuery},${cellType}`)}`;
        },
        buildTraitPhenotypesUrl() {
            return `${LIGER_HUGEAMP_HOST}/api/portal/phenotypes?q=md`;
        },
        buildCellStateTraitUrl(tissueQuery, cellType, stateId) {
            return `${this.apiHost}/api/bio/query/gene-program-cell-state-trait-factor?q=${encodeURIComponent(`${tissueQuery},${cellType},${stateId}`)}`;
        },
        buildProgramTraitUrl(datasetId, cellType, programId) {
            return `${this.apiHost}/api/bio/query/gene-program-trait-factor?q=${encodeURIComponent(`${datasetId},${cellType},${LIGER_PROGRAM_MODEL},${programId}`)}`;
        },
        async ensurePhenotypeTraitRows() {
            if (this.phenotypeTraitRows.length) {
                return;
            }

            let phenotypePayload = await this.fetchJson(this.buildTraitPhenotypesUrl());
            this.phenotypeTraitRows = this.rowsFromResponse(phenotypePayload);
        },
        async ensureQcMetadataRows() {
            if (this.qcMetadataRows.length) {
                return;
            }

            let payload = await this.fetchJson(this.buildQcMetadataUrl());
            this.qcMetadataRows = this.rowsFromResponse(payload);
        },
        rowsFromResponse(payload) {
            if (Array.isArray(payload)) {
                return payload;
            }

            if (!payload || typeof payload !== "object") {
                return [];
            }

            let rowCollections = [
                payload.data,
                payload.results,
                payload.rows,
                payload.items,
                payload.values,
                payload.result,
            ];

            for (let i = 0; i < rowCollections.length; i++) {
                let collection = rowCollections[i];

                if (!Array.isArray(collection)) {
                    continue;
                }

                if (collection.length > 0 && Array.isArray(collection[0]) && Array.isArray(payload.columns)) {
                    return collection.map((row) => {
                        let mappedRow = {};
                        payload.columns.forEach((column, columnIndex) => {
                            mappedRow[column] = row[columnIndex];
                        });
                        return mappedRow;
                    });
                }

                return collection;
            }

            if (Array.isArray(payload.columns) && Array.isArray(payload.data)) {
                return this.rowsFromResponse({
                    columns: payload.columns,
                    data: payload.data,
                });
            }

            return [payload];
        },
        field(row, names = []) {
            if (!row || typeof row !== "object") {
                return null;
            }

            let normalizedRow = {};
            Object.keys(row).forEach((key) => {
                normalizedRow[this.normalizeKey(key)] = row[key];
            });

            for (let i = 0; i < names.length; i++) {
                let key = names[i];
                if (key in row && row[key] !== undefined && row[key] !== null && row[key] !== "") {
                    return row[key];
                }

                let normalizedKey = this.normalizeKey(key);
                if (normalizedKey in normalizedRow && normalizedRow[normalizedKey] !== undefined && normalizedRow[normalizedKey] !== null && normalizedRow[normalizedKey] !== "") {
                    return normalizedRow[normalizedKey];
                }
            }

            return null;
        },
        normalizeKey(value) {
            return String(value || "")
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "");
        },
        normalizeGeneLabel(gene) {
            if (gene == null) {
                return "";
            }

            if (typeof gene === "string") {
                return gene.toUpperCase();
            }

            let label = this.field(gene, ["symbol", "gene_symbol", "name", "gene", "id"]);
            return String(label || "").toUpperCase();
        },
        formatDisplayLabel(value) {
            return String(value || "")
                .replace(/_/g, " ")
                .split(" ")
                .filter((part) => !!part)
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(" ");
        },
        tissueKeyFromLabel(label) {
            return Object.keys(LIGER_TISSUE_CONFIG).find((tissueKey) => {
                return LIGER_TISSUE_CONFIG[tissueKey].label === label;
            }) || null;
        },
        tissueAllowed(label) {
            if (!this.configuredTissueKeys.length) {
                return true;
            }

            let tissueKey = this.tissueKeyFromLabel(label) || this.normalizeKey(label);
            return this.configuredTissueKeys.includes(tissueKey);
        },
        tissueDatasetId(label) {
            let tissueKey = this.tissueKeyFromLabel(label);
            if (!tissueKey) {
                return null;
            }

            // Prefer the dataset ID this portal actually used for the current
            // gene; fall back to the first configured ID when the response only
            // gave us tissue labels.
            return this.observedDatasetIds[tissueKey]
                || (LIGER_TISSUE_CONFIG[tissueKey].datasetIds || [])[0]
                || null;
        },
        // The cell-state family of endpoints keys on a tissue on some portals and
        // on a dataset ID on others. The gene-level cell-state response tells us
        // which: if its rows carry a tissue, the portal speaks tissue; if they
        // only carry a dataset ID, it speaks dataset. Note the program payload
        // is no help here, since it reports dataset IDs on both kinds of portal.
        detectCellStateDatasetKeying(rows = []) {
            let hasTissue = rows.some((row) => !!this.field(row, ["tissue_label", "tissue"]));
            let hasDataset = rows.some((row) => !!this.rowDatasetId(row));

            return !hasTissue && hasDataset;
        },
        // Query key for the cell-state family only. The two cell-state-metadata
        // endpoints are tissue-keyed everywhere and should keep using
        // tissueKeyFromLabel; the program endpoints take tissueDatasetId.
        tissueQueryKey(label) {
            let tissueKey = this.tissueKeyFromLabel(label);
            if (!tissueKey) {
                return "";
            }

            if (!this.cellStateUsesDatasetKey) {
                return tissueKey;
            }

            return this.tissueDatasetId(label) || tissueKey;
        },
        rowDatasetId(row) {
            return String(this.field(row, ["dataset_id", "dataset"]) || "");
        },
        rowTissueKey(row) {
            let tissue = this.field(row, ["tissue_label", "tissue"]);
            if (tissue) {
                let normalizedTissue = this.normalizeKey(tissue);
                if (LIGER_TISSUE_CONFIG[normalizedTissue]) {
                    return normalizedTissue;
                }
            }

            let datasetId = this.rowDatasetId(row);
            return LIGER_DATASET_TISSUE_MAP[datasetId] || null;
        },
        tissueLabel(row) {
            let tissueKey = this.rowTissueKey(row);
            if (tissueKey) {
                return LIGER_TISSUE_CONFIG[tissueKey].label;
            }

            // Unrecognized tissue with no dataset ID we can map: show it as-is
            // rather than dropping the row.
            let tissue = this.field(row, ["tissue_label", "tissue"]);
            return tissue ? this.formatDisplayLabel(tissue) : "";
        },
        cellTypeKey(row) {
            let label = this.field(row, ["cell_type", "annotated_cell_type", "celltype", "cell_type_label"]);
            return String(label || "");
        },
        cellTypeLabel(row) {
            let label = this.field(row, ["cell_type_label", "annotated_cell_type", "cell_type", "celltype"]);
            return this.formatDisplayLabel(label);
        },
        stateKey(row) {
            return String(this.field(row, ["state_id", "state", "cell_state_id", "state_name", "display_name"]) || "");
        },
        stateLabel(row) {
            let key = this.stateKey(row);
            let metadataRow = key ? this.stateMetadataById[key] : null;
            let label = this.field(metadataRow || row, ["display_name", "state_label", "cell_state", "state_name", "state_id"]);
            return this.formatDisplayLabel(label);
        },
        programKey(row) {
            return String(this.field(row, ["program_id", "factor", "factor_id", "program", "label"]) || "");
        },
        programLabel(row) {
            let key = this.programKey(row);
            let infoRow = key ? this.geneProgramInfoById[key] : null;
            let label = this.field(infoRow || row, ["suggested_program_label", "program_label", "label", "display_name", "program_id", "factor"]);
            return this.formatDisplayLabel(label);
        },
        absoluteExpressionValue(row) {
            return this.numericField(row, [
                "log10_cpk",
            ]);
        },
        specificityValue(row) {
            return this.numericField(row, [
                "log2fc_weighted_vs_all_parent",
                "log2fc_vs_all_parent",
                "specificity_log2fc",
                "log2_fold_change",
                "specificity",
                "spec",
            ]);
        },
        numericField(row, names = []) {
            let value = this.field(row, names);

            // field() returns null when it finds nothing, and Number(null) is 0,
            // which is finite - so without this guard every absent numeric field
            // silently became a real zero. That is what put a column of "0.00"
            // under cell-type Specificity (the API sends null there on every
            // row), and it made a missing p_value read as 0, i.e. maximally
            // significant. Real zeros in the data still pass through: field()
            // only skips null/undefined/"".
            if (value === null || value === undefined || value === "") {
                return null;
            }

            let numberValue = Number(value);
            return Number.isFinite(numberValue) ? numberValue : null;
        },
        formatMetric,
        isFiniteNumber,
        // Missing and zero are different facts. formatMetric() renders both as
        // "0.00", which in the bar cards reads as a real measurement of nothing.
        // The wider drawer tables still use formatMetric; only the bars use this.
        formatMetricOrDash(value) {
            return Number.isFinite(value) ? value.toFixed(2) : "—";
        },
        // The linear expression scale spans several orders of magnitude, so a
        // fixed 2 decimals would print "0.00" for everything below a hundredth
        // and lose the distinction between "barely there" and "absent".
        formatExpressionValue(value) {
            if (!Number.isFinite(value)) {
                return "—";
            }

            if (value >= 0.1) {
                return value.toFixed(2);
            }

            if (value >= 0.001) {
                return value.toFixed(3);
            }

            return value > 0 ? "<0.001" : "0";
        },
        // p_value underflows to 5e-324 for the strongest hits, so anything at the
        // floor is reported as a bound rather than a number that looks precise.
        formatSignificance(value) {
            if (!Number.isFinite(value)) {
                return "—";
            }

            if (value < 1e-300) {
                return "<1e-300";
            }

            return this.formatPValue(value);
        },
        specificityAxisFor(rows = []) {
            let configured = Number(this.ligerConfig.specificityAxis);
            if (Number.isFinite(configured) && configured > 0) {
                return configured;
            }

            let observed = rows
                .map((row) => this.specificityValue(row))
                .filter((value) => Number.isFinite(value))
                .reduce((max, value) => Math.max(max, Math.abs(value)), 0);

            return this.niceAxisMax(Math.max(observed, LIGER_SPECIFICITY_AXIS_FLOOR));
        },
        specificityTicksFor(axis) {
            return [-axis, 0, axis].map((value) => ({
                value,
                label: value > 0 ? `+${this.formatAxisTick(value)}` : this.formatAxisTick(value),
                offset: `${((value + axis) / (axis * 2)) * 100}%`,
            }));
        },
        // Round the axis top up to the next readable step so ticks land on
        // values like 0.6 / 0.8 / 1.5 instead of 1.543.
        niceAxisMax(value) {
            if (!Number.isFinite(value) || value <= 0) {
                return 1;
            }

            let magnitude = Math.pow(10, Math.floor(Math.log10(value)));
            let normalized = value / magnitude;
            let step = [1, 1.2, 1.4, 1.5, 1.6, 1.8, 2, 2.5, 3, 4, 5, 6, 8, 10]
                .find((candidate) => normalized <= candidate + 1e-9);

            return Number((step * magnitude).toPrecision(2));
        },
        // The axis top moves with the gene, so ticks span anything from ~0.5 to
        // ~1.6 and a fixed decimal count would print "0.0" or drop detail.
        formatAxisTick(value) {
            if (!Number.isFinite(value)) {
                return "";
            }

            if (value === 0) {
                return "0";
            }

            // Axis tops range from ~0.5 to ~10 depending on gene and portal, so
            // no single decimal count works: "10.0" is clumsy and "0.3" loses a
            // 0.25 midpoint.
            if (Number.isInteger(value)) {
                return String(value);
            }

            return Math.abs(value) >= 1 ? value.toFixed(1) : String(Number(value.toFixed(2)));
        },
        // Fraction of the fixed axis this value fills, plus which end it ran off
        // so the caller can mark clamped rows instead of hiding the clamp.
        axisFill(value, min, max) {
            if (!Number.isFinite(value) || max <= min) {
                return { percent: 0, overflow: null, present: false };
            }

            let raw = ((value - min) / (max - min)) * 100;
            let overflow = raw > 100 ? "high" : (raw < 0 ? "low" : null);

            return { percent: Math.max(0, Math.min(100, raw)), overflow, present: true };
        },
        toExpressionList(rows = [], kind) {
            let axisMax = this.expressionAxisMax;
            let specAxis = this.specificityAxisFor(rows);

            return rows
                .map((row) => {
                    let absoluteExpression = this.absoluteExpressionValue(row);
                    // Undo the pipeline's outer log so the bar has a true zero.
                    let linearExpression = Number.isFinite(absoluteExpression)
                        ? Math.pow(10, absoluteExpression)
                        : null;
                    let specificity = this.specificityValue(row);
                    let pValue = this.numericField(row, ["p_value"]);
                    let fill = this.axisFill(linearExpression, 0, axisMax);
                    let specFill = this.axisFill(specificity, -specAxis, specAxis);
                    let key = kind === "state"
                        ? this.stateKey(row)
                        : (kind === "program" ? this.programKey(row) : this.cellTypeKey(row));
                    let label = kind === "state"
                        ? this.stateLabel(row)
                        : (kind === "program" ? this.programLabel(row) : this.cellTypeLabel(row));

                    return {
                        key,
                        label,
                        abs: linearExpression,
                        // raw pipeline value, surfaced on hover
                        absRaw: absoluteExpression,
                        absRawText: this.formatMetricOrDash(absoluteExpression),
                        absText: this.formatExpressionValue(linearExpression),
                        expressionWidth: `${fill.percent}%`,
                        expressionOverflow: fill.overflow,
                        hasExpression: fill.present,
                        spec: specificity,
                        specText: this.formatMetricOrDash(specificity),
                        // -1..1 of a half-track; the template scales a
                        // center-anchored fill by this, so passing through 0
                        // crosses the axis cleanly.
                        specScale: Number.isFinite(specificity)
                            ? Math.max(-1, Math.min(1, specificity / specAxis)).toFixed(3)
                            : "0",
                        specOverflow: specFill.overflow,
                        hasSpec: specFill.present,
                        // Only dim a bar when there is a p-value saying it is not
                        // significant. Some endpoints omit p_value entirely, and
                        // dimming the whole column on missing data reads as "all
                        // low confidence" when it actually means "not reported".
                        muted: Number.isFinite(pValue) && pValue > LIGER_SIGNIFICANCE_P,
                        pValueText: this.formatSignificance(pValue),
                        row,
                    };
                })
                .filter((item) => !!item.key)
                .sort((a, b) => this.compareExpressionRows(a, b));
        },
        // Sort by the same value the bar is drawn from. The old order used a
        // wider field-name fallback list than the bar used, so rows could appear
        // out of order relative to their own bars. Rows with no value sort last
        // rather than being treated as zero.
        compareExpressionRows(a, b) {
            let aFinite = Number.isFinite(a.abs);
            let bFinite = Number.isFinite(b.abs);

            if (aFinite !== bFinite) {
                return aFinite ? -1 : 1;
            }

            if (!aFinite) {
                return String(a.label).localeCompare(String(b.label));
            }

            return b.abs - a.abs;
        },
        stateDescription(row) {
            let summary = this.field(row, [
                "portal_user_summary",
                "gene_expression_interpretation",
                "biological_description",
                "recommended_portal_summary",
                "short_description",
                "curation_notes",
                "description",
                "notes",
            ]);
            if (summary) {
                return String(summary);
            }

            let summaryObject = row && row.summary;
            if (summaryObject && typeof summaryObject === "object") {
                return String(
                    summaryObject.portal_user_summary ||
                    summaryObject.gene_expression_interpretation ||
                    summaryObject.biological_description ||
                    summaryObject.recommended_portal_summary ||
                    summaryObject.short_description ||
                    summaryObject.curation_notes ||
                    ""
                );
            }

            return "No description available.";
        },
        programDescription(row) {
            let description = this.field(row, [
                "program_label",
                "suggested_program_label",
                "label",
                "display_name",
                "description",
            ]);
            return String(description || "No description available.");
        },
        extractGenes(row, fields = []) {
            let genes = [];
            fields.forEach((fieldName) => {
                let value = this.field(row, [fieldName]);
                if (value == null) {
                    return;
                }

                if (Array.isArray(value)) {
                    value.forEach((item) => {
                        if (item && typeof item === "object") {
                            let gene = item.gene || item.gene_symbol || item.name;
                            if (gene) {
                                genes.push(String(gene));
                            }
                        } else if (item) {
                            genes.push(String(item));
                        }
                    });
                    return;
                }

                if (typeof value === "object") {
                    let gene = value.gene || value.gene_symbol || value.name;
                    if (gene) {
                        genes.push(String(gene));
                    }
                    return;
                }

                String(value)
                    .split(/[,;|]/)
                    .map((item) => item.trim())
                    .filter((item) => !!item)
                    .forEach((item) => genes.push(item));
            });

            return Array.from(new Set(genes));
        },
        naturalSort(a, b) {
            return String(a || "").localeCompare(String(b || ""), undefined, {
                numeric: true,
                sensitivity: "base",
            });
        },
        stateTooltipColumns(cellState) {
            let metadataRow = this.stateMetadataById[cellState.key] || cellState.row || {};
            let markerGenes = this.extractMarkerGenes(metadataRow);

            return [
                { label: "Cell State", value: cellState.label || this.stateLabel(metadataRow) || "Not available" },
                { label: "Expression (raw log₁₀ CPK)", value: cellState.absRawText },
                { label: "Specificity p-value", value: cellState.pValueText },
                { label: "Description", value: this.stateDescription(metadataRow) || "No description available." },
                { label: "Marker Genes", value: this.joinDisplayList(markerGenes), items: markerGenes },
            ];
        },
        programTooltipColumns(program) {
            let infoRow = this.geneProgramInfoById[program.key] || program.row || {};
            let topGenes = this.extractGenes(infoRow, ["top_genes", "genes", "gene_symbols"]);

            return [
                { label: "Gene Program", value: program.label || this.programLabel(infoRow) || "Not available" },
                { label: "Expression (raw log₁₀ CPK)", value: program.absRawText },
                { label: "Specificity p-value", value: program.pValueText },
                { label: "Description", value: this.programDescription(infoRow) || "No description available." },
                { label: "Top Genes", value: this.joinDisplayList(topGenes), items: topGenes },
            ];
        },
        // Counts are of rows that exist for the current gene, which is exactly
        // what the section below will show once the user clicks through.
        tissuePreviewStats(tissueLabel) {
            let bucket = this.geneScopeCounts.byTissue[tissueLabel];

            return {
                cellTypes: bucket ? Object.keys(bucket.cellTypes).length : 0,
                states: bucket ? Object.keys(bucket.states).length : 0,
                programs: bucket ? Object.keys(bucket.programs).length : 0,
            };
        },
        cellTypePreviewStats(cellTypeKey) {
            let bucket = this.geneScopeCounts.byCellType[`${this.selectedTissue}::${cellTypeKey}`];

            return {
                states: bucket ? Object.keys(bucket.states).length : 0,
                programs: bucket ? Object.keys(bucket.programs).length : 0,
            };
        },
        tissuePreviewTooltip(tissueLabel) {
            let stats = this.tissuePreviewStats(tissueLabel);

            return {
                title: tissueLabel,
                rows: [
                    { label: "Cell types", value: stats.cellTypes },
                    { label: "Cell states", value: stats.states },
                    { label: "Gene programs", value: stats.programs },
                ],
                note: `Select to explore ${this.selectedGene} across ${tissueLabel} cell types.`,
            };
        },
        cellTypePreviewTooltip(cellType) {
            let stats = this.cellTypePreviewStats(cellType.key);

            return {
                title: cellType.label,
                rows: [
                    { label: `${this.selectedGene} expression`, value: cellType.absText },
                    { label: "Cell states", value: stats.states },
                    { label: "Gene programs", value: stats.programs },
                ],
                note: "Select to explore its cell states and gene programs.",
            };
        },
        showPreviewTooltip(event, kind, item) {
            if (!event || !event.currentTarget || !item) {
                this.hidePreviewTooltip();
                return;
            }

            let preview = kind === "tissue"
                ? this.tissuePreviewTooltip(item)
                : this.cellTypePreviewTooltip(item);

            let rect = event.currentTarget.getBoundingClientRect();
            let tooltipWidth = 260;
            let tooltipHeight = 150;
            let gap = 14;
            let viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1440;
            let viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;
            let preferredX = rect.right + gap;

            if (preferredX + tooltipWidth > viewportWidth - 12) {
                preferredX = rect.left - tooltipWidth - gap;
            }

            this.floatingPreviewTooltip.visible = true;
            this.floatingPreviewTooltip.title = preview.title;
            this.floatingPreviewTooltip.rows = preview.rows;
            this.floatingPreviewTooltip.note = preview.note;
            this.floatingPreviewTooltip.x = Math.max(12, preferredX);
            this.floatingPreviewTooltip.y = Math.max(12, Math.min(viewportHeight - tooltipHeight - 12, rect.top));
        },
        hidePreviewTooltip() {
            this.floatingPreviewTooltip.visible = false;
        },
        // Anchored above the button and centered on it. Fixed-position, like every
        // other tooltip here, because the rows sit in a scrolling panel.
        showActionTooltip(event, text) {
            if (!event || !event.currentTarget) {
                return;
            }

            this.hideExpressionRowTooltip();

            let rect = event.currentTarget.getBoundingClientRect();
            this.floatingActionTooltip.visible = true;
            this.floatingActionTooltip.text = text;
            this.floatingActionTooltip.x = rect.left + (rect.width / 2);
            this.floatingActionTooltip.y = rect.top - 10;
        },
        hideActionTooltip() {
            this.floatingActionTooltip.visible = false;
        },
        showExpressionRowTooltip(event, kind, item) {
            if (!event || !event.currentTarget || !item) {
                this.hideExpressionRowTooltip();
                return;
            }

            let columns = kind === "state"
                ? this.stateTooltipColumns(item)
                : this.programTooltipColumns(item);

            if (!columns.length) {
                this.hideExpressionRowTooltip();
                return;
            }

            let rowKey = `${kind}:${item.key}`;

            // mousemove fires continuously across a row, but the tooltip is
            // anchored to the row rather than the cursor, so there is nothing to
            // recompute until the row changes. Re-measuring on every move also
            // made the card twitch as it re-centered.
            if (this.floatingExpressionTooltip.visible && this.floatingExpressionTooltip.rowKey === rowKey) {
                return;
            }

            let rect = event.currentTarget.getBoundingClientRect();
            let tooltipWidth = 430;
            let gap = 14;
            let viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1440;
            let preferredX = kind === "state" ? rect.right + gap : rect.left - tooltipWidth - gap;

            this.floatingExpressionTooltip.visible = true;
            this.floatingExpressionTooltip.rowKey = rowKey;
            this.floatingExpressionTooltip.columns = columns;
            this.floatingExpressionTooltip.side = kind === "state" ? "right" : "left";
            this.floatingExpressionTooltip.x = Math.max(12, Math.min(viewportWidth - tooltipWidth - 12, preferredX));
            // The row center the arrow has to point at, and a provisional top so
            // the card does not flash in from the wrong place before it is
            // measured.
            this.floatingExpressionTooltip.anchorY = rect.top + (rect.height / 2);
            this.floatingExpressionTooltip.y = rect.top;
            this.floatingExpressionTooltip.arrowY = rect.height / 2;

            this.$nextTick(this.alignExpressionRowTooltip);
        },
        // The card's height depends on how many chips its columns wrap to, so it
        // can only be centered on its row once it has rendered. Guessing a fixed
        // height is what left the arrow pointing at a different row than the one
        // being hovered.
        alignExpressionRowTooltip() {
            let element = this.$refs.expressionTooltip;

            if (!element || !this.floatingExpressionTooltip.visible) {
                return;
            }

            let height = element.offsetHeight;
            let viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;
            let anchorY = this.floatingExpressionTooltip.anchorY;
            let top = Math.max(12, Math.min(viewportHeight - height - 12, anchorY - (height / 2)));

            this.floatingExpressionTooltip.y = top;
            // The arrow tracks the row independently of the card, so a tooltip
            // pushed off center by a viewport edge still points at what it
            // describes instead of at whatever sits at its own midpoint.
            this.floatingExpressionTooltip.arrowY = Math.max(12, Math.min(height - 12, anchorY - top));
        },
        hideExpressionRowTooltip() {
            this.floatingExpressionTooltip.visible = false;
            this.floatingExpressionTooltip.rowKey = "";
            this.floatingExpressionTooltip.columns = [];
        },
        clamp,
        mixColor,
        relationshipCellColor: heatColor,
        nestedValue(value, path = []) {
            return path.reduce((current, key) => {
                if (!current || typeof current !== "object") {
                    return null;
                }

                return current[key];
            }, value);
        },
        firstNonEmpty(values = []) {
            for (let i = 0; i < values.length; i++) {
                let value = values[i];
                if (value !== null && value !== undefined && value !== "") {
                    return value;
                }
            }

            return null;
        },
        // snake_case API token to display text. The map only holds tokens the
        // generic formatter gets wrong; everything else is underscore-stripped and
        // capitalized.
        //
        // It used to also expand the program quality tokens
        // (`exploratory_biological`, `high_confidence_biological`,
        // `curated_biological_state`) and suffix bare QC sensitivity levels with
        // "QC sensitivity". Nothing produces the quality tokens any more, and the
        // sensitivity values now appear under a field labeled `QC sensitivity`, so
        // the suffix read as "QC sensitivity: High QC sensitivity".
        prettyToken(value) {
            let tokenMap = {
                continuous_gradient: "Continuous gradient",
                continuous_or_hard_callable_if_separable: "Continuous, or hard-callable if separable",
            };
            let normalized = this.normalizeKey(value);

            if (tokenMap[normalized]) {
                return tokenMap[normalized];
            }

            return this.formatDisplayLabel(String(value || ""));
        },
        programApiFactor(programId) {
            let match = String(programId || "").match(/program_factor_(\d+)$/i) || String(programId || "").match(/^factor[_\s-]*(\d+)$/i);
            return match ? `Factor${Number(match[1])}` : String(programId || "");
        },
        shortStateLabel(stateId) {
            let metadataRow = this.stateMetadataById[stateId] || { state_id: stateId };
            return this.stateLabel(metadataRow).replace(/^Pancreas Beta Cell /i, "");
        },
        gseaPValue(row) {
            return this.numericField(row, ["gsea_p", "loading_mwu_p", "p_value"]);
        },
        gseaQValue(row) {
            return this.numericField(row, ["gsea_q", "loading_mwu_q", "q_value"]);
        },
        gseaNegLogQValue(row) {
            let qValue = this.gseaQValue(row);
            return qValue && qValue > 0 ? -Math.log10(qValue) : 0;
        },
        // The relationship heatmap mixes curated cell states and QC signatures in
        // one `state_name` column and carries no field that separates them. It
        // used to be filtered on `state_type === "qc_state"`, which no row has, so
        // the filter passed everything and QC signatures were listed as curated
        // state matches. The `qc_` id prefix is what actually distinguishes them;
        // the `state_type` test stays first in case the index starts sending it.
        isQcStateRow(row) {
            if (this.field(row, ["state_type"]) === "qc_state") {
                return true;
            }

            return /^qc[_-]/i.test(String(this.stateKey(row) || ""));
        },
        resolveStateDetail(stateId, fallbackRow) {
            let resolvedId = stateId || this.stateKey(fallbackRow || {}) || "";
            return {
                stateId: resolvedId,
                detail: this.stateMetadataById[resolvedId] || null,
                fallback: fallbackRow || this.cellStateExpressionRows.find((row) => this.stateKey(row) === resolvedId) || null,
                source: this.stateMetadataById[resolvedId] ? "api" : "fallback",
            };
        },
        resolvedStateLabel(resolution) {
            if (resolution.detail) {
                return this.firstNonEmpty([
                    this.nestedValue(resolution.detail, ["summary", "recommended_portal_label"]),
                    resolution.detail.display_name,
                    this.nestedValue(resolution.detail, ["state", "label"]),
                ]) || this.shortStateLabel(resolution.stateId);
            }

            return this.stateLabel(resolution.fallback || { state_id: resolution.stateId }) || this.shortStateLabel(resolution.stateId);
        },
        resolvedStateDescription(resolution) {
            if (resolution.detail) {
                return this.firstNonEmpty([
                    this.nestedValue(resolution.detail, ["summary", "portal_user_summary"]),
                    this.nestedValue(resolution.detail, ["summary", "gene_expression_interpretation"]),
                    this.nestedValue(resolution.detail, ["summary", "biological_description"]),
                    this.nestedValue(resolution.detail, ["summary", "recommended_portal_summary"]),
                    this.nestedValue(resolution.detail, ["summary", "short_description"]),
                    this.nestedValue(resolution.detail, ["summary", "curation_notes"]),
                ]);
            }

            return this.stateDescription(resolution.fallback);
        },
        // Each badge is labeled with the curation field it came from, so a value
        // like `Provisional` says provisional *what*.
        //
        // Where the curation came from and how far it has been reviewed, shown in
        // the panel header opposite the title.
        //
        // This is deliberately short. The metadata index also carries state class,
        // interpretation status, release class, portal visibility, QC sensitivity,
        // establishment level and hard-call policy, all populated -- but they are
        // pipeline classifications rather than anything a portal reader can act on,
        // so they are not shown. `provenance_warnings` (pipeline rule tags) is out
        // for the same reason.
        stateProvenanceRows(resolution) {
            let pairs = resolution.detail
                ? [
                    ["Curation status", this.nestedValue(resolution.detail, ["quality", "quality_label"]) || this.nestedValue(resolution.detail, ["quality", "quality_class"])],
                    ["Curated by", this.nestedValue(resolution.detail, ["curation", "curated_by"])],
                    ["Curation version", this.nestedValue(resolution.detail, ["curation", "curation_version"])],
                    ["Manual review", this.nestedValue(resolution.detail, ["curation", "manual_review_status"])],
                ]
                : [
                    ["Manual review", this.field(resolution.fallback, ["manual_review_status"])],
                ];

            return this.buildDetailFieldRows(pairs);
        },
        // `[label, value]` pairs to `{ label, value }` rows, dropping anything the
        // API did not send. Unlike the badge builder this keeps duplicate values:
        // two curation fields legitimately carrying the same token are two facts.
        buildDetailFieldRows(pairs = []) {
            return pairs
                .filter((pair) => pair[1] !== null && pair[1] !== undefined && pair[1] !== "")
                .map((pair) => ({ label: pair[0], value: this.displayFieldValue(pair[1]) }));
        },
        // Only snake_case machine tokens get reformatted. Several curation fields
        // already hold prose -- `portal_display_establishment` is
        // "Disease-associated concept; composite interpretation required" -- and
        // running that through the token formatter title-cases every word.
        displayFieldValue(value) {
            let text = String(value);
            return /\s/.test(text) ? text : this.prettyToken(text);
        },
        // The four `gene_expression_*` fields are the gene-facing reading of the
        // state. `interpretation_caveat` and `do_not_overinterpret_as` are about
        // the state itself rather than about a gene, and both are populated
        // alongside their gene-facing counterparts -- they used to sit behind `||`
        // fallbacks that never fired, so neither was ever shown.
        stateInterpretationRows(resolution) {
            let rows = resolution.detail
                ? [
                    ["If your gene is enriched here", this.nestedValue(resolution.detail, ["summary", "gene_expression_interpretation"])],
                    ["Caveat", this.nestedValue(resolution.detail, ["summary", "gene_expression_caveat"])],
                    ["What to check next", this.nestedValue(resolution.detail, ["summary", "gene_expression_followup"])],
                    ["Do not conclude", this.nestedValue(resolution.detail, ["summary", "gene_expression_overinterpretation_warning"])],
                ]
                : [
                    ["If your gene is enriched here", this.field(resolution.fallback, ["gene_expression_interpretation"])],
                    ["Caveat", this.field(resolution.fallback, ["gene_expression_caveat"])],
                    ["What to check next", this.field(resolution.fallback, ["gene_expression_followup"])],
                    ["Do not conclude", this.field(resolution.fallback, ["gene_expression_overinterpretation_warning"])],
                ];

            return rows
                .filter((row) => row[1] !== null && row[1] !== undefined && row[1] !== "")
                .map((row) => ({ label: row[0], value: row[1] }));
        },
        // How to read the state itself, independent of any gene.
        stateReadingRows(resolution) {
            let rows = resolution.detail
                ? [
                    ["How to use this state", this.nestedValue(resolution.detail, ["summary", "recommended_portal_summary"])],
                    ["Composite caveat", this.nestedValue(resolution.detail, ["summary", "interpretation_caveat"])],
                    ["Not a marker of", this.nestedValue(resolution.detail, ["summary", "do_not_overinterpret_as"])],
                    ["Curation notes", this.nestedValue(resolution.detail, ["summary", "curation_notes"])],
                ]
                : [
                    ["How to use this state", this.field(resolution.fallback, ["recommended_portal_summary"])],
                    ["Composite caveat", this.field(resolution.fallback, ["interpretation_caveat"])],
                    ["Not a marker of", this.field(resolution.fallback, ["do_not_overinterpret_as"])],
                    ["Curation notes", this.field(resolution.fallback, ["curation_notes"])],
                ];

            return rows
                .filter((row) => row[1] !== null && row[1] !== undefined && row[1] !== "")
                .map((row) => ({ label: row[0], value: row[1] }));
        },
        markerCitationLabel(citation) {
            return this.firstNonEmpty([
                citation && citation.citation_label,
                citation && citation.title,
                citation && citation.raw_citation_text,
                citation && citation.url,
                citation && citation.pmid,
                citation && citation.doi,
            ]);
        },
        // Citations are per-marker, so they render as links in the marker
        // provenance table rather than as a separate reference list. There is no
        // state-level References tab any more: `state_level_citations` is the same
        // set of papers the markers cite, so the tab restated the provenance table
        // with the gene attribution removed.
        markerCitationLinks(marker) {
            let citations = Array.isArray(marker && marker.citations) ? marker.citations : [];

            return citations
                .map((citation) => ({
                    label: this.markerCitationLabel(citation) || "Citation",
                    url: citation.url || (citation.doi ? `https://doi.org/${citation.doi}` : ""),
                }))
                .filter((citation) => !!citation.label);
        },
        stateMarkerDetail(resolution) {
            if (resolution.detail) {
                let markers = this.nestedValue(resolution.detail, ["marker_set", "markers"]) || [];

                return {
                    markers: markers.map((marker) => marker.gene || marker.marker || "").filter((value) => !!value),
                    provenance: markers.map((marker) => ({
                        gene: marker.gene || "",
                        role: marker.role || "",
                        evidence: marker.evidence_level || "",
                        notes: marker.marker_notes || "",
                        sourceType: marker.source_type || "",
                        citations: this.markerCitationLinks(marker),
                    })),
                };
            }

            return {
                markers: this.extractMarkerGenes(resolution.fallback),
                provenance: [],
            };
        },
        // How state activity is scored. Every field here is populated by the
        // metadata index; the block was previously computed and never rendered.
        stateMethodsDetail(resolution) {
            let text;
            let rows;
            let weights;

            if (resolution.detail) {
                text = this.nestedValue(resolution.detail, ["summary", "portal_methods_details"]);
                rows = [
                    ["Primary score", this.nestedValue(resolution.detail, ["scoring", "primary_score"])],
                    ["Secondary score", this.nestedValue(resolution.detail, ["scoring", "secondary_score"])],
                    ["Score scope", this.nestedValue(resolution.detail, ["state", "score_scope"])],
                    ["Hard-call policy", this.nestedValue(resolution.detail, ["scoring", "hard_call_policy"])],
                    ["Hard-call notes", this.nestedValue(resolution.detail, ["state", "hard_call_notes"])],
                    ["Supporting evidence for assignment", this.nestedValue(resolution.detail, ["summary", "required_supporting_evidence"])],
                ];
                weights = this.nestedValue(resolution.detail, ["scoring", "activity_weights"]) || [];
            } else {
                text = this.field(resolution.fallback, ["portal_methods_details"]);
                rows = [
                    ["Score scope", this.field(resolution.fallback, ["score_scope"])],
                    ["Hard-call policy", this.field(resolution.fallback, ["hard_call_policy"])],
                    ["Hard-call notes", this.field(resolution.fallback, ["hard_call_notes"])],
                    ["Supporting evidence for assignment", this.field(resolution.fallback, ["required_supporting_evidence"])],
                ];
                weights = [];
            }

            return {
                text,
                rows: this.buildDetailFieldRows(rows),
                activityWeights: weights
                    .filter((weight) => weight && (weight.label || weight.id))
                    .map((weight) => ({
                        id: weight.id || "",
                        label: weight.label || this.prettyToken(weight.id),
                        description: weight.description || "",
                    })),
            };
        },
        // Program labels are not unique -- several factors can share one suggested
        // label -- so rows that would otherwise read identically get their factor
        // id appended.
        disambiguateLabels(items = [], labelKey, idKey) {
            let counts = items.reduce((map, item) => {
                map[item[labelKey]] = (map[item[labelKey]] || 0) + 1;
                return map;
            }, {});

            return items.map((item) => {
                if (counts[item[labelKey]] > 1 && item[idKey]) {
                    return { ...item, [labelKey]: `${item[labelKey]} (${item[idKey]})` };
                }

                return item;
            });
        },
        // Every match, not just the significant ones -- the detail component has a
        // threshold control and defaults to showing all of them.
        //
        // The heatmap carries only GSEA P and q. It used to also be read for
        // `correlation` / `combined_match_score` / `cell_spearman_r*`, none of
        // which the index sends, so those columns were permanently blank and the
        // "match score" silently fell back to -log10(q) -- a duplicate of the
        // column beside it.
        relatedProgramsForState(stateId) {
            return this.disambiguateLabels(this.relationshipHeatmapRows
                .filter((row) => this.stateKey(row) === stateId && !this.isQcStateRow(row))
                .sort((a, b) => (this.gseaPValue(a) === null ? Number.POSITIVE_INFINITY : this.gseaPValue(a)) - (this.gseaPValue(b) === null ? Number.POSITIVE_INFINITY : this.gseaPValue(b)))
                .map((row) => ({
                    programId: this.programKey(row),
                    programLabel: this.programLabel(row),
                    gseaP: this.gseaPValue(row),
                    gseaQ: this.gseaQValue(row),
                    negLogQ: this.gseaNegLogQValue(row),
                    row,
                })), "programLabel", "programId");
        },
        inferredProgramLabel(programId) {
            let rows = this.relationshipHeatmapRows
                .filter((row) => this.programKey(row) === programId && !this.isQcStateRow(row))
                .sort((a, b) => (this.gseaQValue(a) || Number.POSITIVE_INFINITY) - (this.gseaQValue(b) || Number.POSITIVE_INFINITY));

            return rows[0] ? `${this.shortStateLabel(this.stateKey(rows[0]))}-like program` : "unmatched data-driven program";
        },
        programQcBubbleClass(row) {
            let qValue = this.gseaQValue(row);
            let pValue = this.gseaPValue(row);

            if (qValue !== null && qValue < 0.05) {
                return "bad";
            }

            if (pValue !== null && pValue < 0.05) {
                return "warn";
            }

            return "good";
        },
        qcStateLabel(row) {
            let stateId = this.stateKey(row);
            let rawLabel = this.field(row, ["display_name", "state_label"]);

            if (!rawLabel && stateId && this.stateMetadataById[stateId]) {
                return this.shortStateLabel(stateId);
            }

            rawLabel = rawLabel || this.field(row, ["state_name", "state_id"]);

            return this.formatDisplayLabel(
                String(rawLabel || "")
                    .replace(/^qc_bad_/i, "")
                    .replace(/^qc_/i, "")
            );
        },
        qcMetadataRow(row) {
            let stateId = String(this.field(row, ["qc_signature_id", "state_name", "state_id"]) || "");
            return this.qcMetadataById[stateId] || null;
        },
        formatPValue,
        // The full QC signature table, joined to the QC metadata index. The
        // bubbles only ever exposed display name, category and markers; `tier`,
        // `recommended_use` and `exclude_when` are populated on every signature
        // and are what actually say whether a hit disqualifies the program.
        programQcTableRows(qcRows = []) {
            return qcRows.map((row) => {
                let metadata = this.qcMetadataRow(row) || {};

                return {
                    signatureId: String(this.field(row, ["state_name", "state_id"]) || ""),
                    label: metadata.display_name || this.qcStateLabel(row),
                    category: metadata.category ? this.prettyToken(metadata.category) : "",
                    tier: metadata.tier ? this.prettyToken(metadata.tier) : "",
                    recommendedUse: metadata.recommended_use ? this.prettyToken(metadata.recommended_use) : "",
                    excludeWhen: metadata.exclude_when || "",
                    markers: Array.isArray(metadata.markers) ? metadata.markers : [],
                    gseaP: this.gseaPValue(row),
                    gseaQ: this.gseaQValue(row),
                    tone: this.programQcBubbleClass(row),
                };
            });
        },
        // What the QC evidence actually says, as counts rather than as a verdict.
        // The old header badge claimed a quality class from
        // `suggested_program_quality_class` / `match_class`, neither of which any
        // index returns, so it always fell through to the string
        // "exploratory_biological" and reported it as if the API had said so.
        programQcEvidence(qcRows = [], label) {
            return {
                total: qcRows.length,
                significantQ: qcRows.filter((row) => {
                    let qValue = this.gseaQValue(row);
                    return qValue !== null && qValue < LIGER_SIGNIFICANCE_P;
                }).length,
                significantP: qcRows.filter((row) => {
                    let pValue = this.gseaPValue(row);
                    return pValue !== null && pValue < LIGER_SIGNIFICANCE_P;
                }).length,
                // The factorization's own label, not a derived judgement: most
                // programs in the current release name themselves QC/artifact
                // programs in `gene-program-factor.label`.
                selfLabelledQc: /\bqc\b|artifact/i.test(String(label || "")),
            };
        },
        curatedStateMatchesForProgram(programId) {
            return this.relationshipHeatmapRows
                .filter((row) => this.programKey(row) === programId && !this.isQcStateRow(row))
                .sort((a, b) => (this.gseaQValue(a) === null ? Number.POSITIVE_INFINITY : this.gseaQValue(a)) - (this.gseaQValue(b) === null ? Number.POSITIVE_INFINITY : this.gseaQValue(b)))
                .map((row) => ({
                    stateId: this.stateKey(row),
                    stateLabel: this.shortStateLabel(this.stateKey(row)),
                    gseaP: this.gseaPValue(row),
                    gseaQ: this.gseaQValue(row),
                    negLogQ: this.gseaNegLogQValue(row),
                    row,
                }));
        },
        async getStateTraitRows(stateId) {
            if (this.stateTraitRowsCache[stateId]) {
                return this.stateTraitRowsCache[stateId];
            }

            let tissueKey = this.tissueKeyFromLabel(this.selectedTissue);
            if (!tissueKey || !this.selectedCellType) {
                return [];
            }

            try {
                let payload = await this.fetchJson(this.buildCellStateTraitUrl(this.tissueQueryKey(this.selectedTissue), this.selectedCellType.key, stateId));
                let rows = this.rowsFromResponse(payload);
                this.$set(this.stateTraitRowsCache, stateId, rows);
                return rows;
            } catch (error) {
                return [];
            }
        },
        async getProgramTraitRows(programId) {
            if (this.programTraitRowsCache[programId]) {
                return this.programTraitRowsCache[programId];
            }

            let datasetId = this.tissueDatasetId(this.selectedTissue);
            if (!datasetId || !this.selectedCellType) {
                return [];
            }

            try {
                // Deliberately the real cell type, not the resolved trait
                // partition: factor IDs are namespaced per cell type.
                let payload = await this.fetchJson(this.buildProgramTraitUrl(datasetId, this.selectedCellType.key, this.programApiFactor(programId)));
                let rows = this.rowsFromResponse(payload);
                this.$set(this.programTraitRowsCache, programId, rows);
                return rows;
            } catch (error) {
                return [];
            }
        },
        async getProgramGeneRows(programId) {
            if (this.programGeneRowsCache[programId]) {
                return this.programGeneRowsCache[programId];
            }

            let datasetId = this.tissueDatasetId(this.selectedTissue);
            if (!datasetId || !this.selectedCellType) {
                return [];
            }

            try {
                let payload = await this.fetchJson(this.buildProgramGeneInfoUrl(datasetId, this.selectedCellType.key, this.programApiFactor(programId)));
                let rows = this.rowsFromResponse(payload);
                this.$set(this.programGeneRowsCache, programId, rows);
                return rows;
            } catch (error) {
                return [];
            }
        },
        async getProgramGeneSetRows(programId) {
            if (this.programGeneSetRowsCache[programId]) {
                return this.programGeneSetRowsCache[programId];
            }

            let datasetId = this.tissueDatasetId(this.selectedTissue);
            if (!datasetId || !this.selectedCellType) {
                return [];
            }

            try {
                let payload = await this.fetchJson(this.buildProgramGeneSetInfoUrl(datasetId, this.selectedCellType.key, this.programApiFactor(programId)));
                let rows = this.rowsFromResponse(payload);
                this.$set(this.programGeneSetRowsCache, programId, rows);
                return rows;
            } catch (error) {
                return [];
            }
        },
        async getProgramQcRows(programId) {
            if (this.programQcRowsCache[programId]) {
                return this.programQcRowsCache[programId];
            }

            let datasetId = this.tissueDatasetId(this.selectedTissue);
            if (!datasetId || !this.selectedCellType) {
                return [];
            }

            try {
                let payload = await this.fetchJson(this.buildProgramQcInfoUrl(datasetId, this.selectedCellType.key, this.programApiFactor(programId)));
                let rows = this.rowsFromResponse(payload)
                    .sort((a, b) => {
                        let aQ = this.gseaQValue(a);
                        let bQ = this.gseaQValue(b);
                        let aP = this.gseaPValue(a);
                        let bP = this.gseaPValue(b);
                        let aQSort = Number.isFinite(aQ) ? aQ : Number.POSITIVE_INFINITY;
                        let bQSort = Number.isFinite(bQ) ? bQ : Number.POSITIVE_INFINITY;
                        let aPSort = Number.isFinite(aP) ? aP : Number.POSITIVE_INFINITY;
                        let bPSort = Number.isFinite(bP) ? bP : Number.POSITIVE_INFINITY;

                        if (aQSort !== bQSort) {
                            return aQSort - bQSort;
                        }

                        return aPSort - bPSort;
                    });
                this.$set(this.programQcRowsCache, programId, rows);
                return rows;
            } catch (error) {
                return [];
            }
        },
        // `total` is the full row count from the index, so the table can say what
        // it is a top slice of instead of implying the program has 30 genes.
        //
        // The `rank` mode is the fallback for when the gene-loading index has no
        // rows: `gene-program-factor.top_genes` is an ordered semicolon list with
        // no values attached, so it yields a rank and nothing else. It used to
        // also carry a `rankScore` counted down from the list length, which was
        // invented here rather than returned by anything.
        buildTopGeneRows(rows, meta) {
            let loading = (row) => this.numericField(row, ["loading", "weight", "score", "value"]);
            let positiveRows = rows.filter((row) => (loading(row) || 0) > 0);

            if (positiveRows.length) {
                return {
                    mode: "loading",
                    total: positiveRows.length,
                    rows: positiveRows
                        .sort((a, b) => (loading(b) || 0) - (loading(a) || 0))
                        .slice(0, TOP_GENE_ROWS)
                        .map((row) => ({
                            gene: this.field(row, ["gene", "gene_symbol", "marker", "name"]),
                            loading: loading(row),
                        })),
                };
            }

            let topGenes = this.extractGenes(meta, ["top_genes"]);
            return {
                mode: "rank",
                total: topGenes.length,
                rows: topGenes.slice(0, TOP_GENE_ROWS).map((gene, index) => ({
                    rank: index + 1,
                    gene,
                })),
            };
        },
        // `gene-program-gene-set-factor` returns the gene set name and the two
        // betas, nothing else. The `factor_value` / `relevance_to_factor` and
        // description reads were dropped: no row has them, so the sort key
        // reduced to the betas anyway and the description column was always
        // blank.
        buildProgramGeneSetTableRows(rows = []) {
            return rows
                .filter((row) => this.field(row, ["gene_set"]))
                .map((row) => ({
                    geneSet: this.field(row, ["gene_set"]),
                    beta: this.numericField(row, ["beta"]),
                    betaUncorrected: this.numericField(row, ["beta_uncorrected"]),
                }))
                .sort((a, b) => {
                    let aScore = Math.max(Math.abs(a.beta || 0), Math.abs(a.betaUncorrected || 0));
                    let bScore = Math.max(Math.abs(b.beta || 0), Math.abs(b.betaUncorrected || 0));
                    return bScore - aScore;
                });
        },
        topTraitRows(rows = []) {
            return rows
                .filter((row) => {
                    if (!this.traitKey(row)) {
                        return false;
                    }

                    if (LIGER_FILTER_UNLABELED_HEATMAP_TRAITS && !this.shouldDisplayTraitInHeatmap(row)) {
                        return false;
                    }

                    return this.numericField(row, ["beta"]) !== null || this.numericField(row, ["beta_uncorrected"]) !== null;
                })
                .sort((a, b) => {
                    let aScore = Math.max(Math.abs(this.numericField(a, ["beta"]) || 0), Math.abs(this.numericField(a, ["beta_uncorrected"]) || 0));
                    let bScore = Math.max(Math.abs(this.numericField(b, ["beta"]) || 0), Math.abs(this.numericField(b, ["beta_uncorrected"]) || 0));
                    return bScore - aScore;
                })
                .slice(0, TOP_TRAIT_ROWS)
                .map((row) => ({
                    trait: this.traitDisplayName(row),
                    group: this.traitGroupLabel(row),
                    beta: this.numericField(row, ["beta"]),
                    betaUncorrected: this.numericField(row, ["beta_uncorrected"]),
                }));
        },
        // Every floating tooltip is dismissed by anything that unmounts the rows
        // they are anchored to. They are all fixed-position elements outside the
        // rows themselves, so an unmounted row cannot fire the `mouseleave` that
        // would normally close them.
        hideAllTooltips() {
            this.hideExpressionRowTooltip();
            this.hidePreviewTooltip();
            this.hideActionTooltip();
        },
        // Curation status now lives in the overview, where each value can be
        // labeled with the field it came from. The header badge row it replaced
        // could not do that, and on the program side it reported a quality class
        // no index returns.
        openDetailShell(title) {
            this.hideAllTooltips();
            this.detailTitle = title;
            this.detailContent = null;
            this.detailLoading = true;
            this.detailOpen = true;
            this.revealExploreLayer();
        },
        // The Explore layer sits below the two cards, so a row click can land
        // off screen. A modal made the change unmissable for free; an inline
        // section has to bring itself into view instead.
        revealExploreLayer() {
            if (this.isHydratingFromQuery) {
                return;
            }

            this.$nextTick(() => {
                let layer = this.$refs.exploreLayer;

                if (layer && layer.scrollIntoView) {
                    layer.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            });
        },
        // Clicking a row links the two cards rather than opening a panel; the row's
        // Details button is what opens the panel. Clicking the same row again
        // clears the filter, and only one side can be active at a time.
        toggleLinkedSelection(type, key) {
            if (this.linkedSelection && this.linkedSelection.type === type && this.linkedSelection.key === key) {
                this.linkedSelection = null;
                return;
            }

            this.linkedSelection = { type, key };
        },
        clearLinkedSelection() {
            this.linkedSelection = null;
        },
        onWindowKeydown(event) {
            if (event && event.key === "Escape" && this.detailOpen) {
                this.closeDetail();
            }
        },
        closeDetail() {
            this.clearDetailState();
            this.syncQueryParams({
                cell_state: "",
                gene_program: "",
            });
        },
        // The panel state without the query write, for callers that are already
        // clearing `cell_state` / `gene_program` in their own `syncQueryParams`.
        // Routing those through `closeDetail` pushes a second history entry, so
        // one click costs the user two presses of Back.
        clearDetailState() {
            this.detailOpen = false;
            this.detailTargetId = "";
        },
        async openStateDetail(stateId, fallbackRow) {
            let resolution = this.resolveStateDetail(stateId, fallbackRow);
            let label = this.resolvedStateLabel(resolution);

            this.openDetailShell(label);
            this.detailTargetId = resolution.stateId;

            await this.ensurePhenotypeTraitRows();
            let stateTraitRows = await this.getStateTraitRows(resolution.stateId);
            this.detailContent = {
                type: "state",
                summaryDescription: this.resolvedStateDescription(resolution) || "",
                // There is deliberately no State ID / Tissue / Cell type field
                // list any more: the panel title names the state and the Discover
                // layer above already states the tissue and cell type it is
                // scoped to, so the block only repeated the page back at itself.
                //
                // `biological_description` is not carried either: it is the same
                // text as the header description on most states, and on the rest it
                // says the same thing at greater length.
                provenanceRows: this.stateProvenanceRows(resolution),
                interpretationRows: this.stateInterpretationRows(resolution),
                readingRows: this.stateReadingRows(resolution),
                markerDetail: this.stateMarkerDetail(resolution),
                methodsDetail: this.stateMethodsDetail(resolution),
                relatedPrograms: this.relatedProgramsForState(resolution.stateId),
                traitRows: this.topTraitRows(stateTraitRows),
                traitRowsTotal: stateTraitRows.length,
            };

            this.syncQueryParams({
                cell_state: resolution.stateId,
                gene_program: "",
            });
            this.detailLoading = false;
        },
        async openProgramDetail(programId, fallbackRow) {
            let meta = Object.assign({}, fallbackRow || {}, this.geneProgramInfoById[programId] || {});
            let label = this.field(meta, ["label", "factor_label"]) || this.inferredProgramLabel(programId);
            let curatedMatches = this.curatedStateMatchesForProgram(programId);
            await this.ensureQcMetadataRows();
            let programQcRows = await this.getProgramQcRows(programId);

            this.openDetailShell(label);
            this.detailTargetId = programId;

            await this.ensurePhenotypeTraitRows();
            let [programGeneRows, programTraitRows, programGeneSetRows] = await Promise.all([
                this.getProgramGeneRows(programId),
                this.getProgramTraitRows(programId),
                this.getProgramGeneSetRows(programId),
            ]);

            // `gene-program-factor` returns six fields -- dataset, cell_type,
            // model, factor, label, top_genes -- and that is the whole
            // program-level metadata surface. There is no rationale, no suggested
            // label and no quality class, so the overview reports the factor
            // identity and the QC evidence rather than a curation verdict.
            this.detailContent = {
                type: "program",
                // No program label row: it is the panel title.
                summaryFields: this.buildDetailFieldRows([
                    ["Program ID", this.programApiFactor(programId)],
                    ["Model", this.field(meta, ["model"])],
                ]),
                qcEvidence: this.programQcEvidence(programQcRows, label),
                qcRows: this.programQcTableRows(programQcRows),
                curatedMatches,
                topGenes: this.buildTopGeneRows(programGeneRows, meta),
                traitRows: this.topTraitRows(programTraitRows),
                traitRowsTotal: programTraitRows.length,
                geneSetRows: this.buildProgramGeneSetTableRows(programGeneSetRows),
            };

            this.syncQueryParams({
                cell_state: "",
                gene_program: programId,
            });
            this.detailLoading = false;
        },
        traitKey(row) {
            return this.field(row, ["trait", "trait_label", "trait_internal", "phenotype"]);
        },
        // Phenotype `group` from /api/portal/phenotypes, used to group the trait
        // tables. Traits with no phenotype match fall into one bucket rather than
        // one bucket each.
        traitGroupLabel(valueOrRow) {
            let phenotypeRow = this.traitPhenotypeRow(valueOrRow);
            return (phenotypeRow && phenotypeRow.group) || "Other";
        },
        traitPhenotypeRow(valueOrRow) {
            let traitKey = typeof valueOrRow === "string" ? valueOrRow : this.traitKey(valueOrRow);
            return this.traitPhenotypeLookup[this.normalizeKey(traitKey)];
        },
        shouldDisplayTraitInHeatmap(valueOrRow) {
            let phenotype = this.traitPhenotypeRow(valueOrRow);
            return !!(phenotype && phenotype.description);
        },
        traitDisplayName(valueOrRow) {
            let traitKey = typeof valueOrRow === "string" ? valueOrRow : this.traitKey(valueOrRow);
            let phenotype = this.traitPhenotypeRow(valueOrRow);
            return (phenotype && phenotype.description) || traitKey;
        },
        traitName(row) {
            return this.traitDisplayName(row);
        },
        extractMarkerGenes(row) {
            let genes = this.extractGenes(row, ["markers", "marker_genes", "genes"]);
            if (genes.length > 0) {
                return genes;
            }

            let markerSet = row && row.marker_set;
            if (markerSet && Array.isArray(markerSet.markers)) {
                return Array.from(new Set(
                    markerSet.markers
                        .map((item) => item && (item.gene || item.gene_symbol || item.name))
                        .filter((item) => !!item)
                        .map((item) => String(item))
                ));
            }

            return [];
        },
        joinDisplayList(items = []) {
            return items.length > 0 ? items.join(", ") : "Not available";
        },
        resetGeneResults() {
            this.hideAllTooltips();
            this.scopeEditing = false;
            this.searchEditing = false;
            this.linkedSelection = null;
            this.geneLevelCellStateRows = [];
            this.geneLevelProgramRows = [];
            this.availableTissues = [];
            this.observedDatasetIds = {};
            this.cellStateUsesDatasetKey = false;
            this.selectedTissue = null;
            this.cellTypeExpressionRows = [];
            this.selectedCellType = null;
            this.viewStateInfo = false;
            this.viewProgramInfo = false;
            this.cellStateExpressionRows = [];
            this.programExpressionRows = [];
            this.cellStateMetadataRows = [];
            this.geneProgramInfoRows = [];
            this.relationshipHeatmapRows = [];
            this.stateTraitRowsCache = {};
            this.programTraitRowsCache = {};
            this.programGeneSetRowsCache = {};
            this.programGeneRowsCache = {};
            this.programQcRowsCache = {};
            this.isLoadingCellTypes = false;
            this.isLoadingCellStateSection = false;
            this.isLoadingGeneProgramSection = false;
            this.isLoadingRelationshipHeatmap = false;
            this.cellTypeLoadError = null;
            this.cellStateSectionError = null;
            this.geneProgramSectionError = null;
            this.relationshipHeatmapError = null;
            // `submitGeneSearch` / `selectTissue` write the cleared query params
            // themselves, so this only drops the panel state.
            this.clearDetailState();
        },
        resetCellTypeResults() {
            this.hideAllTooltips();
            this.linkedSelection = null;
            this.cellTypeExpressionRows = [];
            this.selectedCellType = null;
            this.viewStateInfo = false;
            this.viewProgramInfo = false;
            this.isLoadingCellTypes = false;
            this.cellStateExpressionRows = [];
            this.programExpressionRows = [];
            this.cellStateMetadataRows = [];
            this.geneProgramInfoRows = [];
            this.relationshipHeatmapRows = [];
            this.stateTraitRowsCache = {};
            this.programTraitRowsCache = {};
            this.programGeneSetRowsCache = {};
            this.programGeneRowsCache = {};
            this.programQcRowsCache = {};
            this.isLoadingCellStateSection = false;
            this.isLoadingGeneProgramSection = false;
            this.isLoadingRelationshipHeatmap = false;
            this.cellTypeLoadError = null;
            this.cellStateSectionError = null;
            this.geneProgramSectionError = null;
            this.relationshipHeatmapError = null;
            // `submitGeneSearch` / `selectTissue` write the cleared query params
            // themselves, so this only drops the panel state.
            this.clearDetailState();
        },
        collectTissues(rows = []) {
            return rows
                .map((row) => this.tissueLabel(row))
                .filter((value) => !!value)
                .filter((value) => this.tissueAllowed(value));
        },
        // Records the dataset ID a portal reported for each tissue, so the
        // dataset-keyed endpoints downstream query the ID this portal actually
        // serves rather than the first one in the static config.
        collectDatasetIds(rows = []) {
            rows.forEach((row) => {
                let datasetId = this.rowDatasetId(row);
                let tissueKey = this.rowTissueKey(row);

                if (datasetId && tissueKey && !this.observedDatasetIds[tissueKey]) {
                    Vue.set(this.observedDatasetIds, tissueKey, datasetId);
                }
            });
        },
        async lookupGenes(input) {
            try {
                let payload = await this.fetchJson(this.buildMatchUrl(input));
                let matches = this.rowsFromResponse(payload).slice(0, 10);

                if (input !== this.searchedGene.trim()) {
                    return;
                }

                this.geneSuggestions = matches || [];
                this.noGeneSuggestions = this.geneSuggestions.length === 0;
            } catch (error) {
                this.geneSuggestions = [];
                this.noGeneSuggestions = true;
                this.geneSearchError = "Unable to load gene suggestions right now.";
            } finally {
                if (input === this.searchedGene.trim()) {
                    this.isLoadingGeneSuggestions = false;
                }
            }
        },
        async onSuggestionSelected(gene) {
            let selectedGene = this.normalizeGeneLabel(gene);
            this.skipGeneSuggestionLookup = true;
            this.searchedGene = selectedGene;
            this.geneSuggestions = [];
            this.noGeneSuggestions = false;
            this.isLoadingGeneSuggestions = false;
            await this.submitGeneSearch(selectedGene);
        },
        async onSearchClick() {
            await this.submitGeneSearch(this.searchedGene);
        },
        async submitGeneSearch(gene) {
            let normalizedGene = this.normalizeGeneLabel(gene).trim();

            this.resetGeneResults();
            this.geneSearchError = null;
            this.geneSuggestions = [];
            this.noGeneSuggestions = false;
            this.isLoadingGeneSuggestions = false;

            if (this.geneSuggestionTimer) {
                clearTimeout(this.geneSuggestionTimer);
                this.geneSuggestionTimer = null;
            }

            if (!normalizedGene) {
                this.selectedGene = null;
                this.syncQueryParams({
                    gene: "",
                    tissue: "",
                    cell_type: "",
                    cell_state: "",
                    gene_program: "",
                });
                return;
            }

            this.isLoadingGeneData = true;
            this.selectedGene = normalizedGene;
            this.syncQueryParams({
                gene: normalizedGene,
                tissue: "",
                cell_type: "",
                cell_state: "",
                gene_program: "",
            });

            try {
                let [cellStatePayload, programPayload] = await Promise.all([
                    this.fetchJson(this.buildCellStateExpressionUrl(normalizedGene)),
                    this.fetchJson(this.buildProgramExpressionUrl(normalizedGene)),
                ]);

                let geneLevelCellStateRows = this.rowsFromResponse(cellStatePayload);
                let geneLevelProgramRows = this.rowsFromResponse(programPayload);

                this.collectDatasetIds(geneLevelCellStateRows);
                this.collectDatasetIds(geneLevelProgramRows);

                this.geneLevelCellStateRows = geneLevelCellStateRows;
                // The program section only ever queries one model, so the preview
                // counts have to be filtered the same way or they overcount.
                this.geneLevelProgramRows = geneLevelProgramRows.filter((row) => {
                    let model = this.field(row, ["model"]);
                    return !model || model === LIGER_PROGRAM_MODEL;
                });
                this.cellStateUsesDatasetKey = this.detectCellStateDatasetKeying(geneLevelCellStateRows);

                let uniqueTissues = Array.from(
                    new Set(
                        [
                            ...this.collectTissues(geneLevelCellStateRows),
                            ...this.collectTissues(geneLevelProgramRows),
                        ]
                    )
                ).sort((a, b) => a.localeCompare(b));

                this.availableTissues = uniqueTissues;

                if (this.availableTissues.length === 0) {
                    this.geneSearchError = `No tissues are currently available for ${normalizedGene}.`;
                } else if (this.availableTissues.length === 1) {
                    await this.selectTissue(this.availableTissues[0]);
                }
            } catch (error) {
                this.selectedGene = null;
                this.geneSearchError = "Unable to load LIGER expression data for that gene.";
            } finally {
                this.isLoadingGeneData = false;
            }
        },
        // Reopens both scope selectors without discarding the current selection,
        // so the user can change one step and leave the rest alone.
        toggleScopeEditing() {
            this.scopeEditing = !this.scopeEditing;
        },
        // Reopens the gene search. The current gene stays selected until a new
        // search actually runs, so nothing below is discarded on the way in.
        toggleSearchEditing() {
            this.searchEditing = !this.searchEditing;

            if (!this.searchEditing) {
                return;
            }

            this.$nextTick(() => {
                if (this.$refs.geneSearchInput) {
                    this.$refs.geneSearchInput.focus();
                    this.$refs.geneSearchInput.select();
                }
            });
        },
        async applyExampleGene(gene) {
            this.skipGeneSuggestionLookup = true;
            this.searchedGene = this.normalizeGeneLabel(gene);
            await this.submitGeneSearch(this.searchedGene);
        },
        async selectTissue(tissue) {
            this.selectedTissue = tissue;
            this.syncQueryParams({
                tissue: this.tissueKeyFromLabel(tissue) || "",
                cell_type: "",
                cell_state: "",
                gene_program: "",
            });
            await this.loadCellTypeExpression(tissue);
        },
        async loadCellTypeExpression(tissue) {
            this.resetCellTypeResults();

            if (!this.selectedGene || !tissue) {
                return;
            }

            this.isLoadingCellTypes = true;

            try {
                let payload = await this.fetchJson(this.buildCellTypeExpressionUrl(this.tissueQueryKey(tissue), this.selectedGene));
                let rows = this.rowsFromResponse(payload);

                this.cellTypeExpressionRows = rows.filter((row) => !!this.cellTypeLabel(row));

                if (this.cellTypeExpressionRows.length === 0) {
                    this.cellTypeLoadError = `No cell type expression is currently available for ${this.selectedGene} in ${tissue}.`;
                }
            } catch (error) {
                this.cellTypeLoadError = `Unable to load cell type expression for ${tissue}.`;
            } finally {
                this.isLoadingCellTypes = false;
            }
        },
        // Nothing that was derived from the previous cell type survives this.
        // `selectTissue` gets all of it for free via `resetCellTypeResults`, but
        // this path loads the new sections directly, so it has to clear the old
        // scope's leftovers itself:
        //
        // - the hover preview, because selecting collapses both selector cards
        //   and an unmounted row never fires `mouseleave`
        // - the open detail panel, which would otherwise keep showing a state or
        //   program belonging to the cell type the user just navigated away from
        // - the linked selection, which would filter the new cell type's programs
        //   against a state that does not exist in it
        async selectCellType(cellType) {
            this.hidePreviewTooltip();
            this.clearDetailState();
            this.linkedSelection = null;
            this.selectedCellType = cellType;
            this.scopeEditing = false;
            this.syncQueryParams({
                cell_type: cellType.key,
                cell_state: "",
                gene_program: "",
            });
            await Promise.all([
                this.loadCellStateSection(cellType),
                this.loadGeneProgramSection(cellType),
                this.loadRelationshipHeatmap(cellType),
            ]);
        },
        async loadCellStateSection(cellType) {
            this.cellStateExpressionRows = [];
            this.cellStateMetadataRows = [];
            this.cellStateSectionError = null;

            if (!this.selectedGene || !this.selectedTissue || !cellType) {
                return;
            }

            let tissueKey = this.tissueKeyFromLabel(this.selectedTissue);
            if (!tissueKey) {
                this.cellStateSectionError = "Unable to determine the selected tissue.";
                return;
            }

            this.isLoadingCellStateSection = true;

            try {
                let [expressionPayload, metadataPayload] = await Promise.all([
                    this.fetchJson(this.buildCellStateSectionExpressionUrl(this.tissueQueryKey(this.selectedTissue), cellType.key, this.selectedGene)),
                    this.fetchJson(this.buildCellStateMetadataUrl(tissueKey, cellType.key)),
                ]);

                this.cellStateExpressionRows = this.rowsFromResponse(expressionPayload);
                this.cellStateMetadataRows = this.rowsFromResponse(metadataPayload);

                if (!this.cellStateExpressionRows.length && !this.cellStateMetadataRows.length) {
                    this.cellStateSectionError = `No cell state data is currently available for ${cellType.label} in ${this.selectedTissue}.`;
                }
            } catch (error) {
                this.cellStateSectionError = `Unable to load cell state data for ${cellType.label}.`;
            } finally {
                this.isLoadingCellStateSection = false;
            }
        },
        async loadGeneProgramSection(cellType) {
            this.programExpressionRows = [];
            this.geneProgramInfoRows = [];
            this.geneProgramSectionError = null;

            if (!this.selectedGene || !this.selectedTissue || !cellType) {
                return;
            }

            let datasetId = this.tissueDatasetId(this.selectedTissue);
            if (!datasetId) {
                this.geneProgramSectionError = "Unable to determine the selected dataset.";
                return;
            }

            this.isLoadingGeneProgramSection = true;

            try {
                let [expressionPayload, infoPayload] = await Promise.all([
                    this.fetchJson(this.buildProgramSectionExpressionUrl(datasetId, cellType.key, this.selectedGene)),
                    this.fetchJson(this.buildGeneProgramInfoUrl(datasetId, cellType.key)),
                ]);

                this.programExpressionRows = this.rowsFromResponse(expressionPayload);
                this.geneProgramInfoRows = this.rowsFromResponse(infoPayload);

                if (!this.programExpressionRows.length && !this.geneProgramInfoRows.length) {
                    this.geneProgramSectionError = `No gene program data is currently available for ${cellType.label} in ${this.selectedTissue}.`;
                }
            } catch (error) {
                this.geneProgramSectionError = `Unable to load gene program data for ${cellType.label}.`;
            } finally {
                this.isLoadingGeneProgramSection = false;
            }
        },
        async loadRelationshipHeatmap(cellType) {
            this.relationshipHeatmapRows = [];
            this.relationshipHeatmapError = null;

            if (!this.selectedTissue || !cellType) {
                return;
            }

            let tissueKey = this.tissueKeyFromLabel(this.selectedTissue);
            if (!tissueKey) {
                this.relationshipHeatmapError = "Unable to determine the selected tissue.";
                return;
            }

            this.isLoadingRelationshipHeatmap = true;

            try {
                let payload = await this.fetchJson(this.buildRelationshipHeatmapUrl(this.tissueQueryKey(this.selectedTissue), cellType.key));
                this.relationshipHeatmapRows = this.rowsFromResponse(payload);

                if (!this.relationshipHeatmapRows.length) {
                    this.relationshipHeatmapError = `No relationship heatmap data is currently available for ${cellType.label} in ${this.selectedTissue}.`;
                    return;
                }

            } catch (error) {
                this.relationshipHeatmapError = `Unable to load relationship heatmap data for ${cellType.label}.`;
            } finally {
                this.isLoadingRelationshipHeatmap = false;
            }
        },
    }
});
</script>

<template>
    <div id="liger" class="f-col g-40" :style="themeStyle">
        <div class="f-col g-10">
            <div class="f-row g-40">
                <div class="f-col g-10 flex1">
                    <h3 class="bold">{{ pageTitle }}</h3>
                    <h5 class="headline">
                        Explore where a gene is expressed and the cell states and gene
                        programs associated with its expression.
                    </h5>
                    <div class="ai-disclosure">
                        <span class="bold">Note:</span> this resource uses AI-assisted curation of program names and cell states; manual review and curation are ongoing. Please see cell state and program metadata for details.
                    </div>
                </div>
                <!-- The figure rides alongside the headline as a thumbnail rather
                     than taking a full-width band of its own: it is orienting
                     material, not a step in the workflow. Clicking it opens the
                     full figure as an overlay. `align-h-bottom` is this repo's
                     `align-items: flex-end`, so the figure and the documentation
                     link under it both sit against the right edge. -->
                <div class="f-col align-h-bottom flex1 g-5">
                    <details><summary>Cell-state model &amp; interpretation</summary><cell-state-infographic thumbnail /></details>
                    <a :href="documentationUrl" target="_blank" style="width:fit-content">Read Documentation</a>
                </div>
            </div>
        </div>

        <!-- Layer 1 - Search. The gene is not part of the scope: tissue and cell
             type are questions *about* a gene, so choosing one has to come first
             and stand on its own rather than being the first cell of the scope
             bar it defines. -->
        <div class="liger-layer" :class="{ current: isLandingState }">
            <div class="layer-head">
                <span class="layer-number">1</span>
                <div class="f-col">
                    <div class="layer-title">Search</div>
                    <div class="layer-question">Which gene do you want to explore?</div>
                </div>
                <button v-if="!showGeneSearchInput" type="button" class="context-change" @click="toggleSearchEditing">Change</button>
                <!-- Reopening the search must not be a one-way door: the
                        current gene is still selected until a new search
                        runs, so there has to be a way back to it. -->
                <button
                    v-if="searchEditing && hasGeneContext"
                    type="button"
                    class="context-change"
                    @click="toggleSearchEditing"
                >
                    Keep {{ selectedGene }}
                </button>
            </div>
            <div class="layer-body f-col g-10">
                <template v-if="showGeneSearchInput">
                    <div class="search f-row g-5 relative">
                        <div class="search-input-wrap flex1 relative">
                            <input
                                ref="geneSearchInput"
                                type="text"
                                class="flex1"
                                v-model.trim="searchedGene"
                                autocomplete="off"
                                @keyup.enter="onSearchClick"
                            />
                            <div v-if="showGeneSuggestions" class="suggestions-panel">
                                <div v-if="isLoadingGeneSuggestions" class="suggestion-message">
                                    Searching genes...
                                </div>
                                <div
                                    v-else-if="noGeneSuggestions"
                                    class="suggestion-message"
                                >
                                    No matching genes found.
                                </div>
                                <button
                                    v-else
                                    v-for="gene in geneSuggestions"
                                    :key="normalizeGeneLabel(gene)"
                                    type="button"
                                    class="suggestion-item"
                                    @click="onSuggestionSelected(gene)"
                                >
                                    {{ normalizeGeneLabel(gene) }}
                                </button>
                            </div>
                        </div>
                        <button class="primary bold"
                            @click="onSearchClick"
                        >
                            Search
                        </button>
                    </div>
                    <div class="f-row g-10 align-v-center">
                        <div v-if="exampleGenes.length" class="example-genes f-row g-5 align-v-center">
                            <span class="example-genes-label">Try</span>
                            <button
                                v-for="gene in exampleGenes"
                                :key="`example-${gene}`"
                                type="button"
                                class="example-gene"
                                @click="applyExampleGene(gene)"
                            >
                                {{ gene }}
                            </button>
                        </div>
                    </div>
                    <div v-if="geneSearchError" class="search-feedback error">{{ geneSearchError }}</div>
                    <div v-else-if="isLoadingGeneData" class="search-feedback">Loading gene data...</div>
                </template>
                <div v-else class="f-row g-10 align-v-center">
                    <div class="scope-step">
                        <div class="scope-step-label">Gene</div>
                        <div class="selected-gene">{{ selectedGene }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Layer 2 - Scope. The scope bar and the selectors are the same thing:
             two steps that read as instructions before they are chosen and as
             scope once they are. One Change reopens both. -->
        <div v-if="hasGeneContext" class="liger-layer" :class="{ current: !selectedCellType }">
            <div class="layer-head">
                <span class="layer-number">2</span>
                <div class="f-col">
                    <div class="layer-title">Scope</div>
                    <div class="layer-question">Select a tissue and cell type to see associated states and programs</div>
                </div>
                <button
                    v-if="showScopeChange"
                    type="button"
                    class="context-change"
                    @click="toggleScopeEditing"
                >
                    {{ scopeEditing ? 'Done' : 'Change' }}
                </button>
            </div>
            <div class="scope-bar">
                <div class="scope-step" :class="{ active: !selectedTissue, filled: !!selectedTissue }">
                    <div class="scope-step-label">Tissue</div>
                    <div v-if="selectedTissue" class="scope-step-value">{{ selectedTissue }}</div>
                    <div v-else class="scope-step-pending">Select a tissue</div>
                </div>

                <div class="scope-step" :class="{ active: !!selectedTissue && !selectedCellType, filled: !!selectedCellType }">
                    <div class="scope-step-label">Cell type</div>
                    <div v-if="selectedCellType" class="scope-step-value">{{ selectedCellType.label }}</div>
                    <div v-else class="scope-step-pending">Select a cell type</div>
                </div>
            </div>

            <div v-if="showSelectorRow" class="scope-selectors f-col g-10">
                <div class="f-row g-20">
                    <div v-if="showTissueSelector" class="f-col g-5 flex1">
                        <div class="section-card f-col g-10">
                            <div class="scroll-panel" @scroll="hidePreviewTooltip">
                                <div class="options f-col">
                                    <div v-if="isLoadingGeneData" class="empty-state">
                                        Loading tissues...
                                    </div>
                                    <div v-if="!isLoadingGeneData && !availableTissues.length" class="empty-state">
                                        No tissues available yet for this gene.
                                    </div>
                                    <div v-for="tissue in availableTissues"
                                        :key="tissue"
                                        class="grid-item"
                                        :class="{selected: selectedTissue === tissue}"
                                        @mouseenter="showPreviewTooltip($event, 'tissue', tissue)"
                                        @mouseleave="hidePreviewTooltip"
                                        @click="selectTissue(tissue)"
                                    >
                                        {{tissue}}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-if="showCellTypeSelector" class="f-col g-5 flex1">
                        <div class="section-card relative">
                            <div v-if="isLoadingCellTypes" class="card-overlay">
                                <div>Loading cell types...</div>
                            </div>
                            <div class="f-row g-20">
                                <div class="f-col flex1">
                                    <div class="bar-grid-header" :class="{'no-spec': !showCellTypeSpecificity}">
                                        <div class="bold">Cell Type</div>
                                        <div class="bold">
                                            <span class="metric-tooltip">
                                                <span class="metric-tooltip-label">Expression</span>
                                                <span class="metric-tooltip-bubble">{{ absoluteExpressionTooltipByKind.cellType }}</span>
                                            </span>
                                        </div>
                                        <template v-if="showCellTypeSpecificity">
                                            <div class="bold">
                                                <span class="metric-tooltip">
                                                    <span class="metric-tooltip-label">Specificity</span>
                                                    <span class="metric-tooltip-bubble">{{ specificityTooltipByKind.cellType }}</span>
                                                </span>
                                            </div>
                                        </template>
                                    </div>
                                    <div class="axis-row unit-row" :class="{'no-spec': !showCellTypeSpecificity}">
                                        <div class="axis-unit">n={{ cellTypeCount }}</div>
                                        <div class="axis-unit">{{ expressionUnitLabel }}</div>
                                        <div v-if="showCellTypeSpecificity" class="axis-unit">{{ specificityUnitLabel }}</div>
                                    </div>
                                    <div class="axis-row" :class="{'no-spec': !showCellTypeSpecificity}">
                                        <div></div>
                                        <div class="axis-scale">
                                            <span
                                                v-for="tick in expressionAxisTicks"
                                                :key="`ct-x-${tick.value}`"
                                                class="axis-tick"
                                                :style="{ left: tick.offset }"
                                            >{{ tick.label }}</span>
                                        </div>
                                        <div v-if="showCellTypeSpecificity" class="axis-scale">
                                            <span
                                                v-for="tick in cellTypeSpecificityTicks"
                                                :key="`ct-s-${tick.value}`"
                                                class="axis-tick"
                                                :style="{ left: tick.offset }"
                                            >{{ tick.label }}</span>
                                        </div>
                                    </div>
                                    <div class="scroll-panel f-col" @scroll="hidePreviewTooltip">
                                        <div v-if="cellTypeLoadError" class="empty-state">
                                            {{ cellTypeLoadError }}
                                        </div>
                                        <div
                                            v-for="cellType in availableCellTypes"
                                            :key="cellType.key"
                                            class="bar-grid-item grid-item"
                                            :class="{
                                                selected: selectedCellType && selectedCellType.key === cellType.key,
                                                'no-data': !cellType.hasExpression,
                                                'no-spec': !showCellTypeSpecificity
                                            }"
                                            @mouseenter="showPreviewTooltip($event, 'cellType', cellType)"
                                            @mouseleave="hidePreviewTooltip"
                                            @click="selectCellType(cellType)"
                                        >
                                            <div class="bar-label">{{cellType.label}}</div>
                                            <div class="bar-cell">
                                                <div class="bar-track">
                                                    <div
                                                        v-if="cellType.hasExpression"
                                                        class="bar-fill"
                                                        :class="{ 'overflow-high': cellType.expressionOverflow === 'high' }"
                                                        :style="{ width: cellType.expressionWidth }"
                                                    ></div>
                                                </div>
                                                <div class="bar-number">{{cellType.absText}}</div>
                                            </div>
                                            <div v-if="showCellTypeSpecificity" class="bar-cell">
                                                <div class="bar-track diverging">
                                                    <div
                                                        v-if="cellType.hasSpec"
                                                        class="bar-fill-diverging"
                                                        :class="{ negative: cellType.spec < 0, muted: cellType.muted, clamped: !!cellType.specOverflow }"
                                                        :style="{ '--k': cellType.specScale }"
                                                    ></div>
                                                </div>
                                                <div class="bar-number">{{cellType.specText}}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Layer 3 - Discover. -->
        <div v-if="showAnalysisState" id="liger-body" class="liger-layer" :class="{ current: !detailOpen }">
            <div class="layer-head">
                <span class="layer-number">3</span>
                <div class="f-col">
                    <div class="layer-title">Discover</div>
                    <div class="layer-question">{{ discoverQuestion }}</div>
                </div>
            </div>
            <div class="layer-body f-col g-20">
                <div class="f-row g-20">
                    <div class="f-col g-10 flex1">
                        <div class="f-col" style="padding:0 22px;">
                            <div class="f-row spread-out">
                                <div class="f-row g-5">
                                    <div class="scope-step-label">Cell States</div>
                                </div>
                                <!--
                                <button v-if="selectedCellType"
                                    @click="viewStateInfo=!viewStateInfo"
                                >
                                    Show {{ viewStateInfo ? 'Expression': 'Info'}}
                                </button>
                                -->
                            </div>
                            <div class="f-row spread-out g-10 align-v-bottom">
                                <div class="subtitle-2">Cell states are curated, marker-defined biology.</div>
                            </div>
                            <div v-if="cellStateFilterNote" class="filter-note f-row g-10 align-v-center spread-out">
                                <span>Showing cell states {{ cellStateFilterNote }}</span>
                                <button type="button" class="context-change" @click="clearLinkedSelection">Clear</button>
                            </div>
                        </div>
                        <div class="section-card flex1 relative">
                            <div v-if="isLoadingCellStateSection" class="card-overlay">
                                <div>Loading cell states...</div>
                            </div>
                            <div v-if="!viewStateInfo" class="expression f-col flex1">
                                <div class="bar-grid-header with-row-action">
                                    <div class="bold">Cell State</div>
                                    <div class="bold">
                                        <span class="metric-tooltip">
                                            <span class="metric-tooltip-label">Expression</span>
                                            <span class="metric-tooltip-bubble">{{ absoluteExpressionTooltipByKind.state }}</span>
                                        </span>
                                    </div>
                                    <div class="bold">
                                        <span class="metric-tooltip">
                                            <span class="metric-tooltip-label">Specificity</span>
                                            <span class="metric-tooltip-bubble">{{ specificityTooltipByKind.state }}</span>
                                        </span>
                                    </div>
                                </div>
                                <div class="axis-row unit-row with-row-action">
                                    <div class="axis-unit">
                                        <span class="count" v-if="cellStateFilterNote">n={{ cellStateExpressionList.length }} of {{ cellStateCount }}</span>
                                        <span class="count" v-else-if="cellStateCount>0">n={{ cellStateCount }}</span>
                                    </div>
                                    <div class="axis-unit">{{ expressionUnitLabel }}</div>
                                    <div class="axis-unit">{{ specificityUnitLabel }}</div>
                                    <div></div>
                                </div>
                                <div class="axis-row with-row-action">
                                    <div></div>
                                    <div class="axis-scale">
                                        <span
                                            v-for="tick in expressionAxisTicks"
                                            :key="`st-x-${tick.value}`"
                                            class="axis-tick"
                                            :style="{ left: tick.offset }"
                                        >{{ tick.label }}</span>
                                    </div>
                                    <div class="axis-scale">
                                        <span
                                            v-for="tick in cellStateSpecificityTicks"
                                            :key="`st-s-${tick.value}`"
                                            class="axis-tick"
                                            :style="{ left: tick.offset }"
                                        >{{ tick.label }}</span>
                                    </div>
                                    <div></div>
                                </div>
                                <div class="scroll-panel f-col" @scroll="hideExpressionRowTooltip(); hideActionTooltip()">
                                    <div v-if="cellStateSectionError" class="empty-state">
                                        {{ cellStateSectionError }}
                                    </div>
                                    <div v-else-if="cellStateFilterNote && !cellStateExpressionList.length" class="empty-state">
                                        No cell states significantly match {{ linkedSelectionLabel }}.
                                    </div>
                                    <div
                                        v-for="cellState in cellStateExpressionList"
                                        :key="cellState.key"
                                        class="bar-grid-item grid-item with-row-action"
                                        :class="{
                                            selected: highlightedStateKey === cellState.key,
                                            'no-data': !cellState.hasExpression
                                        }"
                                        @mouseenter="showExpressionRowTooltip($event, 'state', cellState)"
                                        @mousemove="showExpressionRowTooltip($event, 'state', cellState)"
                                        @mouseleave="hideExpressionRowTooltip"
                                        @click="openStateDetail(cellState.key, cellState.row)"
                                    >
                                        <div class="bar-label">{{cellState.label}}</div>
                                        <div class="bar-cell">
                                            <div class="bar-track">
                                                <div
                                                    v-if="cellState.hasExpression"
                                                    class="bar-fill"
                                                    :class="{ 'overflow-high': cellState.expressionOverflow === 'high' }"
                                                    :style="{ width: cellState.expressionWidth }"
                                                ></div>
                                            </div>
                                            <div class="bar-number">{{cellState.absText}}</div>
                                        </div>
                                        <div class="bar-cell">
                                            <div class="bar-track diverging">
                                                <div
                                                    v-if="cellState.hasSpec"
                                                    class="bar-fill-diverging"
                                                    :class="{ negative: cellState.spec < 0, muted: cellState.muted, clamped: !!cellState.specOverflow }"
                                                    :style="{ '--k': cellState.specScale }"
                                                ></div>
                                            </div>
                                            <div class="bar-number">{{cellState.specText}}</div>
                                        </div>
                                        <button
                                            type="button"
                                            class="row-filter-button"
                                            :class="{ active: linkedSelection && linkedSelection.type === 'state' && linkedSelection.key === cellState.key }"
                                            aria-label="Filter matching programs"
                                            @mouseenter="showActionTooltip($event, 'Filter matching programs')"
                                            @mousemove.stop
                                            @mouseleave="hideActionTooltip"
                                            @click.stop="toggleLinkedSelection('state', cellState.key)"
                                        >
                                            <svg viewBox="0 0 16 16" aria-hidden="true">
                                                <path d="M1.5 2.5h13l-5 6v5l-3 1.5v-6.5z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div v-else class="info f-col flex1">
                                <div class="info-grid">
                                    <div class="bold">Cell State</div>
                                    <div class="bold">Description</div>
                                    <div class="bold">Marker Genes</div>
                                </div>
                                <div class="scroll-panel f-col">
                                    <div v-if="cellStateSectionError" class="empty-state">
                                        {{ cellStateSectionError }}
                                    </div>
                                    <div
                                        v-for="cellState in cellStateInfoList"
                                        :key="cellState.key"
                                        class="info-grid grid-item"
                                        :class="{ selected: highlightedStateKey === cellState.key }"
                                        @click="openStateDetail(cellState.key, stateMetadataById[cellState.key])"
                                    >
                                        <div>{{cellState.label}}</div>
                                        <div class="info-description">{{cellState.description}}</div>
                                        <div class="info-genes"><span class="info-gene" v-for="gene in cellState.genes.split(',')">{{gene.trim()}}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!--
                    <div class="f-col align-v-center">
                        <div style="text-align: center; font-size: 26px; line-height: 1;">↔</div>
                        <div style="text-align: center;">see<br/>relationships</div>
                    </div>
                    -->
                    <div class="f-col g-10 flex1">
                        <div class="f-col" style="padding:0 22px;">
                            <div class="f-row spread-out">
                                <div class="f-row g-5">
                                    <div class="scope-step-label">Gene Programs</div>
                                </div>
                                <!--
                                <button v-if="selectedCellType"
                                    @click="viewProgramInfo=!viewProgramInfo"
                                >
                                    Show {{ viewProgramInfo ? 'Expression': 'Info'}}
                                </button>
                                -->
                            </div>
                            <div class="f-row spread-out g-10 align-v-bottom">
                                <div class="subtitle-2">Gene programs are data-driven, computationally inferred latent factors.</div>
                            </div>
                            <div v-if="geneProgramFilterNote" class="filter-note f-row g-10 align-v-center spread-out">
                                <span>Showing gene programs {{ geneProgramFilterNote }}</span>
                                <button type="button" class="context-change" @click="clearLinkedSelection">Clear</button>
                            </div>
                        </div>
                        <div class="section-card  flex1 relative">
                            <div v-if="isLoadingGeneProgramSection" class="card-overlay">
                                <div>Loading gene programs...</div>
                            </div>
                            <div v-if="!viewProgramInfo" class="expression f-col flex1">
                                <div class="bar-grid-header with-row-action">
                                    <div class="bold">Gene Program</div>
                                    <div class="bold">
                                        <span class="metric-tooltip">
                                            <span class="metric-tooltip-label">Expression</span>
                                            <span class="metric-tooltip-bubble">{{ absoluteExpressionTooltipByKind.program }}</span>
                                        </span>
                                    </div>
                                    <div class="bold">
                                        <span class="metric-tooltip">
                                            <span class="metric-tooltip-label">Specificity</span>
                                            <span class="metric-tooltip-bubble">{{ specificityTooltipByKind.program }}</span>
                                        </span>
                                    </div>
                                </div>
                                <div class="axis-row unit-row with-row-action">
                                    <div class="axis-unit">
                                        <span class="count" v-if="geneProgramFilterNote">n={{ geneProgramExpressionList.length }} of {{ geneProgramCount }}</span>
                                        <span class="count" v-else-if="geneProgramCount>0">n={{ geneProgramCount }}</span>
                                    </div>
                                    <div class="axis-unit">{{ expressionUnitLabel }}</div>
                                    <div class="axis-unit">{{ specificityUnitLabel }}</div>
                                    <div></div>
                                </div>
                                <div class="axis-row with-row-action">
                                    <div></div>
                                    <div class="axis-scale">
                                        <span
                                            v-for="tick in expressionAxisTicks"
                                            :key="`pr-x-${tick.value}`"
                                            class="axis-tick"
                                            :style="{ left: tick.offset }"
                                        >{{ tick.label }}</span>
                                    </div>
                                    <div class="axis-scale">
                                        <span
                                            v-for="tick in programSpecificityTicks"
                                            :key="`pr-s-${tick.value}`"
                                            class="axis-tick"
                                            :style="{ left: tick.offset }"
                                        >{{ tick.label }}</span>
                                    </div>
                                    <div></div>
                                </div>
                                <div class="scroll-panel f-col" @scroll="hideExpressionRowTooltip(); hideActionTooltip()">
                                    <div v-if="geneProgramSectionError" class="empty-state">
                                        {{ geneProgramSectionError }}
                                    </div>
                                    <div v-else-if="geneProgramFilterNote && !geneProgramExpressionList.length" class="empty-state">
                                        No gene programs significantly match {{ linkedSelectionLabel }}.
                                    </div>
                                    <div
                                        v-for="program in geneProgramExpressionList"
                                        :key="program.key"
                                        class="bar-grid-item grid-item with-row-action"
                                        :class="{
                                            selected: highlightedProgramKey === program.key,
                                            'no-data': !program.hasExpression
                                        }"
                                        @mouseenter="showExpressionRowTooltip($event, 'program', program)"
                                        @mousemove="showExpressionRowTooltip($event, 'program', program)"
                                        @mouseleave="hideExpressionRowTooltip"
                                        @click="openProgramDetail(program.key, program.row)"
                                    >
                                        <div class="bar-label">{{program.label}}</div>
                                        <div class="bar-cell">
                                            <div class="bar-track">
                                                <div
                                                    v-if="program.hasExpression"
                                                    class="bar-fill"
                                                    :class="{ 'overflow-high': program.expressionOverflow === 'high' }"
                                                    :style="{ width: program.expressionWidth }"
                                                ></div>
                                            </div>
                                            <div class="bar-number">{{program.absText}}</div>
                                        </div>
                                        <div class="bar-cell">
                                            <div class="bar-track diverging">
                                                <div
                                                    v-if="program.hasSpec"
                                                    class="bar-fill-diverging"
                                                    :class="{ negative: program.spec < 0, muted: program.muted, clamped: !!program.specOverflow }"
                                                    :style="{ '--k': program.specScale }"
                                                ></div>
                                            </div>
                                            <div class="bar-number">{{program.specText}}</div>
                                        </div>
                                        <button
                                            type="button"
                                            class="row-filter-button"
                                            :class="{ active: linkedSelection && linkedSelection.type === 'program' && linkedSelection.key === program.key }"
                                            aria-label="Filter matching states"
                                            @mouseenter="showActionTooltip($event, 'Filter matching states')"
                                            @mousemove.stop
                                            @mouseleave="hideActionTooltip"
                                            @click.stop="toggleLinkedSelection('program', program.key)"
                                        >
                                            <svg viewBox="0 0 16 16" aria-hidden="true">
                                                <path d="M1.5 2.5h13l-5 6v5l-3 1.5v-6.5z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="info f-col flex1">
                                <div class="info-grid">
                                    <div class="bold">Gene Program</div>
                                    <div class="bold">Description</div>
                                    <div class="bold">Top Genes</div>
                                </div>
                                <div class="scroll-panel f-col" @scroll="hideExpressionRowTooltip(); hideActionTooltip()">
                                    <div v-if="geneProgramSectionError" class="empty-state">
                                        {{ geneProgramSectionError }}
                                    </div>
                                    <div
                                        v-for="program in geneProgramInfoList"
                                        :key="program.key"
                                        class="info-grid grid-item"
                                        :class="{ selected: highlightedProgramKey === program.key }"
                                        @click="openProgramDetail(program.key, geneProgramInfoById[program.key])"
                                    >
                                        <div>{{program.label}}</div>
                                        <div class="info-description">{{program.description}}</div>
                                        <div class="info-genes"><span class="info-gene" v-for="gene in program.genes.split(',')">{{gene.trim()}}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- Layer 4 - Explore. Details are a layer of the page rather than a
             modal over it: the panel answers a question about the row above it,
             and a dialog that has to be dismissed before you can look at the row
             again breaks that reading. The section is always present once a cell
             type is scoped, so the step is visible as part of the workflow
             before anything is selected. -->
        <div v-if="showAnalysisState" ref="exploreLayer" class="liger-layer" :class="{ current: detailOpen }">
            <div class="layer-head">
                <span class="layer-number">4</span>
                <div class="f-col">
                    <div class="layer-title">Explore</div>
                    <div class="layer-question">Cell state and program details, their relationships, and trait associations</div>
                </div>
                <button
                    v-if="detailOpen"
                    type="button"
                    class="context-change"
                    @click="closeDetail"
                >
                    Clear selection
                </button>
            </div>
            <div class="layer-body">
                <template v-if="detailOpen">
                    <state-details
                        v-if="detailContent && detailContent.type === 'state'"
                        :content="detailContent"
                        :title="detailTitle"
                        :gene="selectedGene"
                        :loading="detailLoading"
                        @open-program="openProgramDetail($event.programId, $event.row)"
                    />
                    <program-details
                        v-else-if="detailContent && detailContent.type === 'program'"
                        :content="detailContent"
                        :title="detailTitle"
                        :loading="detailLoading"
                        @open-state="openStateDetail($event.stateId, $event.row)"
                    />
                    <div v-else class="detail-panel-wrap detail-body empty-state">Loading details...</div>
                </template>
                <div v-else class="explore-placeholder">
                    Select a cell state or gene program above to see its markers, related
                    programs, trait associations and curation notes here.
                </div>
            </div>
        </div>

        <div
            v-if="floatingActionTooltip.visible"
            class="floating-action-tooltip"
            :style="{ left: `${floatingActionTooltip.x}px`, top: `${floatingActionTooltip.y}px` }"
        >
            {{ floatingActionTooltip.text }}
        </div>

        <div
            v-if="floatingPreviewTooltip.visible"
            class="floating-preview-tooltip"
            :style="{ left: `${floatingPreviewTooltip.x}px`, top: `${floatingPreviewTooltip.y}px` }"
        >
            <div class="preview-tooltip-title">{{ floatingPreviewTooltip.title }}</div>
            <div
                v-for="previewRow in floatingPreviewTooltip.rows"
                :key="`preview-${previewRow.label}`"
                class="preview-tooltip-row"
            >
                <span>{{ previewRow.label }}</span>
                <span class="preview-tooltip-value">{{ previewRow.value }}</span>
            </div>
            <div class="preview-tooltip-note">{{ floatingPreviewTooltip.note }}</div>
        </div>

        <div
            v-if="floatingExpressionTooltip.visible && floatingExpressionTooltip.columns.length"
            ref="expressionTooltip"
            class="floating-expression-tooltip"
            :class="`side-${floatingExpressionTooltip.side}`"
            :style="{
                left: `${floatingExpressionTooltip.x}px`,
                top: `${floatingExpressionTooltip.y}px`,
                '--arrow-y': `${floatingExpressionTooltip.arrowY}px`
            }"
        >
            <div class="expression-tooltip-grid">
                <div
                    v-for="column in floatingExpressionTooltip.columns"
                    :key="`expression-tooltip-${column.label}`"
                    class="expression-tooltip-column"
                >
                    <div class="expression-tooltip-heading">{{ column.label }}</div>
                    <div v-if="column.items && column.items.length" class="expression-tooltip-chip-list">
                        <span
                            v-for="item in column.items"
                            :key="`${column.label}-${item}`"
                            class="expression-tooltip-chip"
                        >
                            {{ item }}
                        </span>
                    </div>
                    <div v-else class="expression-tooltip-value">{{ column.value }}</div>
                </div>
            </div>
            <div class="expression-tooltip-note">Click row for full metadata · Filter icon to match the other card</div>
        </div>

    </div>
</template>

<style>
:root{
    --blue: #0277b6;
    --lite-green: #c7dd04;
    --lite-blue: #afe6fd;
}
</style>

<style scoped>
@import url("./layout.css");

.bold{font-weight: bold;}
h1, h2, h3, h4, h5, h6, .h1, .h2, .h3, .h4, .h5, .h6 {
    margin-bottom: 0px !important;
}
#liger{
    font-family: Open Sans, sans-serif;
    font-size: 12px;
}
/* The Discover layer holds the two side-by-side bar cards, which do not survive
   being squeezed; the layer chrome itself comes from .liger-layer. */
#liger-body{
    min-width: 1230px;
}
.headline{
    line-height: 1.6rem;
}
#liger .search{
    font-size: 1.5em;
}
#liger .search input{
    text-transform: uppercase;
    width: 100%;
}
#liger button {
    border: 1px solid rgba(0, 0, 0, .25);
    background: white;
    color: #4e4e4e;
    padding: 1px 10px;
    font-size: 14px;
}
#liger button.primary{
    background: var(--blue);
    color: white;
}
.search-input-wrap{
    min-width: 0;
}
.suggestions-panel{
    position: absolute;
    top: calc(100% + 3px);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid rgba(0, 0, 0, .25);
    z-index: 20;
    max-height: 240px;
    overflow-y: auto;
}
.suggestion-item{
    display: block;
    width: 100%;
    text-align: left;
    border: none !important;
    border-bottom: 1px solid rgba(0, 0, 0, .1) !important;
    padding: 8px 10px !important;
    background: white !important;
    color: #4e4e4e !important;
}
.suggestion-item:last-child{
    border-bottom: none !important;
}
.suggestion-item:hover{
    background: #94c95e !important;
    color: white !important;
}
.suggestion-message,
.search-feedback,
.empty-state{
    font-size: 13px;
    color: #4e4e4e;
}
.suggestion-message{
    padding: 8px 10px;
}
.search-feedback{
    margin-top: 6px;
}
.search-feedback.error{
    color: #b54708;
}
.empty-state{
    padding: 5px 10px;
}

.shout {
    font-weight: bold;
    color: var(--blue);
    font-size: 1.2em;
}
.ai-disclosure {
    background: #e8f1fb;
    padding: 5px 10px;
    border-radius: 10px;
    font-style: italic;
    margin: 0 -10px auto -10px;
}

/* The four layers -- Search, Scope, Discover, Understand -- are one repeated
   shape, so the page reads as a numbered path rather than four unrelated cards. */
.liger-layer{
    border: 1px solid #edf0f7;
    border-radius: 10px;
    background: white;
    overflow: visible;
}
/* the layer the user is meant to act on next */
.liger-layer.current{
    border-color: #c6ddf7;
    box-shadow: 0 0 0 3px rgba(2, 119, 182, .07);
}
.layer-head{
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 18px;
    border-radius: 10px 10px 0 0;
    background: #f0f0f0;
}
.layer-number{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #c3cad8;
    color: white;
    font-size: 13px;
    font-weight: bold;
}
.liger-layer.current .layer-number{
    background: var(--blue);
}
.layer-title{
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #6b7280;
}
.layer-question{
    font-size: 15px;
    font-weight: bold;
    color: #1f2937;
}
.layer-head .context-change{
    margin-left: auto;
}
.layer-body{
    padding: 16px 18px;
}
.selected-gene{
    font-weight: bold;
    font-size: 18px;
    color: #1f2937;
}
.scope-bar{
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
    gap: 20px;
    padding: 14px 18px;
}
.scope-selectors{
    padding: 16px 18px;
}
.explore-placeholder{
    padding: 24px;
    border: 1px dashed #dfe4ee;
    border-radius: 10px;
    background: #fafbfd;
    color: #6b7280;
    font-size: 13px;
    text-align: center;
}
.scope-step{
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 0px 20px;
}
.scope-step-label{
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: #6b7280;
}
.scope-step-value{
    font-weight: bold;
    font-size: 15px;
    color: #1f2937;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.scope-step-pending{
    font-size: 15px;
    color: #9aa4b5;
}
/* the step waiting on the user; the dot carries the emphasis */
.scope-dot{
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #c3cad8;
}
.scope-step.active .scope-dot,
.scope-step.filled .scope-dot{
    background: var(--blue);
}
.scope-arrow{
    align-self: center;
    color: #9aa4b5;
}
.scope-bar .context-change{
    align-self: center;
}

.example-genes{
    font-size: 13px;
}
.example-genes-label{
    color: #6b7280;
}
.example-gene{
    padding: 2px 10px !important;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, .15);
    background: white;
    color: var(--blue);
    font-size: 13px;
    cursor: pointer;
}
.example-gene:hover{
    background: #e8f1fb;
}

.context-change{
    padding: 1px 8px !important;
    border: 1px solid rgba(0, 0, 0, .15);
    border-radius: 10px;
    background: white;
    color: var(--blue);
    font-size: 12px;
    cursor: pointer;
}
.context-change:hover{
    background: #e8f1fb;
}


.expression-grid{
    display:grid;
    grid-template-columns: 200px auto 50px 50px;
    padding: 5px 10px;
}
.bar-grid-header{
    font-size: 1.1em;
}
.bar-grid-header,
.bar-grid-item,
.axis-row{
    display:grid;
    grid-template-columns: 1.5fr 1fr 1fr;
    gap: 40px;
    align-items: center;
    padding: 5px 10px;
}
/* Cell types have no specificity data, so that card runs a two-column grid.
   The bar column is capped rather than left to fill the freed space, so bars
   stay the same physical length as the other two cards - a fixed axis is only
   readable as "comparable" if the tracks are the same size. */
.bar-grid-header.no-spec,
.bar-grid-item.no-spec,
.axis-row.no-spec{
    grid-template-columns: 200px minmax(160px, 100%);
}
/* State and program rows end in a filter button; the header and axis rows carry
   an empty trailing cell so the ticks stay under their bars.
   The trailing track is a fixed width, not `auto`: `auto` sizes to its content, so
   the button row and the empty header/axis rows would reserve different amounts and
   the three `fr` columns would land in different places on each row. */
.bar-grid-header.with-row-action,
.bar-grid-item.with-row-action,
.axis-row.with-row-action{
    grid-template-columns: 1.5fr 1fr 1fr 20px;
    gap: 24px;
}
.bar-cell{
    display: flex;
    align-items: center;
    gap: 8px;
}
.bar-track{
    flex: 1;
    height: 12px;
    background: #edf0f7;
    border-radius: 999px;
    overflow: hidden;
    position: relative;
}
.bar-fill{
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--lite-blue), var(--lite-green));
}
/* A row past the top of the fixed axis gets a hard edge and a marker, so
   clamping is visible rather than silently reading as "exactly the maximum". */
.bar-fill.overflow-high{
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    background: linear-gradient(90deg, var(--lite-blue), var(--lite-green) 88%, #16324f 88%);
}
/* Diverging track for signed log2FC: center line is the zero point. */
.bar-track.diverging::before{
    content: "";
    position: absolute;
    left: 50%;
    top: -1px;
    bottom: -1px;
    width: 1px;
    background: #c3cad8;
}
/* -1..1 of a half-track; scaling through 0 crosses the axis cleanly.
   Same mechanism as CellStateInfographic's delta bars. */
.bar-fill-diverging{
    --k: 0;
    position: absolute;
    left: 50%;
    width: 50%;
    top: 0;
    bottom: 0;
    border-radius: 3px;
    background: #1d4ed8;
    transform: scaleX(var(--k));
    transform-origin: left center;
}
.bar-fill-diverging.negative{
    background: #c2410c;
}
.bar-fill-diverging.muted{
    opacity: .35;
}
/* Rows past the end of the symmetric axis get a squared-off edge so a clamped
   bar is not mistaken for one that happens to reach the axis limit. */
.bar-fill-diverging.clamped{
    border-radius: 0;
}
.bar-fill-diverging.clamped::after{
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 2px;
    background: #16324f;
}
.bar-number{
    min-width: 30px;
    font-size:12px;
    text-align: right;
    font-variant-numeric: tabular-nums;
}
.bar-grid-item.no-data .bar-label,
.bar-grid-item.no-data .bar-number{
    color: #9aa4b5;
}
/* Tick labels sit under the bar columns so the scale never needs a hover. */
.axis-row{
    padding-top: 0;
    padding-bottom: 2px;
}
.axis-scale{
    position: relative;
    height: 14px;
    /* leave room for the numeric column the bars sit beside */
    margin-right: 50px;
    border-top: 1px solid #dfe4ee;
}
.axis-tick{
    position: absolute;
    top: 1px;
    transform: translateX(-50%);
    font-size: 10px;
    color: #6b7688;
    white-space: nowrap;
}
.axis-tick::before{
    content: "";
    position: absolute;
    left: 50%;
    top: -3px;
    height: 3px;
    width: 1px;
    background: #dfe4ee;
}
/* Units live here rather than inside the column header, so they read as a
   caption on the scale instead of competing with the column name. */
.axis-row.unit-row{
    padding-bottom: 0;
}
.axis-unit{
    font-size: 10px;
    color: #8a93a5;
    margin-right: 50px;
    line-height: 1.3;
}
.bar-label{
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.info-grid{
    display:grid;
    grid-template-columns: 200px auto 200px;
    padding: 5px 10px;
    font-size: 1em;
    gap: 10px;
}
.info-description {
    font-size: .9em;
}
.info-genes {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    font-size: .9em;
    height: fit-content;
}
.info-gene {
    padding: 0 5px;
    background: #eee;
    height: fit-content;
}
.grid-item{
    text-align: left;
    cursor: pointer;
    background: #fafafa;
}
.grid-item:hover{
    background: #ddd;
}
.grid-item.selected {
    background: var(--blue);
    color: white;
}

.metric-tooltip{
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    cursor: help;
}
.metric-tooltip-label{
    text-decoration: underline dotted;
    text-underline-offset: 2px;
}
.metric-tooltip-bubble{
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    width: 260px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #16324f;
    color: white;
    text-align: left;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.45;
    box-shadow: 0 10px 24px rgba(0, 0, 0, .18);
    opacity: 0;
    visibility: hidden;
    transform: translateY(4px);
    transition: opacity .14s ease, transform .14s ease, visibility .14s ease;
    pointer-events: none;
    z-index: 20;
}
.metric-tooltip-bubble::after{
    content: "";
    position: absolute;
    right: 12px;
    top: 100%;
    border-width: 6px;
    border-style: solid;
    border-color: #16324f transparent transparent transparent;
}
.metric-tooltip:hover .metric-tooltip-bubble,
.metric-tooltip:focus-within .metric-tooltip-bubble{
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

/* The tissue / cell-type preview. Deliberately narrower and plainer than the
   state/program tooltip below: it answers "is this worth clicking", not "what
   does this mean". Anchored to the top of the row it describes. */
.floating-preview-tooltip{
    position: fixed;
    width: 260px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #16324f;
    color: white;
    box-shadow: 0 10px 24px rgba(0, 0, 0, .18);
    z-index: 35;
    pointer-events: none;
}
.preview-tooltip-title{
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 700;
}
.preview-tooltip-row{
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 12px;
    line-height: 1.6;
    color: #c6ddf7;
}
.preview-tooltip-value{
    font-weight: 700;
    color: white;
    font-variant-numeric: tabular-nums;
}
.preview-tooltip-note{
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, .16);
    font-size: 11px;
    line-height: 1.4;
    color: #c6ddf7;
}

.floating-expression-tooltip{
    position: fixed;
    width: 430px;
    max-width: min(430px, calc(100vw - 24px));
    padding: 14px;
    border-radius: 12px;
    background: #16324f;
    color: white;
    box-shadow: 0 18px 34px rgba(0, 0, 0, .22);
    z-index: 35;
    pointer-events: none;
}
/* Driven by --arrow-y rather than the card's own 50%, so the arrow points at the
   hovered row even when the card had to be shifted to stay on screen. */
.floating-expression-tooltip::after{
    content: "";
    position: absolute;
    top: calc(var(--arrow-y, 50%) - 7px);
    border-width: 7px;
    border-style: solid;
}
.floating-expression-tooltip.side-right::after{
    left: -14px;
    border-color: transparent #16324f transparent transparent;
}
.floating-expression-tooltip.side-left::after{
    right: -14px;
    border-color: transparent transparent transparent #16324f;
}
.expression-tooltip-grid{
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
}
.expression-tooltip-column{
    min-width: 0;
}
.expression-tooltip-heading{
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .03em;
    text-transform: uppercase;
    color: #c6ddf7;
}
.expression-tooltip-value{
    font-size: 13px;
    line-height: 1.45;
    word-break: break-word;
}
.expression-tooltip-chip-list{
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
.expression-tooltip-chip{
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, .14);
    font-size: 12px;
    line-height: 1.3;
}
.expression-tooltip-note{
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, .16);
    font-size: 12px;
    color: #c6ddf7;
}


.options > div {
    padding: 5px 10px;
}
.options .selected {
    background: var(--blue);
    color: white;
}

.title{
    margin-bottom: 20px;
}
.subtitle{
    font-size: 1.2em;
}
.subtitle-2{
    font-size: 1.1em;
}
.also{
    font-weight: bold;
    font-size: .9em;
}

.spaceholder {
    display: flex;
    width: 100%;
    height: 300px;
    align-items: center;
    justify-content: center;
    border: 1px dashed #bbb;
}
.card-overlay {
    position: absolute;
    top:0;
    left:0;
    background: rgb(236 236 236);
    width: 100%;
    height: 100%;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
}
.row-filter-button{
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0 !important;
    border: none;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
}
.row-filter-button svg{
    width: 11px;
    height: 11px;
    fill: #b0b7c3;
}
.row-filter-button:hover{
    background: #e8f1fb;
}
.row-filter-button:hover svg{
    fill: var(--blue);
}
/* The row whose filter is currently applied: the inverse of the resting state --
   solid blue plate, white glyph, where resting is a transparent plate and a grey
   glyph.
   `:hover` is repeated on both selectors rather than left to source order. The
   hover and active rules have identical specificity, so active only won because
   it is written second, and the active button is exactly the one under the
   cursor immediately after a click -- the state that has to be unambiguous is the
   one most likely to be hovered. */
.row-filter-button.active,
.row-filter-button.active:hover{
    background: var(--blue) !important;
}
.row-filter-button.active svg{
    fill: white;
}
.row-filter-button.active:hover svg{
    fill: #b0b7c3;
}
.floating-action-tooltip{
    position: fixed;
    transform: translate(-50%, -100%);
    padding: 5px 9px;
    border-radius: 6px;
    background: #16324f;
    color: white;
    font-size: 11px;
    white-space: nowrap;
    box-shadow: 0 8px 18px rgba(0, 0, 0, .18);
    pointer-events: none;
    z-index: 2200;
}
.filter-note{
    padding: 4px 10px;
    border-radius: 8px;
    background: #e8f1fb;
    color: var(--liger-secondary, #175cd3);
    font-size: 13px;
}

.clickable-cell{
    cursor: pointer;
}
.clickable-cell:hover {
    background: #ddd;
}
@media (max-width: 900px) {
    .floating-expression-tooltip{
        width: min(430px, calc(100vw - 24px));
    }
    .expression-tooltip-grid{
        grid-template-columns: 1fr;
    }
}

/* The layer bodies are white, so the cards need an outline of their own to stay
   legible as cards -- they used to sit on a tinted #liger-body panel. */
.section-card {
    display: flex;
    flex-direction: column;
    padding: 15px;
    background: white;
    border: 1px solid #edf0f7;
    border-radius: 8px;
    min-height: 200px;
    flex: 1;
}
.scroll-panel{
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    max-height: 300px;
}
.count{
    font-weight: normal;
}

.pill {
    display: inline-flex;
    position: relative;
    margin: 0 3px;
    z-index: 1;
}
.pill:before {
    content: '';
    background: gold;
    width: 110%;
    height: 100%;
    position: absolute;
    transform: translate(-5%, 0);
    z-index: -1;
    border-radius: .5rem;
}
</style>
