import BN from 'bn.js';

export type checker = (n: BN, arg?: number | BN | BN[]) => boolean;

/**
 * This class contains static methods telling us whether a block
 * is worth a Blocthday wish. All the checks are combined in the
 * [[checker]] function.
 */
export class Checkers {
  /**
     * Returns true for 'plain' numbers suchas 10, 8000, 300, etc...
     */
  public static checkerExp: checker = (n: BN): boolean => {
    const s = n.toString(10);
    return s.length > 2 && new BN(s.substring(1)).eq(new BN(0));
  }

  /**
     * Returns true for sequence numbers starting with 1 such as
     * 123, 123456, etc... 
     */
  public static checkerSeq: checker = (n: BN): boolean => {
    const s = n.toString(10);
    if (s.substring(0, 1) !== '1') return false;
    let previous = 1;
    for (const str of s.split('')) {
      if (parseInt(str) !== previous++) return false;
    }
    return s.length > 1;
  }

  /**
     * Returns true for numbers with 2 or more digits where all
     * digits are the same. For instance: 1111, or 777
     */
  public static checkerSame: checker = (n: BN): boolean => {
    const s = n.toString(10);
    const ref = s.substring(0, 1);
    const pattern = `${ref}{${s.length}}`;
    const regexp = new RegExp(pattern, 'g');
    return s.length > 1 && regexp.test(s);
  }

  public static checkerSpecials: checker = (n: BN, specials: BN[]): boolean => {
    const res = specials.filter(s => n.eq(s));
    return res.length > 0;
  }

  /**
     * Check whether if matches block Nth.
     * For instance, for N=11, return true for block 11, 22, 33, ...
     */
  public static checkerNth: checker = (n: BN, nbBlocks: BN): boolean => {
    nbBlocks = new BN(nbBlocks);
    if (nbBlocks.eq(new BN(0))) return false;
    return (n.gt(new BN(0)) && n.mod(nbBlocks).toString(10) === '0');
  }

  public static checkers: checker[] = [
    Checkers.checkerExp,
    Checkers.checkerSeq,
    Checkers.checkerSame,
    Checkers.checkerNth,
  ]

  /**
     * This function runs the combined tests and returns true
     * if at least one checker did return true. It combines the checkers from the [[Checker]] class.
     */
  public static check: checker = (n: BN, nbBlocks: BN): boolean => {
    const tests = Checkers.checkers.map((c: checker) => {
      return c(n, nbBlocks);
    });
    return tests.filter(item => item === true).length >= 1;
  }
}