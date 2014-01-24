define(function(require) {

    var Texture = require('../Texture');
    var Texture2D = require('../texture/Texture2D');
    var TextureCube = require('../texture/TextureCube');
    var request = require('../core/request');
    var EnvironmentMapPass = require('../prePass/EnvironmentMap');
    var Skydome = require('../plugin/Skydome');
    var Scene = require('../Scene');

    var dds = require('./dds');
    var hdr = require('./hdr');

    var environmentMapPass = new EnvironmentMapPass();

    var textureUtil = {
        loadTexture : function(path, onsuccess, onerror) {
            var texture;
            if (typeof(path) === 'string') {
                if (path.match(/.hdr$/)) {
                    texture = new Texture2D({
                        width : 0,
                        height : 0
                    });
                    textureUtil._fetchTexture(
                        path,
                        function (data) {
                            hdr.parseRGBE(data, texture);
                            texture.dirty();
                            onsuccess && onsuccess(texture);
                        },
                        onerror
                    );
                    return texture;
                } else if (path.match(/.dds$/)) {
                    texture = new Texture2D({
                        width : 0,
                        height : 0
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
            } else if (path instanceof Array) {
                var texture = new TextureCube();
                texture.load(path);
                texture.success(onsuccess);
                texture.error(onerror);
            }
            return texture;
        },

        loadPanorama : function(path, cubeMap, renderer, onsuccess, onerror) {
            var self = this;
            textureUtil.loadTexture(path, function(texture) {
                // PENDING 
                texture.flipY = false;
                self.panoramaToCubeMap(texture, cubeMap, renderer);
                texture.dispose(renderer.gl);
                onsuccess && onsuccess(cubeMap);
            }, onerror);
        },

        panoramaToCubeMap : function(panoramaMap, cubeMap, renderer) {
            var skydome = new Skydome({
                scene : new Scene
            });
            skydome.material.set('diffuseMap', panoramaMap);
            environmentMapPass.texture = cubeMap;
            environmentMapPass.render(renderer, skydome.scene);
            environmentMapPass.texture = null;
            return cubeMap;
        },

        _fetchTexture : function(path, onsuccess, onerror) {
            request.get({
                url : path,
                responseType : 'arraybuffer',
                onload : onsuccess,
                onerror : onerror
            });
        },

        createChessboard : function(size, unitSize, color1, color2) {
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
                image : canvas,
                anisotropic : 8
            });

            return texture;
        },

        createBlank : function(color) {
            var canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 1, 1);

            var texture = new Texture2D({
                image : canvas
            });

            return texture;
        }
    }

    return textureUtil;
});