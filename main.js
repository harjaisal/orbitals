import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// TODO
// ui to adjust params
// add all wavefunctions/casing behavior

const numPoints = 1000000; // number of points initially generated
const maxRadius = 50000; // radius of points initially generated
const vertexRadius = 1 // radius of each point
const thresholdProbability = 0.95; // removes this proportion of the points with the lowest density
const posPhaseColor = 0xff0000; // color in regions where psi is positive
const negPhaseColor = 0x00ff00; // color in regions where psi is negative
const rotationRate = 0.003 // controls speed of automatic rotation

const initialZPosition = 10000; // initial camera position
const sidebarWidth = 200; // width of sidebar

const height = window.innerHeight
const width = window.innerWidth - sidebarWidth

let mousedown = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 100000000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.8;

// ADD DYNAMIC Z POSITIONING
camera.position.z = initialZPosition;
controls.update()

function genVertices(numPoints, maxRadius) {
    const vertices = [];

    for (let i = 0; i < numPoints; i++) {
        const rho = Math.random() * maxRadius;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = rho * Math.sin(phi) * Math.cos(theta);
        const y = rho * Math.sin(phi) * Math.sin(theta);
        const z = rho * Math.cos(phi);

        vertices.push({ x: x, y: y, z: z, rho: rho, theta: theta, phi: phi });
    }

    return vertices;
}

function genProbabiltyDensity(vertices) {
    const vertexData = []
    let maxDensity = 0

    for (let i = 0; i < vertices.length; i++) {
        const { x, y, z, rho, theta, phi } = vertices[i]

        const a0 = 0.529 // MAY ENED TO SCALE THIS BY 1000
        const sigma = rho / a0

        // for 3dz^2 ADD CASING
        const psi = (1 / ((81 * Math.sqrt(6 * Math.PI)) * (529 ** 1.5))) * (rho / 529) ** 2 * Math.exp((rho / 529) / -3) * (3 * (Math.cos(phi)) ** 2 - 1);

        const psiSquared = psi ** 2

        if (psiSquared > maxDensity) {
            maxDensity = psiSquared
        }

        vertexData.push({ x: x, y: y, z: z, psi: psi, density: psiSquared })
    }

    return { vertexData, maxDensity };
}

function filterVerticesByDensity(vertexData, maxDensity, thresholdProbability) {
    const sortedVertexData = vertexData.sort((a, b) => a.density - b.density)

    const lowerIndex = Math.floor(sortedVertexData.length * thresholdProbability);

    const verticesAboveThreshold = sortedVertexData.slice(lowerIndex, vertexData.length)

    return verticesAboveThreshold
}

function computeColorsFromProbability(vertexData, posPhaseColor, negPhaseColor, maxDensity, probabilityColoringMode) {
    // probabilityColoringMode == 0 means constant color determined by phase
    // probabilityColoringMode == 1 means linear color gradient given by probability, color determined by phase
    // probabilityColoringMode == 2 means exponential color gradient given by probability, color determined by phase

    const colors = []

    for (let i = 0; i < vertexData.length; i++) {
        const vertex = vertexData[i]

        if (probabilityColoringMode === 0) {
            if (vertex.psi > 0) {
                const color = new THREE.Color(posPhaseColor)
                colors.push({ r: color.r, g: color.g, b: color.b })
            } else {
                const color = new THREE.Color(negPhaseColor)
                colors.push({ r: color.r, g: color.g, b: color.b })
            }
        } else if (probabilityColoringMode === 1) {
            if (vertex.psi > 0) {
                const color = new THREE.Color(posPhaseColor).multiplyScalar(vertex.density / maxDensity)
                colors.push({ r: color.r, g: color.g, b: color.b })
            } else {
                const color = new THREE.Color(negPhaseColor).multiplyScalar(vertex.density / maxDensity)
                colors.push({ r: color.r, g: color.g, b: color.b })
            }
        } else {
            if (vertex.psi > 0) {
                const color = new THREE.Color(posPhaseColor).multiplyScalar(2 ** (vertex.density / maxDensity))
                colors.push({ r: color.r, g: color.g, b: color.b })
            } else {
                const color = new THREE.Color(negPhaseColor).multiplyScalar(2 ** (vertex.density / maxDensity))
                colors.push({ r: color.r, g: color.g, b: color.b })
            }
        }
    }

    return colors
}

const vertices = genVertices(numPoints, maxRadius)
const { vertexData, maxDensity } = genProbabiltyDensity(vertices)
const filteredVertexData = filterVerticesByDensity(vertexData, maxDensity, thresholdProbability)
const colors = computeColorsFromProbability(filteredVertexData, posPhaseColor, negPhaseColor, maxDensity, 2)

const vertexBufferFormat = filteredVertexData.flatMap((vertex) => [vertex.x, vertex.y, vertex.z])
const colorBufferFormat = colors.flatMap((color) => [color.r, color.g, color.b])

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertexBufferFormat, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorBufferFormat, 3));

const material = new THREE.PointsMaterial({ vertexColors: true, size: vertexRadius });
const pointCloud = new THREE.Points(geometry, material);
scene.add(pointCloud);

function animate() {
    requestAnimationFrame(animate);
    if (!mousedown) {
        pointCloud.rotation.y += rotationRate;
        pointCloud.rotation.x += rotationRate;
        controls.update()
    }
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    controls.update()
});

window.addEventListener('mousedown', () => {
    mousedown = true;
})

window.addEventListener('mouseup', () => {
    mousedown = false;
})