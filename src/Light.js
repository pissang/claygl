import Node from './Node';

/**
 * @constructor qtek.Light
 * @extends qtek.Node
 */
var Light = Node.extend(function(){
    return /** @lends qtek.Light# */ {
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
/** @lends qtek.Light.prototype. */
{
    /**
     * Light type
     * @type {string}
     * @memberOf qtek.Light#
     */
    type: '',

    /**
     * @return {qtek.Light}
     * @memberOf qtek.Light.prototype
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
