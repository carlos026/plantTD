// Turret definitions: single source of truth for every tower type.
// cooldown(level): ticks between shots / animationCooldown(level): ticks of the shot animation
// upgradeCostMult(level): multiplier over level * value
// upgrade(level): { dmg, rng } fractions of (level * base damage / range) added when upgrading
// rangeScalesWithLevel: false => the range bonus uses the base range only (not level * base range)
// targeting: false => no target priority selector (hits everything in range)
// onShoot(turret, minion, style): applies side effects and returns the (maybe critical) damage; 0 disables crits
const TURRET_DEFS = {
	machineGun: {
		name: "Machine Gun",
		description: "Rapid fire with low damage. Great against swarms of weak enemies.",
		specials: ["No critical hits", "Aircraft take 2x damage"],
		color: "#e0aaff", // Soft Neon Purple
		image: "url('img/tw/tower0.png')",
		sound: "sound/MachineGun.wav",
		value: 20,
		rangeTiles: 3,
		damage: 20,
		critChance: 0,
		cooldown: function(level) { return 10; },
		animationCooldown: function(level) { return 0; },
		upgradeCostMult: function(level) { return level >= 5 ? 6 : 5; },
		upgrade: function(level) { return { dmg: 0.5, rng: 0.05 }; },
		// Branched upgrades: at branchLevel the player picks one branch (once per turret) and levels
		// above it use the branch's upgrade(level). chooseBonus is applied once, when the branch is picked.
		// critChance: percent chance of a critical hit (the branch has none when omitted); targets: enemies hit per shot
		branchLevel: 5,
		branches: {
			sniper: {
				name: "Sniper",
				summary: "Heavy single shots, longer range and a small crit chance",
				description: "Slow down to aim: far heavier bullets and a longer reach, with a small chance to crit. Always a single target.",
				chooseBonus: { dmg: 1.0, rng: 0.4 },
				upgrade: function(level) { return { dmg: 1.2, rng: 0.04 }; },
				critChance: SNIPER_CRIT_CHANCE,
				targets: 1
			},
			twin: {
				name: "Twin Guns",
				summary: "Hits 2 enemies at once, no crits",
				description: "A second barrel hits two enemies at once. Range stays the same and damage grows faster with each level. No crits.",
				chooseBonus: { dmg: 0, rng: 0 },
				upgrade: function(level) { return { dmg: 0.5 + (level - 5) * 0.1, rng: 0 }; },
				critChance: 0,
				targets: 2
			}
		},
		onShoot: function(turret, minion, style) {
			style.borderTop = "1px solid #cdfb00";
			style.borderRadius = "20px/20px";
			var branch = getTurretBranch(turret);
			return extraCritDamage(turret, (branch && branch.critChance) || 0);
		}
	},
	laser: {
		name: "Laser",
		description: "Sustained beam dealing high damage. Effective against tanky targets.",
		specials: ["May deal critical damage", "Aircraft take 2x damage"],
		color: "#ff006e", // Cyber Pink
		image: "url('img/tw/tower1.png')",
		sound: "sound/Laser.wav",
		value: 100,
		rangeTiles: 7,
		damage: 150,
		critChance: LASER_CRIT_CHANCE,
		cooldown: function(level) { return 152 - (level * 10); },
		animationCooldown: function(level) { return 0; },
		upgradeCostMult: function(level) { return 0.8; },
		upgrade: function(level) { return level >= 5 ? { dmg: 0.50, rng: 0.025 } : { dmg: 0.40, rng: 0.05 }; },
		// cooldownMult: permanent multiplier over the level's shot cooldown (2 = half the fire rate, 0.6 = faster)
		branchLevel: 5,
		branches: {
			precision: {
				name: "Precision Beam",
				summary: "Huge damage and range, half the fire rate",
				description: "A focused beam with far more damage and reach, at the cost of a slower fire rate.",
				chooseBonus: { dmg: 2.0, rng: 0.2 },
				upgrade: function(level) { return { dmg: 1.0, rng: 0.015 }; },
				cooldownMult: 2,
				critChance: LASER_CRIT_CHANCE,
				targets: 1
			},
			chain: {
				name: "Chain Lightning",
				summary: "Much faster fire rate, range stops growing",
				description: "Rapid single-target bolts: a much faster fire rate and normal damage growth. Range no longer increases.",
				chooseBonus: { dmg: 0, rng: 0 },
				upgrade: function(level) { return { dmg: 0.5, rng: 0 }; },
				cooldownMult: 0.75,
				critChance: LASER_CRIT_CHANCE,
				targets: 1
			}
		},
		onShoot: function(turret, minion, style) {
			style.borderTop = "1px solid #ff0000";
			style.borderRadius = "10px/10px";
			return calculateCriticalHitDamage(LASER_CRIT_CHANCE + getCritBonus(turret), turret.damage);
		}
	},
	flamethrower: {
		name: "Flamethrower",
		description: "Short-range bursts of flame. Ideal for chokepoints. Cannot hit aircraft.",
		specials: ["Fires in bursts", "Fire Tanks and aircrafts are immune"],
		color: "#fb5607", // Intense Orange
		image: "url('img/tw/tower2.png')",
		sound: "sound/Flamethrower.wav",
		value: 400,
		rangeTiles: 2,
		damage: 80,
		critChance: 0,
		cooldown: function(level) { return 25; },
		animationCooldown: function(level) { return 0; },
		upgradeCostMult: function(level) { return 0.3; },
		upgrade: function(level) { return { dmg: 0.3, rng: 0.020 }; },
		// burn: hits apply the Burning status (see burnMinion)
		branchLevel: 5,
		branches: {
			inferno: {
				name: "Inferno",
				summary: "Far more damage and range",
				description: "Raw firepower: far more damage and a much longer reach. Single target.",
				chooseBonus: { dmg: 1.0, rng: 0.2 },
				upgrade: function(level) { return { dmg: 0.6, rng: 0.025 }; },
				critChance: 0,
				targets: 1
			},
			firestorm: {
				name: "Firestorm",
				summary: "Hits 3 enemies and sets them Burning",
				description: "A wide wave of fire that engulfs up to 3 enemies at once, so damage is spread out. Damage and range keep their normal growth.",
				chooseBonus: { dmg: 0, rng: 0 },
				upgrade: function(level) { return { dmg: 0.3, rng: 0.02 }; },
				extraStats: ["Burning: " + BURN_HP_PCT + "% max HP after " + BURN_DURATION / 100 + " s (" + BURN_WEAK_HP_PCT + "% vs weak enemies)"],
				burn: true,
				critChance: 0,
				targets: 3
			}
		},
		onShoot: function(turret, minion, style) {
			style.borderTop = "8px solid #b00101";
			style.borderRadius = "10px/10px";
			var branch = getTurretBranch(turret);
			if (branch && branch.burn) burnMinion(minion, turret);
			return extraCritDamage(turret, 0);
		}
	},
	blizzard: {
		name: "Blizzard Tower",
		description: "A frost wave that damages and slows every enemy in range.",
		specials: ["Hits all enemies in range", "Freezing slows enemies down", "No target focus"],
		color: "#00b4d8", // Bright Sky Blue
		image: "url('img/tw/tower3.png')",
		sound: "sound/Blizzard.wav",
		value: 600,
		rangeTiles: 5,
		damage: 10,
		canCrit: false, // onShoot never crits, so a Pulse Overdrive bonus does nothing here
		critChance: 0,
		targeting: false,
		cooldown: function(level) { return 202 - (level * 20); },
		animationCooldown: function(level) { return 0; },
		upgradeCostMult: function(level) { return 0.15; },
		// Cooldown reduction is this upgrade focus
		upgrade: function(level) { return { dmg: 0.1, rng: 0.02 }; },
		// freezeStacks: every freeze adds a stack to the enemy (see addFreezeStack)
		branchLevel: 5,
		branches: {
			avalanche: {
				name: "Avalanche",
				summary: "Much longer range, slower shots",
				description: "A huge frost wave with a far longer reach, but it takes much longer between blasts. The freeze effect is unchanged.",
				chooseBonus: { dmg: 0, rng: 0.5 },
				upgrade: function(level) { return { dmg: 0.1, rng: 0.04 }; },
				cooldownMult: 1.5,
				extraStats: ["Freeze effect unchanged"],
				critChance: 0,
				targets: 1
			},
			snowKing: {
				name: "Snow King",
				summary: "Freeze stacks (" + BLIZZARD_STUN_STACKS + ") stun the enemy",
				description: "Each freeze adds a stack to the enemy. At " + BLIZZARD_STUN_STACKS + " stacks it is frozen solid and stunned. Range and fire rate stop improving.",
				chooseBonus: { dmg: 0, rng: 0 },
				upgrade: function(level) { return { dmg: 0.1, rng: 0 }; },
				cooldownLevelCap: 5,
				freezeStacks: true,
				extraStats: [BLIZZARD_STUN_STACKS + " stacks: stun for " + BLIZZARD_STUN_DURATION / 100 + " s"],
				critChance: 0,
				targets: 1
			}
		},
		onShoot: function(turret, minion, style) {
			// Slow down the enemy
			style.border = "2px solid rgba(0, 153, 255, 0.5)";
			freezeMinion(minion, 100 + (turret.level * 10));
			return 0;
		}
	},
	toxic: {
		name: "Toxic Tower",
		description: "Long-range shots that leave a lingering poison. Effective against single targets.",
		specials: ["May deal critical chance", "Poison deals damage over time"],
		color: "#3a5a40", // Forest Green
		image: "url('img/tw/Toxic.png')",
		sound: "sound/Toxic.wav",
		value: 800,
		rangeTiles: 7,
		damage: 400,
		critChance: 20,
		cooldown: function(level) { return 201 - (level * 10); },
		animationCooldown: function(level) { return 0; },
		upgradeCostMult: function(level) { return 0.15; },
		upgrade: function(level) { return level >= 5 ? { dmg: 0.50, rng: 0.02 } : { dmg: 0.40, rng: 0.05 }; },
		// poisonMult(level): multiplier over the base poison damage per tick (see getToxicPoisonDamage)
		// spreadTiles: radius in tiles around the hit enemy that also gets poisoned
		branchLevel: 5,
		branches: {
			corrosive: {
				name: "Corrosive",
				summary: "Much stronger poison on a single target",
				description: "A concentrated venom: poison on a single target hurts far more and grows with every tower level.",
				chooseBonus: { dmg: 0, rng: 0 },
				upgrade: function(level) { return { dmg: 0.50, rng: 0.02 }; },
				poisonMult: function(level) { return CORROSIVE_POISON_BASE_MULT + (level - 5) * CORROSIVE_POISON_PER_LEVEL; },
				extraStats: ["Poison damage: x" + CORROSIVE_POISON_BASE_MULT + " at level 5, +x" + CORROSIVE_POISON_PER_LEVEL + " per level"],
				critChance: 20,
				targets: 1
			},
			contamination: {
				name: "Contamination",
				summary: "Poison spreads to nearby enemies",
				description: "The poison spreads to enemies near the target. Damage and range keep their normal growth.",
				chooseBonus: { dmg: 0, rng: 0 },
				upgrade: function(level) { return { dmg: 0.50, rng: 0.02 }; },
				spreadTiles: TOXIC_SPREAD_RADIUS_TILES,
				extraStats: ["Poison spreads to enemies within " + TOXIC_SPREAD_RADIUS_TILES + " tiles"],
				critChance: 20,
				targets: 1
			}
		},
		onShoot: function(turret, minion, style) {
			style.borderTop = "3px solid #4CAF50";
			style.borderRadius = "20px/20px";
			var branch = getTurretBranch(turret);
			var poisonDuration = 125 + (turret.level * 20);
			toxicMinion(minion, poisonDuration, getToxicPoisonDamage(turret), turret);
			if (branch && branch.spreadTiles) spreadToxic(minion, poisonDuration, branch.spreadTiles * TILE_W, turret);
			return calculateCriticalHitDamage(20 + getCritBonus(turret), turret.damage);
		}
	},
	stormCannon: {
		name: "Storm Cannon",
		description: "Rapid electric shots at a single enemy. Overheats if it fires for too long.",
		specials: ["Overheats after " + STORM_OVERHEAT_MAX + " shots and shuts down until cooled", "Can be switched off from level 5"],
		color: "#ffbe0b", // Electric Yellow
		image: "url('img/tw/tower4.png')",
		sound: "sound/StormCannon.wav",
		value: 1000,
		rangeTiles: 15,
		damage: 250,
		cooldown: function(level) { return 10; },
		animationCooldown: function(level) { return 0; },
		upgradeCostMult: function(level) { return 0.3; },
		upgrade: function(level) { return level >= 5 ? { dmg: 0.3, rng: 0.02 } : { dmg: 0.2, rng: 0.025 }; },
		// overheatPerShot: overheat added per volley (default STORM_OVERHEAT_PER_SHOT); targets: Infinity = every enemy in range
		branchLevel: 5,
		branches: {
			chaoticTempest: {
				name: "Chaotic Tempest",
				summary: "One huge shot hits every enemy, then overcharges",
				description: "A single massive discharge strikes every enemy in range, then the cannon overcharges and shuts down until it cools off.",
				chooseBonus: { dmg: STORM_TEMPEST_DAMAGE_BONUS, rng: 0 },
				sound: "sound/thunder.wav",
				upgrade: function(level) { return { dmg: 3, rng: 0.01 }; },
				overheatPerShot: STORM_OVERHEAT_MAX,
				extraStats: ["Overcharges after a single shot"],
				critChance: 20,
				targets: Infinity
			},
			doubleStorm: {
				name: "Double Storm",
				summary: "Hits 2 enemies per shot",
				description: "Twin discharges hit two enemies at once. Damage and range keep their normal growth.",
				chooseBonus: { dmg: 0, rng: 0 },
				upgrade: function(level) { return { dmg: 0.2, rng: 0.01 }; },
				critChance: 0,
				targets: 2
			}
		},
		onShoot: function(turret, minion, style) {
			style.borderTop = "3px solid #0905eb";
			style.borderRadius = "20px/20px";
			var branch = getTurretBranch(turret);
			return extraCritDamage(turret, (branch && branch.critChance) || 0);
		}
	},
	railCannon: {
		name: "Rail Cannon",
		description: "Extreme single-target damage with a very slow fire rate. Destroys bosses.",
		specials: ["Stuns the target", "Aircraft take 2x damage"],
		color: "#3a86ff", // Tech Blue
		image: "url('img/tw/tower5.png')",
		sound: "sound/RailCannon.wav",
		value: 1500,
		rangeTiles: 5,
		damage: 3250,
		critChance: 30,
		rangeScalesWithLevel: false,
		cooldown: function(level) { return 601 - (level * 30); },
		animationCooldown: function(level) { return 0; },
		upgradeCostMult: function(level) { return 0.2; },
		upgrade: function(level) { return { dmg: 0.2, rng: 0.2 }; },
		// cooldownImprove: share of the normal per-level cooldown reduction kept above branchLevel
		// stunTicks(level): stun duration of a hit (default 150 + 50 per level)
		branchLevel: 5,
		branches: {
			pulverizer: {
				name: "Pulverizer",
				summary: "x2 damage, longer range, growing stun",
				description: "Twice the damage and a much longer reach, with a stun that gets far longer every level. The cooldown improves more slowly with levels.",
				chooseBonus: { dmg: 1.0, rng: 0.5 },
				upgrade: function(level) { return { dmg: 0.2, rng: 0.2 }; },
				cooldownImprove: RAIL_PULVERIZER_COOLDOWN_IMPROVE,
				stunTicks: function(level) { return 150 + level * 100; },
				extraStats: ["Stun: 1,5s + 1s per level (default 0,5s)", "Cooldown gain per level: " + RAIL_PULVERIZER_COOLDOWN_IMPROVE * 100 + "%"],
				critChance: 30,
				targets: 1
			},
			annihilator: {
				name: "Annihilator",
				summary: "Massive damage, fixed range and stun",
				description: "A huge boost to damage that keeps growing. Range and stun stop growing and the cooldown barely improves with levels.",
				chooseBonus: { dmg: 2.0, rng: 0 },
				upgrade: function(level) { return { dmg: 0.4, rng: 0 }; },
				cooldownImprove: RAIL_ANNIHILATOR_COOLDOWN_IMPROVE,
				stunTicks: function(level) { return RAIL_ANNIHILATOR_STUN; },
				extraStats: ["Stun: fixed " + RAIL_ANNIHILATOR_STUN / 100 + " s", "Cooldown gain per level: " + RAIL_ANNIHILATOR_COOLDOWN_IMPROVE * 100 + "%"],
				critChance: 30,
				targets: 1
			}
		},
		onShoot: function(turret, minion, style) {
			style.borderTop = "3px solid #6600ff";
			style.borderRadius = "20px/20px";
			var branch = getTurretBranch(turret);
			stunMinion(minion, (branch && branch.stunTicks) ? branch.stunTicks(turret.level) : 150 + (turret.level * 50));
			return calculateCriticalHitDamage(30 + getCritBonus(turret), turret.damage);
		}
	},
	missile: {
		name: "Missile Turret",
		description: "Prioritizes aircraft. Fires a missile that detonates on impact, dealing 5x damage to planes.",
		specials: ["Uses ammo: starts with 5 missiles, reloads cost $" + MISSILE_AMMO_COST],
		color: "#FFD700", // Yellow
		image: "url('img/tw/missile.png')",
		sound: "sound/missileLaunch.mp3",
		value: 2000,
		rangeTiles: 7,
		damage: 5000,
		critChance: MISSILE_CRIT_CHANCE,
		cooldown: function(level) { return 420 - (level * 20); },
		animationCooldown: function(level) { return 0; },
		upgradeCostMult: function(level) { return 0.2; },
		upgrade: function(level) { return level >= 5 ? { dmg: 0.4, rng: 0.01 } : { dmg: 0.3, rng: 0.05 }; },
		// mainDamageMult: damage multiplier of the missile on the enemy it hits
		// splashTiles(level): explosion radius in tiles; enemies inside take the turret's plain damage
		// reloadTicks / ammoMult: reload time of a bought missile / multiplier over the max ammo
		// autoReload: adds the auto-reload toggle (an empty turret buys one missile by itself)
		branchLevel: 5,
		branches: {
			heavyPayload: {
				name: "Heavy Payload",
				summary: "Area blast, double damage on the target",
				description: "Bigger explosions and more damage. Target takes double damage and every enemy caught in the blast receives turret's normal damage.",
				chooseBonus: { dmg: 0.5, rng: 0 },
				upgrade: function(level) { return { dmg: 0.5, rng: 0.01 }; },
				mainDamageMult: HEAVY_PAYLOAD_MAIN_MULT,
				splashTiles: function(level) { return HEAVY_PAYLOAD_RADIUS_TILES * (1 + (level - 5) * 0.1); },
				extraStats: ["Target takes x" + HEAVY_PAYLOAD_MAIN_MULT + " damage", "Blast radius: " + HEAVY_PAYLOAD_RADIUS_TILES + " tiles, grows with level"],
				critChance: MISSILE_CRIT_CHANCE,
				targets: 1
			},
			autoReload: {
				name: "Auto Reload",
				summary: "Faster reload, bigger magazine, auto-buys missiles",
				description: "Much faster reloading and a bigger magazine. With auto-reload button on, empty turret orders a new missile by itself.",
				chooseBonus: { dmg: 0, rng: 0 },
				upgrade: function(level) { return { dmg: 0.4, rng: 0.01 }; },
				reloadTicks: AUTO_RELOAD_TICKS,
				ammoMult: AUTO_RELOAD_AMMO_MULT,
				autoReload: true,
				extraStats: ["Reload: " + MISSILE_RELOAD_TICKS / 100 + " s → " + AUTO_RELOAD_TICKS / 100 + " s", "Max ammo x" + AUTO_RELOAD_AMMO_MULT, "Auto-reload costs $" + MISSILE_AMMO_COST + " per missile"],
				critChance: MISSILE_CRIT_CHANCE,
				targets: 1
			}
		},
		onShoot: function(turret, minion, style) {
			return calculateCriticalHitDamage(20, turret.damage);
		}
	},
	archery: {
		name: "Archery Turret",
		description: "Fires homing arrows with unlimited ammo and the highest critical hit chance of any tower.",
		specials: ["Targets: 1 (2 at level 5, 3 at level 8)"],
		color: "#c08a3e", // Bronze/Wood
		image: "url('img/tw/archery.png')",
		sound: "sound/arrowHit.mp3",
		value: 250,
		rangeTiles: 5,
		damage: 100,
		critChance: ARCHERY_CRIT_CHANCE,
		cooldown: function(level) { return 80 - (level * 5); },
		animationCooldown: function(level) { return 0; },
		upgradeCostMult: function(level) { return 0.5; },
		upgrade: function(level) { return level >= 5 ? { dmg: 0.4, rng: 0.02 } : { dmg: 0.3, rng: 0.05 }; },
		// critChance: percent chance of a critical arrow (see getArcheryCritChance)
		branchLevel: 5,
		branches: {
			hawkeye: {
				name: "Hawkeye",
				summary: "Always crits, shorter range, single target",
				description: "Every arrow is a critical hit and damage is far higher, but reach is shorter and fire rate stops improving. Single target.",
				chooseBonus: { dmg: 1.0, rng: -HAWKEYE_RANGE_PENALTY },
				upgrade: function(level) { return { dmg: 0.9, rng: 0.02 }; },
				cooldownLevelCap: 5,
				extraStats: ["Range -" + HAWKEYE_RANGE_PENALTY * 100 + "% (once)", "Cooldown fixed at level 5 value"],
				critChance: HAWKEYE_CRIT_CHANCE,
				targets: 1
			},
			advancedCrossbow: {
				name: "Advanced Crossbow",
				summary: "Faster fire rate, hits up to 3 enemies",
				description: "Rapid fire at up to 3 enemies at once. Range, damage and fire rate keep improving with every level.",
				chooseBonus: { dmg: 0, rng: 0 },
				upgrade: function(level) { return { dmg: 0.4, rng: 0.02 }; },
				cooldownMult: CROSSBOW_COOLDOWN_MULT,
				critChance: ARCHERY_CRIT_CHANCE,
				targets: 3
			}
		},
		onShoot: function(turret, minion, style) {
			return calculateCriticalHitDamage(70, turret.damage * 2);
		}
	},
	pulseScanner: {
		name: "Pulse Scanner",
		description: "A rotating antenna that sends out radar pulses to reveal camouflaged enemies.",
		specials: ["No damage", "Reveals camouflaged enemies in range", "Area buffs on upgrade"],
		color: "#39d98a", // Radar Green
		image: "url('img/tw/pulse.png')", // the base (24x24)
		// drawn centered on the base; this is the only part that spins (18x22 inside the 24x24 base, see .turret-overlay)
		overlay: { image: "url('img/tw/antenna.png')", width: 18, height: 22, baseSize: 24, spins: true },
		sound: "sound/scanner.wav", // played on every pulse
		value: 500,
		rangeTiles: 4,
		damage: 0,
		support: true, // no damage: hides the damage/targets/crit stats and is left out of the damage stats
		targeting: false,
		// ticks between pulses: the same at every level; a pulse keeps enemies revealed for PULSE_REVEAL_TICKS (longer than the cooldown)
		cooldown: function(level) { return 110; },
		animationCooldown: function(level) { return 0; },
		upgradeCostMult: function(level) { return 0.2; },
		// rng 0.025 makes the range grow exactly like the Blizzard Tower's, so it stays 1 tile shorter at every level
		upgrade: function(level) { return { dmg: 0, rng: 0.025 }; },
		// rangeBonus / critBonus: bonus given to the towers near the scanner, indexed by scanner level (see getPulseAura)
		branchLevel: 5,
		branches: {
			amplifier: {
				name: "Amplifier Pulse",
				summary: "Nearby towers range increase (10% to 20%)",
				description: "The pulse amplifies towers near it, increasing their range. Bonus grows with scanner's level.",
				chooseBonus: { dmg: 0, rng: 0 },
				upgrade: function(level) { return { dmg: 0, rng: 0.025 }; },
				rangeBonus: PULSE_AMPLIFIER_RANGE_BONUS,
				extraStats: ["Nearby towers' range: " + formatPulseBonus(PULSE_AMPLIFIER_RANGE_BONUS) + " (levels 5-8)"],
				critChance: 0,
				targets: 1
			},
			overdrive: {
				name: "Scanner Overdrive",
				summary: "Nearby towers crit chance increase (5% to 12%)",
				description: "Scanner also points weakspots, increasing nearby towers critical hit chance. Bonus grows with scanner's level.",
				chooseBonus: { dmg: 0, rng: 0 },
				upgrade: function(level) { return { dmg: 0, rng: 0.025 }; },
				critBonus: PULSE_OVERDRIVE_CRIT_BONUS,
				extraStats: ["Nearby towers' crit chance: " + formatPulseBonus(PULSE_OVERDRIVE_CRIT_BONUS) + " (levels 5-8)"],
				critChance: 0,
				targets: 1
			}
		},
		onShoot: function(turret, minion, style) {
			return 0;
		}
	}
};

