import { importShared } from './shared';
import Shader from '../Shader.js';
import basicEssl from './source/basic.glsl.js';

importShared();

Shader.import(basicEssl);
class BasicShader extends Shader {
  constructor() {
    super(Shader.source('clay.basic.vertex'), Shader.source('clay.basic.fragment'));
  }
}

export default BasicShader;
