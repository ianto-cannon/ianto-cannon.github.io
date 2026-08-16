"use strict";

if (!localStorage.getItem("reloaded")) {
    localStorage.setItem("reloaded", "true");
    var timestamp = new Date().getTime();
    window.location.href = window.location.pathname + '?v=' + timestamp;
} else {
    localStorage.removeItem("reloaded");
}; 

var selectedsquare = null;
var game = new Chess();
var board = Chessboard("chessboard", {
    draggable: false,
    position: "start",
    onSnapEnd: function onSnapEnd() {
        return board.position(game.fen(), false);
    }
});

// --- CLOCK VARIABLES ---
var whiteTime = 300;
var blackTime = 300;
var whiteIncrement = 0;
var blackIncrement = 0;
var timerInterval = null;
var firstMoveMade = false;
var isPaused = false;

// --- CLOCK FUNCTIONS ---
function formatTime(seconds) {
    var isNeg = seconds < 0;
    seconds = Math.abs(seconds);
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return (isNeg ? "-" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

function updateClockDisplay() {
    var wClock = document.getElementById("white-clock");
    var bClock = document.getElementById("black-clock");
    
    if (wClock) {
        wClock.textContent = formatTime(whiteTime);
        wClock.style.color = (game.turn() === 'w' && timerInterval && !isPaused) ? "red" : "black";
    }
    if (bClock) {
        bClock.textContent = formatTime(blackTime);
        bClock.style.color = (game.turn() === 'b' && timerInterval && !isPaused) ? "red" : "black";
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        updateClockDisplay();
    }
}

function startTimer() {
    stopTimer(); 
    updateClockDisplay();
    timerInterval = setInterval(function() {
        if (game.game_over() || isPaused) {
            return;
        }
        
        if (game.turn() === 'w') {
            whiteTime--;
        } else {
            blackTime--;
        }
        updateClockDisplay();
    }, 1000);
}

function applyClockSettings() {
    var wStartInput = document.getElementById("white-start-time");
    var wIncInput = document.getElementById("white-increment");
    var bStartInput = document.getElementById("black-start-time");
    var bIncInput = document.getElementById("black-increment");
    
    if(wStartInput && wIncInput) {
        whiteTime = (parseInt(wStartInput.value, 10) || 0) * 60;
        whiteIncrement = parseInt(wIncInput.value, 10) || 0;
    }
    if(bStartInput && bIncInput) {
        blackTime = (parseInt(bStartInput.value, 10) || 0) * 60;
        blackIncrement = parseInt(bIncInput.value, 10) || 0;
    }
    firstMoveMade = false;
    stopTimer();
    updateClockDisplay();
}

// --- MODE & BOT LOGIC ---
function getColorName(color) {
    return color === 'w' ? 'white' : 'black';
}

function getMode(color) {
    var colorName = getColorName(color);
    var checked = document.querySelector('input[name="' + colorName + '-mode"]:checked');
    return checked ? checked.id : (colorName + "-human");
}

function getLevel(color) {
    var colorName = getColorName(color);
    var input = document.getElementById(colorName + "-level");
    return input ? parseInt(input.value, 10) : 1;
}

function checkAndTriggerBot() {
    if (game.game_over() || isPaused) return;
    
    var turn = game.turn(); // 'w' or 'b'
    var mode = getMode(turn);
    var robotMode = getColorName(turn) + "-robot";
    
    if (mode === robotMode) {
        if (!firstMoveMade) {
            firstMoveMade = true;
            startTimer();
        }
        
        setTimeout(function () {
            if (game.game_over() || isPaused) return;
            var depth = getLevel(turn);
            var isMax = (turn === 'w');
            var bm = minimaxroot(depth, game, isMax);
            
            if (bm) {
                var movedColor = game.turn();
                game.move(bm);
                board.position(game.fen(), false);
                updateLog();
                
                if (movedColor === 'w') whiteTime += whiteIncrement;
                else blackTime += blackIncrement;
                
                updateClockDisplay();
                handlegameover();
                if (!isPaused) checkAndTriggerBot(); 
            }
        }, 250);
    }
}

function resetgame() {
    game.reset();
    board.position("start", false);
    removegreysquares();
    selectedsquare = null;
    $("#log").text("");
    isPaused = false;
    document.getElementById("pause").textContent = "pause";
    document.getElementById("title").textContent = "Kindle chess";
    
    applyClockSettings();
    
    setTimeout(function() {
        checkAndTriggerBot();
    }, 500);
}

// --- LOG FUNCTIONS ---
function updateLog() {
    var history = game.history();
    var logText = "";
    for (var i = 0; i < history.length; i++) {
        if (i % 2 === 0) {
            logText += (i / 2 + 1) + ". " + history[i];
        } else {
            logText += "  " + history[i] + "\n";
        }
    }
    $("#log").text(logText);
}

// --- CLICK HANDLERS ---
$("#chessboard").on("click", ".square-55d63", function () {
    var turn = game.turn();
    var mode = getMode(turn);
    
    if (mode === getColorName(turn) + "-robot" || game.game_over() || isPaused) return;

    var sq = $(this).attr("data-square");
    var pc = game.get(sq);
    var tc = turn;
    var ip = pc && pc.color === tc;
    var lm = game.moves({ square: sq, verbose: true });
    
    if (!selectedsquare) {
        if (!ip || lm.length === 0) return;
        selectedsquare = sq;
        removegreysquares();
        greysquare(sq);
        lm.forEach(function (m) { return greysquare(m.to); });
        return;
    }
    if (selectedsquare === sq) {
        removegreysquares();
        selectedsquare = null;
        return;
    }
    if (ip) {
        if (lm.length === 0) {
            removegreysquares();
            selectedsquare = null;
            return;
        }
        selectedsquare = sq;
        removegreysquares();
        greysquare(sq);
        lm.forEach(function (m) { return greysquare(m.to); });
        return;
    }
    
    var mv = game.move({ from: selectedsquare, to: sq, promotion: "q" });
    removegreysquares();
    if (!mv) {
        greysquare(selectedsquare);
        game.moves({ square: selectedsquare, verbose: true }).forEach(function (m) { return greysquare(m.to); });
        return;
    }
    
    board.position(game.fen(), false);
    selectedsquare = null;
    updateLog();
    
    var movedColor = game.turn() === 'w' ? 'b' : 'w';
    if (movedColor === 'w') whiteTime += whiteIncrement;
    else blackTime += blackIncrement;
    
    if (!firstMoveMade) {
        firstMoveMade = true;
        startTimer();
    }
    updateClockDisplay();
    
    handlegameover();
    checkAndTriggerBot();
});

$("#chessboard").parent().on("click", function (e) {
    if (!$(e.target).closest(".square-55d63").length) {
        removegreysquares();
        selectedsquare = null;
    }
});

$("#pause").on("click", function() {
    if (game.game_over()) return;
    if (isPaused) {
        isPaused = false;
        this.textContent = "pause";
        startTimer();
        checkAndTriggerBot();
    } else {
        isPaused = true;
        this.textContent = "resume";
        stopTimer();
    }
});

function handlegameover() {
    if (game.game_over()) {
        stopTimer(); 
        var winner = game.in_checkmate() ? (game.turn() === "w" ? "Black" : "White") + " Wins!" : "Draw!";
        document.getElementById("title").textContent = winner;
        return;
    }
    // Show "check" if in check, otherwise default title
    if (game.in_check()) {
        document.getElementById("title").textContent = "Check!";
    } else {
        document.getElementById("title").textContent = "Kindle chess";
    }
}

// --- RESET PIECES WHEN SETTINGS CHANGE ---
// Listens to all radio buttons and number inputs for settings
$("#black-mode input, #white-mode input, #black-level, #white-level, #black-start-time, #white-start-time, #black-increment, #white-increment").on("change", resetgame);

// --- AI MINIMAX LOGIC ---
var pawnevalwhite = [[0, 0, 0, 0, 0, 0, 0, 0], [5, 5, 5, 5, 5, 5, 5, 5], [1, 1, 2, 3, 3, 2, 1, 1], [0.5, 0.5, 1, 2.5, 2.5, 1, 0.5, 0.5], [0, 0, 0, 2, 2, 0, 0, 0], [0.5, -0.5, -1, 0, 0, -1, -0.5, 0.5], [0.5, 1, 1, -2, -2, 1, 1, 0.5], [0, 0, 0, 0, 0, 0, 0, 0]];
var pawnevalblack = pawnevalwhite.slice().reverse();
var knighteval = [[-5, -4, -3, -3, -3, -3, -4, -5], [-4, -2, 0, 0, 0, 0, -2, -4], [-3, 0, 1, 1.5, 1.5, 1, 0, -3], [-3, 0.5, 1.5, 2, 2, 1.5, 0.5, -3], [-3, 0, 1.5, 2, 2, 1.5, 0, -3], [-3, 0.5, 1, 1.5, 1.5, 1, 0.5, -3], [-4, -2, 0, 0.5, 0.5, 0, -2, -4], [-5, -4, -3, -3, -3, -3, -4, -5]];
var bishopevalwhite = [[-2, -1, -1, -1, -1, -1, -1, -2], [-1, 0, 0, 0, 0, 0, 0, -1], [-1, 0, 0.5, 1, 1, 0.5, 0, -1], [-1, 0.5, 0.5, 1, 1, 0.5, 0.5, -1], [-1, 0, 1, 1, 1, 1, 0, -1], [-1, 1, 1, 1, 1, 1, 1, -1], [-1, 0.5, 0, 0, 0, 0, 0.5, -1], [-2, -1, -1, -1, -1, -1, -1, -2]];
var bishopevalblack = bishopevalwhite.slice().reverse();
var rookevalwhite = [[0, 0, 0, 0, 0, 0, 0, 0], [0.5, 1, 1, 1, 1, 1, 1, 0.5], [-0.5, 0, 0, 0, 0, 0, 0, -0.5], [-0.5, 0, 0, 0, 0, 0, 0, -0.5], [-0.5, 0, 0, 0, 0, 0, 0, -0.5], [-0.5, 0, 0, 0, 0, 0, 0, -0.5], [-0.5, 0, 0, 0, 0, 0, 0, -0.5], [0, 0, 0, 0.5, 0.5, 0, 0, 0]];
var rookevalblack = rookevalwhite.slice().reverse();
var evalqueen = [[-2, -1, -1, -0.5, -0.5, -1, -1, -2], [-1, 0, 0, 0, 0, 0, 0, -1], [-1, 0, 0.5, 0.5, 0.5, 0.5, 0, -1], [-0.5, 0, 0.5, 0.5, 0.5, 0.5, 0, -0.5], [0, 0, 0.5, 0.5, 0.5, 0.5, 0, -0.5], [-1, 0.5, 0.5, 0.5, 0.5, 0.5, 0, -1], [-1, 0, 0.5, 0, 0, 0, 0, -1], [-2, -1, -1, -0.5, -0.5, -1, -1, -2]];
var kingevalwhite = [[-3, -4, -4, -5, -5, -4, -4, -3], [-3, -4, -4, -5, -5, -4, -4, -3], [-3, -4, -4, -5, -5, -4, -4, -3], [-3, -4, -4, -5, -5, -4, -4, -3], [-2, -3, -3, -4, -4, -3, -3, -2], [-1, -2, -2, -2, -2, -2, -2, -1], [2, 2, 0, 0, 0, 0, 2, 2], [2, 3, 1, 0, 0, 1, 3, 2]];
var kingevalblack = kingevalwhite.slice().reverse();

function getpiecevalue(p, x, y) {
    if (!p) return 0;
    var w = p.color === "w";
    var b = void 0;
    switch (p.type) {
        case "p": b = 10 + (w ? pawnevalwhite[y][x] : pawnevalblack[y][x]); break;
        case "n": b = 30 + knighteval[y][x]; break;
        case "b": b = 30 + (w ? bishopevalwhite[y][x] : bishopevalblack[y][x]); break;
        case "r": b = 50 + (w ? rookevalwhite[y][x] : rookevalblack[y][x]); break;
        case "q": b = 90 + evalqueen[y][x]; break;
        case "k": b = 900 + (w ? kingevalwhite[y][x] : kingevalblack[y][x]); break;
        default: return 0;
    }
    return w ? b : -b;
}

var positioncount = 0;

function minimaxroot(d, g, max) {
    var m = g.moves({ verbose: true });
    var bv = max ? -Infinity : Infinity, bm = null;
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = m[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var mm = _step.value;
            g.move(mm);
            var v = minimax(d - 1, g, -1e4, 1e4, !max);
            g.undo();
            if (max ? v > bv : v < bv) { bv = v; bm = mm; }
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) _iterator.return();
        } finally {
            if (_didIteratorError) throw _iteratorError;
        }
    }
    return bm;
}