// "+10%, +13%, +16%, +20%" for a { level: bonus } table (function declarations are hoisted, so TURRET_DEFS can use it)
function formatPulseBonus(table) {
	return Object.keys(table).map(function(level) { return "+" + table[level] + "%"; }).join(", ");
}

// Turret functions
function getTurretTypes(){
	return Object.keys(TURRET_DEFS);
}

function turretColor(type) {
	return TURRET_DEFS[type].color;
}

// turret (optional): applies the cooldown multiplier of the branch it picked
function getTurretShotCooldown(type, level, turret){
	var branch = turret ? getTurretBranch(turret) : null;
	// cooldownLevelCap: the cooldown stops improving with levels past this one
	if (branch && branch.cooldownLevelCap) level = Math.min(level, branch.cooldownLevelCap);
	var def = TURRET_DEFS[type];
	var cooldown = def.cooldown(level);
	// cooldownImprove: only that share of the cooldown reduction gained above the branch level is kept
	if (branch && branch.cooldownImprove !== undefined && level > def.branchLevel) {
		var atBranchLevel = def.cooldown(def.branchLevel);
		cooldown = Math.round(atBranchLevel - (atBranchLevel - cooldown) * branch.cooldownImprove);
	}
	return (branch && branch.cooldownMult) ? Math.round(cooldown * branch.cooldownMult) : cooldown;
}

