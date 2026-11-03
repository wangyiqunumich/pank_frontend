<script>
import Vue from "vue";
import { formatMetric, formatPValue } from "./ligerFormat";
import { heatColor } from "./ligerHeat";

// A table whose numeric cells are the heatmap.
//
// The detail panels used to show a colored strip *and* a table of the same rows.
// This is both at once: every column keeps its number, and carries its own color
// scale, drawn under the header the way the expression cards draw their axis.
//
// Each column scales independently -- a p-value column and a correlation column
// have nothing in common, so a shared range would make one of them unreadable.
export default Vue.component("HeatTable", {
    props: {
        // [{ key, label, scale: "diverging" | "sequential" | "pvalue", unit }]
        // The first column is the row label and needs no scale.
        columns: {
            type: Array,
            default: () => []
        },
        // [{ key, label, values: { [columnKey]: number }, raw }]
        rows: {
            type: Array,
            default: () => []
        },
        // Optional grouping: [{ label, rows: [...] }]. When set, `rows` is ignored.
        groups: {
            type: Array,
            default: null
        },
        clickable: {
            type: Boolean,
            default: false
        },
        emptyText: {
            type: String,
            default: "No rows returned."
        }
    },

    computed: {
        allRows() {
            if (this.groups) {
                return this.groups.reduce((rows, group) => rows.concat(group.rows || []), []);
            }

            return this.rows;
        },
        renderGroups() {
            if (this.groups) {
                return this.groups.filter((group) => (group.rows || []).length);
            }

            return [{ label: "", rows: this.rows }];
        },
        // One domain per column, computed across every row on screen.
        scales() {
            return this.columns.reduce((scales, column) => {
                if (!column.scale) {
                    return scales;
                }

                let values = this.allRows
                    .map((row) => this.scaleValue(column, row.values[column.key]))
                    .filter((value) => Number.isFinite(value));

                let maxAbsolute = values.length ? Math.max(...values.map((value) => Math.abs(value))) : 1;
                let maxPositive = values.length ? Math.max(...values) : 1;
                let rawValues = this.allRows
                    .map((row) => row.values[column.key])
                    .filter((value) => Number.isFinite(value));

                scales[column.key] = {
                    maxAbsolute: maxAbsolute || 1,
                    maxPositive: maxPositive || 1,
                    rawMin: rawValues.length ? Math.min(...rawValues) : null,
                    rawMax: rawValues.length ? Math.max(...rawValues) : null,
                };

                return scales;
            }, {});
        },
    },

    methods: {
        // p-values are colored on -log10, so a strong hit is a strong color, but
        // they are still *displayed* as p-values.
        scaleValue(column, value) {
            if (!Number.isFinite(value)) {
                return null;
            }

            if (column.scale === "pvalue") {
                return value > 0 ? -Math.log10(value) : 320;
            }

            return value;
        },
        cellColor(column, value) {
            if (!column.scale) {
                return "transparent";
            }

            let scale = this.scales[column.key];

            if (!scale) {
                return "transparent";
            }

            return heatColor(
                this.scaleValue(column, value),
                column.scale === "diverging",
                scale.maxAbsolute,
                scale.maxPositive
            );
        },
        cellText(column, value) {
            if (!Number.isFinite(value)) {
                return "—";
            }

            return column.scale === "pvalue" ? formatPValue(value) : formatMetric(value);
        },
        // The legend under each header: the gradient the column actually uses, and
        // the ends of its domain in the units the cells are printed in.
        legendStyle(column) {
            if (column.scale === "diverging") {
                return { background: "linear-gradient(90deg, #c2410c, #ffffff 50%, #2f5bea)" };
            }

            return { background: "linear-gradient(90deg, #ffffff, #18a999)" };
        },
        legendTicks(column) {
            let scale = this.scales[column.key];

            if (!scale || scale.rawMin === null) {
                return [];
            }

            if (column.scale === "diverging") {
                return [formatMetric(-scale.maxAbsolute), "0", formatMetric(scale.maxAbsolute)];
            }

            if (column.scale === "pvalue") {
                // Weak to strong left to right, so the ends are the largest and
                // smallest p in the set rather than min then max.
                return [formatPValue(scale.rawMax), formatPValue(scale.rawMin)];
            }

            return [formatMetric(scale.rawMin), formatMetric(scale.rawMax)];
        },
        onRowClick(row) {
            if (this.clickable) {
                this.$emit("row-click", row);
            }
        },
    },
});
</script>

<template>
    <div v-if="allRows.length" class="heat-table-wrap">
        <!-- `heat-table-grouped` indents the label column, so grouped rows read as
             sitting under their group heading rather than beside it. -->
        <table class="heat-table" :class="{ 'heat-table-grouped': !!groups }">
            <thead>
                <tr>
                    <th
                        v-for="column in columns"
                        :key="`head-${column.key}`"
                        :class="{ 'heat-table-label-head': !column.scale }"
                    >
                        <div class="heat-table-head-label">{{ column.label }}</div>
                        <div v-if="column.unit" class="heat-table-head-unit">{{ column.unit }}</div>
                        <template v-if="column.scale">
                            <div class="heat-table-legend" :style="legendStyle(column)"></div>
                            <div class="heat-table-legend-ticks">
                                <span
                                    v-for="(tick, index) in legendTicks(column)"
                                    :key="`tick-${column.key}-${index}`"
                                >{{ tick }}</span>
                            </div>
                        </template>
                    </th>
                </tr>
            </thead>
            <tbody>
                <template v-for="(group, groupIndex) in renderGroups">
                    <tr v-if="group.label" :key="`group-${groupIndex}`" class="heat-table-group">
                        <td :colspan="columns.length">{{ group.label }}</td>
                    </tr>
                    <tr
                        v-for="row in group.rows"
                        :key="`row-${groupIndex}-${row.key}`"
                        :class="{ 'clickable-cell': clickable }"
                        @click="onRowClick(row)"
                    >
                        <td class="heat-table-label" :title="row.label">{{ row.label }}</td>
                        <td
                            v-for="column in columns.slice(1)"
                            :key="`cell-${row.key}-${column.key}`"
                            class="heat-table-cell"
                            :style="{ background: cellColor(column, row.values[column.key]) }"
                        >
                            {{ cellText(column, row.values[column.key]) }}
                        </td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>
    <div v-else class="empty-state">{{ emptyText }}</div>
</template>

<style scoped src="./ligerDetails.css"></style>
