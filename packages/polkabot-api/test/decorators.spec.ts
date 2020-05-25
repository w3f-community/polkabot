import { expect } from 'chai';
import { Callable, Command } from '../src/decorators';
import { Controllable } from '../src/types';

@Callable({ name: 'Foo', alias: 'bar' })
class TestClass1 {
  // static meta: CallableMetas;
  // static commands: PluginCommand[] = [];

  @Command()
  cmdTest(): void { return; }
}

@Callable()
class TestClass2 {
  // static meta: CallableMetas;
  // static commands: PluginCommand[] = [];

  @Command()
  cmdTest1(): void { return; }

  @Command()
  cmdTest2(): void { return; }

  @Command({ name: 'test' })
  sometest(): void { return; }
}

describe('Decorators', () => {
  it('TestClass1', () => {
    expect((TestClass1 as unknown as Controllable).metas.alias).not.to.be.undefined;
    expect((TestClass1 as unknown as Controllable).metas.name).to.eql('Foo');
    expect((TestClass1 as unknown as Controllable).metas.alias).to.eql('bar');
    expect((TestClass1 as unknown as Controllable).commands).to.be.lengthOf(1);
  });

  it('TestClass2', () => {
    expect((TestClass2 as unknown as Controllable).metas.alias).not.to.be.undefined;
    expect((TestClass2 as unknown as Controllable).metas.name).to.eql('TestClass2');
    expect((TestClass2 as unknown as Controllable).metas.alias).to.eql('testclass2');
    expect((TestClass2 as unknown as Controllable).commands).to.be.lengthOf(3);
  });
});
