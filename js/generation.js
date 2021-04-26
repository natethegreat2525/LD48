import SimplexNoise from 'simplex-noise';

export class TerrainGenerator {
    constructor(seed, sandProperties) {
        this.noise1 = new SimplexNoise(seed);
        this.noise2 = new SimplexNoise(seed+1);
        this.noise3 = new SimplexNoise(seed+2);

        this.nameMap = new Map();
        this.nameMap.set('', 0);
        this.nameMap.set('air', 0);
        for (let i = 0; i < sandProperties.length; i++) {
            this.nameMap.set(sandProperties[i].name, i+1);
        }
    }

    computeCompoundNoise(rx, ry) {
        let groundVal1 = this.noise1.noise2D(rx/256, ry/256);
        let groundVal2 = this.noise2.noise2D(rx/128, ry/128);
        let groundVal3 = this.noise3.noise2D(rx/64, ry/64);
        return groundVal1 * .6 + groundVal2 * .3 + groundVal3 * .1;
    }

    computeRoughNoise(rx, ry) {
        return this.noise3.noise2D(rx/16, ry/16);
    }

    mixedStone(rx, ry, thresh, s1, s2) {
        return this.noise1.noise2D(rx/4, ry/4) > thresh ? s1 : s2;
    }

    checkGroundLevel(rx, ry, baseHeight) {
        let gradient = ry + baseHeight;
        let groundVal =  this.computeCompoundNoise(rx, ry) + gradient / 64;
        return groundVal;
    }

    computeBaseHeight(mountainHeight, mountainSize, mountainLocation, x, cx, size) {
        return -100 + mountainHeight * Math.max(0, mountainSize - Math.abs(x + cx*size - mountainLocation)) / mountainSize;
    }

