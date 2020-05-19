import { expect } from 'chai';
import { Callable, Command } from '../src/decorators';
import { PluginCommand } from 'polkabot-api/src/plugin.interface';
import { CallableMetas } from 'polkabot-api/src/types';

@Callable({ name: 'Foo', alias: 'bar' })
class TestClass1 {
    static meta: CallableMetas;
    static commands: PluginCommand[] = [];

    @Command()
    cmdTest() { }
}

@Callable()
class TestClass2 {
    static meta: CallableMetas;
    static commands: PluginCommand[] = [];

    @Command()
    cmdTest() { }
}

describe('Decorators', () => {
    it('TestClass1', () => {
        expect(TestClass1.meta.alias).not.to.be.undefined
        expect(TestClass1.meta.name).to.eql('Foo')
        expect(TestClass1.meta.alias).to.eql('bar')
    });

    it('TestClass2', () => {
        expect(TestClass2.meta.alias).not.to.be.undefined
        expect(TestClass2.meta.name).to.eql('TestClass2')
        expect(TestClass2.meta.alias).to.eql('testclass2')
    });
});
