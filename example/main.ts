import './style.css';
import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import CameraControls from 'camera-controls';

import { Shape3D, TransformShapeControls } from '../src';
import { SUPPORTED_SHAPES, SupportedShapes } from '../src/types';

CameraControls.install({ THREE: THREE });

/**
 * Example of how to use the `ThreeSpatialHashGrid` class.
 */
const example = (): void => {
    // Setup scoped variables
    let cameraControls: CameraControls;
    let transformControls: TransformShapeControls;

    let scene: THREE.Scene;
    let group: THREE.Group;
    let gridHelperSize: number;

    let renderer: THREE.WebGLRenderer;

    // Setup the GUI
    const gui = new GUI();
    const configFolder = gui.addFolder('Config');
    const lineFolder = gui.addFolder('Line').open();
    const areaFolder = gui.addFolder('Area').close();
    const volumeFolder = gui.addFolder('Volumes').close();

    const controlsFolder = gui.addFolder('Controls');

    const params = {
        boundsX: 16,
        boundsZ: 16,
        shape: SUPPORTED_SHAPES.LINE,
        lineColor: 0xffffff,
        areaColor: 0xffffff,
        volumeColor: 0xffffff,
        closeLine: false,
        volumeHeight: 5,
        centerGizmo: true,
        gizmoMode: 'translate',
        translationSnap: 0,
    };

    // Setup Stats.js
    const stats = new Stats();
    document.body.appendChild(stats.dom);

    /**
     * Initialize a basic three.js scene with all the bells and whistles.
     */
    const init = () => {
        // Setup a basic three.js scene
        scene = new THREE.Scene();
        group = new THREE.Group();
        scene.add(group);
        renderer = new THREE.WebGLRenderer({ antialias: true });

        const bgColor = new THREE.Color(0x263238);
        renderer.setClearColor(bgColor, 1);

        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // We'll use the `camera-controls` library to handle our camera.
        const clock = new THREE.Clock();
        const camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            1,
            1000,
        );

        cameraControls = new CameraControls(camera, renderer.domElement);
        // Add custom transform shape controls
        transformControls = new TransformShapeControls(camera, renderer.domElement);
        transformControls.addEventListener('dragging-changed', (event) => {
            cameraControls.enabled = !event.value;
        });

        // Setup a basic lighting
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.castShadow = true;
        light.shadow.mapSize.set(2048, 2048);
        light.position.set(10, 10, 10);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xb0bec5, 0.8));

        // Setup a positional helper
        const planeGeometry = new THREE.PlaneGeometry(1, 1);
        planeGeometry.translate(1 / 2, -1 / 2, 0);

        const onWindowResize = (): void => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', onWindowResize);

        const render = (): void => {
            renderer.render(scene, camera);
        };

        const animate = (_currentTime: number = 0): void => {
            // Camera controls
            const delta = clock.getDelta();
            cameraControls.update(delta);

            // Render
            requestAnimationFrame(animate);
            stats.update();
            render();
        };

        // Everything is setup, lets go!
        animate();
    };

    let shape3d: Shape3D;

    /**
     * Create a new spatial hash grid based on the provided {@link params}, and add it to the scene.
     */
    const createScene = (): void => {
        // Calculate the grid helper size and divisions
        gridHelperSize = Math.min(params.boundsX, params.boundsZ);

        const deltaXHalf = params.boundsX / 2;
        const deltaZHalf = params.boundsZ / 2;

        // Clear everything and re-add the grid.
        group.clear();

        // Create Shape3D object

        const points: THREE.Vector3[] = [];
        points.push(new THREE.Vector3(0, 0, 0));
        points.push(new THREE.Vector3(5, 0, 5));
        points.push(new THREE.Vector3(0, 0, 5));

        shape3d = new Shape3D({
            lineColor: params.lineColor,
            areaColor: params.areaColor,
            volumeColor: params.volumeColor,
        }).setFromPoints(points);

        group.add(shape3d);

        // Everything ok, lets update the camera position
        cameraControls.setPosition(0, gridHelperSize * 2, gridHelperSize * 2, true);

        // Create 1x1 grid
        const gridHelper = new THREE.GridHelper(gridHelperSize, gridHelperSize, 0xffffff, 0xffffff);
        gridHelper.position.x = deltaXHalf;
        gridHelper.position.z = deltaZHalf;
        const material = gridHelper.material as THREE.Material;
        material.opacity = 0.2;
        material.transparent = true;
        group.add(gridHelper);

        // Create axes
        const axesHelper = new THREE.AxesHelper(params.boundsX * 2);
        axesHelper.setColors(
            new THREE.Color(0xff0000),
            new THREE.Color(0x00ff00),
            new THREE.Color(0x0000ff),
        );
        group.add(axesHelper);

        // Attach object
        transformControls.attach(shape3d);
        scene.add(transformControls);
    };

    const initDebug = (): void => {
        configFolder
            .add(params, 'shape', Object.values(SUPPORTED_SHAPES))
            .onChange((shape: SupportedShapes) => {
                const currentShape = shape3d.setShape(shape);
                params.shape = currentShape as any;
                lineFolder.close();
                areaFolder.close();
                volumeFolder.close();
                switch (currentShape) {
                    case SUPPORTED_SHAPES.LINE:
                        lineFolder.open();
                        break;
                    case SUPPORTED_SHAPES.AREA:
                        areaFolder.open();
                        break;
                    case SUPPORTED_SHAPES.VOLUME:
                        volumeFolder.open();
                        break;
                    default:
                        break;
                }
            });

        lineFolder.addColor(params, 'lineColor').onChange((color: number) => {
            shape3d.setLineColor(color);
        });

        areaFolder.addColor(params, 'areaColor').onChange((color: number) => {
            shape3d.setAreaColor(color);
        });

        volumeFolder.addColor(params, 'volumeColor').onChange((color: number) => {
            shape3d.setVolumeColor(color);
        });

        lineFolder.add(params, 'closeLine').onChange((value: boolean) => {
            shape3d.setCloseLine(value);
        });

        volumeFolder.add(params, 'volumeHeight', 1, 100).onChange((value: number) => {
            shape3d.setVolumeHeight(value);
        });

        controlsFolder.add(params, 'centerGizmo').onChange((value: boolean) => {
            transformControls.setCenterGizmo(value);
        });

        controlsFolder
            .add(params, 'gizmoMode', ['translate', 'rotate', 'scale'])
            .onChange((value: string) => {
                transformControls.setMode(value as any);
            });

        controlsFolder.add(params, 'translationSnap', 0, 10).onChange((value: number) => {
            transformControls.setTranslationSnap(value === 0 ? null : value);
        });
    };

    // Functions are  created, let's call them!
    init();
    createScene();
    initDebug();
};

// Crate a new example and run it
example();
