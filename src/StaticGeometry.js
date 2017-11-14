/**
 * StaticGeometry can not be changed once they've been setup
 */
import Geometry from './Geometry';
/**
 * @constructor qtek.StaticGeometry
 * @extends qtek.Geometry
 */
var StaticGeometry = Geometry.extend({
    dynamic: false
});
export default StaticGeometry;
