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
            const payload = this._generatePayload();
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

    _generatePayload() {
        const sprites = this._generateSprites();
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

    _generateSprites() {
        const sprites = svgstore({
            svgAttrs: {
                display: 'none',
            }
        });

        for (let iconPath of this.options.icons) {
            const iconContent = fs.readFileSync(iconPath, 'utf8');
            const iconName = this.options.prefix + path.basename(iconPath).replace(/\.svg$/, '');
            sprites.add(iconName, iconContent);
        }

        return sprites.toString();
    }
}

module.exports = MinimalSvgStoreWebpackPlugin;
