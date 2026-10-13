import Vue from "vue";
import ResearchMouseTooltip from "@/components/researchPortal/singleCellBrowser/ResearchMouseTooltip.vue";

/*
creates a tooltip which follows the mouse cursor
tooltip will always stay within bounds of viewport
and will follow cursor until hidden

you only need to provide the tooltip with the content to display (html ok)
this component tracks mouse position on its own, regardless of how many
components instantiate this service on the page.

usage:
import mouseTooltip from '@/components/researchPortal/singleCellBrowser/mouseTooltip.js';

to show tooltip call
mouseTooltip.show(your_content_string_html);

to hide tooltip call
mouseTooltip.hide();

the tooltip will keep following mouse until hide() is called
*/

let tooltipInstance;
let isTrackingMouse = false;

function initTooltip() {
    if (!tooltipInstance) {
        const TooltipConstructor = Vue.extend(ResearchMouseTooltip);
        tooltipInstance = new TooltipConstructor();
        tooltipInstance.$mount(document.createElement("div"));
        document.body.appendChild(tooltipInstance.$el);
    }
}

function trackMousePosition(e) {
    if (tooltipInstance) {
        tooltipInstance.updateMousePosition(e.clientX, e.clientY);
    }
}

export default {
    show(content) {
        initTooltip();
        tooltipInstance.showTooltip(content);

        // add a single global event listener
        if (!isTrackingMouse) {
            document.addEventListener("mousemove", trackMousePosition);
            isTrackingMouse = true;
        }
    },
    hide() {
        if (tooltipInstance) tooltipInstance.hideTooltip();

        if (isTrackingMouse) {
            document.removeEventListener("mousemove", trackMousePosition);
            isTrackingMouse = false;
        }
    },
};
