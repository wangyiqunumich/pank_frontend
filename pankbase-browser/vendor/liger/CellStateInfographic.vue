<script>
import Vue from "vue";

// each gene belongs to one program and tracks it with its own emphasis, so gene direction
// is derived from the program delta rather than authored separately -- they cannot disagree
const GENES = {
    INS: [0, 1.15], IAPP: [0, 1], PDX1: [0, 1.05], MAFA: [0, 1.1], "NKX6-1": [0, 1.05], SLC30A8: [0, .85], PCSK1: [0, .9],
    HSPA5: [1, 1.1], XBP1: [1, 1], ATF4: [1, 1.05], DDIT3: [1, .95],
    CDKN1A: [2, 1.1], CDKN2A: [2, 1.05], GDF15: [2, .95], SERPINE1: [2, .95], IL1B: [2, .9],
    ALDH1A3: [3, 1.1], SOX9: [3, .95]
};

// laid out in the order they appear in the cloud; the color is the color of the
// program the gene belongs to, so the cloud and the program list read as one thing
const GENE_ORDER = [
    "PDX1", "XBP1", "CDKN1A",
    "MAFA", "ALDH1A3", "PCSK1",
    "IL1B", "DDIT3", "INS",
    "CDKN2A", "SOX9", "HSPA5",
    "IAPP", "SERPINE1", "ATF4",
    "SLC30A8", "GDF15", "NKX6-1"
];

const PROGRAMS = [
    { label: "β-cell identity / function", color: "var(--green)" },
    { label: "ER / cellular stress", color: "var(--orange)" },
    { label: "Senescence / SASP-like", color: "var(--purple)" },
    { label: "Dedifferentiation", color: "var(--blue)" }
];

const MODES = [
    { key: "healthy", label: "Healthy" },
    { key: "disease-state", label: "Disease" },
    { key: "state-disease", label: "Perturbed" }
];

const SCENARIOS = {
    healthy: {
        color: "var(--green)",
        ctxTitle: "Healthy physiology",
        ctxText: "Normal nutrient availability and tissue signals support β-cell homeostasis.",
        ctxChips: [["Normal glucose", ""], ["Homeostatic signals", ""]],
        title: "Mature functional β cell",
        summary: "High β-cell identity and insulin-secretory function with low stress and dedifferentiation.",
        values: [92, 18, 10, 10],
        delta: [45, -25, -35, -35],
        outTitle: "Normal function",
        outText: "Effective insulin secretion supports glucose homeostasis.",
        outChips: [["Insulin secretion", "↑"], ["Glucose homeostasis", "✓"]],
        inLink: false,
        outLink: false,
    },
    "disease-state": {
        color: "var(--orange)",
        ctxTitle: "Disease-associated stress",
        ctxText: "Disease-associated conditions expose β cells to persistent metabolic and inflammatory stress.",
        ctxChips: [["Hyperglycemia", ""], ["Inflammation", ""], ["High metabolic demand", ""]],
        title: "Stressed / dedifferentiating β cell",
        summary: "Elevated stress programs accompany loss of mature β-cell identity and acquisition of dedifferentiation-associated features.",
        values: [42, 92, 34, 78],
        delta: [-35, 48, 15, 42],
        outTitle: "Reduced β-cell function",
        outText: "Reduced mature identity and cellular stress can impair insulin production and β-cell resilience.",
        outChips: [["Insulin secretion", "↓"], ["β-cell function", "↓"]],
        inLink: true,
        outLink: false,
    },
    "state-disease": {
        color: "var(--purple)",
        ctxTitle: "State-altering factors",
        ctxText: "Cell states can shift in response to physiological, environmental, or intrinsic factors.",
        ctxChips: [["Aging", ""], ["Cellular damage", ""], ["Chronic stress", ""]],
        title: "Senescent / SASP-like β cell",
        summary: "Persistent cell-cycle arrest accompanied by altered secretory and inflammatory signaling.",
        values: [50, 40, 96, 20],
        delta: [-12, 18, 50, -8],
        outTitle: "Potential disease effects",
        outText: "Altered secretory and inflammatory signaling can disrupt neighboring cells and tissue function.",
        outChips: [["Inflammatory signaling", "↑"], ["Tissue function", "↓"]],
        inLink: false,
        outLink: true,
    }
};

