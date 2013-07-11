define(function(require){

    var Graph = require("./compositor/graph/graph");

    var Compositor = Graph.derive(function() {
        return {
        }
    }, {
        render : function(renderer) {
            if(this.isDirty("graph")) {
                this.update();
                this.fresh("graph");
            }
            var finaNode;
            for (var i = 0; i < this.nodes.length; i++) {
                var node = this.nodes[i];
                // Find output node
                if( ! node.outputs){
                    node.render(renderer);
                }
                // Update the reference number of each output texture
                node.updateReference();
            }
        }
    })

    return Compositor;
})