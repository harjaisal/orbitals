import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const height = window.innerHeight
const width = window.innerWidth - 200

let mousedown = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100000000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.8;

// ADD DYNAMIC Z POSITIONING
camera.position.z = 10000;
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

        // for 3dz^2 ADD CASING
        const rw = (1 / (9 * Math.sqrt(30))) * rho^2 * (Math.E ** (-1 * rho / 2))
        const aw = Math.sqrt(5 / 4) * ((3 * z ** 2 - rho ** 2) / (rho ** 2)) * Math.sqrt(1 / (4 * Math.PI))

        const psi = rw * aw;

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
    
    console.log(verticesAboveThreshold.length)

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
                colors.push({r: color.r, g: color.g, b: color.b})
            } else {
                const color = new THREE.Color(negPhaseColor)
                colors.push({r: color.r, g: color.g, b: color.b})
            }
        } else if (probabilityColoringMode === 1) {
            if (vertex.psi > 0) {
                const color = new THREE.Color(posPhaseColor).multiplyScalar(vertex.density / maxDensity)
                colors.push({r: color.r, g: color.g, b: color.b})
            } else {
                const color = new THREE.Color(negPhaseColor).multiplyScalar(vertex.density / maxDensity)
                colors.push({r: color.r, g: color.g, b: color.b})
            }
        } else {
            if (vertex.psi > 0) {
                const color = new THREE.Color(posPhaseColor).multiplyScalar(2**(vertex.density / maxDensity))
                colors.push({r: color.r, g: color.g, b: color.b})
            } else {
                const color = new THREE.Color(negPhaseColor).multiplyScalar(2**(vertex.density / maxDensity))
                colors.push({r: color.r, g: color.g, b: color.b})
            }
        }
    }

    return colors
}

const numPoints = 1000000; // number of points initially generated
const maxRadius = 5000; // radius of points initially generated
const vertexRadius = 1 // radius of each point
const thresholdProbability = 0.65; // removes this proportion of the points with the lowest density
const posPhaseColor = 0xff0000; // color in regions where psi is positive
const negPhaseColor = 0x00ff00; // color in regions where psi is negative

const vertices = genVertices(numPoints, maxRadius)
const {vertexData, maxDensity} = genProbabiltyDensity(vertices)
const filteredVertexData = filterVerticesByDensity(vertexData, maxDensity, thresholdProbability)
const colors = computeColorsFromProbability(filteredVertexData, posPhaseColor, negPhaseColor, maxDensity, 1)

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
    pointCloud.rotation.y += 0.003;
    pointCloud.rotation.x += 0.003;
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