import * as THREE from 'three';
import Example from '../../src/Example';
import ObjectsOnShapeFactory from '../../src/ObjectsOnShapeFactory';

const GLB_MODELS = {
    metalFence: {
        name: 'Metal fence',
        url: 'metal-fence',
        model: new THREE.Object3D(),
        box: new THREE.Box3(),
        modelWidth: 0,
    },
    scaffolding: {
        name: 'Scaffolding',
        url: 'scaffolding',
        model: new THREE.Object3D(),
        box: new THREE.Box3(),
        modelWidth: 0,
    },
    woodenBarricade: {
        name: 'Wooden barricade',
        url: 'wooden-barricade',
        model: new THREE.Object3D(),
        box: new THREE.Box3(),
        modelWidth: 0,
    },
};

const example = new Example();
example.initAsync();
example.createScene();
example.addDummyShape(true);

const { gltflLoader, selector, transformShapeControls, gui } = example;

let modelWidth: number;

// We will use the selected object as the shape to place objects on.
const selectedShape3D = selector.getSelectedShape();
if (!selectedShape3D) throw new Error('No selected object');

/**
 * The model is loaded asynchronously, so we need to keep a reference to it.
 */
let model: THREE.Object3D;
/**
 * We will add the objects to a group, so we can easily remove them.
 */
const modelGroup = new THREE.Group();
selectedShape3D.add(modelGroup);

// A custom factory to create the objects on the shape.
const objectsOnShapeFactory = new ObjectsOnShapeFactory();
objectsOnShapeFactory.setPoolPosition([0, -1_000_000, 0]);

/**
 * Handle the creation of the objects on the shape.
 */
const addObjectsOnShape = () => {
    beginPool();
    adjustPool();
    // endPool();
};

/**
 * Called when **before (!)** the user starts to drag the shape.
 */
const beginPool = () => {
    objectsOnShapeFactory.preparePool(modelGroup, model, selectedShape3D, { width: modelWidth });
};

/**
 * Called when the user drags the shape.
 */
const adjustPool = () => {
    objectsOnShapeFactory.adjustPoolMatrices(selectedShape3D, { width: modelWidth });
};

/**
 * Called when the user stops dragging the shape.
 */
const endPool = () => {
    objectsOnShapeFactory.endPool();
};

// Setup event listeners.
// selectedObject.addEventListener('vertex-updated', addObjectsOnShape);
transformShapeControls.addEventListener('mouseDown', beginPool);
transformShapeControls.addEventListener('vertexChange', adjustPool);
transformShapeControls.addEventListener('mouseUp', endPool);

// Setup the GUI.
const modelKeys: string[] = [];

const loadModelsAsync = async () => {
    // First, load all models
    for await (const [key, value] of Object.entries(GLB_MODELS)) {
        const { url, box } = value;
        const gltf = await gltflLoader.loadAsync(`../../../${url}.glb`);
        box.setFromObject(gltf.scene);
        value.modelWidth = box.max.z - box.min.z;
        value.model = gltf.scene;

        modelKeys.push(key);
    }

    // Then, build the GUI
    const modelsFolder = gui.addFolder('Models');
    const modelParams = {
        model: modelKeys[0],
    };

    // When the user selects a model, we will update the model and add the objects on the shape.
    modelsFolder.add(modelParams, 'model', modelKeys).onChange((value: string) => {
        const glb = GLB_MODELS[value as keyof typeof GLB_MODELS];
        if (glb == null) throw new Error('Model not found');
        model = glb.model;
        addObjectsOnShape();
    });

    // Add the first model to the scene.
    const glbKey = modelKeys[0] as keyof typeof GLB_MODELS;
    const glb = GLB_MODELS[glbKey];
    model = glb.model;
    addObjectsOnShape();
};

loadModelsAsync();
