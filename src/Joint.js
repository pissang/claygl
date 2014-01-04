define(function(require) {

    var Node = require("./Node");
    var Base = require("./core/Base");
    
    var Joint = Base.derive(function() {
        return {
            // https://github.com/KhronosGroup/glTF/issues/193#issuecomment-29216576
            name : '',
            // Index of joint
            index : -1,
            // Parent joint index
            parentIndex : -1,

            // Scene node attached to
            node : null
        }
    }, {
    });

    return Joint;
})