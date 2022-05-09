import { importSharedShader } from './shared';
import Shader from '../Shader.js';
import standardEssl from './source/standard.glsl.js';

importSharedShader();
Shader.import(standardEssl);

class StandardShader extends Shader {
  constructor() {
    super(Shader.source('clay.standard.vertex'), Shader.source('clay.standard.fragment'));
  }
}

export default StandardShader;
