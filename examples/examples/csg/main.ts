import * as THREE from 'three';
import CSGFactory from '../../src/CSGFactory';
import Example from '../../src/Example';
import { Shape3D } from '../../../src';

const example = new Example();
example.initAsync().then(() => {
    example.createScene();
    example.addDummyShape(true);

    const {
        factory,
        selector,
        // TODO: Switch to async loading!!!
        backgroundPlane,
        group,
        transformShapeControls,
    } = example;

    const shape3D = selector.getSelectedShape();
    if (shape3D == null) throw new Error('Shape3D is null');
    factory.updateVolume(shape3D, { volumeHeight: -5 });

    const result = new THREE.Object3D();
    group.add(result);

    const csgFactory = new CSGFactory(shape3D as Shape3D, factory, [backgroundPlane], result);

    csgFactory.update();
    backgroundPlane.visible = false;

    const updateCSG = () => {
        csgFactory.update();
    };

    transformShapeControls.addEventListener('vertexChange', updateCSG);
});
