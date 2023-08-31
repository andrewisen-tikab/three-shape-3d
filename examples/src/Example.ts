import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { CSM } from 'three/addons/csm/CSM.js';

import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import CameraControls from 'camera-controls';
import { RaycastUtils, Shape3D, Shape3DFactory, TransformShapeControls } from '../../src';
import CONFIG from '../../src/config';
import { Mode } from '../../src/controls/TransformShapeControls/types';
import Selector from './Selector';

import '../style.css';

export const SUPPORTED_SHAPES = {
    LINE: 'line',
    AREA: 'area',
    VOLUME: 'volume',
} as const;

export type SupportedShapes = (typeof SUPPORTED_SHAPES)[keyof typeof SUPPORTED_SHAPES];

const _raycaster = new THREE.Raycaster();
// @ts-ignore
_raycaster.firstHitOnly = true;
const _pointer = new THREE.Vector2();

/**
 * Example class that demonstrates how to use the Shape3D library.
 */
export default class Example {
    /**
     * Makes a floating panel for controllers on the web. Works as a drop-in replacement for dat.gui in most projects.
     */
    public gui!: GUI;
    /**
     * Scenes allow you to set up what and where is to be rendered by three.js. This is where you place objects, lights and cameras.
     */
    public scene!: THREE.Scene;
    /**
     * A group that holds all the shapes.
     */
    public group!: THREE.Group;
    /**
     * The WebGL renderer displays your beautifully crafted scenes using WebGL.
     */
    public renderer!: THREE.WebGLRenderer;
    /**
     * CSS3DRenderer can be used to apply hierarchical 3D transformations to DOM elements via the CSS3 transform property.
     * This renderer is particularly interesting if you want to apply 3D effects to a website without canvas based rendering.
     * It can also be used in order to combine DOM elements with WebGL content.
     *
     * There are, however, some important limitations:
     * - It's not possible to use the material system of three.js.
     * - It's also not possible to use geometries.
     * - CSS3DRenderer only supports 100% browser and display zoom.
     */
    public css3DRenderer!: CSS3DRenderer;
    /**
     * A camera control for three.js, similar to THREE.OrbitControls yet supports smooth transitions and more features.
     */
    public cameraControls!: CameraControls;
    /**
     * Custom transform controls for Shape3D objects.
     */
    public transformShapeControls!: TransformShapeControls;
    /**
     * A factory that creates Shape3D objects.
     */
    public factory!: Shape3DFactory;
    /**
     * The parameters for the GUI.
     */
    public params = {
        boundsX: 50,
        boundsZ: 50,
        shape: SUPPORTED_SHAPES.LINE,
        lineColor: CONFIG.LINE_COLOR,
        areaColor: CONFIG.AREA_COLOR,
        volumeColor: CONFIG.VOLUME_COLOR,
        alwaysShowLine: true,
        alwaysShowArea: true,
        closeLine: false,
        volumeHeight: 5,
        centerGizmo: false,
        gizmoMode: 'edit',
        translationSnap: 0,
        showLengthLabels: true,
        showAngleLabels: true,
        showBackgroundPlane: true,
        showBackgroundBuildings: true,
        createNewLine: () => {
            this.createNewShape3D('line');
        },
        createNewArea: () => {
            this.createNewShape3D('area');
        },
        createNewVolume: () => {
            this.createNewShape3D('volume');
        },
        deleteAllShapes: () => {
            this.selector.deselect();
            this.transformShapeControls.detach();

            this.shapes.forEach((shape) => {
                shape.dispose();
                this.group.remove(shape);
            });
            this.shapes.length = 0;
        },
    };
    public gltflLoader!: GLTFLoader;
    /**
     * Loaded GLTF model.
     */
    public backgroundPlane!: THREE.Object3D;
    /**
     * Loaded GLTF model.
     */
    public backgroundBuildings!: THREE.Object3D;
    /**
     * Shape3D selector.
     */
    public selector!: Selector;
    /**
     * All the shapes in the scene.
     */
    public shapes!: Shape3D[];
    /**
     * The currently selected shape.
     */
    public shape3d: Shape3D | null = null;

    /**
     * Creates an instance of Example.
     */
    constructor() {
        this.install();
    }

    /**
     * Install all necessary dependencies.
     */
    private install(): void {
        CameraControls.install({ THREE });
    }

    /**
     * Initializes the scene.
     */
    public async initAsync(): Promise<void> {
        this.gui = new GUI();
        this.shapes = [];
        this.selector = new Selector();

        // Setup Stats.js
        const stats = new Stats();
        document.body.appendChild(stats.dom);

        this.scene = new THREE.Scene();
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const bgColor = new THREE.Color(0x263238);
        this.renderer.setClearColor(bgColor, 1);

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.css3DRenderer = new CSS3DRenderer();
        this.css3DRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css3DRenderer.domElement.style.position = 'absolute';
        this.css3DRenderer.domElement.style.top = '0px';
        this.css3DRenderer.domElement.className = 'shape-3d-css-renderer';
        document.body.appendChild(this.css3DRenderer.domElement);

        // We'll use the `camera-controls` library to handle our camera.
        const clock = new THREE.Clock();
        const camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            5000,
        );

