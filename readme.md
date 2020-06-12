## Welcome !
Welcome to the API documentation of [[Polkabot]] and some of its main plugins.

## Plugins

[[Polkabot]] is the main orchestrator. By itself, it does not do much and requires plugins to do the job.

Any plugin extends directly or indirectly [[PolkabotPluginBase]]. You can find 3 categories of plugins:

- [[PolkabotWorker]]
- [[PolkabotNotifier]]
- [[PolkabotChatbot]] 

If you plan on writting a plugin, you may start by checking out one of the existing ones.

## Decorators

In order to simplify and make the code for plugins more concise, you may use some of the useful Decorators that are available:

- [[Callable]]
- [[Command]]
