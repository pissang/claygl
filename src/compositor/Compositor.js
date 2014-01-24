define(function(require){

    'use strict';

    var Graph = require("./Graph");

    var Compositor = Graph.derive(function() {
        return {
            // Output node
            _outputs : []
        }
    }, {
        add : function(node) {
            Graph.prototype.add.call(this, node);
            if (!node.outputs) {
                this.addOutput(node);
            }
        },

        render : function(renderer) {
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
                this._outputs[i].render(renderer);
            }

            for (var i = 0; i < this.nodes.length; i++) {
                // Clear up
                this.nodes[i].afterFrame();
            }
        },

        addOutput : function(node) {
            if (this._outputs.indexOf(node) < 0) {
                this._outputs.push(node);
            }
        },

        removeOutput : function(node) {
            this._outputs.splice(this._outputs.indexOf(node), 1);
        }
    })

    return Compositor;
})