import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Vertex } from '../../types';
import { getLength2D, setOffsetPositionFromLine } from '../../utils';

export function addPrefix(this: HTMLInputElement, _ev: Event) {
    this.setAttribute('size', `${this.value!.length}`);
}

/**
 * @deprecated Use {@link LabelsManager} instead.
 * @param parent
 * @param firstVertex
 * @param secondVertex
 * @param center
 * @param offsetDistance
 */
export const generateLabel = (
    parent: THREE.Object3D,
    firstVertex: Vertex,
    secondVertex: Vertex,
    center: Vertex,
    offsetDistance: number,
) => {
    const length = getLength2D(firstVertex, secondVertex);

    const divElement = document.createElement('div');
    divElement.className = 'shape-3d-label-container';

    const inputElement = document.createElement('input');
    inputElement.type = 'text';

    inputElement.id = 'myInput';
    inputElement.className = 'shape-3d-label';
    inputElement.placeholder = `${length.toFixed(2)}`;
    inputElement.setAttribute('size', `${inputElement.getAttribute('placeholder')!.length}`);
    inputElement.oninput = addPrefix.bind(inputElement);

    divElement.appendChild(inputElement);
    const label = new CSS2DObject(divElement);
    setOffsetPositionFromLine(label, firstVertex, secondVertex, center, offsetDistance);

    parent.add(label);
};
