define(function(require) {

    var Base = require('../core/Base');
    /**
     * @constructor qtek.particleSystem.Field
     * @extends qtek.core.Base
     */
    var Field = Base.derive({}, {
        /**
         * Apply a field to the particle and update the particle velocity
         * @param  {qtek.math.Vector3} velocity
         * @param  {qtek.math.Vector3} position
         * @param  {number} weight
         * @param  {number} deltaTime
         * @memberOf qtek.particleSystem.Field.prototype
         */
        applyTo: function(velocity, position, weight, deltaTime) {}
    });

    return Field;
});