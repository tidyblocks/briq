'use strict'

const assert = require('assert')

const util = require('../libs/util')
const MISSING = util.MISSING
const {Expr} = require('../libs/expr')
const {Summarize} = require('../libs/summarize')
const {Stage} = require('../libs/stage')
const {Pipeline} = require('../libs/pipeline')
const {Program} = require('../libs/program')
const {JsonToHtml} = require('../libs/json2html')

const fixture = require('./fixture')
const makeNode = fixture.makeNode
const makeCell = fixture.makeCell

const SELECT_STAGE = 'table[data-briq-class="@stage"]'

const checkSelect = (node, length) => {
  assert.match(node.tagName, /select/i,
               `Wrong node type`)
  assert.equal(node.childNodes.length, length,
               `Wrong number of children`)
  assert(Array.from(node.childNodes).every(n => n.tagName.match(/option/i)),
         `Wrong type of child`)
}

const checkOptions = (children, options) => {
  options.forEach(([display, name, state], i) => {
    assert.equal(children[i].getAttribute('value'), name,
                 `Wrong value for child ${i}`)
    assert.equal(children[i].innerHTML, display,
                 `Wrong display for child ${i}`)
    assert.equal(children[i].getAttribute('selected'), state,
                 `Wrong selection state for child ${i}`)
  })
}

const checkStage = (stage, label, length) => {
  const json = stage.toJSON()
  const factory = new JsonToHtml()
  const node = makeCell(factory.stage(json))
  assert.equal(node.querySelectorAll(SELECT_STAGE).length, 1,
               `Expected one stage`)
  const table = node.querySelector(SELECT_STAGE)
  assert.equal(table.getAttribute('data-briq-kind'), label,
               `Wrong stage kind`)
  const cells = table.firstChild.firstChild.children
  assert.equal(cells.length, length,
               `Expected ${length} children`)
  assert(Array.from(cells).every(c => c.tagName.match(/td/i)),
         `All cells should be table cells`)
  assert.equal(cells[0].textContent, label,
               `First cell should be label`)
  return cells
}

describe('creates HTML for basic fields', () => {
  it('creates HTML for label text', (done) => {
    const factory = new JsonToHtml()
    const node = makeCell(factory.label('label', 'stuff'))
    assert.match(node.tagName, /td/i,
                 `Expected table cell`)
    assert(node.classList.contains('redips-mark'),
           `Expected marked cell`)
    assert.equal(node.textContent, 'stuff',
                 `Wrong content`)
    done()
  })

  it('creates HTML for a multi-text input field', (done) => {
    const factory = new JsonToHtml()
    const value = 'a, b, c'
    const node = makeNode(factory.multiText(value))
    assert.match(node.tagName, /input/i,
                 `Expected input field`)
    assert.equal(node.getAttribute('data-briq-class'), '@multiInput',
                 `Expected @input class`)
    assert.equal(node.getAttribute('type'), 'text',
                 `Expected text input`)
    assert.equal(node.getAttribute('value'), value,
                 `Expected value missing`)
    done()
  })

  it('creates HTML for a single text input field', (done) => {
    const factory = new JsonToHtml()
    const value = 'a'
    const node = makeNode(factory.text(value))
    assert.match(node.tagName, /input/i,
                 `Expected input field`)
    assert.equal(node.getAttribute('data-briq-class'), '@input',
                 `Expected @input class`)
    assert.equal(node.getAttribute('type'), 'text',
                 `Expected text input`)
    assert.equal(node.getAttribute('value'), value,
                 `Expected value missing`)
    done()
  })

  it('creates HTML for a simple selector with nothing chosen', (done) => {
    const factory = new JsonToHtml()
    const node = makeNode(factory.selectKind(null, ['a', 'b']))
    checkSelect(node, 2)
    checkOptions(node.childNodes, [['a', 'a', null],
                                   ['b', 'b', null]])
    done()
  })

  it('creates HTML for a simple selector with something chosen', (done) => {
    const factory = new JsonToHtml()
    const node = makeNode(factory.selectKind('b', ['a', 'b']))
    checkSelect(node, 2)
    checkOptions(node.childNodes, [['a', 'a', null],
                                   ['b', 'b', 'selected']])
    done()
  })

  it('creates HTML for a mixed selector with nothing chosen', (done) => {
    const factory = new JsonToHtml()
    const node = makeNode(factory.selectKind(null, [['Show A', 'a'], 'b']))
    checkSelect(node, 2)
    checkOptions(node.childNodes, [['Show A', 'a', null],
                                   ['b', 'b', null]])
    done()
  })

  it('creates HTML for a mixed selector with something chosen', (done) => {
    const factory = new JsonToHtml()
    const node = makeNode(factory.selectKind('a', [['Show A', 'a'], 'b']))
    checkSelect(node, 2)
    checkOptions(node.childNodes, [['Show A', 'a', 'selected'],
                                   ['b', 'b', null]])
    done()
  })
})

