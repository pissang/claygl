import lightEssl from './source/header/light';
import utilEssl from './source/util.essl.js';

import basicEssl from './source/basic.essl.js';
import lambertEssl from './source/lambert.essl.js';
import standardEssl from './source/standard.essl.js';
import wireframeEssl from './source/wireframe.essl.js';
import skyboxEssl from './source/skybox.essl.js';
import prezEssl from './source/prez.essl.js';

import library from './library';
import Shader from '../Shader';


Shader['import'](lightEssl);
Shader['import'](utilEssl);

// Some build in shaders
Shader['import'](basicEssl);
Shader['import'](lambertEssl);
Shader['import'](standardEssl);
Shader['import'](wireframeEssl);
Shader['import'](skyboxEssl);
Shader['import'](prezEssl);

library.template('qtek.basic', Shader.source('qtek.basic.vertex'), Shader.source('qtek.basic.fragment'));
library.template('qtek.lambert', Shader.source('qtek.lambert.vertex'), Shader.source('qtek.lambert.fragment'));
library.template('qtek.wireframe', Shader.source('qtek.wireframe.vertex'), Shader.source('qtek.wireframe.fragment'));
library.template('qtek.skybox', Shader.source('qtek.skybox.vertex'), Shader.source('qtek.skybox.fragment'));
library.template('qtek.prez', Shader.source('qtek.prez.vertex'), Shader.source('qtek.prez.fragment'));
library.template('qtek.standard', Shader.source('qtek.standard.vertex'), Shader.source('qtek.standard.fragment'));


import coloradjustEssl from './source/compositor/coloradjust.essl.js';
import blurEssl from './source/compositor/blur.essl.js';
import lumEssl from './source/compositor/lum.essl.js';
import lutEssl from './source/compositor/lut.essl.js';
import vigentteEssl from './source/compositor/vignette.essl.js';
import outputEssl from './source/compositor/output.essl.js';
import brightEssl from './source/compositor/bright.essl.js';
import downsampleEssl from './source/compositor/downsample.essl.js';
import upsampleEssl from './source/compositor/upsample.essl.js';
import hdrEssl from './source/compositor/hdr.essl.js';
import dofEssl from './source/compositor/dof.essl.js';
import lensflareEssl from './source/compositor/lensflare.essl.js';
import blendEssl from './source/compositor/blend.essl.js';

import fxaaEssl from './source/compositor/fxaa.essl.js';
import fxaa3Essl from './source/compositor/fxaa3.essl.js';

// Some build in shaders
Shader['import'](coloradjustEssl);
Shader['import'](blurEssl);
Shader['import'](lumEssl);
Shader['import'](lutEssl);
Shader['import'](vigentteEssl);
Shader['import'](outputEssl);
Shader['import'](brightEssl);
Shader['import'](downsampleEssl);
Shader['import'](upsampleEssl);
Shader['import'](hdrEssl);
Shader['import'](dofEssl);
Shader['import'](lensflareEssl);
Shader['import'](blendEssl);

Shader['import'](fxaaEssl);
Shader['import'](fxaa3Essl);
