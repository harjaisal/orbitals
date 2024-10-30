import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// TODO
// ui to adjust params/qnums

let quantumNums = { n: 3, l: 1, orbital: "x" }

let numPoints = 500000; // number of points initially generated
let maxRadius = 50000; // radius of points initially generated
let thresholdProbability = 0.9; // removes this proportion of the points with the lowest density
let vertexRadius = 0.1 // radius of each point
let posPhaseColor = 0xff0000; // color in regions where psi is positive
let negPhaseColor = 0x00ff00; // color in regions where psi is negative
let rotationRate = 0.003 // controls speed of automatic rotation
let probabilityColoringMode = 2 // 0: constant, 1: linear grad, 2: exponential grad

const initialZPosition = 17500; // initial camera position
const sidebarWidth = 300; // width of sidebar

let mousedown = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, (window.innerWidth - sidebarWidth) / window.innerHeight, 0.01, 100000000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth - sidebarWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.8;

camera.position.z = initialZPosition;
camera.updateProjectionMatrix();
controls.update();

function wavefunction({ n, l, orbital }, { rho, theta, phi }) {
    const a0 = 529 // scaled by 1000 to improve resolution
    const sigma = rho / a0

    if (n === 1) {
        if (l === 0) {
            if (orbital === "N/A") {
                // 1s
                return (1 / ((Math.PI ** 0.5) * (a0 ** 1.5))) * Math.exp(-sigma)
            }
        }
    } else if (n === 2) {
        if (l === 0) {
            if (orbital === "N/A") {
                // 2s
                return 1 / (4 * ((2 * Math.PI) ** 0.5) * (a0 ** 1.5)) * (2 - sigma) * Math.exp(-sigma / 2)
            }
        } else if (l === 1) {
            if (orbital === "x") {
                // 2px
                return 1 / (4 * ((2 * Math.PI) ** 0.5) * (a0 ** 1.5)) * sigma * Math.exp(-sigma / 2) * Math.sin(phi) * Math.cos(theta)
            } else if (orbital === "y") {
                // 2py
                return 1 / (4 * ((2 * Math.PI) ** 0.5) * (a0 ** 1.5)) * sigma * Math.exp(-sigma / 2) * Math.sin(phi) * Math.sin(theta)
            } else if (orbital === "z") {
                // 2pz
                return 1 / (4 * ((2 * Math.PI) ** 0.5) * (a0 ** 1.5)) * sigma * Math.exp(-sigma / 2) * Math.cos(phi)
            }
        }
    } else if (n === 3) {
        if (l === 0) {
            if (orbital === "N/A") {
                // 3s
                return 1 / (81 * ((3 * Math.PI) ** 0.5) * (a0 ** 1.5)) * (27 - 18 * sigma + 2 * (sigma ** 2)) * Math.exp(-sigma / 3)
            }
        } else if (l === 1) {
            if (orbital === "x") {
                // 3px
                return (2 ** 0.5) / (81 * (Math.PI ** 0.5) * (a0 ** 1.5)) * (6 * sigma - (sigma ** 2)) * Math.exp(-sigma / 3) * Math.sin(phi) * Math.cos(theta)
            } else if (orbital === "y") {
                // 3py
                return (2 ** 0.5) / (81 * (Math.PI ** 0.5) * (a0 ** 1.5)) * (6 * sigma - (sigma ** 2)) * Math.exp(-sigma / 3) * Math.sin(phi) * Math.sin(theta)
            } else if (orbital === "z") {
                // 3pz
                return (2 ** 0.5) / (81 * (Math.PI ** 0.5) * (a0 ** 1.5)) * (6 * sigma - (sigma ** 2)) * Math.exp(-sigma / 3) * Math.cos(phi)
            }
        } else if (l === 2) {
            if (orbital === "xz") {
                // 3dxz
                return (2 ** 0.5) / (81 * (Math.PI ** 0.5) * (a0 ** 1.5)) * (sigma ** 2) * Math.exp(-sigma / 3) * Math.sin(phi) * Math.cos(phi) * Math.cos(theta)
            } else if (orbital === "yz") {
                // 3dyz
                return (2 ** 0.5) / (81 * (Math.PI ** 0.5) * (a0 ** 1.5)) * (sigma ** 2) * Math.exp(-sigma / 3) * Math.sin(phi) * Math.cos(phi) * Math.sin(theta)
            } else if (orbital === "xy") {
                // 3dxy
                return 1 / (81 * ((2 * Math.PI) ** 0.5) * (a0 ** 1.5)) * (sigma ** 2) * Math.exp(-sigma / 3) * (Math.sin(phi) ** 2) * Math.sin(2 * theta)
            } else if (orbital === "z^2") {
                // 3dz^2
                return 1 / (81 * ((6 * Math.PI) ** 0.5) * (a0 ** 1.5)) * (sigma ** 2) * Math.exp(-sigma / 3) * (3 * (Math.cos(phi) ** 2) - 1)
            } else if (orbital === "x^2-y^2") {
                // 3dx^2-y^2
                return 1 / (81 * ((2 * Math.PI) ** 0.5) * (a0 ** 1.5)) * (sigma ** 2) * Math.exp(-sigma / 3) * (Math.sin(phi) ** 2) * Math.cos(2 * theta)
            }
        }
    }
}

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

