var $ = require('interlude')
  , group = require('group')
  , Tournament = require('tournament');

//------------------------------------------------------------------
// Initialization helpers
//------------------------------------------------------------------

var unspecify = function (grps) {
  return grps.map(function (grp) {
    return $.replicate(grp.length, Tournament.NONE);
  });
};

var makeMatches = function (np, grs, adv) {
  var matches = []; // pushed in sort order
  // rounds created iteratively - know configuration valid at this point so just
  // repeat the calculation in the validation
  for (var i = 0; i < grs.length; i += 1) {
    var a = adv[i]
      , gs = grs[i]
      , numGroups = Math.ceil(np / gs)
      , grps = group(np, gs);

    if (numGroups !== grps.length) {
      throw new Error("internal FFA construction error");
    }
    if (i > 0) {
      // only fill in seeding numbers for round 1, otherwise placeholders
      grps = unspecify(grps);
    }

    // fill in matches
    for (var m = 0; m < grps.length; m += 1) {
      matches.push({id: {s: 1, r: i+1, m: m + 1}, p: grps[m]}); // matches 1-indexed
    }
    // reduce players left (for next round - which will exist if a is defined)
    np = numGroups*a;
  }
  return matches;
};

var prepRound = function (currRnd, nxtRnd, adv) {
  var top = currRnd.map(function (m) {
    return $.zip(m.p, m.m).sort(Tournament.compareZip).slice(0, adv);
  });

  // now flatten and sort across matches
  // this essentially re-seeds players for the next round
  top = $.pluck(0, $.flatten(top).sort(Tournament.compareZip));

  // re-find group size from maximum length of zeroed player array in next round
  var grs = $.maximum($.pluck('length', $.pluck('p', nxtRnd)));

  // set all next round players with the fairly grouped set
  group(top.length, grs).forEach(function (group, k) {
    // replaced nulled out player array with seeds mapped to corr. top placers
    nxtRnd[k].p = group.map(function (seed) {
      return top[seed-1]; // NB: top is zero indexed
    });
  });
};

//------------------------------------------------------------------
// Invalid helpers
//------------------------------------------------------------------

var roundInvalid = function (np, grs, adv, numGroups) {
  // the group size in here refers to the maximal reduced group size
  if (np < 2) {
    return "needs at least 2 players";
  }
  if (grs < 3 || (numGroups === 1 && grs < 2)) {
    return "groups size must be at least 3 in regular rounds - 2 in final";
  }
  if (grs > np) {
    return "group size cannot be greater than the number of players left";
  }
  if (adv >= grs) {
    return "must advance less than the group size";
  }
  var isUnfilled = (np % numGroups) > 0;
  if (isUnfilled && adv >= grs - 1) {
    return "must advance less than the smallest match size";
  }
  if (adv <= 0) {
    return "must eliminate players each match";
  }
  return null;
};

var finalInvalid = function (leftOver, limit, gLast) {
  if (leftOver < 2) {
    return "must at least contain 2 players"; // force >4 when using limits
  }
  var lastNg = Math.ceil(leftOver / gLast);
  if (limit > 0) { // using limits
    if (limit >= leftOver) {
      return "limit must be less than the remaining number of players";
    }
    // need limit to be a multiple of numGroups (otherwise tiebreaks necessary)
    if (limit % lastNg !== 0) {
      return "number of matches in final round must divide limit";
    }
  }
  return null;
};

var invalid = function (np, grs, adv, limit) {
  if (np < 2) {
    return "number of players must be at least 2";
  }
  if (!grs.length || !grs.every(Tournament.isInteger)) {
    return "sizes must be a non-empty array of integers";
  }
  if (!adv.every(Tournament.isInteger) || grs.length !== adv.length + 1) {
    return "advancers must be a sizes.length-1 length array of integers";
  }

  var numGroups = 0;
  for (var i = 0; i < adv.length; i += 1) {
    // loop over adv as then both a and g exist
    var a = adv[i];
    var g = grs[i];
    // calculate how big the groups are
    numGroups = Math.ceil(np / g);
    var gActual = group.minimalGroupSize(np, g);

    // and ensure with group reduction that eliminationValid for reduced params
    var invReason = roundInvalid(np, gActual, a, numGroups);
    if (invReason !== null) {
      return "round " + (i+1) + " " + invReason;
    }
    // return how many players left so that np is updated for next itr
    np = numGroups*a;
  }
  // last round and limit checks
  var invFinReason = finalInvalid(np, limit, grs[grs.length-1]);
  if (invFinReason !== null) {
    return "final round: " + invFinReason;
  }

  // nothing found - ok to create
  return null;
};

//------------------------------------------------------------------
// Interface
//------------------------------------------------------------------

var FFA = Tournament.sub('FFA', function (opts, initParent) {
  this.limit = opts.limit;
  this.advs = opts.advancers;
  this.sizes = opts.sizes;
  initParent(makeMatches(this.numPlayers, this.sizes, this.advs));
});

//------------------------------------------------------------------
// Static helpers and constants
//------------------------------------------------------------------

