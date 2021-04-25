import * as THREE from 'three';
import Matter, { Bodies, Vector } from 'matter-js';
import { Vector2, Vector3 } from 'three';
import { redMat } from './materials';
import { interactions } from './reactions';
import { originalSand } from './sands';

export const WIDTH = 64;
export const STRIDE = 6;
const floodFillDirs = [new Vector2(1, 0), new Vector2(-1, 0), new Vector2(0, -1), new Vector2(0, 1)];
const floodFillDirsRev = [new Vector2(0, 1), new Vector2(0, -1), new Vector2(-1, 0), new Vector2(1, 0)];
const floodFillDirsWithCenter = [new Vector2(1, 0), new Vector2(-1, 0), new Vector2(0, -1), new Vector2(0, 1), new Vector2(0, 0)];


const convertedInteractions = [];

export const sandProperties = [];

export const nameMap = new Map();
nameMap.set('', -1);
nameMap.set('air', -1);
for (let i = 0; i < originalSand.length; i++) {
    nameMap.set(originalSand[i].name, i);
}

const burning = ['lava', 'fire', 'burnedwood', 'hotrock', 'warmrock'];
const boiling = ['lava', 'fire', 'burnedwood', 'hotrock', 'warmrock', 'rock'];
const melting = ['lava', 'fire', 'burnedwood', 'hotrock', 'warmrock', 'rock', 'acid', 'base', 'water', 'oil'];
const metals = ['copper', 'iron', 'gold'];
const dirty = ['darkgrass', 'darkdirt', 'grass', 'dirt'];
const wet = ['water', 'steam'];
const conductive = ['copper', 'iron', 'gold', 'quartz', 'diamond', 'ruby', 'emerald', 'silicon']; // must have equivalent charged material
const conductiveRise = conductive.map(v => v + '-rise');
const conductiveFall = conductive.map(v => v + '-fall');

function buildMaterials() {
    for (let sand of originalSand) {
        if (conductiveRise.includes(sand.name)) {
            sand.convert = [
                {
                    prob: 1,
                    value: sand.name.split('-')[0] + '-charged',
                }
            ];
        }
        if (conductiveFall.includes(sand.name)) {
            sand.convert = [
                {
                    prob: 1,
                    value: sand.name.split('-')[0],
                }
            ];
        }
        if (sand.convert) {
            for (let c of sand.convert) {
                c.value = nameMap.get(c.value);
            }
        }
        sandProperties.push(sand);
    }
}

const burnReactions = {
    'gunpowder': {
        turnTo: 'fire',
        prob: .5,
    },
    'wood': {
        turnTo: 'burnedwood',
        prob: .01,
    },
    'methane': {
        turnTo: 'fire',
        prob: .5,
    },
    'oil': {
        turnTo: 'burningoil',
        prob: .5,
    },
    'leaf': {
        turnTo: 'fire',
        prob: .1,
    },
    'ice': {
        turnTo: 'water',
        prob: .1,
    },
    'cactus': {
        turnTo: 'fire',
        prob: .1,
    },
}


