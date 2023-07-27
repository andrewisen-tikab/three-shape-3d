import * as THREE from 'three';

import Shape3D from '../../Shape3D';
import { getMidpoint, setLineAngle, setLineLength } from '../../utils';
import LabelsManager from './LabelsManager';
import VertexObject, { VertexMetadata } from './vertex';

const _raycaster = new THREE.Raycaster();
// @ts-ignore
_raycaster.firstHitOnly = true;

const _tempVector = new THREE.Vector3();
const _tempVector2 = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _unit = {
    X: new THREE.Vector3(1, 0, 0),
    Y: new THREE.Vector3(0, 1, 0),
    Z: new THREE.Vector3(0, 0, 1),
};

const _changeEvent = { type: 'change' };
const _mouseDownEvent: { type: 'mouseDown'; mode?: string } = { type: 'mouseDown' };
const _mouseUpEvent: { type: 'mouseUp'; mode: string | null } = { type: 'mouseUp', mode: null };
const _objectChangeEvent = { type: 'objectChange' };

type TransformShapeControlsGizmoParams = {
    centerGizmo: boolean;
    dragVertices: boolean;
    allowCreatingNewVertices: boolean;
    showLengthLabels: boolean;
    showAngleLabels: boolean;
};

type Mode = 'translate' | 'rotate' | 'scale';

const scale = 1;

// @ts-ignore
interface LastSelectedVertex extends THREE.Mesh {
    parent: VertexObject;
}
class TransformShapeControls extends THREE.Object3D {
    public static VertexObject = VertexObject;

    public vertexGroup!: THREE.Group;

    public labelsGroup!: THREE.Group;

    private labelsManager: LabelsManager;

    public object?: Shape3D;

    public isTransformControls: boolean;

    public domElement: HTMLCanvasElement;

    private _gizmo: TransformShapeControlsGizmo;

    private _plane: TransformShapeControlsPlane;

    private _vertexPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

    public camera!: THREE.Camera;

    public enabled!: boolean;

    public axis!: string | null;

    public mode!: Mode;

    private translationSnap!: number | null;

    private rotationSnap!: number | null;

    private scaleSnap!: number | null;

    public space!: string;

    public size!: number;

    public dragging!: boolean;

    public showX!: boolean;

    public showY!: boolean;

    public showZ!: boolean;

    private worldPosition!: THREE.Vector3;

    private worldPositionStart!: THREE.Vector3;

    private worldQuaternion!: THREE.Quaternion;

    private worldQuaternionStart!: THREE.Quaternion;

    private cameraPosition!: THREE.Vector3;

    private cameraQuaternion!: THREE.Quaternion;

    private pointStart!: THREE.Vector3;

    private pointEnd!: THREE.Vector3;

    private rotationAxis!: THREE.Vector3;

    private rotationAngle!: number;

    private eye!: THREE.Vector3;

    private _offset: THREE.Vector3;

    private _startNorm: THREE.Vector3;

    private _endNorm: THREE.Vector3;

    private _cameraScale: THREE.Vector3;

    private _parentPosition: THREE.Vector3;

    private _parentQuaternion: THREE.Quaternion;

    private _parentQuaternionInv: THREE.Quaternion;

    private _parentScale: THREE.Vector3;

    private _worldScaleStart: THREE.Vector3;

    private _worldQuaternionInv: THREE.Quaternion;

    private _worldScale: THREE.Vector3;

    private _positionStart: THREE.Vector3;

    private _quaternionStart: THREE.Quaternion;

    private _scaleStart: THREE.Vector3;

    private _getPointer!: (event: any) => { x: number; y: number; button: any };
    private _onPointerDown!: (event: any) => void;
    private _onPointerHover!: (event: any) => void;
    private _onPointerMove!: (event: any) => void;
    private _onPointerUp!: (event: any) => void;
    params: Partial<TransformShapeControlsGizmoParams>;

    public vertexCenter: THREE.Vector3;

    private lastSelectedVertex: LastSelectedVertex | null = null;
    private lastSelectedVertexQuaternion: THREE.Quaternion;

    constructor(
        camera: THREE.Camera,
        domElement: HTMLCanvasElement,
        params: Partial<TransformShapeControlsGizmoParams> = {},
    ) {
        super();

        // this.vertexGroup = new THREE.Group();
        // this.add(this.vertexGroup);

        const defaultParams: TransformShapeControlsGizmoParams = {
            centerGizmo: true,
            dragVertices: true,
            allowCreatingNewVertices: true,
            showLengthLabels: true,
            showAngleLabels: true,
        };

        this.vertexCenter = new THREE.Vector3();

        this.params = {
            ...defaultParams,
            ...params,
        };

        if (domElement === undefined) {
            console.warn(
                'THREE.TransformControls: The second parameter "domElement" is now mandatory.',
            );
            domElement = document as any;
        }

        this.isTransformControls = true;

        this.visible = false;

        this.domElement = domElement;
        this.domElement.style.touchAction = 'none'; // disable touch scroll

        const _gizmo = new TransformShapeControlsGizmo();
        this._gizmo = _gizmo;
        this.add(_gizmo);

        const _plane = new TransformShapeControlsPlane();
        this._plane = _plane;
        this.add(_plane);

        const vertexPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(100000, 100000, 2, 2),
            new THREE.MeshBasicMaterial({
                visible: false,
                wireframe: true,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.1,
                toneMapped: false,
            }),
        );
        this._vertexPlane = vertexPlane;
        vertexPlane.rotateX(-Math.PI / 2);
        this.add(vertexPlane);

        const scope = this;

        /**
         * Defined getter, setter and store for a property
         * @param propName
         * @param defaultValue
         */
        const defineProperty = (propName: string, defaultValue: any) => {
            let propValue = defaultValue;

            Object.defineProperty(scope, propName, {
                get: function () {
                    return propValue !== undefined ? propValue : defaultValue;
                },

                set: function (value) {
                    if (propValue !== value) {
                        propValue = value;
                        // @ts-ignore
                        _plane[propName] = value;
                        // @ts-ignore
                        _gizmo[propName] = value;

                        scope.dispatchEvent({ type: propName + '-changed', value: value });
                        scope.dispatchEvent(_changeEvent);
                    }
                },
            });
            // @ts-ignore
            scope[propName] = defaultValue;
            // @ts-ignore
            _plane[propName] = defaultValue;
            // @ts-ignore
            _gizmo[propName] = defaultValue;
        };

        // Define properties with getters/setter
        // Setting the defined property will automatically trigger change event
        // Defined properties are passed down to gizmo and plane

        const vertexGroup = new THREE.Group();
        this.lastSelectedVertex = null;
        this.lastSelectedVertexQuaternion = new THREE.Quaternion();
        this.add(vertexGroup);

        this.labelsManager = new LabelsManager(this);
        const labelsGroup = new THREE.Group();
        this.add(labelsGroup);

        defineProperty('camera', camera);
        defineProperty('object', undefined);
        defineProperty('vertexGroup', vertexGroup);
        defineProperty('labelsGroup', labelsGroup);

        defineProperty('enabled', true);
        defineProperty('axis', null);
        defineProperty('mode', 'translate');
        defineProperty('translationSnap', null);
        defineProperty('rotationSnap', null);
        defineProperty('scaleSnap', null);
        defineProperty('space', 'world');
        defineProperty('size', 1);
        defineProperty('dragging', false);
        defineProperty('showX', true);
        defineProperty('showY', true);
        defineProperty('showZ', true);

        // Reusable utility variables

        const worldPosition = new THREE.Vector3();
        const worldPositionStart = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        const worldQuaternionStart = new THREE.Quaternion();
        const cameraPosition = new THREE.Vector3();
        const cameraQuaternion = new THREE.Quaternion();
        const pointStart = new THREE.Vector3();
        const pointEnd = new THREE.Vector3();
        const rotationAxis = new THREE.Vector3();
        const rotationAngle = 0;
        const eye = new THREE.Vector3();

        // TODO: remove properties unused in plane and gizmo

