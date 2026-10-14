<template>
    <div
        ref="umapContainer"
        class="umap-container"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseLeave"
        @mouseover="onMouseOver"
        @mouseout="onMouseOut"
        @wheel.prevent="onWheel"
        @contextmenu.prevent
        style="width:100%; position:relative; overflow-x:hidden;"
    >
        <div v-if="expression" style="display:flex; flex-direction: column; position:absolute; top:4px; left:5px;" class="legend">
            <div class="label">Expression</div>
            <div class="gradient" :style="`background: linear-gradient(to right, ${colorScaleArray()}); height:5px;`"></div>
            <div style="display:flex" class="marks"><div>{{ minExpressionValue() }}</div><div>{{ maxExpressionValue() }}</div></div>
        </div>
        <div
            v-if="points"
            style="display:flex; align-items: center; justify-content: flex-end; gap:5px; position: absolute; right: 5px; top: 5px; z-index: 1"
        >
            <button @click="showTooltips = !showTooltips" v-b-tooltip.hover.bottom title="toggle cell info" aria-label="Toggle cell information" :style="!showTooltips ? 'background:#ddd' : 'background:white'">
                <svg style="width:12px;margin:0 4px;" viewBox="0 0 15.098 18.794" xml:space="preserve" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(-.27 -.301)">
                        <path d="M.77 14.361V.801h14.098v13.56H10.51l-2.853 4.234-2.605-4.234z" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="7.845" cy="4.296" r=".979"/>
                        <path d="M7.094 5.928h1.501v5.876H7.094z"/>
                    </g>
                </svg>
            </button>
            <button @click="toggleLabels" v-b-tooltip.hover.bottom title="toggle labels" aria-label="Toggle cluster labels" :style="!showLabels ? 'background:#ddd' : 'background:white'">
                <svg style="width:20px;" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" transform="rotate(270)">
                    <path d="M24.896 9.463a.997.997 0 0 0-.707-.293l-12.957-.001a1 1 0 0 0-1 .996l-.046 13.005a.998.998 0 0 0 .293.711l16.995 16.995a.997.997 0 0 0 1.414 0l13.004-13.004a.999.999 0 0 0 0-1.414L24.896 9.463zm3.285 29.292L12.188 22.761l.041-11.592 11.547.001 15.995 15.995-11.59 11.59z" />
                    <circle cx="20.362" cy="19.346" r="2.61" />
                </svg>
            </button>
            <button @click="resetPanZoom" v-b-tooltip.hover.bottom title="recenter" aria-label="Recenter cell map">
                <svg style="width:18px;" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12H4V4h8v2H6v6zM28 12h-2V6h-6V4h8v8zM12 28H4v-8h2v6h6v2zM28 28h-8v-2h6v-6h2v8zM15 10h2v4h-2zM10 15h4v2h-4zM18 15h4v2h-4zM15 18h2v4h-2z" />
                    <path fill="none" d="M0 0h32v32H0z" />
                </svg>
            </button>
            <button
                aria-label="Cell map navigation help" v-b-tooltip.hover.bottom.html
                :title="is3dMode ? 'zoom: mouse wheel<br>rotate: click + drag<br>pan: shift + drag or right drag' : 'zoom: mouse wheel<br>pan: click + drag'"
            >
                <svg style="width:18px;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 19.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm0 1.5a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm.75-6v1.5h-1.5V15h1.5Zm-2.25-4.568C10.5 9.662 11.15 9 12 9s1.5.663 1.5 1.432c0 .307-.185.671-.592 1.084-.395.4-.898.743-1.315 1.013l-.343.222v1.499h1.5v-.688c.381-.259.833-.595 1.225-.992.507-.514 1.025-1.24 1.025-2.138C15 8.79 13.635 7.5 12 7.5s-3 1.291-3 2.932h1.5Z" fill="#000" />
                </svg>
            </button>
            <button @click="download" v-b-tooltip.hover.bottom title="Download" aria-label="Download cell map">
                <svg style="width:24px;" fill="#000000" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                    <g id="SVGRepo_iconCarrier">
                        <path d="M512 666.5L367.2 521.7l36.2-36.2 83 83V256h51.2v312.5l83-83 36.2 36.2L512 666.5zm-204.8 50.3V768h409.6v-51.2H307.2z"></path>
                    </g>
                </svg>
            </button>
        </div>

        <canvas ref="umapCanvas" class="umap-canvas" @click="onClick"></canvas>
        <canvas ref="umapLabelCanvas" class="umap-label-canvas" :style="`display:${showLabels ? 'block' : 'none'}`"></canvas>
        <canvas v-if="is3dMode" ref="axisIndicatorCanvas" class="umap-axis-indicator"></canvas>
    </div>
</template>

<script>
import * as d3 from 'd3';
import { layoutPreviewLabels } from '../previewLabels.mjs';
import Vue from 'vue';
import EventBus from "@/utils/eventBus";
import sharedUmapData from "@/components/researchPortal/singleCellBrowser/sharedUmapData.js";
import mouseTooltip from '@/components/researchPortal/singleCellBrowser/mouseTooltip.js';
import { llog } from "./llog.js";

const DEG_TO_RAD = Math.PI / 180;
const EPSILON = 0.000001;
const VIEW_PADDING = 0.1;
const RESET_CAMERA_DISTANCE_3D_MULTIPLIER = 0.9;
const PAN_SENSITIVITY_3D = 1.2;
const AXIS_INDICATOR_SIZE = 50;
const MIN_ZOOM_RATIO_2D = 0.1;
const MAX_ZOOM_RATIO_2D = 20;
const IDENTITY_MATRIX = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
]);

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function addVec3(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtractVec3(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaleVec3(v, scalar) {
    return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

function dotVec3(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function crossVec3(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}

function lengthVec3(v) {
    return Math.hypot(v[0], v[1], v[2]);
}

function normalizeVec3(v) {
    const len = lengthVec3(v);
    if (len < EPSILON) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
}

function perspectiveMatrix(fovRadians, aspect, near, far) {
    const f = 1.0 / Math.tan(fovRadians / 2);
    const rangeInv = 1 / (near - far);

    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeInv, -1,
        0, 0, near * far * rangeInv * 2, 0,
    ]);
}

function orthographicMatrix(left, right, bottom, top, near, far) {
    return new Float32Array([
        2 / (right - left), 0, 0, 0,
        0, 2 / (top - bottom), 0, 0,
        0, 0, -2 / (far - near), 0,
        -((right + left) / (right - left)),
        -((top + bottom) / (top - bottom)),
        -((far + near) / (far - near)),
        1,
    ]);
}

function lookAtMatrix(eye, target, up) {
    const zAxis = normalizeVec3(subtractVec3(eye, target));
    const xAxis = normalizeVec3(crossVec3(up, zAxis));
    const yAxis = crossVec3(zAxis, xAxis);

    return new Float32Array([
        xAxis[0], yAxis[0], zAxis[0], 0,
        xAxis[1], yAxis[1], zAxis[1], 0,
        xAxis[2], yAxis[2], zAxis[2], 0,
        -dotVec3(xAxis, eye), -dotVec3(yAxis, eye), -dotVec3(zAxis, eye), 1,
    ]);
}

function multiplyMatrices(a, b) {
    const out = new Float32Array(16);

    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            let sum = 0;
            for (let i = 0; i < 4; i++) {
                sum += a[i * 4 + row] * b[col * 4 + i];
            }
            out[col * 4 + row] = sum;
        }
    }

    return out;
}

