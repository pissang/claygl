define(function(require) {

    'use strict';

    var Node = require('./Node');

    /**
     * @constructor qtek.compositor.TextureNode
     * @extends qtek.compositor.Node
     */
    var TextureNode = Node.extend(function() {
        return /** @lends qtek.compositor.TextureNode# */ {
            /**
             * @type {qtek.Texture2D}
             */
            texture: null,

            // Texture node must have output without parameters
            outputs: {
                color: {}
            }
        };
    }, function () {
    }, {

        getOutput: function (renderer, name) {
            return this.texture;
        },

        // Do nothing
        beforeFrame: function () {},
        afterFrame: function () {}
    });

    return TextureNode;
});