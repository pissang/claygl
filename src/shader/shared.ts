import lightEssl from './source/header/light';
import utilEssl from './source/util.glsl.js';
import shadowmapEssl from '../shader/source/shadowmap.glsl.js';
import Shader from '../Shader';

Shader.import(lightEssl);
Shader.import(utilEssl);
Shader.import(shadowmapEssl);
