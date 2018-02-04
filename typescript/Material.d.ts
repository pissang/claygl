import { Base } from './core/Base';
import { Shader, IShaderUniform } from './Shader';
import { Renderer } from './Renderer';

interface IMaterialOption {
    name?: string;
    shader?: Shader;
    depthTest?: boolean;
    depthMask?: boolean;
    transparent?: boolean;
    blend?: (gl: WebGLRenderingContext) => void;
}

export class Material extends Base {

    constructor(option?: IMaterialOption);

    name: string;

    uniforms: IDictionary<IShaderUniform>;

    shader: Shader;

    depthTest: boolean;

    depthMask: boolean;

    transparent: boolean;

    precision: string;

    blend: (renderer: Renderer) => void;

    bind(renderer: Renderer): void;

    setUniform(symbol: string, value: any): void;

    setUniforms(object: Object): void;

    enableUniform(symbol: string): void;

    disableUniform(symbol: string): void;

    isUniformEnabled(symbol: string): void;

    set(symbol: string, value: any): void;
    set(object: Object): void;

    get(symbol: string): any;

    attachShader(shader: Shader, keepUniform?: boolean): void;

    detachShader(): void;

    define(shaderType: string, symbol: string, val?: number): void;

    unDefine(shaderType: string, symbol: string): void;

    isDefined(shaderType: string, symbol: string): void;

    getDefine(shaderType: string, symbol: string): number;

    enableTexture(symbol: string): void;

    enableTexturesAll(): void;

    disableTexture(symbol: string): void;

    disableTexturesAll(): void;

    isTextureEnabled(symbol: string): boolean;

    hasUniform(symbol: string): boolean;

    setUniform(gl: WebGLRenderingContext, type: string, symbol: string, value: any): boolean;

    setUniformBySemantic(gl: WebGLRenderingContext, semantic: string, val: any): boolean;

}