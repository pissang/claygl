import Node from './Node';
import Shader from './Shader';

import lightShader from './shader/source/header/light';
Shader['import'](lightShader);

/**
 * @constructor clay.Light
 * @extends clay.Node
 */
var Light = Node.extend(function(){
    return /** @lends clay.Light# */ {
        /**
         * Light RGB color
         * @type {number[]}
         */
        color: [1, 1, 1],

        /**
         * Light intensity
         * @type {number}
         */
        intensity: 1.0,

        // Config for shadow map
        /**
         * If light cast shadow
         * @type {boolean}
         */
        castShadow: true,

        /**
         * Shadow map size
         * @type {number}
         */
        shadowResolution: 512,

        /**
         * Light group, shader with same `lightGroup` will be affected
         *
         * Only useful in forward rendering
         * @type {number}
         */
        group: 0
    };
},
/** @lends clay.Light.prototype. */
{
    /**
     * Light type
     * @type {string}
     * @memberOf clay.Light#
     */
    type: '',

    /**
     * @return {clay.Light}
     * @memberOf clay.Light.prototype
     */
    clone: function() {
        var light = Node.prototype.clone.call(this);
        light.color = Array.prototype.slice.call(this.color);
        light.intensity = this.intensity;
        light.castShadow = this.castShadow;
        light.shadowResolution = this.shadowResolution;

        return light;
    }
});

export default Light;