// the layout is authored at this width and scaled down to whatever space it gets
const PAGE_WIDTH = 1380;
// The preview is a fixed scale rather than "whatever the container allows": it
// sits beside the page headline, where the figure should be a stable, recognisable
// glyph rather than something that grows and shrinks with the column.
const PREVIEW_SCALE = .25;

export default Vue.component("CellStateInfographic", {
    props: {
        // Render as a small preview that sits beside the page headline. The figure
        // itself is unchanged -- it is authored at PAGE_WIDTH and scaled to
        // whatever width it is given, so a narrow container is all "smaller"
        // takes. Clicking the preview opens the same figure as an overlay, at
        // which point it is interactive again.
        thumbnail: {
            type: Boolean,
            default: false
        }
    },

    data() {
        return {
            modes: MODES,
            programs: PROGRAMS,
            geneOrder: GENE_ORDER,
            scenarios: SCENARIOS,
            locked: "healthy",
            // hover and focus preview a scenario without committing to it
            hovered: null,
            overlayOpen: false,
            // The shell goes `position: fixed` while the overlay is open, which
            // takes it out of flow -- without holding its height the page headline
            // it sits beside would reflow the moment the figure is opened.
            reservedHeight: null,
            scale: 1,
            stageHeight: null,
            // pinned once, to the tallest rendering across scenarios, so switching
            // scenarios never resizes the cards
            titleMinHeight: null,
            summaryMinHeight: null,
        };
    },

    computed: {
        // Preview is the shrunk, non-interactive state: a click anywhere on it
        // opens the overlay. Once the overlay is open the same figure is live
        // again, so the preview affordances have to come off.
        isPreview() {
            return this.thumbnail && !this.overlayOpen;
        },
        activeMode() {
            return this.hovered || this.locked;
        },
        scenario() {
            return this.scenarios[this.activeMode];
        },
        pageStyle() {
            return { transform: `scale(${this.scale})` };
        },
        stageStyle() {
            let style = this.stageHeight ? { height: this.stageHeight } : {};

            // At a fixed scale the stage has to be told its width too -- otherwise
            // it takes the full column and the box is mostly empty space to the
            // right of the figure.
            if (this.isPreview) {
                style.width = Math.round(PAGE_WIDTH * PREVIEW_SCALE) + "px";
            }

            return style;
        },
        rootStyle() {
            return this.overlayOpen && this.reservedHeight
                ? { minHeight: this.reservedHeight }
                : {};
        },
        // one rule for both encodings, so the arrow always agrees with the bar it labels
        arrows() {
            return this.scenario.delta.map((d) =>
                Math.abs(d) < 10 ? "↔" : (d > 0 ? "↑" : "↓").repeat(Math.abs(d) >= 40 ? 2 : 1)
            );
        },
        barStyles() {
            // -1..1 of a half-track; passing through 0 is what makes the bar cross the axis cleanly
            return this.scenario.delta.map((d) => ({ "--k": (d / 50).toFixed(3) }));
        },
        dotStyles() {
            // the cell glyph is the state: each granule tracks its program's activity
            return this.scenario.values.map((v) => {
                const f = v / 100;
                return {
                    "--scale": (0.3 + f * 0.7).toFixed(2),
                    "--opacity": (0.35 + f * 0.65).toFixed(2),
                };
            });
        },
        geneStyles() {
            const delta = this.scenario.delta;
            return this.geneOrder.map((gene) => {
                const [pi, emph] = GENES[gene];
                // one signed continuum: down-regulated reads small and pale, up-regulated large and saturated
                const t = (Math.max(-1, Math.min(1, delta[pi] * emph / 50)) + 1) / 2;
                return {
                    "--c": this.programs[pi].color,
                    "--scale": (0.84 + t * 0.26).toFixed(3),
                    "--opacity": (0.42 + t * 0.58).toFixed(2),
                    "--fill": (2 + t * 32).toFixed(0) + "%",
                };
            });
        },
    },

    watch: {
        // Opening or closing the overlay changes how much width the stage has, and
        // the scale is derived from that width, so it has to be remeasured.
        overlayOpen() {
            this.$nextTick(this.fit);
        },
    },

    mounted() {
        window.addEventListener("resize", this.fit);
        window.addEventListener("keydown", this.onWindowKeydown);
        this.fit();
        this.lockHeights();
    },

    beforeDestroy() {
        window.removeEventListener("resize", this.fit);
        window.removeEventListener("keydown", this.onWindowKeydown);
    },

    methods: {
        onModeClick(mode) {
            this.locked = mode;
        },
        openOverlay() {
            if (this.$el) {
                this.reservedHeight = this.$el.offsetHeight + "px";
            }

            this.overlayOpen = true;
        },
        closeOverlay() {
            this.overlayOpen = false;
            this.reservedHeight = null;
        },
        onWindowKeydown(event) {
            if (event && event.key === "Escape" && this.overlayOpen) {
                this.closeOverlay();
            }
        },
        fit() {
            const stage = this.$refs.stage;
            const page = this.$refs.page;
            if (!stage || !page) return;
            // the stage's own width, not the window's: the figure lives inside a portal
            // page whose content column is narrower than the viewport
            const avail = stage.clientWidth;
            this.scale = this.isPreview ? PREVIEW_SCALE : Math.min(1, avail / PAGE_WIDTH);
            this.$nextTick(() => {
                if (!this.$refs.page) return;
                // offsetHeight is the unscaled height, so the stage has to be told
                // how much room the scaled figure actually takes
                this.stageHeight = this.$refs.page.offsetHeight * this.scale + "px";
            });
        },
        // Paint every scenario once and pin each variable block to its tallest rendering,
        // so switching scenarios never resizes the cards.
        async lockHeights() {
            const previewed = this.hovered;
            const max = [0, 0];
            for (const key of Object.keys(this.scenarios)) {
                this.hovered = key;
                await this.$nextTick();
                const els = [this.$refs.stateTitle, this.$refs.stateSummary];
                if (!els[0] || !els[1]) return;
                els.forEach((el, i) => { max[i] = Math.max(max[i], el.offsetHeight); });
            }
            this.hovered = previewed;
            this.titleMinHeight = max[0] + "px";
            this.summaryMinHeight = max[1] + "px";
            await this.$nextTick();
            this.fit();
        },
    },
});
</script>

