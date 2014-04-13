///<reference path="core/Base.d.ts" />
///<reference path="Shader.d.ts" />
declare module qtek {

    interface IMaterialOption {
        name?: string;
        shader?: Shader;
        depthTest?: boolean;
        depthMask?: boolean;
        transparent?: boolean;
        blend?: (gl: WebGLRenderingContext) => void;
    }

    export class Material extends core.Base {

        constructor(option?: IMaterialOption);

        name: string;
        
        uniforms: IDictionary<IShaderUniform>;

        shader: Shader;

        depthTest: boolean;

        depthMask: boolean;

        transparent: boolean;

        blend: (gl: WebGLRenderingContext) => void;

        bind(gl: WebGLRenderingContext): void;

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
    }
}