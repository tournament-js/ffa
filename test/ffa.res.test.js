var $ = require('interlude')
  , FFA = require(process.env.FFA_COV ? '../ffa-cov.js' : '../');

exports.limbo = function (t) {
  var ffa = new FFA(8, { sizes: [4, 4], advancers: [2] });
  t.equal(ffa.matches.length, 3, "3 matches here");
  t.deepEqual(ffa.matches[0].p, [1, 3, 6, 8], 'players in r1m1');
  t.deepEqual(ffa.matches[1].p, [2, 4, 5, 7], 'players in r1m2');

  t.equal(ffa.upcoming(1).length, 1, 'only 1 match for p1');
  t.equal(ffa.upcoming(2).length, 1, 'only 1 match for p2');
  t.equal(ffa.upcoming(1)[0].id.r, 1, 'match for p1 is in r1');
  t.equal(ffa.upcoming(2)[0].id.r, 1, 'match for p2 is in r1');

  t.ok(ffa.score(ffa.matches[0].id, [4,3,2,1]), 'score r1m1');

  t.equal(ffa.upcoming(1).length, 0, "no upcoming matches for p1 despite winning");
  t.deepEqual(ffa.limbo(1), { s: 1, r: 2 }, "but is in limbo");

  t.equal(ffa.upcoming(8).length, 0, "no upcoming matches for p8 because ko'd");
  t.equal(ffa.limbo(8), null, "and p8 is definitely not in limbo");

  t.done();
};


