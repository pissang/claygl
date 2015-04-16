define(function (require) {

    var Base = require('../core/Base');
    var FrameBuffer = require('../FrameBuffer');
    var Texture2D = require('../Texture2D');
    var Shader = require('../Shader');
    var Material = require('../Material');

    Shader.import(require('text!./color.essl'));    

    /**
     * Pixel picking is gpu based picking, which is fast and accurate.
     * But not like ray picking, it can't get the intersection point and triangle.
     * @constructor qtek.picking.PixelPicking
     * @extends qtek.core.Base
     */
    var PixelPicking = Base.derive(function() {
        return /** @lends qtek.picking.PixelPicking# */ {
            /**
             * Target renderer
             * @type {qtek.Renderer}
             */
            renderer: null,
            /**
             * Downsample ratio of hidden frame buffer
             * @type {number}
             */
            downSampleRatio: 1,

            width: 100,
            height: 100,

            lookupOffset: 1,

            _frameBuffer: null,
            _texture: null,
            _shader: null,

            _idMaterials: [],
            _lookupTable: [],

            _meshMaterials: [],

            _idOffset: 0
        };
    }, function() {
        if (this.renderer) {
            this.width = this.renderer.getWidth();
            this.height = this.renderer.getHeight();
        }
        this._init();
    }, /** @lends qtek.picking.PixelPicking.prototype */ {
        _init: function() {
            this._texture = new Texture2D({
                width: this.width * this.downSampleRatio,
                height: this.height * this.downSampleRatio
            });
            this._frameBuffer = new FrameBuffer();

            this._shader = new Shader({
                vertex: Shader.source('buildin.picking.color.vertex'),
                fragment: Shader.source('buildin.picking.color.fragment')
            });
        },
        /**
         * Set picking presision
         * @param {number} ratio
         */
        setPrecision: function(ratio) {
            this._texture.width = this.width * ratio;
            this._texture.height = this.height * ratio;
            this.downSampleRatio = ratio;
        },
        resize: function(width, height) {
            this._texture.width = width * this.downSampleRatio;
            this._texture.height = height * this.downSampleRatio;
            this.width = width;
            this.height = height;
            this._texture.dirty();
        },
        /**
         * Update the picking framebuffer
         * @param {number} ratio
         */
        update: function(scene, camera) {
            var renderer = this.renderer;
            if (renderer.getWidth() !== this.width || renderer.getHeight() !== this.height) {
                this.resize(renderer.width, renderer.height);
            }

            this._frameBuffer.attach(renderer.gl, this._texture);
            this._frameBuffer.bind(renderer);
            this._idOffset = this.lookupOffset;
            this._setMaterial(scene);
            renderer.render(scene, camera);
            this._restoreMaterial();
            this._frameBuffer.unbind(renderer);
        },

        _setMaterial: function(root) {
            for (var i =0; i < root._children.length; i++) {
                var child = root._children[i];
                if (child.geometry && child.material && child.material.shader) {
                    var id = this._idOffset++;
                    var idx = id - this.lookupOffset;
                    var material = this._idMaterials[idx];
                    if (!material) {
                        material = new Material({
                            shader: this._shader
                        });
                        var color = packID(id);
                        color[0] /= 255;
                        color[1] /= 255;
                        color[2] /= 255;
                        color[3] = 1.0;
                        material.set('color', color);
                        this._idMaterials[idx] = material;
                    }
                    this._meshMaterials[idx] = child.material;
                    this._lookupTable[idx] = child;
                    child.material = material;
                }
                if (child._children.length) {
                    this._setMaterial(child);
                }
            }
        },

        /**
         * Pick the object
         * @param  {number} x Mouse position x
         * @param  {number} y Mouse position y
         * @return {qtek.Node}
         */
        pick: function(x, y) {
            var renderer = this.renderer;

            var ratio = this.downSampleRatio;
            x = Math.ceil(ratio * x);
            y = Math.ceil(ratio * (this.height - y));

            this._frameBuffer.bind(renderer);
            var pixel = new Uint8Array(4);
            var _gl = renderer.gl;
            // TODO out of bounds ?
            // preserveDrawingBuffer ?
            _gl.readPixels(x, y, 1, 1, _gl.RGBA, _gl.UNSIGNED_BYTE, pixel);
            this._frameBuffer.unbind(renderer);
            // Skip interpolated pixel because of anti alias
            if (pixel[3] === 255) {
                var id = unpackID(pixel[0], pixel[1], pixel[2]);
                if (id) {
                    var el = this._lookupTable[id - this.lookupOffset];
                    return el;
                }
            }
        },

        _restoreMaterial: function() {
            for (var i = 0; i < this._lookupTable.length; i++) {
                this._lookupTable[i].material = this._meshMaterials[i];
            }
        },

        dispose: function(_gl) {
            this._frameBuffer.dispose(_gl);
            this._shader.dispose(_gl);
        }
    });

    function packID(id){
        var r = id >> 16;
        var g = (id - (r << 8)) >> 8;
        var b = id - (r << 16) - (g<<8);
        return [r, g, b];
    }

    function unpackID(r, g, b){
        return (r << 16) + (g<<8) + b;
    }

    return PixelPicking;
});