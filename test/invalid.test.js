var FFA = require('../');
var test = require('bandage');

test('invalidsThrow', function *(t) {
  var reason = 'number of players must be at least 2';
  var ctorTry = function *() {
    return new FFA(1);
  };
  var reg = new RegExp('Cannot construct FFA: ' + reason);
  t.throws(ctorTry, reg, 'reason in error.message')
  t.eq(FFA.invalid(1), reason, '.invalid returns reason');
});

test('invalidSanity', function *(t) {
  t.eq(null, FFA.invalid(2, { sizes: null }), 'non-array sizes forces default');
  var emptySizes = FFA.invalid(2, { sizes: [] });
  t.eq(emptySizes, 'sizes must be a non-empty array of integers', 'sizes empty');

  t.eq(null, FFA.invalid(2, { advancers: null}), 'non-array adv forces default');
  t.eq(null, FFA.invalid(2, { advancers: []}), 'empty adv ok');

  var advLen = FFA.invalid(8, { sizes: [4, 4] });
  t.eq(advLen, 'advancers must be a sizes.length-1 length array of integers', 'adv');
  t.eq(null, FFA.invalid(8, { sizes: [4, 4], advancers: [2] }), 'correct adv ok');
});

test('invalidFinal', function *(t) {
  var singleLeft = FFA.invalid(8, { sizes: [8, 1], advancers: [1] });
  t.eq(singleLeft, 'final round must contain at least 2 players', 'cant leave one');

  t.eq(null, FFA.invalid(8, { sizes: [8, 2], advancers: [2] }), 'can leave two in final');

  var limitMin = FFA.invalid(8, { sizes: [8], limit: 8 });
  t.eq(limitMin, 'final round limit must be less than the remaining number of players', 'limit exceeding');

  t.eq(null, FFA.invalid(8, { sizes: [8], limit: 7 }), 'limit within');

  var limitDivide = FFA.invalid(8, { sizes: [4], limit: 7 });
  t.eq(limitDivide, 'final round number of matches must divide limit', 'limit not dividing');

  t.eq(null, FFA.invalid(8, { sizes: [4], limit: 6 }), 'limit divides');
  t.eq(null, FFA.invalid(8, { sizes: [4], limit: 2 }), 'limit can be two');
});

test('invalidRound', function *(t) {
  t.eq(null, FFA.invalid(4, { sizes: [2, 2], advancers: [1] }), 'duel style allowed');

  // hard to trigger: you need to pretend that it's another round after a <2p rnd
  var toFew = FFA.invalid(8, { sizes: [8, 2, 2], advancers: [1, 1] });
  t.eq(toFew, 'round 2 needs at least 2 players', 'players left in round');

  // sensible restriction - checked for when only one match misses out on eliminating
  var mustElim1 = FFA.invalid(8, { sizes: [3, 6], advancers: [2] });
  t.eq(mustElim1, 'round 1 must advance less than the smallest match size', 'must eliminate unfilled');

  // trivial case
  var mustElim2 = FFA.invalid(8, { sizes: [8, 2, 2], advancers: [2, 0] });
  t.eq(mustElim2, 'round 2 must eliminate players each match', 'must eliminate filled');

  var bigAdv = FFA.invalid(8, { sizes : [4, 5], advancers: [5] });
  t.eq(bigAdv, 'round 1 must advance less than the group size', 'adv < group size');

  // can't have noop rounds
  var minTwo = FFA.invalid(4, { sizes: [1, 2], advancers: [1] });
  t.eq(minTwo, 'round 1 group size must be at least 2', 'no noop rounds');

  // cannot have grs > np in rounds anymore:
  var opts = { sizes: [5, 14, 2], advancers: [3, 2] };
  var largeGs = FFA.invalid(15, opts);
  t.eq(largeGs, null, 'large group sizes allowed');
  var f = FFA(15, opts);
  var r2m = f.findMatches({ r: 2 })[0];
  t.eq(r2m.p.length, 9, 'large group sizes reduced');
  t.eq(f.sizes, opts.sizes, 'sizes still reflect what was passed in');
});
