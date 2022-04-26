/**
 * StaticGeometry can not be changed once they've been setup
 */
import Geometry from './Geometry';
class StaticGeometry extends Geometry {
  dynamic = false;
}
export default StaticGeometry;