<template>
    <div
        id="cell-state-infographic"
        :class="{ 'is-preview': isPreview, 'is-overlay': overlayOpen }"
        :style="rootStyle"
    >
        <div v-if="overlayOpen" class="figure-backdrop" @click="closeOverlay"></div>
        <!-- One figure, not two: the overlay re-parents nothing, it only changes
             how the shell is positioned and how wide the stage is. A second copy
             would duplicate every ref that `fit` and `lockHeights` measure. -->
        <div
            class="figure-shell"
            :role="isPreview ? 'button' : null"
            :tabindex="isPreview ? 0 : null"
            :aria-label="isPreview ? 'Expand the cell state model figure' : null"
            @click="isPreview ? openOverlay() : null"
            @keydown.enter.prevent="isPreview ? openOverlay() : null"
            @keydown.space.prevent="isPreview ? openOverlay() : null"
        >
            <button
                v-if="overlayOpen"
                type="button"
                class="figure-close"
                aria-label="Close figure"
                @click.stop="closeOverlay"
            >&times;</button>
            <div class="stage" ref="stage" :style="stageStyle">
                <div class="page" ref="page" :style="pageStyle">
                    <div class="frame" :style="{ '--state-color': scenario.color }">
                        <section class="context">
                            <h1>Cell state model</h1>
                            <div class="mode-wrap" role="group" aria-label="Ways cell state and disease relate">
                                <button
                                    v-for="mode in modes"
                                    :key="mode.key"
                                    class="mode"
                                    :class="{ active: activeMode === mode.key }"
                                    :data-mode="mode.key"
                                    :aria-pressed="String(activeMode === mode.key)"
                                    @mouseenter="hovered = mode.key"
                                    @mouseleave="hovered = null"
                                    @focus="hovered = mode.key"
                                    @blur="hovered = null"
                                    @click="onModeClick(mode.key)"
                                >{{ mode.label }}</button>
                            </div>
                        </section>

                    <div class="model-wrap" id="modelWrap">
                        <div class="model-shell">

                            <section class="panel side">
                                <h2>Context</h2>
                                <div class="side-body">
                                    <div class="side-title">{{ scenario.ctxTitle }}</div>
                                    <p class="side-text">{{ scenario.ctxText }}</p>
                                    <div class="chips">
                                        <span class="chip" v-for="chip in scenario.ctxChips" :key="chip[0]">{{ chip[0] }}<b v-if="chip[1]">{{ chip[1] }}</b></span>
                                    </div>
                                    <div class="in-link" :class="{ on: scenario.inLink }">→ Can result from diabetes</div>
                                </div>
                            </section>

                            <div class="conn" :class="{ on: activeMode === 'disease-state' }" aria-hidden="true">→</div>

                            <section class="panel">
                                <h2>Genes</h2>
                                <div class="sub">Individual genes whose activity helps characterize cellular programs.</div>
                                <div class="gene-cloud">
                                    <span
                                        class="gene"
                                        v-for="(gene, index) in geneOrder"
                                        :key="gene"
                                        :data-gene="gene"
                                        :style="geneStyles[index]"
                                    >{{ gene }}</span>
                                </div>
                            </section>

                            <div class="conn" aria-hidden="true">→</div>

                            <section class="panel">
                                <h2>Programs</h2>
                                <div class="sub">Coordinated patterns of gene activity representing biological processes.</div>
                                <div class="program-list">
                                    <div
                                        class="program"
                                        v-for="(program, index) in programs"
                                        :key="program.label"
                                        :style="{ '--c': program.color }"
                                    >
                                        <b><span class="dir">{{ arrows[index] }}</span>{{ program.label }}</b>
                                        <div class="track"><div class="fill" :style="barStyles[index]"></div></div>
                                    </div>
                                </div>
                            </section>

                            <div class="conn" aria-hidden="true">→</div>

                            <section class="panel" aria-live="polite">
                                <h2>Cell state</h2>
                                <div class="sub">The cellular phenotype defined by the combination of active programs.</div>

                                <div class="state-hero">
                                    <div class="cell">
                                        <div class="nucleus"></div>
                                        <div class="dot one" :style="dotStyles[0]"></div><div class="dot two" :style="dotStyles[1]"></div><div class="dot three" :style="dotStyles[2]"></div><div class="dot four" :style="dotStyles[3]"></div>
                                    </div>
                                    <div>
                                        <div class="state-title" ref="stateTitle" :style="{ minHeight: titleMinHeight }">{{ scenario.title }}</div>
                                        <div class="state-summary" ref="stateSummary" :style="{ minHeight: summaryMinHeight }">{{ scenario.summary }}</div>
                                    </div>
                                </div>

                            </section>

                            <div class="conn" :class="{ on: activeMode === 'state-disease' }" aria-hidden="true">→</div>

                            <section class="panel side">
                                <h2>Outcome</h2>
                                <div class="side-body">
                                    <div class="side-title">{{ scenario.outTitle }}</div>
                                    <p class="side-text">{{ scenario.outText }}</p>
                                    <div class="chips">
                                        <span class="chip" v-for="chip in scenario.outChips" :key="chip[0]">{{ chip[0] }}<b v-if="chip[1]">{{ chip[1] }}</b></span>
                                    </div>
                                    <div class="out-link" :class="{ on: scenario.outLink }">→ May contribute to diabetes</div>
                                </div>
                            </section>

                        </div>
                    </div>
                        <p class="note">This example uses a beta cell but conceptually applies to any cell type. States, genes, programs, contexts, and outcomes are simplified; not measured data.</p>
                    </div>
                </div>
            </div>
            <span v-if="isPreview" class="figure-preview-hint">Click to expand</span>
        </div>
    </div>