function buildInteractions() {
    for (let v1 = 0; v1 < sandProperties.length; v1++) {
        for (let v2 = v1+1; v2 < sandProperties.length; v2++) {
            let sand1 = sandProperties[v1];
            let sand2 = sandProperties[v2];
            let isBurning1 = burning.includes(sand1.name);
            let isBurning2 = burning.includes(sand2.name);
            let isBoiling1 = boiling.includes(sand1.name);
            let isBoiling2 = boiling.includes(sand2.name);
            let isDirty1 = dirty.includes(sand1.name);
            let isDirty2 = dirty.includes(sand2.name);
            let burnReaction1 = burnReactions[sand1.name];
            let burnReaction2 = burnReactions[sand2.name];
            let conductive1 = conductive.includes(sand1.name);
            let conductive2 = conductive.includes(sand2.name);
            if (isBurning1 && burnReaction2) {
                interactions.unshift({
                    a: sand1.name,
                    b: sand2.name,
                    a1: sand1.name,
                    b1: burnReaction2.turnTo,
                    prob: burnReaction2.prob,
                });
            }
            if (isBurning2 && burnReaction1) {
                interactions.unshift({
                    a: sand2.name,
                    b: sand1.name,
                    a1: sand2.name,
                    b1: burnReaction1.turnTo,
                    prob: burnReaction1.prob,
                });
            }
            if ((isDirty1 && sand2.name === 'water') || (sand1.name === 'water' && isDirty2)) {
                interactions.unshift({
                    a: sand1.name,
                    b: sand2.name,
                    a1: 'mud',
                    b1: 'air',
                    prob: .01,
                });
            }
        }
    }
    for (let i = 0; i < conductive.length; i++) {
        let mat1 = conductive[i];
        interactions.unshift({
            a: mat1,
            b: 'acid',
            a1: mat1 + '-rise',
            b1: 'aciddepleated',
            prob: 1
        },
        {
            a: mat1 + '-charged',
            b: 'base',
            a1: mat1 + '-fall',
            b1: 'basedepleated',
            prob: 1
        });
        for (let j = 0; j < conductive.length; j++) {
            let mat2 = conductive[j];
            if (mat1 === 'silicon' && mat2 === 'copper' || mat1 === 'copper' && mat2 === 'silicon') {
                continue;
            }
            interactions.unshift({
                a: mat1 + '-fall',
                b: mat2 + '-charged',
                a1: mat1 + '-fall',
                b1: mat2 + '-fall',
                prob: 1
            },
            {
                a: mat1,
                b: mat2 + '-rise',
                a1: mat1 + '-rise',
                b1: mat2 + '-rise',
                prob: 1
            },
            {
                a: mat1 + '-rise',
                b: mat2 + '-fall',
                a1: mat1 + '-charged',
                b1: mat2,
                prob: 1
            },
            {
                a: mat1 + '-charged',
                b: mat2,
                a1: mat1 + '-fall',
                b1: mat2 + '-rise',
                prob: .1
            }
            );
        }
    }

    for (let melter of melting) {
        interactions.unshift({
            a: melter,
            b: 'snow',
            a1: melter,
            b1: 'water',
            prob: .01,
        });
        interactions.unshift({ //overridden for water
            a: melter,
            b: 'ice',
            a1: melter,
            b1: 'water',
            prob: .005,
        });
    }

    for (let metal of metals) {
        if (metal === 'iron') {
            continue;
        }
        interactions.unshift({
            a: metal,
            b: 'lava',
            a1: 'lava',
            b1: 'lava',
            prob: .001
        });
        interactions.unshift({
            a: metal + '-charged',
            b: 'lava',
            a1: 'lava',
            b1: 'lava',
            prob: .001
        });
    }
}

 
function convertInteractions() {
    for (let i = 0; i < sandProperties.length+1; i++) {
        let s = new Array(sandProperties.length+1);
        s.fill(null);
        convertedInteractions.push(s);
    }
    for (let interaction of interactions) {
        let idxa = 0;
        let idxb = 0;
        let idxa1 = 0;
        let idxb1 = 0;
        for (let i = 0; i < sandProperties.length; i++) {
            if (sandProperties[i].name === interaction.a) {
                idxa = i+1;
            }
            if (sandProperties[i].name === interaction.b) {
                idxb = i+1;
            }
            if (sandProperties[i].name === interaction.a1) {
                idxa1 = i+1;
            }
            if (sandProperties[i].name === interaction.b1) {
                idxb1 = i+1;
            }
        }
        if (idxa === 0) {
            console.log('A not found: ', interaction.a, 'for interaction', interaction);
        }
        if (idxb === 0) {
            console.log('B not found: ', interaction.b, 'for interaction', interaction)
        }
        if (idxa1 === 0) {
            console.log('A1 not found: ', interaction.a1, 'for interaction', interaction)
        }
        if (idxb1 === 0) {
            console.log('B1 not found: ', interaction.b1, 'for interaction', interaction)
        }
        convertedInteractions[idxa][idxb] = {value: idxa1, prob: interaction.prob};
        convertedInteractions[idxb][idxa] = {value: idxb1, prob: interaction.prob};
    }
}

buildMaterials();
buildInteractions();
convertInteractions();

export class SandWorld {
    constructor() {
        this.chunks = new Map();
        this.engine = Matter.Engine.create({});
        this.engine.timing.timeScale = .6;
        this.renderer = Matter.Render.create({
            // element: document.getElementById('matter-debug'),
            engine: this.engine,
            options: {
              width: 800,
              height: 600,
            },
          });
        this.freeBodies = [];
      
        // Matter.Render.run(this.renderer);

        this.runner = Matter.Runner.create();
        Matter.Runner.run(this.runner, this.engine);
    }

    addChunk(x, y, chunk) {
        this.chunks.set(this.getChunkKey(x, y), chunk);
        this.updateChunkBody(x, y, chunk);
    }

    updateChunkBody(x, y, chunk, dynamic) {
        let chunkVecs = this.calcChunkVertices(chunk);
        chunk.physicsDirty = false;
        for (let body of chunk.bodies) {
            Matter.Composite.remove(this.engine.world, body);
        }
        chunk.bodies = [];
        if (chunkVecs && chunkVecs.length > 0) {
            for (let chunkVec of chunkVecs) {
                let fewerChunkVecs = this.simplifyVertices(chunkVec, .9);
                if (fewerChunkVecs.length < 3) {
                    continue;
                }
                let topV = 10000;
                let leftV = 10000;
                for (let v of fewerChunkVecs) {
                    topV = Math.min(topV, v.y);
                    leftV = Math.min(leftV, v.x);
                }

                let chunkVerts = Matter.Vertices.create(fewerChunkVecs);
                let body = Matter.Bodies.fromVertices(0, 0, chunkVerts, {isStatic: !dynamic, density: 1, friction: .3});    
                if (body) {
                    Matter.Body.setPosition(body, Matter.Vector.create(0, 0));
                    let top = 100000;
                    let left = 100000;
                    for (let vec of body.vertices) {
                        top = Math.min(top, vec.y);
                        left = Math.min(left, vec.x);
                    }
                    Matter.Body.setPosition(body, Matter.Vector.create(x*WIDTH + leftV - left, y*WIDTH + topV - top));
                    Matter.World.add(this.engine.world, body);
                    chunk.bodies.push(body);
                }
            }
        }
    }

    getChunkKey(x, y) {
        return x + ',' + y;
    }

    getChunk(x, y) {
        return this.chunks.get(this.getChunkKey(x, y));
    }

    getLocalValue2(x, y, chunkX, chunkY, chunk) {
        if (x >= 0 && x < chunk.width && y >= 0 && y < chunk.height) {
            const idx = (x + y*chunk.width)*STRIDE;
            return [chunk.data[idx],chunk.data[idx+5]];
        }
        return this.getGlobalValue2(x + chunkX*WIDTH, y + chunkY*WIDTH);
    }

