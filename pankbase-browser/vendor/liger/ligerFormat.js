// Shared number formatting for the LIGER browser and its detail components.
//
// These live outside the SFCs because the parent builds the detail payloads and
// the detail components render them; both have to format the same value the same
// way, and a second copy of `formatPValue` would drift.

export function isFiniteNumber(value) {
    return Number.isFinite(value);
}

export function formatMetric(value) {
    if (!Number.isFinite(value)) {
        return "0.00";
    }

    return value.toFixed(2);
}

export function formatPValue(value) {
    if (!Number.isFinite(value)) {
        return "";
    }

    if (value === 0) {
        return "0";
    }

    if (Math.abs(value) < 0.001) {
        return value.toExponential(2);
    }

    return value.toFixed(3);
}
