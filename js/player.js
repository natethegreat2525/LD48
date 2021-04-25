import Matter, { Body, Events, Vector } from 'matter-js';
import { Vector2 } from 'three';
import Key from './key';
import * as THREE from 'three';
import { nameMap, sandProperties } from './sandworld';
import { drillMat, drill1Mat, drill2Mat, playerMat, playerMat1, playerMat2 } from './materials';
import { Mouse } from './mouse';

export class Player {
    constructor(position, world, scene) {
        this.position = position;
        const width = 14;
        const height = 10;
        const chamfer = 3;
        this.width = width;
        this.height = height;
        this.keyUpNotPressed = true;
        this.usingJetpack = false;
        this.facing = 1;
        this.trackTimer = 0;
        this.digTimer = 0;
        this.drillTimer = 0;

        this.energy = 100;
        this.health = 100;
        this.coolant = 0;
        this.storage = 0;

        this.energyCapacity = 100;
        this.healthCapacity = 100;
        this.storageCapacity = 100;

        this.energyEfficiency = 1;
        this.armor = 1;
        this.cooling = 1;
        this.maxStorage = 1;
        this.drillEfficiency = 1;

        this.inventory = [];

        this.forceDir = new Vector2();

        const wmul = .8;
        this.body = Matter.Bodies.fromVertices(position.x, position.y, [
            new Vector2(chamfer, 0), new Vector2(width*wmul-chamfer, 0),
            new Vector2(width*wmul, chamfer), new Vector2(width*wmul, height-chamfer),
            new Vector2(width*wmul-chamfer, height), new Vector2(chamfer, height),
            new Vector2(0, height-chamfer), new Vector2(0, chamfer)
        ], {
            inertia: Infinity,
            friction: 0,
        });

        this.grounded = 0;
        this.sensor = Matter.Bodies.rectangle(0, 0, 4, 3, {isSensor: true, isStatic: false});
        Matter.World.add(world.engine.world, this.sensor);
        Matter.World.add(world.engine.world, this.body);

        const planeGeometry = new THREE.PlaneGeometry(width*4, height*4);

        const mesh = new THREE.Mesh(planeGeometry, playerMat);

        this.drillPivot = new THREE.Object3D();
        const drillGeom = new THREE.PlaneGeometry(width*3, width*3);
        this.drillMesh = new THREE.Mesh(drillGeom, drillMat);
        this.drillPivot.add(this.drillMesh);
        this.drillMesh.position.set(20, 0, 0);
        mesh.add(this.drillPivot);
        scene.add(mesh);
        this.mesh = mesh;

        this.notifyTimer = 0;
        this.oldVelocity = [0, 0, 0, 0];
        this.warnTimer = 0;
    }

    updateHUD() {
        let healthBar = document.getElementById('health-bar');
        let energyBar = document.getElementById('energy-bar');
        let coolantBar = document.getElementById('coolant-bar');
        let storageBar = document.getElementById('storage-bar');

        let toPerc = (v, vc) => (100*v/vc) + '%';
        healthBar.style.height = toPerc(this.health, this.healthCapacity);
        energyBar.style.height = toPerc(this.energy, this.energyCapacity);
        coolantBar.style.height = toPerc(this.coolant, 100);
        storageBar.style.height = toPerc(this.storage, this.storageCapacity);
    }

    damage(val) {
        console.log("damage", val);
        this.health -= val;
    }

    collisionStart(pair) {
        if ((pair.bodyA === this.sensor && pair.bodyB !== this.body) || (pair.bodyB === this.sensor && pair.bodyA !== this.body)) {
            this.grounded++;
            if (this.oldVelocity[1] > 2.5 + this.armor/2) {
                this.damage((this.oldVelocity[1] - (1.5 + this.armor / 2)) * 10)
                this.oldVelocity = [0, 0, 0, 0];
            }
        }
    }

    collisionEnd(pair) {
        if (pair.bodyA === this.sensor && pair.bodyB !== this.body) {
            this.grounded--;
        } else if (pair.bodyB === this.sensor && pair.bodyA !== this.body) {
            this.grounded--;
        }
    }

    digTerrain(sandWorld, angle, size) {
        let curX = this.body.position.x;
        let curY = this.body.position.y;
        let dirX = Math.cos(angle)/2;
        let dirY = Math.sin(angle)/2;
        curX = curX + dirX * 2;
        curY = curY + dirY * 2;
        const rad = Math.floor(size);
        this.digLocation(curX, curY, rad, sandWorld, angle);
    }

