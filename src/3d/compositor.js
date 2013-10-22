define(function(require){

    'use strict';

    var Graph = require("./compositor/Graph");

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
                var node = this.nodes[i];
                // Find output node
                if ( ! this._outputs.length) {
                    if( ! node.outputs){
                        node.render(renderer);
                    }
                }
                // Update the reference number of each output texture
                node.updateReference();
            }

            for (var i = 0; i < this._outputs.length; i++) {
                this._outputs[i].render(renderer);
            }
        },

        addOutput : function(node) {
            this._outputs.push(node);
        },

        removeOutput : function(node) {
            this._outputs.splice(this._outputs.indexOf(node), 1);
        }
    })

    return Compositor;
})