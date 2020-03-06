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
import gsFrag from '../../shaders/gs.frag';
import screenFrag from '../../shaders/screen.frag';

export default class WebGLView {
  constructor(app) {
    this.app = app;
    this.PARAMS = {
      rotSpeed: 0.005
    };
    this.last = performance.now();
    this.mMinusOnes = new THREE.Vector2(-1, -1);

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

    this.texture1 = this.gpuCompute.createTexture();
    this.texture2 = this.gpuCompute.createTexture();

    this.fillPositionTexture(this.texture1);
    this.fillVelocityTexture(this.texture2);

    // add texture variables
    this.texture1Var = this.gpuCompute.addVariable(
      'texture1',
      glslify(gsFrag),
      this.texture1
    );
    this.texture2Var = this.gpuCompute.addVariable(
      'texture2',
      glslify(gsFrag),
      this.texture2
    );

    // add uniforms
    this.texture1Uniforms = this.texture1Var.material.uniforms;
    this.texture2Uniforms = this.texture2Var.material.uniforms;
    this.texture1Uniforms.time = { value: 0.0 };
    this.texture1Uniforms.delta = { value: 0.0 };
    this.texture1Uniforms.brush = {
      type: 'v2',
      value: new THREE.Vector2(-10, -10)
    };
    this.texture2Uniforms.time = { value: 0.0 };
    this.texture2Uniforms.delta = { value: 0.0 };
    this.texture2Uniforms.brush = {
      type: 'v2',
      value: new THREE.Vector2(-10, -10)
    };

    // add variable dependencies
    this.gpuCompute.setVariableDependencies(this.texture1Var, [
      this.texture1Var,
      this.texture2Var
    ]);
    this.gpuCompute.setVariableDependencies(this.texture2Var, [
      this.texture1Var,
      this.texture2Var
    ]);

    // add custom uniforms
    this.texture1Var.material.uniforms.time = { value: 0.0 };

    // this.texture1Var.wrapS = THREE.RepeatWrapping;
    // this.texture1Var.wrapT = THREE.RepeatWrapping;
    // this.texture2Var.wrapS = THREE.RepeatWrapping;
    // this.texture2Var.wrapT = THREE.RepeatWrapping;

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

      this.texture1Uniforms.brush.value = new THREE.Vector2(
        this.mouse.x / this.width,
        1 - this.mouse.y / this.height
      );
      this.texture2Uniforms.brush.value = new THREE.Vector2(
        this.mouse.x / this.width,
        1 - this.mouse.y / this.height
      );
    });
  }

  initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera();
    this.camera.position.z = 1.5;

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
          texture2: { value: null },
          texture1: { value: null }
        },
        fragmentShader: glslify(screenFrag),
        vertexShader: glslify(genericVert)
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
    const time = performance.now();
    let delta = (time - this.last) / 1000;

    if (delta > 1) delta = 1;
    this.last = time;

    this.texture1Uniforms.time.value = time;
    this.texture1Uniforms.delta.value = delta;
    this.texture2Uniforms.time.value = time;
    this.texture2Uniforms.delta.value = delta;

    this.gpuCompute.compute();

    this.plane.material.uniforms.texture2.value = this.gpuCompute.getCurrentRenderTarget(
      this.texture2Var
    ).texture;
    this.plane.material.uniforms.texture1.value = this.gpuCompute.getCurrentRenderTarget(
      this.texture1Var
    ).texture;
  }

  draw() {
    this.renderer.render(this.scene, this.camera);
  }
}