        this.factory = new Shape3DFactory();
        this.cameraControls = new CameraControls(camera, this.renderer.domElement);
        // Add custom transform shape controls
        this.transformShapeControls = new TransformShapeControls(
            camera,
            this.renderer.domElement,
            this.factory,
            {
                centerGizmo: this.params.centerGizmo,
                showLengthLabels: this.params.showLengthLabels,
                showAngleLabels: this.params.showAngleLabels,
            },
        );
        this.transformShapeControls.setMode(this.params.gizmoMode as Mode);
        this.transformShapeControls.addEventListener('dragging-changed', (event) => {
            this.cameraControls.enabled = !event.value;
        });

        const csmParams = {
            orthographic: false,
            fade: false,
            far: 200,
            mode: 'practical',
            lightX: -1,
            lightY: -1,
            lightZ: -1,
            margin: 100,
            lightFar: 5000,
            lightNear: 1,
            autoUpdateHelper: true,
        };

        const csm = new CSM({
            maxFar: csmParams.far,
            cascades: 4,
            mode: csmParams.mode as any,
            parent: this.scene,
            shadowMapSize: 1024,
            lightDirection: new THREE.Vector3(
                csmParams.lightX,
                csmParams.lightY,
                csmParams.lightZ,
            ).normalize(),
            camera,
        });

        // this.gui
        //     .add(csmParams, 'far', 1, 5000)
        //     .step(1)
        //     .name('shadow far')
        //     .onChange(function (value: number) {
        //         csm.maxFar = value;
        //         csm.updateFrustums();
        //     });

        // this.gui
        //     .add(csmParams, 'lightNear', 1, 10000)
        //     .name('light near')
        //     .onChange(function (value: number) {
        //         for (let i = 0; i < csm.lights.length; i++) {
        //             csm.lights[i].shadow.camera.near = value;
        //             csm.lights[i].shadow.camera.updateProjectionMatrix();
        //         }
        //     });

        // this.gui
        //     .add(csmParams, 'margin', 0, 200)
        //     .name('light margin')
        //     .onChange(function (value: number) {
        //         csm.lightMargin = value;
        //     });

        // this.gui
        //     .add(csmParams, 'lightFar', 1, 10000)
        //     .name('light far')
        //     .onChange(function (value: number) {
        //         for (let i = 0; i < csm.lights.length; i++) {
        //             csm.lights[i].shadow.camera.far = value;
        //             csm.lights[i].shadow.camera.updateProjectionMatrix();
        //         }
        //     });

        // Setup a positional helper
        const planeGeometry = new THREE.PlaneGeometry(1, 1);
        planeGeometry.translate(1 / 2, -1 / 2, 0);

        this.gltflLoader = new GLTFLoader();

        const glftScale = 0.5;
        const callback = (scene: THREE.Group) => {
            scene.scale.set(glftScale, glftScale, glftScale);
            scene.matrixAutoUpdate = false;
            scene.traverse((_child) => {
                const child = _child as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
                child.matrixAutoUpdate = false;
                child.receiveShadow = true;
                child.castShadow = true;
                child.updateMatrix();
                if (child.isMesh && child.material) {
                    csm.setupMaterial(child.material);
                }
                // if (child.material) {
                //     child.material = new THREE.MeshPhongMaterial({
                //         // grey color
                //         color: 0x808080,
                //     });
                // }
            });
            scene.updateMatrix();
            scene.receiveShadow = true;
            scene.castShadow = true;
        };

        const backgroundPlane = await this.gltflLoader.loadAsync('../../../base.glb');

        this.backgroundPlane = backgroundPlane.scene;
        this.backgroundPlane.visible = this.params.showBackgroundPlane;
        callback(backgroundPlane.scene);

        this.scene.add(backgroundPlane.scene);

        const backgroundBuildings = await this.gltflLoader.loadAsync('../../../buildings.glb');
        this.backgroundBuildings = backgroundBuildings.scene;
        this.backgroundBuildings.visible = this.params.showBackgroundBuildings;

        callback(backgroundBuildings.scene);
        this.scene.add(backgroundBuildings.scene);

        const onWindowResize = (): void => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', onWindowResize);

        const render = (): void => {
            this.renderer.render(this.scene, camera);
            this.css3DRenderer.render(this.scene, camera);
        };

        const animate = (_currentTime: number = 0): void => {
            // Camera controls
            const delta = clock.getDelta();
            this.cameraControls.update(delta);
            camera.updateMatrixWorld();
            csm.update();

            // Render
            requestAnimationFrame(animate);
            stats.update();
            render();
        };

