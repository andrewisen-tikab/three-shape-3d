import type { Vertex } from './types';

export const getMidpoint = (firstVertex: Vertex, secondVertex: Vertex): Vertex => [
    (firstVertex[0] + secondVertex[0]) / 2,
    (firstVertex[1] + secondVertex[1]) / 2,
    (firstVertex[2] + secondVertex[2]) / 2,
];
