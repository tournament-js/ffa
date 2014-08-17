0.7.0 / 2014-08-17
==================
  * Relaxed rules for number of players in a match (always allow 2 player matches now)
  * `.invalid` returns better messages

0.6.1 / 2014-07-25
==================
  * Documentation and coverage release

0.6.0 / 2013-12-23
==================
  * Updated `tournament` to 0.21.0 so that `FFA` is an `EventEmitter`

0.5.0 / 2013-11-13
==================
  * Limitless tournament no longer needs a single final
  * TieBreaker supported
  * Can use FFA as a different type of preliminary GroupStage with this
  * `results[i].wins` now accounts for ties properly (bug)
  * `results[i].against` exists and counts sum(difference with winner)
  * `results[i].gpos` exists on final rounders for TieBreaker analysis

0.4.3 / 2013-11-06
==================
  * Interface with tournament@0.20.0 for cleaner results implementation

0.4.1 / 2013-11-02
==================
  * Interface with tournament@0.19.0 for multi stage support

0.4.0 / 2013-10-31
==================
  * `sizes` and `advancers` now passed in as optional arguments
  * Use tournament@0.18.0 interface

0.3.0 / 2013-10-25
==================
  * Using tournament@0.17.0 for better stats interface
  * Rename `sum` to `for` for tournament consistency (maybe add against in future)

0.2.1 / 2013-10-24
==================
  * Use group@0.1.0 for group algorithms

0.2.0 / 2013-10-22
==================
  * Use tournament@0.16.0 interface

0.1.1 / 2013-10-16
==================
  * refactor `score` to use Base implementation

0.1.0 / 2013-10-15
==================
  * first release - factored out of tournament 0.14.0