        // Everything is setup, lets go!
        animate();

        this.setupEvents();
        this.addE2ETest();
    }

    private addE2ETest() {
        const div = document.createElement('div');
        div.id = 'e2e';
        document.body.appendChild(div);
    }

    /**
     * Setup Pointer events and bind them.
     */
    private setupEvents(): void {
        const onPointerMove = (event: PointerEvent): void => {
            _pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            _pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        };

        const onPointerDown = (_event: PointerEvent): void => {
            // check raycast intersection
            _raycaster.setFromCamera(_pointer, this.cameraControls.camera);
            const intersects = _raycaster.intersectObjects(this.shapes);
            if (intersects.length === 0) return;
            const intersect = intersects[0];
            const shape3d = RaycastUtils.getShape3DParent(intersect.object);

            if (!shape3d) return;

            this.selector.select(shape3d);
        };

        const onKeydown = (event: KeyboardEvent): void => {
            const mode = this.transformShapeControls.getMode();
            switch (event.key) {
                case 'Escape':
                    if (mode === 'create') {
                        this.transformShapeControls.cancelCreate();
                        this.selector.deselect();
                    } else if (mode === 'edit') {
                        this.transformShapeControls.detach();
                        this.selector.deselect();
                    }
                    break;
                case 'Enter':
                    if (mode === 'create') {
                        this.selector.deselect();
                        const object = this.transformShapeControls.completeCreate();
                        if (object) {
                            this.selector.select(object);
                            this.transformShapeControls.attach(object);
                        }
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKeydown);
    }

    /**
     * Helper function to create a new shape3D object.
     * @param shape {@link SupportedShapes}
     */
    private createNewShape3D(shape: SupportedShapes): void {
        this.selector.deselect();

        const initialShape = this.factory.create({
            shapeType: shape,
        });

        this.group.add(initialShape);
        this.shapes.push(initialShape);

        this.transformShapeControls.createShape3D(initialShape);
    }

    /**
     * Create a scene from scratch.
     * This will clear the scene and re-add the grid.
     */
    public createScene(): void {
        // Calculate the grid helper size and divisions
        const gridHelperSize = Math.min(this.params.boundsX, this.params.boundsZ);

        const deltaXHalf = this.params.boundsX / 2;
        const deltaZHalf = this.params.boundsZ / 2;

        // Clear everything and re-add the grid.
        this.group.clear();
        this.shapes.length = 0;

        // Create Shape3D object

        this.shape3d = null;

        // Everything ok, lets update the camera position
        this.cameraControls.setPosition(0, gridHelperSize * 1, gridHelperSize * 1, true);

        // Create 1x1 grid
        const gridHelper = new THREE.GridHelper(gridHelperSize, gridHelperSize, 0xffffff, 0xffffff);
        gridHelper.position.x = deltaXHalf;
        gridHelper.position.z = deltaZHalf;
        const material = gridHelper.material as THREE.Material;
        material.opacity = 0.2;
        material.transparent = true;
        this.group.add(gridHelper);

        // Create axes
        const axesHelper = new THREE.AxesHelper(this.params.boundsX * 2);
        axesHelper.setColors(
            new THREE.Color(0xff0000),
            new THREE.Color(0x00ff00),
            new THREE.Color(0x0000ff),
        );
        this.group.add(axesHelper);

        // Attach object
        // transformControls.attach(shape3d);
        this.scene.add(this.transformShapeControls);
    }

    public addDummyShape(select = false): void {
        const points: THREE.Vector3[] = [];
        // points.push(new THREE.Vector3(0, 0, 0));
        // points.push(new THREE.Vector3(10, 0, 0));

        points.push(new THREE.Vector3(0, 0, 0));
        points.push(new THREE.Vector3(20, 0, 0));
        points.push(new THREE.Vector3(0, 0, 20));

        const shape3d = this.factory.create({
            shapeType: 'line',
        });
        shape3d.setFromPoints(points);

        this.group.add(shape3d);
        this.shapes.push(shape3d);

        if (select) {
            this.selector.select(shape3d);
            this.transformShapeControls.attach(shape3d);
        }
    }

    public memoryTest(bound: number = 1): void {
        // Random value between 0 and 20
        const random = (min: number, max: number): number => {
            return Math.random() * (max - min) + min;
        };

        const x = random(0, bound);
        const z = random(0, bound);

        const points: THREE.Vector3[] = [];
        points.push(new THREE.Vector3(0, 0, 0));
        points.push(new THREE.Vector3(x, 0, z));
        points.push(new THREE.Vector3(0, 0, z));

        const shape3d = this.factory.create({
            shapeType: 'line',
        });
        shape3d.setFromPoints(points);

        this.group.add(shape3d);
        this.shapes.push(shape3d);
    }
}
