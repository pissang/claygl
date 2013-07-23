define( function( require ) {

    var Base = require("core/base");
    var _ = require("_");

    var Graph = Base.derive( function() {
        return {
            nodes : []
        }
    }, {
        
        add : function(node) {

            this.nodes.push(node);

            this.dirty("graph");
        },

        remove : function(node) {
            _.without(this.nodes, node);
            this.dirty("graph");
        },

        update : function() {
            for (var i = 0; i < this.nodes.length; i++) {
                this.nodes[i].clear();
            }
            // Traverse all the nodes and build the graph
            for (var i = 0; i < this.nodes.length; i++) {
                var node = this.nodes[i];

                if (!node.inputs) {
                    continue;
                }
                for (var inputName in node.inputs) {
                    var fromPinInfo = node.inputs[inputName];

                    var fromPin = this.findPin(fromPinInfo);
                    if (fromPin) {
                        node.link(inputName, fromPin.node, fromPin.pin);
                    }else{
                        console.warn("Pin of "+fromPinInfo.node+"."+fromPinInfo.pin+" not exist");
                    }
                }
            }

        },

        findPin : function( info ) {
            var node;
            if (typeof(info.node) === 'string') {
                for (var i = 0; i < this.nodes.length; i++) {
                    var tmp = this.nodes[i];
                    if (tmp.name === info.node) {
                        node = tmp;
                    }
                }
            }else{
                node = info.node;
            }
            if (node) {
                if (node.outputs[info.pin]) {
                    return {
                        node : node,
                        pin : info.pin
                    }
                }
            }
        },

        fromJSON : function( json ) {

        }
    })
    
    return Graph;
})