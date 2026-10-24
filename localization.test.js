const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function createRuntime() {
    const frames = [];
    const dictionary = JSON.parse(fs.readFileSync(path.join(__dirname, 'localization/core.json'), 'utf8'));
    const context = vm.createContext({
        Node: { ELEMENT_NODE: 1, TEXT_NODE: 3 },
        FanYi_CiDian: new Map(dictionary.sections.flatMap(section => section.entries)),
        MoShi_FanYi: [],
        DingXiang_SuiPian: [],
        requestAnimationFrame: callback => frames.push(callback),
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'localization/runtime/engine.js'), 'utf8'), context);
    // Global repairs are independently scheduled; these tests exercise the text mutation path.
    context.ShouJi_PiLiang_QiZhi = () => 0;
    return {
        context,
        frames,
        flush() {
            while (frames.length) frames.shift()();
        },
    };
}

function textNode(text, protectedSelector = '') {
    let value = text;
    let writes = 0;
    const parent = {
        tagName: 'DIV',
        closest: selector => protectedSelector && selector.includes(protectedSelector) ? parent : null,
    };
    return {
        nodeType: 3,
        parentElement: parent,
        get textContent() { return value; },
        set textContent(next) { value = next; writes++; },
        get writes() { return writes; },
    };
}

test('reused text nodes translate through the existing frame batch', () => {
    const runtime = createRuntime();
    const samples = [
        ['Upgrade your plan', '升级套餐'],
        ['Choose a plan with more usage', '选择用量更多的套餐'],
        ['Guide Agent with Rules', '使用规则引导智能体'],
        ['Rules give Agent persistent, system-level instructions for your coding standards and workflows.', '规则为智能体提供持久的系统级指令，用于您的编码规范和工作流。'],
        ['Create Reusable Commands', '创建可复用命令'],
        ['Commands are reusable prompts you invoke with /name to standardize common workflows across your team.', '命令是可复用的提示词，可通过 /name 调用，用于在团队中标准化常见工作流。'],
        ['All', '全部'],
    ];
    const nodes = samples.map(([source]) => textNode(` ${source} `));
    runtime.context.GuanCha_HuiDiao(nodes.map(target => ({ type: 'characterData', target })));
    assert.equal(runtime.frames.length, 1);
    runtime.flush();
    nodes.forEach((node, index) => assert.equal(node.textContent, ` ${samples[index][1]} `));

    // React switches tabs while retaining the same text node.
    nodes[2].textContent = 'Create Reusable Commands';
    runtime.context.GuanCha_HuiDiao([{ type: 'characterData', target: nodes[2] }]);
    runtime.flush();
    assert.equal(nodes[2].textContent, '创建可复用命令');
});

test('translation feedback converges without rewriting unchanged text', () => {
    const runtime = createRuntime();
    runtime.context.FanYi_CiDian.set('MCP', 'MCP');
    const nodes = [textNode('创建可复用命令'), textNode('MCP')];
    runtime.context.GuanCha_HuiDiao(nodes.map(target => ({ type: 'characterData', target })));
    runtime.flush();
    nodes.forEach(node => assert.equal(node.writes, 0));
});

test('editor and editable content stay out of the mutation queue', () => {
    const runtime = createRuntime();
    const nodes = ['.monaco-editor', '.explorer-viewlet', '[contenteditable="true"]']
        .map(selector => textNode('Guide Agent with Rules', selector));
    nodes.push({ nodeType: 3, parentElement: null, textContent: 'All' });
    runtime.context.GuanCha_HuiDiao(nodes.map(target => ({ type: 'characterData', target })));
    assert.equal(runtime.frames.length, 0);
    nodes.slice(0, 3).forEach(node => assert.equal(node.writes, 0));
});
