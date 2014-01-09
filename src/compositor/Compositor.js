define(function(require){

    'use strict';

    var Graph = require("./Graph");

    var Compositor = Graph.derive(function() {
        return {
            // Output node
            _outputs : []
        }
    }, {
        render : function(renderer) {
            if (this._dirty) {
                this.update();
                this._dirty = false;
            }
            for (var i = 0; i < this.nodes.length; i++) {
                // Update the reference number of each output texture
                this.nodes[i].beforeFrame();
            }

            for (var i = 0; i < this.nodes.length; i++) {
                var node = this.nodes[i];
                // Find output node
                if( ! node.outputs){
                    node.render(renderer);
                }
            }

            for (var i = 0; i < this._outputs.length; i++) {
                if (!this._outputs[i]._rendered) {
                    this._outputs[i].render(renderer);
                }
            }

            for (var i = 0; i < this.nodes.length; i++) {
                // Clear up
                this.nodes[i].afterFrame();
            }
        },

        addOutput : function(node) {
            if (node.outputs) {
                this._outputs.push(node);
            }
        },

        removeOutput : function(node) {
            this._outputs.splice(this._outputs.indexOf(node), 1);
        }
    })

    return Compositor;
})