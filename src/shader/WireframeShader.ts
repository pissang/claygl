import { importSharedShader } from './shared';
import Shader from '../Shader.js';
import wireframeEssl from './source/wireframe.glsl.js';

importSharedShader();
Shader.import(wireframeEssl);

class WireframeShader extends Shader {
  constructor() {
    super(Shader.source('clay.wireframe.vertex'), Shader.source('clay.wireframe.fragment'));
  }
}

export default WireframeShader;