function getTurretAnimationCooldown(type, level){
	return TURRET_DEFS[type].animationCooldown(level);
}

function updateTurretCooldownPostShooting(turret) {
	if (turret.shotCd > 0) {
		return;
	} else {
		switch (turret.type) {
		//case "machineGun":
			//break;
		//case "laser":
			//break;
		case "flamethrower":
			if (turret.shotCd < -49) {
				turret.shotCd = getTurretShotCooldown(turret.type, turret.level, turret);
			} else {
				turret.shotCd--;
			}
			break;
		case "blizzard":
			break; // cooldown gerenciado diretamente no disparo AoE
		//case "stormCannon":
			//break;
		//case "railCannon":
			//break;
		default:
			turret.shotCd = getTurretShotCooldown(turret.type, turret.level, turret);
			break;
		}
	}
}

// Reduces turret cooldown on every tick and deals with specific behaviors too
function updateTurretCooldownPostTurn(turrets){
	for (var i = 0; i < turrets.length; i++) {
		if (turrets[i].shotCd > 0) {
			turrets[i].shotCd--;
		} else {
			switch (turrets[i].type) {
			case "machineGun":
				break;
			case "laser":
				break;
			case "flamethrower":
				if (turrets[i].shotCd < 0) {
					turrets[i].shotCd++;
				}
				break;
			case "blizzard":
				if (turrets[i].shotCd == -1) {
					turrets[i].shotCd = getTurretShotCooldown(turrets[i].type, turrets[i].level, turrets[i]);
				}
				break;
			case "toxic":
				break;
			case "stormCannon":
				break;
			case "railCannon":
				break;
			case "missile":
				break;
			case "archery":
				break;
			}
		}
		if (turrets[i].type === "stormCannon" && turrets[i].overheat > 0) {
			if (turrets[i].overheatCoolTick > 0) {
				turrets[i].overheatCoolTick--;
			} else {
				turrets[i].overheat = Math.max(0, turrets[i].overheat - STORM_OVERHEAT_PER_SHOT);
				turrets[i].overheatBar.setAttribute("value", turrets[i].overheat);
				// When idle (no enemies in range), cool faster based on level
				var baseCoolTick = getTurretShotCooldown("stormCannon", 1);
				if (turrets[i].overheated) {
					// shut down: cools slower than idle until it reaches 0%
					baseCoolTick = Math.ceil(baseCoolTick / turrets[i].level) * STORM_OVERHEATED_COOL_MULT;
				} else if (!turrets[i].firedThisTurn) {
					baseCoolTick = Math.ceil(baseCoolTick / turrets[i].level);
				}
				turrets[i].overheatCoolTick = baseCoolTick;
				if (turrets[i].overheated && turrets[i].overheat === 0) {
					setStormOverheated(turrets[i], false);
				}
			}
			turrets[i].firedThisTurn = false;
		}
		// Auto Reload: an empty turret orders one missile by itself
		if (turrets[i].type === "missile" && turrets[i].autoReload && turrets[i].ammo === 0 &&
			turrets[i].ammoQueue === 0 && currentCash >= MISSILE_AMMO_COST) {
			currentCash -= MISSILE_AMMO_COST;
			turrets[i].ammoQueue++;
			updateStatus();
		}
		if (turrets[i].type === "missile" && turrets[i].ammoQueue > 0) {
			if (turrets[i].ammoLoadTick <= 0) {
				turrets[i].ammoLoadTick = getMissileReloadTicks(turrets[i]);
				if (!turrets[i].ammoLoadBar) {
					var loadBar = document.createElement("progress");
					loadBar.setAttribute("class", "ammo-load-bar");
					loadBar.setAttribute("value", 0);
					loadBar.setAttribute("max", getMissileReloadTicks(turrets[i]));
					loadBar.style.left = turrets[i].x + "px";
					loadBar.style.top  = (parseInt(turrets[i].y) + 22) + "px";
					document.body.appendChild(loadBar);
					turrets[i].ammoLoadBar = loadBar;
				}
			}
			turrets[i].ammoLoadTick--;
			if (turrets[i].ammoLoadBar) {
				turrets[i].ammoLoadBar.setAttribute("value", getMissileReloadTicks(turrets[i]) - turrets[i].ammoLoadTick);
			}
			if (turrets[i].ammoLoadTick <= 0) {
				turrets[i].ammo = Math.min(turrets[i].ammo + 1, getMissileMaxAmmo(turrets[i].level, turrets[i]));
				turrets[i].ammoQueue--;
				turrets[i].ammoLoadTick = 0;
				if (turrets[i].ammoLoadBar) {
					document.body.removeChild(turrets[i].ammoLoadBar);
					turrets[i].ammoLoadBar = null;
				}
			}
			var selectedId = document.getElementById("upgTurretId").value;
			if (turrets[i].htmlElement.id === selectedId) {
				updateTurretInfo(turrets[i]);
			}
		}
	}
}