</template>

<style scoped>
#cell-state-infographic{
    --bg:#fff; --panel:#fff; --ink:#17262b; --muted:#687a80; --line:#d7e1e3;
    /* purple pushed toward magenta so it stays separable from blue for colorblind viewers */
    --green:#2b8c7e; --orange:#c78720; --purple:#a3389c; --blue:#5869bd;
    background:var(--bg);color:var(--ink);
    font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
#cell-state-infographic *{box-sizing:border-box}

/* whole-figure scaling: layout is fixed at 1380px and shrunk to fit */
.stage{overflow:hidden}
.page{width:1380px;margin:0 auto;transform-origin:top left}

h1{font-size:28px;margin:0;letter-spacing: -.5px;}
.note{margin:0;font-size:12px;color:var(--muted);text-align:right;padding:0 20px 20px}

/* the scenario tints one frame that holds the buttons and the whole five-card chain */
.frame{background:color-mix(in srgb,var(--state-color) 10%,white);border-radius:22px;transition:.2s ease}
.context{padding: 30px;display:flex;align-items:center;gap:24px}
.model-wrap{padding:0 30px 30px}

/* Preview: the figure at whatever scale its narrow container allows, as one hit
   target. The inner controls are switched off rather than removed -- at this size
   they are illegible, and a stray hover on a mode button would silently change
   which scenario the preview shows. */
