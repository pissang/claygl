import Node from './Node';
import glenum from './core/glenum';

/**
 * @constructor
 * @alias clay.Renderable
 * @extends clay.Node
 */
var Renderable = Node.extend(/** @lends clay.Renderable# */ {
    /**
     * @type {clay.Material}
     */
    material: null,

    /**
     * @type {clay.Geometry}
     */
    geometry: null,

    /**
     * @type {number}
     */
    mode: glenum.TRIANGLES,

    _renderInfo: null
},
/** @lends clay.Renderable.prototype */
{

    __program: null,

    /**
     * Group of received light.
     */
    lightGroup: 0,
    /**
     * Render order, Nodes with smaller value renders before nodes with larger values.
     * @type {Number}
     */
    renderOrder: 0,

    /**
     * Used when mode is LINES, LINE_STRIP or LINE_LOOP
     * @type {number}
     */
    // lineWidth: 1,

    /**
     * If enable culling
     * @type {boolean}
     */
    culling: true,
    /**
     * Specify which side of polygon will be culled.
     * Possible values:
     *  + {@link clay.Renderable.BACK}
     *  + {@link clay.Renderable.FRONT}
     *  + {@link clay.Renderable.FRONT_AND_BACK}
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/cullFace
     * @type {number}
     */
    cullFace: glenum.BACK,
    /**
     * Specify which side is front face.
     * Possible values:
     *  + {@link clay.Renderable.CW}
     *  + {@link clay.Renderable.CCW}
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/frontFace
     * @type {number}
     */
    frontFace: glenum.CCW,

    /**
     * If enable software frustum culling
     * @type {boolean}
     */
    frustumCulling: true,
    /**
     * @type {boolean}
     */
    receiveShadow: true,
    /**
     * @type {boolean}
     */
    castShadow: true,
    /**
     * @type {boolean}
     */
    ignorePicking: false,
    /**
     * @type {boolean}
     */
    ignorePreZ: false,

    /**
     * @type {boolean}
     */
    ignoreGBuffer: false,

    /**
     * @return {boolean}
     */
    isRenderable: function() {
        // TODO Shader ?
        return this.geometry && this.material && this.material.shader && !this.invisible
            && this.geometry.vertexCount > 0;
    },

    /**
     * Before render hook
     * @type {Function}
     */
    beforeRender: function (_gl) {},

    /**
     * Before render hook
     * @type {Function}
     */
    afterRender: function (_gl, renderStat) {},

    getBoundingBox: function (filter, out) {
        out = Node.prototype.getBoundingBox.call(this, filter, out);
        if (this.geometry && this.geometry.boundingBox) {
            out.union(this.geometry.boundingBox);
        }

        return out;
    },

    /**
     * Clone a new renderable
     * @function
     * @return {clay.Renderable}
     */
    clone: (function() {
        var properties = [
            'castShadow', 'receiveShadow',
            'mode', 'culling', 'cullFace', 'frontFace',
            'frustumCulling',
            'renderOrder', 'lineWidth',
            'ignorePicking', 'ignorePreZ', 'ignoreGBuffer'
        ];
        return function() {
            var renderable = Node.prototype.clone.call(this);

            renderable.geometry = this.geometry;
            renderable.material = this.material;

            for (var i = 0; i < properties.length; i++) {
                var name = properties[i];
                // Try not to overwrite the prototype property
                if (renderable[name] !== this[name]) {
                    renderable[name] = this[name];
                }
            }

            return renderable;
        };
    })()
});

/**
 * @type {number}
 */
Renderable.POINTS = glenum.POINTS;
/**
 * @type {number}
 */
Renderable.LINES = glenum.LINES;
/**
 * @type {number}
 */
Renderable.LINE_LOOP = glenum.LINE_LOOP;
/**
 * @type {number}
 */
Renderable.LINE_STRIP = glenum.LINE_STRIP;
/**
 * @type {number}
 */
Renderable.TRIANGLES = glenum.TRIANGLES;
/**
 * @type {number}
 */
Renderable.TRIANGLE_STRIP = glenum.TRIANGLE_STRIP;
/**
 * @type {number}
 */
Renderable.TRIANGLE_FAN = glenum.TRIANGLE_FAN;
/**
 * @type {number}
 */
Renderable.BACK = glenum.BACK;
/**
 * @type {number}
 */
Renderable.FRONT = glenum.FRONT;
/**
 * @type {number}
 */
Renderable.FRONT_AND_BACK = glenum.FRONT_AND_BACK;
/**
 * @type {number}
 */
Renderable.CW = glenum.CW;
/**
 * @type {number}
 */
Renderable.CCW = glenum.CCW;

export default Renderable;
