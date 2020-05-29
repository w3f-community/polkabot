import { expect } from 'chai';
import { Callable, Command } from '@polkabot/api/src/decorators';
import { Controllable } from '@polkabot/api/src';

@Callable()
class Foo {
  @Command()
  cmdFoo(): void { return; }
}

class Bar {

}

describe('Type helpers', () => {
  it('should be seen as Controllable', () => {
    expect((Foo as unknown as Controllable).isControllable).to.be.true;
  });

  it('should not be seen as Controllable', () => {
    expect((Bar as unknown as Controllable).isControllable).to.be.undefined;
  });
});
