/**
 * StaticGeometry can not be changed once they've been setup
 */
import Geometry from './Geometry';
/**
 * @constructor clay.StaticGeometry
 * @extends clay.Geometry
 */
var StaticGeometry = Geometry.extend({
    dynamic: false
});
export default StaticGeometry;