/*
    world point -> canvas pixels, written into `out` instead of returned, so the per-cell
    loop in projectPoints() can reuse one scratch object rather than allocating per point.

    this is the only copy of the projection: projectWorldPoint() wraps it for the handful of
    cluster labels, and projectPoints() calls it once per cell. the matrix multiply is
    written in the same order the transformPoint() helper it replaced used, so results are
    bit-identical to the old path - verified against it over six camera setups in node.
    returns false when the point cannot be projected (no matrix, or a degenerate w).
*/
function projectToCanvas(matrix, x, y, z, canvasWidth, canvasHeight, out) {
    const clipX = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
    const clipY = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
    const clipZ = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
    if (Math.abs(w) < EPSILON) return false;

    const ndcX = clipX / w;
    const ndcY = clipY / w;
    const ndcZ = clipZ / w;

    out.x = (ndcX * 0.5 + 0.5) * canvasWidth;
    out.y = (1 - (ndcY * 0.5 + 0.5)) * canvasHeight;
    out.depth = ndcZ;
    out.visible = ndcX >= -1 && ndcX <= 1 && ndcY >= -1 && ndcY <= 1 && ndcZ >= -1 && ndcZ <= 1;
    return true;
}

const projectionScratch = { x: 0, y: 0, depth: 0, visible: false };

function colorToRgba(color, alpha = 255) {
    const rgb = d3.color(color || "#000000").rgb();
    return [rgb.r, rgb.g, rgb.b, alpha];
}

