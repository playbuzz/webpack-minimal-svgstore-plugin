'use strict';

const fs = require('fs');
const path = require('path');
const svgstore = require('svgstore');
const flatten = require('lodash.flatten');
const groupBy = require('lodash.groupby');

let ConcatSource;

try {
    ConcatSource = require('webpack-core/lib/ConcatSource');
} catch (e) {
    ConcatSource = require('webpack-sources').ConcatSource;
}

class MinimalSvgStoreWebpackPlugin {
    constructor(options) {
        this.options = options || {};
        this.options.prefix = this.options.prefix || '';
    }

    apply(compiler) {
        compiler.plugin('emit', (compilation, callback) => {
            try {
                // prepend payload to existing code
                const groupedSvgFilePaths = this._getSvgFilePaths(compilation.modules);

                Object.entries(groupedSvgFilePaths).forEach(([fileName, svgFilePathsForBundle]) => {
                    const svgPaths = svgFilePathsForBundle.map(x => x.svgFilePath);
                    const payload = this._generatePayload(svgPaths);
                    const asset = compilation.assets[fileName];

                    if (asset) {
                        compilation.assets[fileName] = new ConcatSource(
                            payload,
                            asset
                        );
                    } else {
                        compilation.errors.push(new Error(`MinimalSvgStoreWebpackPlugin: Asset ${fileName} not found.`));
                    }
                });

                callback();
            } catch (err) {
                callback(err);
            }
        });
    }

    _generatePayload(svgFilePaths) {
        const sprites = this._generateSprites(svgFilePaths);
        const payload = `/* MinimalSvgStoreWebpackPlugin bootstrap */
(function (document) {
    var container = document.querySelector('body');

    if (container) {
        container.insertAdjacentHTML('afterbegin', ${JSON.stringify(sprites)});
    } else {
        throw new Error('svginjector: Could not find element: body');
    }
})(document);
/* MinimalSvgStoreWebpackPlugin bootstrap end */`;

        return payload;
    }

    _generateSprites(svgFilePaths) {
        const sprites = svgstore({
            svgAttrs: {
                display: 'none',
            }
        });


        for (let svgFilePath of svgFilePaths) {
            const iconContent = fs.readFileSync(svgFilePath, 'utf8');
            const iconName = this.options.prefix + path.basename(svgFilePath).replace(/\.svg$/, '');
            sprites.add(iconName, iconContent);
        }

        return sprites.toString();
    }

    _getSvgFilePaths(modules) {
        const svgFilePaths = flatten(modules
            .filter(module => /webpack-minimal-svgstore-loader.+!/ig.test(module.request))
            .map(module => {
                const fileNames = flatten(module.mapChunks(
                    chunk => chunk.files.filter(
                        file => /\.js$/.test(file)
                    )));
                return fileNames.map(fileName => ({
                    svgFilePath: module.resource,
                    fileName
                }));
            }));

        const groupedSvgFilePaths = groupBy(svgFilePaths, 'fileName');
        return groupedSvgFilePaths;
    }
}

module.exports = MinimalSvgStoreWebpackPlugin;
