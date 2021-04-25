export const interactions = [
    {
        a: 'water',
        b: 'fire',
        a1: 'water',
        b1: '',
        prob: 1,
    },
    {
        a: 'acid',
        b: 'fire',
        a1: 'acid',
        b1: '',
        prob: 1,
    },
    {
        a: 'base',
        b: 'fire',
        a1: 'base',
        b1: '',
        prob: 1,
    },
    {
        a: '',
        b: 'burnedwood',
        a1: 'fire',
        b1: 'burnedwood',
        prob: .1,
    },
    {
        a: '',
        b: 'burningoil',
        a1: 'fire',
        b1: 'burningoil',
        prob: .1,
    },
    {
        a: 'fire',
        b: 'burnedwood',
        a1: 'fire',
        b1: 'fire',
        prob: .001,
    },
    {
        a: 'fire',
        b: 'burningoild',
        a1: 'fire',
        b1: 'fire',
        prob: .004,
    },
    {
        a: 'water',
        b: 'burnedwood',
        a1: 'steam',
        b1: 'charredwood',
        prob: .6,
    },
    {
        a: 'water',
        b: 'smoke',
        a1: 'acid',
        b1: '',
        prob: .1,
    },
    {
        a: 'water',
        b: 'lava',
        a1: 'steam',
        b1: 'hotrock',
        prob: 1,
    },
    {
        a: 'water',
        b: 'hotrock',
        a1: 'steam',
        b1: 'warmrock',
        prob: .1,
    },
    {
        a: 'water',
        b: 'warmrock',
        a1: 'steam',
        b1: 'rock',
        prob: .01,
    },
    {
        a: 'water',
        b: 'rock',
        a1: 'steam',
        b1: 'coldrock',
        prob: .01,
    },
    {
        a: 'warmrock',
        b: 'coldrock',
        a1: 'rock',
        b1: 'rock',
        prob: .01,
    },
    {
        a: 'hotrock',
        b: 'coldrock',
        a1: 'warmrock',
        b1: 'rock',
        prob: .01,
    },
    {
        a: 'hotrock',
        b: 'rock',
        a1: 'warmrock',
        b1: 'warmrock',
        prob: .01,
    },
    {
        a: 'warmrock',
        b: 'lava',
        a1: 'hotrock',
        b1: 'hotrock',
        prob: .01,
    },
    {
        a: 'rock',
        b: 'lava',
        a1: 'warmrock',
        b1: 'hotrock',
        prob: .01,
    },
    {
        a: 'coldrock',
        b: 'lava',
        a1: 'warmrock',
        b1: 'hotrock',
        prob: .01,
    },
    {
        a: 'hotrock',
        b: 'lava',
        a1: 'lava',
        b1: 'lava',
        prob: .001,
    },
    {
        a: 'lava',
        b: 'burnedwood',
        a1: 'lava',
        b1: '',
        prob: .1,
    },
    {
        a: 'acid',
        b: 'base',
        a1: 'steam',
        b1: 'gunpowder',
        prob: 1,
    },
    {
        a: 'limestone',
        b: 'water',
        a1: '',
        b1: 'base',
        prob: .01,
    },
    {
        a: 'lava',
        b: 'base',
        a1: 'hotrock',
        b1: 'limestone',
        prob: .1,
    },
    {
        a: 'lava',
        b: 'acid',
        a1: 'hotrock',
        b1: 'smoke',
        prob: .1,
    },
    {
        a: 'steam',
        b: 'oil',
        a1: 'steam',
        b1: 'methane',
        prob: .1,
    },
    {
        a: 'lava',
        b: 'oil',
        a1: 'lava',
        b1: 'fire',
        prob: .1,
    },
    {
        a: 'lava',
        b: 'burningoil',
        a1: 'lava',
        b1: 'fire',
        prob: .1,
    },
    {
        a: 'copper',
        b: 'silicon',
        a1: 'copper',
        b1: 'sand',
        prob: 1,
    },
    {
        a: 'copper-charged',
        b: 'sand',
        a1: 'copper-charged',
        b1: 'silicon',
        prob: 1,
    },
    {
        a: 'water',
        b: 'ice',
        a1: 'waterice',
        b1: 'waterice',
        prob: .005,
    },
    {
        a: 'steam',
        b: 'ice',
        a1: 'water',
        b1: 'waterice',
        prob: .005,
    },
    {
        a: 'waterice',
        b: 'air',
        a1: 'ice',
        b1: 'air',
        prob: 0.1,
    },
    {
        a: 'waterice',
        b: 'water',
        a1: 'water',
        b1: 'water',
        prob: 0.1,
    },
    {
        a: 'waterice',
        b: 'ice',
        a1: 'ice',
        b1: 'ice',
        prob: 0.1,
    },
    {
        a: 'acid',
        b: 'wood',
        a1: 'acid',
        b1: 'air',
        prob: 0.1,
    },
    {
        a: 'acid',
        b: 'leaf',
        a1: 'acid',
        b1: 'air',
        prob: 0.1,
    },
    {
        a: 'cactuswater',
        b: 'air',
        a1: 'water',
        b1: 'air',
        prob: 1,
    },
    {
        a: 'cactuswater',
        b: 'water',
        a1: 'water',
        b1: 'water',
        prob: 1,
    },
];