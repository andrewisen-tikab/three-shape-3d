import './style.css';
import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import CameraControls from 'camera-controls';

import { Shape3D, TransformShapeControls, Shape3DFactory, RaycastUtils } from '../src';
import CONFIG from '../src/config';
import { Mode } from '../src/controls/TransformShapeControls/types';

const SUPPORTED_SHAPES = {
    LINE: 'line',
    AREA: 'area',
    // VOLUME: 'volume'
} as const;
type SupportedShapes = (typeof SUPPORTED_SHAPES)[keyof typeof SUPPORTED_SHAPES];

CameraControls.install({ THREE: THREE });

const factory = new Shape3DFactory();

const _raycaster = new THREE.Raycaster();
// @ts-ignore
_raycaster.firstHitOnly = true;
const _pointer = new THREE.Vector2();

/**
 * Example of how to use the `ThreeSpatialHashGrid` class.
 */
const example = (): void => {
    // Setup scoped variables
    let cameraControls: CameraControls;
    let transformControls: TransformShapeControls;

    let scene: THREE.Scene;
    let group: THREE.Group;
    let shapes: Shape3D[] = [];
    let gridHelperSize: number;
    let backgroundPlane: THREE.Group;
    let backgroundBuildings: THREE.Group;

    let renderer: THREE.WebGLRenderer;
    let cssRenderer: CSS3DRenderer;

    let gltflLoader: GLTFLoader;

    class Selector {
        selectedShape: Shape3D | null;

        constructor() {
            this.selectedShape = null;
        }

        select(shape: Shape3D | null) {
            if (!shape?.isShape3D) throw new Error("Can't select a non-Shape3D object.");
            transformControls.attach(shape);
            this.selectedShape = shape;
        }

        deselect() {
            if (this.selectedShape === null) return;
            this.onDeselect();
            this.selectedShape = null;
        }

        private onDeselect() {}
    }

    const selector = new Selector();

    // Setup the GUI
    const gui = new GUI();
    const actionsFolder = gui.addFolder('Actions');
    // const configFolder = gui.addFolder('Config');
    // const lineFolder = gui.addFolder('Line').open();
    // const areaFolder = gui.addFolder('Area').close();
    // const volumeFolder = gui.addFolder('Volumes').close();
    // const backgroundFolder = gui.addFolder('Background').close();

    // const controlsFolder = gui.addFolder('Controls');

    const createNewShape = (shape: SupportedShapes) => {
        selector.deselect();

        const initialShape = factory.create({
            shapeType: shape,
        });

        group.add(initialShape);
        shapes.push(initialShape);

        transformControls.createShape3D(initialShape);
    };

    const params = {
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
            createNewShape('line');
        },
        createNewArea: () => {
            createNewShape('area');
        },
        createNewVolume: () => {
            // createNewShape('volume');
        },
        deleteAllShapes: () => {
            selector.deselect();
            transformControls.detach();

            shapes.forEach((shape) => {
                shape.dispose();
                group.remove(shape);
            });
            shapes.length = 0;
        },
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

        cssRenderer = new CSS3DRenderer();
        cssRenderer.setSize(window.innerWidth, window.innerHeight);
        cssRenderer.domElement.style.position = 'absolute';
        cssRenderer.domElement.style.top = '0px';
        cssRenderer.domElement.className = 'shape-3d-css-renderer';
        document.body.appendChild(cssRenderer.domElement);

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
        transformControls = new TransformShapeControls(camera, renderer.domElement, factory, {
            centerGizmo: params.centerGizmo,
            showLengthLabels: params.showLengthLabels,
            showAngleLabels: params.showAngleLabels,
        });
        transformControls.setMode(params.gizmoMode as Mode);
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

        gltflLoader = new GLTFLoader();

        const glftScale = 0.5;
        const callback = (scene: THREE.Group) => {
            scene.scale.set(glftScale, glftScale, glftScale);
            scene.matrixAutoUpdate = false;
            scene.traverse((child) => {
                child.matrixAutoUpdate = false;
            });
            scene.updateMatrix();
        };
        gltflLoader.load('../base.glb', (gltf) => {
            backgroundPlane = gltf.scene;
            backgroundPlane.visible = params.showBackgroundPlane;
            callback(gltf.scene);
            scene.add(gltf.scene);
        });

        gltflLoader.load('../buildings.glb', (gltf) => {
            backgroundBuildings = gltf.scene;
            backgroundBuildings.visible = params.showBackgroundBuildings;

            callback(gltf.scene);
            scene.add(gltf.scene);
        });

        const onWindowResize = (): void => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', onWindowResize);

        const render = (): void => {
            renderer.render(scene, camera);
            cssRenderer.render(scene, camera);
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
        shapes.length = 0;

        // Create Shape3D object

        const points: THREE.Vector3[] = [];
        points.push(new THREE.Vector3(0, 0, 0));
        points.push(new THREE.Vector3(20, 0, 20));
        points.push(new THREE.Vector3(0, 0, 20));

        // shape3d = new Shape3D({
        //     lineColor: params.lineColor,
        //     areaColor: params.areaColor,
        //     volumeColor: params.volumeColor,
        //     appearance: {
        //         alwaysShowLine: params.alwaysShowLine,
        //         alwaysShowArea: params.alwaysShowArea,
        //     },
        // })

        shape3d = factory.create({
            shapeType: 'line',
        });
        shape3d.setFromPoints(points);

        // Hide temporary
        // group.add(shape3d);
        // shapes.push(shape3d);

        // Everything ok, lets update the camera position
        cameraControls.setPosition(0, gridHelperSize * 1, gridHelperSize * 1, true);

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
        // transformControls.attach(shape3d);
        scene.add(transformControls);
    };

    // const initDebug = (): void => {
    //     configFolder
    //         .add(params, 'shape', Object.values(SUPPORTED_SHAPES))
    //         .onChange((shape: SupportedShapes) => {
    //             const currentShape = shape3d.setShapeType(shape);
    //             params.shape = currentShape as any;
    //             lineFolder.close();
    //             areaFolder.close();
    //             volumeFolder.close();
    //             switch (currentShape) {
    //                 case SUPPORTED_SHAPES.LINE:
    //                     lineFolder.open();
    //                     break;
    //                 case SUPPORTED_SHAPES.AREA:
    //                     areaFolder.open();
    //                     break;
    //                 case SUPPORTED_SHAPES.VOLUME:
    //                     volumeFolder.open();
    //                     break;
    //                 default:
    //                     break;
    //             }
    //         });

    //     // lineFolder.addColor(params, 'lineColor').onChange((color: number) => {
    //     //     shape3d.setLineColor(color, true);
    //     // });

    //     // lineFolder.add(params, 'alwaysShowLine').onChange((value: boolean) => {
    //     //     shape3d.setAppearance({ alwaysShowLine: value });
    //     // });

    //     // areaFolder.addColor(params, 'areaColor').onChange((color: number) => {
    //     //     shape3d.setAreaColor(color, true);
    //     // });

    //     // areaFolder.add(params, 'alwaysShowArea').onChange((value: boolean) => {
    //     //     shape3d.setAppearance({ alwaysShowArea: value });
    //     // });

    //     // volumeFolder.addColor(params, 'volumeColor').onChange((color: number) => {
    //     //     shape3d.setVolumeColor(color, true);
    //     // });

    //     // lineFolder.add(params, 'closeLine').onChange((value: boolean) => {
    //     //     shape3d.setCloseLine(value);
    //     // });

    //     // volumeFolder.add(params, 'volumeHeight', 1, 100).onChange((value: number) => {
    //     //     shape3d.setVolumeHeight(value);
    //     // });

    //     controlsFolder.add(params, 'centerGizmo').onChange((value: boolean) => {
    //         transformControls.setCenterGizmo(value);
    //     });

    //     controlsFolder
    //         .add(params, 'gizmoMode', ['edit', 'translate', 'rotate', 'scale'])
    //         .onChange((value: string) => {
    //             transformControls.setMode(value as any);
    //         });

    //     controlsFolder.add(params, 'translationSnap', 0, 10).onChange((value: number) => {
    //         transformControls.setTranslationSnap(value === 0 ? null : value);
    //     });

    //     controlsFolder.add(params, 'showLengthLabels').onChange((value: boolean) => {
    //         transformControls.setShowLengthLabels(value);
    //     });

    //     controlsFolder.add(params, 'showAngleLabels').onChange((value: boolean) => {
    //         transformControls.setShowAngleLabels(value);
    //     });

    //     backgroundFolder
    //         .add(params, 'showBackgroundPlane')
    //         .name('Show background plane')
    //         .onChange((value: boolean) => {
    //             backgroundPlane.visible = value;
    //         });

    //     backgroundFolder
    //         .add(params, 'showBackgroundBuildings')
    //         .name('Show background buildings')
    //         .onChange((value: boolean) => {
    //             backgroundBuildings.visible = value;
    //         });

    actionsFolder.add(params, 'createNewLine').name('Create new Line');
    actionsFolder.add(params, 'createNewArea').name('Create new Area');
    //     actionsFolder.add(params, 'createNewVolume').name('Create new Volume');

    //     actionsFolder.add(params, 'deleteAllShapes').name('Delete all shape');
    // };

    // Functions are  created, let's call them!
    init();
    createScene();
    // initDebug();

    const onPointerMove = (event: PointerEvent): void => {
        _pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        _pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const onPointerDown = (_event: PointerEvent): void => {
        // check raycast intersection
        _raycaster.setFromCamera(_pointer, cameraControls.camera);
        const intersects = _raycaster.intersectObjects(shapes);
        if (intersects.length === 0) return;
        const intersect = intersects[0];
        const shape3d = RaycastUtils.getShape3DParent(intersect.object);

        if (!shape3d) return;

        selector.select(shape3d);
    };

    const onKeydown = (event: KeyboardEvent): void => {
        const mode = transformControls.getMode();
        switch (event.key) {
            case 'Escape':
                if (mode === 'create') {
                    transformControls.cancelCreate();
                    selector.deselect();
                } else if (mode === 'edit') {
                    transformControls.detach();
                    selector.deselect();
                }
                break;
            case 'Enter':
                if (mode === 'create') {
                    selector.deselect();
                    const object = transformControls.completeCreate();
                    if (object) {
                        selector.select(object);
                        transformControls.attach(object);
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
};

// Crate a new example and run it
example();