// It plays the sound effect while the turret is firing.
function updateTurretSoundPostShooting(turrets){
		var shotAudio = getTurretShotAudio(turrets);
		if (turrets.audioCd < 0) {
			shotAudio.play();
			turrets.audioCd = getTurretShotCooldown(turrets.type, turrets.level, turrets);
		} else {
			turrets.audioCd--;
			shotAudio.play();
		}
}

// The audio a turret plays when it shoots: its branch sound (branch.sound) if it has one, otherwise the turret's own.
// The branch is picked after the turret is placed, so the branch audio is created the first time it is needed.
function getTurretShotAudio(turret) {
	var branch = getTurretBranch(turret);
	if (!branch || !branch.sound) return turret.audioFile;
	if (!turret.branchAudioFile || turret.branchAudioSrc !== branch.sound) {
		turret.branchAudioSrc = branch.sound;
		turret.branchAudioFile = applyEffectsVolume(new Audio(branch.sound));
	}
	return turret.branchAudioFile;
}

function turretSoundEffect(type){
	return new Audio(TURRET_DEFS[type].sound);
}

// Adds the turret's second sprite (if it has one) centered on the element that shows its base sprite.
// The size is in percent of the base so it scales with the element (map turret, shop card, ghost, stats icon).
function addTurretOverlay(el, type) {
	var def = TURRET_DEFS[type].overlay;
	if (!def) return null;
	var o = document.createElement("div");
	o.className = "turret-overlay" + (def.spins ? " turret-overlay-spin" : "");
	o.style.backgroundImage = def.image;
	o.style.width = (def.width / def.baseSize * 100) + "%";
	o.style.height = (def.height / def.baseSize * 100) + "%";
	o.style.left = ((def.baseSize - def.width) / 2 / def.baseSize * 100) + "%";
	o.style.top = ((def.baseSize - def.height) / 2 / def.baseSize * 100) + "%";
	el.appendChild(o);
	return o;
}