function genProbabilityDensity(vertices) {
    const vertexData = []
    let maxDensity = 0

    for (let i = 0; i < vertices.length; i++) {
        const { x, y, z, rho, theta, phi } = vertices[i]

        const psi = wavefunction(quantumNums, { rho: rho, theta: theta, phi: phi })

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

let vertices = genVertices(numPoints, maxRadius)
let { vertexData, maxDensity } = genProbabilityDensity(vertices)
let filteredVertexData = filterVerticesByDensity(vertexData, maxDensity, thresholdProbability)
let colors = computeColorsFromProbability(filteredVertexData, posPhaseColor, negPhaseColor, maxDensity, probabilityColoringMode)

let vertexBufferFormat = filteredVertexData.flatMap((vertex) => [vertex.x, vertex.y, vertex.z])
let colorBufferFormat = colors.flatMap((color) => [color.r, color.g, color.b])

let geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertexBufferFormat, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorBufferFormat, 3));

let material = new THREE.PointsMaterial({ vertexColors: true, size: vertexRadius });
let pointCloud = new THREE.Points(geometry, material);
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
    renderer.setSize(window.innerWidth - sidebarWidth, window.innerHeight);
    camera.aspect = (window.innerWidth - sidebarWidth) / window.innerHeight;
    camera.updateProjectionMatrix();
    controls.update()
});

window.addEventListener('mousedown', () => {
    mousedown = true;
})

window.addEventListener('mouseup', () => {
    mousedown = false;
})

function changeN(newVal) {
    quantumNums.n = parseInt(newVal)
    
    const currentRotation = pointCloud.rotation

    if (pointCloud) {
        scene.remove(pointCloud)
    }

    const probabilityDensityOutput = genProbabilityDensity(vertices)
    vertexData = probabilityDensityOutput.vertexData
    maxDensity = probabilityDensityOutput.maxDensity
    filteredVertexData = filterVerticesByDensity(vertexData, maxDensity, thresholdProbability)
    colors = computeColorsFromProbability(filteredVertexData, posPhaseColor, negPhaseColor, maxDensity, probabilityColoringMode)

    vertexBufferFormat = filteredVertexData.flatMap((vertex) => [vertex.x, vertex.y, vertex.z])
    colorBufferFormat = colors.flatMap((color) => [color.r, color.g, color.b])

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertexBufferFormat, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorBufferFormat, 3));

    material = new THREE.PointsMaterial({ vertexColors: true, size: vertexRadius });
    pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    pointCloud.setRotationFromEuler(currentRotation)
}

function changeL(newVal) {
    quantumNums.l = parseInt(newVal)
    
    const currentRotation = pointCloud.rotation

    if (pointCloud) {
        scene.remove(pointCloud)
    }

    const probabilityDensityOutput = genProbabilityDensity(vertices)
    vertexData = probabilityDensityOutput.vertexData
    maxDensity = probabilityDensityOutput.maxDensity
    filteredVertexData = filterVerticesByDensity(vertexData, maxDensity, thresholdProbability)
    colors = computeColorsFromProbability(filteredVertexData, posPhaseColor, negPhaseColor, maxDensity, probabilityColoringMode)

    vertexBufferFormat = filteredVertexData.flatMap((vertex) => [vertex.x, vertex.y, vertex.z])
    colorBufferFormat = colors.flatMap((color) => [color.r, color.g, color.b])

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertexBufferFormat, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorBufferFormat, 3));

    material = new THREE.PointsMaterial({ vertexColors: true, size: vertexRadius });
    pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    pointCloud.setRotationFromEuler(currentRotation)
}

function changeOrbital(newVal) {
    quantumNums.orbital = newVal
    
    const currentRotation = pointCloud.rotation

    if (pointCloud) {
        scene.remove(pointCloud)
    }

    const probabilityDensityOutput = genProbabilityDensity(vertices)
    vertexData = probabilityDensityOutput.vertexData
    maxDensity = probabilityDensityOutput.maxDensity
    filteredVertexData = filterVerticesByDensity(vertexData, maxDensity, thresholdProbability)
    colors = computeColorsFromProbability(filteredVertexData, posPhaseColor, negPhaseColor, maxDensity, probabilityColoringMode)

    vertexBufferFormat = filteredVertexData.flatMap((vertex) => [vertex.x, vertex.y, vertex.z])
    colorBufferFormat = colors.flatMap((color) => [color.r, color.g, color.b])

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertexBufferFormat, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorBufferFormat, 3));

    material = new THREE.PointsMaterial({ vertexColors: true, size: vertexRadius });
    pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    pointCloud.setRotationFromEuler(currentRotation)
}