    generateChunk(cx, cy, size, stride) {
        const data = new Array(size*size*stride);
        data.fill(0);
        const air = this.nameMap.get('air');
        const grass = this.nameMap.get('grass');
        const darkGrass = this.nameMap.get('darkgrass');
        const dirt = this.nameMap.get('dirt');
        const darkDirt = this.nameMap.get('darkdirt');
        const stone = this.nameMap.get('stone');
        const darkStone = this.nameMap.get('darkstone');
        const water = this.nameMap.get('water');
        const lava = this.nameMap.get('lava');
        const limestone = this.nameMap.get('limestone');
        const diamond = this.nameMap.get('diamond');
        const ruby = this.nameMap.get('ruby');
        const emerald = this.nameMap.get('emerald');
        const quartz = this.nameMap.get('quartz');
        const copper = this.nameMap.get('copper');
        const iron = this.nameMap.get('iron');
        const gold = this.nameMap.get('gold');
        const snow = this.nameMap.get('snow');
        const ice = this.nameMap.get('ice');
        const oil = this.nameMap.get('oil');
        const sand = this.nameMap.get('sand');
        const methane = this.nameMap.get('methane');
        const unobtanium = this.nameMap.get('unobtanium');
        const wood = this.nameMap.get('wood');
        const leaf = this.nameMap.get('leaf');

        const hasOre = this.noise1.noise2D(cx, cy);
        const selectOre = [limestone, copper, quartz, iron, ruby, emerald, gold, diamond, unobtanium];
        const oreBase = .2;
        const whichOre = Math.floor(Math.min(9, (cy+3)/4) * (hasOre - oreBase) / (1 - oreBase));

        let idx = 0;

        let caveFade = 100;

        let caveTop = 100;
        let caveBot = 400;

        let iceCaveTop = 800;
        let iceCaveBot = 1200;

        let oilCaveTop = 1600;
        let oilCaveBot = 2000;

        let lavaCaveTop = 2400;
        let lavaCaveBot = 2800;

        let bigCaveTop = 3400;
        let bigCaveBot = 4800;

        let isSnowy = (cy-1)*size > iceCaveTop && (cy+1)*size < iceCaveBot;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                
                let rx = cx*size + x;
                let ry = cy*size + y;

                let tree = this.getTree(rx, ry, wood, leaf);
                if (tree) {
                    data[idx] = tree;
                    idx+=stride;
                    continue;
                }

                let heightOffset = this.noise1.noise2D(rx/100, 0)*5;
                if (ry > 0 + heightOffset) {
                    data[idx] = this.mixedStone(rx*4, ry*4, .5, grass, darkGrass);
                }
                if (ry > 8 + heightOffset) {
                    data[idx] = this.mixedStone(rx*4, ry*4, .5, dirt, darkDirt);
                }
                if (ry > 20 + heightOffset) {
                    let waterThresh = this.noise3.noise2D(rx / 128, ry / 256);
                    let lavaThresh = this.noise2.noise2D(rx / 128, ry / 256);
                    let oilThresh = this.noise1.noise2D(rx / 256, ry / 128);
                    let gasThresh = this.noise2.noise3D(ry / 256, rx / 128, 23);
                    if (lavaThresh > .8 && cy > 25) {
                        data[idx] = lava;
                    } else if (gasThresh > .8 && cy > 20) {
                        data[idx] = methane;
                    } else if (oilThresh > .8 && cy > 15) {
                        data[idx] = oil;
                    } else if (waterThresh > .8 && cy > 5) {
                        data[idx] = water;
                    } else {
                        data[idx] = this.mixedStone(rx/2, ry, .5, stone, darkStone);
                    }
                }

                let normalCave = Math.max(0, Math.min(Math.max(0, ry - caveTop), Math.max(0, caveBot - ry)));
                let iceCave = Math.max(0, Math.min(Math.max(0, ry - iceCaveTop), Math.max(0, iceCaveBot - ry)));
                let oilCave = Math.max(0, Math.min(Math.max(0, ry - oilCaveTop), Math.max(0, oilCaveBot - ry)));
                let lavaCave = Math.max(0, Math.min(Math.max(0, ry - lavaCaveTop), Math.max(0, lavaCaveBot - ry)));
                let bigCave = Math.max(0, Math.min(Math.max(0, ry - bigCaveTop), Math.max(0, bigCaveBot - ry)));

                let caveThresh = Math.min(Math.max(normalCave, iceCave, oilCave, lavaCave, bigCave), caveFade) / caveFade - 1;
                
                let caveVal = this.computeCompoundNoise(rx, ry*2);
                   
                if (caveVal < caveThresh - .05) {
                    data[idx] = air;
                } else if (caveVal < caveThresh && isSnowy && data[idx] > 0) {
                    data[idx] = ice;
                }

                if (hasOre > oreBase) {
                        
                    /* Ores
                     * 0 - Limestone
                     * 1 - Copper
                     * 2 - Quartz
                     * 3 - Iron
                     * 4 - Ruby
                     * 5 - Emerald
                     * 6 - Gold
                     * 7 - Diamond
                     * 8 - Unobtanium
                     */
                    if (cy >= whichOre*4-3) {
                        // limestone, copper, iron, gold
                        if (whichOre === 0 || whichOre === 1 || whichOre === 3 || whichOre === 6) {
                            const ang = this.noise2.noise2D(cx, cy) * Math.PI * 360;
                            // stripey ores
                            let xfin = rx*Math.sin(ang) + ry*Math.cos(ang);
                            let yfin = rx*Math.cos(ang) - ry*Math.sin(ang);
                            const val = this.noise1.noise2D(xfin / 8, yfin / 128);
                            if (val > .5 && (data[idx] === stone || data[idx] === darkStone)) {
                                data[idx] = selectOre[whichOre];
                            }
                        }
                    }
                }
                idx+=stride;
            }
        }

        if (hasOre > oreBase && cy >= whichOre*4-3 && (whichOre === 2 || whichOre === 4 || whichOre === 5 || whichOre === 7 || whichOre === 8)) {
            const xLoc = Math.abs((this.noise2.noise2D(cx, cy) * 1000) % 64);
            const yLoc = Math.abs((this.noise2.noise2D(cx, cy + 10) * 1000) % 64);
            let offsets = [[0, 0]];

            if (cy >= whichOre*4 + 10) {
                offsets =  [[0,0], [0, 1], [1, 0], [1, 1]];
            }

            if (cy >= whichOre*4 + 16) {
                offsets =  [[0,0], [0, 1], [1, 0], [-1, 0], [0, -1]];
            }

            if (cy >= whichOre*4 + 22) {
                offsets =  [[0,0], [0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [1, -1], [-1, -1], [-1, 1], [-2, 0], [2, 0], [0, 2], [0, -2]];
            }


            for (let i = 0; i < 20; i++) {
                const xOffs = Math.floor(xLoc + (this.noise2.noise2D(cx+i*Math.PI, cy+3) * 1000) % 20);
                const yOffs = Math.floor(yLoc + (this.noise2.noise2D(cx, cy + i*4.32 + 5) * 1000) % 20);
                for (let diff of offsets) {
                    let xOffs1 = xOffs + diff[0];
                    let yOffs1 = yOffs + diff[1];
                    if (xOffs1 >= 0 && yOffs1 >= 0 && xOffs1 < size && yOffs1 < size) {
                        let idx = (xOffs1 + yOffs1*size)*stride;
                        if (data[idx] === stone || data[idx] === darkStone) {
                            data[idx] = selectOre[whichOre];
                        }
                    }
                }
            }
        }
        
        return data;
    }

    getTree(rx, ry, wood, leaf) {
        if (rx > -100 && rx < 100) {
            return 0;
        }
        rx = Math.abs(rx) % 100;
        if (rx > 46 && rx < 54 && ry < 10 && ry > -60) {
            return wood;
        }
        let dx = 50 - rx;
        let dy = -60 - ry;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 25) {
            return leaf;
        }
        return 0;
    }
}

