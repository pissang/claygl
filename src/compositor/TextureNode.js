import CompositorNode from './CompositorNode';

/**
 * @constructor clay.compositor.TextureNode
 * @extends clay.compositor.CompositorNode
 */
var TextureNode = CompositorNode.extend(function() {
    return /** @lends clay.compositor.TextureNode# */ {
        /**
         * @type {clay.Texture2D}
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

export default TextureNode;