    updateNotifyText(name, warn) {
        if (this.notifyTimer > 0 && !warn) {
            return;
        }
        if (warn && this.warnTimer > 0) {
            return;
        }
        if (warn) {
            this.warnTimer = 120;
        } else {
            this.notifyTimer = 60;
        }
        let el = document.getElementById('notify-text');
        let nEl = el.cloneNode(true);
        if (warn) {
            nEl.style = "color: red";
        }
        nEl.id = 'notify-child';
        nEl.textContent = name.toUpperCase();
        el.parentNode.appendChild(nEl);
        setTimeout(() => {
            nEl.parentNode.removeChild(nEl);
        }, 3000);
    }

    digLocation(curX, curY, rad, sandWorld, angle) {
        const px = Math.floor(curX);
        const py = Math.floor(curY);
        const aX = Math.cos(angle);
        const aY = Math.sin(angle);
        const stone = nameMap.get('stone');
        const darkStone = nameMap.get('darkstone');
        const grass = nameMap.get('grass');
        const darkGrass = nameMap.get('darkgrass');
        const dirt = nameMap.get('dirt');
        const darkDirt = nameMap.get('darkdirt');
        const mud = nameMap.get('mud');
        for (let j = -rad; j <= rad; j++) {
            for (let k = -rad; k <= rad; k++) {
                const dist = new Vector2(px + j, py + k).distanceTo(new Vector2(curX, curY));
                if (dist < rad && aX*j + aY*k > -.1) {
                    let val = sandWorld.getGlobalValue(px + j, py + k);
                    if (val > 0) {
                        let props = sandProperties[val-1];
                        val--;
                        if (!props.liquid && !props.gas) {
                            if (val !== stone && val !== darkStone && val !== dirt && val !== darkDirt && val !== grass && val !== darkGrass) {
                                if (this.storage < this.storageCapacity) {
                                    this.inventory.push(val);
                                    this.storage+=.2;
                                    this.updateNotifyText("+ " + props.name.toUpperCase());
                                } else {
                                    this.updateNotifyText("STORAGE FULL", true);
                                }
                            }
                            sandWorld.setGlobalValue(px + j, py + k, 0, 0);
                        }
                    }
                }
            }
        }
    }

    screenToLocal(pos, offset, pixSize) {
        return pos.clone().divideScalar(4).add(offset).sub(pixSize.clone().divideScalar(2));
    }

    checkInteractions(sandWorld) {
        let numWaterAbsorbed = 0;
        for (let i = 0; i < 14; i++) {
            let j = Math.floor(Math.random() * 10)
            let x = Math.floor(i + this.body.position.x - this.width/2);
            let y = Math.floor(j + this.body.position.y - this.height/2);
            let val = sandWorld.getGlobalValue(x, y);
            if (val === nameMap.get('water') + 1 && this.coolant < 100 && numWaterAbsorbed < 3) {
                sandWorld.setGlobalValue(x, y, 0, 0);
                this.coolant += .1;
                numWaterAbsorbed++;
            }
        }

    }

