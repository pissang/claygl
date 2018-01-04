import Base from '../core/Base';
/**
 * @constructor clay.particle.Field
 * @extends clay.core.Base
 */
var Field = Base.extend({}, {
    /**
     * Apply a field to the particle and update the particle velocity
     * @param  {clay.math.Vector3} velocity
     * @param  {clay.math.Vector3} position
     * @param  {number} weight
     * @param  {number} deltaTime
     * @memberOf clay.particle.Field.prototype
     */
    applyTo: function(velocity, position, weight, deltaTime) {}
});

export default Field;
