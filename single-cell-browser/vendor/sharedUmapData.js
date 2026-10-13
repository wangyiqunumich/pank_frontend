/*
    umap data cache, shared by the umap panels that render the same embedding.

    points is the typed array bundle from scUtils.parseCoordinates:
        { count, X: Float32Array, Y: Float32Array, Z: Float32Array|null }

    it used to also keep an interleaved positions copy, a Map from point object to
    index, and a d3 quadtree - together ~114 bytes per cell in chrome, against 8 for
    the coordinates themselves. positions and the Map are gone entirely (the buffers
    read X/Y/Z directly, and the index *is* the identity), and the quadtree is
    replaced by the uniform grid below, which is built lazily on the first hover and
    costs ~5 bytes per cell.
*/

//target cells per grid bucket. a hover query scans the buckets overlapping its
//search radius, so this trades bucket count (memory) against points scanned.
const POINTS_PER_BUCKET = 4;
const MAX_BUCKETS_PER_AXIS = 2048;

function buildHoverGrid(points) {
    const { count, X, Y } = points;
    if (!count) return null;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < count; i++) {
        const x = X[i];
        const y = Y[i];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

    const axis = Math.max(1, Math.min(MAX_BUCKETS_PER_AXIS,
        Math.round(Math.sqrt(count / POINTS_PER_BUCKET))));
    const spanX = Math.max(maxX - minX, 1e-9);
    const spanY = Math.max(maxY - minY, 1e-9);
    //scale maps a coordinate to a bucket column/row; the tiny shrink keeps the
    //maximum coordinate inside the last bucket instead of one past it.
    const scaleX = (axis * (1 - 1e-9)) / spanX;
    const scaleY = (axis * (1 - 1e-9)) / spanY;

    //CSR layout: starts[b]..starts[b+1] is the slice of order holding bucket b
    const starts = new Uint32Array(axis * axis + 1);
    const bucketOf = i => {
        const col = (X[i] - minX) * scaleX | 0;
        const row = (Y[i] - minY) * scaleY | 0;
        return row * axis + col;
    };

    for (let i = 0; i < count; i++) {
        const b = bucketOf(i);
        if (b >= 0 && b < starts.length - 1) starts[b + 1]++;
    }
    for (let b = 0; b < axis * axis; b++) {
        starts[b + 1] += starts[b];
    }

    const cursor = starts.slice(0, axis * axis);
    const order = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
        const b = bucketOf(i);
        if (b >= 0 && b < cursor.length) order[cursor[b]++] = i;
    }

    return { axis, minX, minY, scaleX, scaleY, starts, order };
}

/*
    the order points are written into the vertex buffers is the order they are painted,
    and in 2D the depth test is off, so later points cover earlier ones.

    this used to be ascending expression, which put every expressing cell on top of
    every non-expressing one: a region where 2% of cells express a gene rendered as
    broadly positive, because the 2% were all drawn last. drawing in file order is not
    a fix either - these files are written one sample at a time (measured: 100% of
    adjacent cells share a sample, against 0.7% under a random permutation), so it
    would paint the last donor over all the others.

    a fixed shuffle makes the chance that a pixel shows an expressing cell equal to the
    real local fraction of expressing cells. seeded rather than Math.random so both
    panels draw the same order, it does not change as genes are selected, and exported
    images are reproducible.
*/
function buildDrawOrder(count) {
    const order = new Uint32Array(count);
    for (let i = 0; i < count; i++) order[i] = i;

    //mulberry32
    let seed = 0x9e3779b9;
    const random = () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    for (let i = count - 1; i > 0; i--) {
        const j = (random() * (i + 1)) | 0;
        const swap = order[i];
        order[i] = order[j];
        order[j] = swap;
    }
    return order;
}

class SharedUmapData {
    constructor() {
        this.groups = new Map();
    }

    initPoints(group, points) {
        if(!this.groups.has(group)){
            this.groups.set(group, {
                numPoints: points.count,
                points,
                hoverGrid: null,
                drawOrder: null,
                instances: 1
            })
        }else{
            this.groups.get(group).instances++;
        }
    }

    getPoints(group) {
        const data = this.groups.get(group);
        return data ? data.points : null;
    }

    //shared by both panels, so it is built once and they paint identically
    getDrawOrder(group) {
        const data = this.groups.get(group);
        if (!data) return null;
        if (!data.drawOrder) data.drawOrder = buildDrawOrder(data.numPoints);
        return data.drawOrder;
    }

    getNumPoints(group) {
        const data = this.groups.get(group);
        return data ? data.numPoints : null;
    }

    /*
        nearest point to (x, y) within radius, or -1. replaces quadtree.find plus the
        point-object-to-index Map lookup that followed it.

        mask is the optional cell filter: candidates whose byte is 0 are skipped, so hover
        never lands on a cell the filter is hiding. it is applied to candidates rather than
        used to build the grid, so the grid stays dataset-global and a filter change costs
        nothing here.
    */
    findNearest(group, x, y, radius, mask = null) {
        const data = this.groups.get(group);
        if (!data) return -1;
        if (!data.hoverGrid) {
            data.hoverGrid = buildHoverGrid(data.points);
            if (!data.hoverGrid) return -1;
        }

        const { axis, minX, minY, scaleX, scaleY, starts, order } = data.hoverGrid;
        const { X, Y } = data.points;

        const colMin = Math.max(0, ((x - radius - minX) * scaleX | 0));
        const colMax = Math.min(axis - 1, ((x + radius - minX) * scaleX | 0));
        const rowMin = Math.max(0, ((y - radius - minY) * scaleY | 0));
        const rowMax = Math.min(axis - 1, ((y + radius - minY) * scaleY | 0));
        if (colMin > colMax || rowMin > rowMax) return -1;

        let best = -1;
        let bestDist = radius * radius;
        for (let row = rowMin; row <= rowMax; row++) {
            const rowOffset = row * axis;
            for (let col = colMin; col <= colMax; col++) {
                const bucket = rowOffset + col;
                const end = starts[bucket + 1];
                for (let s = starts[bucket]; s < end; s++) {
                    const i = order[s];
                    if (mask && !mask[i]) continue;
                    const dx = X[i] - x;
                    const dy = Y[i] - y;
                    const dist = dx * dx + dy * dy;
                    if (dist < bestDist) {
                        bestDist = dist;
                        best = i;
                    }
                }
            }
        }

        return best;
    }

    //debug only, for memoryReport.js - these are typed arrays, so they do not appear in
    //DevTools' JS heap line
    getMemoryUsage() {
        const usage = [];
        this.groups.forEach((data, group) => {
            const grid = data.hoverGrid;
            usage.push({
                group,
                instances: data.instances,
                hoverGrid: grid ? grid.starts.byteLength + grid.order.byteLength : 0,
                drawOrder: data.drawOrder ? data.drawOrder.byteLength : 0,
            });
        });
        return usage;
    }

    release(group){
        if(!this.groups.has(group)) return;
        const data = this.groups.get(group);
        data.instances--;
        if(data.instances <= 0){
            this.groups.delete(group);
        }
    }
}

const sharedUmapData = new SharedUmapData();
export default sharedUmapData;
