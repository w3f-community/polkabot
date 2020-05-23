import { expect } from 'chai';
import { Callable, Command } from '../src/decorators';
import { CallableMetas, PluginCommand } from '../src/types';

@Callable({ name: 'Foo', alias: 'bar' })
class TestClass1 {
  static meta: CallableMetas;
  static commands: PluginCommand[] = [];

  @Command()
  cmdTest(): void { return; }
}

@Callable()
class TestClass2 {
  static meta: CallableMetas;
  static commands: PluginCommand[] = [];

  @Command()
  cmdTest1(): void { return; }

  @Command()
  cmdTest2(): void { return; }

  @Command({ name: 'test' })
  sometest(): void { return; }
}

describe('Decorators', () => {
  it('TestClass1', () => {
    expect(TestClass1.meta.alias).not.to.be.undefined;
    expect(TestClass1.meta.name).to.eql('Foo');
    expect(TestClass1.meta.alias).to.eql('bar');
    expect(TestClass1.commands).to.be.lengthOf(1);
  });

  it('TestClass2', () => {
    expect(TestClass2.meta.alias).not.to.be.undefined;
    expect(TestClass2.meta.name).to.eql('TestClass2');
    expect(TestClass2.meta.alias).to.eql('testclass2');
    expect(TestClass2.commands).to.be.lengthOf(3);
    // expect(TestClass1.getCommand('foo')).to.be.null
    // expect(TestClass1.getCommand('test1')).to.be.not.null
    // expect(TestClass1.getCommand('test2')).to.be.not.null
    // expect(TestClass1.getCommand('test')).to.be.not.null
  });
});
