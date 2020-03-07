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
      feed: 0.037,
      kill: 0.06,
      diffRateA: 0.2097,
      diffRateB: 0.105,
      delta: 0.5
      // invert: true,
    };
    this.last = performance.now();

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

    this.fillInitialTexture(this.texture1);

    // add texture variables
    this.texture1Var = this.gpuCompute.addVariable(
      'texture1',
      glslify(gsFrag),
      this.texture1
    );

    // add uniforms
    this.texture1Uniforms = this.texture1Var.material.uniforms;
    this.texture1Uniforms.time = { value: 0.0 };
    this.texture1Uniforms.delta = { value: 0.0 };
    this.texture1Uniforms.brush = {
      type: 'v2',
      value: new THREE.Vector2(-10, -10)
    };
    this.texture1Uniforms.feed = { value: 0.037 };
    this.texture1Uniforms.kill = { value: 0.06 };
    this.texture1Uniforms.diffRateA = { value: 0.2097 };
    this.texture1Uniforms.diffRateB = { value: 0.105 };
    this.texture1Uniforms.delta = { value: 0.5 };



    // add variable dependencies
    this.gpuCompute.setVariableDependencies(this.texture1Var, [
      this.texture1Var
    ]);


    this.texture1Var.wrapS = THREE.ClampToEdgeWrapping;
    this.texture1Var.wrapT = THREE.ClampToEdgeWrapping;

    // error check
    const error = this.gpuCompute.init();
    if (error !== null) {
      console.error(error);
    }

    this.gpuCompute.compute();

    this.texture1Uniforms.brush = {
      type: 'v2',
      value: new THREE.Vector2(0.5, 0.5)
    };

    this.render();
  }

  fillInitialTexture(texture) {
    var theArray = texture.image.data;

    for (var k = 0, kl = theArray.length; k < kl; k += 4) {
      var x = 1.0;
      var y = 0.0;
      var z = 0.0;

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
      .addInput(this.PARAMS, 'feed', {
        min: 0.0,
        max: 0.2
      })
      .on('change', value => {
        this.texture1Uniforms.feed.value = value;
      });

    this.pane
      .addInput(this.PARAMS, 'kill', {
        min: 0.0,
        max: 0.2
      })
      .on('change', value => {
        this.texture1Uniforms.kill.value = value;
      });

    this.pane
      .addInput(this.PARAMS, 'diffRateA', {
        min: 0.0,
        max: 1.5
      })
      .on('change', value => {
        this.texture1Uniforms.diffRateA.value = value;
      });

    this.pane
      .addInput(this.PARAMS, 'diffRateB', {
        min: 0.0,
        max: 1.5
      })
      .on('change', value => {
        this.texture1Uniforms.diffRateB.value = value;
      });

    this.pane
      .addInput(this.PARAMS, 'delta', {
        min: 0.0,
        max: 1.5
      })
      .on('change', value => {
        this.texture1Uniforms.delta.value = value;
      });
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
    });
  }

  initThree() {
    this.scene = new THREE.Scene();

    // this.camera = new THREE.PerspectiveCamera();
    this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10000, 10000);
    // this.camera.position.z = 3.5;

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

  render() {
    const time = performance.now();
    this.last = time;

    this.texture1Uniforms.time.value = time;

    for (let i = 0; i < 2; i++) {
      this.gpuCompute.compute();


      this.plane.material.uniforms.texture1.value = this.gpuCompute.getCurrentRenderTarget(
        this.texture1Var
      ).texture;

    }


    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(this.render.bind(this));
  }

}
