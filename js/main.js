
import Key from './key';
import { Mouse } from './mouse';
import Matter, { Events } from 'matter-js';
import * as THREE from 'three';
import { Color, Vector2 } from 'three';
import { Lighting } from './lighting';
import { TerrainGenerator } from './generation';
import { Chunk, sandProperties, SandWorld, STRIDE, WIDTH, nameMap } from './sandworld';
import { Player } from './player';


const renderer = new THREE.WebGLRenderer();

const width = 1200;
const height = 800;
const pix_width = width / 4;
const pix_height = height / 4;
const pixSize = new Vector2(pix_width, pix_height);
const numXChunks = Math.ceil(pix_width / WIDTH) + 1;
const numYChunks = Math.ceil(pix_height / WIDTH) + 1;
const texPixWidth = numXChunks * WIDTH;
const texPixHeight = numYChunks * WIDTH;


renderer.setSize(width, height);
console.log(document.getElementById('canvas-container'));
document.getElementById('canvas-container').appendChild(renderer.domElement);
renderer.domElement.style = "position:absolute;top:0;left:0;";


const camera = new THREE.OrthographicCamera(0, width, 0, height, -100, 100);
const scene = new THREE.Scene();
const data = new Uint8Array(texPixWidth * texPixHeight*4);
for (let i= 0; i < data.length; i++) {
    data[i] = Math.random() * 255;
}
const sandData = new Array(texPixWidth * texPixHeight * 5);
sandData.fill(0);


const dataTexture = new THREE.DataTexture(data, texPixWidth, texPixHeight, THREE.RGBAFormat);

const testMaterial = new THREE.MeshBasicMaterial({
    map: dataTexture,
    side: THREE.BackSide,
    transparent: true,
});

const viewOffset = new THREE.Vector3(pix_width/2, pix_height/2, 0);

const planeGeometry = new THREE.PlaneGeometry(texPixWidth*4, texPixHeight*4);

const mesh = new THREE.Mesh(planeGeometry, testMaterial);

const lighting = new Lighting(texPixWidth, texPixHeight, mesh);

scene.add(mesh);

const cameraPivot = new THREE.Object3D();
scene.add(cameraPivot);

mesh.position.set(width/2, height/2, 0);

const sandWorld = new SandWorld();

const player = new Player(new Vector2(0, 0), sandWorld, scene);
const entities = [player];
const generator = new TerrainGenerator('seed', sandProperties);

function updateSand() {

    let lowX = Math.floor((viewOffset.x - pix_width/2)/WIDTH);
    let lowY = Math.floor((viewOffset.y - pix_height/2)/WIDTH);
    let highX = lowX + numXChunks - 1;
    let highY = lowY + numYChunks - 1;

    for (let e of entities) {
        e.update(sandWorld, viewOffset, pixSize);
        if (e.checkBounds) {
            e.checkBounds(new Vector2(lowX * WIDTH, lowY * WIDTH), new Vector2((highX + 1) * WIDTH, (highY + 1) * WIDTH), sandWorld);
        }
    }

    sandWorld.resetChunkActive();

    // TODO add light position here
    lighting.plane.material.uniforms.lightPos.value = new THREE.Vector2((player.body.position.x - lowX*WIDTH) / texPixWidth, 1 - (player.body.position.y - lowY*WIDTH) / texPixHeight);
    lighting.plane.material.uniforms.sunFade.value = 1 - Math.max(Math.min(1, (viewOffset.y + pix_height/4)/WIDTH - 2), 0);
    sandWorld.update({x: lowX-1, y: lowY-2}, {x: highX+1, y: highY});


    for (let x = lowX; x <= highX; x++) {
        for (let y = lowY; y <= highY; y++) {
            
            if (!sandWorld.getChunk(x, y)) {
                let chunk = new Chunk(WIDTH, WIDTH);
                chunk.data = generator.generateChunk(x, y, WIDTH, STRIDE);
                // if (y > 3) {
                //     if (Math.random() > .9) {
                //         placeEnemy(x, y, chunk);
                //     }
                // }
                // // scene.add(chunk.redMesh);
                sandWorld.addChunk(x, y, chunk);
            }
        }
    }

    copySandToTex();
    dataTexture.needsUpdate = true;
    testMaterial.needsUpdate = true;
    lighting.texture.needsUpdate = true;

    updateFreeBodyTextures();
}

function updateFreeBodyTextures() {
    for (let chunk of sandWorld.freeBodies) {
        if (!chunk.mesh) {
            chunk.colorData = new Uint8Array(chunk.width*chunk.height*4);
            chunk.texture = new THREE.DataTexture(chunk.colorData, chunk.width, chunk.height, THREE.RGBAFormat);

            chunk.material = new THREE.MeshBasicMaterial({
                map: chunk.texture,
                side: THREE.BackSide,
                transparent: true,
            });

            const geom = new THREE.PlaneGeometry(chunk.width*4, chunk.height*4);

            chunk.mesh = new THREE.Mesh(geom, chunk.material);
            chunk.pivot = new THREE.Object3D();
            chunk.pivot.add(chunk.mesh);
            chunk.mesh.position.set((-chunk.zeroOffset.x + chunk.width/2)*4, (-chunk.zeroOffset.y + chunk.height/2)*4)
            cameraPivot.add(chunk.pivot);
            chunk.scene = cameraPivot;
        }

        let tidx = 0;
        let idx = 0;
        for (let j = 0; j < chunk.height; j++) {
            for (let i = 0; i < chunk.width; i++) {
                const sandType = chunk.data[idx];
                chunk.data[idx + 5] = 0;
                if (sandType === 0) {
                    chunk.colorData.set([0,0,0,0], tidx);

                } else {
                    const props = sandProperties[sandType - 1];
                    chunk.colorData.set([props.color.r*255, props.color.g*255, props.color.b*255, !props.alpha ? 255 : props.alpha*255], tidx);
                }
                idx += STRIDE;
                tidx += 4;
            }
        }
        chunk.pivot.rotation.set(0, 0, chunk.bodies[0].angle);
        chunk.pivot.position.set(chunk.bodies[0].position.x*4, chunk.bodies[0].position.y*4, 1);
        chunk.material.needsUpdate = true;
        chunk.texture.needsUpdate = true;
    }
}