export default Vue.component('research-umap-plot-gl', {
    props: {
        previewLabels: { type: Object, default: null },
        group: {
            type: String,
            required: true,
        },
        //typed array bundle from scUtils.parseCoordinates:
        //{ count, X: Float32Array, Y: Float32Array, Z: Float32Array|null }
        points: {
            type: Object,
            required: true,
        },
        labels: {
            type: Object,
            required: true,
        },
        colors: {
            type: Object,
            required: true,
        },
        cellTypeField: {
            type: String,
            required: false,
        },
        colorByField: {
            type: String,
            required: false,
        },
        hoverFields: {
            type: Array,
            required: false,
        },
        width: {
            type: Number,
            default: 800,
        },
        height: {
            type: Number,
            default: 800,
        },
        highlightLabel: {
            type: String,
            default: null,
        },
        highlightLabels: {
            type: Array,
            default: () => [],
        },
        expression: {
            type: Array,
            default: null,
        },
        /*
            optional cell filter from scUtils.buildCellFilter - a Uint8Array with one byte
            per cell, 1 to draw and 0 to hide. null means every cell is drawn.

            no `type` here on purpose: Vue's Object check reads toRawType, which is
            'Uint8Array' rather than 'Object', and would warn on every valid value.

            it is deliberately NOT folded into a_isHighlight: that channel already carries
            two meanings at once (the two-pass draw shrinks non-highlighted points to 0.2x
            and then paints the highlighted ones over them), and a filtered-out cell has to
            disappear from both passes.
        */
        visibleMask: {
            default: null,
        },
        expressionColorScale: {
            type: String,
            required: false,
            default: "blue"
        },
        //name for the png download, without the extension. the parent owns it because it is
        //the only thing that knows which panel this is - the label-coloured one or the gene
        //one - and it names every other export on the page the same way
        downloadFilename: {
            type: String,
            default: "umap"
        }
    },
    data() {
        return {
            gl: null,
            program: null,
            locations: null,
            buffers: {
                points: {},
                axes: {},
                hover: {},
            },
            showLabels: true,
            showTooltips: true,
            pointBounds: {
                minX: 0,
                maxX: 0,
                minY: 0,
                maxY: 0,
                minZ: 0,
                maxZ: 0,
                center: [0, 0, 0],
                size: [0, 0, 0],
                radius: 1,
            },
            camera: {
                target: [0, 0, 0],
                distance: 1,
                yaw: 0,
                pitch: 0,
            },
            resetCamera: {
                target: [0, 0, 0],
                distance: 1,
                yaw: 0,
                pitch: 0,
            },
            projection: {
                fov: 45 * DEG_TO_RAD,
                near: 0.1,
                far: 10000,
                aspect: 1,
            },
            orthoBaseHalfHeight: 1,
            isHovering: false,
            interactionMode: null,
            lastMouse: { x: 0, y: 0 },
            vertexCount: 0,
            axisVertexCount: 0,
            clusterCenters: [],
            expressionScale: null,
            expressionExtent: {
                min: null,
                max: null,
            },
            resizeTimeout: null,

            colorOptions: {
                red: d3.interpolateReds,
                blue: d3.interpolate("lightgrey", "blue")
            },
            //projectedPoints is deliberately NOT here - see projectPoints(). it holds one
            //entry per cell, and a reactive property made Vue observe every one of them on
            //every render. it is initialised in created() as a plain field instead
            projectedLabels: [],
            renderMatrix: null,
            viewMatrix: IDENTITY_MATRIX,
            orthoBounds: null,
            hoveredPointIndex: -1,
            pointDrawOrder: [],
            cameraVectors: {
                eye: [0, 0, 1],
                forward: [0, 0, -1],
                right: [1, 0, 0],
                up: [0, 1, 0],
            },
            sharedGroupAttached: false,
            renderQueued: false,
            renderProjectionDirty: true,
            syncPending: false,
            rafId: null,
            hoverVertexCount: 0,
        };
    },
    computed: {
        is3dMode() {
            //parseCoordinates only keeps Z when the file has one with a non-zero
            //value, which is the same test this used to run over every point
            return !!this.points.Z;
        },
        currColorOption(){
            return this.colorOptions[this.expressionColorScale];
        }
    },
    watch: {
        points: {
            handler() {
                this.cleanUp();
                this.init();
            },
        },
        labels: {
            handler() {
                this.cleanUpBuffers();
                this.calculateClusterCenters();
                this.setupBuffers();
                this.requestRender(true);
            },
        },
        cellTypeField(){
            if(!this.points) return;
            this.cleanUp();
            this.init();
        },
        colorByField() {
            this.setupBuffers({
                rebuildPositions: false,
                rebuildColors: true,
                rebuildOrder: false,
                rebuildHighlight: true,
                rebuildVisible: false,
                rebuildAxes: false,
            });
            this.requestRender(true);
        },
        /*
            only the visible buffer and the cluster label positions depend on the filter.
            the camera deliberately does not: pointBounds and resetCameraFromBounds are left
            alone, so the embedding holds still while the filter changes instead of jumping
            and rescaling on every toggle.
        */
        visibleMask() {
            if (!this.points) return;
            this.calculateClusterCenters();
            this.setupBuffers({
                rebuildPositions: false,
                rebuildColors: false,
                rebuildOrder: false,
                rebuildHighlight: false,
                rebuildVisible: true,
                rebuildAxes: false,
            });
            this.requestRender(true);
        },
        highlightLabel() {
            this.updateHighlightBuffer();
            this.requestRender(true);
        },
        highlightLabels() {
            this.updateHighlightBuffer();
            this.requestRender(true);
        },
        expression() {
            this.updateExpressionScale();
            //the draw order is fixed per dataset now, so selecting a gene only changes
            //colours - positions, order and highlight were only rebuilt here because
            //the order used to depend on the expression values
            this.setupBuffers({
                rebuildPositions: false,
                rebuildColors: true,
                rebuildOrder: false,
                rebuildHighlight: false,
                rebuildVisible: false,
                rebuildAxes: false,
            });
            this.requestRender(true);
        },
    },
    created() {
        //a plain field, not reactive data: one entry per cell, rebuilt every render in 3D
        this.projectedPoints = null;
        //floats per point in the position buffer - 2 in 2D, 3 in 3D. see buildPositionBuffer
        this.pointPositionComponents = 3;
    },
    mounted() {
        EventBus.$on('view-transform-change', this.handleUpdateViewTransform);
        window.addEventListener('resize', this.handleResize);
        this.init();
    },
    beforeDestroy() {
        EventBus.$off('view-transform-change', this.handleUpdateViewTransform);
        window.removeEventListener('resize', this.handleResize);
        this.cleanUp();
    },
    methods: {
        colorScaleArray() {
            return d3.range(0, 1.01, 0.1).map(t => this.currColorOption(t)).join(', ');
        },
        minExpressionValue(){
            return this.expressionExtent.min
        },
        maxExpressionValue(){
            return this.expressionExtent.max
        },
        handleResize() {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.init();
            }, 100);
        },

        toggleLabels() {
            this.showLabels = !this.showLabels;
            this.requestRender(true);
        },

        init() {
            llog("---glUMAP init");

            if (!this.$refs.umapContainer || !this.points || this.points.count === 0 || this.$refs.umapContainer.clientWidth < 1) return;

            if (this.sharedGroupAttached) {
                sharedUmapData.release(this.group);
            }
            sharedUmapData.initPoints(this.group, this.points);
            this.sharedGroupAttached = true;

            const parentWidth = this.$refs.umapContainer.clientWidth;
            this.$refs.umapContainer.style.height = `${this.height}px`;

            const pixelRatio = window.devicePixelRatio || 1;
            const canvas = this.$refs.umapCanvas;
            canvas.width = parentWidth * pixelRatio;
            canvas.height = this.height * pixelRatio;
            canvas.style.width = `${parentWidth}px`;
            canvas.style.height = `${this.height}px`;

            const labelCanvas = this.$refs.umapLabelCanvas;
            labelCanvas.width = parentWidth * pixelRatio;
            labelCanvas.height = this.height * pixelRatio;
            labelCanvas.style.width = `${parentWidth}px`;
            labelCanvas.style.height = `${this.height}px`;

            this.setupAxisIndicatorCanvas(pixelRatio);

            this.calculatePointBounds();
            this.calculateClusterCenters();
            if (!this.cameraInitialized) { this.resetCameraFromBounds(); this.cameraInitialized = true; }
            if (this.gl && this.program) this.gl.deleteProgram(this.program);
            this.initializeWebGL();
            this.updateExpressionScale();
            this.setupBuffers();
            this.requestRender(true);
        },

        cleanUpBuffers() {
            const gl = this.gl;
            if (!gl) return;

            Object.values(this.buffers.points).forEach(buffer => {
                if (buffer) gl.deleteBuffer(buffer);
            });
            Object.values(this.buffers.axes).forEach(buffer => {
                if (buffer) gl.deleteBuffer(buffer);
            });
            Object.values(this.buffers.hover).forEach(buffer => {
                if (buffer) gl.deleteBuffer(buffer);
            });

            this.buffers = { points: {}, axes: {}, hover: {} };
        },

        cleanUp() {
            clearTimeout(this.resizeTimeout);
            this.cleanUpBuffers();

            if (this.gl && this.program) {
                this.gl.deleteProgram(this.program);
            }

            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }

            // A cancelled frame must not block subsequent filter/color redraws.
            this.renderQueued = false;
            this.syncPending = false;
            this.program = null;
            this.gl = null;
            this.locations = null;
            mouseTooltip.hide();
            if (this.sharedGroupAttached) {
                sharedUmapData.release(this.group);
                this.sharedGroupAttached = false;
            }
        },

        setupAxisIndicatorCanvas(pixelRatio) {
            const canvas = this.$refs.axisIndicatorCanvas;
            if (!canvas) return;

            canvas.width = AXIS_INDICATOR_SIZE * pixelRatio;
            canvas.height = AXIS_INDICATOR_SIZE * pixelRatio;
            canvas.style.width = `${AXIS_INDICATOR_SIZE}px`;
            canvas.style.height = `${AXIS_INDICATOR_SIZE}px`;
        },

        calculatePointBounds() {
            const bounds = {
                minX: Infinity,
                maxX: -Infinity,
                minY: Infinity,
                maxY: -Infinity,
                minZ: Infinity,
                maxZ: -Infinity,
            };

            const { count, X, Y, Z } = this.points;
            for (let i = 0; i < count; i++) {
                const x = X[i];
                const y = Y[i];
                const z = Z ? Z[i] : 0;
                if (x < bounds.minX) bounds.minX = x;
                if (x > bounds.maxX) bounds.maxX = x;
                if (y < bounds.minY) bounds.minY = y;
                if (y > bounds.maxY) bounds.maxY = y;
                if (z < bounds.minZ) bounds.minZ = z;
                if (z > bounds.maxZ) bounds.maxZ = z;
            }

            const size = [
                Math.max(bounds.maxX - bounds.minX, 1),
                Math.max(bounds.maxY - bounds.minY, 1),
                Math.max(bounds.maxZ - bounds.minZ, 1),
            ];

            const center = [
                (bounds.minX + bounds.maxX) / 2,
                (bounds.minY + bounds.maxY) / 2,
                (bounds.minZ + bounds.maxZ) / 2,
            ];

            this.pointBounds = {
                ...bounds,
                size,
                center,
                radius: Math.max(...size) / 2 || 1,
            };
        },

        calculateClusterCenters() {
            this.clusterCenters = [];
            const labelField = this.cellTypeField || Object.keys(this.labels.metadata_labels)[0];
            const metadata = this.labels.metadata[labelField];
            const metadataLabels = this.labels.metadata_labels[labelField];

            const sums = {};
            const { count, X, Y, Z } = this.points;
            const use3d = this.is3dMode;
            //a centroid over cells that are no longer drawn would put the label somewhere
            //with nothing under it
            const mask = this.visibleMask && this.visibleMask.length === count ? this.visibleMask : null;
            for (let index = 0; index < count; index++) {
                if (mask && !mask[index]) continue;
                const labelIndex = metadata[index];
                const label = metadataLabels[labelIndex] || 'Unlabeled';
                if (!sums[label]) {
                    sums[label] = { xSum: 0, ySum: 0, zSum: 0, count: 0 };
                }
                sums[label].xSum += X[index];
                sums[label].ySum += Y[index];
                sums[label].zSum += use3d ? Z[index] : 0;
                sums[label].count++;
            }

            Object.entries(sums).forEach(([label, info]) => {
                this.clusterCenters.push({
                    label,
                    position: [
                        info.xSum / info.count,
                        info.ySum / info.count,
                        info.zSum / info.count,
                    ],
                });
            });
        },

        resetCameraFromBounds() {
            this.projection.aspect = this.$refs.umapCanvas.width / Math.max(this.$refs.umapCanvas.height, 1);

            const viewportUsage = 1 - (VIEW_PADDING * 2);
            let distance;

            if (this.is3dMode) {
                const yaw = -Math.PI / 4;
                const pitch = Math.PI / 7;
                const eyeDirection = normalizeVec3([
                    Math.cos(pitch) * Math.sin(yaw),
                    Math.sin(pitch),
                    Math.cos(pitch) * Math.cos(yaw),
                ]);
                const forward = normalizeVec3(scaleVec3(eyeDirection, -1));
                const right = normalizeVec3(crossVec3(forward, [0, 1, 0]));
                const up = normalizeVec3(crossVec3(right, forward));
                const tanHalfFovY = Math.tan(this.projection.fov / 2) * viewportUsage;
                const tanHalfFovX = tanHalfFovY * this.projection.aspect;
                const [sx, sy, sz] = this.pointBounds.size;
                const halfSizes = [sx / 2, sy / 2, sz / 2];

                distance = this.projection.near;
                for (const dx of [-halfSizes[0], halfSizes[0]]) {
                    for (const dy of [-halfSizes[1], halfSizes[1]]) {
                        for (const dz of [-halfSizes[2], halfSizes[2]]) {
                            const offset = [dx, dy, dz];
                            const x = Math.abs(dotVec3(offset, right));
                            const y = Math.abs(dotVec3(offset, up));
                            const z = dotVec3(offset, forward);

                            distance = Math.max(
                                distance,
                                (x / Math.max(tanHalfFovX, EPSILON)) - z,
                                (y / Math.max(tanHalfFovY, EPSILON)) - z
                            );
                        }
                    }
                }
                distance *= RESET_CAMERA_DISTANCE_3D_MULTIPLIER;
            } else {
                const halfWidth = Math.max(this.pointBounds.size[0] / 2, EPSILON);
                const halfHeight = Math.max(this.pointBounds.size[1] / 2, EPSILON);
                this.orthoBaseHalfHeight = Math.max(
                    halfHeight,
                    halfWidth / Math.max(this.projection.aspect, EPSILON)
                ) / Math.max(viewportUsage, EPSILON);
                distance = 1;
            }

            const camera = {
                target: [...this.pointBounds.center],
                distance,
                yaw: this.is3dMode ? -Math.PI / 4 : 0,
                pitch: this.is3dMode ? Math.PI / 7 : 0,
            };

            this.camera = {
                target: [...camera.target],
                distance: camera.distance,
                yaw: camera.yaw,
                pitch: camera.pitch,
            };
            this.resetCamera = {
                target: [...camera.target],
                distance: camera.distance,
                yaw: camera.yaw,
                pitch: camera.pitch,
            };
            this.updateCameraState();
        },

        initializeWebGL() {
            const canvas = this.$refs.umapCanvas;
            /*
                preserveDrawingBuffer is deliberately off. it existed so download() could
                read the canvas at any time, but it makes the browser keep a copy of the
                whole framebuffer after every composite - on two panels, every frame, for
                the entire session, to serve an export that happens rarely if ever.
                download() renders synchronously before reading instead, which is the same
                guarantee for the one moment it is needed.
            */
            const gl = canvas.getContext('webgl');
            if (!gl) {
                console.error('WebGL not supported');
                return;
            }

            this.gl = gl;

            const vertexShaderSource = `
                attribute vec3 a_position;
                attribute vec4 a_color;
                attribute float a_isHighlight;
                attribute float a_isVisible;

                uniform mat4 u_matrix;
                uniform float u_pointSize;
                uniform float u_renderPoints;
                uniform float u_hoverScale;
                uniform float u_minPointScale;
                uniform float u_maxPointScale;
                uniform float u_highlightMode;

                varying vec4 v_color;
                varying float v_renderPoints;

                void main() {
                    //a cell excluded by the filter leaves both highlight passes. buffer
                    //sets without a visible buffer read a constant 1.0 (see bindAttributes)
                    if (a_isVisible < 0.5) {
                        gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
                        gl_PointSize = 0.0;
                        v_color = vec4(0.0);
                        v_renderPoints = u_renderPoints;
                        return;
                    }

                    if (u_highlightMode < 1.5 && a_isHighlight < 0.5) {
                        gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
                        gl_PointSize = 0.0;
                        v_color = vec4(0.0);
                        v_renderPoints = u_renderPoints;
                        return;
                    }

                    if (u_highlightMode > 1.5 && a_isHighlight > 0.5) {
                        gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
                        gl_PointSize = 0.0;
                        v_color = vec4(0.0);
                        v_renderPoints = u_renderPoints;
                        return;
                    }

                    gl_Position = u_matrix * vec4(a_position, 1.0);
                    float pointScale = mix(u_minPointScale, u_maxPointScale, a_isHighlight);
                    gl_PointSize = u_pointSize * pointScale * u_hoverScale;
                    v_color = a_color;
                    v_renderPoints = u_renderPoints;
                }
            `;

            const fragmentShaderSource = `
                precision mediump float;
                varying vec4 v_color;
                varying float v_renderPoints;

                void main() {
                    if (v_renderPoints > 0.5) {
                        vec2 centered = gl_PointCoord - vec2(0.5);
                        if (dot(centered, centered) > 0.25) {
                            discard;
                        }
                    }

                    gl_FragColor = v_color;
                }
            `;

            const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
            this.program = this.createProgram(gl, vertexShader, fragmentShader);
            gl.useProgram(this.program);
            this.locations = {
                position: gl.getAttribLocation(this.program, 'a_position'),
                color: gl.getAttribLocation(this.program, 'a_color'),
                highlight: gl.getAttribLocation(this.program, 'a_isHighlight'),
                visible: gl.getAttribLocation(this.program, 'a_isVisible'),
                matrix: gl.getUniformLocation(this.program, 'u_matrix'),
                pointSize: gl.getUniformLocation(this.program, 'u_pointSize'),
                renderPoints: gl.getUniformLocation(this.program, 'u_renderPoints'),
                hoverScale: gl.getUniformLocation(this.program, 'u_hoverScale'),
                minPointScale: gl.getUniformLocation(this.program, 'u_minPointScale'),
                maxPointScale: gl.getUniformLocation(this.program, 'u_maxPointScale'),
                highlightMode: gl.getUniformLocation(this.program, 'u_highlightMode'),
            };
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.DEPTH_TEST);
        },

        getActiveLabelField() {
            return this.colorByField || this.cellTypeField || Object.keys(this.labels.metadata_labels)[0];
        },

        updateExpressionScale() {
            if (!this.expression || this.expression.length === 0) {
                this.expressionScale = null;
                this.expressionExtent = { min: null, max: null };
                return;
            }

            let min = Infinity;
            let max = -Infinity;
            for (let index = 0; index < this.expression.length; index++) {
                const value = this.expression[index];
                if (value == null || Number.isNaN(value)) continue;
                if (value < min) min = value;
                if (value > max) max = value;
            }

            if (min === Infinity || max === -Infinity) {
                this.expressionScale = null;
                this.expressionExtent = { min: null, max: null };
                return;
            }

            this.expressionExtent = { min, max };
            this.expressionScale = d3.scaleSequential(this.currColorOption).domain([0, max]);
        },

        buildPointOrder() {
            //one fixed shuffle per dataset, shared with the other panel. it used to sort
            //by expression, which made a lightly expressing region look broadly positive
            //- see the note in sharedUmapData
            return sharedUmapData.getDrawOrder(this.group);
        },

        /*
            2 floats per point on a 2D dataset, 3 on a 3D one.

            this always wrote 3 and stored a literal 0 for Z in 2D - 4 bytes per cell of
            nothing, in the gl buffer and again in this staging copy, on both panels. at
            1.5M cells that is ~6 MB per panel. a_position is a vec3 in the shader and
            WebGL defaults the components an attribute does not supply to (0, 0, 0, 1), so
            a 2-component attribute arrives in the shader as exactly the vec3(x, y, 0) the
            old buffer spelled out. bindAttributes reads the count off the buffer set.
        */
        buildPositionBuffer(indices, components) {
            const count = indices.length;
            const { X, Y, Z } = this.points;
            const positions = new Float32Array(count * components);

            for (let drawIndex = 0; drawIndex < count; drawIndex++) {
                const index = indices[drawIndex];
                const at = drawIndex * components;
                positions[at] = X[index];
                positions[at + 1] = Y[index];
                if (components > 2) positions[at + 2] = Z ? Z[index] : 0;
            }

            return positions;
        },

        buildColorBuffer(indices) {
            const labelField = this.getActiveLabelField();
            const metadata = this.labels.metadata[labelField];
            const metadataLabels = this.labels.metadata_labels[labelField];
            const colors = new Uint8Array(indices.length * 4);
            const labelColors = this.colors[labelField] || {};

            for (let drawIndex = 0; drawIndex < indices.length; drawIndex++) {
                const index = indices[drawIndex];

                let rgba;
                if (this.expressionScale && this.expression[index] != null) {
                    rgba = colorToRgba(this.expressionScale(this.expression[index]));
                } else {
                    const labelIndex = metadata[index];
                    const label = metadataLabels[labelIndex];
                    rgba = colorToRgba(labelColors[label] || "#000000");
                }

                rgba[3] = 255;
                colors.set(rgba, drawIndex * 4);
            }

            return colors;
        },

        buildAxisBuffers() {
            const [sx, sy, sz] = this.pointBounds.size;
            const axisLength = Math.max(sx, sy, sz) * 0.65 || 1;
            const [cx, cy, cz] = this.pointBounds.center;

            const positions = new Float32Array([
                cx - axisLength, cy, cz, cx + axisLength, cy, cz,
                cx, cy - axisLength, cz, cx, cy + axisLength, cz,
                cx, cy, cz - axisLength, cx, cy, cz + axisLength,
            ]);

            const xColor = colorToRgba("#d64545");
            const yColor = colorToRgba("#2e9b46");
            const zColor = colorToRgba("#2f6fe4");
            const colors = new Uint8Array([
                ...xColor, ...xColor,
                ...yColor, ...yColor,
                ...zColor, ...zColor,
            ]);
            const highlight = new Uint8Array([255, 255, 255, 255, 255, 255]);

            return { positions, colors, highlight, vertexCount: 6 };
        },

        makeBuffer(data, existingBuffer = null) {
            const gl = this.gl;
            const buffer = existingBuffer || gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            return buffer;
        },

        setupBuffers(options = {}) {
            const gl = this.gl;
            if (!gl) return;

            const {
                rebuildPositions = true,
                rebuildColors = true,
                rebuildOrder = true,
                rebuildHighlight = true,
                rebuildVisible = true,
                rebuildAxes = true,
            } = options;

            if (rebuildOrder || this.pointDrawOrder.length !== this.points.count) {
                this.pointDrawOrder = this.buildPointOrder();
            }
            //the order comes from the shared group, so there is nothing to draw until
            //this panel has attached to one
            if (!this.pointDrawOrder) return;

            this.vertexCount = this.points.count;

            if (rebuildPositions) {
                //set together, so the attribute layout can never disagree with the buffer.
                //kept off this.buffers.points - everything in there is deleted as a
                //WebGLBuffer on teardown, so a plain number cannot live in it
                const components = this.is3dMode ? 3 : 2;
                const positions = this.buildPositionBuffer(this.pointDrawOrder, components);
                this.buffers.points.position = this.makeBuffer(positions, this.buffers.points.position);
                this.pointPositionComponents = components;
            }

            if (rebuildColors) {
                const colors = this.buildColorBuffer(this.pointDrawOrder);
                this.buffers.points.color = this.makeBuffer(colors, this.buffers.points.color);
            }

            if (rebuildHighlight) {
                this.updateHighlightBuffer(this.pointDrawOrder);
            }

            if (rebuildVisible) {
                this.updateVisibleBuffer(this.pointDrawOrder);
            }

            if (rebuildAxes) {
                const axisData = this.buildAxisBuffers();
                this.axisVertexCount = axisData.vertexCount;
                this.buffers.axes.position = this.makeBuffer(axisData.positions, this.buffers.axes.position);
                this.buffers.axes.color = this.makeBuffer(axisData.colors, this.buffers.axes.color);
                this.buffers.axes.highlight = this.makeBuffer(axisData.highlight, this.buffers.axes.highlight);
            }

            this.updateHoverBuffer();
        },

        updateHoverBuffer() {
            const gl = this.gl;
            if (!gl) return;

            if (this.hoveredPointIndex === -1) {
                this.hoverVertexCount = 0;
                return;
            }

            const index = this.hoveredPointIndex;
            const { count, X, Y, Z } = this.points;
            if (index >= count) {
                this.hoverVertexCount = 0;
                return;
            }

            const positions = new Float32Array([
                X[index],
                Y[index],
                Z ? Z[index] : 0,
            ]);
            const colors = new Uint8Array([0, 0, 0, 255]);
            const highlight = new Uint8Array([255]);

            this.buffers.hover.position = this.makeBuffer(positions, this.buffers.hover.position);
            this.buffers.hover.color = this.makeBuffer(colors, this.buffers.hover.color);
            this.buffers.hover.highlight = this.makeBuffer(highlight, this.buffers.hover.highlight);
            this.hoverVertexCount = 1;
        },

        updateHighlightBuffer(sortedIndices = null) {
            const gl = this.gl;
            if (!gl) return;

            const indices = sortedIndices || this.pointDrawOrder || Array.from({ length: this.vertexCount }, (_, index) => index);
            const labelField = this.getActiveLabelField();
            const metadata = this.labels.metadata[labelField];
            const metadataLabels = this.labels.metadata_labels[labelField];
            const hasHighlightFilter = !!this.highlightLabel || this.highlightLabels.length > 0;
            const highlight = new Uint8Array(indices.length);

            for (let drawIndex = 0; drawIndex < indices.length; drawIndex++) {
                const pointIndex = indices[drawIndex];
                if (!hasHighlightFilter) {
                    highlight[drawIndex] = 255;
                    continue;
                }

                const labelIndex = metadata[pointIndex];
                const label = metadataLabels[labelIndex];
                highlight[drawIndex] = label === this.highlightLabel || this.highlightLabels.includes(label) ? 255 : 0;
            }

            this.buffers.points.highlight = this.makeBuffer(highlight, this.buffers.points.highlight);
        },

        /*
            the filter, reordered into draw order. one byte per cell per panel.

            this is the whole cost of filtering the embedding: positions, colours and the
            shared seeded draw order are all untouched, so a filter change uploads ~1.7 MB
            at 1.7M cells instead of rebuilding the ~18 MB of position buffer that changing
            the draw order used to force.

            when there is no filter the buffer is deleted rather than filled with ones, so
            bindAttributes falls back to the constant and nothing per-cell is uploaded at
            all.
        */
        updateVisibleBuffer(sortedIndices = null) {
            const gl = this.gl;
            if (!gl) return;

            const mask = this.visibleMask;
            if (!mask || mask.length !== this.points.count) {
                if (this.buffers.points.visible) {
                    gl.deleteBuffer(this.buffers.points.visible);
                    this.buffers.points.visible = null;
                }
                return;
            }

            const indices = sortedIndices || this.pointDrawOrder;
            if (!indices) return;

            const visible = new Uint8Array(indices.length);
            for (let drawIndex = 0; drawIndex < indices.length; drawIndex++) {
                visible[drawIndex] = mask[indices[drawIndex]] ? 255 : 0;
            }

            this.buffers.points.visible = this.makeBuffer(visible, this.buffers.points.visible);
        },

        getEyePosition() {
            const { target, distance, yaw, pitch } = this.camera;
            return [
                target[0] + distance * Math.cos(pitch) * Math.sin(yaw),
                target[1] + distance * Math.sin(pitch),
                target[2] + distance * Math.cos(pitch) * Math.cos(yaw),
            ];
        },

        updateCameraState() {
            if (this.is3dMode) {
                const eye = this.getEyePosition();
                const target = this.camera.target;
                const forward = normalizeVec3(subtractVec3(target, eye));
                const right = normalizeVec3(crossVec3(forward, [0, 1, 0]));
                const up = normalizeVec3(crossVec3(right, forward));

                this.cameraVectors = { eye, forward, right, up };
                this.orthoBounds = null;
                this.viewMatrix = lookAtMatrix(eye, target, up);
                this.renderMatrix = multiplyMatrices(
                    perspectiveMatrix(this.projection.fov, this.projection.aspect, this.projection.near, this.projection.far),
                    this.viewMatrix
                );
                return;
            }

            const zoomRatio = this.camera.distance / this.resetCamera.distance;
            const halfHeight = Math.max(this.orthoBaseHalfHeight * zoomRatio, 0.1);
            const halfWidth = halfHeight * this.projection.aspect;
            const [cx, cy] = this.camera.target;
            this.orthoBounds = {
                left: cx - halfWidth,
                right: cx + halfWidth,
                top: cy + halfHeight,
                bottom: cy - halfHeight,
            };

            this.cameraVectors = {
                eye: [cx, cy, this.camera.distance],
                forward: [0, 0, -1],
                right: [1, 0, 0],
                up: [0, 1, 0],
            };
            this.viewMatrix = IDENTITY_MATRIX;
            this.renderMatrix = orthographicMatrix(
                cx - halfWidth,
                cx + halfWidth,
                cy - halfHeight,
                cy + halfHeight,
                -Math.max(this.pointBounds.radius * 4, 10),
                Math.max(this.pointBounds.radius * 4, 10)
            );
        },

        projectWorldPoint(point) {
            if (!this.renderMatrix) return null;

            const canvas = this.$refs.umapCanvas;
            if (!projectToCanvas(this.renderMatrix, point[0], point[1], point[2],
                canvas.width, canvas.height, projectionScratch)) {
                return null;
            }
            //a fresh object: cluster labels are few and are held across renders
            return {
                x: projectionScratch.x,
                y: projectionScratch.y,
                depth: projectionScratch.depth,
                visible: projectionScratch.visible,
            };
        },

        /*
            the 3D hover test needs every cell in canvas space. this used to build one
            {x,y,depth,visible} object per cell into a plain Array and assign it to
            this.projectedPoints - which was declared in data(), so Vue deep-observed all of
            them, attaching an Observer and a Dep per object. on a 1.5M cell dataset that is
            A1's ~467 bytes per cell of pure reactivity, paid again on every render, on top
            of an array literal and an object per point.

            now three typed arrays, allocated once and overwritten in place, on a plain
            non-reactive field: 9 bytes per cell, no per-point allocation, nothing for Vue to
            walk. depth is not kept - nothing reads it.

            UNTESTED AGAINST A REAL 3D DATASET. there was none in the portal when this was
            written; the maths is verified bit-identical to the old path in node, but if 3D
            hover ever misbehaves this is the first place to look. to debug: the old code
            skipped a point when projectWorldPoint returned null (no matrix, or |w| < EPSILON)
            OR when visible was false; here both cases are folded into visible[i] === 0, so a
            point that is silently never hoverable most likely has visible stuck at 0.
        */
        projectPoints() {
            const { count, X, Y, Z } = this.points;
            let projected = this.projectedPoints;
            if (!projected || projected.count !== count) {
                projected = {
                    count,
                    x: new Float32Array(count),
                    y: new Float32Array(count),
                    visible: new Uint8Array(count),
                };
            }

            const matrix = this.renderMatrix;
            const canvas = this.$refs.umapCanvas;
            if (!matrix || !canvas) {
                projected.visible.fill(0);
                return projected;
            }

            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const scratch = projectionScratch;
            //visible[] is what the 3D hover scan reads, so clearing it for filtered cells
            //is also what keeps hover off points that are not drawn
            const mask = this.visibleMask && this.visibleMask.length === count ? this.visibleMask : null;
            for (let i = 0; i < count; i++) {
                if (mask && !mask[i]) {
                    projected.visible[i] = 0;
                    continue;
                }
                if (projectToCanvas(matrix, X[i], Y[i], Z ? Z[i] : 0,
                    canvasWidth, canvasHeight, scratch) && scratch.visible) {
                    projected.x[i] = scratch.x;
                    projected.y[i] = scratch.y;
                    projected.visible[i] = 1;
                } else {
                    projected.visible[i] = 0;
                }
            }
            return projected;
        },

        updateProjectedGeometry() {
            if (this.is3dMode) {
                this.projectedPoints = this.projectPoints();
            } else {
                this.projectedPoints = null;
            }
            this.projectedLabels = this.clusterCenters
                .map(cluster => {
                    const projection = this.projectWorldPoint(cluster.position);
                    return projection && projection.visible ? { ...cluster, projection } : null;
                })
                .filter(Boolean);
        },

        requestRender(forceProjection = false) {
            if (forceProjection) {
                this.renderProjectionDirty = true;
            }
            if (this.renderQueued) return;

            this.renderQueued = true;
            this.rafId = requestAnimationFrame(() => {
                this.renderQueued = false;
                this.rafId = null;
                this.renderUMAP();
                if (this.syncPending) {
                    this.syncPending = false;
                    this.updateViewTransform();
                }
            });
        },

        scheduleSync() {
            this.syncPending = true;
        },

        renderUMAP() {
            if (!this.gl || !this.program) return;

            this.projection.aspect = this.$refs.umapCanvas.width / Math.max(this.$refs.umapCanvas.height, 1);
            this.updateCameraState();

            if (this.renderProjectionDirty || !this.interactionMode || !this.is3dMode) {
                this.updateProjectedGeometry();
                this.renderProjectionDirty = false;
            }

            this.renderPoints();
            this.drawLabels();
            this.drawAxisIndicator();
        },

        drawAxisIndicator() {
            const canvas = this.$refs.axisIndicatorCanvas;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const pixelRatio = window.devicePixelRatio || 1;
            const center = canvas.width / 2;
            const axisLength = canvas.width * 0.24;
            const labelOffset = canvas.width * 0.09;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!this.is3dMode) return;

            const axes = [
                { label: 'X', vector: [1, 0, 0], color: '#d64545' },
                { label: 'Y', vector: [0, 1, 0], color: '#2e9b46' },
                { label: 'Z', vector: [0, 0, 1], color: '#2f6fe4' },
            ].map(axis => {
                const screenX = dotVec3(axis.vector, this.cameraVectors.right);
                const screenY = dotVec3(axis.vector, this.cameraVectors.up);
                const depth = dotVec3(axis.vector, this.cameraVectors.forward);
                return { ...axis, screenX, screenY, depth };
            }).sort((a, b) => a.depth - b.depth);

            ctx.font = `${11 * pixelRatio}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            axes.forEach(axis => {
                const endX = center + (axis.screenX * axisLength);
                const endY = center - (axis.screenY * axisLength);
                const textX = center + (axis.screenX * (axisLength + labelOffset));
                const textY = center - (axis.screenY * (axisLength + labelOffset));

                ctx.strokeStyle = axis.color;
                ctx.lineWidth = 2.5 * pixelRatio;
                ctx.beginPath();
                ctx.moveTo(center, center);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                ctx.fillStyle = axis.color;
                ctx.beginPath();
                ctx.arc(endX, endY, 3 * pixelRatio, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillText(axis.label, textX, textY);
            });
        },

        //positionComponents defaults to 3: only the points buffer drops Z, and only in 2D
        bindAttributes(bufferSet, positionComponents = 3) {
            const gl = this.gl;

            gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.position);
            gl.enableVertexAttribArray(this.locations.position);
            gl.vertexAttribPointer(this.locations.position, positionComponents, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.color);
            gl.enableVertexAttribArray(this.locations.color);
            gl.vertexAttribPointer(this.locations.color, 4, gl.UNSIGNED_BYTE, true, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.highlight);
            gl.enableVertexAttribArray(this.locations.highlight);
            gl.vertexAttribPointer(this.locations.highlight, 1, gl.UNSIGNED_BYTE, true, 0, 0);

            //only the points set is ever filtered. the axes and the hover marker have no
            //visible buffer, so their attribute falls back to a constant 1 - a disabled
            //attribute array reads the value set by vertexAttrib1f
            if (bufferSet.visible) {
                gl.bindBuffer(gl.ARRAY_BUFFER, bufferSet.visible);
                gl.enableVertexAttribArray(this.locations.visible);
                gl.vertexAttribPointer(this.locations.visible, 1, gl.UNSIGNED_BYTE, true, 0, 0);
            } else {
                gl.disableVertexAttribArray(this.locations.visible);
                gl.vertexAttrib1f(this.locations.visible, 1);
            }
        },

        renderPoints() {
            const gl = this.gl;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clearColor(1, 1, 1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.useProgram(this.program);

            gl.uniformMatrix4fv(this.locations.matrix, false, this.renderMatrix);

            const baseSize = this.is3dMode
                ? clamp(Math.max(1.25, 4.5 - Math.log10(Math.max(this.camera.distance / this.pointBounds.radius, 1))), 1.25, 5)
                : clamp(2.2 / (this.camera.distance / this.resetCamera.distance), 1.15, 3.0);
            const hasHighlightFilter = !!this.highlightLabel || this.highlightLabels.length > 0;

            if (this.is3dMode) {
                gl.enable(gl.DEPTH_TEST);
            } else {
                gl.disable(gl.DEPTH_TEST);
            }

            if (this.is3dMode) {
                this.bindAttributes(this.buffers.axes);
                gl.uniform1f(this.locations.renderPoints, 0);
                gl.uniform1f(this.locations.pointSize, 1);
                gl.uniform1f(this.locations.hoverScale, 1);
                gl.uniform1f(this.locations.minPointScale, 1);
                gl.uniform1f(this.locations.maxPointScale, 1);
                gl.uniform1f(this.locations.highlightMode, 0);
                gl.drawArrays(gl.LINES, 0, this.axisVertexCount);
            }

            this.bindAttributes(this.buffers.points, this.pointPositionComponents);
            gl.uniform1f(this.locations.renderPoints, 1);
            gl.uniform1f(this.locations.pointSize, baseSize * (window.devicePixelRatio || 1));
            gl.uniform1f(this.locations.hoverScale, 1);
            if (!hasHighlightFilter) {
                gl.uniform1f(this.locations.minPointScale, 1);
                gl.uniform1f(this.locations.maxPointScale, 1);
                gl.uniform1f(this.locations.highlightMode, 0);
                gl.drawArrays(gl.POINTS, 0, this.vertexCount);
            } else {
                gl.uniform1f(this.locations.minPointScale, this.is3dMode ? 0.3 : 0.2);
                gl.uniform1f(this.locations.maxPointScale, this.is3dMode ? 1.6 : 2.0);
                gl.uniform1f(this.locations.highlightMode, 2);
                gl.drawArrays(gl.POINTS, 0, this.vertexCount);
                gl.uniform1f(this.locations.highlightMode, 1);
                gl.drawArrays(gl.POINTS, 0, this.vertexCount);
            }

            if (this.hoverVertexCount > 0) {
                this.bindAttributes(this.buffers.hover);
                gl.uniform1f(this.locations.renderPoints, 1);
                gl.uniform1f(this.locations.pointSize, baseSize * 1.75 * (window.devicePixelRatio || 1));
                gl.uniform1f(this.locations.hoverScale, 1);
                gl.uniform1f(this.locations.minPointScale, 1);
                gl.uniform1f(this.locations.maxPointScale, 1);
                gl.uniform1f(this.locations.highlightMode, 0);
                gl.drawArrays(gl.POINTS, 0, this.hoverVertexCount);
            }
        },

        drawLabels() {
            const labelCanvas = this.$refs.umapLabelCanvas;
            const ctx = labelCanvas.getContext('2d');
            ctx.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
            if (!this.showLabels) return;
            if (this.is3dMode && this.interactionMode) return;

            if (this.previewLabels) {
                if (!this.previewLabels.enabled) return;
                const ratio = window.devicePixelRatio || 1;
                const size = this.previewLabels.font_size;
                ctx.save();
                ctx.scale(ratio, ratio);
                ctx.font = `600 ${size}px Arial`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                const clusters = this.projectedLabels.map(cluster => ({ ...cluster, projection: { x: cluster.projection.x / ratio, y: cluster.projection.y / ratio } }));
                const labels = layoutPreviewLabels(clusters, labelCanvas.width / ratio, labelCanvas.height / ratio, value => ctx.measureText(value).width, this.previewLabels);
                ctx.lineWidth = 0.6; ctx.strokeStyle = '#64748b';
                labels.forEach(label => {
                    if (Math.hypot(label.x - label.projection.x, label.y - label.projection.y) > 12) {
                        ctx.beginPath(); ctx.moveTo(label.projection.x, label.projection.y); ctx.lineTo(label.x, label.y); ctx.stroke();
                    }
                });
                ctx.strokeStyle = 'white'; ctx.lineWidth = 2.5; ctx.fillStyle = '#182d35';
                labels.forEach(label => label.lines.forEach((line, index) => {
                    const y = label.y + (index - (label.lines.length - 1) / 2) * label.lineHeight;
                    ctx.strokeText(line, label.x, y); ctx.fillText(line, label.x, y);
                }));
                ctx.restore();
                return;
            }
            ctx.font = `${14 * (window.devicePixelRatio || 1)}px Arial`;
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.strokeStyle = "white";
            ctx.lineWidth = 5;

            this.projectedLabels.forEach(cluster => {
                ctx.strokeText(cluster.label, cluster.projection.x, cluster.projection.y);
                ctx.fillText(cluster.label, cluster.projection.x, cluster.projection.y);
            });
        },

        panCamera(dx, dy) {
            const canvas = this.$refs.umapCanvas;
            let scale;
            let xScale;

            if (this.is3dMode) {
                const worldUnitsPerPixel = (2 * this.camera.distance * Math.tan(this.projection.fov / 2)) / Math.max(canvas.height, 1);
                scale = worldUnitsPerPixel * PAN_SENSITIVITY_3D;
                xScale = scale;
            } else {
                scale = (this.camera.distance / this.resetCamera.distance) * (this.pointBounds.radius * 0.0045);
                xScale = scale * (canvas.width / Math.max(canvas.height, 1));
            }

            const move = addVec3(
                scaleVec3(this.cameraVectors.right, -dx * xScale),
                scaleVec3(this.cameraVectors.up, dy * scale)
            );
            this.camera.target = addVec3(this.camera.target, move);
        },

        rotateCamera(dx, dy) {
            if (!this.is3dMode) return;
            this.camera.yaw -= dx * 0.01;
            this.camera.pitch = clamp(this.camera.pitch + dy * 0.01, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
        },

        onWheel(e) {
            const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
            if (this.is3dMode) {
                this.camera.distance = clamp(
                    this.camera.distance * zoomFactor,
                    this.pointBounds.radius * 0.2,
                    this.pointBounds.radius * 30
                );
            } else {
                this.camera.distance = clamp(
                    this.camera.distance * zoomFactor,
                    this.resetCamera.distance * MIN_ZOOM_RATIO_2D,
                    this.resetCamera.distance * MAX_ZOOM_RATIO_2D
                );
            }
            this.scheduleSync();
            this.requestRender(true);
        },

        onMouseDown(e) {
            this.interactionMode = (!this.is3dMode || e.button === 2 || e.shiftKey) ? 'pan' : 'rotate';
            this.lastMouse.x = e.clientX;
            this.lastMouse.y = e.clientY;
        },

        onMouseMove(e) {
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;

            if (this.interactionMode) {
                if (this.interactionMode === 'rotate') {
                    this.rotateCamera(dx, dy);
                } else {
                    this.panCamera(dx, dy);
                }

                this.lastMouse.x = e.clientX;
                this.lastMouse.y = e.clientY;
                mouseTooltip.hide();
                this.scheduleSync();
                this.requestRender(false);
                return;
            }

            this.lastMouse.x = e.clientX;
            this.lastMouse.y = e.clientY;

            if (this.isHovering && this.showTooltips) {
                this.handleHover(e);
            }
        },

        handleHover(e) {
            const rect = this.$refs.umapCanvas.getBoundingClientRect();
            const pixelRatio = this.$refs.umapCanvas.width / Math.max(rect.width, 1);
            const mouseX = (e.clientX - rect.left) * pixelRatio;
            const mouseY = (e.clientY - rect.top) * pixelRatio;

            if (!this.is3dMode) {
                const nearestIdx = this.find2DHoverIndex(mouseX, mouseY);
                this.updateHoveredPoint(nearestIdx);
                if (nearestIdx === -1) {
                    mouseTooltip.hide();
                    return;
                }
                this.showHoverTooltip(nearestIdx);
                return;
            }

            let nearestIdx = -1;
            let nearestDist = Infinity;
            const maxDist = 12 * (window.devicePixelRatio || 1);

            //visible[i] === 0 covers both cases the old code skipped: a point that failed to
            //project at all, and one that projected outside the view
            const projected = this.projectedPoints;
            if (projected) {
                const { count, x: projectedX, y: projectedY, visible } = projected;
                for (let i = 0; i < count; i++) {
                    if (!visible[i]) continue;

                    const dx = projectedX[i] - mouseX;
                    const dy = projectedY[i] - mouseY;
                    const dist = Math.hypot(dx, dy);

                    if (dist < maxDist && dist < nearestDist) {
                        nearestDist = dist;
                        nearestIdx = i;
                    }
                }
            }

            this.updateHoveredPoint(nearestIdx);
            if (nearestIdx === -1) {
                mouseTooltip.hide();
                return;
            }
            this.showHoverTooltip(nearestIdx);
        },

        find2DHoverIndex(mouseX, mouseY) {
            if (!this.orthoBounds) return -1;

            const canvas = this.$refs.umapCanvas;
            const dataX = this.orthoBounds.left + (mouseX / canvas.width) * (this.orthoBounds.right - this.orthoBounds.left);
            const dataY = this.orthoBounds.top - (mouseY / canvas.height) * (this.orthoBounds.top - this.orthoBounds.bottom);
            const radius = Math.max(
                ((this.orthoBounds.right - this.orthoBounds.left) / canvas.width) * 8,
                ((this.orthoBounds.top - this.orthoBounds.bottom) / canvas.height) * 8
            );

            //the grid is built over every cell and stays valid across filter changes; the
            //mask is applied to the candidates it returns instead
            return sharedUmapData.findNearest(this.group, dataX, dataY, radius, this.visibleMask);
        },

        updateHoveredPoint(nextIndex) {
            if (this.hoveredPointIndex === nextIndex) return;
            this.hoveredPointIndex = nextIndex;
            this.updateHoverBuffer();
            this.requestRender(false);
        },

        showHoverTooltip(index) {
            let hoverHTML = '<div style="display:grid; grid-template-columns: max-content 1fr; grid-column-gap: 5px; font-size: 12px;">';
            if (this.expression) hoverHTML += `<div style="font-weight:bold">Expression</div><div>${this.expression[index]}</div>`;

            Object.keys(this.labels.metadata_labels).forEach(field => {
                if (!this.isHoverField(field)) return;
                //a field dropped as a duplicate of NAME keeps its key but loses its index
                //array - its row was the Cell ID row above, repeated
                const indices = this.labels.metadata[field];
                if (!indices) return;
                const value = this.labels.metadata_labels[field][indices[index]];
                if (value && value !== "") {
                    hoverHTML += `<div style="font-weight:bold;">${field}</div><div>${value}</div>`;
                }
            });

            hoverHTML += '</div>';
            mouseTooltip.show(hoverHTML);
        },

        isHoverField(field) {
            if (!this.hoverFields || this.hoverFields.length === 0) return true;
            return this.hoverFields.includes(field);
        },

        onMouseOver() {
            this.isHovering = true;
        },

        onMouseOut() {
            this.isHovering = false;
            this.updateHoveredPoint(-1);
            mouseTooltip.hide();
        },

        onMouseUp() {
            this.interactionMode = null;
            this.requestRender(true);
        },

        onMouseLeave() {
            this.interactionMode = null;
            this.isHovering = false;
            this.updateHoveredPoint(-1);
            mouseTooltip.hide();
            this.requestRender(true);
        },

        onClick() {},

        resetPanZoom() {
            this.camera = {
                target: [...this.resetCamera.target],
                distance: this.resetCamera.distance,
                yaw: this.resetCamera.yaw,
                pitch: this.resetCamera.pitch,
            };
            this.scheduleSync();
            this.requestRender(true);
        },

        updateViewTransform() {
            EventBus.$emit('view-transform-change', {
                id: this.group,
                viewMode: this.is3dMode ? '3d' : '2d',
                camera: {
                    target: [...this.camera.target],
                    distance: this.camera.distance,
                    yaw: this.camera.yaw,
                    pitch: this.camera.pitch,
                }
            });
        },

        handleUpdateViewTransform(newViewTransform) {
            if (newViewTransform.id !== this.group || newViewTransform.viewMode !== (this.is3dMode ? '3d' : '2d') || !newViewTransform.camera) {
                return;
            }

            this.camera = {
                target: [...newViewTransform.camera.target],
                distance: newViewTransform.camera.distance,
                yaw: newViewTransform.camera.yaw,
                pitch: newViewTransform.camera.pitch,
            };
            this.requestRender(true);
        },

        createShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        },

        createProgram(gl, vertexShader, fragmentShader) {
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error('Program linking failed:', gl.getProgramInfoLog(program));
                gl.deleteProgram(program);
                return null;
            }
            return program;
        },

        download() {
            /*
                without preserveDrawingBuffer the gl drawing buffer is undefined once the
                browser has composited, so the export has to draw and read in one task -
                render synchronously here, then drawImage below with nothing in between.
                a rAF render may still be queued; an extra redraw after this is harmless.
            */
            this.renderUMAP();

            const canvas1 = this.$refs.umapCanvas;
            const canvas2 = this.$refs.umapLabelCanvas;
            const scaleFactor = 2;

            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = canvas1.width * scaleFactor;
            combinedCanvas.height = canvas1.height * scaleFactor;
            const ctx = combinedCanvas.getContext('2d');

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(canvas1, 0, 0, combinedCanvas.width, combinedCanvas.height);
            ctx.drawImage(canvas2, 0, 0, combinedCanvas.width, combinedCanvas.height);

            const link = document.createElement('a');
            link.download = `${this.downloadFilename}.png`;
            link.href = combinedCanvas.toDataURL('image/png');
            link.click();
        },
    },
});
</script>

<style scoped>
.umap-container {
    position: relative;
    border: 1px solid #ccc;
    user-select: none;
}

.umap-canvas {
    display: block;
    width: 100%;
    height: 100%;
}

.umap-label-canvas {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    width: 100%;
    height: 100%;
}

.umap-axis-indicator {
    position: absolute;
    right: 5px;
    bottom: 5px;
    pointer-events: none;
}

button {
    border: 1px solid rgba(0, 0, 0, .25);
    background: white;
    color: #4e4e4e;
    padding: 1px 3px;
    font-size: 14px !important;
}

button:hover {
    border: 1px solid rgba(0, 0, 0, .5);
}

.legends {
    gap: 20px;
}
.legend {
    margin: 0 10px 0 0;
    gap:1px;
}
.legend .label {
    font-size: 11px !important;
    line-height: 11px;
}
.legend .gradient {
    height: 15px;
    width: 100px;
    border-radius: 20px;
}
.legend .marks {
    justify-content: space-between;
    font-size: 11px;
    line-height: 11px;
}
</style>
