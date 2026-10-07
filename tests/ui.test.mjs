import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
const runtime=readFileSync(new URL('../extension/runtime.js',import.meta.url),'utf8');
class Component{} class Label extends Component{} class RichText extends Component{} class EditBox extends Component{}
function node(name,parent=null){return{name,parent,activeInHierarchy:true,components:[],getComponents(){return this.components}}}
function label(text,parent=null,Type=Label){const n=node('label',parent);const l=new Type();Object.assign(l,{node:n,string:text,useSystemFont:false,font:{name:'original-font'},fontFamily:'original-family',enabledInHierarchy:true});n.components=[l];return l}
const sceneLabels=[];const requests=[];
const manager={getAdvData:()=>null,update(){}};
const context=vm.createContext({AbortController,setInterval,clearInterval,setTimeout,clearTimeout,
  __require:name=>name==='AdvManager'?manager:name==='AdvConstants'?{ADV_COMMAND_NAME:{MESSAGE:'msg',SELECT:'select'}}:null,
  cc:{Component,Label,RichText,EditBox,isValid:c=>!c.destroyed,js:{getClassName:c=>c.className||c.constructor.name},
    director:{getScene:()=>({getComponentsInChildren:Type=>sceneLabels.filter(c=>c instanceof Type)})}},
  COCOS_TRANSLATOR_CONFIG:{transport:'test',ui:false,syncSettings:false,uiEnabled:true,uiScanMs:999999},
  fetch:async(_url,options)=>{const body=JSON.parse(options.body);requests.push(body.items);return{ok:true,json:async()=>({items:body.items.map(item=>({id:item.id,text:item.text.replace('設定','设置').replace('メニュー','菜单').replace('確認','确认')}))})}},
});
vm.runInContext(runtime,context);const api=context.__CocosWebTranslator;
const menu=label('メニュー'),setting=label('<color=#fff>設定</color>',null,RichText),number=label('1234');
const originalMenuFont=menu.font;
const storyParent=node('story');storyParent.components=[{className:'AdvRichText'}];const story=label('メニュー',storyParent);
const child=label('設定',setting.node);const inputParent=node('input');inputParent.components=[new EditBox()];const input=label('メニュー',inputParent);
sceneLabels.push(menu,setting,number,story,child,input);
await api.scanUi();
assert.equal(menu.string,'菜单');assert.equal(setting.string,'<color=#fff>设置</color>');
assert.equal(number.string,'1234');assert.equal(story.string,'メニュー');assert.equal(child.string,'設定');assert.equal(input.string,'メニュー');
assert.equal(requests[0].length,2);assert.equal(menu.useSystemFont,true);
api.applyPreferences({paused:true,revision:2});assert.equal(api.stats.paused,true);assert.equal(menu.string,'メニュー');assert.equal(menu.useSystemFont,false);
const heldCalls=requests.length;await api.scanUi();assert.equal(requests.length,heldCalls);
api.applyPreferences({paused:false,revision:1});assert.equal(api.stats.paused,true);
api.applyPreferences({paused:false,revision:3});await api.scanUi();assert.equal(menu.string,'菜单');assert.equal(api.config.uiEnabled,true);
await api.setEnabled('uiEnabled',false);assert.equal(menu.string,'メニュー');assert.equal(menu.useSystemFont,false);
await api.setEnabled('uiEnabled',true);assert.equal(menu.string,'菜单');assert.equal(menu.useSystemFont,true);
menu.node.activeInHierarchy=false;await api.setEnabled('uiEnabled',false);assert.equal(menu.string,'メニュー');
menu.node.activeInHierarchy=true;await api.setEnabled('uiEnabled',true);
menu.string='確認';await api.scanUi();assert.equal(menu.string,'确认');
await api.setEnabled('uiEnabled',false);assert.equal(menu.string,'確認');assert.equal(menu.font,originalMenuFont);
api.uninstall();assert.equal(menu.string,'確認');assert.equal(menu.fontFamily,'original-family');
const results=[{case:'full rich-text translation, generated segments/story/input/numbers excluded',passed:true},
  {case:'UI toggle restores original text and fonts; re-enable, inactive nodes and uninstall supported',passed:true}];
results.push({case:'font ownership retained when the game reuses a label with different text',passed:true});

let release;const changing=label('メニュー');const lateContext=vm.createContext({AbortController,setInterval,clearInterval,setTimeout,clearTimeout,
  __require:context.__require,cc:{...context.cc,director:{getScene:()=>({getComponentsInChildren:Type=>changing instanceof Type?[changing]:[]})}},
  COCOS_TRANSLATOR_CONFIG:{transport:'test',ui:false,syncSettings:false,uiEnabled:true,uiScanMs:999999},
  fetch:()=>new Promise(resolve=>{release=resolve}),
});
vm.runInContext(runtime,lateContext);const pending=lateContext.__CocosWebTranslator.scanUi();changing.string='確認';
release({ok:true,json:async()=>({items:[{id:'0',text:'菜单'}]})});await pending;
assert.equal(changing.string,'確認');lateContext.__CocosWebTranslator.uninstall();
results.push({case:'late UI response does not overwrite a label changed by the game',passed:true});
const custom = label('謎名称'); let personalText = '未知名称', signature = 'personal-1';
const customContext=vm.createContext({AbortController,setInterval,clearInterval,setTimeout,clearTimeout,
  __require:context.__require,cc:{...context.cc,director:{getScene:()=>({getComponentsInChildren:Type=>custom instanceof Type?[custom]:[]})}},
  COCOS_TRANSLATOR_CONFIG:{transport:'test',ui:false,syncSettings:true,uiEnabled:true,uiScanMs:999999},
  fetch:async(url,options)=>({ok:true,json:async()=>url.endsWith('/preferences')
    ? {uiEnabled:true,uiGlossaryKeys:['謎名称'],personalTextKeys:['謎名称'],providerSignature:signature}
    : {items:JSON.parse(options.body).items.map(item=>({id:item.id,text:personalText}))}}),
});
vm.runInContext(runtime,customContext); const customApi=customContext.__CocosWebTranslator;
await customApi.setEnabled('uiEnabled',true);assert.equal(custom.string,'未知名称');
personalText='个人命名';signature='personal-2';await customApi.setEnabled('uiEnabled',true);assert.equal(custom.string,'个人命名');
customApi.uninstall();assert.equal(custom.string,'謎名称');
results.push({case:'personal Han-only UI keys are translated and changed revisions restore/retranslate current labels',passed:true});
writeFileSync(new URL('../.test-output/ui.json',import.meta.url),JSON.stringify({passed:results.length,total:results.length,results,
  evidenceBoundary:'Synthetic Cocos public component API.'},null,2)+'\n');
console.log(JSON.stringify({passed:results.length,total:results.length}));
