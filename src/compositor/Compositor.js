define(function(require){

    'use strict';

    var Graph = require('./Graph');
    var TexturePool = require('./TexturePool');

    /**
     * Compositor provide graph based post processing
     * 
     * @constructor qtek.compositor.Compositor
     * @extends qtek.compositor.Graph
     * 
     */
    var Compositor = Graph.derive(function() {
        return {
            // Output node
            _outputs: [],

            _texturePool: new TexturePool()
        };
    },
    /** @lends qtek.compositor.Compositor.prototype */
    {
        addNode: function(node) {
            Graph.prototype.addNode.call(this, node);
            if (!node.outputs) {
                this.addOutput(node);
            }
            node._compositor = this;
        },
        /**
         * @param  {qtek.Renderer} renderer
         */
        render: function(renderer, frameBuffer) {
            if (this._dirty) {
                this.update();
                this._dirty = false;
            }
            for (var i = 0; i < this.nodes.length; i++) {
                // Update the reference number of each output texture
                this.nodes[i].beforeFrame();
            }

            for (var i = 0; i < this._outputs.length; i++) {
                this._outputs[i].updateReference();
            }
            for (var i = 0; i < this._outputs.length; i++) {
                this._outputs[i].render(renderer, frameBuffer);
            }

            for (var i = 0; i < this.nodes.length; i++) {
                // Clear up
                this.nodes[i].afterFrame();
            }
        },

        addOutput: function(node) {
            if (this._outputs.indexOf(node) < 0) {
                this._outputs.push(node);
            }
        },

        removeOutput: function(node) {
            this._outputs.splice(this._outputs.indexOf(node), 1);
        },

        allocateTexture: function (parameters) {
            return this._texturePool.get(parameters);
        },

        releaseTexture: function (parameters) {
            this._texturePool.put(parameters);
        },

        dispose: function (renderer) {
            this._texturePool.clear(renderer.gl);
        }
    });

    return Compositor;
});