// full test of a 16 4 2 ffa tournament
exports.resultsStandardSixteenFour = function (t) {
  var opts = { sizes: [4, 4, 4], advancers: [2, 2] };
  var ffa = new FFA(16, opts)
    , gs = ffa.matches;

  t.equal(gs.length, 4 + 2 + 1, "ffa right number of matches");

  // ffaResults init tests
  var res = ffa.results();
  t.equal(res.length, 16, "all players had stats computed before scoring");

  var poss = $.nub($.pluck('pos', res));
  t.equal(poss.length, 1, "all players have same score");
  t.equal(poss[0], 16, "tied at 16"); // wont distinguish across matches

  var winss = $.nub($.pluck('wins', res));
  t.equal(winss.length, 1, "all players have same wins");
  t.equal(winss[0], 0, "all won 0");

  var sums = $.nub($.pluck('for', res));
  t.equal(sums.length, 1, "all players have same sum");
  t.equal(sums[0], 0, "all sum 0");

  var seedss = $.nub($.pluck('seed', res));
  t.equal(seedss.length, 16, "all different seeds represented");
  t.deepEqual(seedss.sort($.compare()), $.range(16), "should be all 16");

  // check that all players have an upcoming match in round 1
  $.range(16).forEach(function (n) {
    var up = ffa.upcoming(n);
    t.ok(up.length, "upcoming match for " + n + " exists");
    t.equal(up[0].id.r, 1, "upcoming match for " + n + " exists in r1");
    t.ok(up[0].id.m, "upcoming match for " + n + " is fully filled in!");
  });

  // now score the first round
  $.range(4).forEach(function (m) {
    t.equal(ffa.unscorable({s: 1, r: 1, m: m}, [4,3,2,1]), null, "quarter scorable");
    ffa.score({s: 1, r: 1, m: m}, [4, 3, 2, 1]); // in the order of their seeds
  });


  // verify snd round filled in
  t.deepEqual(ffa.players({r:2}), $.range(8), "r2 players are winners of r1");

  // check r2 stats computed correctly
  var res2 = ffa.results();
  t.ok(res2, "got results 2");

  var verifyAfter8 = function (p) {
    if ([9, 10, 11, 12].indexOf(p.seed) >= 0) {
      t.equal(p.pos, 9, '9-12th got 3rd in their matches (knocked out)');
      t.equal(p.wins, 0, 'no wins for 9-12th');
    }
    else if (p.seed > 12) {
      t.equal(p.pos, 13, '13-16th got 4th in their matches (knocked out)');
      t.equal(p.wins, 0, 'no wins for 13-16th');
    }
  };

  res2.forEach(function (p) {
    if ([1, 2, 3, 4].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "top 4 seeds won their matches (progressed)");
      t.equal(p.pos, 8, "top 8 advances and should be positioned to tie at 8th");
    }
    else if ([5, 6, 7, 8].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "5-8th seed got 2nd in their matches (progressed)");
      t.equal(p.pos, 8, "top 8 advances and should tie at 8th");
    }
    verifyAfter8(p);
  });

  // check that top 8 have an upcoming match in round 2, and rest are out
  $.range(16).forEach(function (n) {
    var up = ffa.upcoming(n);
    if (n <= 8) {
      t.ok(up.length, "upcoming match for " + n + " exists");
      t.equal(up[0].id.r, 2, "upcoming match for " + n + " exists in r2");
      t.ok(up[0].id.m, "upcoming match for " + n + " is fully filled in!");
    }
    else {
      t.equal(up.length, 0, "no upcoming r2 match for knocked out p" + n);
    }
  });

  // score r2
  $.range(2).forEach(function (m) {
    t.equal(ffa.unscorable({s: 1, r: 2, m: m}, [4,3,2,1]), null, "semi scorable");
    ffa.score({s: 1, r: 2, m: m}, [4, 3, 2, 1]);
  });

    // verify snd round filled in
  t.deepEqual(ffa.players({r:3}), $.range(4), "r3 players are winners of r2");

  var res3 = ffa.results();
  t.ok(res3, "got results 3");

  res3.forEach(function (p) {
    if ([1, 2, 3, 4].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 2, "top 4 seeds progressed from both their matches");
      t.equal(p.pos, 4, "top 4 advanced to r3 and start out tieing at final 4th");
    }
    else if ([5, 6, 7, 8].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "5-8th got 2nd and 3rd/4th (progressed once)");
      t.ok(4 < p.pos && p.pos <= 8, "between sort of bottom half top eight");
    }
    verifyAfter8(p);
  });

  // check that top 4 have an upcoming match in round 3, and rest are out
  $.range(16).forEach(function (n) {
    var up = ffa.upcoming(n);
    if (n <= 4) {
      t.ok(up.length, "upcoming match for " + n + " exists");
      t.equal(up[0].id.r, 3, "upcoming match for " + n + " exists in r3");
      t.ok(up[0].id.m, "upcoming match for " + n + " is fully filled in!");
    }
    else {
      t.equal(up.length, 0, "no upcoming r3 match for knocked out p" + n);
    }
  });

  // score final
  t.equal(ffa.unscorable({s: 1, r: 3, m: 1}, [4,3,2,1]), null, "final scorable");
  ffa.score({s: 1, r: 3, m: 1}, [4, 3, 2, 1]);
  var res4 = ffa.results();
  t.ok(res4, "got results 4");


  res4.forEach(function (p) {
    if (p.seed === 1) {
      //t.equal(p.wins, 9, "1 won all 3 matches");
      t.equal(p.pos, 1, "1 placed highest");
      t.equal(p.for, 12, "scores for 1: 4 + 4 + 4");
    }
    else if (p.seed === 2) {
      //t.equal(p.wins, 8, "2 scored 1, 1, 2");
      t.equal(p.pos, 2, "2 placed 2nd");
      t.equal(p.for, 11, "scores for 2: 4 + 4 + 3");
    }
    else if (p.seed === 3) {
      //t.equal(p.wins, 6, "3 scored 1, 2, 3");
      t.equal(p.pos, 3, "3 placed 3rd");
      t.equal(p.for, 9, "scores for 3: 4 + 3 + 2");
    }
    else if (p.seed === 4) {
      //t.equal(p.wins, 5, "4 scored 1 2 4");
      t.equal(p.pos, 4, "4 placed 4th");
      t.equal(p.for, 8, "scores for 2: 4 + 3 + 1");
    }

    // older results remain unaffected
    else if ([5, 6, 7, 8].indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "5-8th progressed from one match only");
      t.ok(4 < p.pos && p.pos <= 8, "between sort of bottom half top eight");
    }
    verifyAfter8(p);
  });

  // check that no upcoming matches now that final is scored
  $.range(16).forEach(function (n) {
    var up = ffa.upcoming(n);
    t.ok(!up.length, "no upcoming match after final for player " + n);
  });

  gs.forEach(function (m) {
    t.ok(ffa.unscorable(m.id, [4,3,2,1]), "cant score anything after final is done");
  });

  t.done();
};


