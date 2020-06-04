import { expect } from 'chai';
import { Checkers } from '../src/checkers';
import BN from 'bn.js';

describe('Checkers', () => {
  const casesExp = [new BN(1e2), new BN(1e3), new BN(1e14), new BN(8e5)];
  const casesExpFalse = [new BN(1e1), new BN(5), new BN(10004)];
  const casesSeq = [new BN('12'), new BN('123456')];
  const casesSeqFalse = [new BN('1'), new BN('1237'), new BN('1234576'), new BN('12345678910')];
  const casesSame = [new BN('11'), new BN('9999999999999999')];
  const casesSameFalse = [new BN('5'), new BN('112'), new BN('9999989999999999')];
  const cases11th = [new BN('11'), new BN('22'), new BN('121')];
  const cases11thFalse = [new BN('0'), new BN('1'), new BN('5'), new BN('11211')];
  const cases0thFalse = [new BN('0'), new BN('1'), new BN('10')];

  const all = []
    .concat(casesExp)
    .concat(casesSeq)
    .concat(casesSame)
    .concat(cases11th);

  const allFalse = []
    .concat(casesExpFalse)
    .concat(casesSeqFalse)
    .concat(casesSameFalse)
    .concat(cases11thFalse)
    .concat(cases0thFalse);

  describe('checkerExp', () => {
    casesExp.forEach((test) => {
      it(`Should run checkerExp(${test}) and return true`, () => {
        expect(Checkers.checkerExp(test)).to.be.true;
      });
    });

    casesExpFalse.forEach((test) => {
      it(`Should run checkerExp(${test}) and return false`, () => {
        expect(Checkers.checkerExp(test)).to.be.false;
      });
    });
  });

  describe('checkerSeq', () => {
    casesSeq.forEach((test) => {
      it(`Should run checkerSeq(${test}) and return true`, () => {
        expect(Checkers.checkerSeq(test)).to.be.true;
      });
    });

    casesSeqFalse.forEach((test) => {
      it(`Should run checkerSeq(${test}) and return false`, () => {
        expect(Checkers.checkerSeq(test)).to.be.false;
      });
    });
  });

  describe('checkerSame', () => {
    casesSame.forEach((test) => {
      it(`Should run checkerSame(${test}) and return true`, () => {
        expect(Checkers.checkerSame(test)).to.be.true;
      });
    });

    casesSameFalse.forEach((test) => {
      it(`Should run checkerSame(${test}) and return false`, () => {
        expect(Checkers.checkerSame(test)).to.be.false;
      });
    });
  });

  describe('checkerSame', () => {
    all.forEach((test) => {
      it(`Should run checker(${test}) and return true`, () => {
        expect(Checkers.check(test, 11)).to.be.true;
      });
    });

    allFalse.forEach((test) => {
      it(`Should run checker(${test}) and return false`, () => {
        expect(Checkers.check(test, 11)).to.be.false;
      });
    });

    allFalse.forEach((test) => {
      it(`Should run checker(${test}) and return false`, () => {
        expect(Checkers.check(test, 0)).to.be.false;
      });
    });
  });

  describe('Checkers Nth', () => {
    cases11th.forEach((test) => {
      it(`Should run checkerNth(${test}, 11) and return true`, () => {
        expect(Checkers.checkerNth(test, 11)).to.be.true;
      });
    });

    cases11thFalse.forEach((test) => {
      it(`Should run checkerNth(${test}, 11) and return false`, () => {
        expect(Checkers.checkerNth(test, 11)).to.be.false;
      });
    });

    it('Should run checkerNth(2, 1) and return true', () => {
      expect(Checkers.checkerNth(new BN(2), 1)).to.be.true;
    });

    it('Should run checkerNth(2, 0) and return false', () => {
      expect(Checkers.checkerNth(new BN(2), 0)).to.be.false;
    });

    it('Should return the list of checker functions by name', () => {
      expect(Checkers.checkerNth(new BN(2), 0)).to.be.false;
    });

    it('Should not wish blocktday for some blocks', () => {
      expect(Checkers.checkerNth(new BN(0), 0)).to.be.false;
      expect(Checkers.checkerNth(new BN(1), 0)).to.be.false;
      expect(Checkers.checkerNth(new BN(10), 0)).to.be.false;
      expect(Checkers.checkerNth(new BN(20), 0)).to.be.false;
    });
  });
});