    getGlobalValue2(x, y) {
        let cx = Math.floor(x / WIDTH);
        let cy = Math.floor(y / WIDTH);
        let chunk = this.getChunk(cx, cy);
        if (!chunk || !chunk.active) {
            return [1,0,0,0,0,0];
        }
        let rx = x - cx*WIDTH;
        let ry = y - cy*WIDTH;

        let idx = (rx + ry*WIDTH)*STRIDE;
        return [chunk.data[idx],chunk.data[idx+5]];
    }

    getLocalValue(x, y, chunkX, chunkY, chunk) {
        if (x >= 0 && x < chunk.width && y >= 0 && y < chunk.height) {
            return chunk.data[(x + y*chunk.width)*STRIDE]
        }

        return this.getGlobalValue(x + chunkX*WIDTH, y + chunkY*WIDTH);
    }

    getGlobalValue(x, y) {
        let cx = Math.floor(x / WIDTH);
        let cy = Math.floor(y / WIDTH);
        let chunk = this.getChunk(cx, cy);
        if (!chunk || !chunk.active) {
            return 1;
        }
        let rx = x - cx*WIDTH;
        let ry = y - cy*WIDTH;

        let idx = rx + ry*WIDTH;
        return chunk.data[idx*STRIDE];
    }

    getLocalData(x, y, chunkX, chunkY, chunk) {
        if (x >= 0 && x < chunk.width && y >= 0 && y < chunk.height) {
            const idx = (x + y*chunk.width)*STRIDE;
            return chunk.data.slice(idx, idx+STRIDE);
        }
        return this.getGlobalData(x + chunkX*WIDTH, y + chunkY*WIDTH);
    }

    getGlobalData(x, y) {
        let cx = Math.floor(x / WIDTH);
        let cy = Math.floor(y / WIDTH);
        let chunk = this.getChunk(cx, cy);
        if (!chunk || !chunk.active) {
            return [1,0,0,0,0,0];
        }
        let rx = x - cx*WIDTH;
        let ry = y - cy*WIDTH;

        let idx = rx + ry*WIDTH;
        return chunk.data.slice(idx*STRIDE, (idx+1)*STRIDE);
    }

    setLocalData(x, y, chunkX, chunkY, chunk, typ, vx, vy, ox, oy) {
        if (x >= 0 && x < chunk.width && y >= 0 && y < chunk.height) {
            const idx = (x + y*chunk.width)*STRIDE;
            const oldValue = chunk.data[idx];
            if (oldValue !== typ) {
                const oldStatic = oldValue !== 0 && !!sandProperties[oldValue-1].static;
                const newStatic = typ !== 0 && !!sandProperties[typ-1].static;
                const oldFalling = oldValue !== 0 && !!sandProperties[oldValue-1].falling;
                const newFalling = typ !== 0 && !!sandProperties[typ-1].falling;
                if (newStatic !== oldStatic) {
                    chunk.physicsDirty = true;
                }
                if ((newStatic || oldStatic) && (oldFalling !== newFalling)) {
                    chunk.modifiedSolids.push(new Vector2(x, y));
                }
                chunk.updateLowHigh(x, y);
            }
            chunk.data[idx] = typ;
            chunk.data[idx+1] = vx;
            chunk.data[idx+2] = vy;
            chunk.data[idx+3] = ox;
            chunk.data[idx+4] = oy;
            chunk.data[idx+5] = 1;
        }
        this.setGlobalData(x + chunkX*WIDTH, y + chunkY*WIDTH, typ, vx, vy, ox, oy);
    }

    setGlobalData(x, y, typ, vx, vy, ox, oy) {
        let cx = Math.floor(x / WIDTH);
        let cy = Math.floor(y / WIDTH);
        let chunk = this.getChunk(cx, cy);
        if (!chunk) {
            return;
        }
        let rx = x - cx*WIDTH;
        let ry = y - cy*WIDTH;

        let idx = (rx + ry*WIDTH)*STRIDE;
        const oldValue = chunk.data[idx];
        if (oldValue !== typ) {
            const oldStatic = oldValue !== 0 && !!sandProperties[oldValue-1].static;
            const newStatic = typ !== 0 && !!sandProperties[typ-1].static;
            const oldFalling = oldValue !== 0 && !!sandProperties[oldValue-1].falling;
            const newFalling = typ !== 0 && !!sandProperties[typ-1].falling;
            if (newStatic !== oldStatic) {
                chunk.physicsDirty = true;
            }
            if ((newStatic || oldStatic) && (oldFalling !== newFalling)) {
                chunk.modifiedSolids.push(new Vector2(rx, ry));
            }
            chunk.updateLowHigh(rx, ry);
        }
        chunk.data[idx] = typ;
        chunk.data[idx+1] = vx;
        chunk.data[idx+2] = vy;
        chunk.data[idx+3] = ox;
        chunk.data[idx+4] = oy;
        chunk.data[idx+5] = 1;

    }

    setLocalValue(x, y, chunkX, chunkY, chunk, offs, value) {
        if (x >= 0 && x < chunk.width && y >= 0 && y < chunk.height) {
            const idx = (x + y*chunk.width)*STRIDE + offs;
            const oldValue = chunk.data[idx];
            if (offs === 0 && oldValue !== value) {
                const oldStatic = oldValue !== 0 && !!sandProperties[oldValue-1].static;
                const newStatic = value !== 0 && !!sandProperties[value-1].static;
                const oldFalling = oldValue !== 0 && !!sandProperties[oldValue-1].falling;
                const newFalling = value !== 0 && !!sandProperties[value-1].falling;
                if (newStatic !== oldStatic) {
                    chunk.physicsDirty = true;
                }
                if ((newStatic || oldStatic) && (oldFalling !== newFalling)) {
                    chunk.modifiedSolids.push(new Vector2(x, y));
                }
                chunk.updateLowHigh(x, y);
            }
            chunk.data[(idx - offs) + 5] = 1;
            chunk.data[idx] = value;
        }
        this.setGlobalValue(x + chunkX*WIDTH, y + chunkY*WIDTH, offs, value);
    }