function turretImage(type) {
	return TURRET_DEFS[type].image;
}

function turretValue(type) {
	return TURRET_DEFS[type].value;
}

function turretRange(type) {
	return TURRET_DEFS[type].rangeTiles * TILE_W;
}

function turretDamage(type) {
	return TURRET_DEFS[type].damage;
}

function turretName(type) {
	return TURRET_DEFS[type].name;
}

function turretDescription(type) {
	return TURRET_DEFS[type].description;
}

function turretUpgradeCosts(type, turretLvl) {
	return turretLvl * turretValue(type) * TURRET_DEFS[type].upgradeCostMult(turretLvl);
}

function turretCritChance(type) {
	return TURRET_DEFS[type].critChance;
}

// turret (optional): applies the max ammo multiplier of the branch it picked
function getMissileMaxAmmo(level, turret) {
	var counts = [0, 5, 6, 8, 10, 12, 14, 16, 18];
	var maxAmmo = counts[level] || 18;
	var branch = turret ? getTurretBranch(turret) : null;
	return (branch && branch.ammoMult) ? Math.round(maxAmmo * branch.ammoMult) : maxAmmo;
}

// Ticks a bought missile takes to load
function getMissileReloadTicks(turret) {
	var branch = getTurretBranch(turret);
	return (branch && branch.reloadTicks) ? branch.reloadTicks : MISSILE_RELOAD_TICKS;
}

