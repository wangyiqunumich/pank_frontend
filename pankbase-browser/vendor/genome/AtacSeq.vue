<template>
  <section class="module-view">
    <div class="tabs"><button v-for="item in ['Genome','Tracks','Source']" :key="item" :aria-pressed="view===item" @click="view=item">{{item}}</button></div>
    <div class="module-stage">
      <form class="controls" @submit.prevent="openRegion"><label>GRCh38 <input v-model="regionInput" placeholder="chr7:start-end" aria-label="GRCh38 region" /></label><button class="primary" :disabled="isLoading" type="submit">View</button></form>
      <p v-if="loadError" role="alert">{{loadError}}</p><p v-if="isLoading" role="status">Loading ATAC tracks…</p>
      <div v-show="view==='Genome'" class="genome-stage"><div id="browser" class="atac-seq__browser" aria-live="polite"></div></div>
      <div v-if="view==='Tracks'" class="source-panel">
        <h2>Cell types</h2><label><input type="checkbox" v-model="selectAll" @change="toggleTracks"/> Select all</label>
        <div class="track-options"><label v-for="cellType in cellTypes" :key="cellType"><input type="checkbox" v-model="selectedCellTypes" :value="cellType"/>{{cellType}}</label></div>
        <h2>Track types</h2><div class="track-options"><label v-for="trackType in trackTypes" :key="trackType"><input type="checkbox" v-model="selectedTrackTypes" :value="trackType"/>{{trackType.includes('peaks')?'ATAC peaks':trackType}}</label></div>
        <button class="primary" @click="view='Genome';$nextTick(updateBrowser)">Apply tracks</button>
      </div>
      <div v-if="view==='Source'" class="source-panel"><h2>Source &amp; methods</h2><p>HPAP ATAC signal and peaks · GRCh38. All source cell types and track choices remain available under Tracks.</p><p>Coordinates are 0-based, half-open. {{manualLocus?'User-selected region; gene overlap is not assumed.':'Locus from explicit graph coordinates or a verified source lookup.'}}</p><p>Signal, peak calls and gene annotations are distinct evidence layers.</p></div>
    </div>
  </section>
</template>
<script>
import Vue from "vue";
import { fetchTracks } from "./tracks.js";
import { loadWashUAssets } from "./washU.js";
import { TRACKS } from "./tracks.js";
import { readBioIndex } from "../../data.mjs";
import { assetUrl, dataBase } from "../../source.mjs";



const DEFAULT_GENOME = "hg38";
const DEFAULT_GENOME_BIOINDEX = "GRCh38";


export default Vue.component("AtacSeq", {
    props: ["gene", "locus", "cellType"],
    data() {
        return {
            view: 'Genome',
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
    },
    computed: {
        region(){
            if (!this.geneInfo){
                return null;
            }
            return `chr${String(this.geneInfo.chromosome).replace(/^chr/, "")}:${this.geneInfo.start}-${this.geneInfo.end}`;
        }
    },
    methods: {
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
                this.renderBrowser(filteredTracks);
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
        renderBrowser(tracks) {
            //const container = this.$refs.browser;
            const container = document.getElementById("browser");
            if (!container) {
                throw new Error("Missing WashU browser mount point");
            }

            container.innerHTML = "";

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
                displayRegion: this.region,
                trackLegendWidth: 150,
                isShowingNavigator: true,
                tracks: [...defaultTracks, ...tracks],
                metadataTerms: ["Sample"],
            };
            const renderBrowserInElement = window.renderBrowserInElement;
            if (typeof renderBrowserInElement !== "function") {
                throw new Error("WashU browser script is not available");
            }

            renderBrowserInElement(contents, container);
        },
        filterTrackNames(inputTracks){
            return inputTracks.filter(t => this.selectedCellTypes.includes(t.cellType))
                .filter(t => this.selectedTrackTypes.includes(t.trackType));
        },
        updateBrowser(){
            this.isLoading = true;
            let browserdiv = document.getElementById("browser");
            let newdiv = document.createElement("div");
            newdiv.id = "browser";
            newdiv.className = "atac-seq__browser";
            newdiv.ariaLive = "polite";
            browserdiv.replaceWith(newdiv);

            const filteredTracks =
                this.filterTrackNames(this.allTracks);
            this.renderBrowser(filteredTracks);
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
    watch: {
    }
});
</script>
<style scoped>
.atac-seq__browser { width: 100%; min-height: 280px; }
.track-options { display:flex; flex-wrap:wrap; gap:10px 16px; margin:12px 0 20px; }
.track-options label { display:flex; align-items:center; gap:5px; }
</style>
