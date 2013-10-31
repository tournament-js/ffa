var $ = require('interlude')
  , group = require('group')
  , Base = require('tournament');

//------------------------------------------------------------------
// Initialization helpers
//------------------------------------------------------------------

var unspecify = function (grps) {
  return grps.map(function (grp) {
    return $.replicate(grp.length, Base.NONE);
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
    return $.zip(m.p, m.m).sort(Base.compareZip).slice(0, adv);
  });

  // now flatten and sort across matches
  // this essentially re-seeds players for the next round
  top = $.pluck(0, $.flatten(top).sort(Base.compareZip));

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
  if (grs < 3 || (numGroups === 1 && grs >= 2)) {
    return "groups size must be at least 3 in regular rounds - 2 in final";
  }
  if (grs >= np) {
    return "group size must be less than the number of players left";
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
      return "number of groups must divide limit";
    }
  }
  else if (lastNg !== 1) {
    return "must contain a single match when not using limits";
  }
  return null;
};

var invalid = function (np, grs, adv, limit) {
  if (np < 2) {
    return "number of players must be at least 2";
  }
  if (!grs.length || !grs.every(Base.isInteger)) {
    return "sizes must be a non-empty array of integers";
  }
  if (!adv.every(Base.isInteger) || grs.length !== adv.length + 1) {
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

var FFA = Base.sub('FFA', function (opts, initParent) {
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

FFA.prototype.progress = function (match) {
  var adv = this.advs[match.id.r - 1] || 0;
  var currRnd = this.findMatches({r: match.id.r});
  if (currRnd.every($.get('m')) && adv > 0) {
    prepRound(currRnd, this.findMatches({r: match.id.r + 1}), adv);
  }
};

FFA.prototype.verify = function (match, score) {
  console.log('got match for verify:', match, score);
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

FFA.prototype.limbo = function (playerId) {
  // if player reached currentRound, he may be waiting for generation of nextRound
  var m = $.firstBy(function (m) {
    return m.p.indexOf(playerId) >= 0 && m.m;
  }, this.currentRound() || []);

  if (m) {
    // will he advance to nextRound ?
    var adv = this.advs[m.id.r - 1];
    if (Base.sorted(m).slice(0, adv).indexOf(playerId) >= 0) {
      return {s: 1, r: m.id.r + 1};
    }
  }
};

// TODO: best scores
FFA.prototype.stats = function (res) {
  var advs = this.advs;
  this.matches.filter($.get('m')).forEach(function (m) {
    var top = $.zip(m.p, m.m).sort(Base.compareZip);
    var adv = advs[m.id.r - 1] || 0;
    //var topScore = top[0][1];
    for (var j = 0; j < top.length; j += 1) {
      var p = top[j][0] - 1
        , sc = top[j][1]; // scores
      res[p].for += sc;
      //res[p].against += (topScore - sc); // difference with winner

      // NB: final round win counted by .positionTies as can have multiple winners
      if (j < adv) {
        res[p].wins += 1;
      }
    }
  });

  var limit = this.limit;
  var maxround = this.sizes.length;

  // gradually improve scores for each player by looking at later and later rounds
  this.rounds().forEach(function (rnd, k) {
    var rndPs = $.flatten($.pluck('p', rnd)).filter($.neq(Base.NONE));
    rndPs.forEach(function (p) {
      res[p-1].pos = rndPs.length; // tie any players that got here
    });

    var isLimitedFinal = (limit > 0 && k === maxround - 1);
    var adv = isLimitedFinal ? limit / rnd.length : advs[k] || 0;

    rnd.filter($.get('m')).forEach(function (m) {
      // position the matches that have been played
      Base.sorted(m).forEach(function (p, i) {
        var resEl = res[p - 1];
        if ((isLimitedFinal && i < adv) || (i >= adv && i === 0)) {
          // winners of limited final || sole winner of limitless final
          resEl.wins += 1;
        }
        // positions tied between groups, and desc within
        resEl.pos = i*rnd.length + 1;
      });
    });
  });

  // still sort also by maps for in case people want to use that
  return res.sort($.comparing('pos', +1, 'for', -1));
};


module.exports = FFA;
