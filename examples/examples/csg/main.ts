import * as THREE from 'three';
import CSGFactory from '../../src/CSGFactory';
import Example, { SUPPORTED_SHAPES } from '../../src/Example';
import { Shape3D } from '../../../src';

const example = new Example();
example.initAsync().then(() => {
    example.createScene();
    example.addDummyShape(true);

    const {
        gui,
        factory,
        selector,
        // TODO: Switch to async loading!!!
        backgroundPlane,
        group,
        transformShapeControls,
    } = example;

    const shape3D = selector.getSelectedShape();
    if (shape3D == null) throw new Error('Shape3D is null');

    const params = {
        volumeDepth: 0.5,
    };

    factory.update(shape3D, {
        shapeType: SUPPORTED_SHAPES.VOLUME,
        volumeHeight: -params.volumeDepth,
    });

    const result = new THREE.Object3D();
    group.add(result);

    const csgFactory = new CSGFactory(shape3D as Shape3D, factory, [backgroundPlane], result);

    csgFactory.update();
    backgroundPlane.visible = false;

    const updateCSG = () => {
        csgFactory.hideVolume();
        csgFactory.update();
    };

    transformShapeControls.addEventListener('vertexChange', updateCSG);

    gui.add(params, 'volumeDepth')
        .name('Volume depth')
        .min(0.1)
        .max(100)
        .step(0.1)
        .onChange((volumeDepth: number) => {
            factory.update(shape3D, {
                shapeType: SUPPORTED_SHAPES.VOLUME,
                volumeHeight: -volumeDepth,
            });

            updateCSG();
        });
});
