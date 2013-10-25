define(function(require){

    var Node = require("./Node");
    var Shader = require("./Shader");

    var Light = Node.derive(function(){
        return {
            color : [1, 1, 1],
            intensity : 1.0,
            
            // Config for shadow map
            castShadow : true,
            shadowResolution : 512
        }
    }, {
    });

    Shader.import(require('text!./light/light.essl'));

    return Light;
})