// Explosion radius in px of a Heavy Payload missile (0 when the turret has no splash)
function getMissileSplashRadius(turret) {
	var branch = getTurretBranch(turret);
	return (branch && branch.splashTiles) ? branch.splashTiles(turret.level) * TILE_W : 0;
}

// BRANCHED UPGRADES
// The branch definition the turret picked (null when it has none)
function getTurretBranch(turret) {
	var def = TURRET_DEFS[turret.type];
	return (def.branches && turret.branch) ? def.branches[turret.branch] : null;
}

// true when the turret reached its branch level and still has to pick a branch
function turretNeedsBranchChoice(turret) {
	var def = TURRET_DEFS[turret.type];
	return !!def.branches && !turret.branch && turret.level >= def.branchLevel;
}

// Damage, range and shot cooldown the turret would have right after picking the branch
function previewTurretBranch(turret, branchId) {
	var branch = TURRET_DEFS[turret.type].branches[branchId];
	var bonus = branch.chooseBonus;
	var baseCooldown = getTurretShotCooldown(turret.type, turret.level);
	return {
		cooldown: Math.round(baseCooldown * (branch.cooldownMult || 1)),
		damage: Math.round(turret.damage * (1 + bonus.dmg)),
		range: Math.round(turret.range * (1 + bonus.rng) / MAP_SCALE) * MAP_SCALE
	};
}

function applyTurretBranch(turret, branchId) {
	var stats = previewTurretBranch(turret, branchId);
	turret.branch = branchId;
	if (TURRET_DEFS[turret.type].branches[branchId].autoReload) turret.autoReload = true;
	turret.damage = stats.damage;
	turret.range = stats.range;
}

// Poison damage per tick applied by this toxic turret
function getToxicPoisonDamage(turret) {
	var branch = getTurretBranch(turret);
	return (branch && branch.poisonMult) ? TOXIC_MINION_DAMAGE * branch.poisonMult(turret.level) : TOXIC_MINION_DAMAGE;
}

// "All" for branches that hit every enemy in range
function formatTargetCount(count) {
	return count === Infinity ? "All" : count;
}

// Overheat a Storm Cannon gains per volley
function getStormHeatPerShot(turret) {
	var branch = getTurretBranch(turret);
	return (branch && branch.overheatPerShot) ? branch.overheatPerShot : STORM_OVERHEAT_PER_SHOT;
}

// Critical hit chance (%) of an arrow
function getArcheryCritChance(turret) {
	var branch = getTurretBranch(turret);
	return ((branch && branch.critChance !== undefined) ? branch.critChance : ARCHERY_CRIT_CHANCE) + getCritBonus(turret);
}

// PULSE SCANNER AURA
// Bonus the scanner gives to the towers near it: { range: % of range, crit: crit chance points }.
// Levels below the branch level have no branch, so no bonus.
function getPulseAura(scanner) {
	var branch = getTurretBranch(scanner);
	return {
		range: (branch && branch.rangeBonus && branch.rangeBonus[scanner.level]) || 0,
		crit:  (branch && branch.critBonus  && branch.critBonus[scanner.level])  || 0
	};
}

// Range in px the turret really has: its own range plus the Pulse Amplifier bonus
function getTurretRange(turret) {
	return turret.range * (1 + (turret.rangeBonus || 0) / 100);
}

// Crit chance bonus (percentage points) from a nearby Pulse Overdrive
function getCritBonus(turret) {
	return turret.critBonus || 0;
}

// Total crit chance (%) of a placed turret: its branch (or base) chance plus the Pulse Overdrive bonus.
// 0 for support towers and towers that never roll a crit.
function getTurretCritChance(turret) {
	var def = TURRET_DEFS[turret.type];
	if (def.support || def.canCrit === false) return 0;
	var branch = getTurretBranch(turret);
	var base = (branch && branch.critChance !== undefined) ? branch.critChance : (def.critChance || 0);
	return Math.min(100, base + getCritBonus(turret));
}

// Crit roll for turrets whose shot is not computed from its own crit roll: baseChance (%) plus the
// Pulse Overdrive bonus. A critical adds the base damage once more (2x total); returns that extra damage.
function extraCritDamage(turret, baseChance) {
	var chance = baseChance + getCritBonus(turret);
	if (chance <= 0) return 0;
	calculateCriticalHitDamage(chance, turret.damage);
	return lastHitCritical ? turret.damage : 0;
}

// Recomputes the aura bonuses of every placed turret: each one keeps the strongest bonus of
// the scanners that cover it (they don't stack). Scanners are support towers and are never boosted.
// Call whenever a turret is placed, sold, upgraded or picks a branch.
function refreshPulseAuras() {
	var scanners = [];
	for (var i = 0; i < turretPos.length; i++) {
		turretPos[i].rangeBonus = 0;
		turretPos[i].critBonus = 0;
		if (turretPos[i].type === "pulseScanner") scanners.push(turretPos[i]);
	}
	for (var s = 0; s < scanners.length; s++) {
		var aura = getPulseAura(scanners[s]);
		if (!aura.range && !aura.crit) continue;
		for (var t = 0; t < turretPos.length; t++) {
			var target = turretPos[t];
			if (TURRET_DEFS[target.type].support) continue;
			if (euclidDistance(scanners[s].x, target.x, scanners[s].y, target.y) > scanners[s].range) continue;
			target.rangeBonus = Math.max(target.rangeBonus, aura.range);
			target.critBonus = Math.max(target.critBonus, aura.crit);
		}
	}
	for (var b = 0; b < turretPos.length; b++) {
		var el = turretPos[b].htmlElement;
		el.classList.toggle("pulse-boosted", turretPos[b].rangeBonus > 0 || turretPos[b].critBonus > 0);
	}
}

