///<reference path="core/util.d.ts" />
///<reference path="core/Cache.d.ts" />
///<reference path="core/Base.d.ts" />
declare module qtek {

    interface IShaderAttribSemantic {
        symbol: string;
        type: string;
    }

    interface IShaderMatrixSemantic {
        symbol: string;
        type: string;
        isTranspose: boolean;
        semanticNoTranspose: string;
    }

    interface IShaderUniformTemplate {
        type: string;
        value: Function;
        semantic: string;
    }

    interface IShaderAttributeTemplate {
        type: string;
        size: number;
        semantic: string;
    }

    interface IShaderUniform {
        type: string;
        value: any;
    }

    interface ILightNumber {
        AMBIENT_LIGHT : number;
        POINT_LIGHT: number;
        SPOT_LIGHT: number;
        AREA_LIGHT: number;
    }

    interface  IShaderOption {
        vertex?: string;
        fragment?: string;
    }

    export class Shader extends core.Base {

        constructor(option?: IShaderOption);

        vertex: string;

        fragment: string;

        precision: string;

        attribSemantics: IDictionary<IShaderAttribSemantic>;

        matrixSemantics: IDictionary<IShaderMatrixSemantic>;

        matrixSemanticKeys: string[];

        uniformTemplates: IDictionary<IShaderUniformTemplate>;

        attributeTemplates: IDictionary<IShaderAttributeTemplate>;

        vertexDefines: IDictionary<any>;

        fragmentDefines: IDictionary<any>;

        lightNumber: ILightNumber;

        cache: core.Cache;

        setVertex(str: string): void;

        setFragment(str: string): void;

        bind(gl: WebGLRenderingContext): void;

        dirty(): void;

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

        enableAttributes(gl: WebGLRenderingContext, attribList: string[]): number[];

        createUniforms(): IDictionary<IShaderUniform>;

        clone(): Shader;

        dispose(gl: WebGLRenderingContext): void;

        static import(shaderStr: string): void;

        static source(name: string): string;
    }
}