    update(sandWorld, offset, pixSize) {
        const MOVE_ENERGY = .01;
        const FLY_ENERGY = .1;
        const DIG_ENERGY = .03;
        const DEFAULT_ENERGY = .01;
        this.updateHUD();
        this.checkInteractions(sandWorld);

        this.notifyTimer--;
        this.warnTimer--;
        this.oldVelocity.push(this.body.velocity.y);
        this.oldVelocity.shift();

        let mouseWorldPos = this.screenToLocal(new Vector2(Mouse.x, Mouse.y), offset, pixSize);
        let diff = mouseWorldPos.sub(this.body.position);

        if (this.energy < this.energyCapacity * .3) {
            if (this.energy < this.energyCapacity * .1) {
                this.updateNotifyText('FUEL CRITICAL', true);
            } else {
                this.updateNotifyText('FUEL LOW', true);
            }
        }
        this.energy -= DEFAULT_ENERGY;
        if (Mouse.leftDown || this.digTimer > 0) {
            this.energy -= DIG_ENERGY;
            this.digTimer++;
            this.drillTimer++;
        } else {
            this.digTimer = 0;
        }
        if (this.digTimer >= this.drillEfficiency) {
            this.digTimer = 0;
            this.digTerrain(sandWorld, Math.atan2(diff.y, diff.x), 7);
        }

        this.drillPivot.rotation.set(0, 0, Math.atan2(diff.y, diff.x));

        this.mesh.material = [playerMat, playerMat1, playerMat2][Math.floor(this.trackTimer / 2) % 3];
        this.drillMesh.material = [drillMat, drill2Mat, drill1Mat][Math.floor(this.drillTimer / 2) % 3];

        Matter.Body.setPosition(this.sensor, new Vector2(this.body.position.x, this.body.position.y).add(new Vector2(0, this.height/2 - 1)));
        Matter.Body.setVelocity(this.sensor, {x: 0, y: 0});
        this.mesh.position.set(1200/2, 800/2, -2);
        let newVx = 0;
        let newVy = this.body.velocity.y;
        if (this.grounded > 0) {
            newVy = Math.max(newVy, -.1);
        }

        let jump = Key.isDown(Key.UP) || Key.isDown(Key.W);

        if (jump && this.grounded > 0) {
            newVy = -1.2*2;
        }
        if (jump && this.grounded === 0 && this.keyUpNotPressed) {
            this.usingJetpack = true;
        }
        if (jump && this.usingJetpack) {
            this.energy -= FLY_ENERGY;
            newVy -= .3;
            if (newVy < 0) {
                newVy *= .9;
            }
        }
        if (!jump) {
            this.usingJetpack = false;
        }
        this.keyUpNotPressed = !jump;

        if (!jump && this.grounded === 0 && newVy < 0) {
            newVy = Math.max(newVy, -.5);
        }
        if (Key.isDown(Key.LEFT) || Key.isDown(Key.A)) {
            this.energy -= MOVE_ENERGY;
            this.trackTimer++;
            this.facing = 0;
            newVx = -1;
        }
        if (Key.isDown(Key.RIGHT) || Key.isDown(Key.D)) {
            this.energy -= MOVE_ENERGY;
            this.trackTimer--;
            if (this.trackTimer < 0) {
                this.trackTimer = 1024;
            }
            this.facing = 2;
            newVx = 1;
        }
        newVx += this.forceDir.x;
        newVy += this.forceDir.y;
        this.forceDir = new Vector2(this.forceDir.x * .9, 0);
        if (this.forceDir.x < .1) {
            this.forceDir.x = 0;
        }
        Body.setVelocity(this.body, new Vector2(newVx, newVy));

        //throw particles below
        if (newVx !== 0 || Math.abs(newVy) > .5) {
            for (let j = 0; j < 6; j++) {
                for (let i = 0; i < this.width; i++) {
                    const x = Math.floor(this.body.position.x + i - this.width/2);
                    const y = Math.floor(this.body.position.y - j + this.height/2);
                    let value = sandWorld.getGlobalValue(x, y);
                    if (value !== 0 && (sandProperties[value-1].liquid || sandProperties[value-1].sand)) {
                        sandWorld.setGlobalData(x, y, value, Math.random() * 2 - 1, -Math.random()*4, .5, .5);
                    }
                }
            }
        }

        if (this.usingJetpack) {
            let xPos = this.body.position.x;
            let yPos = this.body.position.y + this.height/2 - 1;
            let value = sandWorld.getGlobalValue(Math.floor(xPos), Math.floor(yPos)+3);
            if (value === 0 && Math.random() > .5) {
                sandWorld.setGlobalData(
                    Math.floor(xPos),
                    Math.floor(yPos)+3,
                    nameMap.get('exhaust')+1, Math.random()*2 - 1, Math.random() + 1, .5, .5);
            }
            value = sandWorld.getGlobalValue(Math.floor(xPos)+1, Math.floor(yPos)+2);
            if (value === 0 && Math.random() > .5) {
                sandWorld.setGlobalData(
                    Math.floor(xPos)+1,
                    Math.floor(yPos)+2,
                    nameMap.get('exhaust')+1, Math.random()*2 - 1, Math.random() + 1, .5, .5);
            }
            value = sandWorld.getGlobalValue(Math.floor(xPos)-1, Math.floor(yPos)+2);
            if (value === 0 && Math.random() > .5) {
                sandWorld.setGlobalData(
                    Math.floor(xPos) - 1,
                    Math.floor(yPos)+2,
                    nameMap.get('exhaust')+1, Math.random()*2 - 1, Math.random() + 1, .5, .5);
            }
        }

        this.wasGrounded = this.grounded;
        this.position = new Vector2(this.body.position.x, this.body.position.y);
    }
}