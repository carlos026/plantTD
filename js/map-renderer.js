/**
 * MapRenderer — purely visual layer for the map.
 *
 * Paints ground, road, decorations and lighting once onto a <canvas> placed
 * behind the (now transparent) .mapzone tiles. The tiles keep handling drag &
 * drop and isRoad() keeps defining the path, so game logic is untouched.
 * Everything is procedural and seeded by map id, so each map always looks
 * the same.
 */
var MapRenderer = (function () {
    // The art is designed for BASE_TILE (15px) tiles and scaled up by MAP_SCALE
    // when painted, so it looks the same at any tile size.
    var T = BASE_TILE;        // tile size in design units
    var HALF = T / 2;
    var S = MAP_SCALE;        // design units -> screen px

    // ── Themes ─────────────────────────────────────────────────────────────
    var THEMES = {
        1: { // Night Forest
            ground: '#0b1232', patches: ['#0f1d42', '#091029', '#13254d', '#0c1a3a'],
            speck: 'rgba(130, 180, 255, 0.10)', blade: 'rgba(70, 130, 190, 0.35)', blades: 600,
            road: '#3d5585', roadEdge: '#18233f', mortar: '#26365a', roadTexture: 'cobble',
            deco: ['pine', 'pine', 'pine', 'bush', 'rock'], decoCount: 75,
            c: { tree: '#0f3236', treeShade: '#0a2326', trunk: '#2a1d1a', bush: '#123a3a',
                 rock: '#2b3858', rockHi: '#3e4f78' },
            particles: { color: '#d8ff9a', count: 50, glow: 8 },
            light: { x: 0.88, y: -0.1, r: 0.7, color: 'rgba(150, 190, 255, 0.13)' },
            vignette: 'rgba(0, 0, 12, 0.6)',
            spawn: '#b46bff', goal: '#ff4d6a'
        },
        2: { // Wasteland
            ground: '#8b6b43', patches: ['#9c7a4d', '#7d5f3a', '#a88757', '#806040'],
            speck: 'rgba(60, 35, 15, 0.20)', blade: null, blades: 0, groundExtra: 'dryCracks',
            road: '#4a3424', roadEdge: '#2b1d13', roadTexture: 'dirt',
            deco: ['rock', 'rock', 'cactus', 'deadBush', 'deadBush'], decoCount: 60,
            c: { rock: '#6e5a45', rockHi: '#94795c', cactus: '#4f7a35', cactusHi: '#6c9a48',
                 dead: '#4a3322' },
            particles: { color: '#e8cfa0', count: 40, glow: 0 },
            light: { x: 0.5, y: -0.3, r: 0.9, color: 'rgba(255, 220, 150, 0.12)' },
            vignette: 'rgba(40, 20, 5, 0.45)',
            spawn: '#ffb347', goal: '#ff4d4d'
        },
        3: { // Swamp
            ground: '#0b2410', patches: ['#123a19', '#08190b', '#163f1c', '#0d2c12'],
            speck: 'rgba(120, 200, 120, 0.08)', blade: 'rgba(60, 140, 60, 0.40)', blades: 700,
            groundExtra: 'swampWater',
            road: '#5b4430', roadEdge: '#1e160e', roadTexture: 'planks',
            deco: ['reeds', 'reeds', 'mushroom', 'lily', 'bush'], decoCount: 70,
            c: { reed: '#3f7a35', reedTip: '#6b4a2a', mush: '#2fe0b0', stem: '#cfe8d0',
                 water: '#0f3b33', lily: '#2f8a3a', bush: '#174a1e' },
            particles: { color: '#7dffb0', count: 45, glow: 7 },
            light: { x: 0.2, y: -0.2, r: 0.8, color: 'rgba(120, 255, 170, 0.07)' },
            vignette: 'rgba(0, 12, 2, 0.6)',
            spawn: '#7dffb0', goal: '#ff4d6a'
        },
        4: { // Inferno
            ground: '#4a0f03', patches: ['#5e1404', '#380a02', '#6e1a06', '#2a0702'],
            speck: 'rgba(0, 0, 0, 0.25)', blade: null, blades: 0, groundExtra: 'lavaCracks',
            road: '#262222', roadEdge: '#0d0a0a', roadTexture: 'basalt', roadGlow: 'rgba(255, 80, 0, 0.55)',
            deco: ['lavaPool', 'obsidian', 'obsidian', 'rock'], decoCount: 55,
            c: { rock: '#2b1a17', rockHi: '#4a2a22' },
            particles: { color: '#ffb347', count: 70, glow: 6 },
            light: { x: 0.5, y: 1.2, r: 1.0, color: 'rgba(255, 90, 0, 0.12)' },
            vignette: 'rgba(15, 0, 0, 0.6)',
            spawn: '#ff7a00', goal: '#ffe14d'
        },
        5: { // Void
            ground: '#1d2021', patches: ['#262a2c', '#141617', '#2a2335', '#1a1d26'],
            speck: 'rgba(200, 180, 255, 0.07)', blade: null, blades: 0, groundExtra: 'stars',
            road: '#141416', roadEdge: '#07070a', roadTexture: 'voidStone',
            roadGlow: 'rgba(170, 90, 255, 0.6)', roadCenter: 'rgba(190, 120, 255, 0.75)',
            deco: ['crystal', 'crystal', 'rock'], decoCount: 50,
            c: { crystal: '#7a3cff', crystalHi: '#d8b8ff', rock: '#2a2c33', rockHi: '#3d404a' },
            particles: { color: '#c79bff', count: 60, glow: 7 },
            light: { x: 0.5, y: 0.5, r: 0.6, color: 'rgba(120, 60, 220, 0.08)' },
            vignette: 'rgba(0, 0, 0, 0.7)',
            spawn: '#c79bff', goal: '#ff4d9a'
        },
        6: { // Iceland
            ground: '#bdeefa', patches: ['#d6f7ff', '#a6e2f5', '#e8fbff', '#9bd8ef'],
            speck: 'rgba(255, 255, 255, 0.55)', blade: null, blades: 0, groundExtra: 'iceCracks',
            road: '#7fb1e0', roadEdge: '#4d7fae', roadTexture: 'ice',
            deco: ['snowPine', 'snowPine', 'snowMound', 'iceCrystal'], decoCount: 65,
            c: { tree: '#2f5f5c', treeShade: '#244a48', trunk: '#4a3a33', snow: '#ffffff',
                 mound: '#f4fdff', moundShade: '#b8dcef', crystal: '#5fc8ff', crystalHi: '#ffffff' },
            particles: { color: '#ffffff', count: 80, glow: 3 },
            light: { x: 0.3, y: -0.2, r: 0.9, color: 'rgba(255, 255, 255, 0.18)' },
            vignette: 'rgba(30, 70, 110, 0.35)',
            spawn: '#3fa9ff', goal: '#ff4d6a'
        }
    };

    // ── Helpers ────────────────────────────────────────────────────────────
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function pick(rng, arr) {
        return arr[Math.floor(rng() * arr.length)];
    }

    function rgba(hex, a) {
        var n = parseInt(hex.slice(1), 16);
        return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
    }

    // amt in [-1, 1]: negative darkens, positive lightens
    function shade(hex, amt) {
        var n = parseInt(hex.slice(1), 16);
        var r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
        var t = amt < 0 ? 0 : 255, p = Math.abs(amt);
        r = Math.round((t - r) * p + r);
        g = Math.round((t - g) * p + g);
        b = Math.round((t - b) * p + b);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function shadowBlob(ctx, x, y, rx, ry) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── Road grid ──────────────────────────────────────────────────────────
    function buildGrid(level) {
        var road = [], tiles = [];
        for (var y = 0; y < MAP_H; y++) {
            road[y] = [];
            for (var x = 0; x < MAP_W; x++) road[y][x] = isRoad(level, x, y);
        }
        function at(x, y) {
            return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H && road[y][x];
        }
        var endpoints = [];
        for (var y2 = 0; y2 < MAP_H; y2++) {
            for (var x2 = 0; x2 < MAP_W; x2++) {
                if (!road[y2][x2]) continue;
                var h = at(x2 - 1, y2) || at(x2 + 1, y2);
                var v = at(x2, y2 - 1) || at(x2, y2 + 1);
                tiles.push({ x: x2, y: y2, h: h, v: v });
                var deg = at(x2 - 1, y2) + at(x2 + 1, y2) + at(x2, y2 - 1) + at(x2, y2 + 1);
                if (deg <= 1) endpoints.push({ x: x2, y: y2 });
            }
        }
        // Minions spawn at the top-left tile; every other dead end is a goal
        var spawn = { x: 0, y: 0 };
        var goals = endpoints.filter(function (e) { return e.x !== spawn.x || e.y !== spawn.y; });

        // Road segments between centers of adjacent road tiles
        var segs = [];
        tiles.forEach(function (t) {
            var cx = t.x * T + HALF, cy = t.y * T + HALF;
            if (at(t.x + 1, t.y)) segs.push([cx, cy, cx + T, cy]);
            if (at(t.x, t.y + 1)) segs.push([cx, cy, cx, cy + T]);
        });
        // Extend dead ends that touch the border off-map so the road runs out of view
        endpoints.forEach(function (e) {
            var cx = e.x * T + HALF, cy = e.y * T + HALF;
            if (e.y === 0)              segs.push([cx, cy, cx, -T]);
            else if (e.y === MAP_H - 1) segs.push([cx, cy, cx, cy + T * 2]);
            else if (e.x === 0)         segs.push([cx, cy, -T, cy]);
            else if (e.x === MAP_W - 1) segs.push([cx, cy, cx + T * 2, cy]);
        });

        return { at: at, tiles: tiles, segs: segs, spawn: spawn, goals: goals };
    }

    function strokeSegs(ctx, segs, width, color) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.beginPath();
        for (var i = 0; i < segs.length; i++) {
            ctx.moveTo(segs[i][0], segs[i][1]);
            ctx.lineTo(segs[i][2], segs[i][3]);
        }
        ctx.stroke();
    }

    // Segments shifted sideways (used for tyre tracks)
    function offsetSegs(segs, d) {
        return segs.map(function (s) {
            return s[1] === s[3]
                ? [s[0], s[1] + d, s[2], s[3] + d]
                : [s[0] + d, s[1], s[2] + d, s[3]];
        });
    }

    function nearRoad(grid, x, y, radius) {
        for (var dy = -radius; dy <= radius; dy++) {
            for (var dx = -radius; dx <= radius; dx++) {
                if (grid.at(x + dx, y + dy)) return true;
            }
        }
        return false;
    }

    // ── Ground ─────────────────────────────────────────────────────────────
    function drawGround(ctx, th, rng, W, H) {
        ctx.fillStyle = th.ground;
        ctx.fillRect(0, 0, W, H);

        // Soft colour patches for an organic, non-tiled look
        for (var i = 0; i < 260; i++) {
            var x = rng() * W, y = rng() * H, r = 20 + rng() * 70;
            var col = pick(rng, th.patches);
            var g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, rgba(col, 0.55));
            g.addColorStop(1, rgba(col, 0));
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }

        ctx.fillStyle = th.speck;
        for (var s = 0; s < 1600; s++) {
            ctx.fillRect(rng() * W, rng() * H, 1, 1);
        }

        if (th.blade) {
            ctx.strokeStyle = th.blade;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (var b = 0; b < th.blades; b++) {
                var bx = rng() * W, by = rng() * H, len = 2 + rng() * 3;
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + (rng() - 0.5) * 2, by - len);
            }
            ctx.stroke();
        }
    }

    function randomWalk(ctx, rng, x, y, steps, stepLen) {
        var a = rng() * Math.PI * 2;
        ctx.moveTo(x, y);
        for (var i = 0; i < steps; i++) {
            a += (rng() - 0.5) * 1.4;
            x += Math.cos(a) * stepLen * (0.5 + rng());
            y += Math.sin(a) * stepLen * (0.5 + rng());
            ctx.lineTo(x, y);
        }
    }

    var GROUND_EXTRAS = {
        dryCracks: function (ctx, th, rng, W, H) {
            ctx.strokeStyle = 'rgba(60, 35, 15, 0.28)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (var i = 0; i < 90; i++) randomWalk(ctx, rng, rng() * W, rng() * H, 4 + rng() * 5, 6);
            ctx.stroke();
        },
        swampWater: function (ctx, th, rng, W, H) {
            for (var i = 0; i < 40; i++) {
                var x = rng() * W, y = rng() * H, rx = 10 + rng() * 25, ry = rx * (0.4 + rng() * 0.3);
                var g = ctx.createRadialGradient(x, y, 0, x, y, rx);
                g.addColorStop(0, 'rgba(20, 70, 60, 0.75)');
                g.addColorStop(1, 'rgba(10, 40, 30, 0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        lavaCracks: function (ctx, th, rng, W, H) {
            ctx.save();
            ctx.shadowColor = '#ff3300';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = '#ff5a1a';
            ctx.lineWidth = 1.6;
            var paths = [];
            for (var i = 0; i < 45; i++) paths.push([rng() * W, rng() * H, 5 + Math.floor(rng() * 8)]);
            ctx.beginPath();
            paths.forEach(function (p) { randomWalk(ctx, mulberry32(p[0] * 7 + p[1]), p[0], p[1], p[2], 8); });
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffd27a';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            paths.forEach(function (p) { randomWalk(ctx, mulberry32(p[0] * 7 + p[1]), p[0], p[1], p[2], 8); });
            ctx.stroke();
            ctx.restore();
        },
        stars: function (ctx, th, rng, W, H) {
            for (var i = 0; i < 18; i++) {
                var x = rng() * W, y = rng() * H, r = 40 + rng() * 90;
                var g = ctx.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, rgba(pick(rng, ['#5b2a9e', '#2a3f9e', '#7a2a6e']), 0.18));
                g.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(x - r, y - r, r * 2, r * 2);
            }
            for (var s = 0; s < 260; s++) {
                ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.2 + rng() * 0.6) + ')';
                ctx.fillRect(rng() * W, rng() * H, rng() < 0.9 ? 1 : 1.6, 1);
            }
        },
        iceCracks: function (ctx, th, rng, W, H) {
            ctx.strokeStyle = 'rgba(90, 160, 210, 0.35)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (var i = 0; i < 70; i++) randomWalk(ctx, rng, rng() * W, rng() * H, 3 + rng() * 5, 7);
            ctx.stroke();
        }
    };

    function drawGridLines(ctx, th, W, H) {
        ctx.strokeStyle = th.roadTexture === 'ice' ? 'rgba(40, 90, 140, 0.06)' : 'rgba(255, 255, 255, 0.025)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var x = T; x < W; x += T) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
        for (var y = T; y < H; y += T) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
        ctx.stroke();
    }

    // ── Road ───────────────────────────────────────────────────────────────
    var ROAD_TEXTURES = {
        cobble: function (ctx, th, rng, grid) {
            grid.tiles.forEach(function (t) {
                var px = t.x * T, py = t.y * T;
                ctx.fillStyle = th.mortar;
                ctx.fillRect(px, py, T, T);
                for (var i = 0; i < 2; i++) {
                    for (var j = 0; j < 2; j++) {
                        ctx.fillStyle = shade(th.road, (rng() - 0.55) * 0.3);
                        roundRect(ctx, px + i * HALF + 0.8, py + j * HALF + 0.8, HALF - 1.6, HALF - 1.6, 2);
                        ctx.fill();
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
                        ctx.fillRect(px + i * HALF + 1.6, py + j * HALF + 1.2, HALF - 4, 1);
                    }
                }
            });
        },
        dirt: function (ctx, th, rng, grid) {
            grid.tiles.forEach(function (t) {
                for (var i = 0; i < 7; i++) {
                    ctx.fillStyle = shade(th.road, (rng() - 0.5) * 0.4);
                    ctx.fillRect(t.x * T + rng() * T, t.y * T + rng() * T, 1 + rng() * 1.5, 1 + rng());
                }
            });
            strokeSegs(ctx, offsetSegs(grid.segs, -3.5), 1.6, 'rgba(0, 0, 0, 0.22)');
            strokeSegs(ctx, offsetSegs(grid.segs, 3.5), 1.6, 'rgba(0, 0, 0, 0.22)');
        },
        planks: function (ctx, th, rng, grid) {
            grid.tiles.forEach(function (t) {
                var px = t.x * T, py = t.y * T, vertical = t.v && !t.h;
                for (var k = 0; k < 3; k++) {
                    ctx.fillStyle = shade(th.road, (rng() - 0.5) * 0.3);
                    if (vertical) ctx.fillRect(px, py + k * 5, T, 5);
                    else          ctx.fillRect(px + k * 5, py, 5, T);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                    if (vertical) ctx.fillRect(px, py + k * 5, T, 0.8);
                    else          ctx.fillRect(px + k * 5, py, 0.8, T);
                }
                ctx.fillStyle = 'rgba(200, 200, 180, 0.35)';
                if (vertical) { ctx.fillRect(px + 2, py + 2, 1, 1); ctx.fillRect(px + T - 3, py + 2, 1, 1); }
                else          { ctx.fillRect(px + 2, py + 2, 1, 1); ctx.fillRect(px + 2, py + T - 3, 1, 1); }
            });
        },
        basalt: function (ctx, th, rng, grid) {
            grid.tiles.forEach(function (t) {
                ctx.fillStyle = shade(th.road, (rng() - 0.5) * 0.25);
                ctx.fillRect(t.x * T, t.y * T, T, T);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.lineWidth = 0.8;
                ctx.strokeRect(t.x * T + 0.5, t.y * T + 0.5, T - 1, T - 1);
            });
            ctx.save();
            ctx.shadowColor = '#ff5a00';
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#ff8a2a';
            grid.tiles.forEach(function (t) {
                if (rng() < 0.35) ctx.fillRect(t.x * T + rng() * T, t.y * T + rng() * T, 1.2, 1.2);
            });
            ctx.restore();
        },
        voidStone: function (ctx, th, rng, grid) {
            grid.tiles.forEach(function (t) {
                ctx.fillStyle = shade(th.road, (rng() - 0.3) * 0.15);
                ctx.fillRect(t.x * T, t.y * T, T, T);
                for (var i = 0; i < 3; i++) {
                    ctx.fillStyle = 'rgba(180, 120, 255, ' + (0.15 + rng() * 0.35) + ')';
                    ctx.fillRect(t.x * T + rng() * T, t.y * T + rng() * T, 1, 1);
                }
            });
        },
        ice: function (ctx, th, rng, grid) {
            grid.tiles.forEach(function (t) {
                ctx.fillStyle = shade(th.road, (rng() - 0.3) * 0.18);
                ctx.fillRect(t.x * T, t.y * T, T, T);
            });
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            grid.tiles.forEach(function (t) {
                if (rng() < 0.3) {
                    var x = t.x * T + rng() * T, y = t.y * T + rng() * T;
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + 4, y - 4);
                }
            });
            ctx.stroke();
        }
    };

    function drawRoad(ctx, th, rng, grid, W, H, dpr) {
        // Drop shadow + border
        ctx.save();
        ctx.shadowColor = th.roadGlow || 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = th.roadGlow ? 14 : 10;
        strokeSegs(ctx, grid.segs, 20, th.roadEdge);
        ctx.restore();

        // Body + texture on an offscreen canvas so the texture is clipped to the road shape
        var off = document.createElement('canvas');
        off.width = W * S * dpr;
        off.height = H * S * dpr;
        var octx = off.getContext('2d');
        octx.scale(S * dpr, S * dpr);
        strokeSegs(octx, grid.segs, T, th.road);
        octx.globalCompositeOperation = 'source-atop';
        ROAD_TEXTURES[th.roadTexture](octx, th, rng, grid);
        ctx.drawImage(off, 0, 0, W, H);

        // Crowned centre highlight
        strokeSegs(ctx, grid.segs, 7, 'rgba(255, 255, 255, 0.05)');

        if (th.roadCenter) {
            ctx.save();
            ctx.setLineDash([4, 7]);
            ctx.shadowColor = th.roadCenter;
            ctx.shadowBlur = 6;
            strokeSegs(ctx, grid.segs, 1.4, th.roadCenter);
            ctx.restore();
        }
    }

    // ── Decorations ────────────────────────────────────────────────────────
    function pineShape(ctx, x, y, s, c) {
        shadowBlob(ctx, x + 2, y + s * 0.45, s * 0.5, s * 0.2);
        ctx.fillStyle = c.trunk;
        ctx.fillRect(x - 1, y + s * 0.2, 2, s * 0.3);
        for (var k = 0; k < 3; k++) {
            var ty = y + s * 0.25 - k * s * 0.28, w = s * (0.55 - k * 0.12);
            ctx.fillStyle = c.tree;
            ctx.beginPath();
            ctx.moveTo(x, ty - s * 0.45);
            ctx.lineTo(x - w, ty);
            ctx.lineTo(x + w, ty);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = c.treeShade;
            ctx.beginPath();
            ctx.moveTo(x, ty - s * 0.45);
            ctx.lineTo(x + w, ty);
            ctx.lineTo(x, ty);
            ctx.closePath();
            ctx.fill();
        }
    }

    function crystalShape(ctx, x, y, s, rng, col, hi) {
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 10;
        var shards = 2 + Math.floor(rng() * 2);
        for (var i = 0; i < shards; i++) {
            var ox = (i - (shards - 1) / 2) * s * 0.3, h = s * (0.6 + rng() * 0.5), w = s * 0.16;
            var g = ctx.createLinearGradient(x + ox - w, y, x + ox + w, y);
            g.addColorStop(0, hi);
            g.addColorStop(1, col);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(x + ox, y - h);
            ctx.lineTo(x + ox + w, y - h * 0.7);
            ctx.lineTo(x + ox + w, y);
            ctx.lineTo(x + ox - w, y);
            ctx.lineTo(x + ox - w, y - h * 0.7);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    var DECOS = {
        pine: function (ctx, x, y, s, rng, c) { pineShape(ctx, x, y, s, c); },
        snowPine: function (ctx, x, y, s, rng, c) {
            pineShape(ctx, x, y, s, c);
            ctx.fillStyle = c.snow;
            for (var k = 0; k < 3; k++) {
                var ty = y + s * 0.25 - k * s * 0.28;
                ctx.beginPath();
                ctx.moveTo(x, ty - s * 0.45);
                ctx.lineTo(x - s * 0.12, ty - s * 0.28);
                ctx.lineTo(x + s * 0.12, ty - s * 0.28);
                ctx.closePath();
                ctx.fill();
            }
        },
        bush: function (ctx, x, y, s, rng, c) {
            shadowBlob(ctx, x + 1, y + s * 0.25, s * 0.5, s * 0.18);
            for (var i = 0; i < 3; i++) {
                ctx.fillStyle = i === 2 ? shade(c.bush, 0.15) : c.bush;
                ctx.beginPath();
                ctx.arc(x + (i - 1) * s * 0.22, y - (i === 1 ? s * 0.12 : 0), s * 0.26, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        rock: function (ctx, x, y, s, rng, c) {
            shadowBlob(ctx, x + 1.5, y + s * 0.2, s * 0.45, s * 0.16);
            var pts = [], n = 7;
            for (var i = 0; i < n; i++) {
                var a = i / n * Math.PI * 2, r = s * (0.28 + rng() * 0.12);
                pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.75]);
            }
            ctx.fillStyle = c.rock;
            ctx.beginPath();
            pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = c.rockHi;
            ctx.beginPath();
            ctx.moveTo(pts[3][0], pts[3][1]);
            ctx.lineTo(pts[4][0], pts[4][1]);
            ctx.lineTo(pts[5][0], pts[5][1]);
            ctx.lineTo(x, y);
            ctx.closePath();
            ctx.fill();
        },
        cactus: function (ctx, x, y, s, rng, c) {
            shadowBlob(ctx, x + 2, y + s * 0.4, s * 0.35, s * 0.12);
            ctx.fillStyle = c.cactus;
            roundRect(ctx, x - s * 0.1, y - s * 0.5, s * 0.2, s * 0.9, s * 0.1); ctx.fill();
            roundRect(ctx, x - s * 0.4, y - s * 0.25, s * 0.15, s * 0.3, s * 0.07); ctx.fill();
            ctx.fillRect(x - s * 0.4, y, s * 0.35, s * 0.1);
            roundRect(ctx, x + s * 0.25, y - s * 0.4, s * 0.15, s * 0.35, s * 0.07); ctx.fill();
            ctx.fillRect(x + s * 0.05, y - s * 0.12, s * 0.3, s * 0.1);
            ctx.fillStyle = c.cactusHi;
            ctx.fillRect(x - s * 0.05, y - s * 0.42, s * 0.04, s * 0.7);
        },
        deadBush: function (ctx, x, y, s, rng, c) {
            ctx.strokeStyle = c.dead;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (var i = 0; i < 5; i++) {
                var a = -Math.PI / 2 + (rng() - 0.5) * 2.2, l = s * (0.3 + rng() * 0.3);
                ctx.moveTo(x, y + s * 0.2);
                ctx.lineTo(x + Math.cos(a) * l, y + s * 0.2 + Math.sin(a) * l);
            }
            ctx.stroke();
        },
        reeds: function (ctx, x, y, s, rng, c) {
            for (var i = 0; i < 5; i++) {
                var ox = (rng() - 0.5) * s * 0.6, h = s * (0.5 + rng() * 0.5), bend = (rng() - 0.5) * 3;
                ctx.strokeStyle = c.reed;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + ox, y + s * 0.3);
                ctx.quadraticCurveTo(x + ox, y + s * 0.3 - h / 2, x + ox + bend, y + s * 0.3 - h);
                ctx.stroke();
                if (rng() < 0.6) {
                    ctx.fillStyle = c.reedTip;
                    ctx.fillRect(x + ox + bend - 1, y + s * 0.3 - h, 2, 3.5);
                }
            }
        },
        mushroom: function (ctx, x, y, s, rng, c) {
            ctx.fillStyle = c.stem;
            ctx.fillRect(x - 1, y - s * 0.1, 2, s * 0.35);
            ctx.save();
            ctx.shadowColor = c.mush;
            ctx.shadowBlur = 8;
            ctx.fillStyle = c.mush;
            ctx.beginPath();
            ctx.arc(x, y - s * 0.1, s * 0.28, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        },
        lily: function (ctx, x, y, s, rng, c) {
            ctx.fillStyle = c.water;
            ctx.beginPath();
            ctx.ellipse(x, y, s * 0.6, s * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = c.lily;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, s * 0.22, 0.4, Math.PI * 2 - 0.1);
            ctx.closePath();
            ctx.fill();
        },
        lavaPool: function (ctx, x, y, s, rng, c) {
            ctx.save();
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 14;
            var g = ctx.createRadialGradient(x, y, 0, x, y, s * 0.6);
            g.addColorStop(0, '#ffe08a');
            g.addColorStop(0.5, '#ff6a00');
            g.addColorStop(1, '#7a1a05');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(x, y, s * 0.6, s * 0.38, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        },
        obsidian: function (ctx, x, y, s, rng, c) {
            shadowBlob(ctx, x + 1, y + s * 0.2, s * 0.4, s * 0.12);
            for (var i = 0; i < 3; i++) {
                var ox = (i - 1) * s * 0.22, h = s * (0.45 + rng() * 0.4);
                ctx.fillStyle = '#140b0e';
                ctx.beginPath();
                ctx.moveTo(x + ox, y - h);
                ctx.lineTo(x + ox + s * 0.14, y + s * 0.2);
                ctx.lineTo(x + ox - s * 0.14, y + s * 0.2);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 110, 40, 0.55)';
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.moveTo(x + ox, y - h);
                ctx.lineTo(x + ox - s * 0.14, y + s * 0.2);
                ctx.stroke();
            }
        },
        crystal: function (ctx, x, y, s, rng, c) { crystalShape(ctx, x, y + s * 0.3, s, rng, c.crystal, c.crystalHi); },
        iceCrystal: function (ctx, x, y, s, rng, c) { crystalShape(ctx, x, y + s * 0.3, s, rng, c.crystal, c.crystalHi); },
        snowMound: function (ctx, x, y, s, rng, c) {
            ctx.fillStyle = c.moundShade;
            ctx.beginPath();
            ctx.ellipse(x + 1, y + 1, s * 0.5, s * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = c.mound;
            ctx.beginPath();
            ctx.ellipse(x, y, s * 0.45, s * 0.24, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    function drawDecorations(ctx, th, rng, grid) {
        var used = {};
        var placed = 0, attempts = 0;
        var items = [];
        while (placed < th.decoCount && attempts < th.decoCount * 30) {
            attempts++;
            var tx = Math.floor(rng() * MAP_W), ty = Math.floor(rng() * MAP_H);
            if (nearRoad(grid, tx, ty, 1) || used[tx + ',' + ty]) continue;
            for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) used[(tx + dx) + ',' + (ty + dy)] = true;
            items.push({ x: tx * T + HALF + (rng() - 0.5) * 6, y: ty * T + HALF + (rng() - 0.5) * 6,
                         s: 12 + rng() * 6, kind: pick(rng, th.deco) });
            placed++;
        }
        // Back-to-front so lower items overlap upper ones
        items.sort(function (a, b) { return a.y - b.y; });
        items.forEach(function (it) { DECOS[it.kind](ctx, it.x, it.y, it.s, rng, th.c); });
    }

    // ── Atmosphere ─────────────────────────────────────────────────────────
    function drawParticles(ctx, th, rng, W, H) {
        var p = th.particles;
        ctx.save();
        ctx.fillStyle = p.color;
        if (p.glow) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.glow;
        }
        for (var i = 0; i < p.count; i++) {
            ctx.globalAlpha = 0.35 + rng() * 0.6;
            ctx.beginPath();
            ctx.arc(rng() * W, rng() * H, 0.6 + rng() * 1.1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawLighting(ctx, th, W, H) {
        var l = th.light;
        var lx = l.x * W, ly = l.y * H, lr = l.r * W;
        var g = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
        g.addColorStop(0, l.color);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        var v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
        v.addColorStop(0, 'rgba(0, 0, 0, 0)');
        v.addColorStop(1, th.vignette);
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, W, H);
    }

    // Pulsing DOM markers for where enemies enter and where they escape
    function addMarker(container, kind, tile, color) {
        var m = document.createElement('div');
        m.className = 'map-marker map-marker-' + kind;
        m.style.left = (tile.x * T + HALF) * S + 'px';
        m.style.top  = (tile.y * T + HALF) * S + 'px';
        m.style.setProperty('--marker', color);
        container.appendChild(m);
    }

    // ── Public ─────────────────────────────────────────────────────────────
    function render(container, level) {
        var th = THEMES[level] || THEMES[1];
        var W = MAP_W * T, H = MAP_H * T;   // design units

        var stale = container.querySelectorAll('.map-canvas, .map-marker');
        for (var i = 0; i < stale.length; i++) stale[i].parentNode.removeChild(stale[i]);

        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var canvas = document.createElement('canvas');
        canvas.className = 'map-canvas';
        canvas.width = W * S * dpr;
        canvas.height = H * S * dpr;
        canvas.style.width = W * S + 'px';
        canvas.style.height = H * S + 'px';
        container.insertBefore(canvas, container.firstChild);

        var ctx = canvas.getContext('2d');
        ctx.scale(S * dpr, S * dpr);
        var rng = mulberry32(level * 9973 + 17);
        var grid = buildGrid(level);

        drawGround(ctx, th, rng, W, H);
        if (th.groundExtra) GROUND_EXTRAS[th.groundExtra](ctx, th, rng, W, H);
        drawGridLines(ctx, th, W, H);
        drawRoad(ctx, th, rng, grid, W, H, dpr);
        drawDecorations(ctx, th, rng, grid);
        drawParticles(ctx, th, rng, W, H);
        drawLighting(ctx, th, W, H);

        addMarker(container, 'spawn', grid.spawn, th.spawn);
        grid.goals.forEach(function (g) { addMarker(container, 'goal', g, th.goal); });
    }

    return { render: render };
})();
