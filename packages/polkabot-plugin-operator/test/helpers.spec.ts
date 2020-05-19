import { expect } from 'chai';
import { isHelpNeeded } from '../src/helpers';

describe('Operator Helpers', () => {
    const tests = [
        { msg: 'help', expectation: true },
        { msg: 'help me !', expectation: true },
        { msg: 'can you help', expectation: true },
        { msg: 'can you help me', expectation: true },
        { msg: 'help!!!', expectation: true },
        { msg: ' help', expectation: true },
    ]

    tests.forEach((test) => {
        it('Should detect help request in: ' +  test.msg, () => {
            tests.map(t => {
                expect(isHelpNeeded(t.msg)).to.equal(t.expectation)
            })
        });
    })
});