    setGlobalValue(x, y, offs, value) {
        const cx = Math.floor(x / WIDTH);
        const cy = Math.floor(y / WIDTH);
        const chunk = this.getChunk(cx, cy);
        if (!chunk) {
            return;
        }
        const rx = x - cx*WIDTH;
        const ry = y - cy*WIDTH;

        const idx = rx + ry*WIDTH;
        const idxs = idx*STRIDE + offs;
        const oldValue = chunk.data[idxs];
        if (offs === 0 && oldValue !== value) {
            const oldStatic = oldValue !== 0 && !!sandProperties[oldValue-1].static;
            const newStatic = value !== 0 && !!sandProperties[value-1].static;
            const oldFalling = oldValue !== 0 && !!sandProperties[oldValue-1].falling;
            const newFalling = value !== 0 && !!sandProperties[value-1].falling;
            if (newStatic !== oldStatic) {
                chunk.physicsDirty = true;
            }
            if ((newStatic || oldStatic) && (oldFalling !== newFalling)) {
                chunk.modifiedSolids.push(new Vector2(rx, ry));
            }
            chunk.updateLowHigh(rx, ry);
        }
        chunk.data[(idxs - offs) + 5] = 1;
        chunk.data[idxs] = value;
    }

    switchParticlesLocal(x1, y1, x2, y2, chunkX, chunkY, chunk) {
        let d1 = this.getLocalData(x1, y1, chunkX, chunkY, chunk);
        let d2 = this.getLocalData(x2, y2, chunkX, chunkY, chunk);
        this.setLocalData(x1, y1, chunkX, chunkY, chunk, d2[0], d2[1], d2[2], d2[3], d2[4]);
        this.setLocalData(x2, y2, chunkX, chunkY, chunk, d1[0], d1[1], d1[2], d1[3], d1[4]);
    }

    forEachChunk(minChunk, maxChunk, cb) {
        for (let y = maxChunk.y; y >= minChunk.y; y--) {
            for (let x = minChunk.x; x <= maxChunk.x; x++) {
                const chunk = this.getChunk(x, y);
                if (chunk && cb) {
                    cb(chunk, x, y);
                }
            }
        }
    }

    checkFlatten(chunk) {
        if (chunk.bodies.length === 0) {
            return true;
        }

        let body = chunk.bodies[0];
        if (Math.abs(body.velocity.x) < .01 && Math.abs(body.velocity.y) < .01 && Math.abs(body.angularVelocity) < .01) {
            chunk.stillTimer++;
            if (chunk.stillTimer < 10) {
                return false;
            }
            for (let j = 0; j < chunk.height; j++) {
                for (let i = 0; i < chunk.width; i++) {
                    const cidx = i + j*chunk.width;
                    const value = chunk.data[cidx*STRIDE];
                    if (value === 0) {
                        continue;
                    }
                    let vec = new THREE.Vector4((i-chunk.width/2)*4, (j-chunk.height/2)*4, 0, 1);
                    let newPos = vec.applyMatrix4(chunk.pivot.children[0].matrix).applyMatrix4(chunk.pivot.matrix);
                    newPos.divideScalar(4);
                    newPos.floor();
                    let overwrittenValue = this.getGlobalValue(newPos.x, newPos.y);
                    if (overwrittenValue === 0 || !sandProperties[overwrittenValue-1].static) {
                        this.setGlobalData(newPos.x, newPos.y, value, 0, 0, .5, .5);
                    }
                }
            }
            chunk.scene.remove(chunk.pivot);
            Matter.Composite.remove(this.engine.world, body)
            //TODO cleanup materials etc
            return true;
        } else {
            chunk.stillTimer = 0;
        }

        return false;
    }

    resetChunkActive() {
        this.chunks.forEach((c, key) => {
            if (c.wasActive && !c.active) {
                for (let body of c.bodies) {
                    Matter.Composite.remove(this.engine.world, body);
                }
                c.physicsDirty = true;
            }
            c.wasActive = c.active;
            c.active = false;
        });
    }

    update(minChunk, maxChunk) {
        for (let y = maxChunk.y; y >= minChunk.y; y--) {
            for (let x = minChunk.x; x <= maxChunk.x; x++) {
                let chunk = this.getChunk(x, y);
                if (chunk) {
                    chunk.active = true;
                }
            }
        }
        for (let y = maxChunk.y; y >= minChunk.y; y--) {
            for (let x = minChunk.x; x <= maxChunk.x; x++) {
                this.updateChunk(x, y);
            }
        }

        for (let i = 0; i < this.freeBodies.length; i++) {
            const chunk = this.freeBodies[i];
            this.updateChunk(10000, 10000, chunk);
            if (this.checkFlatten(chunk)) {
                this.freeBodies.splice(i, 1);
                i--;
            }
        }

        // This code checks if any broken off solids have detached
        const checkedSolids = new Map();
        for (let y = maxChunk.y; y >= minChunk.y; y--) {
            for (let x = minChunk.x; x <= maxChunk.x; x++) {
                let chunk = this.getChunk(x, y);
                if (!chunk) {
                    continue;
                }
                if (chunk.modifiedSolids.length > 0) {
                    for (let solidPos of chunk.modifiedSolids) {
                        for (let dir of floodFillDirsWithCenter) {
                            const newPos = solidPos.clone().add(dir);
                            let fill = this.floodFillCheckForFall(newPos, x, y, chunk, new Map(), checkedSolids);
                            if (fill && fill !== true && fill.length > 0) {
                                for (let f of fill) {
                                    this.setLocalValue(f.x, f.y, x, y, chunk, 0, 0);
                                }
                                this.addNewFreeBody(fill, x, y);
                            }
                        }
                    }
                    chunk.modifiedSolids = [];
                }
                if (chunk.physicsDirty) {
                    this.updateChunkBody(x, y, chunk);
                }
            }
        }
    }

