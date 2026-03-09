const webpack = require("webpack")

module.exports = {
    webpack: {
        configure: (config) => {
            config.resolve = config.resolve || {}
            config.resolve.fallback = {
                ...(config.resolve.fallback || {}),
                buffer: require.resolve("buffer/"),
                process: require.resolve("process/browser"),
                url: require.resolve("url/"),
            }

            config.plugins = [
                ...(config.plugins || []),
                new webpack.ProvidePlugin({
                    Buffer: ["buffer", "Buffer"],
                    process: ["process"],
                }),
            ]

            return config
        },
    },
}
