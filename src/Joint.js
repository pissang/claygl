define(function(require) {

    var Node = require("./Node");
    
    var Joint = Node.derive(function() {
        return {
            // Index of bone
            index : -1,
            // Parent bone index
            parentIndex : -1,
        }
    }, {
    });

    return Joint;
})