    addNewFreeBody(points, cx, cy) {
        let mins = new Vector2(10000, 10000);
        let maxs = new Vector2(-10000, -10000);
        for (let p of points) {
            mins.min(p);
            maxs.max(p);
        }
        mins.sub(new Vector2(1, 1));
        maxs.add(new Vector2(1, 1));
        let size = maxs.clone().sub(mins);
        let chunk = new Chunk(size.x, size.y);
        for (let p of points) {
            chunk.data[(p.x - (mins.x + 1) + (p.y - (mins.y + 1))*chunk.width)*STRIDE] = p.z;
        }
        this.updateChunkBody(0, 0, chunk, true);
        if (chunk.bodies[0]) {
            let body = chunk.bodies[0];
            // used for positioning mesh
            chunk.zeroOffset = new Vector2(body.position.x, body.position.y);
            Matter.Body.setPosition(body, Matter.Vector.create(body.position.x + mins.x + cx*WIDTH, body.position.y + mins.y + cy*WIDTH));
            this.freeBodies.push(chunk);
            chunk.stillTimer = 0;
        }
    }

    floodFillCheckForFall(pos, cx, cy, chunk, foundSolids, checkedSolids) {
        const key = (pos.x + cx*WIDTH) + ',' + (pos.y + cy*WIDTH);
        // we already found this solid in this same search, continue
        if (foundSolids.get(key)) {
            return [];
        }
        // we are done completely, this area has already been searched
        if (checkedSolids.get(key)) {
            return false;
        }

        const val = this.getLocalValue(pos.x, pos.y, cx, cy, chunk);
        // nothing to add here
        if (val === 0) {
            return [];
        }
        const props = sandProperties[val-1];
        // non static stuff gets left behind
        if (!props.static) {
            return [];
        }

        // if we reach non falling static ground, we are done!
        if (!props.falling) {
            return true;
        }
        foundSolids.set(key, true);
        checkedSolids.set(key, true);

        let values = [];
        // recurse!
        for (let dir of floodFillDirsRev) {
            let res = this.floodFillCheckForFall(pos.clone().add(dir), cx, cy, chunk, foundSolids, checkedSolids);
            if (res === false) {
                return false;
            }
            if (res === true) {
                return true;
            }
            for (let value of res) {
                values.push(value);
            }
        }
        values.push(new Vector3(pos.x, pos.y, val));
        return values;
    }