describe('creates HTML for expressions', () => {
  it('creates a constant', (done) => {
    const expr = new Expr.string('something')
    const json = expr.toJSON()
    const factory = new JsonToHtml()
    const node = makeCell(factory.expr(json))
    const row = node.querySelector('table >tbody >tr')
    assert.equal(row.childNodes.length, 2,
                 `Widget should have two children`)
    const first = row.childNodes[0].firstChild,
          second = row.childNodes[1].firstChild
    assert.match(first.tagName, /select/i,
                 `First child should be selector`)
    assert.equal(first.childNodes.length, 5,
                 `Selector should have five options`)
    const selected = first.querySelector('option[selected=selected]')
    assert.equal(selected.getAttribute('value'), 'string',
                 `Selector should have "string" selected`)
    assert.match(second.tagName, /input/i,
                 `Second child should be input`)
    assert.equal(second.getAttribute('type'), 'text',
                 `Input should be of type text`)
    assert.equal(second.getAttribute('value'), 'something',
                 `Value should be string`)
    done()
  })

  it('converts different constant values to HTML', (done) => {
    const allChecks = [
      ['false', new Expr.logical(false)],
      ['true', new Expr.logical(true)],
      ['zero', new Expr.number(0)],
      ['non-zero', new Expr.number(123)],
      ['empty string', new Expr.string('')],
      ['non-empty string', new Expr.string('stuff')]
    ]
    for (const [text, expr] of allChecks) {
      const json = expr.toJSON()
      const factory = new JsonToHtml()
      const node = makeCell(factory.expr(json))
      const row = node.querySelector('tr')
      const second = row.childNodes[1].firstChild
      assert.match(second.tagName, /input/i,
                   `Second child should be input`)
      assert.equal(second.getAttribute('type'), 'text',
                   `Input should be of type text`)
      const actual = second.getAttribute('value')
      assert.equal(actual, `${expr.value}`,
                   `Value for ${text} should be "${expr.value}", not "${actual}"`)
    }
    done()
  })

  it('converts a column getter to HTML', (done) => {
    const expr = new Expr.column('red')
    const json = expr.toJSON()
    const factory = new JsonToHtml()
    const node = makeCell(factory.expr(json))
    const row = node.querySelector('table >tbody >tr')
    assert.equal(row.childNodes.length, 2,
                 `Widget should have two children`)
    const first = row.childNodes[0].firstChild,
          second = row.childNodes[1].firstChild
    assert.equal(first.tagName, 'SELECT',
                 `First child should be selector`)
    assert.equal(first.childNodes.length, 5,
                 `Selector should have five options`)
    const selected = first.querySelector('option[selected=selected]')
    assert.equal(selected.getAttribute('value'), 'column',
                 `Selector should have "column" selected`)
    assert.equal(second.getAttribute('value'), 'red',
                 `Input should be "red"`)
    done()
  })

  it('converts unary expressions to HTML', (done) => {
    const theDate = new Date(1983, 11, 2, 7, 55, 19, 0)
    const allChecks = [
      ['negate', new Expr.number(987)],
      ['not', new Expr.logical(false)],
      ['isLogical', new Expr.logical(true)],
      ['isDatetime', new Expr.datetime(theDate)],
      ['isMissing', new Expr.logical(MISSING)],
      ['isNumber', new Expr.number(-8.9)],
      ['isString', new Expr.string('yes')],
      ['toLogical', new Expr.number(0)],
      ['toDatetime', new Expr.string('1983-11-02')],
      ['toNumber', new Expr.string('16')],
      ['toString', new Expr.number(16)],
      ['toYear', new Expr.datetime(theDate)],
      ['toMonth', new Expr.datetime(theDate)],
      ['toDay', new Expr.datetime(theDate)],
      ['toWeekday', new Expr.datetime(theDate)],
      ['toHours', new Expr.datetime(theDate)],
      ['toMinutes', new Expr.datetime(theDate)],
      ['toSeconds', new Expr.datetime(theDate)]
    ]
    for (let [name, val] of allChecks) {
      const expr = new Expr[name](val)
      const json = expr.toJSON()
      const factory = new JsonToHtml()
      const node = makeCell(factory.expr(json))
      
      assert.match(node.tagName, /td/i,
                   `expression should be a table cell`)

      const table = node.firstChild
      assert.match(table.tagName, /table/i,
                   `First child should be table`)
      assert.equal(table.getAttribute('data-briq-class'), '@expr',
                   `Table should be expression`)
      assert.equal(table.getAttribute('data-briq-kind'), name,
                   `Table kind should be "${name}"`)

      const row = node.querySelector('table >tbody >tr')
      assert.equal(row.childNodes.length, 2,
                   `Widget should have two children`)

      const first = row.childNodes[0].firstChild
      assert.match(first.tagName, /select/i,
                   `First child should be selector`)
      const selected = first.querySelector('option[selected=selected]')
      assert.equal(selected.getAttribute('value'), name,
                   `Wrong function selected`)

      const second = row.childNodes[1].firstChild
      assert.match(second.tagName, /table/i,
                   `Second child should be sub-expression`)
      assert.equal(second.getAttribute('data-briq-class'), '@expr',
                   `Second child should be expression`)
    }
    done()
  })

  it('converts binary expressions to HTML', (done) => {
    const allChecks = [
      ['add', new Expr.number(987), new Expr.number(654)],
      ['and', new Expr.logical(false), new Expr.logical(true)],
      ['divide', new Expr.number(987), new Expr.number(654)],
      ['equal', new Expr.number(987), new Expr.number(654)],
      ['greater', new Expr.number(987), new Expr.number(654)],
      ['greaterEqual', new Expr.number(987), new Expr.number(654)],
      ['less', new Expr.number(987), new Expr.number(654)],
      ['lessEqual', new Expr.number(987), new Expr.number(654)],
      ['multiply', new Expr.number(987), new Expr.number(654)],
      ['notEqual', new Expr.number(987), new Expr.number(654)],
      ['or', new Expr.logical(false), new Expr.logical(true)],
      ['power', new Expr.number(987), new Expr.number(654)],
      ['remainder', new Expr.number(987), new Expr.number(654)],
      ['subtract', new Expr.number(987), new Expr.number(654)]
    ]
    for (let [name, leftVal, rightVal] of allChecks) {
      const expr = new Expr[name](leftVal, rightVal)
      const json = expr.toJSON()
      const factory = new JsonToHtml()
      const node = makeCell(factory.expr(json))

      assert.match(node.tagName, /td/i,
                   `expression should be a table cell`)

      const table = node.firstChild
      assert.match(table.tagName, /table/i,
                   `First child should be table`)
      assert.equal(table.getAttribute('data-briq-class'), '@expr',
                   `Table should be expression`)
      assert.equal(table.getAttribute('data-briq-kind'), name,
                   `Table kind should be "${name}"`)

      const row = node.querySelector('table >tbody >tr')
      assert.equal(row.childNodes.length, 3,
                   `Widget should have three children`)

      const first = row.childNodes[0].firstChild
      assert.match(first.tagName, /table/i,
                   `middle child should be sub-cell`)
      assert.equal(first.getAttribute('data-briq-class'), '@expr',
                   `First child should be expression`)

      const middle = row.childNodes[1].firstChild
      assert.match(middle.tagName, /select/i,
                   `Middle child should be selector`)
      const selected = middle.querySelector('option[selected=selected]')
      assert.equal(selected.getAttribute('value'), name,
                   `Wrong function selected`)

      const last = row.childNodes[2].firstChild
      assert.match(last.tagName, /table/i,
                   `last child should be sub-cell`)
      assert.equal(last.getAttribute('data-briq-class'), '@expr',
                   `Last child should be expression`)
    }
    done()
  })

  it('converts ternary expressions to HTML', (done) => {
    const expr = new Expr.ifElse(new Expr.logical(true),
                                 new Expr.number(1),
                                 new Expr.number(2))
    const json = expr.toJSON()
    const factory = new JsonToHtml()
    const node = makeCell(factory.expr(json))

    assert.match(node.tagName, /td/i,
                 `expression should be a table cell`)

    const table = node.firstChild
    assert.match(table.tagName, /table/i,
                 `First child should be table`)
    assert.equal(table.getAttribute('data-briq-class'), '@expr',
                 `Table should be expression`)
    assert.equal(table.getAttribute('data-briq-kind'), 'ifElse',
                 `Table kind should be "ifElse"`)
    
    const row = node.querySelector('table >tbody >tr')
    assert.equal(row.childNodes.length, 6,
                 `Widget should have six children`)

    for (let [i, word] of [[0, 'if'], [2, 'then'], [4, 'else']]) {
      assert.match(row.children[i].firstChild.tagName, /span/i,
                   `Expected label to contain span`)
      assert.equal(row.children[i].firstChild.innerHTML, word,
                   `Expected word ${i} to be "${word}"`)
    }

    for (let i of [1, 3, 5]) {
      assert.match(row.children[i].tagName, /td/i,
                   `Expected table element as child ${i}`)
      const cell = row.children[i].firstChild
      assert.equal(cell.querySelectorAll('select').length, 1,
                   `Expected one selector`)
      assert.equal(cell.querySelectorAll('input').length, 1,
                   `Expected one input element`)
    }
    done()
  })
})

