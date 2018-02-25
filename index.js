'use strict';

const fs = require('fs');
const path = require('path');
const svgstore = require('svgstore');

let ConcatSource;

try {
    ConcatSource = require('webpack-core/lib/ConcatSource');
} catch (e) {
    ConcatSource = require('webpack-sources').ConcatSource;
}

class MinimalSvgStoreWebpackPlugin {
    constructor(options) {
        this.options = options || {};
        this.chunks = this.options.chunks || {};
    }

    apply(compiler) {
        compiler.plugin('emit', (compilation, callback) => {
            // prepend payload to existing code
            const payload = this._generatePayload(compilation.modules);
            const asset = compilation.assets[this.options.asset];

            if (asset) {
                compilation.assets[this.options.asset] = new ConcatSource(
                    payload,
                    compilation.assets[this.options.asset]
                );
            }

            callback();
        });
    }

    _generatePayload(modules) {
        const sprites = this._generateSprites(modules);
        const payload = `
(function (document) {
    var container = document.querySelector('body');

    if (container) {
        container.insertAdjacentHTML('afterbegin', ${JSON.stringify(sprites)});
    } else {
        throw new Error('svginjector: Could not find element: body');
    }
})(document);
        `;

        return payload;
    }

    _generateSprites(modules) {
        const svgFilePaths = this._getSvgFilePaths(modules);

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
        const svgFilePaths = modules
            .filter(m => /webpack-minimal-svgstore-loader.+!/ig.test(m.request))
            .map(m => m.resource);

        return svgFilePaths;
    }
}

module.exports = MinimalSvgStoreWebpackPlugin;