function copySandToTex() {
    let lowX = Math.floor((viewOffset.x - pix_width/2)/WIDTH);
    let lowY = Math.floor((viewOffset.y - pix_height/2)/WIDTH);
    let highX = lowX + numXChunks - 1;
    let highY = lowY + numYChunks - 1;
    lighting.data.fill(255);
    sandWorld.forEachChunk({x: lowX, y: lowY}, {x: highX, y: highY}, (chunk, x, y) => {
        let cidx = 0;
        for (let j = 0; j < WIDTH; j++) {
            for (let i = 0; i < WIDTH; i++) {
                const xPos = (x-lowX)*WIDTH + i;
                const yPos = j + (y-lowY)*WIDTH;
                const sidx = (xPos + (yPos)*texPixWidth);
                const sandType = chunk.data[cidx];
                chunk.data[cidx + 5] = 0;
                if (sandType === 0) {
                    data[sidx*4] = 0;
                    data[sidx*4+1] = 0;
                    data[sidx*4+2] = 0;
                    data[sidx*4+3] = 0;
                    // data.set([0, 0, 0, 0], sidx*4);
                    lighting.data[(Math.floor(xPos/4) + Math.floor(yPos/4)*lighting.width)*4+3] = 0;
                    cidx+=STRIDE;
                    continue;
                }

                const props = sandProperties[sandType-1];
                if (!props.static) {
                    const idxBase = (Math.floor(xPos/4) + Math.floor(yPos/4)*lighting.width)*4;
                    lighting.data[idxBase+3] = 0;
                    if (props.emits) {
                        lighting.data[idxBase+2] = 0;
                    }
                } else if (props.shadow) {
                    const idxBase = (Math.floor(xPos/4) + Math.floor(yPos/4)*lighting.width)*4;
                    lighting.data[idxBase+3] = props.shadow;
                }

                data[sidx*4] = props.color.r*255;
                data[sidx*4+1] = props.color.g*255;
                data[sidx*4+2] = props.color.b*255;
                data[sidx*4+3] = !props.alpha ? 255 : props.alpha*255;
                // data.set([props.color.r*255, props.color.g*255, props.color.b*255, !props.alpha ? 255 : props.alpha*255], sidx*4);
                cidx+=STRIDE;
            }
        }
    });
    let lowXPx = (viewOffset.x - pix_width/2);
    let lowYPx = (viewOffset.y - pix_height/2);
    let chunkRelX = ((lowXPx % WIDTH) + WIDTH) % WIDTH;
    let chunkRelY = ((lowYPx % WIDTH) + WIDTH) % WIDTH;

    mesh.position.set(texPixWidth*2 - chunkRelX*4, texPixHeight*2 - chunkRelY*4, 0)
}

function initListeners() {
    Mouse.init(document);
    Events.on(sandWorld.engine, 'collisionStart', event => {
        for (let i = 0; i < event.pairs.length; i++) {
            let pair = event.pairs[i];
            for (let e of entities) {
                if (e.collisionStart) {
                    e.collisionStart(pair);
                }
            }
        }
    });
    Events.on(sandWorld.engine, 'collisionEnd', event => {
        for (let i = 0; i < event.pairs.length; i++) {
            let pair = event.pairs[i];
            for (let e of entities) {
                if (e.collisionEnd) {
                    e.collisionEnd(pair);
                }
            }
        }
    });
}

initListeners();
const brushSize = 3;
let steps = 0;
function render() {
    viewOffset.x = player.body.position.x;
    viewOffset.y = player.body.position.y;

    cameraPivot.position.set(-(viewOffset.x - pix_width/2)*4, -(viewOffset.y - pix_height/2)*4);
    steps++;
    if (Mouse.leftDown) {
        
        let mousePos = new THREE.Vector2(Mouse.x, Mouse.y);
        mousePos.divideScalar(4).floor();
        let material = 1;
        for (let i = 0; i < 10; i++) {
            if (Key.isDown(Key.ZERO + i)) {
                material = i+1;
            }
        }
        if (Key.isDown(Key.R)) {
            material = nameMap.get('oil')+1;
        }
        if (Key.isDown(Key.M)) {
            material = nameMap.get('lava')+1;
        }

        if (material !== 1) {
            for (let i = -brushSize+1; i < brushSize; i++) {
                for (let j = -brushSize+1; j < brushSize; j++) {
                    sandWorld.setGlobalValue(Math.floor(mousePos.x + i + viewOffset.x - pix_width/2), Math.floor(mousePos.y + j + viewOffset.y - pix_height/2), 0, material);
                }
            }
        }
    }
    updateSand();
    renderer.setClearAlpha(0)
    lighting.render(renderer);
    // user camera position to get background color?
    const color = getClearColor(viewOffset.y);
    renderer.setClearColor(color);
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

function getClearColor(y) {
    const caveColor = new Color(0x444444);
    const skyColor = new Color(0xaaddff);
    const top = 64;
    const bot = 128+64;
    if (y < top) {
        return skyColor;
    }
    if (y > bot) {
        return caveColor;
    }
    const mix = (y - top) / (bot - top);
    return skyColor.multiplyScalar(1-mix).add(caveColor.multiplyScalar(mix));
}

render();

