var $ = require('interlude')
 , FFA = require(process.env.FFA_COV ? '../ffa-cov.js' : '../');

exports.FFAtoFFA = function (t) {
  var f1 = new FFA(16);
  var m1 = f1.matches[0];
  f1.score(m1.id, $.range(16));
  var top8 = $.pluck('seed', f1.results().slice(0, 8));
  t.deepEqual(top8, [16,15,14,13,12,11,10,9], "winners are bottom 8 seeds");

  var f2 = FFA.from(f1, 8, { sizes: [4, 4], advancers: [2] });
  t.equal(f2.matches.length, 2+1, "3 matches f2");
  t.deepEqual(f2.players(), [9,10,11,12,13,14,15,16], "advancers from f1");
  // and in fact the seeds map on to who won in d1 (top8 below)
  // group(8,4) gives [ [ 1, 3, 6, 8 ], [ 2, 4, 5, 7 ] ]

  t.deepEqual(f2.matches[0].p, [16,14,11,9], "1,3,6,8 m1");
  t.deepEqual(f2.matches[1].p, [15,13,12,10], "2,4,5,7 in m2");

  f2.matches.forEach(function (m) {
    f2.score(m.id, [4,3,2,1]); // score by seed this time
  });
  // since 1st and 2nd placers are tied between matches, they are sorted
  // between by seed - hence top 4 === 15,16,13,14
  t.deepEqual(f2.matches[2].p, [15,16,13,14], '(2,1),(4,3) in m3');

  var top4 = $.pluck('seed', f2.results().slice(0, 4));
  t.deepEqual(top4, [15,16,13,14], "winners top 4 seeds in f2");

  var f3 = FFA.from(f2, 4);
  t.deepEqual(f3.players(), [13,14,15,16], "top 4 progressed to f3");

  t.done();
};
