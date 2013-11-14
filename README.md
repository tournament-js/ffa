# FFA elimination tournaments
[![Build Status](https://secure.travis-ci.org/clux/ffa.png)](http://travis-ci.org/clux/ffa)
[![Dependency Status](https://david-dm.org/clux/ffa.png)](https://david-dm.org/clux/ffa)

    Stability: 2 - Unstable

## Overview
FFA is a very general tournament building block that you can take in many directions (only a few of which are commonly explored).
The result always consists of FFA matches; matches that expect multiple players/teams competing at once in a free for all, and these matches are bracketed like an elimination tournament. Beyond that, however, you have free reigns. Match sizes can vary from round to round, you can define an end round that has multiple matches, and you can have every remaining player in one match for some or all rounds. Endless possibilities.

## Construction
You must specify precisely the required group size for each round and how many to advance.
This is really the hardest part of an FFA elimination. There are essentially endless possibilities, and we will allow very exotic and adventurous ones as long as they are at least playable and non-trivial. See the [Ensuring Constructibility](https://github.com/clux/tournament/blob/master/doc/base.md#ensuring-constructibility) section for how to check your parameters.

```js
// 8 players in 1 match of 8
var ffa = new FFA(8);

// 16 players in matches of 4 each round, top 2 advances between each
var ffa = new FFA(16, { sizes: [4, 4, 4], advancers: [2, 2] });

// 15 players in groups of 5, limited so that the top 2 from each match can be picked
var ffa = new FFA(15, { sizes: [5], limit: 6 });

// 32 player groupstage replacement - 4 matches of size 8
var ffa = new FFA(32, { sizes: [8] }); // may have to tiebreak without limits

// knockout style tournament - one match per round - knock out 2 each round
var ffa = new FFA(8, { sizes: [8, 6, 4], advancers: [6, 4] })
```

Note that the last example is so common it has been created as a subclass in [masters](https://npmjs.org/package/masters). Subclassing is easy, and if you find yourself reusing certain patters, you should create one after reading the [tournament implementors guide](https://github.com/clux/tournament/blob/master/doc/implementors.md).

## Limits
To pipe the top `n` players into another tournament set `limit` to `n` in the options argument.

This will cause an additional scoring ambiguity limitat on the final round for the scores be disambiguate the top limit players with the top (limit+1)th player. Read about the [ambiguity restriction](#ambiguity-restriction).

The 15 player example above will allow two players at tied 1st, but not allow two players in 2nd or three players in 1st.

## Match Ids
Like all tournament types, matches have an `id` object that contains three values all in `{1, 2, ...}`:

```js
{
  s: Number, // the bracket - always 1 at the moment - only winners bracket supported
  r: Number, // the round number in the current bracket
  m: Number  // the match number in the current bracket and round
}
```

## Finding matches
All the normal [base class methods](hhttps://github.com/clux/tournament/blob/master/doc/base.md) exist on a `FFA` instance. Some notable examples follow:

```js
var r1 = ffa.findMatches({ r: 1 });
var firstRounds = ffa.findMatchesRanged({}, { r: 2 });
var upcomingForSeed1 = ffa.upcoming(1);
var matchesForSeed1 = ffa.matchesFor(1);
```

## Scoring Matches
Call `ffa.score(id, [player0Score, player1Score, ...])` as for every match played.
The `ffa.unscorable(id, scoreArray)` will tell you whether the score is valid. Read the entry in the [tournament commonalities doc](https://github.com/clux/tournament/blob/master/doc/base.md#ensuring-scorability--consistency). In addition to the normal scoring restrictions there is an additional one for `FFA`:

### Ambiguity restriction
Individual ties are only allowed as long as we can discriminate between the last advancer and the first non-advancers. If these two scores are identical, the ambiguity is disallowed and `.score()` will return false (equivalently `unscorable()` will tell you this).

Note that this is artificial, and if you have no way of enforcing this, you will have to manually adjust the match score to account for ties. `FFA` will not allow you to enter ambiguous scores at the limit point.

## Checking results
Results are updated after every match, and player positions are always the worst projection based on how far they have gotten.

```js
var ffa = new FFA(8, { sizes: [4, 4], advancers: [2] });
ffa.matches.forEach(function (m) {
  ffa.score(m.id, [4,3,2,1]); // score in order of seeds
});
ffa.results();
[ { seed: 1, wins: 2, for: 8, against: 0, pos: 1, gpos: 1 },
  { seed: 2, wins: 1, for: 7, against: 1, pos: 2, gpos: 2 },
  { seed: 3, wins: 1, for: 5, against: 3, pos: 3, gpos: 3 },
  { seed: 4, wins: 1, for: 4, against: 4, pos: 4, gpos: 4 },
  { seed: 5, wins: 0, for: 2, against: 2, pos: 5 },
  { seed: 6, wins: 0, for: 2, against: 2, pos: 5 },
  { seed: 7, wins: 0, for: 1, against: 3, pos: 7 },
  { seed: 8, wins: 0, for: 1, against: 3, pos: 7 } ]
```

A few peculiarities you may want to know about scores:

- The 3rd placers and 4th placers in the round one matches are tied between matches (would have happened even if they had different `for` scores)
- Because we sat no limit on the last rounds match, there was only one winner of the second match (whereas normally winners are said to be the ones advancing)
- The `against` is the sum of the (difference of your score the top score) in each match
- The `gpos` is the position in the last match (which is necessary for tiebreaking if there is more than one final round match)

## Upcoming
Unlike the normal implementation of `inst.upcoming(seedNumber)`, `FFA` does extra work:

If the current round has not been fully completed yet, then `ffa.upcoming(seed)` may return a partial id, like `{r: 4}` missing a game number, as each round creates new seeds for a fair new round based on previous performance, and thus all the game results from this round are needed to determine a player's next game number. Note that such an id can still be represented via the `.idString()` function.

## More
For more information, note that `FFA` is a very standard [tournament](https://npmjs.org/package/tournament) subclass.
Read [base class API](hhttps://github.com/clux/tournament/blob/master/doc/base.md) for usage tips and tricks.

## License
MIT-Licensed. See LICENSE file for details.
