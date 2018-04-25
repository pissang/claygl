import Texture2D from '../Texture2D';
import TextureCube from '../TextureCube';
import vendor from '../core/vendor';
import EnvironmentMapPass from '../prePass/EnvironmentMap';
import Skydome from '../plugin/Skydome';
import Scene from '../Scene';

import dds from './dds';
import hdr from './hdr';

/**
 * @alias clay.util.texture
 */
var textureUtil = {
    /**
     * @param  {string|object} path
     * @param  {object} [option]
     * @param  {Function} [onsuccess]
     * @param  {Function} [onerror]
     * @return {clay.Texture}
     */
    loadTexture: function (path, option, onsuccess, onerror) {
        var texture;
        if (typeof(option) === 'function') {
            onsuccess = option;
            onerror = onsuccess;
            option = {};
        }
        else {
            option = option || {};
        }
        if (typeof(path) === 'string') {
            if (path.match(/.hdr$/) || option.fileType === 'hdr') {
                texture = new Texture2D({
                    width: 0,
                    height: 0,
                    sRGB: false
                });
                textureUtil._fetchTexture(
                    path,
                    function (data) {
                        hdr.parseRGBE(data, texture, option.exposure);
                        texture.dirty();
                        onsuccess && onsuccess(texture);
                    },
                    onerror
                );
                return texture;
            }
            else if (path.match(/.dds$/) || option.fileType === 'dds') {
                texture = new Texture2D({
                    width: 0,
                    height: 0
                });
                textureUtil._fetchTexture(
                    path,
                    function (data) {
                        dds.parse(data, texture);
                        texture.dirty();
                        onsuccess && onsuccess(texture);
                    },
                    onerror
                );
            }
            else {
                texture = new Texture2D();
                texture.load(path);
                texture.success(onsuccess);
                texture.error(onerror);
            }
        }
        else if (typeof path === 'object' && typeof(path.px) !== 'undefined') {
            texture = new TextureCube();
            texture.load(path);
            texture.success(onsuccess);
            texture.error(onerror);
        }
        return texture;
    },

    /**
     * Load a panorama texture and render it to a cube map
     * @param  {clay.Renderer} renderer
     * @param  {string} path
     * @param  {clay.TextureCube} cubeMap
     * @param  {object} [option]
     * @param  {boolean} [option.encodeRGBM]
     * @param  {number} [option.exposure]
     * @param  {Function} [onsuccess]
     * @param  {Function} [onerror]
     */
    loadPanorama: function (renderer, path, cubeMap, option, onsuccess, onerror) {
        var self = this;

        if (typeof(option) === 'function') {
            onsuccess = option;
            onerror = onsuccess;
            option = {};
        }
        else {
            option = option || {};
        }

        textureUtil.loadTexture(path, option, function (texture) {
            // PENDING
            texture.flipY = option.flipY || false;
            self.panoramaToCubeMap(renderer, texture, cubeMap, option);
            texture.dispose(renderer);
            onsuccess && onsuccess(cubeMap);
        }, onerror);
    },

    /**
     * Render a panorama texture to a cube map
     * @param  {clay.Renderer} renderer
     * @param  {clay.Texture2D} panoramaMap
     * @param  {clay.TextureCube} cubeMap
     * @param  {Object} option
     * @param  {boolean} [option.encodeRGBM]
     */
    panoramaToCubeMap: function (renderer, panoramaMap, cubeMap, option) {
        var environmentMapPass = new EnvironmentMapPass();
        var skydome = new Skydome({
            scene: new Scene()
        });
        skydome.setEnvironmentMap(panoramaMap);

        option = option || {};
        if (option.encodeRGBM) {
            skydome.material.define('fragment', 'RGBM_ENCODE');
        }

        // Share sRGB
        cubeMap.sRGB = panoramaMap.sRGB;

        environmentMapPass.texture = cubeMap;
        environmentMapPass.render(renderer, skydome.scene);
        environmentMapPass.texture = null;
        environmentMapPass.dispose(renderer);
        return cubeMap;
    },

    /**
     * Convert height map to normal map
     * @param {HTMLImageElement|HTMLCanvasElement} image
     * @param {boolean} [checkBump=false]
     * @return {HTMLCanvasElement}
     */
    heightToNormal: function (image, checkBump) {
        var canvas = document.createElement('canvas');
        var width = canvas.width = image.width;
        var height = canvas.height = image.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);
        checkBump = checkBump || false;
        var srcData = ctx.getImageData(0, 0, width, height);
        var dstData = ctx.createImageData(width, height);
        for (var i = 0; i < srcData.data.length; i += 4) {
            if (checkBump) {
                var r = srcData.data[i];
                var g = srcData.data[i + 1];
                var b = srcData.data[i + 2];
                var diff = Math.abs(r - g) + Math.abs(g - b);
                if (diff > 20) {
                    console.warn('Given image is not a height map');
                    return image;
                }
            }
            // Modified from http://mrdoob.com/lab/javascript/height2normal/
            var x1, y1, x2, y2;
            if (i % (width * 4) === 0) {
                // left edge
                x1 = srcData.data[i];
                x2 = srcData.data[i + 4];
            }
            else if (i % (width * 4) === (width - 1) * 4) {
                // right edge
                x1 = srcData.data[i - 4];
                x2 = srcData.data[i];
            }
            else {
                x1 = srcData.data[i - 4];
                x2 = srcData.data[i + 4];
            }

            if (i < width * 4) {
                // top edge
                y1 = srcData.data[i];
                y2 = srcData.data[i + width * 4];
            }
            else if (i > width * (height - 1) * 4) {
                // bottom edge
                y1 = srcData.data[i - width * 4];
                y2 = srcData.data[i];
            }
            else {
                y1 = srcData.data[i - width * 4];
                y2 = srcData.data[i + width * 4];
            }

            dstData.data[i] = (x1 - x2) + 127;
            dstData.data[i + 1] = (y1 - y2) + 127;
            dstData.data[i + 2] = 255;
            dstData.data[i + 3] = 255;
        }
        ctx.putImageData(dstData, 0, 0);
        return canvas;
    },

    /**
     * Convert height map to normal map
     * @param {HTMLImageElement|HTMLCanvasElement} image
     * @param {boolean} [checkBump=false]
     * @param {number} [threshold=20]
     * @return {HTMLCanvasElement}
     */
    isHeightImage: function (img, downScaleSize, threshold) {
        if (!img || !img.width || !img.height) {
            return false;
        }

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var size = downScaleSize || 32;
        threshold = threshold || 20;
        canvas.width = canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        var srcData = ctx.getImageData(0, 0, size, size);
        for (var i = 0; i < srcData.data.length; i += 4) {
            var r = srcData.data[i];
            var g = srcData.data[i + 1];
            var b = srcData.data[i + 2];
            var diff = Math.abs(r - g) + Math.abs(g - b);
            if (diff > threshold) {
                return false;
            }
        }
        return true;
    },

    _fetchTexture: function (path, onsuccess, onerror) {
        vendor.request.get({
            url: path,
            responseType: 'arraybuffer',
            onload: onsuccess,
            onerror: onerror
        });
    },

    /**
     * Create a chessboard texture
     * @param  {number} [size]
     * @param  {number} [unitSize]
     * @param  {string} [color1]
     * @param  {string} [color2]
     * @return {clay.Texture2D}
     */
    createChessboard: function (size, unitSize, color1, color2) {
        size = size || 512;
        unitSize = unitSize || 64;
        color1 = color1 || 'black';
        color2 = color2 || 'white';

        var repeat = Math.ceil(size / unitSize);

        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = color2;
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = color1;
        for (var i = 0; i < repeat; i++) {
            for (var j = 0; j < repeat; j++) {
                var isFill = j % 2 ? (i % 2) : (i % 2 - 1);
                if (isFill) {
                    ctx.fillRect(i * unitSize, j * unitSize, unitSize, unitSize);
                }
            }
        }

        var texture = new Texture2D({
            image: canvas,
            anisotropic: 8
        });

        return texture;
    },

    /**
     * Create a blank pure color 1x1 texture
     * @param  {string} color
     * @return {clay.Texture2D}
     */
    createBlank: function (color) {
        var canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);

        var texture = new Texture2D({
            image: canvas
        });

        return texture;
    }
};

export default textureUtil;
