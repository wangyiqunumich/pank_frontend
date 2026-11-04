<template><section class="module-view browser-chrome">
  <div class="browser-navigation"><nav class="browser-tabs" aria-label="Genome views"><button v-for="item in ['Genome','Tracks','Source']" :key="item" :aria-pressed="view===item" @click="view=item">{{item}}</button></nav></div>
  <form class="browser-filters" @submit.prevent="openRegion"><label class="browser-input genome-region"><span>GRCh38</span><input v-model="regionInput" placeholder="chr7:start-end" aria-label="GRCh38 region"/><button :disabled="isLoading" type="submit">View</button></label><button type="button" :aria-pressed="showTools" @click="showTools=!showTools;scheduleFit()">More tools</button></form>
  <div class="module-stage genome-content"><p v-if="loadError" role="alert">{{loadError}}</p><p v-if="isLoading" role="status">Loading ATAC tracks…</p>
    <div v-show="view==='Genome'" ref="viewport" class="genome-viewport"><div class="genome-stage" :class="{'show-tools':showTools}"><div id="browser" class="atac-seq__browser" aria-live="polite"></div></div><BrowserToolbar :fullscreen="fullscreen" :disabled="isLoading || !controlReady" @fullscreen="toggleFullscreen" @zoomIn="zoomGenome(0.5)" @zoomOut="zoomGenome(2)" @fit="resetRegion" @download="downloadPlot"/></div>
    <div v-if="view==='Tracks'" class="source-panel"><h2>Cell types</h2><label><input type="checkbox" v-model="selectAll" @change="toggleTracks"/> Select all</label><div class="track-options"><label v-for="cellType in cellTypes" :key="cellType"><input type="checkbox" v-model="selectedCellTypes" :value="cellType"/>{{cellType}}</label></div><h2>Track types</h2><div class="track-options"><label v-for="trackType in trackTypes" :key="trackType"><input type="checkbox" v-model="selectedTrackTypes" :value="trackType"/>{{trackType.includes('peaks')?'ATAC peaks':trackType}}</label></div><button class="primary" @click="view='Genome';$nextTick(updateBrowser)">Apply tracks</button></div>
    <div v-if="view==='Source'" class="source-panel"><h2>Source &amp; methods</h2><p>HPAP ATAC signal and peaks · GRCh38. All source cell types and track choices remain available under Tracks.</p><p>Coordinates are 0-based, half-open. {{manualLocus?'User-selected region; gene overlap is not assumed.':'Locus from explicit graph coordinates or a verified source lookup.'}}</p><p>Signal, peak calls and gene annotations are distinct evidence layers. Signal tracks are redrawn to fit available height; genomic coordinates and values are unchanged.</p></div>
    <BrowserToolbar v-if="view!=='Genome'" navigation-only :fullscreen="fullscreen" @fullscreen="toggleFullscreen"/>
  </div>
  <footer class="browser-footer"><span>GRCh38 · {{liveLocus || regionInput}}</span><span>{{trackCount}} tracks</span><p class="description">HPAP ATAC signal and peaks · Drag to pan · More tools for native navigation</p></footer>
</section></template>
<script>
import Vue from "vue";
import BrowserToolbar from '../../BrowserToolbar.vue';
import browserControls from '../../browserControls.mjs';
import { mountGenome, zoomGenome, fitSignalTracks } from './browserBridge.mjs';
import { exportGenome } from './exportGenome.mjs';
import { fetchTracks } from "./tracks.js";
import { loadWashUAssets } from "./washU.js";
import { TRACKS } from "./tracks.js";
import { readBioIndex } from "../../data.mjs";
import { assetUrl, dataBase } from "../../source.mjs";



const DEFAULT_GENOME = "hg38";
const DEFAULT_GENOME_BIOINDEX = "GRCh38";


