define(function(require) {

    var Base = require("core/Base");
    var Vector4 = require("core/Vector4");

    var ReflectionPass = Base.derive(function() {
        // Vector4
        plane : new Vector4(0, 1, 0, 0)
    }, {
        render : function(renderer, scene, camera) {

        }
    });

    return ReflectionPass;
});