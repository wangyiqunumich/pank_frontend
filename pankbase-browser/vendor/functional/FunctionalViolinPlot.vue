<template>
    <div>
        <div class="label">{{ yField }}</div>
        <div class="plot" v-if="plotId !== null" :id="plotId"></div>
    </div>
</template>

<script>
import * as d3 from "d3v5";
import colors from "./colors.js";
import Vue from "vue";

export default Vue.component("functional-violin-plot", {
    props: {
        data: {
            type: (Array, null),
            required: true,
        },
        xField: {
            type: (String, null),
            required: true,
        },
        xLabel: {
            type: (String, null),
            required: true,
        },
        yField: {
            type: (String, null),
            required: true,
        },
        yLabel: {
            type: (String, null),
            required: false,
        },
    },
    data() {
        return {
            plotId: `violinChart_${Math.round(Math.random() * 10e9)}`,
            safeField: this.xField.replaceAll(" ", "_"),
            chart: null,
            chartWidth: 0,
            eventElements: [],
            margin: {
                top: 10,
                right: 10,
                bottom: 80,
                left: 70,
            },
            svg: null,
            fontSize: "13px",
            plotHeight: 250,
        };
    },
    watch: {
        data() {
            this.drawChart();
        },
        xField() {
            this.drawChart();
        },
        highlightKey(key) {
            this.doHighlight(key);
        },
    },
    mounted() {
        if (this.data) {
            this.chart = document.getElementById(this.plotId);
            this.chartWidth = this.chart.clientWidth;
            window.addEventListener("resize", this.handleResize);
            this.drawChart();
        }
        //window.addEventListener('resize', this.handleResize);
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.handleResize);
        if (this.eventElements.length > 0) {
            this.removeAllListeners(this.eventElements);
        }
    },
    computed: {},
    methods: {
        handleResize() {
            if (!this.chart) return;
            this.chartWidth = this.chart.clientWidth;
            this.drawChart();
        },
        getYAxisSpacing(yScale) {
            const tickLabelFormatter = d3.format(",~g");
            const tickValues = yScale.ticks();
            const maxTickLabelLength =
                d3.max(
                    tickValues,
                    (value) => tickLabelFormatter(value).length
                ) || 0;
            const tickLabelWidth = maxTickLabelLength * 8;
            const labelLines = (this.yLabel || this.yField).split("\n");
            const lineHeight = 14;
            const labelBlockWidth = labelLines.length * lineHeight;
            const labelOffset = tickLabelWidth + 16 + labelBlockWidth;

            return {
                labelOffset,
                labelLines,
                lineHeight,
                leftMargin: Math.max(this.margin.left, labelOffset + 20),
            };
        },
        drawChart() {
            if (!this.data) return;
            let plotId = `#${this.plotId}`;

            //Clear existing

            d3.select(plotId).selectAll("svg").remove();
            d3.select(plotId).selectAll("g").remove();

            let xField = this.xField;
            let yField = this.yField;

            let width = this.chartWidth - this.margin.left - this.margin.right;
            let height = this.plotHeight - this.margin.top - this.margin.bottom;

            let minVal = d3.min(this.data.map((d) => d[yField]));
            let maxVal = d3.max(this.data.map((d) => d[yField]));
            let y = d3
                .scaleLinear()
                .domain([minVal, maxVal])
                .range([height, 0]);

            const { leftMargin, labelOffset, labelLines, lineHeight } =
                this.getYAxisSpacing(y);
            width = this.chartWidth - leftMargin - this.margin.right;

            this.svg = d3
                .select(plotId)
                .append("svg")
                .attr("width", width + leftMargin + this.margin.right)
                .attr("height", height + this.margin.top + this.margin.bottom)
                .attr("id", `${this.plotId}_svg`)
                .append("g")
                .attr(
                    "transform",
                    `translate(${leftMargin},${this.margin.top})`
                );
            this.svg
                .append("g")
                .call(d3.axisLeft(y))
                .selectAll("text")
                .style("font-size", this.fontSize);

            let empty = "-";
            let categories = Array.from(
                new Set(
                    this.data.map((d) => d[xField]).filter((d) => d !== empty)
                )
            );

            let x = d3
                .scaleBand()
                .range([0, width])
                .domain(categories)
                .padding(0.05);
            this.svg
                .append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll("text")
                .style("font-size", this.fontSize)
                .style("text-anchor", "end")
                .attr("transform", "rotate(-35) translate(-5, 0)")
                .text((t) => this.textLabel(t));

            let histogram = d3
                .histogram()
                .domain(y.domain())
                .thresholds(y.ticks(20))
                .value((d) => d);

            let statData = structuredClone(this.data).filter(
                (d) => d[xField] !== empty
            );

            let sumstat = d3
                .nest()
                .key((d) => d[xField])
                .rollup(function (d) {
                    let input = d.map((g) => g[yField]);
                    let bins = histogram(input);
                    return bins;
                })
                .entries(statData);

            let maxNum = 0;
            for (let i = 0; i < sumstat.length; i++) {
                let allBins = sumstat[i].value;
                let lengths = allBins.map((a) => a.length);
                let longest = d3.max(lengths);
                if (longest > maxNum) {
                    maxNum = longest;
                }
            }
            let xNum = d3
                .scaleLinear()
                .range([0, x.bandwidth()])
                .domain([-maxNum, maxNum]);

            this.svg
                .selectAll("myViolin")
                .data(sumstat)
                .enter()
                .append("g")
                .attr("transform", (d) => {
                    return `translate(${x(d.key)} ,0)`;
                })
                .append("path")
                .datum((d) => d.value)
                .style("stroke", "none")
                .style("fill", (d, i) => colors[i] || colors[colors.length % i])
                .attr(
                    "d",
                    d3
                        .area()
                        .x0((d) => xNum(-d.length))
                        .x1((d) => xNum(d.length))
                        .y((d) => y(d.x0))
                        .defined((d) => d[xField] !== empty)
                        .curve(d3.curveCatmullRom)
                );

            this.svg
                .append("g")
                .attr("id", "axisLabelsGroup")
                .attr("transform", "translate(0,0)")
                .style("text-anchor", "middle");

            const labelText = this.svg
                .select("#axisLabelsGroup")
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("text-anchor", "middle");

            labelLines.forEach((line, i) => {
                labelText
                    .append("tspan")
                    .attr("x", -height / 2)
                    .attr("y", -(labelOffset - i * lineHeight))
                    .text(line);
            });
        },
        truncateLabel(label) {
            if (label.indexOf(" ") !== -1) {
                return label.replaceAll(" ", "");
            }
            return label.length < 8 ? label : `${label.slice(0, 7)}.`;
        },
        textLabel(t) {
            let parenthetical = /\((\w+)\)/;
            let selfAbbreviation = t.match(parenthetical);
            if (selfAbbreviation !== null) {
                return selfAbbreviation[1];
            }
            if (this.xField === "Isolation_center") {
                let delimiters = /[-]? /;
                let shortForm = t.split(delimiters);
                return shortForm[0];
            }
            let diabetesType = /(type [\d])/;
            let getDiabetesType = t.match(diabetesType);
            if (getDiabetesType !== null) {
                return getDiabetesType[1];
            }
            if (t.startsWith("control")) {
                return "control";
            }
            return t;
        },
    },
});
</script>

<style scoped>
svg {
    font-family: sans-serif;
}

::v-deep .chart-label {
    font-size: 12px;
    opacity: 0.5;
}
::v-deep .plot.highlighting .bar {
    opacity: 0.2;
}
::v-deep .plot.highlighting .bar.on {
    opacity: 1;
}
.plot {
    margin-left: 15px;
    margin-bottom: 15px;
    background-color: white;
}
</style>