    updateChunk(chunkX, chunkY, chunkOverride) {
        
        const chunk = chunkOverride ? chunkOverride : this.getChunk(chunkX, chunkY);

        if (!chunk) {
            return;
        }
        // if (Math.random() > .9) {
        //     chunk.activeLowBound.set(0, 0);
        //     chunk.activeHighBound.set(WIDTH-1, WIDTH-1);
        // }
        const chunkLow = chunk.activeLowBound.clone().max(new Vector2(0, 0));
        const chunkHigh = chunk.activeHighBound.clone().min(new Vector2(chunk.width-1, chunk.height-1));
        chunk.activeHighBound = new Vector2(0, 0);
        chunk.activeLowBound = new Vector2(chunk.width-1, chunk.height-1)
        const flipX = Math.random() > .5;
        let x_start = chunkLow.x;
        let x_end = chunkHigh.x + 1;
        let x_step = 1;
        if (flipX) {
            x_step = -1;
            x_start = x_end-1;
            x_end = chunkLow.x-1;
        }

        for (let y = chunkHigh.y; y >= chunkLow.y; y--) {
            for (let x = x_start; x !== x_end; x += x_step) {
                const localIdx = (x + y*chunk.width) * STRIDE;
                let sandType = chunk.data[localIdx];
                if (sandType === 0) {
                    continue;
                }

                let props = sandProperties[sandType-1];
                if (!props.dynamic) {
                    continue;
                }

                const sandLeft = this.getLocalValue2(x-1, y, chunkX, chunkY, chunk);
                const sandRight = this.getLocalValue2(x+1, y, chunkX, chunkY, chunk);
                const sandUp = this.getLocalValue2(x, y-1, chunkX, chunkY, chunk);
                const sandDown = this.getLocalValue2(x, y+1, chunkX, chunkY, chunk);

                const sandData = chunk.data.slice(localIdx, localIdx+STRIDE);
                let vx = sandData[1];
                let vy = sandData[2];
                let ox = sandData[3];
                let oy = sandData[4];
                const changed = sandData[5];
                if (changed) {
                    chunk.updateLowHigh(x, y);
                    continue;
                }

                // particle conversion
                let convertDown = convertedInteractions[sandDown[0]][sandType];
                if (convertDown !== null && !sandDown[1]) {
                    chunk.updateLowHigh(x, y);
                    if (Math.random() < convertDown.prob) {
                        let convertSelf = convertedInteractions[sandType][sandDown[0]];
                        this.setLocalValue(x, y, chunkX, chunkY, chunk, 0, convertSelf.value);
                        this.setLocalValue(x, y+1, chunkX, chunkY, chunk, 0, convertDown.value);
                        continue;
                    }
                }
                let convertRight = convertedInteractions[sandRight[0]][sandType];
                if (convertRight !== null && !sandRight[1]) {
                    chunk.updateLowHigh(x, y);
                    if (Math.random() < convertRight.prob) {
                        let convertSelf = convertedInteractions[sandType][sandRight[0]];
                        this.setLocalValue(x, y, chunkX, chunkY, chunk, 0, convertSelf.value);
                        this.setLocalValue(x+1, y, chunkX, chunkY, chunk, 0, convertRight.value);
                        continue;
                    }
                }
                let convertLeft = convertedInteractions[sandLeft[0]][sandType];
                if (convertLeft !== null && !sandLeft[1]) {
                    chunk.updateLowHigh(x, y);
                    if (Math.random() < convertLeft.prob) {
                        let convertSelf = convertedInteractions[sandType][sandLeft[0]];
                        this.setLocalValue(x, y, chunkX, chunkY, chunk, 0, convertSelf.value);
                        this.setLocalValue(x-1, y, chunkX, chunkY, chunk, 0, convertLeft.value);
                        continue;
                    }
                }
                let convertUp = convertedInteractions[sandUp[0]][sandType];
                if (convertUp !== null && !sandUp[1]) {
                    chunk.updateLowHigh(x, y);
                    if (Math.random() < convertUp.prob) {
                        let convertSelf = convertedInteractions[sandType][sandUp[0]];
                        this.setLocalValue(x, y, chunkX, chunkY, chunk, 0, convertSelf.value);
                        this.setLocalValue(x, y-1, chunkX, chunkY, chunk, 0, convertUp.value);
                        continue;
                    }
                }

                if (props.convert) {
                    let converted = false;
                    for (let conv of props.convert) {
                        chunk.updateLowHigh(x, y);
                        if (Math.random() < conv.prob) {
                            this.setLocalValue(x, y, chunkX, chunkY, chunk, 0, conv.value+1);
                            converted = true;
                            break;
                        }
                    }
                    if (converted) {
                        continue;
                    }
                }

                if (props.static) {
                    continue;
                }

                if (!props.gas) {
                    vy += 0.5;
                } else {
                    vy -= 0.25;
                    vy *= .8;
                }

                // Stop particles that are surrounded
                if (vy > 0 && sandDown[0]) {
                    vy = 0;
                    oy = .5;
                }
                if (vy < 0 && sandUp[0]) {
                    vy = 0;
                    oy = .5;
                }
                if (vx > 0 && sandRight[0]) {
                    vx = 0;
                    ox = .5;
                }
                if (vx < 0 && sandLeft[0]) {
                    vx = 0;
                    ox = .5;
                }

                if (sandDown[0] === sandType &&
                    sandUp[0] === sandType &&
                    sandLeft[0] === sandType &&
                    sandRight[0] === sandType) {
                    this.setLocalData(x, y, chunkX, chunkY, chunk, sandType, vx, vy, ox, oy);
                    continue;
                }
                chunk.updateLowHigh(x, y);

                //Liquid

                if (props.liquid) {
                    if (sandDown[0]) {
                        const sandDownLeft = this.getLocalValue(x-1, y+1, chunkX, chunkY, chunk);
                        const sandDownRight = this.getLocalValue(x+1, y+1, chunkX, chunkY, chunk);
                        let flowRight = !sandRight[0];
                        let doubleFlowRight = !sandDownRight;
                        let flowLeft = !sandLeft[0];
                        let doubleFlowLeft = !sandDownLeft;
                        let flow = Math.floor(Math.random() * 3);
                        if (flow === 0 && flowRight) {
                            let val = (.4 + Math.random() * .2);
                            if (doubleFlowRight) {
                                val*=2;
                            }
                            vx += val;
                        }
                        if (flow === 2 && flowLeft) {
                            let val = (.4 + Math.random() * .2);
                            if (doubleFlowLeft) {
                                val *= 2;
                            }
                            vx -= val;
                        }
                    } else {
                        vx *= .99;
                    }
                }

                // gas
                if (props.gas) {
                    if (sandUp[0]) {
                        const sandDownLeft = this.getLocalValue(x-1, y-1, chunkX, chunkY, chunk);
                        const sandDownRight = this.getLocalValue(x+1, y-1, chunkX, chunkY, chunk);
                        let flowRight = !sandRight[0];
                        let doubleFlowRight = !sandDownRight;
                        let flowLeft = !sandLeft[0];
                        let doubleFlowLeft = !sandDownLeft;
                        let flow = Math.floor(Math.random() * 3);
                        if (flow === 0 && flowRight) {
                            let val = (.4 + Math.random() * .2);
                            if (doubleFlowRight) {
                                val*=2;
                            }
                            vx += val;
                        }
                        if (flow === 2 && flowLeft) {
                            let val = (.4 + Math.random() * .2);
                            if (doubleFlowLeft) {
                                val *= 2;
                            }
                            vx -= val;
                        }
                    } else {
                        vx *= .85;
                        vx = Math.random() * 2 - 1;
                    }
                }

                //Sand
                
                if (props.sand) {
                    if (sandDown[0]) {
                        const sandDownLeft = this.getLocalValue(x-1, y+1, chunkX, chunkY, chunk);
                        const sandDownRight = this.getLocalValue(x+1, y+1, chunkX, chunkY, chunk);
                        vx *= .9;
                        let flowRight = !sandRight[0] && !sandDownRight;
                        let flowLeft = !sandLeft[0] && !sandDownLeft;
                        let flow = Math.floor(Math.random() * 3);
                        if (flow === 0 && flowRight) {
                            vx += (.4 + Math.random() * .2);
                        }
                        if (flow === 2 && flowLeft) {
                            vx -= (.4 + Math.random() * .2);
                        }
                    }
                }

                vx = Math.max(-4, Math.min(4, vx));
                vy = Math.max(-5, Math.min(5, vy));

                // velocity update

                // target x and y
                let tx = x + ox + vx;
                let ty = y + oy + vy;
                let txFloor = Math.floor(tx);
                let tyFloor = Math.floor(ty);

                let fx = x;
                let fy = y;
                if (txFloor === x && tyFloor === y) {
                    this.setLocalData(x, y, chunkX, chunkY, chunk, sandType, vx, vy, ox+vx, oy+vy);
                } else {
                    let curX = x + ox;
                    let curY = y + oy;
                    let curXFloor = x;
                    let curYFloor = y;

                    let targetAng = Math.atan2(ty - curY, tx - curX);
                    let yDir = vy > 0 ? 1 : -1;
                    let xDir = vx > 0 ? 1 : -1;

                    let collided = false;
                    while (curXFloor != txFloor || curYFloor != tyFloor) {
                        let oldX = curXFloor;
                        let oldY = curYFloor;
                        let dirY = false;
                        if (txFloor === curXFloor) {
                            // move curY floor closer to ty floor
                            curYFloor+=yDir;
                            dirY = true;
                        } else if (tyFloor === curYFloor) {
                            // move curX floor closer to ty floor
                            curXFloor+=xDir;
                        } else {
                            // figure out which move is closer to the slope
                            let yDirAng = Math.atan2(tyFloor - curYFloor - yDir, txFloor - curXFloor);
                            let xDirAng = Math.atan2(tyFloor - curYFloor, txFloor - curXFloor - xDir);
                            if (Math.abs(xDirAng - targetAng) < Math.abs(yDirAng - targetAng)) {
                                // move on x dir
                                curXFloor+=xDir;
                            } else {
                                // move on y dir
                                curYFloor+=yDir;
                                dirY = true;
                            }
                        }

                        if (this.getLocalValue(curXFloor, curYFloor, chunkX, chunkY, chunk)) {
                            curXFloor = oldX;
                            curYFloor = oldY;
                            if (dirY) {
                                vy = 0;
                                oy = .5;
                                ox = .5;
                            } else {
                                vx = 0;
                                ox = .5;
                                oy = .5;
                            }
                            collided = true;
                            break;
                        }
                    }

                    if (!collided) {
                        ox = tx % 1;
                        oy = ty % 1;
                    }

                    fx = curXFloor;
                    fy = curYFloor;

                    this.setLocalValue(x, y, chunkX, chunkY, chunk, 0, 0);
                    this.setLocalData(fx, fy, chunkX, chunkY, chunk, sandType, vx, vy, ox, oy);
                }

                if (fx === x && fy === y) {
                    if (sandDown[0] > 0) {
                        let downProps = sandProperties[sandDown[0] - 1];
                        if (!downProps.static && downProps.density <= props.density && (downProps.liquid || props.liquid || downProps.gas || props.gas)) {
                            if (Math.random() > downProps.density / props.density) {
                                //switch!
                                this.switchParticlesLocal(x, y, x, y+1, chunkX, chunkY, chunk);
                                // if the densities are equal, allow them to mix
                            } else if (downProps.density === props.density && Math.random() > .99) {
                                this.switchParticlesLocal(x, y, x, y+1, chunkX, chunkY, chunk);
                            }
                        }
                    }
                
                    if (sandRight[0] > 0) {
                        let rightProps = sandProperties[sandRight[0] - 1];
                        if (!rightProps.static && (rightProps.liquid || props.liquid)) {
                            let prob = .99;
                            // solids floating on liquids need to be more jittery to allow liquid to flow
                            if ((rightProps.density < props.density && props.liquid) || (props.density < rightProps.density && rightProps.liquid)) {
                                prob = .7;
                            }
                            if (Math.random() > prob) {
                                //switch!
                                this.switchParticlesLocal(x, y, x+1, y, chunkX, chunkY, chunk);
                            }
                        }
                    }
                
                    
                    if (props.gas) {
                        let swap = Math.random() > .7;
                        if (swap) {
                            let dir = Math.floor(Math.random() * 4);
                            let switchIdx = [[1,0], [0,1], [-1,0], [0,-1]][dir];
                            let switchVal = this.getLocalValue(x+switchIdx[0], y+switchIdx[1], chunkX, chunkY, chunk);
                            if (switchVal === 0) {
                                this.switchParticlesLocal(x, y, x+switchIdx[0], y+switchIdx[1], chunkX, chunkY, chunk);
                            } else {
                                let switchProps = sandProperties[switchVal-1];
                                if (switchProps) {
                                    let topDens = props.density;
                                    let botDens = switchProps.density;
                                    let horizontal = false;
                                    if (dir === 0 || dir === 2) { // right or left
                                        horizontal = true;
                                    } else {
                                        if (dir === 3) {
                                            topDens = switchProps.density;
                                            botDens = props.density;
                                        }
                                    }
                                    // Some of the time just swap anyway
                                    if (Math.random() > .5) {
                                        horizontal = true;
                                    }
                                    let densityOk = switchProps.gas && (horizontal || topDens >= botDens);
                                    if (!switchProps.static && (!switchProps.gas || densityOk)) {
                                        this.switchParticlesLocal(x, y, x+switchIdx[0], y+switchIdx[1], chunkX, chunkY, chunk);
                                    }
                                }
                            }
                        }
                    }
                    
                }
                
            }
        }
    }

