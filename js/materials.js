import * as THREE from 'three';

const loadBlockyTexture = (path) => {
    let tex = new THREE.TextureLoader().load(path);
    tex.flipY = false;
    tex.magFilter = THREE.NearestFilter;
    return tex;
}

const playerTex = loadBlockyTexture("player.png");
const playerTex1 = loadBlockyTexture("player-1.png");
const playerTex2 = loadBlockyTexture("player-2.png");
const drillTex = loadBlockyTexture("drill.png");
const drill1Tex = loadBlockyTexture("drill-1.png");
const drill2Tex = loadBlockyTexture("drill-2.png");

const genPlayerMaterial = (tex) => new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.DoubleSide,
    transparent: true,
});

export const playerMat = genPlayerMaterial(playerTex);
export const playerMat1 = genPlayerMaterial(playerTex1);
export const playerMat2 = genPlayerMaterial(playerTex2);
export const drillMat = genPlayerMaterial(drillTex);
export const drill1Mat = genPlayerMaterial(drill1Tex);
export const drill2Mat = genPlayerMaterial(drill2Tex);

export const redMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    opacity: 0.1,
    transparent: true,
    side: THREE.BackSide,
});