describe('creates HTML for stages', () => {
  it('creates a drop stage from JSON', (done) => {
    const stage = new Stage.drop(['left, right'])
    const cells = checkStage(stage, 'drop', 2)
    assert.match(cells[1].firstChild.tagName, /input/i,
                 `Second child should be input`)
    done()
  })

  it('creates a filter stage from JSON', (done) => {
    for (const [text, val] of [['true', true], ['false', false]]) {
      const stage = new Stage.filter(new Expr.logical(val))
      const cells = checkStage(stage, 'filter', 2)
      assert.equal(cells[1].querySelectorAll('table[data-briq-class="@expr"]').length, 1,
                   `Should have one expression as a child`)
    }
    done()
  })

  it('creates a groupBy stage from JSON', (done) => {
    const stage = new Stage.groupBy(['red', 'green'])
    const cells = checkStage(stage, 'groupBy', 2)
    assert.match(cells[1].firstChild.tagName, /input/i,
                 `Second child should be input`)
    done()
  })

  it('creates a join stage from JSON', (done) => {
    const stage = new Stage.join('aTable', 'aCol', 'bTable', 'bCol')
    const cells = checkStage(stage, 'join', 6)
    assert.equal(cells[1].firstChild.getAttribute('value'), 'aTable',
                 `First cell has wrong content`)
    assert.equal(cells[2].firstChild.getAttribute('value'), 'aCol',
                 `Second cell has wrong content`)
    assert.equal(cells[4].firstChild.getAttribute('value'), 'bTable',
                 `Fourth cell has wrong content`)
    assert.equal(cells[5].firstChild.getAttribute('value'), 'bCol',
                 `Fifth cell has wrong content`)
    assert.match(cells[1].firstChild.tagName, /input/i,
                 `Second child should be input`)
    done()
  })

  it('creates a mutate stage from JSON', (done) => {
    const stage = new Stage.mutate('update', new Expr.logical(true))
    const cells = checkStage(stage, 'mutate', 3)
    assert.match(cells[1].firstChild.tagName, /input/i,
                 `Second child should be input`)
    assert.equal(cells[2].querySelectorAll('table[data-briq-class="@expr"]').length, 1,
                 `Should have one expression as a child`)
    done()
  })

  it('creates a notify stage from JSON', (done) => {
    const stage = new Stage.notify('signal')
    const cells = checkStage(stage, 'notify', 2)
    assert.match(cells[1].firstChild.tagName, /input/i,
                 `Second child should be input`)
    done()
  })

  it('creates a read stage from JSON', (done) => {
    const stage = new Stage.read('/path')
    const cells = checkStage(stage, 'read', 2)
    assert.match(cells[1].firstChild.tagName, /input/i,
                 `Second child should be input`)
    done()
  })

  it('creates a select stage from JSON', (done) => {
    const stage = new Stage.select(['red', 'green'])
    const cells = checkStage(stage, 'select', 2)
    assert.match(cells[1].firstChild.tagName, /input/i,
                 `Second child should be input`)
    done()
  })

  it('creates a sort stage from JSON', (done) => {
    for (const reverse of [true, false]) {
      const stage = new Stage.sort(['red', 'green'], reverse)
      const cells = checkStage(stage, 'sort', 3)
      assert.match(cells[1].firstChild.tagName, /input/i,
                   `Second child should be input`)
      assert.equal(cells[1].firstChild.getAttribute('type'), 'text',
                   `Second child should be text input`)
      assert.match(cells[2].firstChild.tagName, /input/i,
                   `Third child should be input`)
      assert.equal(cells[2].firstChild.getAttribute('type'), 'checkbox',
                   `Third child should be checkbox input`)
    }
    done()
  })

  it('creates a summarize stage from JSON', (done) => {
    const stage = new Stage.summarize('maximum', 'left')
    const cells = checkStage(stage, 'summarize', 3)
    const second = cells[1].firstChild
    const third = cells[2].firstChild
    assert.match(second.tagName, /select/i,
                 `Second child should be selector`)
    assert.equal(second.childNodes.length, Summarize.OPTIONS.length,
                 `Selector has wrong number of options`)
    const selected = second.querySelector('option[selected=selected]')
    assert.equal(selected.getAttribute('value'), 'maximum',
                 `Selector should have "maximum" selected`)
    assert.match(third.tagName, /input/i,
                 `Third child should be input`)
    assert.equal(third.getAttribute('type'), 'text',
                 `Input should be of type text`)
    assert.equal(third.getAttribute('value'), 'left',
                 `Value should be string`)
    done()
  })

  it('creates an ungroup stage from JSON', (done) => {
    const stage = new Stage.ungroup()
    const cells = checkStage(stage, 'ungroup', 1)
    done()
  })

  it('creates a unique stage from JSON', (done) => {
    const stage = new Stage.unique(['red', 'green'])
    const cells = checkStage(stage, 'unique', 2)
    assert.match(cells[1].firstChild.tagName, /input/i,
                 `Second child should be input`)
    done()
  })
})