    calcChunkVertices(chunk) {
        let idx = 0;
        let previousSolids = new Map();
        let previousSolidsDir = new Map();
        const dirs = [new Vector2(0, -1), new Vector2(1, 0), new Vector2(0, 1), new Vector2(-1, 0)];
        const rightSide = [new Vector2(0, -1), new Vector2(0, 0), new Vector2(-1, 0), new Vector2(-1, -1)];
        const allVerts = [];
        for (let j = 0; j < chunk.height; j++) {
            let lastSolid = false;
            for (let i = 0; i < chunk.width; i++) {
                let solid = false;
                let val = chunk.data[idx];
                if (val !== 0 && sandProperties[val-1].static) {
                    solid = true;
                }
                if (solid && !lastSolid && !previousSolids.get(idx + j*STRIDE)) {
                    //unfound solid edge
                    let verts = [];
                    let curPos = new Vector2(i, j+1);
                    let curDir = 0; //up
                    let cnt = 0;
                    while (true) {
                        // cnt++;
                        // if (cnt > 1024) {
                        //     console.log('too long');
                        //     console.log(verts.map(v => v.x + ',' + v.y).join('\n'));
                        //     break;
                        // }
                        // find next block
                        verts.push(curPos);
                        previousSolidsDir.set((curPos.x + curPos.y*(chunk.width+1))*STRIDE + 'd' + curDir, true);
                        previousSolids.set((curPos.x + curPos.y*(chunk.width+1))*STRIDE, true);
                        let found = false;
                        curDir = (curDir + 1) % 4;
                        let checkPos = curPos.clone().add(rightSide[curDir]);
                        if (checkPos.x >= 0 && checkPos.y >= 0 && checkPos.x < chunk.width && checkPos.y < chunk.height) {
                            let blockVal = chunk.data[(checkPos.x + checkPos.y * chunk.width) * STRIDE];
                            if (blockVal !== 0 && sandProperties[blockVal-1].static) {
                                curDir = (curDir + 3) % 4;
                            }
                        }
                        for (let k = 0; k < 4; k++) {
                            let checkPos = curPos.clone().add(rightSide[curDir]);
                            if (checkPos.x >= 0 && checkPos.y >= 0 && checkPos.x < chunk.width && checkPos.y < chunk.height) {
                                let blockVal = chunk.data[(checkPos.x + checkPos.y * chunk.width) * STRIDE];
                                if (blockVal !== 0 && sandProperties[blockVal-1].static) {
                                    curPos = curPos.clone().add(dirs[curDir]);
                                    found = true;
                                    break;
                                }
                            }
                            // no solid block, rotate clockwise
                            curDir = (curDir + 1) % 4;
                        }
                        //if we are back at start, we are done
                        if ((curPos.x === i && curPos.y === j+1) || !found) {
                            break;
                        }
                        curDir = (curDir + 3) % 4;
                    }
                    if (verts.length > 2) {
                        allVerts.push(verts);
                    }
                }

                lastSolid = solid;
                idx += STRIDE;
            }
        }
        return allVerts;
    }

