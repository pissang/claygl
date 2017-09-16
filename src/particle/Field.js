import Base from '../core/Base';
/**
 * @constructor qtek.particle.Field
 * @extends qtek.core.Base
 */
var Field = Base.extend({}, {
    /**
     * Apply a field to the particle and update the particle velocity
     * @param  {qtek.math.Vector3} velocity
     * @param  {qtek.math.Vector3} position
     * @param  {number} weight
     * @param  {number} deltaTime
     * @memberOf qtek.particle.Field.prototype
     */
    applyTo: function(velocity, position, weight, deltaTime) {}
});

export default Field;