function changeNumPoints(newVal) {
    numPoints = parseFloat(newVal)

    const currentRotation = pointCloud.rotation

    if (pointCloud) {
        scene.remove(pointCloud)
    }

    vertices = genVertices(numPoints, maxRadius)
    const probabilityDensityOutput = genProbabilityDensity(vertices)
    vertexData = probabilityDensityOutput.vertexData
    maxDensity = probabilityDensityOutput.maxDensity
    filteredVertexData = filterVerticesByDensity(vertexData, maxDensity, thresholdProbability)
    colors = computeColorsFromProbability(filteredVertexData, posPhaseColor, negPhaseColor, maxDensity, probabilityColoringMode)

    vertexBufferFormat = filteredVertexData.flatMap((vertex) => [vertex.x, vertex.y, vertex.z])
    colorBufferFormat = colors.flatMap((color) => [color.r, color.g, color.b])

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertexBufferFormat, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorBufferFormat, 3));

    material = new THREE.PointsMaterial({ vertexColors: true, size: vertexRadius });
    pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    pointCloud.setRotationFromEuler(currentRotation)
}

function changeSamplingRadius(newVal) {
    maxRadius = parseFloat(newVal)

    const currentRotation = pointCloud.rotation

    if (pointCloud) {
        scene.remove(pointCloud)
    }

    vertices = genVertices(numPoints, maxRadius)
    const probabilityDensityOutput = genProbabilityDensity(vertices)
    vertexData = probabilityDensityOutput.vertexData
    maxDensity = probabilityDensityOutput.maxDensity
    filteredVertexData = filterVerticesByDensity(vertexData, maxDensity, thresholdProbability)
    colors = computeColorsFromProbability(filteredVertexData, posPhaseColor, negPhaseColor, maxDensity, probabilityColoringMode)

    vertexBufferFormat = filteredVertexData.flatMap((vertex) => [vertex.x, vertex.y, vertex.z])
    colorBufferFormat = colors.flatMap((color) => [color.r, color.g, color.b])

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertexBufferFormat, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorBufferFormat, 3));

    material = new THREE.PointsMaterial({ vertexColors: true, size: vertexRadius });
    pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    pointCloud.setRotationFromEuler(currentRotation)
}

function changeThresholdProbability(newVal) {
    thresholdProbability = parseFloat(newVal)

    const currentRotation = pointCloud.rotation

    if (pointCloud) {
        scene.remove(pointCloud)
    }

    filteredVertexData = filterVerticesByDensity(vertexData, maxDensity, thresholdProbability)
    colors = computeColorsFromProbability(filteredVertexData, posPhaseColor, negPhaseColor, maxDensity, probabilityColoringMode)

    vertexBufferFormat = filteredVertexData.flatMap((vertex) => [vertex.x, vertex.y, vertex.z])
    colorBufferFormat = colors.flatMap((color) => [color.r, color.g, color.b])

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertexBufferFormat, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorBufferFormat, 3));

    material = new THREE.PointsMaterial({ vertexColors: true, size: vertexRadius });
    pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    pointCloud.setRotationFromEuler(currentRotation)
}

function changeVertexRadius(newVal) {
    vertexRadius = parseFloat(newVal)

    const currentRotation = pointCloud.rotation

    if (pointCloud) {
        scene.remove(pointCloud)
    }

    material = new THREE.PointsMaterial({ vertexColors: true, size: vertexRadius });
    pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    pointCloud.setRotationFromEuler(currentRotation)
}

function changeProbabilityColoringMode(newVal) {
    probabilityColoringMode = parseInt(newVal);

    colors = computeColorsFromProbability(filteredVertexData, posPhaseColor, negPhaseColor, maxDensity, probabilityColoringMode)
    colorBufferFormat = colors.flatMap((color) => [color.r, color.g, color.b])
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorBufferFormat, 3));
}

function changePositivePhaseColor(newVal) {
    posPhaseColor = parseInt(newVal.replace('#', '0x'), 16)

    colors = computeColorsFromProbability(filteredVertexData, posPhaseColor, negPhaseColor, maxDensity, probabilityColoringMode)
    colorBufferFormat = colors.flatMap((color) => [color.r, color.g, color.b])
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorBufferFormat, 3));
}

function changeNegativePhaseColor(newVal) {
    negPhaseColor = parseInt(newVal.replace('#', '0x'), 16)

    colors = computeColorsFromProbability(filteredVertexData, posPhaseColor, negPhaseColor, maxDensity, probabilityColoringMode)
    colorBufferFormat = colors.flatMap((color) => [color.r, color.g, color.b])
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorBufferFormat, 3));
}

function changeRotationRate(newVal) {
    rotationRate = parseFloat(newVal)
}

export { changeN, changeL, changeOrbital, changeNumPoints, changeSamplingRadius, changeThresholdProbability, changeVertexRadius, changeProbabilityColoringMode, changePositivePhaseColor, changeNegativePhaseColor, changeRotationRate }