    simplifyVertices(original, distThresh) {
        original.push(original[0].clone());
        let originalPos = original[0];
        let furthest = null;
        let dist = 0;
        for (let i = 0; i < original.length; i++) {
            let d2 = original[i].distanceTo(originalPos);
            if (d2 > dist) {
                furthest = i;
                dist = d2;
            }
        }
        if (furthest === null) {
            return original;
        }
        let curSegs = [0, furthest, original.length-1];
        for (let i = 0; i < curSegs.length-1; i++) {
            let maxDist = 0;
            let distIdx = -1;
            for (let j = curSegs[i]+1; j < curSegs[i+1]; j++) {
                let dist = lineToPoint(original[curSegs[i]], original[curSegs[i+1]], original[j]);
                if (dist > maxDist) {
                    maxDist = dist;
                    distIdx = j;
                }
            }
            if (maxDist > distThresh) {
                curSegs.splice(i + 1, 0, distIdx);
                i--;
            }
        }
        let ret = [];
        for (let i = 0; i < curSegs.length-1; i++) {
            ret.push(original[curSegs[i]]);
        }
        return ret;
    }
}

function lineToPoint(l1, l2, p) {
    return Math.abs((l2.y - l1.y)*p.x - (l2.x - l1.x)*p.y + l2.x*l1.y - l2.y*l1.x)/l1.distanceTo(l2);
}

export class Chunk {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.data = new Array(width*height*STRIDE);
        this.data.fill(0);
        this.active = false;
        this.physicsDirty = false;
        this.bodies = [];
        this.modifiedSolids = [];
        this.activeLowBound = new Vector2();
        this.activeHighBound = new Vector2(width-1, height-1);
        // this.redGeom = new THREE.PlaneGeometry(1, 1);
        // this.redMesh = new THREE.Mesh(this.redGeom, redMat);
    }

    updateLowHigh(x, y) {
        this.activeLowBound.x = Math.min(this.activeLowBound.x, x);
        this.activeHighBound.x = Math.max(this.activeHighBound.x, x);
        this.activeLowBound.y = Math.min(this.activeLowBound.y, y);
        this.activeHighBound.y = Math.max(this.activeHighBound.y, y);
    }
}