        defineProperty('worldPosition', worldPosition);
        defineProperty('worldPositionStart', worldPositionStart);
        defineProperty('worldQuaternion', worldQuaternion);
        defineProperty('worldQuaternionStart', worldQuaternionStart);
        defineProperty('cameraPosition', cameraPosition);
        defineProperty('cameraQuaternion', cameraQuaternion);
        defineProperty('pointStart', pointStart);
        defineProperty('pointEnd', pointEnd);
        defineProperty('rotationAxis', rotationAxis);
        defineProperty('rotationAngle', rotationAngle);
        defineProperty('eye', eye);

        this._offset = new THREE.Vector3();
        this._startNorm = new THREE.Vector3();
        this._endNorm = new THREE.Vector3();
        this._cameraScale = new THREE.Vector3();

        this._parentPosition = new THREE.Vector3();
        this._parentQuaternion = new THREE.Quaternion();
        this._parentQuaternionInv = new THREE.Quaternion();
        this._parentScale = new THREE.Vector3();

        this._worldScaleStart = new THREE.Vector3();
        this._worldQuaternionInv = new THREE.Quaternion();
        this._worldScale = new THREE.Vector3();

        this._positionStart = new THREE.Vector3();
        this._quaternionStart = new THREE.Quaternion();
        this._scaleStart = new THREE.Vector3();

        this._getPointer = getPointer.bind(this);
        this._onPointerDown = onPointerDown.bind(this);
        this._onPointerHover = onPointerHover.bind(this);
        this._onPointerMove = onPointerMove.bind(this);
        this._onPointerUp = onPointerUp.bind(this);

