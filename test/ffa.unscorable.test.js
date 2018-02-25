var $ = require('interlude')
 , FFA = require('../')
 , test = require('bandage');

test('history', function *(t) {
  var ffa = new FFA(16, { sizes: [4, 4, 4], advancers: [2, 2] });

  // initial unscorable check
  ffa.findMatches({r: 1}).forEach(function (m) {
    t.eq(ffa.unscorable(m.id, [1,2,3,4]), null, 'scorable unplayed r1');
    t.ok(ffa.score(m.id, [1,2,3,4]), 'score unplayed r1');
  });
  t.eq(ffa.players({r: 2}), [9,10,11,12,13,14,15,16], 'bottom half won r1');

  // ok to change history before r2 has started
  ffa.findMatches({r: 1}).forEach(function (m) {
    t.eq(ffa.unscorable(m.id, [4,3,2,1]), null, 'scorable played r1');
    t.ok(ffa.score(m.id, [4,3,2,1]), 'score played r1');
  });
  t.eq(ffa.players({r: 2}), [1,2,3,4,5,6,7,8], 'top half won r1');

  // but not if it has started
  ffa.score({s: 1, r: 2, m: 1}, [1,2,3,4], 'score a match in r2');
  ffa.findMatches({r: 1}).forEach(function (m) {
    t.eq(ffa.unscorable(m.id, [1,2,3,4]),
      m.id + ' cannot be re-scored',
      'unscorable played r1'
    );
  });
  t.eq(ffa.players({r: 2}), [1,2,3,4,5,6,7,8], 'top half STILL won r1');

  // but can (re)score (first)rest of r2
  ffa.findMatches({r: 2}).forEach(function (m) {
    t.eq(ffa.unscorable(m.id, [4,3,2,1]), null, 'scorable semi-played r2');
    t.ok(ffa.score(m.id, [4,3,2,1]), 'score semi-played r2');
  });
  t.eq(ffa.players({r: 3}), [1,2,3,4], 'top half won r2');

  // score r3 now - can see this works
  var gf = { s: 1, r: 3, m: 1 };
  t.eq(ffa.unscorable(gf, [4,3,2,1]), null, 'scorable unplayed r3');
  t.ok(ffa.score(gf, [4,3,2,1]), 'score unplayed r3');

  // ensure nothing before r3 is scorable now
  ffa.findMatchesRanged({r: 1}, {r: 2}).forEach(function (m) {
    t.eq(ffa.unscorable(m.id, [1,2,3,4]),
      m.id + ' cannot be re-scored',
      'unscorable r1/r2 match when r3 played'
    );
  });
});

test('unambiguous', function *(t) {
  var ffa = new FFA(16, { sizes: [4, 4, 4], advancers: [2, 2] });
  var match = ffa.findMatch({s: 1, r: 1, m: 1})

  t.eq(
    ffa.unscorable(match.id, [0, 0, 0, 0]),
    'scores must unambiguous decide who advances',
    'all zeroes is ambiguous'
  );
  
  t.eq(
    ffa.unscorable(match.id, [0, 3, 0, 0]),
    'scores must unambiguous decide who advances',
    'different scores at advance border is ambiguous'
  );
  
  t.eq(
    ffa.unscorable(match.id, [0, 0, 3, 0]),
    'scores must unambiguous decide who advances',
    'different scores at advance border is ambiguous'
  );
  
  t.eq(
    ffa.unscorable(match.id, [0, 3, 3, 0]),
    null,
    'some identical scores but advancers are unambiguous'
  );
});
