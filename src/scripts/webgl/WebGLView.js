import * as THREE from 'three';
import GLTFLoader from 'three-gltf-loader';
import glslify from 'glslify';
import Tweakpane from 'tweakpane';
import { debounce } from '../utils/debounce';
import GPUComputationRenderer from './GPUComputationRenderer';
import fragmentShaderVel from '../../shaders/fragmentShaderVel.frag';
import fragmentShaderPos from '../../shaders/fragmentShaderPos.frag';
import testFrag from '../../shaders/test.frag';
import genericVert from '../../shaders/generic.vert';
import { WebGLLights } from 'three';

export default class WebGLView {
  constructor(app) {
    this.app = app;
    this.PARAMS = {
      rotSpeed: 0.005
    };

    this.init();
  }

  async init() {
    this.initThree();
    this.initPlane();
    this.initGPUCompRend();
    this.initTweakPane();
    this.initMouseMoveListen();
    this.initResizeHandler();
  }

  initGPUCompRend() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.BOUNDS = 800;
    this.BOUNDS_HALF = this.BOUNDS / 2;

    this.gpuCompute = new GPUComputationRenderer(
      this.width,
      this.height,
      this.renderer
    );

    this.pos0 = this.gpuCompute.createTexture();
    this.vel0 = this.gpuCompute.createTexture();

    this.fillPositionTexture(this.pos0);
    this.fillVelocityTexture(this.vel0);

    // add texture variables
    this.velVar = this.gpuCompute.addVariable(
      'textureVelocity',
      // glslify(fragmentShaderVel),
      fragmentShaderVel,
      this.pos0
    );
    this.posVar = this.gpuCompute.addVariable(
      'texturePosition',
      // glslify(fragmentShaderPos),
      fragmentShaderPos,
      this.vel0
    );

    // add variable dependencies
    this.gpuCompute.setVariableDependencies(this.velVar, [
      this.velVar,
      this.posVar
    ]);
    this.gpuCompute.setVariableDependencies(this.posVar, [
      this.velVar,
      this.posVar
    ]);

    // add custom uniforms
    this.velVar.material.uniforms.time = { value: 0.0 };

    // this.velVar.wrapS = THREE.RepeatWrapping;
    // this.velVar.wrapT = THREE.RepeatWrapping;
    // this.posVar.wrapS = THREE.RepeatWrapping;
    // this.posVar.wrapT = THREE.RepeatWrapping;

    // error check
    const error = this.gpuCompute.init();
    if (error !== null) {
      console.error(error);
    }
  }

  fillPositionTexture(texture) {
    var theArray = texture.image.data;

    for (var k = 0, kl = theArray.length; k < kl; k += 4) {
      var x = Math.random() * this.BOUNDS - this.BOUNDS_HALF;
      var y = Math.random() * this.BOUNDS - this.BOUNDS_HALF;
      var z = Math.random() * this.BOUNDS - this.BOUNDS_HALF;

      theArray[k + 0] = x;
      theArray[k + 1] = y;
      theArray[k + 2] = z;
      theArray[k + 3] = 1;
    }
  }

  fillVelocityTexture(texture) {
    var theArray = texture.image.data;

    for (var k = 0, kl = theArray.length; k < kl; k += 4) {
      var x = Math.random() - 0.5;
      var y = Math.random() - 0.5;
      var z = Math.random() - 0.5;

      theArray[k + 0] = x * 10;
      theArray[k + 1] = y * 10;
      theArray[k + 2] = z * 10;
      theArray[k + 3] = 1;
    }
  }

  initResizeHandler() {
    window.addEventListener(
      'resize',
      debounce(() => {
        this.renderer.setSize(this.width, this.height);
      }, 500)
    );
  }

  initTweakPane() {
    this.pane = new Tweakpane();

    this.pane
      .addInput(this.PARAMS, 'rotSpeed', {
        min: 0.0,
        max: 0.5
      })
      .on('change', value => {});
  }

  initMouseMoveListen() {
    this.mouse = new THREE.Vector2();
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    window.addEventListener('mousemove', ({ clientX, clientY }) => {
      this.mouse.x = clientX; //(clientX / this.width) * 2 - 1;
      this.mouse.y = clientY; //-(clientY / this.height) * 2 + 1;
    });
  }

  initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera();
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // this.renderer.autoClear = true;
  }

  initPlane() {
    this.plane = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(1, 1, 32, 32),
      new THREE.ShaderMaterial({
        uniforms: {
          computedTexture: { value: null },
          fragmentShader: glslify(testFrag),
          vertexShader: glslify(genericVert)
        }
      })
      // new THREE.MeshNormalMaterial()
    );

    this.scene.add(this.plane);
    console.log(this.scene);
  }

  resize() {
    if (!this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.fovHeight =
      2 *
      Math.tan((this.camera.fov * Math.PI) / 180 / 2) *
      this.camera.position.z;
    this.fovWidth = this.fovHeight * this.camera.aspect;

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update() {
    const time = performance.now() * 0.0005;

    this.velVar.material.uniforms.time.value = time;

    this.gpuCompute.compute();

    this.plane.material.uniforms.computedTexture.value = this.gpuCompute.getCurrentRenderTarget(
      this.posVar
    ).texture;
  }

  draw() {
    this.renderer.render(this.scene, this.camera);
  }
}