export default Vue.component("AtacSeq", {
    components: { BrowserToolbar }, mixins: [browserControls],
    props: ["gene", "locus", "cellType"],
    data() {
        return {
            view: 'Genome', showTools:false, liveLocus:'', trackCount:0, controlReady:false,
            isLoading: true,
            loadError: null,
            tracksJson: TRACKS,
            allTracks: null,
            selectedCellTypes: [],
            selectAll: true,
            cellTypes: [],
            trackTypes: [],
            selectedTrackTypes: [],
            geneInfo: null,
            manualLocus: null, regionInput: "",
        };
    },
    async mounted() {
        this.initializeBrowser();
        this.layoutObserver=new ResizeObserver(()=>this.scheduleFit());
        this.layoutObserver.observe(this.$refs.viewport);
    },
    beforeDestroy() { this.unsubscribeBrowser?.(); this.layoutObserver?.disconnect(); cancelAnimationFrame(this.fitFrame); window.ReactDOM?.unmountComponentAtNode(document.getElementById('browser')); },
    computed: {
        region(){
            if (!this.geneInfo){
                return null;
            }
            return `chr${String(this.geneInfo.chromosome).replace(/^chr/, "")}:${this.geneInfo.start}-${this.geneInfo.end}`;
        }
    },
    methods: {
        zoomGenome(factor) { if(this.browserStore)zoomGenome(this.browserStore,factor); },
        resetRegion() { if(this.browserStore && this.initialRegion)this.browserStore.dispatch({type:'SET_VIEW_REGION',...this.initialRegion}); },
        downloadPlot() { try { exportGenome(document.getElementById('browser'),this.liveLocus); } catch(error) { this.loadError='Plot export failed. Please retry after tracks finish loading.'; } },
        scheduleFit() { cancelAnimationFrame(this.fitFrame); this.fitFrame=requestAnimationFrame(()=>this.fitTracks()); },
        fitTracks() {
            const viewport=this.$refs.viewport,root=document.getElementById('browser');
            if(!this.browserStore||!viewport?.clientWidth||!root?.clientHeight||this.view!=='Genome')return;
            const state=this.browserStore.getState().browser.present;
            const legendWidth=Math.max(85,Math.min(110,Math.round(root.clientWidth*0.24)));
            if(state.trackLegendWidth!==legendWidth)this.browserStore.dispatch({type:'SET_TRACK_LEGEND_WIDTH',width:legendWidth});
            const next=fitSignalTracks(state.tracks,viewport.clientHeight-root.getBoundingClientRect().height-4);
            if(next)this.browserStore.dispatch({type:'SET_TRACKS',tracks:next});
        },
        openRegion() {
            const match = this.regionInput.trim().match(/^chr([1-9]|1[0-9]|2[0-2]|X|Y|M):([0-9]+)-([0-9]+)$/i);
            if (!match || !Number.isSafeInteger(Number(match[3])) || Number(match[3]) <= Number(match[2])) {
                this.loadError = "Enter a valid GRCh38 region, such as chr7:117480025-117668665."; return;
            }
            this.manualLocus = {chromosome:match[1], start:Number(match[2]), end:Number(match[3]), genomeBuild:"GRCh38"};
            this.initializeBrowser();
        },
        async initializeBrowser() {

            this.isLoading = true;
            this.loadError = null;

            try {
                this.geneInfo = this.manualLocus || this.locus || await this.getGene(this.gene);
                if (!this.geneInfo) throw new Error("No verified GRCh38 locus is available.");
                this.regionInput = this.region;
                await loadWashUAssets();
                this.allTracks = await this.loadTracks();
                this.cellTypes = Array.from(new Set(this.allTracks.map(t => t.cellType)));
                this.selectedCellTypes = this.cellTypes.filter(cell => cell.toLowerCase() === (this.cellType || "").toLowerCase());
                if (!this.selectedCellTypes.length) this.selectedCellTypes = this.cellTypes.slice(0, 1);
                this.selectAll = this.selectedCellTypes.length === this.cellTypes.length;
                this.trackTypes = Array.from(new Set(this.allTracks.map(t => t.trackType)));
                this.selectedTrackTypes = this.trackTypes;
                const filteredTracks = this.filterTrackNames(this.allTracks);
                this.renderBrowser(filteredTracks,this.region);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error("Failed to initialise ATAC browser", error);
                this.loadError =
                    "Unable to load the ATAC browser: " + error.message + " You can enter a GRCh38 region above.";
            } finally {
                this.isLoading = false;
            }
        },
        async loadTracks() {
            let tracks = (await fetchTracks()).map(track => ({...track, url: assetUrl("genome/"+new URL(track.url).pathname.split("/").pop())}));
            tracks.forEach(t => {
                if (t.name.includes("signal")){
                    t.options.yMax = 10;
                    t.options.yScale = "fixed";
                }
                if (t.name.includes("peaks")){
                    t.options.maxRows = 1;
                    t.options.height = 20;
                }
            });
            let output = tracks.map((track) => ({
                ...track,
                type:
                    track.type && track.type.toLowerCase() === "bigwig"
                        ? "bigWig"
                        : track.type,
            }));
            return this.populateCellsAndTracks(output);
        },
        async getGene(geneSymbol){

            let fetchUrl = `${dataBase()}/locus?gene=${encodeURIComponent(geneSymbol)}`;

			let gene = await readBioIndex(fetchUrl);
            if (!Array.isArray(gene.data) || gene.data.length !== 1) throw new Error("No unique GRCh38 gene locus was returned.");
            return gene.data[0];
        },
        applyUrlFilters(tracks) {
            if (!window.location?.search) {
                return tracks;
            }

            const params = new URLSearchParams(window.location.search);
            const selectedCells = (params.get("cells") || "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean);
            const selectedTypes = (params.get("types") || "")
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean);

            if (!selectedCells.length && !selectedTypes.length) {
                return tracks;
            }

            return tracks.filter((track) => {
                const trackType = (track.type || "").toString().toLowerCase();
                const trackName = (track.name || "").toString().toLowerCase();

                const typeMatch =
                    !selectedTypes.length ||
                    selectedTypes.some((type) => type === trackType);

                const cellMatch =
                    !selectedCells.length ||
                    selectedCells.some((cell) => {
                        const value = cell.toLowerCase();
                        return (
                            trackName.includes(`${value} `) ||
                            trackName.includes(`${value}_`) ||
                            trackName.startsWith(value)
                        );
                    });

                return typeMatch && cellMatch;
            });
        },
        renderBrowser(tracks, displayRegion = this.region) {
            //const container = this.$refs.browser;
            const container = document.getElementById("browser");
            if (!container) {
                throw new Error("Missing WashU browser mount point");
            }

            this.unsubscribeBrowser?.();
            window.ReactDOM?.unmountComponentAtNode(container);
            container.innerHTML = '';
            this.controlReady=false;

            const defaultTracks = [
                {
                    type: "geneannotation",
                    name: "refGene",
                    genome: DEFAULT_GENOME,
                },
                {
                    type: "ruler",
                    name: "Ruler",
                },
            ];

            const contents = {
                genomeName: DEFAULT_GENOME,
                displayRegion,
                trackLegendWidth: 110,
                isShowingNavigator: true,
                tracks: [...defaultTracks, ...tracks],
                metadataTerms: ["Sample"],
            };
            const renderBrowserInElement = window.renderBrowserInElement;
            if (typeof renderBrowserInElement !== "function") {
                throw new Error("WashU browser script is not available");
            }

            this.browserStore=mountGenome(window,contents,container);
            this.controlReady=true;
            this.initialRegion=this.browserStore.getState().browser.present.viewRegion.getContextCoordinates();
            const sync=()=>{const state=this.browserStore.getState().browser.present;const locus=state.viewRegion?.currentRegionAsString()||'';if(locus!==this.liveLocus){this.liveLocus=locus;this.regionInput=locus;}this.trackCount=state.tracks.length;this.scheduleFit();};
            this.unsubscribeBrowser=this.browserStore.subscribe(sync);sync();
        },
        filterTrackNames(inputTracks){
            return inputTracks.filter(t => this.selectedCellTypes.includes(t.cellType))
                .filter(t => this.selectedTrackTypes.includes(t.trackType));
        },
        updateBrowser(){
            this.isLoading = true;
            const filteredTracks =
                this.filterTrackNames(this.allTracks);
            this.renderBrowser(filteredTracks,this.liveLocus || this.region);
            this.isLoading = false;
        },
        toggleTracks(){
            this.selectedCellTypes = !this.selectAll ? [] : this.cellTypes;
        },
        populateCellsAndTracks(input){
            // this assumes same formatting for all track names - quick fix
            let output = structuredClone(input);
            for (let i = 0; i < output.length; i++){
                let name = output[i].name;
                let splitPoint = name.indexOf(" ");
                output[i].cellType = name.slice(0,splitPoint).toLowerCase();
                output[i].trackType = name.slice(splitPoint);
            }
            return output;
        }
    },
    watch: { view(){this.$nextTick(this.scheduleFit);} }
});
</script>
<style scoped>
.atac-seq__browser { width: 100%; }
.track-options { display:flex; flex-wrap:wrap; gap:10px 16px; margin:12px 0 20px; }
.track-options label { display:flex; align-items:center; gap:5px; }
</style>