function minimax(d, g, a, b, max) {
    positioncount++;
    // Fixed bug here: evaluateboard returns positive for white, negative for black. 
    // We shouldn't negate it, otherwise the AI thinks losing pieces is good!
    if (d === 0) return evaluateboard(g.board()); 
    
    var m = g.moves({ verbose: true });
    if (max) {
        var best = -Infinity;
        var _iteratorNormalCompletion2 = true; var _didIteratorError2 = false; var _iteratorError2 = undefined;
        try {
            for (var _iterator2 = m[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var mm = _step2.value;
                g.move(mm);
                best = Math.max(best, minimax(d - 1, g, a, b, false));
                g.undo();
                a = Math.max(a, best);
                if (b <= a) break;
            }
        } catch (err) { _didIteratorError2 = true; _iteratorError2 = err; } finally {
            try { if (!_iteratorNormalCompletion2 && _iterator2.return) _iterator2.return(); } finally { if (_didIteratorError2) throw _iteratorError2; }
        }
        return best;
    } else {
        var _best = Infinity;
        var _iteratorNormalCompletion3 = true; var _didIteratorError3 = false; var _iteratorError3 = undefined;
        try {
            for (var _iterator3 = m[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var _mm = _step3.value;
                g.move(_mm);
                _best = Math.min(_best, minimax(d - 1, g, a, b, true));
                g.undo();
                b = Math.min(b, _best);
                if (b <= a) break;
            }
        } catch (err) { _didIteratorError3 = true; _iteratorError3 = err; } finally {
            try { if (!_iteratorNormalCompletion3 && _iterator3.return) _iterator3.return(); } finally { if (_didIteratorError3) throw _iteratorError3; }
        }
        return _best;
    }
}

function evaluateboard(bd) {
    var t = 0;
    for (var y = 0; y < 8; y++) {
        for (var x = 0; x < 8; x++) {
            t += getpiecevalue(bd[y][x], x, y);
        }
    } return t;
}

var whitesquaregrey = "#a9a9a9";
var blacksquaregrey = "#696969";

function removegreysquares() {
    $("#chessboard .square-55d63").css("outline", "").css("outline-offset", "");
}

function greysquare(sq) {
    var s = $("#chessboard .square-" + sq);
    s.css({
        outline: "5px dashed black",
        "outline-offset": "-5px"
    });
}

// --- INIT ---
applyClockSettings();
$("#reset").on("click", resetgame);
