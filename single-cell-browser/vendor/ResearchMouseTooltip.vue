<template>
    <div ref="tooltip" class="mouse-tooltip"></div>
</template>

<script>
import Vue from "vue";
import DOMPurify from "dompurify";

/*
usage: mouseTooltip.js
dont import this component directly, use the mouseTooltip.js service instead

simply
import mouseTooltip from '@/components/researchPortal/singleCellBrowser/mouseTooltip.js';

to show tooltip call
mouseTooltip.show(your_content_string_html);

to hide tooltip call
mouseTooltip.hide();

the tooltip will keep following mouse until hide() is called
*/

export default Vue.component("research-mouse-tooltip", {
    props: {},
    data() {
        return {
            tt: null,
            content: null,
            mousePos: { x: 0, y: 0 },
            showing: false,
        };
    },
    watch: {},
    mounted() {
        this.tt = this.$refs.tooltip;
    },
    created() {},
    beforeDestroy() {},
    methods: {
        showTooltip(content) {
            this.content = content;
            this.tt.innerHTML = DOMPurify.sanitize(this.content);
            this.positionTooltip();
            this.tt.classList.add("show");
        },
        positionTooltip() {
            const tt = this.tt;

            // get tooltip dimentions
            const tooltipWidth = tt.offsetWidth;
            const tooltipHeight = tt.offsetHeight;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            //ideal tooltip position next to mouse
            let top = this.mousePos.y - 10;
            let left = this.mousePos.x + 10;

            // adjust to keep the tooltip inside the viewport
            if (left + tooltipWidth > viewportWidth) {
                left = this.mousePos.x - tooltipWidth - 10;
            }
            if (top + tooltipHeight > viewportHeight) {
                top = viewportHeight - tooltipHeight - 10;
            }

            // avoid moving out of the top edge
            if (top < 0) {
                top = 10;
            }

            tt.style.top = `${top}px`;
            tt.style.left = `${left}px`;

            this.showing = true;
        },
        hideTooltip() {
            this.tt.classList.remove("show");
            this.tt.style.top = -10000 + "px";
            this.tt.style.left = -10000 + "px";
            this.showing = false;
        },
        updateMousePosition(x, y) {
            this.mousePos = { x: x, y: y };
            if (this.showing) {
                this.positionTooltip();
            }
        },
    },
});
</script>

<style scoped>
.mouse-tooltip {
    position: fixed;
    top: -10000px;
    left: -10000px;
    background: white;
    padding: 5px 10px;
    box-shadow: rgba(0, 0, 0, 0.5) -4px 9px 25px -6px;
    z-index: 5000;
    opacity: 0;
}
.mouse-tooltip.show {
    opacity: 1;
}
</style>