        this.domElement.addEventListener('pointerdown', this._onPointerDown);
        this.domElement.addEventListener('pointermove', this._onPointerHover);
        this.domElement.addEventListener('pointerup', this._onPointerUp);
    }

    /**
     * Set the param `centerGizmo`.
     * @param centerGizmo
     */
    setCenterGizmo(centerGizmo: boolean): void {
        this.params.centerGizmo = centerGizmo;
        this.updateOffset();
    }

    /**
     * Set the param `dragVertices`.
     * @param centerGizmo
     */
    setDragVertices(dragVertices: boolean): void {
        this.params.dragVertices = dragVertices;
    }

    /**
     * Updates key transformation variables
     */
    updateMatrixWorld(): void {
        if (this.object !== undefined) {
            this.object.updateMatrixWorld();

            if (this.object.parent === null) {
                console.error(
                    'TransformControls: The attached 3D object must be a part of the scene graph.',
                );
            } else {
                this.object.parent.matrixWorld.decompose(
                    this._parentPosition,
                    this._parentQuaternion,
                    this._parentScale,
                );
            }

            this.object.matrixWorld.decompose(
                this.worldPosition,
                this.worldQuaternion,
                this._worldScale,
            );

            // WIP: Test code
            if (this.params.centerGizmo) {
                switch (this.mode) {
                    case 'translate':
                        this._gizmo.position.copy(this.vertexCenter);
                        break;

                    default:
                        this._gizmo.position.set(0, 0, 0);
                        break;
                }
            } else {
                this._gizmo.position.set(0, 0, 0);
            }

            // Update vertex group
            if (this.params.dragVertices) {
                this.vertexGroup.position.copy(this.worldPosition);
                this.vertexGroup.quaternion.copy(this.worldQuaternion);
                this.vertexGroup.scale.copy(this._worldScale);
            }

            // Update vertex group
            if (this.params.dragVertices) {
                this.labelsGroup.position.copy(this.worldPosition);
                this.labelsGroup.quaternion.copy(this.worldQuaternion);
                this.labelsGroup.scale.copy(this._worldScale);
            }

            this._parentQuaternionInv.copy(this._parentQuaternion).invert();
            this._worldQuaternionInv.copy(this.worldQuaternion).invert();
        }

        this.camera.updateMatrixWorld();
        this.camera.matrixWorld.decompose(
            this.cameraPosition,
            this.cameraQuaternion,
            this._cameraScale,
        );

        if ((this.camera as THREE.OrthographicCamera).isOrthographicCamera) {
            this.camera.getWorldDirection(this.eye).negate();
        } else {
            this.eye.copy(this.cameraPosition).sub(this.worldPosition).normalize();
        }

        this.labelsManager.update();

        // @ts-ignore
        super.updateMatrixWorld(this);
    }

    /**
     * Pointer hover event
     * @param pointer
     */
    pointerHover(pointer: PointerEvent): void {
        if (this.object === undefined || this.dragging === true) return;

        _raycaster.setFromCamera(pointer as any, this.camera);

        const intersect = intersectObjectWithRay(this._gizmo.picker[this.mode], _raycaster);

        if (intersect) {
            this.axis = intersect.object.name;
        } else {
            this.axis = null;
        }

        if (this.lastSelectedVertex) {
            // @ts-ignore
            this.lastSelectedVertex.parent.endHover();
        }
        if (this.axis !== null) {
            this.lastSelectedVertex = null;
            return;
        }
        const vertex = intersectObjectWithRay(this.vertexGroup, _raycaster);
        if (vertex) {
            // const metadata = vertex.object.userData;
            // if (metadata.type !== 'vertex') {
            //     this.lastSelectedVertex = null;
            //     return;
            // }
            const mesh = vertex.object.parent as VertexObject;

            mesh.beginHover();
            // @ts-ignore
            // mesh._material = vertex.object.material;
            // mesh.material = this.vertexHoverMaterial;
            this.lastSelectedVertex = vertex.object;
        } else {
            this.lastSelectedVertex = null;
        }
    }

    /**
     * Pointer down event
     * @param pointer
     */
    pointerDown(pointer: PointerEvent): void {
        if (this.object === undefined || this.dragging === true) return;

        if (this.axis !== null) {
            _raycaster.setFromCamera(pointer as any, this.camera);

            const planeIntersect = intersectObjectWithRay(this._plane, _raycaster, true);

            if (planeIntersect) {
                this.object.updateMatrixWorld();
                this.object.parent!.updateMatrixWorld();

                this._positionStart.copy(this.object.position);
                this._quaternionStart.copy(this.object.quaternion);
                this._scaleStart.copy(this.object.scale);

                this.object.matrixWorld.decompose(
                    this.worldPositionStart,
                    this.worldQuaternionStart,
                    this._worldScaleStart,
                );

                this.pointStart.copy(planeIntersect.point).sub(this.worldPositionStart);
            }

            this.dragging = true;
            _mouseDownEvent.mode = this.mode;
            this.dispatchEvent(_mouseDownEvent);
        }

        // If dragging vertex, simply set dragging to true
        if (this.lastSelectedVertex !== null) {
            const metadata = this.lastSelectedVertex.userData as VertexMetadata;

            if (metadata.type === 'vertex') {
                // Detect if right click
                if (pointer.button !== 0) {
                    this.object.removeVertex(metadata.index);
                    this.onVertexChanged();
                } else {
                    this.dragging = true;
                    _mouseDownEvent.mode = this.mode;

                    // Move plane to object's height.
                    this._vertexPlane.position.setY(this.object!.position.y);
                }
            } else {
                this.object.splitEdge(metadata.index);
                this.onVertexChanged();
            }
            this.dispatchEvent(_mouseDownEvent);
        }
    }

    /**
     * Pointer move event
     * @param pointer
     */
    pointerMove(pointer: PointerEvent) {
        const axis = this.axis;
        const mode = this.mode;
        const object = this.object;
        let space = this.space;

        if (mode === 'scale') {
            space = 'local';
        } else if (axis === 'E' || axis === 'XYZE' || axis === 'XYZ') {
            space = 'world';
        }

        //  Attempt to drag vertex
        if (this.lastSelectedVertex) {
            _raycaster.setFromCamera(pointer as any, this.camera);
            const planeIntersect = intersectObjectWithRay(this._vertexPlane, _raycaster, true);
            if (!planeIntersect) return;

            // Simply copy the raycast point and adjust for the Shape3D's position.
            this.lastSelectedVertex.position.copy(planeIntersect.point).sub(this.object!.position);

            // Snap to grid
            if (this.translationSnap) {
                this.lastSelectedVertex.position.x =
                    Math.round(this.lastSelectedVertex.position.x / this.translationSnap) *
                    this.translationSnap;
                this.lastSelectedVertex.position.y =
                    Math.round(this.lastSelectedVertex.position.y / this.translationSnap) *
                    this.translationSnap;

                this.lastSelectedVertex.position.z =
                    Math.round(this.lastSelectedVertex.position.z / this.translationSnap) *
                    this.translationSnap;
            }

            // Adjust for the rotation of thee TransformShapeControls
            this.lastSelectedVertexQuaternion.copy(this.object!.quaternion);
            this.lastSelectedVertex.position.applyQuaternion(
                this.lastSelectedVertexQuaternion.invert(),
            );

            const metadata = this.lastSelectedVertex.userData as VertexMetadata;
            const index = metadata.index;

            if (metadata.type === 'vertex') {
                // Update the vertex position in the Shape3D object
                this.object!.updateVertex(index, [
                    this.lastSelectedVertex.position.x,
                    this.lastSelectedVertex.position.y,
                    this.lastSelectedVertex.position.z,
                ]);
                this.onVertexChanged();
            }

            return;
        }

        if (
            object === undefined ||
            axis === null ||
            this.dragging === false ||
            pointer.button !== -1
        )
            return;

        _raycaster.setFromCamera(pointer as any, this.camera);

        const planeIntersect = intersectObjectWithRay(this._plane, _raycaster, true);

        if (!planeIntersect) return;

        this.pointEnd.copy(planeIntersect.point).sub(this.worldPositionStart);

        if (mode === 'translate') {
            // Apply translate

            this._offset.copy(this.pointEnd).sub(this.pointStart);

            if (space === 'local' && axis !== 'XYZ') {
                this._offset.applyQuaternion(this._worldQuaternionInv);
            }

            if (axis.indexOf('X') === -1) this._offset.x = 0;
            if (axis.indexOf('Y') === -1) this._offset.y = 0;
            if (axis.indexOf('Z') === -1) this._offset.z = 0;

            if (space === 'local' && axis !== 'XYZ') {
                this._offset.applyQuaternion(this._quaternionStart).divide(this._parentScale);
            } else {
                this._offset.applyQuaternion(this._parentQuaternionInv).divide(this._parentScale);
            }

            object.position.copy(this._offset).add(this._positionStart);

            // Apply translation snap

            if (this.translationSnap) {
                if (space === 'local') {
                    object.position.applyQuaternion(
                        _tempQuaternion.copy(this._quaternionStart).invert(),
                    );

                    if (axis.search('X') !== -1) {
                        object.position.x =
                            Math.round(object.position.x / this.translationSnap) *
                            this.translationSnap;
                    }

                    if (axis.search('Y') !== -1) {
                        object.position.y =
                            Math.round(object.position.y / this.translationSnap) *
                            this.translationSnap;
                    }

                    if (axis.search('Z') !== -1) {
                        object.position.z =
                            Math.round(object.position.z / this.translationSnap) *
                            this.translationSnap;
                    }

                    object.position.applyQuaternion(this._quaternionStart);
                }

                if (space === 'world') {
                    if (object.parent) {
                        object.position.add(
                            _tempVector.setFromMatrixPosition(object.parent.matrixWorld),
                        );
                    }

                    if (axis.search('X') !== -1) {
                        object.position.x =
                            Math.round(object.position.x / this.translationSnap) *
                            this.translationSnap;
                    }

                    if (axis.search('Y') !== -1) {
                        object.position.y =
                            Math.round(object.position.y / this.translationSnap) *
                            this.translationSnap;
                    }

                    if (axis.search('Z') !== -1) {
                        object.position.z =
                            Math.round(object.position.z / this.translationSnap) *
                            this.translationSnap;
                    }

                    if (object.parent) {
                        object.position.sub(
                            _tempVector.setFromMatrixPosition(object.parent.matrixWorld),
                        );
                    }
                }
            }
        } else if (mode === 'scale') {
            if (axis.search('XYZ') !== -1) {
                let d = this.pointEnd.length() / this.pointStart.length();

                if (this.pointEnd.dot(this.pointStart) < 0) d *= -1;

                _tempVector2.set(d, d, d);
            } else {
                _tempVector.copy(this.pointStart);
                _tempVector2.copy(this.pointEnd);

                _tempVector.applyQuaternion(this._worldQuaternionInv);
                _tempVector2.applyQuaternion(this._worldQuaternionInv);

                _tempVector2.divide(_tempVector);

                if (axis.search('X') === -1) {
                    _tempVector2.x = 1;
                }

                if (axis.search('Y') === -1) {
                    _tempVector2.y = 1;
                }

                if (axis.search('Z') === -1) {
                    _tempVector2.z = 1;
                }
            }

            // Apply scale

            object.scale.copy(this._scaleStart).multiply(_tempVector2);

            if (this.scaleSnap) {
                if (axis.search('X') !== -1) {
                    object.scale.x =
                        Math.round(object.scale.x / this.scaleSnap) * this.scaleSnap ||
                        this.scaleSnap;
                }

                if (axis.search('Y') !== -1) {
                    object.scale.y =
                        Math.round(object.scale.y / this.scaleSnap) * this.scaleSnap ||
                        this.scaleSnap;
                }

                if (axis.search('Z') !== -1) {
                    object.scale.z =
                        Math.round(object.scale.z / this.scaleSnap) * this.scaleSnap ||
                        this.scaleSnap;
                }
            }
        } else if (mode === 'rotate') {
            this._offset.copy(this.pointEnd).sub(this.pointStart);

            const ROTATION_SPEED =
                20 /
                this.worldPosition.distanceTo(
                    _tempVector.setFromMatrixPosition(this.camera.matrixWorld),
                );

            if (axis === 'E') {
                this.rotationAxis.copy(this.eye);
                this.rotationAngle = this.pointEnd.angleTo(this.pointStart);

                this._startNorm.copy(this.pointStart).normalize();
                this._endNorm.copy(this.pointEnd).normalize();

                this.rotationAngle *=
                    this._endNorm.cross(this._startNorm).dot(this.eye) < 0 ? 1 : -1;
            } else if (axis === 'XYZE') {
                this.rotationAxis.copy(this._offset).cross(this.eye).normalize();
                this.rotationAngle =
                    this._offset.dot(_tempVector.copy(this.rotationAxis).cross(this.eye)) *
                    ROTATION_SPEED;
            } else if (axis === 'X' || axis === 'Y' || axis === 'Z') {
                this.rotationAxis.copy(_unit[axis]);

                _tempVector.copy(_unit[axis]);

                if (space === 'local') {
                    _tempVector.applyQuaternion(this.worldQuaternion);
                }

                this.rotationAngle =
                    this._offset.dot(_tempVector.cross(this.eye).normalize()) * ROTATION_SPEED;
            }

            // Apply rotation snap

            if (this.rotationSnap)
                this.rotationAngle =
                    Math.round(this.rotationAngle / this.rotationSnap) * this.rotationSnap;

            // Apply rotate
            if (space === 'local' && axis !== 'E' && axis !== 'XYZE') {
                object.quaternion.copy(this._quaternionStart);
                object.quaternion
                    .multiply(
                        _tempQuaternion.setFromAxisAngle(this.rotationAxis, this.rotationAngle),
                    )
                    .normalize();
            } else {
                this.rotationAxis.applyQuaternion(this._parentQuaternionInv);
                object.quaternion.copy(
                    _tempQuaternion.setFromAxisAngle(this.rotationAxis, this.rotationAngle),
                );
                object.quaternion.multiply(this._quaternionStart).normalize();
            }
        }

        this.dispatchEvent(_changeEvent);
        this.dispatchEvent(_objectChangeEvent);
    }

    pointerUp(pointer: PointerEvent) {
        if (pointer.button !== 0) return;

        if (this.dragging && this.axis !== null) {
            _mouseUpEvent.mode = this.mode;
            this.dispatchEvent(_mouseUpEvent);
        }

        if (this.lastSelectedVertex) {
            this.lastSelectedVertex.parent.endMove();
        }

        this.dragging = false;
        this.axis = null;
    }

    dispose() {
        this.domElement.removeEventListener('pointerdown', this._onPointerDown);
        this.domElement.removeEventListener('pointermove', this._onPointerHover);
        this.domElement.removeEventListener('pointermove', this._onPointerMove);
        this.domElement.removeEventListener('pointerup', this._onPointerUp);

        this.traverse((_child) => {
            const child = _child as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }

    // Set current object
    attach(object: Shape3D) {
        this.object = object;

        this.object.addEventListener('close-line-changed', this.onCloseLineChanged);

        this.onVertexChanged();

        this.visible = true;

        return this;
    }

    private onVertexChanged() {
        this.updateHandles();

        this.updateOffset();

        this.updateLabels();
    }

    private updateHandles() {
        if (this.params.dragVertices === false) return;
        this.addHandles();
    }

    private addHandles() {
        this.vertexGroup.clear();
        const vertices = this.object!.getVertices();
        const currentIndex =
            (this.lastSelectedVertex?.userData as Partial<VertexMetadata>)?.index ?? -99;

        for (let index = 0; index < vertices.length; index++) {
            const vertex = vertices[index];
            const cube = new TransformShapeControls.VertexObject(this.domElement, {
                type: 'vertex',
            });
            cube.scale.setScalar(scale);
            cube.position.set(vertex[0], vertex[1], vertex[2]);

            const metadata: VertexMetadata = {
                type: 'vertex',
                index,
            };
            cube.setMetadata(metadata);
            this.vertexGroup.add(cube as unknown as THREE.Object3D);
            if (index === currentIndex) {
                cube.beginMove();
            }

            if (this.params.allowCreatingNewVertices === false) continue;
            if (index === 0) continue;

            const previousVertex = vertices[index - 1];

            const midpoint = new TransformShapeControls.VertexObject(this.domElement, {
                type: 'midpoint',
            });
            midpoint.scale.setScalar(scale);

            midpoint.position.set(...getMidpoint(vertex, previousVertex));

            const middleMetadata: VertexMetadata = {
                type: 'midpoint',
                index,
            };
            midpoint.setMetadata(middleMetadata);

            this.vertexGroup.add(midpoint as unknown as THREE.Object3D);
        }

        if (this.object!.getCloseLine()) {
            const index = vertices.length;
            const vertex = vertices[0];
            const previousVertex = vertices[vertices.length - 1];

            const midpoint = new TransformShapeControls.VertexObject(this.domElement, {
                type: 'midpoint',
            });
            midpoint.position.set(...getMidpoint(vertex, previousVertex));
            midpoint.scale.setScalar(scale);

            const middleMetadata: VertexMetadata = {
                type: 'midpoint',
                index,
            };
            midpoint.userData = middleMetadata;
            this.vertexGroup.add(midpoint);
        }
        this.vertexGroup.position.set(-this.position.x, -this.position.y, -this.position.z);
    }

    updateOffset() {
        if (this.object == null) {
            this.position.set(0, 0, 0);
            return;
        }

        const vertices = this.object.getVertices();
        let sumX = 0;
        let sumY = 0;
        let sumZ = 0;

        // Iterate through all vertices to calculate the sums
        for (const vertex of vertices) {
            sumX += vertex[0];
            sumY += vertex[1];
            sumZ += vertex[2];
        }

        this.vertexCenter.set(
            sumX / vertices.length,
            sumY / vertices.length,
            sumZ / vertices.length,
        );

        // this.position.copy(center);
    }

    private updateLabels() {
        if (this.params.showLengthLabels === false && this.params.showAngleLabels === false) {
            this.labelsManager.dispose();
            return;
        }
        this.labelsManager.showLengthLabels = this.params.showLengthLabels!;
        this.labelsManager.showAngleLabels = this.params.showAngleLabels!;

        this.addLabels();
    }

    private addLabels() {
        this.labelsManager.addLabels();
        this.labelsGroup.position.set(-this.position.x, -this.position.y, -this.position.z);
    }

    private onCloseLineChanged = (_e: any) => {
        this.onVertexChanged();
    };

    // Detach from object
    detach() {
        if (this.object) {
            this.object.removeEventListener('close-line-changed', this.onCloseLineChanged);
        }

        this.object = undefined;
        this.visible = false;
        this.axis = null;

        return this;
    }

    reset() {
        if (!this.enabled) return;

        if (this.dragging) {
            this.object!.position.copy(this._positionStart);
            this.object!.quaternion.copy(this._quaternionStart);
            this.object!.scale.copy(this._scaleStart);

            this.dispatchEvent(_changeEvent);
            this.dispatchEvent(_objectChangeEvent);

            this.pointStart.copy(this.pointEnd);
        }
    }

    getRaycaster() {
        return _raycaster;
    }

    // TODO: deprecate

    getMode() {
        return this.mode;
    }

    setMode(mode: Mode) {
        if (mode !== 'translate' && mode !== 'rotate' && mode !== 'scale')
            throw new Error('Invalid mode');

        this.mode = mode;
    }

    setTranslationSnap(translationSnap: number | null) {
        this.translationSnap = translationSnap;
    }

    setRotationSnap(rotationSnap: number) {
        this.rotationSnap = rotationSnap;
    }

    setScaleSnap(scaleSnap: number) {
        this.scaleSnap = scaleSnap;
    }

    setSize(size: number) {
        this.size = size;
    }

    setSpace(space: string) {
        this.space = space;
    }

    setLineLength(index: number, lineLength: number) {
        if (this.object == null) {
            console.warn('No object attached');
            return;
        }
        if (index < 0 || index > this.object!.getVertices().length) {
            console.warn('Invalid index');
            return;
        }
        if (lineLength < 0) {
            console.warn('Invalid line length');
            return;
        }
        const adjustedIndex = index === this.object!.getVertices().length ? 0 : index;
        const vertices = this.object!.getVertices();
        const newVertex = setLineLength(index, lineLength, vertices);
        this.object.updateVertex(adjustedIndex, newVertex);
        this.onVertexChanged();
    }

    setLineAngle(index: number, angleInDegrees: number) {
        if (this.object == null) {
            console.warn('No object attached');
            return;
        }
        if (index < 0 || index > this.object!.getVertices().length) {
            console.warn('Invalid index');
            return;
        }
        if (angleInDegrees < 0) {
            console.warn('Invalid line angle');
            return;
        }

        const adjustedIndex = index === this.object!.getVertices().length ? 0 : index + 1;
        const vertices = this.object!.getVertices();
        const newVertex = setLineAngle(index, angleInDegrees, vertices);
        this.object.updateVertex(adjustedIndex, newVertex);
        this.onVertexChanged();
    }

    setShowLengthLabels(showLengthLabels: boolean) {
        this.params.showLengthLabels = showLengthLabels;
        this.updateLabels();
    }

    setShowAngleLabels(showAngleLabels: boolean) {
        this.params.showAngleLabels = showAngleLabels;
        this.updateLabels();
    }
}

// mouse / touch event handlers

function getPointer(this: TransformShapeControls, event: PointerEvent) {
    if (this.domElement.ownerDocument.pointerLockElement) {
        return {
            x: 0,
            y: 0,
            button: event.button,
        };
    } else {
        const rect = this.domElement.getBoundingClientRect();

        return {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: (-(event.clientY - rect.top) / rect.height) * 2 + 1,
            button: event.button,
        };
    }
}

function onPointerHover(this: TransformShapeControls, event: PointerEvent) {
    if (!this.enabled) return;

    switch (event.pointerType) {
        case 'mouse':
        case 'pen':
            // @ts-ignore
            this.pointerHover(this._getPointer(event));
            break;
    }
}

function onPointerDown(this: TransformShapeControls, event: PointerEvent) {
    if (!this.enabled) return;

    if (!document.pointerLockElement) {
        this.domElement.setPointerCapture(event.pointerId);
    }

    // @ts-ignore
    this.domElement.addEventListener('pointermove', this._onPointerMove);
    // @ts-ignore
    this.pointerHover(this._getPointer(event));
    // @ts-ignore
    this.pointerDown(this._getPointer(event));
}

function onPointerMove(this: TransformShapeControls, event: PointerEvent) {
    if (!this.enabled) return;
    // @ts-ignore
    this.pointerMove(this._getPointer(event));
}

function onPointerUp(this: TransformShapeControls, event: PointerEvent) {
    if (!this.enabled) return;

    this.domElement.style.cursor = 'default';

    this.domElement.releasePointerCapture(event.pointerId);
    // @ts-ignore
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
    // @ts-ignore
    this.pointerUp(this._getPointer(event));
}

function intersectObjectWithRay(
    object: THREE.Object3D,
    raycaster: THREE.Raycaster,
    includeInvisible?: boolean,
) {
    const allIntersections = raycaster.intersectObject(object, true);

    for (let i = 0; i < allIntersections.length; i++) {
        if (allIntersections[i].object.visible || includeInvisible) {
            return allIntersections[i];
        }
    }

    return false;
}

//

// Reusable utility variables

const _tempEuler = new THREE.Euler();
const _alignVector = new THREE.Vector3(0, 1, 0);
const _zeroVector = new THREE.Vector3(0, 0, 0);
const _lookAtMatrix = new THREE.Matrix4();
const _tempQuaternion2 = new THREE.Quaternion();
const _identityQuaternion = new THREE.Quaternion();
const _dirVector = new THREE.Vector3();
const _tempMatrix = new THREE.Matrix4();

const _unitX = new THREE.Vector3(1, 0, 0);
const _unitY = new THREE.Vector3(0, 1, 0);
const _unitZ = new THREE.Vector3(0, 0, 1);

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

class TransformShapeControlsGizmo extends THREE.Object3D {
    public picker: any;

    public isTransformControlsGizmo: boolean;

    private gizmo: any;

    private helper: any;

    public mode!: string;

    public space: any;

    private worldQuaternion: any;

    public camera: any;

    public size!: number;

    public axis!: string;

    public dragging!: boolean;

    public showX!: boolean;

    public showY!: boolean;

    public showZ!: boolean;

    public enabled!: boolean;

    private worldPosition!: THREE.Vector3;

    private worldPositionStart!: THREE.Vector3;

    private worldQuaternionStart!: THREE.Quaternion;

    private rotationAxis!: THREE.Vector3;

    private eye!: THREE.Vector3;

    constructor() {
        super();

        this.isTransformControlsGizmo = true;

        // @ts-ignore
        this.type = 'TransformControlsGizmo';

        // shared materials

        const gizmoMaterial = new THREE.MeshBasicMaterial({
            depthTest: false,
            depthWrite: false,
            fog: false,
            toneMapped: false,
            transparent: true,
        });

        const gizmoLineMaterial = new THREE.LineBasicMaterial({
            depthTest: false,
            depthWrite: false,
            fog: false,
            toneMapped: false,
            transparent: true,
        });

        // Make unique material for each axis/color

        const matInvisible = gizmoMaterial.clone();
        matInvisible.opacity = 0.15;

        const matHelper = gizmoLineMaterial.clone();
        matHelper.opacity = 0.5;

        const matRed = gizmoMaterial.clone();
        matRed.color.setHex(0xff0000);

        const matGreen = gizmoMaterial.clone();
        matGreen.color.setHex(0x00ff00);

        const matBlue = gizmoMaterial.clone();
        matBlue.color.setHex(0x0000ff);

        const matRedTransparent = gizmoMaterial.clone();
        matRedTransparent.color.setHex(0xff0000);
        matRedTransparent.opacity = 0.5;

        const matGreenTransparent = gizmoMaterial.clone();
        matGreenTransparent.color.setHex(0x00ff00);
        matGreenTransparent.opacity = 0.5;

        const matBlueTransparent = gizmoMaterial.clone();
        matBlueTransparent.color.setHex(0x0000ff);
        matBlueTransparent.opacity = 0.5;

        const matWhiteTransparent = gizmoMaterial.clone();
        matWhiteTransparent.opacity = 0.25;

        const matYellowTransparent = gizmoMaterial.clone();
        matYellowTransparent.color.setHex(0xffff00);
        matYellowTransparent.opacity = 0.25;

        const matYellow = gizmoMaterial.clone();
        matYellow.color.setHex(0xffff00);

        const matGray = gizmoMaterial.clone();
        matGray.color.setHex(0x787878);

        // reusable geometry

        const arrowGeometry = new THREE.CylinderGeometry(0, 0.04, 0.1, 12);
        arrowGeometry.translate(0, 0.05, 0);
        // @ts-ignore
        arrowGeometry.computeBoundsTree();

        const scaleHandleGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        scaleHandleGeometry.translate(0, 0.04, 0);
        // @ts-ignore
        scaleHandleGeometry.computeBoundsTree();

        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3),
        );
        // @ts-ignore
        lineGeometry.computeBoundsTree();

        const lineGeometry2 = new THREE.CylinderGeometry(0.0075, 0.0075, 0.5, 3);
        lineGeometry2.translate(0, 0.25, 0);

        // @ts-ignore
        lineGeometry2.computeBoundsTree();

        function CircleGeometry(radius: number, arc: number) {
            const geometry = new THREE.TorusGeometry(radius, 0.0075, 3, 64, arc * Math.PI * 2);
            // @ts-ignore
            geometry.computeBoundsTree();
            geometry.rotateY(Math.PI / 2);
            geometry.rotateX(Math.PI / 2);
            return geometry;
        }

        // Special geometry for transform helper. If scaled with position vector it spans from [0,0,0] to position

        function TranslateHelperGeometry() {
            const geometry = new THREE.BufferGeometry();

            geometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3),
            );

            return geometry;
        }

        // Gizmo definitions - custom hierarchy definitions for setupGizmo() function

        const gizmoTranslate = {
            X: [
                [new THREE.Mesh(arrowGeometry, matRed), [0.5, 0, 0], [0, 0, -Math.PI / 2]],
                [new THREE.Mesh(arrowGeometry, matRed), [-0.5, 0, 0], [0, 0, Math.PI / 2]],
                [new THREE.Mesh(lineGeometry2, matRed), [0, 0, 0], [0, 0, -Math.PI / 2]],
            ],
            Y: [
                [new THREE.Mesh(arrowGeometry, matGreen), [0, 0.5, 0]],
                [new THREE.Mesh(arrowGeometry, matGreen), [0, -0.5, 0], [Math.PI, 0, 0]],
                [new THREE.Mesh(lineGeometry2, matGreen)],
            ],
            Z: [
                [new THREE.Mesh(arrowGeometry, matBlue), [0, 0, 0.5], [Math.PI / 2, 0, 0]],
                [new THREE.Mesh(arrowGeometry, matBlue), [0, 0, -0.5], [-Math.PI / 2, 0, 0]],
                [new THREE.Mesh(lineGeometry2, matBlue), null, [Math.PI / 2, 0, 0]],
            ],
            XYZ: [
                [
                    new THREE.Mesh(
                        new THREE.OctahedronGeometry(0.1, 0),
                        matWhiteTransparent.clone(),
                    ),
                    [0, 0, 0],
                ],
            ],
            XY: [
                [
                    new THREE.Mesh(
                        new THREE.BoxGeometry(0.15, 0.15, 0.01),
                        matBlueTransparent.clone(),
                    ),
                    [0.15, 0.15, 0],
                ],
            ],
            YZ: [
                [
                    new THREE.Mesh(
                        new THREE.BoxGeometry(0.15, 0.15, 0.01),
                        matRedTransparent.clone(),
                    ),
                    [0, 0.15, 0.15],
                    [0, Math.PI / 2, 0],
                ],
            ],
            XZ: [
                [
                    new THREE.Mesh(
                        new THREE.BoxGeometry(0.15, 0.15, 0.01),
                        matGreenTransparent.clone(),
                    ),
                    [0.15, 0, 0.15],
                    [-Math.PI / 2, 0, 0],
                ],
            ],
        } as const;

        const pickerTranslate = {
            X: [
                [
                    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 0.6, 4), matInvisible),
                    [0.3, 0, 0],
                    [0, 0, -Math.PI / 2],
                ],
                [
                    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 0.6, 4), matInvisible),
                    [-0.3, 0, 0],
                    [0, 0, Math.PI / 2],
                ],
            ],
            Y: [
                [
                    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 0.6, 4), matInvisible),
                    [0, 0.3, 0],
                ],
                [
                    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 0.6, 4), matInvisible),
                    [0, -0.3, 0],
                    [0, 0, Math.PI],
                ],
            ],
            Z: [
                [
                    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 0.6, 4), matInvisible),
                    [0, 0, 0.3],
                    [Math.PI / 2, 0, 0],
                ],
                [
                    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 0.6, 4), matInvisible),
                    [0, 0, -0.3],
                    [-Math.PI / 2, 0, 0],
                ],
            ],
            XYZ: [[new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), matInvisible)]],
            XY: [
                [
                    new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), matInvisible),
                    [0.15, 0.15, 0],
                ],
            ],
            YZ: [
                [
                    new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), matInvisible),
                    [0, 0.15, 0.15],
                    [0, Math.PI / 2, 0],
                ],
            ],
            XZ: [
                [
                    new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), matInvisible),
                    [0.15, 0, 0.15],
                    [-Math.PI / 2, 0, 0],
                ],
            ],
        };

        const helperTranslate = {
            START: [
                [
                    new THREE.Mesh(new THREE.OctahedronGeometry(0.01, 2), matHelper),
                    null,
                    null,
                    null,
                    'helper',
                ],
            ],
            END: [
                [
                    new THREE.Mesh(new THREE.OctahedronGeometry(0.01, 2), matHelper),
                    null,
                    null,
                    null,
                    'helper',
                ],
            ],
            DELTA: [
                [new THREE.Line(TranslateHelperGeometry(), matHelper), null, null, null, 'helper'],
            ],
            X: [
                [
                    new THREE.Line(lineGeometry, matHelper.clone()),
                    [-1e3, 0, 0],
                    null,
                    [1e6, 1, 1],
                    'helper',
                ],
            ],
            Y: [
                [
                    new THREE.Line(lineGeometry, matHelper.clone()),
                    [0, -1e3, 0],
                    [0, 0, Math.PI / 2],
                    [1e6, 1, 1],
                    'helper',
                ],
            ],
            Z: [
                [
                    new THREE.Line(lineGeometry, matHelper.clone()),
                    [0, 0, -1e3],
                    [0, -Math.PI / 2, 0],
                    [1e6, 1, 1],
                    'helper',
                ],
            ],
        } as const;

        const gizmoRotate = {
            XYZE: [[new THREE.Mesh(CircleGeometry(0.5, 1), matGray), null, [0, Math.PI / 2, 0]]],
            X: [[new THREE.Mesh(CircleGeometry(0.5, 0.5), matRed)]],
            Y: [[new THREE.Mesh(CircleGeometry(0.5, 0.5), matGreen), null, [0, 0, -Math.PI / 2]]],
            Z: [[new THREE.Mesh(CircleGeometry(0.5, 0.5), matBlue), null, [0, Math.PI / 2, 0]]],
            E: [
                [
                    new THREE.Mesh(CircleGeometry(0.75, 1), matYellowTransparent),
                    null,
                    [0, Math.PI / 2, 0],
                ],
            ],
        } as const;

        const helperRotate = {
            AXIS: [
                [
                    new THREE.Line(lineGeometry, matHelper.clone()),
                    [-1e3, 0, 0],
                    null,
                    [1e6, 1, 1],
                    'helper',
                ],
            ],
        } as const;

        const pickerRotate = {
            XYZE: [[new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), matInvisible)]],
            X: [
                [
                    new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 4, 24), matInvisible),
                    [0, 0, 0],
                    [0, -Math.PI / 2, -Math.PI / 2],
                ],
            ],
            Y: [
                [
                    new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 4, 24), matInvisible),
                    [0, 0, 0],
                    [Math.PI / 2, 0, 0],
                ],
            ],
            Z: [
                [
                    new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 4, 24), matInvisible),
                    [0, 0, 0],
                    [0, 0, -Math.PI / 2],
                ],
            ],
            E: [[new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 2, 24), matInvisible)]],
        } as const;

        const gizmoScale = {
            X: [
                [new THREE.Mesh(scaleHandleGeometry, matRed), [0.5, 0, 0], [0, 0, -Math.PI / 2]],
                [new THREE.Mesh(lineGeometry2, matRed), [0, 0, 0], [0, 0, -Math.PI / 2]],
                [new THREE.Mesh(scaleHandleGeometry, matRed), [-0.5, 0, 0], [0, 0, Math.PI / 2]],
            ],
            Y: [
                [new THREE.Mesh(scaleHandleGeometry, matGreen), [0, 0.5, 0]],
                [new THREE.Mesh(lineGeometry2, matGreen)],
                [new THREE.Mesh(scaleHandleGeometry, matGreen), [0, -0.5, 0], [0, 0, Math.PI]],
            ],
            Z: [
                [new THREE.Mesh(scaleHandleGeometry, matBlue), [0, 0, 0.5], [Math.PI / 2, 0, 0]],
                [new THREE.Mesh(lineGeometry2, matBlue), [0, 0, 0], [Math.PI / 2, 0, 0]],
                [new THREE.Mesh(scaleHandleGeometry, matBlue), [0, 0, -0.5], [-Math.PI / 2, 0, 0]],
            ],
            XY: [
                [
                    new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.01), matBlueTransparent),
                    [0.15, 0.15, 0],
                ],
            ],
            YZ: [
                [
                    new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.01), matRedTransparent),
                    [0, 0.15, 0.15],
                    [0, Math.PI / 2, 0],
                ],
            ],
            XZ: [
                [
                    new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.01), matGreenTransparent),
                    [0.15, 0, 0.15],
                    [-Math.PI / 2, 0, 0],
                ],
            ],
            XYZ: [
                [new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), matWhiteTransparent.clone())],
            ],
        } as const;

        const pickerScale = {
            X: [
                [
                    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 0.6, 4), matInvisible),
                    [0.3, 0, 0],
                    [0, 0, -Math.PI / 2],
                ],
                [
                    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 0.6, 4), matInvisible),
                    [-0.3, 0, 0],
                    [0, 0, Math.PI / 2],
                ],
            ],
            Y: [
                [
                    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 0.6, 4), matInvisible),
                    [0, 0.3, 0],
                ],
                [
                    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 0.6, 4), matInvisible),
                    [0, -0.3, 0],
                    [0, 0, Math.PI],
                ],
            ],
            Z: [
                [
                    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 0.6, 4), matInvisible),
                    [0, 0, 0.3],
                    [Math.PI / 2, 0, 0],
                ],
                [
                    new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 0.6, 4), matInvisible),
                    [0, 0, -0.3],
                    [-Math.PI / 2, 0, 0],
                ],
            ],
            XY: [
                [
                    new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), matInvisible),
                    [0.15, 0.15, 0],
                ],
            ],
            YZ: [
                [
                    new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), matInvisible),
                    [0, 0.15, 0.15],
                    [0, Math.PI / 2, 0],
                ],
            ],
            XZ: [
                [
                    new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.01), matInvisible),
                    [0.15, 0, 0.15],
                    [-Math.PI / 2, 0, 0],
                ],
            ],
            XYZ: [[new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), matInvisible), [0, 0, 0]]],
        } as const;

        const helperScale = {
            X: [
                [
                    new THREE.Line(lineGeometry, matHelper.clone()),
                    [-1e3, 0, 0],
                    null,
                    [1e6, 1, 1],
                    'helper',
                ],
            ],
            Y: [
                [
                    new THREE.Line(lineGeometry, matHelper.clone()),
                    [0, -1e3, 0],
                    [0, 0, Math.PI / 2],
                    [1e6, 1, 1],
                    'helper',
                ],
            ],
            Z: [
                [
                    new THREE.Line(lineGeometry, matHelper.clone()),
                    [0, 0, -1e3],
                    [0, -Math.PI / 2, 0],
                    [1e6, 1, 1],
                    'helper',
                ],
            ],
        } as const;

        (
            [
                // Translate
                ...Object.values(gizmoTranslate),
                ...Object.values(pickerTranslate),
                ...Object.values(helperTranslate),
                // Rotate
                ...Object.values(gizmoRotate),
                ...Object.values(pickerRotate),
                ...Object.values(helperRotate),
                //  scale
                ...Object.values(gizmoTranslate),
                ...Object.values(pickerTranslate),
                ...Object.values(helperTranslate),
            ] as any
        ).forEach((parent: any[]) => {
            parent.forEach((array: any[]) => {
                array.forEach((object: THREE.Mesh) => {
                    if (!object?.geometry) return;
                    // @ts-ignore
                    object.geometry.computeBoundsTree();
                });
            });
        });

        /**
         * Creates an Object3D with gizmos described in custom hierarchy definition.
         * @param gizmoMap
         */
        function setupGizmo(gizmoMap: any) {
            const gizmo = new THREE.Object3D();

            for (const name in gizmoMap) {
                for (let i = gizmoMap[name].length; i--; ) {
                    const object = gizmoMap[name][i][0].clone();
                    const position = gizmoMap[name][i][1];
                    const rotation = gizmoMap[name][i][2];
                    const scale = gizmoMap[name][i][3];
                    const tag = gizmoMap[name][i][4];

                    // name and tag properties are essential for picking and updating logic.
                    object.name = name;
                    object.tag = tag;

                    if (position) {
                        object.position.set(position[0], position[1], position[2]);
                    }

                    if (rotation) {
                        object.rotation.set(rotation[0], rotation[1], rotation[2]);
                    }

                    if (scale) {
                        object.scale.set(scale[0], scale[1], scale[2]);
                    }

                    object.updateMatrix();

                    const tempGeometry = object.geometry.clone();
                    tempGeometry.applyMatrix4(object.matrix);
                    object.geometry = tempGeometry;
                    object.renderOrder = Infinity;

                    object.position.set(0, 0, 0);
                    object.rotation.set(0, 0, 0);
                    object.scale.set(1, 1, 1);

                    gizmo.add(object);
                }
            }

            return gizmo;
        }

        // Gizmo creation

        this.gizmo = {};
        this.picker = {};
        this.helper = {};

        this.add((this.gizmo['translate'] = setupGizmo(gizmoTranslate)));
        this.add((this.gizmo['rotate'] = setupGizmo(gizmoRotate)));
        this.add((this.gizmo['scale'] = setupGizmo(gizmoScale)));
        this.add((this.picker['translate'] = setupGizmo(pickerTranslate)));
        this.add((this.picker['rotate'] = setupGizmo(pickerRotate)));
        this.add((this.picker['scale'] = setupGizmo(pickerScale)));
        this.add((this.helper['translate'] = setupGizmo(helperTranslate)));
        this.add((this.helper['rotate'] = setupGizmo(helperRotate)));
        this.add((this.helper['scale'] = setupGizmo(helperScale)));

        // Pickers should be hidden always

        this.picker['translate'].visible = false;
        this.picker['rotate'].visible = false;
        this.picker['scale'].visible = false;
    }

    /**
     * Will update transformations and appearance of individual handles
     */
    updateMatrixWorld(force: boolean) {
        const space = this.mode === 'scale' ? 'local' : this.space; // scale always oriented to local rotation

        const quaternion = space === 'local' ? this.worldQuaternion : _identityQuaternion;

        // Show only gizmos for current transform mode

        this.gizmo['translate'].visible = this.mode === 'translate';
        this.gizmo['rotate'].visible = this.mode === 'rotate';
        this.gizmo['scale'].visible = this.mode === 'scale';

        this.helper['translate'].visible = this.mode === 'translate';
        this.helper['rotate'].visible = this.mode === 'rotate';
        this.helper['scale'].visible = this.mode === 'scale';

        let handles: any[] = [];
        handles = handles.concat(this.picker[this.mode].children);
        handles = handles.concat(this.gizmo[this.mode].children);
        handles = handles.concat(this.helper[this.mode].children);

        for (let i = 0; i < handles.length; i++) {
            const handle = handles[i];

            // hide aligned to camera

            handle.visible = true;
            handle.rotation.set(0, 0, 0);
            handle.position.copy(this.worldPosition);

            let factor;

            if (this.camera.isOrthographicCamera) {
                factor = (this.camera.top - this.camera.bottom) / this.camera.zoom;
            } else {
                factor =
                    // @ts-ignore
                    this.worldPosition.distanceTo(this.cameraPosition) *
                    Math.min(
                        (1.9 * Math.tan((Math.PI * this.camera.fov) / 360)) / this.camera.zoom,
                        7,
                    );
            }

            handle.scale.set(1, 1, 1).multiplyScalar((factor * this.size) / 4);

            // TODO: simplify helpers and consider decoupling from gizmo

            if (handle.tag === 'helper') {
                handle.visible = false;

                if (handle.name === 'AXIS') {
                    handle.visible = !!this.axis;

                    if (this.axis === 'X') {
                        _tempQuaternion.setFromEuler(_tempEuler.set(0, 0, 0));
                        handle.quaternion.copy(quaternion).multiply(_tempQuaternion);

                        if (
                            Math.abs(
                                _alignVector.copy(_unitX).applyQuaternion(quaternion).dot(this.eye),
                            ) > 0.9
                        ) {
                            handle.visible = false;
                        }
                    }

                    if (this.axis === 'Y') {
                        _tempQuaternion.setFromEuler(_tempEuler.set(0, 0, Math.PI / 2));
                        handle.quaternion.copy(quaternion).multiply(_tempQuaternion);

                        if (
                            Math.abs(
                                _alignVector.copy(_unitY).applyQuaternion(quaternion).dot(this.eye),
                            ) > 0.9
                        ) {
                            handle.visible = false;
                        }
                    }

                    if (this.axis === 'Z') {
                        _tempQuaternion.setFromEuler(_tempEuler.set(0, Math.PI / 2, 0));
                        handle.quaternion.copy(quaternion).multiply(_tempQuaternion);

                        if (
                            Math.abs(
                                _alignVector.copy(_unitZ).applyQuaternion(quaternion).dot(this.eye),
                            ) > 0.9
                        ) {
                            handle.visible = false;
                        }
                    }

                    if (this.axis === 'XYZE') {
                        _tempQuaternion.setFromEuler(_tempEuler.set(0, Math.PI / 2, 0));
                        _alignVector.copy(this.rotationAxis);
                        handle.quaternion.setFromRotationMatrix(
                            _lookAtMatrix.lookAt(_zeroVector, _alignVector, _unitY),
                        );
                        handle.quaternion.multiply(_tempQuaternion);
                        handle.visible = this.dragging;
                    }

                    if (this.axis === 'E') {
                        handle.visible = false;
                    }
                } else if (handle.name === 'START') {
                    handle.position.copy(this.worldPositionStart);
                    handle.visible = this.dragging;
                } else if (handle.name === 'END') {
                    handle.position.copy(this.worldPosition);
                    handle.visible = this.dragging;
                } else if (handle.name === 'DELTA') {
                    handle.position.copy(this.worldPositionStart);
                    handle.quaternion.copy(this.worldQuaternionStart);
                    _tempVector
                        .set(1e-10, 1e-10, 1e-10)
                        .add(this.worldPositionStart)
                        .sub(this.worldPosition)
                        .multiplyScalar(-1);
                    _tempVector.applyQuaternion(this.worldQuaternionStart.clone().invert());
                    handle.scale.copy(_tempVector);
                    handle.visible = this.dragging;
                } else {
                    handle.quaternion.copy(quaternion);

                    if (this.dragging) {
                        handle.position.copy(this.worldPositionStart);
                    } else {
                        handle.position.copy(this.worldPosition);
                    }

                    if (this.axis) {
                        handle.visible = this.axis.search(handle.name) !== -1;
                    }
                }

                // If updating helper, skip rest of the loop
                continue;
            }

            // Align handles to current local or world rotation

            handle.quaternion.copy(quaternion);

            if (this.mode === 'translate' || this.mode === 'scale') {
                // Hide translate and scale axis facing the camera

                const AXIS_HIDE_THRESHOLD = 0.99;
                const PLANE_HIDE_THRESHOLD = 0.2;

                if (handle.name === 'X') {
                    if (
                        Math.abs(
                            _alignVector.copy(_unitX).applyQuaternion(quaternion).dot(this.eye),
                        ) > AXIS_HIDE_THRESHOLD
                    ) {
                        handle.scale.set(1e-10, 1e-10, 1e-10);
                        handle.visible = false;
                    }
                }

                if (handle.name === 'Y') {
                    if (
                        Math.abs(
                            _alignVector.copy(_unitY).applyQuaternion(quaternion).dot(this.eye),
                        ) > AXIS_HIDE_THRESHOLD
                    ) {
                        handle.scale.set(1e-10, 1e-10, 1e-10);
                        handle.visible = false;
                    }
                }

                if (handle.name === 'Z') {
                    if (
                        Math.abs(
                            _alignVector.copy(_unitZ).applyQuaternion(quaternion).dot(this.eye),
                        ) > AXIS_HIDE_THRESHOLD
                    ) {
                        handle.scale.set(1e-10, 1e-10, 1e-10);
                        handle.visible = false;
                    }
                }

                if (handle.name === 'XY') {
                    if (
                        Math.abs(
                            _alignVector.copy(_unitZ).applyQuaternion(quaternion).dot(this.eye),
                        ) < PLANE_HIDE_THRESHOLD
                    ) {
                        handle.scale.set(1e-10, 1e-10, 1e-10);
                        handle.visible = false;
                    }
                }

                if (handle.name === 'YZ') {
                    if (
                        Math.abs(
                            _alignVector.copy(_unitX).applyQuaternion(quaternion).dot(this.eye),
                        ) < PLANE_HIDE_THRESHOLD
                    ) {
                        handle.scale.set(1e-10, 1e-10, 1e-10);
                        handle.visible = false;
                    }
                }

                if (handle.name === 'XZ') {
                    if (
                        Math.abs(
                            _alignVector.copy(_unitY).applyQuaternion(quaternion).dot(this.eye),
                        ) < PLANE_HIDE_THRESHOLD
                    ) {
                        handle.scale.set(1e-10, 1e-10, 1e-10);
                        handle.visible = false;
                    }
                }
            } else if (this.mode === 'rotate') {
                // Align handles to current local or world rotation

                _tempQuaternion2.copy(quaternion);
                _alignVector
                    .copy(this.eye)
                    .applyQuaternion(_tempQuaternion.copy(quaternion).invert());

                if (handle.name.search('E') !== -1) {
                    handle.quaternion.setFromRotationMatrix(
                        _lookAtMatrix.lookAt(this.eye, _zeroVector, _unitY),
                    );
                }

                if (handle.name === 'X') {
                    _tempQuaternion.setFromAxisAngle(
                        _unitX,
                        Math.atan2(-_alignVector.y, _alignVector.z),
                    );
                    _tempQuaternion.multiplyQuaternions(_tempQuaternion2, _tempQuaternion);
                    handle.quaternion.copy(_tempQuaternion);
                }

                if (handle.name === 'Y') {
                    _tempQuaternion.setFromAxisAngle(
                        _unitY,
                        Math.atan2(_alignVector.x, _alignVector.z),
                    );
                    _tempQuaternion.multiplyQuaternions(_tempQuaternion2, _tempQuaternion);
                    handle.quaternion.copy(_tempQuaternion);
                }

                if (handle.name === 'Z') {
                    _tempQuaternion.setFromAxisAngle(
                        _unitZ,
                        Math.atan2(_alignVector.y, _alignVector.x),
                    );
                    _tempQuaternion.multiplyQuaternions(_tempQuaternion2, _tempQuaternion);
                    handle.quaternion.copy(_tempQuaternion);
                }
            }

            // Hide disabled axes
            handle.visible = handle.visible && (handle.name.indexOf('X') === -1 || this.showX);
            handle.visible = handle.visible && (handle.name.indexOf('Y') === -1 || this.showY);
            handle.visible = handle.visible && (handle.name.indexOf('Z') === -1 || this.showZ);
            handle.visible =
                handle.visible &&
                (handle.name.indexOf('E') === -1 || (this.showX && this.showY && this.showZ));

            // highlight selected axis

            handle.material._color = handle.material._color || handle.material.color.clone();
            handle.material._opacity = handle.material._opacity || handle.material.opacity;

            handle.material.color.copy(handle.material._color);
            handle.material.opacity = handle.material._opacity;

            if (this.enabled && this.axis) {
                if (handle.name === this.axis) {
                    handle.material.color.setHex(0xffff00);
                    handle.material.opacity = 1.0;
                } else if (
                    this.axis.split('').some(function (a) {
                        return handle.name === a;
                    })
                ) {
                    handle.material.color.setHex(0xffff00);
                    handle.material.opacity = 1.0;
                }
            }
        }

        super.updateMatrixWorld(force);
    }
}

