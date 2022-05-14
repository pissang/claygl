import Shader from '../Shader.js';
import { wireframeFragment, wireframeVertex } from './source/wireframe.glsl.js';

class WireframeShader extends Shader<typeof wireframeVertex, typeof wireframeFragment> {
  constructor() {
    super(wireframeVertex, wireframeFragment);
  }
}

export default WireframeShader;
