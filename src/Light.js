define(function(require){

    var Node = require("./Node");
    var Shader = require("./Shader");

    /**
     * constructor qtek.Light
     */
    var Light = Node.derive(function(){
        /** @lends qtek.Light# */
        return {
            /**
             * Light RGB color
             * @type {number[]}
             */
            color : [1, 1, 1],

            /**
             * Light intensity
             * @type {number}
             */
            intensity : 1.0,
            
            // Config for shadow map
            /**
             * If light cast shadow
             * @type {boolean}
             */
            castShadow : true,

            /**
             * Shadow map size
             * @type {number}
             */
            shadowResolution : 512
        }
    }, {
        clone: function() {
            var light = Node.prototype.clone.call(this);
            light.color = Array.prototype.slice.call(this.color);
            light.intensity = this.intensity;
            light.castShadow = this.castShadow;
            light.shadowResolution = this.shadowResolution;

            return light;
        }
    });

    Shader.import(require('text!./light/light.essl'));

    return Light;
})