.is-preview .figure-shell{
    position:relative;
    display:inline-block;
    border:1px solid var(--line);
    border-radius:14px;
    overflow:hidden;
    cursor:pointer;
    transition:border-color .18s ease, box-shadow .18s ease;
}
.is-preview .figure-shell:hover,
.is-preview .figure-shell:focus-visible{
    border-color:var(--green);
    box-shadow:0 6px 18px rgba(23,38,43,.12);
}
.is-preview .page{pointer-events:none}
.figure-preview-hint{
    position:absolute;
    right:8px;
    top:8px;
    padding:3px 9px;
    border-radius:999px;
    background:rgba(23,38,43,.78);
    color:#fff;
    font-size:11px;
    font-weight:700;
}

/* Overlay: same figure, given the width to render at full scale. `fit` remeasures
   on open, so the scale follows the wider stage on its own. */
.figure-backdrop{
    position:fixed;
    inset:0;
    background:rgba(15,23,42,.55);
    z-index:3000;
}
.is-overlay .figure-shell{
    position:fixed;
    top:50%;
    left:50%;
    transform:translate(-50%,-50%);
    width:min(1424px,calc(100vw - 48px));
    max-height:calc(100vh - 48px);
    padding:16px;
    border-radius:18px;
    background:#fff;
    box-shadow:0 24px 60px rgba(0,0,0,.35);
    overflow:auto;
    z-index:3001;
}
.figure-close{
    position:absolute;
    top:25px;
    right:25px;
    width:30px;
    height:30px;
    border:1px solid var(--line);
    border-radius:50%;
    background:#fff;
    color:var(--ink);
    font-size:20px;
    line-height:1;
    cursor:pointer;
    z-index:1;
    padding: 0 0 2px;
}
.figure-close:hover,.figure-close:focus-visible{
    border-color:var(--state-color);
}

.mode-wrap{display:flex;align-items:center;gap:12px}
.mode{
    border:1px solid var(--line);background:#fff;border-radius:14px;padding:9px 13px;
    font:inherit;font-weight:750;color:var(--ink);cursor:pointer;transition:.18s ease;text-align:left
}
.mode:hover,.mode:focus-visible,.mode.active{
    border-color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,white);
    box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 12%,transparent)
}
.mode[data-mode="healthy"]{--accent:var(--green)}
.mode[data-mode="disease-state"]{--accent:var(--orange)}
.mode[data-mode="state-disease"]{--accent:var(--purple)}

