/**
 * Node Group
 */
define(function(require) {

    var Node = require("./Node");
    var Graph = require("./Graph");

    var Group = Node.derive(function() {
        return {
            nodes : [],

            _outputTextures : {}
        }
    }, {
        add : function(node) {
            return Graph.prototype.add.call(this, node);
        },

        remove : function(node) {
            return Graph.prototype.remove.call(this, node);
        },

        update : function() {
            return Graph.prototype.update.call(this);
        },

        findNode : function(name) {
            return Graph.prototype.findNode.call(this);
        },

        findPin : function(info) {
            return Graph.prototype.findPin.call(this, info);
        },

        render : function(renderer) {
            if(this._dirty) {
                this.update();
                this._dirty = false;
            }
            
            var groupInputTextures = {};

            for (var inputName in this.inputLinks) {
                var link = this.inputLinks[inputName];
                var inputTexture = link.node.getOutput(renderer, link.pin);
                groupInputTextures[inputName] = inputTexture;
            }

            for (var i = 0; i < this.nodes.length; i++) {
                var node = this.nodes[i];
                // Update the reference number of each output texture
                node.updateReference();
                // Set the input texture to portal node of group
                if (node.groupInputs) {
                    this._updateGroupInputs(node, groupInputTextures);
                }
            }
            for (var i = 0; i < this.nodes.length; i++) {
                var node = this.nodes[i];
                if (node.groupOutputs) {
                    this._updateGroupOutputs(node, renderer);
                }
                // Direct output
                if ( ! node.outputs) {
                    node.render(renderer);
                }
            }
            for (var name in this.groupOutputs) {
                if ( ! this._outputTextures[name]) {
                    console.error('Group output pin "' + name + '" is not attached');
                }
            }

            for (var inputName in this.inputLinks) {
                var link = this.inputLinks[inputName];
                link.node.removeReference( link.pin );
            }
        },

        _updateGroupInputs : function(node, groupInputTextures) {
            for (var name in groupInputTextures) {
                var texture = groupInputTextures[name];
                if (node.groupInputs[name]) {
                    var pin  = node.groupInputs[name];
                    node.pass.setUniform(pin, texture);
                }
            }
        },

        _updateGroupOutputs : function(node, renderer) {
            for (var name in node.groupOutputs) {
                var groupOutputPinName = node.groupOutputs[name];
                var texture = node.getOutput(renderer, name);
                this._outputTextures[groupOutputPinName] = texture;
            }
        }
    });

    return Group;
})