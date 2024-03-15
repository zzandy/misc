const path = require("path");
const html = require("html-webpack-plugin");

module.exports = {
    mode: 'development',
    entry: './src/main.ts',
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js",
    },
    devServer: {
    },
    resolve: {
        extensions: [".js", ".ts"]
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader"
            },
            {
                test: /\.glsl$/,
                type: 'asset/source'
            }
        ]
    },
    plugins:
        [
            new html({ title: 'GL' })
        ]
};