// full test of a 81 3 1 ffa tournament
exports.resultsPowersOfThree = function (t) {
  var opts = { sizes: [3, 3, 3, 3], advancers: [1, 1, 1] };
  var ffa = new FFA(81, opts)
    , gs = ffa.matches;

  t.equal(gs.length, 27 + 9 + 3 + 1, "ffa right number of matches");

  // ffaResults init tests
  var res = ffa.results();
  t.equal(res.length, 81, "all players had stats computed before scoring");

  var poss = $.nub($.pluck('pos', res));
  t.equal(poss.length, 1, "all players have same score");
  t.equal(poss[0], 81, "tied at 81");

  var winss = $.nub($.pluck('wins', res));
  t.equal(winss.length, 1, "all players have same wins");
  t.equal(winss[0], 0, "all won 0");

  var sums = $.nub($.pluck('for', res));
  t.equal(sums.length, 1, "all players have same sum");
  t.equal(sums[0], 0, "all sum 0");

  var seedss = $.nub($.pluck('seed', res));
  t.equal(seedss.length, 81, "all different seeds represented");
  t.deepEqual(seedss.sort($.compare()), $.range(81), "should be all 81");

  // check that all players have an upcoming match in round 1
  $.range(81).forEach(function (n) {
    var up = ffa.upcoming(n);
    t.ok(up.length, "upcoming match for " + n + " exists");
    t.equal(up[0].id.r, 1, "upcoming match for " + n + " exists in r1");
    t.ok(up[0].id.m, "upcoming match for " + n + " is fully filled in!");
  });

  // now score the first round
  $.range(27).forEach(function (m) {
    t.equal(ffa.unscorable({s: 1, r: 1, m: m}, [3,2,1]), null, "scorable R1M" + m);
    ffa.score({s: 1, r: 1, m: m}, [3, 2, 1]); // in the order of their seeds
  });

  // verify snd round filled in
  t.deepEqual(ffa.players({r:2}), $.range(27), "r2 players are winners of r1");

  // check r2 stats computed correctly
  var res2 = ffa.results();
  t.ok(res2, "got results 2");

  var verifyAfter27 = function (p) {
    if ($.range(28, 54).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 0, "2nd placers win nothing");
      t.equal(p.pos, 28, p.seed + " ties at 28 with all 2nd placers");
    }
    else if (p.seed > 54) {
      t.equal(p.wins, 0, "3rd placers win nothing");
      t.equal(p.pos, 55, p.seed + " ties at 55 with all 3rd placers");
    }
  };

  res2.forEach(function (p) {
    if ($.range(27).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "top 27 seeds won their matches (progressed)");
      t.equal(p.pos, 27, "top 27 advances and should be positioned to tie at 27");
    }
    verifyAfter27(p);
  });

  // check that top 27 have an upcoming match in round 2, and rest are out
  $.range(81).forEach(function (n) {
    var up = ffa.upcoming(n);
    if (n <= 27) {
      t.ok(up.length, "upcoming match for " + n + " exists");
      t.equal(up[0].id.r, 2, "upcoming match for " + n + " exists in r2");
      t.ok(up[0].id.m, "upcoming match for " + n + " is fully filled in!");
    }
    else {
      t.equal(up.length, 0, "no upcoming r2 match for knocked out p" + n);
    }
  });

  // score r2
  $.range(9).forEach(function (m) {
    t.equal(ffa.unscorable({s: 1, r: 2, m: m}, [3,2,1]), null, "scorable R2M" + m);
    ffa.score({s: 1, r: 2, m: m}, [3, 2, 1]);
  });

  // verify snd round filled in
  t.deepEqual(ffa.players({r:3}), $.range(9), "r3 players are winners of r2");

  var res3 = ffa.results();
  t.ok(res3, "got results 3");

  var verifyAfter9 = function (p) {
    if ($.range(10, 18).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "10-18 seed got 1st then 2nd");
      t.equal(p.pos, 10, p.seed + " pos tied after shared 2nd");
    }
    else if ($.range(19, 27).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 1, "19-27 seed got 1st then 3rd");
      t.equal(p.pos, 19, p.seed + " pos tied after shared 3rd");
    }
    verifyAfter27(p);
  };

  res3.forEach(function (p) {
    if ($.range(9).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 2, "top 9 seeds won their matches twice (progressed twice)");
      t.equal(p.pos, 9, "top 9 advances and should be positioned to tie at 9th");
    }
    verifyAfter9(p);
  });

  $.range(81).forEach(function (n) {
    var up = ffa.upcoming(n);
    if (n <= 9) {
      t.ok(up.length, "upcoming match for " + n + " exists");
      t.equal(up[0].id.r, 3, "upcoming match for " + n + " exists in r3");
      t.ok(up[0].id.m, "upcoming match for " + n + " is fully filled in!");
    }
    else {
      t.equal(up.length, 0, "no upcoming r3 match for knocked out p" + n);
    }
  });

  // score r3
  $.range(3).forEach(function (m) {
    t.equal(ffa.unscorable({s: 1, r: 3, m: m}, [3,2,1]), null, "scorable R3M" + m);
    ffa.score({s: 1, r: 3, m: m}, [3, 2, 1]);
  });

  // verify next round filled in
  t.deepEqual(ffa.players({r:4}), $.range(3), "r4 players are winners of r3");

  var res4 = ffa.results();
  t.ok(res4, "got results 4");

  var verifyAfter3 = function (p) {
    if ($.range(4, 6).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 2, "4-6 seeds won twice then 2nd");
      t.equal(p.pos, 4, p.seed + " pos tied after shared 2nd");
    }
    else if ($.range(7, 9).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 2, "4-6 seeds won twice then 3rd");
      t.equal(p.pos, 7, p.seed + " pos tied after shared 3rd");
    }
    verifyAfter9(p);
  };

  res4.forEach(function (p) {
    if ($.range(3).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 3, "top3 seeds won all their matches (beat 3x2)");
      t.equal(p.pos, 3, "top 3 advances and should be positioned to tie at 3th");
    }
    // these should stay the same
    verifyAfter3(p);
  });


  // check that top 27 have an upcoming match in round 2, and rest are out
  $.range(81).forEach(function (n) {
    var up = ffa.upcoming(n);
    if (n <= 3) {
      t.ok(up.length, "upcoming match for " + n + " exists");
      t.equal(up[0].id.r, 4, "upcoming match for " + n + " exists in r4");
      t.ok(up[0].id.m, "upcoming match for " + n + " is fully filled in!");
    }
    else {
      t.equal(up.length, 0, "no r4 match for knocked out p" + n);
    }
  });

  // score gf
  t.equal(ffa.unscorable({s: 1, r: 4, m: 1}, [3,2,1]), null, "gf scorable");
  ffa.score({s: 1, r: 4, m: 1}, [3, 2, 1]);

  t.deepEqual(ffa.findMatches({r:5}), [], "r5 should not exist");

  var res5 = ffa.results();
  t.ok(res5, "got results 5");

  res5.forEach(function (p) {
    if (p.seed === 1) {
      t.equal(p.wins, 4, "seed 1 won all their matches 4x1st");
      t.equal(p.pos, 1, "seed 1 won and should be 1st");
    }
    else if ($.range(2, 3).indexOf(p.seed) >= 0) {
      t.equal(p.wins, 3, "2-3 came 1st,1st,1st, then 2nd/3rd");
      t.equal(p.pos, p.seed, p.seed + " came " + p.pos);
    }
    else if (p.seed === 3) {
      t.equal(p.wins, 3, "seed 3 came 1st,1st,1st,3rd");
      t.equal(p.pos, 3, "seed 3 came 3rd");
    }
    verifyAfter3(p);
  });

  $.range(81).forEach(function (n) {
    var up = ffa.upcoming(n);
    t.equal(up.length, 0, "tournament over, no no upcoming match for p" + n);
  });

  t.done();
};
