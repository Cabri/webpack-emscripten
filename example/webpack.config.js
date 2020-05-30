const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
    mode: 'development',
    entry: {
        "bundle": "./src/app.js",
    },

    devtool: "source-map",

    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            { // for loading C++ and C files within javascript
                test: /\.emsc.js/,
                loader: path.resolve('../cpp-packager.js'),
                options : {
                    cfiles : [
                        "NumberContainerCppClass.cpp",
                        "RandomNumberContainerCppClass.cpp"
                    ]
                }
            }
        ]
    },
    plugins:  [new HtmlWebpackPlugin()],
    experiments: {
        importAwait: true,
        importAsync: true
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        port: 9000,
        bonjour: true
    }
};