// Text of the "Aura" / "Pulse bonus" row of the turret panel ("" when there is nothing to show)
function getPulseBonusText(turret) {
	var info = turret.type === "pulseScanner" ? getPulseAura(turret) : { range: turret.rangeBonus || 0, crit: turret.critBonus || 0 };
	var parts = [];
	if (info.range) parts.push("+" + info.range + "% range");
	if (info.crit) parts.push("+" + info.crit + "% crit");
	return parts.join(", ");
}
// END PULSE SCANNER AURA

// Extra facts shown on the shop info dialog
function turretSpecials(type) {
	return TURRET_DEFS[type].specials || [];
}

// [{ name, summary }] of the level 5 specializations of a turret type (empty when it has none)
function turretBranchSummaries(type) {
	var branches = TURRET_DEFS[type].branches;
	if (!branches) return [];
	return Object.keys(branches).map(function(id) {
		return { name: branches[id].name, summary: branches[id].summary };
	});
}

// Enemies the turret hits per shot
function getTurretTargetCount(turret) {
	var branch = getTurretBranch(turret);
	if (branch) return branch.targets;
	return turret.type === "archery" ? getArcheryTargetCount(turret.level) : 1;
}
// END BRANCHED UPGRADES

function getArcheryTargetCount(level) {
	if (level >= 8) return 3;
	if (level >= 5) return 2;
	return 1;
}

// TARGETING PRIORITY
// first: furthest along the path (closest to the end) / last: least along the path
// strong: highest HP / weak: lowest HP
const TARGET_MODES = ["first", "last", "strong", "weak"];

// Blizzard hits every enemy in range, so targeting doesn't apply to it
function turretHasTargeting(type) {
	return TURRET_DEFS[type].targeting !== false;
}

// Sorts candidates ({ el, progress, hp }) so the preferred target comes first
function sortByTargetMode(candidates, mode) {
	candidates.sort(function(a, b) {
		switch (mode) {
		case "last":
			return a.progress - b.progress;
		case "strong":
			return b.hp - a.hp;
		case "weak":
			return a.hp - b.hp;
		default: // "first"
			return b.progress - a.progress;
		}
	});
	return candidates;
}

function updateTargetModeUI(turret) {
	var row = document.getElementById("targetModeRow");
	if (!turretHasTargeting(turret.type)) {
		row.style.display = "none";
		return;
	}
	row.style.display = "flex";
	var buttons = row.querySelectorAll(".target-mode-btn");
	for (var b = 0; b < buttons.length; b++) {
		buttons[b].classList.toggle("target-mode-active", buttons[b].getAttribute("data-mode") === turret.targetMode);
	}
}
// END TARGETING PRIORITY

function getTurretSellPrice(type, upgradeTotalValue) {
	return (turretValue(type) * (0.2)) + (upgradeTotalValue * 0.2);
}

// DRAG AND DROP
function turretDrag(turretElement) {
	function drag(evt) {
		evt = evt || window.event;
		evt.dataTransfer.effectAllowed = 'copy';
		evt.dataTransfer.setData("Text", turretElement.id);
		draggedTurretEl = turretElement;
	}
	return drag;
}

function nodrag(evt) { }
// END DRAG AND DROP

function moveProjectiles() {
	var projectiles = document.getElementsByClassName("projectile");
	for (var index = 0; index < projectiles.length; index++) {
		var projectile =  projectiles[index];
		var currentX = parseInt(projectile.style.left.split("px")[0]);
		var currentY = parseInt(projectile.style.top.split("px")[0]);
		var targetMinion = document.getElementById(projectile.getAttribute("targetMinionId"));
		var targetX = parseInt(targetMinion.style.left.split("px")[0]);
		var targetY = parseInt(targetMinion.style.top.split("px")[0]);
		var xToTarget = Math.abs(currentX - targetX);
		var yToTarget = Math.abs(currentY - targetY);
		if ((xToTarget <= 7 && yToTarget <= 7)) {
			document.body.removeChild(projectile);
		} else {
			// Increases moved distance on specific axis to reduce diagonal visual impact.
			// If target distance on an axys is higher than double of the other, projectile moves faster on that axys
			var xToAdd = xToTarget > (yToTarget * 2) ? 7 : 5;
			var yToAdd = yToTarget > (xToTarget * 2) ? 7 : 5;
			if (currentX + xToAdd < targetX) {
				projectile.style.left = currentX + xToAdd + "px";
			}
			if (currentX - xToAdd > targetX) {
				projectile.style.left = currentX - xToAdd + "px";
			}
			if (currentY + yToAdd < targetY) {
				projectile.style.top = currentY + yToAdd + "px";
			}
			if (currentY - yToAdd > targetY) {
				projectile.style.top = currentY - yToAdd + "px";
			}
		}
	}
}
//Method to allow dead minions to call and destroy lost shots
function deleteProjectilesTargetingMinion(minionId) {
	var projectiles = document.querySelectorAll(".projectile[targetMinionId='" + minionId + "']");
	
	for (var index = 0; index < projectiles.length; index++) {
		document.body.removeChild(projectiles[index]);
	}
}

function showTurretInfo(turret){
	function upgrade(evt) {
		var form = document.getElementById("registrationForm");
		// clicking the turret already shown closes the panel; any other turret replaces it
		var sameTurret = document.getElementById("upgTurretId").value === turret.htmlElement.id;
		if (form.style.display !== "none" && sameTurret) {
			form.style.display = "none";
			hideRangeIndicator();
			return;
		}
		// only one turret dialog at a time: close the shop turret info
		hideShopTurretInfo();
		updateTurretInfo(turret);
		form.style.display = "block";
		showRangeIndicator(
			parseInt(turret.x) + TURRET_CENTER,
			parseInt(turret.y) + TURRET_CENTER,
			getTurretRange(turret),
			turretColor(turret.type)
		);
	}
	return upgrade;
}

