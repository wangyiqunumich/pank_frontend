const STYLESHEETS = [
    {
        href: "https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css",
        integrity:
            "sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm",
        crossorigin: "anonymous",
    },
    {
        href: "https://unpkg.com/epgg@53.6.0/umd/epgg.css",
    },
];

const SCRIPTS = [
    {
        src: "https://aframe.io/releases/0.8.0/aframe.min.js",
    },
    {
        src: "https://code.jquery.com/jquery-3.2.1.slim.min.js",
        integrity:
            "sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN",
        crossorigin: "anonymous",
    },
    {
        src: "https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js",
        integrity:
            "sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q",
        crossorigin: "anonymous",
    },
    {
        src: "https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js",
        integrity:
            "sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl",
        crossorigin: "anonymous",
    },
    {
        src: "https://unpkg.com/react@16.14.0/umd/react.production.min.js",
        crossorigin: "anonymous",
    },
    {
        src: "https://unpkg.com/react-dom@16.14.0/umd/react-dom.production.min.js",
        crossorigin: "anonymous",
    },
    {
        src: "https://cdn.plot.ly/plotly-cartesian-2.35.2.min.js",
        crossorigin: "anonymous",
    },
    {
        src: "https://unpkg.com/react-plotly.js@2.3.0/dist/create-plotly-component.min.js",
        crossorigin: "anonymous",
    },
    {
        src: "https://unpkg.com/epgg@53.6.0/umd/epgg.js",
    },
];

let assetPromise = null;

function ensureStylesheetLoaded(definition) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(
            `link[rel="stylesheet"][href="${definition.href}"]`
        );
        if (existing) {
            if (existing.dataset.loaded === "true") {
                resolve(existing);
            } else {
                existing.addEventListener("load", () => resolve(existing), {
                    once: true,
                });
                existing.addEventListener("error", reject, { once: true });
            }
            return;
        }

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = definition.href;
        if (definition.integrity) {
            link.integrity = definition.integrity;
        }
        if (definition.crossorigin) {
            link.crossOrigin =
                definition.crossorigin === true
                    ? "anonymous"
                    : definition.crossorigin;
        }

        link.addEventListener(
            "load",
            () => {
                link.dataset.loaded = "true";
                resolve(link);
            },
            { once: true }
        );
        link.addEventListener("error", reject, { once: true });

        document.head.appendChild(link);
    });
}

function ensureScriptLoaded(definition) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(
            `script[src="${definition.src}"]`
        );
        if (existing) {
            if (existing.dataset.loaded === "true") {
                resolve(existing);
            } else {
                existing.addEventListener("load", () => resolve(existing), {
                    once: true,
                });
                existing.addEventListener("error", reject, { once: true });
            }
            return;
        }

        const script = document.createElement("script");
        script.src = definition.src;
        if (definition.integrity) {
            script.integrity = definition.integrity;
        }
        if (definition.crossorigin) {
            script.crossOrigin =
                definition.crossorigin === true
                    ? "anonymous"
                    : definition.crossorigin;
        }

        script.addEventListener(
            "load",
            () => {
                script.dataset.loaded = "true";
                resolve(script);
            },
            { once: true }
        );
        script.addEventListener("error", reject, { once: true });

        document.head.appendChild(script);
    });
}

export function loadWashUAssets() {
    if (typeof document === "undefined") {
        return Promise.resolve();
    }

    if (assetPromise) {
        return assetPromise;
    }

    const stylesLoaded = Promise.all(STYLESHEETS.map(ensureStylesheetLoaded));
    const scriptsLoaded = SCRIPTS.reduce((chain, definition) => {
        return chain.then(() => ensureScriptLoaded(definition));
    }, Promise.resolve());

    assetPromise = stylesLoaded.then(() => scriptsLoaded).then(() => undefined);

    return assetPromise;
}

export { STYLESHEETS, SCRIPTS };
