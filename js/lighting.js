import * as THREE from 'three';

const vertexShader = `

out vec2 uv_frag;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    uv_frag = uv;
}
`;

const fragmentShader = `
uniform sampler2D map;
uniform vec2 lightPos;
uniform float sunFade;

float getLight(vec2 pos, vec2 light) {
    vec2 diff = light-pos;
    float dist = length(diff);
    vec2 norm = diff / 40.0;
    float sum = 0.0;
    for (int i = 0; i < 40; i++) {
        sum += texture(map, pos).w;
        pos += norm;
    }
    float tot = sum * dist * .5;

    return max(0.0, (1.0 - tot) / (10.0*dist));
}

float getGlow(vec2 pos) {
    float maxG = 0.0;
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
            maxG += texture(map, pos + (vec2(i, j) / 100.0)).z;
        }
    }
    return 1.0 - (maxG / 9.0);
}

float getSun(vec2 pos) {
    vec2 diff = vec2(pos.x, 1)-pos;
    float dist = length(diff);
    vec2 norm = diff / 40.0;
    float sum = 0.0;
    for (int i = 0; i < 40; i++) {
        sum += texture(map, pos).w;
        pos += norm;
    }
    float tot = sum * dist * .5;

    return max(0.0, 1.0 - tot);
}

in vec2 uv_frag;
void main() {
    float light = getLight(uv_frag, lightPos);
    float sun = getSun(uv_frag)*sunFade;

    float glow = getGlow(uv_frag);
    gl_FragColor = vec4(0,0,0,1.0 - (sun + light + glow));
}
`;

export class Lighting {
    constructor(texPixWidth, texPixHeight, parentMesh) {
        this.width = Math.floor(texPixWidth/4);
        this.height = Math.floor(texPixHeight/4);
        
        this.target = new THREE.WebGLRenderTarget(this.width, this.height);
        
        this.data = new Uint8Array(this.width * this.height * 4);
        
        for (let i= 0; i < this.data.length; i++) {
            this.data[i] = Math.random() * 255;
        }
        this.texture = new THREE.DataTexture(this.data, this.width, this.height, THREE.RGBAFormat);
        this.texture.flipY = true;
        this.camera = new THREE.OrthographicCamera(0, texPixWidth, 0, texPixHeight, -100, 100);
        this.camera.position.set(0, 0, 0);
        this.scene = new THREE.Scene();
        this.plane = new THREE.Mesh(new THREE.PlaneGeometry(texPixWidth, texPixHeight), new THREE.ShaderMaterial({
            uniforms: {
                map: {type: 'sampler2D', value: this.texture},
                lightPos: {type: 'vec2', value: new THREE.Vector2(.5, .5)},
                sunFade: {type: 'float', value: 1},
            },
            side: THREE.BackSide,
            transparent: true,
            fragmentShader: fragmentShader,
            vertexShader: vertexShader,
        }));
        this.plane.position.set(texPixWidth/2, texPixHeight/2);
        this.scene.add(this.plane);
        this.scene.add(this.camera);
        this.lplane = new THREE.Mesh(new THREE.PlaneGeometry(texPixWidth*4, texPixHeight*4), new THREE.MeshBasicMaterial({
            map: this.target.texture,
            side: THREE.BackSide,
            transparent: true,
        }));
        
        this.lplane.position.set(0, 0, 10);
        parentMesh.add(this.lplane);
    }

    render(renderer) {
        renderer.setRenderTarget(this.target);
        renderer.render(this.scene, this.camera);
        renderer.setRenderTarget(null);
    }
}