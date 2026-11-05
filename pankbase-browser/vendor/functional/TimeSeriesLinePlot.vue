<template>
    <div class="line-plot">
        <div class="controls plot-controls">
          <label>Normalization <select v-model="showContent"><option :value="false">IEQ</option><option :value="true">Content</option></select></label>

        </div>
        <div :id="plotId" class="plot" ref="time-series-line">
            <p>Loading...</p>
        </div>
        <details class="plot-settings"><summary>Confidence display</summary><div class="controls">          <label>Display <select v-model="showConfidence"><option value="some">Filtered 95% CI ({{donors.length}})</option><option value="all">All donors 95% CI</option><option value="none">Individual donors ({{donors.length}})</option></select></label></div></details><div class="plot-actions"><span>Hover to inspect a donor</span><button @click="downloadImage(plotId, `${plotId}_${showContent ? 'content' : 'ieq'}_time_series`, 'svg')">Download SVG</button></div>
    </div>
</template>
<script>
import Vue from "vue";
import DOMPurify from "dompurify";
import * as d3 from "d3v5";
import uiUtils from "../../download.js";

const SAFE_BLUE = "#2F67B1"; // colorblind safe blue from UCSB
const SAFE_RED = "#BF2C23"; // colorblind safe red from UCSB,

export default Vue.component("time-series-line-plot", {
    components: {},
    props: [
        "plotData",
        "initialContent",
        "metadata",
        "donors",
        "plotId",
        "timepoints",
        "yAxisLabels",
        "isletTab"
    ],
    data() {
        return {
            chart: null,
            chartHeight: 300,
            innerHeight: null,
            svg: null,
            xScale: null,
            yScale: null,
            xMedian: 0,
            tooltip: null,
            dotKey: "donor",
            xField: "time",
            yField: "score",
            xAxisLabel: "Time (min)",
            highlightedDonor: null,
            showConfidence: "some",
            showContent: Boolean(this.initialContent)
        };
    },
    mounted() {
        this.chart = document.getElementById(this.plotId);
        window.addEventListener("resize", this.drawChart);
        this.sizeObserver = new ResizeObserver(() => this.drawChart());
        this.sizeObserver.observe(this.chart);
        this.drawChart();
    },
    beforeDestroy() { this.sizeObserver?.disconnect(); window.removeEventListener("resize", this.drawChart); },
    computed: {
        chartData() {
            return this.computeChartData(this.plotData, true);
        },
        allDonorData() {
            return this.computeChartData(this.plotData, false);
        },
        allConfidence() {
            return this.confidenceIntervals(this.plotData);
        },
        maxTime() {
            let times = this.plotData
                .map((d) => d.time)
                .filter((t) => !isNaN(t));
            let max = Number(times[0]);
            times.forEach((t) => (max = Number(t) > max ? Number(t) : max));
            return max;
        },
        maxScore() {
            let scores = this.plotData
                .map((d) => d.score)
                .filter((t) => !isNaN(t));
            let max = Number(scores[0]);
            scores.forEach((t) => (max = Number(t) > max ? Number(t) : max));
            return max;
        },
        filteredConfidence() {
            let data = this.plotData.filter((d) =>
                this.donors.includes(d.donor)
            );
            return this.confidenceIntervals(data);
        },
        allHoverFields() {
            return [this.dotKey, this.xField, this.yField];
        },
        donorMetadata() {
            if (this.highlightedDonor === null) {
                return null;
            }
            return (this.metadata || []).find(
                (d) => d.Accession === this.highlightedDonor
            ) || null;
        },
        tooltipDonorData(){
            if (this.donorMetadata === null){
                return "";
            }
            let htmlOutput = `<strong>${this.donorMetadata.Accession}</strong>`;
            let categories = [
                {
                    key: "Age (years)",
                    label: "Age"
                },
                {
                    key: "Gender",
                    label: "Reported gender"
                },
                {
                    key:  "BMI",
                    label: "BMI"
                },
                {
                    key: "Derived diabetes status",
                    label: "Derived diabetes status"
                }
            ];
            categories.forEach(c => {
                let dataPoint = this.donorMetadata[c.key];
                let categoryDiv =
                    `<div><strong>${c.label}</strong>: ${dataPoint}</div>`;
                htmlOutput = htmlOutput.concat(categoryDiv);
            });
            return htmlOutput;
        },
        yAxisLabel(){
            return this.showContent ? this.yAxisLabels.content : this.yAxisLabels.ieq;
        }
    },
    methods: {
        copyResults(){
            window.navigator.clipboard.writeText(window.location);
            console.log(window.location);
        },
        extractTimepoints(data, xScale, yScale) {
            // This assumes all timepoints have a condition listed i.e. none are skipped.

            let points = data
                .sort((a, b) => a.time - b.time)
                .filter((t) => !!t.Condition);
            let output = [];
            let conditionStart = 0;
            let textBuffer = 3;
            for (let i = 1; i < points.length; i++) {
                let currentEntry = points[i];
                let conditionStartEntry = points[conditionStart];
                if (
                    currentEntry.Condition !== conditionStartEntry.Condition ||
                    i === points.length - 1
                ) {
                    let duration = currentEntry.time - conditionStartEntry.time;
                    let middleTime = conditionStartEntry.time + 0.5 * duration;
                    let conditionInfo = {};
                    conditionInfo.condition = conditionStartEntry.Condition;
                    conditionInfo.x = xScale(conditionStartEntry.time);
                    conditionInfo.y = yScale(this.maxScore);
                    conditionInfo.width = xScale(duration);
                    conditionInfo.height = yScale(0);
                    conditionInfo.textPosition = xScale(middleTime);
                    output.push(conditionInfo);
                    conditionStart = i;
                } else {
                    continue;
                }
            }
            return output;
        },
        computeChartData(inputData, filterDonors) {
            let data = structuredClone(inputData);
            let output = [];
            let donors = filterDonors
                ? this.donors
                : Array.from(new Set(inputData.map((i) => i.donor)));
            donors.forEach((d) => {
                let donorData = data.filter((e) => e.donor === d);
                if (donorData.length > 0) {
                    output.push(donorData);
                }
            });
            return output;
        },
        confidenceIntervals(rawData) {
            let z = 1.96;
            let times = Array.from(
                new Set(
                    rawData
                        .filter((r) => r.time !== undefined)
                        .map((r) => r.time)
                )
            );
            let output = [];
            times.forEach((t, index) => {
                // Compute standard deviation
                let allData = rawData.filter((r) => r.time === t);
                // TODO figure out how to convey that the data filtering is done on the timepoint level
                //allData = rawData.filter(r => !r.donorHasGaps);
                allData = allData.filter((r) => r.score !== "-");
                allData = allData.map((r) => r.score);
                let n = allData.length;
                let sum = allData.reduce((total, entry) => total + entry, 0);
                let x = sum / n;
                let sqDiff = allData.map((r) => (r - x) ** 2);
                let sumDiff = sqDiff.reduce((total, entry) => total + entry, 0);
                let sigma = Math.sqrt(sumDiff / n);

                let confidenceInterval = (z * sigma) / Math.sqrt(n);
                let timeEntry = {
                    time: t,
                    mean: x,
                    ciUpper: x + confidenceInterval,
                    ciLower: x - confidenceInterval,
                };
                output.push(timeEntry);
            });
            return output;
        },
        getYAxisSpacing(yScale, minimumLeftMargin) {
            const tickLabelFormatter = d3.format(",~g");
            const tickValues = yScale.ticks();
            const maxTickLabelLength =
                d3.max(
                    tickValues,
                    (value) => tickLabelFormatter(value).length
                ) || 0;
            const tickLabelWidth = maxTickLabelLength * 8;
            const labelLines = `${this.yAxisLabel || this.yField}`.split("\n");
            const lineHeight = 14;
            const labelBlockWidth = labelLines.length * lineHeight;
            const labelOffset = tickLabelWidth + 16 + labelBlockWidth;

            return {
                labelLines,
                lineHeight,
                labelOffset,
                leftMargin: Math.max(minimumLeftMargin, labelOffset + 20),
            };
        },
        drawChart() {
            let margin = {
                top: 80,
                right: 10,
                bottom: 40,
                left: 55,
            };
            let elementWidth = this.chart.clientWidth;

            this.chartHeight = Math.max(220, Math.min(420, window.innerHeight - 205));
            let height = this.chartHeight - margin.top - margin.bottom;
            this.innerHeight = height;

            // Create scales
            this.xMedian = this.maxTime / 2;
            let xPadding = 1.01;
            let yPadding = 1.05;
            this.yScale = d3
                .scaleLinear()
                .domain([0, this.maxScore * yPadding]) // wider margin because y-axis is shorter visually
                .range([height, 0]);
            const { leftMargin, labelOffset, labelLines, lineHeight } =
                this.getYAxisSpacing(this.yScale, margin.left);
            margin.left = leftMargin;
            let width = Math.max(
                120,
                elementWidth - margin.left - margin.right
            );
            this.xScale = d3
                .scaleLinear()
                .domain([0, this.maxTime * xPadding])
                .range([0, width]);

            this.chart.innerHTML = "";
            this.svg = d3
                .select(`#${this.plotId}`)
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("id", `chart_${this.plotId}`)
                .on("mouseleave", () => this.resetTooltip())
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);
            let timepointBars = this.extractTimepoints(
                this.timepoints,
                this.xScale,
                this.yScale
            );

            let palegold = "#FEFFE1";
            timepointBars.forEach((t) => {
                let basal = this.isBasal(t.condition);
                this.svg
                    .append("rect")
                    .attr("x", t.x)
                    .attr("y", t.y)
                    .attr("width", t.width)
                    .attr("height", !basal ? t.height : 0.05 * t.height)
                    .attr("fill", basal ? "lightgray" : palegold)
                    .attr("stroke", "lightgray")
                    .attr("stroke-width", 1);
            });
            // Separate loop to put text on top of bg

            let basalCondition = /\((.*)\)/;
            timepointBars.forEach((t, index) => {
                this.svg
                    .append("text")
                    .attr("text-anchor", "start")
                    .attr("y", 0)
                    .attr("x", 0)
                    .attr("font-size", "smaller")
                    .attr(
                        "transform",
                        `translate(${t.textPosition},0) rotate(-45)`
                    )
                    .text(
                        this.isBasal(t.condition)
                            ? t.condition.match(basalCondition)[1]
                            : t.condition
                    );
            });
            //Labels
            this.svg
                .append("text")
                .attr("text-anchor", "middle")
                .attr("y", height + 32)
                .attr("x", width / 2)
                .text(this.xAxisLabel || this.xField);
            const yAxisLabel = this.svg
                .append("text")
                .attr("text-anchor", "middle")
                .attr("transform", "rotate(-90)");

            labelLines.forEach((line, i) => {
                yAxisLabel
                    .append("tspan")
                    .attr("x", -height / 2)
                    .attr("y", -(labelOffset - i * lineHeight))
                    .text(line);
            });

            // Access the tooltip as an HTML element
            this.drawLines();
            this.drawAxes();
        },
        drawAxes() {
            // add X-axis
            let xAxis = this.svg
                .append("g")
                .attr("transform", `translate(0,${this.innerHeight})`)
                .attr("stroke-width", 1)
                .call(d3.axisBottom(this.xScale))
                .selectAll("text")
                .style("font-size", "13px");
            // add Y-axis
            this.svg
                .append("g")
                .call(d3.axisLeft(this.yScale).ticks(Math.max(3, Math.floor(this.innerHeight / 28))))
                .selectAll("text")
                .style("font-size", "13px");
        },
        isBasal(condition) {
            if (condition === undefined) {
                return false;
            }
            return (
                condition.startsWith("basal") || condition.startsWith("Basal")
            );
        },
        drawLines() {
            this.svg.selectAll("path.line-path").remove();
            const lineGenerator = d3
                .line()
                .x((d) => this.xScale(d[this.xField]))
                .y((d) => this.yScale(d[this.yField]))
                .defined(
                    (d) =>
                        d[this.xField] !== undefined &&
                        d[this.yField] !== undefined
                );
            let linesOnly = this.showConfidence === "none";
            let linesData =
                this.showConfidence === "all"
                    ? this.allDonorData
                    : this.chartData;
            linesData.forEach((c) => {
                this.svg
                    .append("path")
                    .datum(c)
                    .attr("class", "line-path")
                    .attr("fill", "none")
                    .attr(
                        "stroke",
                        this.highlightedDonor === null && linesOnly
                            ? SAFE_BLUE
                            : "lightgray"
                    )
                    .attr("stroke-width", 1)
                    .attr("d", lineGenerator)
                    .on("mouseover", (c) => this.showTooltip(c));
            });
            this.drawIntervals();
        },
        drawHighlightedDonor(c) {
            this.svg.selectAll("path.highlighted-donor-line").remove();
            if (c === null) {
                return;
            }
            const lineGenerator = d3
                .line()
                .x((d) => this.xScale(d[this.xField]))
                .y((d) => this.yScale(d[this.yField]))
                .defined(
                    (d) =>
                        d[this.xField] !== undefined &&
                        d[this.yField] !== undefined
                );
            this.svg
                .append("path")
                .datum(c)
                .attr("class", "line-path highlighted-donor-line")
                .attr("fill", "none")
                .attr("stroke", SAFE_BLUE) // What color for this?
                .attr("stroke-width", 2)
                .attr("d", lineGenerator);
        },
        drawIntervals() {
            if (this.showConfidence === "none") {
                return;
            }
            let intervals =
                this.showConfidence === "all"
                    ? this.allConfidence
                    : this.filteredConfidence;
            this.svg
                .append("path")
                .datum(intervals)
                .attr("fill", `${SAFE_RED}99`)
                .attr("stroke", "none")
                .attr("class", "line-path")
                .attr(
                    "d",
                    d3
                        .area()
                        .x((d) => this.xScale(d.time))
                        .y0((d) => this.yScale(d.ciUpper))
                        .y1((d) => this.yScale(d.ciLower))
                );
            this.svg
                .append("path")
                .datum(intervals)
                .attr("fill", "none")
                .attr("stroke", SAFE_RED)
                .attr("class", "line-path")
                .attr(
                    "d",
                    d3
                        .line()
                        .x((d) => this.xScale(d.time))
                        .y((d) => this.yScale(d.mean))
                );
        },
        resetTooltip() {
            this.highlightedDonor = null;
            d3.select(`#${this.plotId}`).selectAll(".tooltip").remove();
            this.drawLines();
        },
        downloadImage(ID, NAME, TYPE) {
            if (TYPE == "svg") {
                let svgId = `chart_${this.plotId}`;
                uiUtils.downloadImg(ID, NAME, TYPE, svgId);
            }
            if (TYPE == "png") {
                uiUtils.downloadImg(ID, NAME, TYPE);
            }
            this.drawChart();
        },
        showTooltip(c) {
            let donor = c[0].donor;
            if (this.highlightedDonor !== donor) {
                this.highlightedDonor = donor;
                if (this.showConfidence === "none") {
                    this.drawLines();
                }
                this.drawHighlightedDonor(c);
            }

            let mouseEvent = d3.event;
            let plot = d3.select(`#${this.plotId}`);
            plot.selectAll(".tooltip").remove();
            plot.selectAll(".testdiv").remove();

            let boundingRect = document.getElementById(this.plotId)
                .getBoundingClientRect();

            let tooltipWidth = 250;
            let tooltipHeight = 75;

            let xcoord = mouseEvent.clientX - tooltipWidth;
            let ycoord = mouseEvent.clientY - tooltipHeight;


            this.tooltip = plot.append("div")
                 .style("position", "fixed")
                 .style("top", `${ycoord}px`)
                 .style("left", `${xcoord}px`)
                 .attr("class", "tooltip")
                 .style("background-color", "white")
                 .style("border", "2px solid gray")
                 .style("padding", "5px")
                 .style("max-width", `${tooltipWidth}px`)
                 .style("border-radius", "5px")
                 .style("font-size", "smaller")
                 .html(DOMPurify.sanitize(this.tooltipDonorData));
            this.tooltip.style("opacity", 1);
        },
    },
    watch: {
        chartData() {
            this.drawChart();
        },
        donors() {
            this.drawChart();
        },
        showConfidence() {
            this.drawLines();
        },
        showContent(){
            this.$emit("showContent", this.showContent);
        },
        isletTab(){
            this.drawChart();
        }
    },
});
</script>
<style scoped>

.plot {
    margin-right: 15px;
    margin-bottom: 15px;
    background-color: white;
    width: 100%;
}
.line-plot {
    width: 100%;
}
.download-images-setting {
    display: inline;
}
.download-images-setting div {
    display: inline;
}
.download-images-setting div:last-child {
    float: right;
}
.donorData {
    height: 100px;
    display: block;
}
.leftTable {
    width: 100px;
}
.donorLabel {
    padding-top: 2px;
    padding-bottom: 2px;
}
.radio-labels label {
    margin-right: 10px;
}
</style>