FFA.configure({
  defaults: function (np, opts) {
    opts.limit = opts.limit | 0;
    opts.sizes = Array.isArray(opts.sizes) ? opts.sizes : [np];
    opts.advancers = Array.isArray(opts.advancers) ? opts.advancers : [];
    return opts;
  },
  invalid: function (np, opts) {
    return invalid(np, opts.sizes, opts.advancers, opts.limit);
  }
});

FFA.idString = function (id) {
  // ffa has no concepts of sections yet so they're all 1
  if (!id.m) {
    return "R" + id.r + " M X";
  }
  return "R" + id.r + " M" + id.m;
};

//------------------------------------------------------------------
// Expected methods
//------------------------------------------------------------------

FFA.prototype._progress = function (match) {
  var adv = this.advs[match.id.r - 1] || 0;
  var currRnd = this.findMatches({r: match.id.r});
  if (currRnd.every($.get('m')) && adv > 0) {
    prepRound(currRnd, this.findMatches({r: match.id.r + 1}), adv);
  }
};

FFA.prototype._verify = function (match, score) {
  var adv = this.advs[match.id.r - 1] || 0;
  if (adv > 0 && score[adv] === score[adv - 1]) {
    return "scores must unambiguous decide who advances";
  }
  if (!adv && this.limit > 0) {
    // number of groups in last round is the match number of the very last match
    // because of the ordering this always works!
    var lastNG = this.matches[this.matches.length-1].id.m;
    var cutoff = this.limit/lastNG; // NB: lastNG divides limit (from finalInvalid)
    if (score[cutoff] === score[cutoff - 1]) {
      return "scores must decide who advances in final round with limits";
    }
  }
  return null;
};

FFA.prototype._limbo = function (playerId) {
  // if player reached currentRound, he may be waiting for generation of nextRound
  var m = $.firstBy(function (m) {
    return m.p.indexOf(playerId) >= 0 && m.m;
  }, this.currentRound() || []);

  if (m) {
    // will he advance to nextRound ?
    var adv = this.advs[m.id.r - 1];
    if (Tournament.sorted(m).slice(0, adv).indexOf(playerId) >= 0) {
      return {s: 1, r: m.id.r + 1};
    }
  }
};

FFA.prototype._stats = function (res, m) {
  if (m.m) {
    var adv = this.advs[m.id.r - 1] || 0;
    $.zip(m.p, m.m).sort(Tournament.compareZip).forEach(function (t, j, top) {
      var p = Tournament.resultEntry(res, t[0]);
      p.for += t[1];
      p.against += (top[0][1] - t[1]); // difference with winner
      if (j < adv) {
        p.wins += 1;
      }
    });
  }
  return res;
};

var compareMulti = function (x, y) {
  return (x.pos - y.pos) ||
         ((y.for - y.against) - (x.for - x.against)) ||
         (x.seed - y.seed);
};

FFA.prototype._sort = function (res) {
  var limit = this.limit;
  var advs = this.advs;
  var sizes = this.sizes;
  var maxround = this.sizes.length;

  // gradually improve scores for each player by looking at later and later rounds
  this.rounds().forEach(function (rnd, k) {
    var rndPs = $.flatten($.pluck('p', rnd)).filter($.gt(Tournament.NONE));
    rndPs.forEach(function (p) {
      Tournament.resultEntry(res, p).pos = rndPs.length; // tie players that got here
    });

    var isFinal = (k === maxround - 1);
    var adv = advs[k] || 0;
    var wlim = (limit > 0 && isFinal) ? limit / rnd.length : adv;
    var nonAdvancers = $.replicate(sizes[k] - adv, []); // all in final

    // collect non-advancers - and set wins
    rnd.filter($.get('m')).forEach(function (m) {
      var startIdx = isFinal ? 0 : adv;
      var top = $.zip(m.p, m.m).sort(Tournament.compareZip).slice(startIdx);
      Tournament.matchTieCompute(top, startIdx, function (p, pos) {
        var resEl = Tournament.resultEntry(res, p);
        if (pos <= wlim || (pos === 1 && !adv)) {
          resEl.wins += 1;
        }
        if (isFinal) {
          resEl.gpos = pos; // for rawPositions
        }
        nonAdvancers[pos-adv-1].push(resEl);
      });
    });

    // nonAdvancers will be tied between the round based on their mpos
    var posctr = adv*rnd.length + 1;
    nonAdvancers.forEach(function (xplacers) {
      xplacers.forEach(function (r) {
        r.pos = posctr;
      });
      posctr += xplacers.length;
    });
  });

  return res.sort(compareMulti);
};

// helper method to be compatible with TieBreaker
FFA.prototype.rawPositions = function (res) {
  if (!this.isDone()) {
    throw new Error("cannot tiebreak a FFA tournament until it is finished");
  }
  var maxround = this.sizes.length;
  var finalRound = this.findMatches({ r: maxround });
  var posAry = finalRound.map(function (m) {
    var seedAry = $.replicate(m.p.length, []);
    m.p.forEach(function (p) {
      var resEl = Tournament.resultEntry(res, p);
      $.insert(seedAry[(resEl.gpos || resEl.pos)-1], p);
    });
    return seedAry;
  });
  return posAry;
};


module.exports = FFA;
