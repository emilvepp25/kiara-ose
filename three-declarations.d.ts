declare module 'three/examples/jsm/loaders/EXRLoader.js' {
  import * as THREE from 'three';
  export class EXRLoader extends THREE.Loader {
    constructor(manager?: THREE.LoadingManager);
    load(url: string, onLoad: (texture: THREE.Texture) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): THREE.Texture;
  }
}
declare module 'three/examples/jsm/postprocessing/EffectComposer.js' {
  import * as THREE from 'three';
  export class EffectComposer {
    constructor(renderer: THREE.WebGLRenderer, renderTarget?: THREE.WebGLRenderTarget);
    addPass(pass: any): void;
    render(): void;
    setSize(width: number, height: number): void;
  }
}
declare module 'three/examples/jsm/postprocessing/RenderPass.js' {
  import * as THREE from 'three';
  export class RenderPass {
    constructor(scene: THREE.Scene, camera: THREE.Camera);
  }
}
declare module 'three/examples/jsm/postprocessing/ShaderPass.js' {
  export class ShaderPass {
    constructor(shader: object);
    material: any;
  }
}
declare module 'three/examples/jsm/postprocessing/UnrealBloomPass.js' {
  import * as THREE from 'three';
  export class UnrealBloomPass {
    constructor(resolution: THREE.Vector2, strength: number, radius: number, threshold: number);
  }
}
declare module 'three/examples/jsm/shaders/FXAAShader.js' {
  export const FXAAShader: object;
}
