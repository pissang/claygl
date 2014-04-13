///<reference path="core/Base.d.ts" />
///<reference path="Shader.d.ts" />
///<reference path="webgl.d.ts" />
declare module qtek {

    export class Material extends core.Base {
        
        name: string;
        
        uniforms: IDictionary<IShaderUniform>;

        shader: Shader;

        depthTest: boolean;

        depthMask: boolean;

        transparent: boolean;

        blend: (gl: WebGLRenderingContext) => void;

        bind(gl: WebGLRenderingContext): void;

        setUniform(symbol: string, value: any): void;

        setUniforms(object: object): void;

        enableUniform(symbol: string): void;

        disableUniform(symbol: string): void;

        isUniformEnabled(symbol: string): void;

        set(symbol: string, value: any): void;
        set(object: object): void;

        get(symbol: string): any;

        attachShader(shader: Shader, keepUniform?: boolean): void;

        detachShader(): void;
    }
}