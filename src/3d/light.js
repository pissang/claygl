define(function(require){

    var Node = require("./node");

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

    return Light;
})