function updateAmmoQueueUI(turret) {
    var maxAmmo = getMissileMaxAmmo(turret.level, turret);
    for (var s = 0; s < 5; s++) {
        var slot = document.getElementById("ammoSlot" + s);
        if (!slot) continue;
        var fill = slot.querySelector(".ammo-slot-fill");
        if (s < turret.ammoQueue) {
            if (s === 0) {
                slot.className = "ammo-slot ammo-slot-active";
                if (fill && turret.ammoLoadTick > 0) {
                    fill.style.height = ((getMissileReloadTicks(turret) - turret.ammoLoadTick) / getMissileReloadTicks(turret) * 100) + "%";
                } else if (fill) {
                    fill.style.height = "0%";
                }
            } else {
                slot.className = "ammo-slot ammo-slot-queued";
                if (fill) fill.style.height = "0%";
            }
        } else {
            slot.className = "ammo-slot";
            if (fill) fill.style.height = "0%";
        }
    }
    var buyBtn = document.getElementById("ammoBuyBtn");
    var queueFull = turret.ammoQueue >= 5;
    var wouldExceedMax = (turret.ammo + turret.ammoQueue) >= maxAmmo;
    buyBtn.disabled = queueFull || wouldExceedMax || currentCash < MISSILE_AMMO_COST;
}

function updateTurretInfo(turret){
    document.getElementById("upgTurretId").value = turret.htmlElement.id;
    var turretBranch = getTurretBranch(turret);
    document.getElementById("upgName").innerText = turretName(turret.type) + (turretBranch ? " - " + turretBranch.name : "");
    document.getElementById("upgLevel").innerText = turret.level;
    document.getElementById("damageRow").style.display = TURRET_DEFS[turret.type].support ? "none" : "flex";
    document.getElementById("upgDamage").innerText = turret.damage;
    var critChance = getTurretCritChance(turret);
    document.getElementById("upgCritRow").style.display = critChance > 0 ? "flex" : "none";
    document.getElementById("upgCritChance").innerText = critChance + "%" + (turret.critBonus ? " (+" + turret.critBonus + "%)" : "");
    document.getElementById("range").innerText = Math.round(getTurretRange(turret) / MAP_SCALE) + (turret.rangeBonus ? " (+" + turret.rangeBonus + "%)" : "");
    // Pulse Scanner: the aura it gives; other towers: the bonus they receive from a scanner
    var pulseBonusText = getPulseBonusText(turret);
    /*document.getElementById("pulseBonusRow").style.display = pulseBonusText ? "flex" : "none";
    document.getElementById("pulseBonusLabel").innerText = turret.type === "pulseScanner" ? "Aura" : "Pulse bonus";
    document.getElementById("pulseBonus").innerText = pulseBonusText;*/
    document.getElementById("upgCooldown").innerText = (getTurretShotCooldown(turret.type, turret.level, turret) / 100).toFixed(2) + " s";
    if (turret.type === "stormCannon") {
        var pct = Math.round((turret.overheat / STORM_OVERHEAT_MAX) * 100);
        document.getElementById("upgOverheat").innerText = pct + "%" + (turret.overheated ? " (Overheated)" : "");
        document.getElementById("overheatRow").style.display = "flex";
        if (turret.level >= 5) {
            document.getElementById("stormToggleRow").style.display = "flex";
            var btn = document.getElementById("stormToggleBtn");
            if (turret.active !== false) {
                btn.textContent = "On";
                btn.className = "storm-toggle-btn storm-toggle-on";
            } else {
                btn.textContent = "Off";
                btn.className = "storm-toggle-btn storm-toggle-off";
            }
        } else {
            document.getElementById("stormToggleRow").style.display = "none";
        }
    } else {
        document.getElementById("overheatRow").style.display = "none";
        document.getElementById("stormToggleRow").style.display = "none";
    }
    if (turret.type === "missile") {
        document.getElementById("ammoRow").style.display = "flex";
        document.getElementById("upgAmmo").innerText = turret.ammo + " / " + getMissileMaxAmmo(turret.level, turret);
        document.getElementById("ammoBuyRow").style.display = "flex";
        updateAmmoQueueUI(turret);
        var autoReloadRow = document.getElementById("autoReloadRow");
        autoReloadRow.style.display = (turretBranch && turretBranch.autoReload) ? "flex" : "none";
        var autoReloadBtn = document.getElementById("autoReloadBtn");
        autoReloadBtn.textContent = turret.autoReload ? "On" : "Off";
        autoReloadBtn.className = "storm-toggle-btn " + (turret.autoReload ? "storm-toggle-on" : "storm-toggle-off");
    } else {
        document.getElementById("ammoRow").style.display = "none";
        document.getElementById("ammoBuyRow").style.display = "none";
        document.getElementById("autoReloadRow").style.display = "none";
    }
    if (getTurretTargetCount(turret) > 1) {
        document.getElementById("multiTargetRow").style.display = "flex";
        document.getElementById("upgTargets").innerText = formatTargetCount(getTurretTargetCount(turret));
    } else {
        document.getElementById("multiTargetRow").style.display = "none";
    }
    updateTargetModeUI(turret);
    document.getElementById("sellBtn").innerText = getTurretSellPrice(turret.type, turretUpgradeCosts(turret.type, turret.level - 1)) + "\nSell!";
    document.getElementById("upgBtn").innerText = turretUpgradeCosts(turret.type, turret.level) + "\nUpgrade!";
    // at max level the upgrade button is hidden.
    // (and while the branch choice is pending)
    document.getElementById("upgBtn").style.display = (turret.level <= 7 && !turretNeedsBranchChoice(turret)) ? "block" : "none";
}

// Change turret data
function upgradeTurretData(turret){
	var def = TURRET_DEFS[turret.type];
	var branch = getTurretBranch(turret);
	var gain = (branch ? branch.upgrade : def.upgrade)(turret.level);
	var upgradeDamage = turret.level * turretDamage(turret.type);
	var baseRange = def.rangeScalesWithLevel === false ? turretRange(turret.type) : turret.level * turretRange(turret.type);
	turret.damage += upgradeDamage * gain.dmg;
	turret.range += baseRange * gain.rng;
	// damage and range are always whole numbers (range in base 15px tile units)
	turret.damage = Math.round(turret.damage);
	turret.range = Math.round(turret.range / MAP_SCALE) * MAP_SCALE;
}

function shootingTrigger(turret, minion, turretStyle, damage){
	//return 0 to deactivate critical hit.
	return TURRET_DEFS[turret.type].onShoot(turret, minion, turretStyle);
}

// true when the last calculateCriticalHitDamage call rolled a critical hit
var lastHitCritical = false;

function calculateCriticalHitDamage(criticalChance, turretDamage) {
    // Generate a random number between 0 and 1
    let randomNumber = Math.random();
	let criticalDmg = turretDamage;
	lastHitCritical = false;
    // Compare the random number with critical chance
    // Convert criticalChance from percentage to decimal
	if (randomNumber < (criticalChance / 100)) {
		criticalDmg = turretDamage * 2;
		lastHitCritical = true;
	}

	return criticalDmg;
}