/* five cards: context and outcome flank the gene -> program -> state core */
.model-shell{
    display:grid;
    grid-template-columns:.75fr 30px .9fr 30px 1fr 30px 1.1fr 30px .75fr;
    gap:5px;align-items:stretch
}
.conn{display:flex;align-items:center;justify-content:center;font-size:26px;color:#b3c0c4;transition:.22s ease}
.conn.on{color:var(--state-color);transform:scale(1.4)}

.panel{background:var(--panel);border-radius:18px;padding:18px;min-width:0;display:flex;flex-direction:column}
.panel h2{font-size:17px;margin:0 0 4px}
/* min-height keeps the three core panel bodies aligned despite unequal blurbs */
.sub{font-size:12px;line-height:1.45;color:var(--muted);min-height:74px}

/* --- flanking cards -------------------------------------------------- */
.side{padding:16px 14px;background:color-mix(in srgb,var(--state-color) 4%,white);align-self:center;}
.side h2{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin:0 0 12px}
.side-body{flex:1;display:flex;flex-direction:column;gap:9px}
.side-title{font-size:14px;font-weight:800;line-height:1.25;color:var(--state-color)}
.side-text{margin:0;font-size:11.5px;line-height:1.5;color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:5px;align-content:flex-start}
.chip{
    display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 9px;
    background:color-mix(in srgb,var(--state-color) 12%,white);
    font-size:10.5px;font-weight:700;line-height:1.3
}
.chip b{font-size:12px}
/* opacity, not display: keeps the card height identical across scenarios */
.in-link,.out-link{margin-top:2px;font-size:11px;font-weight:800;color:var(--state-color);display:none;transition:opacity .22s ease}
.in-link.on,.out-link.on{display:block}

/* --- genes ------------------------------------------------------------ */
.gene-cloud{flex:1;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:5px}
.gene{
    --c:var(--green);--fill:8%;--scale:1;--opacity:1;
    display:inline-flex;align-items:center;justify-content:center;
    min-width:38px;height:25px;padding:0 8px;border-radius:999px;
    background:color-mix(in srgb,var(--c) var(--fill),white);
    color:var(--ink);font-size:10px;font-weight:750;
    transform:scale(var(--scale));opacity:var(--opacity);
    transition:transform .24s ease,opacity .24s ease,background-color .24s ease
}

/* --- programs ---------------------------------------------------------- */
.program-list{flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px}
.program{--c:var(--green);padding:8px 10px;border-radius:9px;background:color-mix(in srgb,var(--c) 6%,white)}
/* the swatch rhymes with the granules in the cell, tying the two panels together */
.program b{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--c);margin-bottom:6px}
.dir{flex:none;width:20px;text-align:center;font-size:12px;font-weight:800;letter-spacing:-.05em}
/* bars diverge from a centre line: activity relative to a typical mature beta cell */
.track{position:relative;height:8px;border-radius:999px;background:#edf1f2}
/* dashed zero line, overhanging the bar so it stays visible whichever way the fill runs */
.track::before{
    content:"";position:absolute;left:50%;top:-4px;bottom:-4px;
    border-left:1px dashed color-mix(in srgb,var(--ink) 30%,white)
}
/* one bar whose width is genuinely signed: its left edge sits on the centre line and is
   the scale origin, so scaleX(-k) flips it leftwards without the anchor ever moving.
   Interpolating the single factor through 0 is what makes the end -- not the bar -- travel. */
.fill{
    --k:0;position:absolute;left:50%;top:0;bottom:0;width:50%;
    background:var(--c);border-radius:0 3px 3px 0;
    transform:scaleX(var(--k));transform-origin:left center;transition:transform .3s ease
}
.caveat{margin-top:12px;font-size:10.5px;line-height:1.4;color:var(--muted)}

/* --- cell state -------------------------------------------------------- */
.state-hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
.cell{
    width:120px;height:120px;border-radius:50%;border:2px solid var(--state-color);position:relative;
    background:color-mix(in srgb,var(--state-color) 7%,white);transition:.24s ease;flex:none
}
.nucleus{position:absolute;width:38px;height:38px;border-radius:50%;background:color-mix(in srgb,var(--ink) 22%,white);left:41px;top:41px}
.dot{
    position:absolute;width:22px;height:22px;border-radius:50%;
    transform:scale(var(--scale,1));opacity:var(--opacity,1);
    transition:transform .3s ease,opacity .3s ease
}
.one{left:23px;top:23px;background:var(--green)}
.two{right:23px;top:23px;background:var(--orange)}
.three{left:23px;bottom:23px;background:var(--purple)}
.four{right:23px;bottom:23px;background:var(--blue)}
.state-title{font-size:18px;font-weight:800;color:var(--state-color);margin-bottom:8px}
.state-summary{font-size:13px;color:var(--muted);line-height:1.55}

@media (prefers-reduced-motion:reduce){
    #cell-state-infographic *{transition:none !important}
}
</style>
