import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const height = window.innerHeight
const width = window.innerWidth - 200

let mousedown = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true; // smooth rotation
controls.dampingFactor = 0.8;

camera.position.z = 10;
controls.update()

// Function to generate points based on wavefunction squared
function generateWavefunctionSquared(numPoints, maxRadius) {
    const vertices = [];
    const colors = [];

    for (let i = 0; i < numPoints; i++) {
        const r = Math.random() * maxRadius;
        const theta = Math.acos(2 * Math.random() - 1);
        const phi = Math.random() * 2 * Math.PI;

        const x = r * Math.sin(theta) * Math.cos(phi);
        const y = r * Math.sin(theta) * Math.sin(phi);
        const z = r * Math.cos(theta);

        const rw = (1 / (9 * Math.sqrt(6))) * r * (4 - r) * (2.71828**(-1 * r / 2))
        const aw = (x * Math.sqrt(3) / r) * (1 / (4 * 3.14159))**0.5
        const psi = rw * aw;

        console.log(psi**2)

        if ((psi**2) > 0.00001) {
            vertices.push(x, y, z);

            if (psi > 0) {
                const color = new THREE.Color(0x00ff00).multiplyScalar(2**psi**2);
                colors.push(color.r, color.g, color.b)
            } else {
                const color = new THREE.Color(0xff0000).multiplyScalar(2**psi**2);
                colors.push(color.r, color.g, color.b)
            }
        }
    }

    return { vertices, colors };
}

// Generate points and colors
const numPoints = 1000000;
const maxRadius = 250;
const { vertices, colors } = generateWavefunctionSquared(numPoints, maxRadius);

// Create geometry and set the vertices and colors
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

// Set the material to use vertex colors
const material = new THREE.PointsMaterial({ vertexColors: true, size: 0.1 });
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