import fs from 'node:fs';
import vm from 'node:vm';
const runtime = fs.readFileSync(new URL('../../extension/runtime.js', import.meta.url), 'utf8');
// Synthetic public contracts: no external client code is needed by the tests.
export function gameHarness(variant, fetchImpl) {
  class Command {
    constructor(...args) { this._arguments = args; this._state = 0; }
    getCommandName() { return 'control'; }
    getIsCntStop() { return false; }
    getState() { return this._state; }
    initialize() { this._state = 2; }
  }
  class CommandMessage extends Command { getCommandName() { return 'msg'; } initialize(root) { root.setMessage(...this._arguments); this._state = 2; } }
  class ExtensionCommandMessage extends CommandMessage {}
  class CommandName extends Command { getCommandName() { return 'name'; } initialize(root) { root.setName(this._arguments[0]); this._state = 2; } }
  class CommandSelect extends Command { getCommandName() { return 'select'; } getIsCntStop() { return true; } initialize(root) { root.setKeyValue('choice', '=', 0); root.setSelectThumbnails(this._arguments); this._state = 2; } }
  let data;
  const manager = {
    getAdvData: () => data,
    update(root) {
      for (let index = data.startCnt; index < data.commandList.length; index++) {
        const command = data.commandList[index];
        if (command.getState() === 0) {
          command.initialize(root);
          if (command.getCommandName() === 'msg') data.messageCommandList.push(command);
        }
        data.cnt = index;
        if (command.getIsCntStop()) break;
      }
    },
  };
  const originalUpdate = manager.update, fakeConstants = { ADV_COMMAND_NAME: { MESSAGE: 'msg', SELECT: 'select' } };
  const modules = { Command, CommandMessage, CommandName, CommandSelect, ExtensionCommandMessage, AdvManager: manager, AdvConstants: fakeConstants }, get = name => modules[name];
  const context = vm.createContext({ __require: get, fetch: fetchImpl, AbortController, setTimeout, clearTimeout, setInterval, clearInterval,
    COCOS_TRANSLATOR_CONFIG: { transport: 'test', lookahead: 0, timeoutMs: 100, syncSettings: false }, console });
  vm.runInContext(runtime, context);
  const displayed = [], root = { enabledInHierarchy: true, getPlayState: () => 2, getDebugSearchMessage: () => '', setMessage(tag, text) { displayed.push({ tag, text }); }, setName() {}, setKeyValue() {}, setSelectThumbnails() {} };
  const Message = variant === 'extended' ? ExtensionCommandMessage : CommandMessage, message = new Message(7, '<size=30>「大丈夫ですか？」</size>');
  const stop = { _state: 0, _arguments: ['UNCHANGED_CONTROL'], getCommandName: () => 'clickwait', getState() { return this._state; }, initialize() { this._state = 2; }, getIsCntStop: () => true };
  data = { initialized: true, commandList: [message, stop], startCnt: 0, cnt: 0, messageCommandList: [], movieCommand: null, processState: 0 };
  return { manager, originalUpdate, context, displayed, message, stop, data, root, get };
}