//

class TransformShapeControlsPlane extends THREE.Mesh {
    isTransformControlsPlane: boolean;
    space: any;
    mode!: string;
    worldQuaternion!: THREE.Quaternion;
    axis: any;

    private worldPosition!: THREE.Vector3;
    private eye!: THREE.Vector3;
    private cameraQuaternion!: THREE.Quaternion;

    constructor() {
        super(
            new THREE.PlaneGeometry(100000, 100000, 2, 2),
            new THREE.MeshBasicMaterial({
                visible: false,
                wireframe: true,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.1,
                toneMapped: false,
            }),
        );

        this.isTransformControlsPlane = true;

        // @ts-ignore
        this.type = 'TransformControlsPlane';
    }

    updateMatrixWorld(force: boolean) {
        let space = this.space;

        this.position.copy(this.worldPosition);

        if (this.mode === 'scale') space = 'local'; // scale always oriented to local rotation

        _v1.copy(_unitX).applyQuaternion(
            space === 'local' ? this.worldQuaternion : _identityQuaternion,
        );
        _v2.copy(_unitY).applyQuaternion(
            space === 'local' ? this.worldQuaternion : _identityQuaternion,
        );
        _v3.copy(_unitZ).applyQuaternion(
            space === 'local' ? this.worldQuaternion : _identityQuaternion,
        );

        // Align the plane for current transform mode, axis and space.

        _alignVector.copy(_v2);

        switch (this.mode) {
            case 'translate':
            case 'scale':
                switch (this.axis) {
                    case 'X':
                        _alignVector.copy(this.eye).cross(_v1);
                        _dirVector.copy(_v1).cross(_alignVector);
                        break;
                    case 'Y':
                        _alignVector.copy(this.eye).cross(_v2);
                        _dirVector.copy(_v2).cross(_alignVector);
                        break;
                    case 'Z':
                        _alignVector.copy(this.eye).cross(_v3);
                        _dirVector.copy(_v3).cross(_alignVector);
                        break;
                    case 'XY':
                        _dirVector.copy(_v3);
                        break;
                    case 'YZ':
                        _dirVector.copy(_v1);
                        break;
                    case 'XZ':
                        _alignVector.copy(_v3);
                        _dirVector.copy(_v2);
                        break;
                    case 'XYZ':
                    case 'E':
                        _dirVector.set(0, 0, 0);
                        break;
                }

                break;
            case 'rotate':
            default:
                // special case for rotate
                _dirVector.set(0, 0, 0);
        }

        if (_dirVector.length() === 0) {
            // If in rotate mode, make the plane parallel to camera
            this.quaternion.copy(this.cameraQuaternion);
        } else {
            _tempMatrix.lookAt(_tempVector.set(0, 0, 0), _dirVector, _alignVector);

            this.quaternion.setFromRotationMatrix(_tempMatrix);
        }

        super.updateMatrixWorld(force);
    }
}

export { TransformShapeControls, TransformShapeControlsGizmo, TransformShapeControlsPlane };
export type { TransformShapeControlsGizmoParams };
