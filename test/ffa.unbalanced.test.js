var tap = require('tap')
  , test = tap.test
  , $ = require('interlude')
  , FFA = require('../');

var makeStr = function(r) {
  var str = r.pos + " P" + r.seed + " W=" + r.wins;
  str += " F=" + r.for + " A=" + r.against;
  return str;
};

test("15 [4, 4], [2] (unbalanced unfinished)", function (t) {
  var ffa = new FFA(15, { sizes: [4, 4], advancers: [2] });
  var fm = ffa.matches;

  t.deepEqual(fm[0].p, [1, 5, 12], 'R1M1.p');
  t.notEqual(ffa.score(fm[0].id, [4,3,3]), null, "can't tie at adv");
  t.notEqual(ffa.score(fm[0].id, [4,4,2]), null, "can tie outside adv");
  t.deepEqual(fm[1].p, [2, 6, 11, 15], 'R1M2.p');
  t.notEqual(ffa.score(fm[1].id, [4, 3, 3, 1]), null, "can't tie at adv");
  t.notEqual(ffa.score(fm[1].id, [3, 3, 2, 2]), null, "can tie outside adv");
  t.deepEqual(fm[2].p, [3, 7, 10, 14], 'R1M3.p');
  t.notEqual(ffa.score(fm[2].id, [4, 3, 3, 1]), null, "can't tie at adv");
  t.notEqual(ffa.score(fm[2].id, [3, 3, 2, 2]), null, "can tie outside adv");
  t.deepEqual(fm[3].p, [4, 8, 9, 13], 'R1M4.p');
  t.notEqual(ffa.score(fm[3].id, [4, 3, 3, 1]), null, "can't tie at adv");
  t.notEqual(ffa.score(fm[3].id, [3, 3, 2, 1]), null, "can tie outside adv");

  var res = ffa.results();
  var koR1 = [
    "9 P9 W=0 F=2 A=1",
    "9 P10 W=0 F=2 A=1",
    "9 P11 W=0 F=2 A=1",
    "9 P14 W=0 F=2 A=1",
    "9 P15 W=0 F=2 A=1",
    "9 P12 W=0 F=2 A=2", // below 15 because score diff
    // the only guy that didn't tie with 3rd place
    "15 P13 W=0 F=1 A=2"
  ];
  t.deepEqual(res.map(makeStr), [
      // 1, 5 tied for first in R1M1
      "8 P1 W=1 F=4 A=0",
      "8 P5 W=1 F=4 A=0",
      // 2, 3 and 4 tied with 6, 7 and 8 resp for first in R1MX x>1
      "8 P2 W=1 F=3 A=0",
      "8 P3 W=1 F=3 A=0",
      "8 P4 W=1 F=3 A=0",
      "8 P6 W=1 F=3 A=0",
      "8 P7 W=1 F=3 A=0",
      "8 P8 W=1 F=3 A=0",
    ].concat(koR1), 'r1 results');

  t.deepEqual(fm[4].p, [1, 2, 6, 8]);
  t.deepEqual(fm[5].p, [5, 3, 4, 7]); // ordered because reseeded

  // should be able to score these however I want now..
  // so score it in an ugly special case - double three wya ties
  t.ok(ffa.score(fm[4].id, [4,4,4,1]), 'score final 1');
  t.ok(ffa.score(fm[5].id, [4,3,3,3]), 'score final 2');
  t.ok(ffa.isDone(), 'ffa done');

  var res2 = ffa.results();
  t.deepEqual(res2.map(makeStr), [
      // 1st placers
      "1 P1 W=2 F=8 A=0",
      "1 P5 W=2 F=8 A=0",
      "1 P2 W=2 F=7 A=0",
      "1 P6 W=2 F=7 A=0",
      // 2nd placers (perhaps unfairly all get 5th)
      "5 P3 W=1 F=6 A=1",
      "5 P4 W=1 F=6 A=1",
      "5 P7 W=1 F=6 A=1",
      // 4th placers
      "8 P8 W=1 F=4 A=3",
    ].concat(koR1), 'r2 results'
  );

  t.deepEqual(ffa.rawPositions(res2), [
      [ [1, 2, 6], [], [], [8] ],
      [ [5], [3, 4, 7], [], [] ]
    ], 'posAry for ffa'
  );

  t.end();
});
