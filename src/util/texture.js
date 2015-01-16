define(function(require) {

    'use strict';

    var Texture = require('../Texture');
    var Texture2D = require('../Texture2D');
    var TextureCube = require('../TextureCube');
    var request = require('../core/request');
    var EnvironmentMapPass = require('../prePass/EnvironmentMap');
    var Skydome = require('../plugin/Skydome');
    var Scene = require('../Scene');

    var dds = require('./dds');
    var hdr = require('./hdr');

    /**
     * @namespace qtek.util.texture
     */
    var textureUtil = {
        /**
         * @param  {string|object} path
         * @param  {object} [option]
         * @param  {Function} [onsuccess]
         * @param  {Function} [onerror]
         * @return {qtek.Texture}
         *
         * @memberOf qtek.util.texture
         */
        loadTexture: function(path, option, onsuccess, onerror) {
            var texture;
            if (typeof(option) === 'function') {
                onsuccess = option;
                onerror = onsuccess;
                option = {};
            } else {
                option = option || {};
            }
            if (typeof(path) === 'string') {
                if (path.match(/.hdr$/)) {
                    texture = new Texture2D({
                        width: 0,
                        height: 0
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
                } else if (path.match(/.dds$/)) {
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
                } else {
                    texture = new Texture2D();
                    texture.load(path);
                    texture.success(onsuccess);
                    texture.error(onerror);
                }
            } else if (typeof(path) == 'object' && typeof(path.px) !== 'undefined') {
                var texture = new TextureCube();
                texture.load(path);
                texture.success(onsuccess);
                texture.error(onerror);
            }
            return texture;
        },

        /**
         * Load a panorama texture and render it to a cube map
         * @param  {string} path
         * @param  {qtek.TextureCube} cubeMap
         * @param  {qtek.Renderer} renderer
         * @param  {object} [option]
         * @param  {Function} [onsuccess]
         * @param  {Function} [onerror]
         * 
         * @memberOf qtek.util.texture
         */
        loadPanorama: function(path, cubeMap, renderer, option, onsuccess, onerror) {
            var self = this;

            if (typeof(option) === 'function') {
                onsuccess = option;
                onerror = onsuccess;
                option = {};
            } else {
                option = option || {};
            }

            textureUtil.loadTexture(path, option, function(texture) {
                // PENDING 
                texture.flipY = false;
                self.panoramaToCubeMap(texture, cubeMap, renderer);
                texture.dispose(renderer.gl);
                onsuccess && onsuccess(cubeMap);
            }, onerror);
        },

        /**
         * Render a panorama texture to a cube map
         * @param  {qtek.Texture2D} panoramaMap
         * @param  {qtek.TextureCube} cubeMap
         * @param  {qtek.Renderer} renderer
         * 
         * @memberOf qtek.util.texture
         */
        panoramaToCubeMap: function(panoramaMap, cubeMap, renderer) {
            var environmentMapPass = new EnvironmentMapPass();
            var skydome = new Skydome({
                scene: new Scene()
            });
            skydome.material.set('diffuseMap', panoramaMap);
            environmentMapPass.texture = cubeMap;
            environmentMapPass.render(renderer, skydome.scene);
            environmentMapPass.texture = null;
            environmentMapPass.dispose(renderer);
            return cubeMap;
        },

        _fetchTexture: function(path, onsuccess, onerror) {
            request.get({
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
         * @return {qtek.Texture2D}
         * 
         * @memberOf qtek.util.texture
         */
        createChessboard: function(size, unitSize, color1, color2) {
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
         * @return {qtek.Texture2D}
         * 
         * @memberOf qtek.util.texture
         */
        createBlank: function(color) {
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

    return textureUtil;
});