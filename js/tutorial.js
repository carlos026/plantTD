/**
 * Tutorial — interactive walkthrough shown once, on a new player's first map.
 *
 * Each step highlights a game element (spotlight) and shows a card.
 * Steps with `waitFor` only advance when the player performs the action;
 * the others advance with the NEXT button. Steps flagged `pause` freeze the
 * wave while the player reads. Completion (or skip) is stored in the
 * player profile via PlayerData.markTutorialDone().
 */
var Tutorial = (function () {
    var POLL_MS = 200;
    var CARD_W  = 320;
    var PAD     = 6;

    var _steps = [
        {
            title: function () { return 'Welcome, ' + PlayerData.getPlayer().nickname + '!'; },
            text:  'Plant TD is a tower defense game: stop the enemies before they reach the end of the road. Let\'s learn the basics.'
        },
        {
            title:  'Your status',
            text:   'Cash buys towers, Lives drop when an enemy escapes and Wave shows your progress. Survive 30 waves to complete the map.',
            target: function () { return document.getElementById('statusbar'); }
        },
        {
            title:   'Start the wave',
            text:    'Press START to release the first wave of enemies.',
            hint:    'Click START to continue',
            target:  function () { return document.getElementById('startbutton'); },
            waitFor: function () { return isRunning; }
        },
        {
            title:   'Build a tower',
            text:    'Click a tower in the shop, then drag it onto a free tile next to the road. Towers can\'t be placed on the road.',
            hint:    'Place a tower to continue',
            target:  function () { return document.querySelector('.turret'); },
            waitFor: function () { return turretPos.length > 0; }
        },
        {
            title:  'Tower info',
            text:   'The ⓘ button below each shop card shows the tower\'s damage, range, cooldown and cost.',
            target: function () { return document.querySelector('.turret-shop-info-btn'); },
            pause:  true
        },
        {
            title:   'Manage your tower',
            text:    'Click the tower you just placed to open its panel.',
            hint:    'Click your tower to continue',
            target:  function () { return turretPos.length > 0 ? turretPos[turretPos.length - 1].htmlElement : null; },
            waitFor: function () { return document.getElementById('registrationForm').style.display !== 'none'; }
        },
        {
            title:  'Upgrade or sell',
            text:   'Upgrade! increases damage and range. Sell! gives back part of the cost so you can reposition.',
            target: function () { return document.getElementById('registrationForm'); },
            pause:  true
        },
        {
            title:  'Good luck!',
            text:   'Kill enemies to earn cash and score. Click an enemy to see its HP and use DMG STATS to compare towers. Completing a map earns Golden Seeds to unlock new maps and towers in PROGRESSION.',
            pause:  true
        }
    ];

    var _index     = -1;
    var _timer     = null;
    var _pausedByUs = false;
    var _spot = null, _card = null, _title = null, _text = null,
        _hint = null, _nextBtn = null, _counter = null;

    function isActive() {
        return _index !== -1;
    }

    function startIfNeeded() {
        var p = PlayerData.getPlayer();
        if (!p || p.tutorialDone || isActive()) return;
        _build();
        _index = 0;
        _render();
        _timer = setInterval(_tick, POLL_MS);
    }

    function _build() {
        _spot = document.createElement('div');
        _spot.className = 'tutorial-spotlight';

        _card = document.createElement('div');
        _card.className = 'tutorial-card';
        _card.innerHTML =
            '<div class="tutorial-head">' +
                '<span class="tutorial-counter"></span>' +
                '<button class="tutorial-skip" type="button">Skip tutorial</button>' +
            '</div>' +
            '<h2 class="tutorial-title"></h2>' +
            '<p class="tutorial-text"></p>' +
            '<p class="tutorial-hint"></p>' +
            '<button class="tutorial-next" type="button">NEXT</button>';

        _counter = _card.querySelector('.tutorial-counter');
        _title   = _card.querySelector('.tutorial-title');
        _text    = _card.querySelector('.tutorial-text');
        _hint    = _card.querySelector('.tutorial-hint');
        _nextBtn = _card.querySelector('.tutorial-next');
        _card.querySelector('.tutorial-skip').addEventListener('click', _finish);
        _nextBtn.addEventListener('click', _next);

        document.body.appendChild(_spot);
        document.body.appendChild(_card);
    }

    function _render() {
        var step = _steps[_index];
        var last = _index === _steps.length - 1;

        _counter.textContent = (_index + 1) + ' / ' + _steps.length;
        _title.textContent   = typeof step.title === 'function' ? step.title() : step.title;
        _text.textContent    = step.text;
        _hint.textContent    = step.hint || '';
        _hint.style.display  = step.waitFor ? 'block' : 'none';
        _nextBtn.style.display = step.waitFor ? 'none' : 'inline-block';
        _nextBtn.textContent = last ? 'LET\'S PLAY!' : 'NEXT';

        // Freeze the wave while the player reads informational steps
        if (step.pause && isRunning && !isPaused) {
            isPaused = true;
            _pausedByUs = true;
        } else if (!step.pause) {
            _resumeIfPausedByUs();
        }

        _position();
    }

    function _tick() {
        var step = _steps[_index];
        if (step.waitFor && step.waitFor()) {
            _next();
            return;
        }
        _position();
    }

    function _next() {
        if (_index >= _steps.length - 1) {
            _finish();
            return;
        }
        _index++;
        _render();
    }

    function _finish() {
        clearInterval(_timer);
        _timer = null;
        _index = -1;
        _resumeIfPausedByUs();
        if (_spot && _spot.parentNode) _spot.parentNode.removeChild(_spot);
        if (_card && _card.parentNode) _card.parentNode.removeChild(_card);
        _spot = _card = null;
        PlayerData.markTutorialDone();
    }

    function _resumeIfPausedByUs() {
        if (_pausedByUs) {
            isPaused = false;
            _pausedByUs = false;
        }
    }

    // Places the spotlight over the step target and the card next to it.
    // Coordinates are converted to game space, since body is zoomed on mobile.
    function _position() {
        var step   = _steps[_index];
        var target = step.target ? step.target() : null;
        var scale  = getMobileScale();
        var viewW  = window.innerWidth  / scale;
        var viewH  = window.innerHeight / scale;
        var cardH  = _card.offsetHeight;

        if (!target || target.offsetParent === null) {
            _spot.classList.add('tutorial-spotlight-full');
            _spot.style.left = _spot.style.top = '0px';
            _spot.style.width = _spot.style.height = '0px';
            _card.style.left = Math.max(16, (viewW - CARD_W) / 2) + 'px';
            _card.style.top  = Math.max(16, (viewH - cardH) / 2) + 'px';
            return;
        }

        var r = target.getBoundingClientRect();
        var x = r.left / scale - PAD;
        var y = r.top  / scale - PAD;
        var w = r.width  / scale + PAD * 2;
        var h = r.height / scale + PAD * 2;

        _spot.classList.remove('tutorial-spotlight-full');
        _spot.style.left   = x + 'px';
        _spot.style.top    = y + 'px';
        _spot.style.width  = w + 'px';
        _spot.style.height = h + 'px';

        // Prefer below the target, then above, then beside it
        var cardX = Math.min(Math.max(16, x), viewW - CARD_W - 16);
        var cardY;
        if (y + h + 12 + cardH <= viewH) {
            cardY = y + h + 12;
        } else if (y - 12 - cardH >= 0) {
            cardY = y - 12 - cardH;
        } else {
            cardY = Math.min(Math.max(16, y), viewH - cardH - 16);
            cardX = x + w + 12 + CARD_W <= viewW ? x + w + 12 : Math.max(16, x - 12 - CARD_W);
        }
        _card.style.left = cardX + 'px';
        _card.style.top  = cardY + 'px';
    }

    return {
        startIfNeeded: startIfNeeded,
        isActive:      isActive
    };
})();
