'use strict'

const util = require('./util')
const {
  ExprUnary,
  ExprBinary,
  ExprTernary
} = require('./expr')

/**
 * Indicate that persisted JSON is an operation.
 */
const FAMILY = '@op'

// ----------------------------------------------------------------------

/**
 * Base class for negations.
 */
class OpNegationBase extends ExprUnary {
  constructor (species, arg) {
    super(FAMILY, species, arg)
  }
}

/**
 * Arithmetic negation.
 */
class OpNegate extends OpNegationBase {
  /**
   * Constructor.
   * @param {expr} arg How to get the value.
   * @returns The negation.
   */
  constructor (arg) {
    super('negate', arg)
  }

  /**
   * Operate on a single row.
   * @param {object} row The row to operate on.
   * @param {number} i The row's index.
   * @return The negation of the value returned by the sub-expression.
   */
  run (row, i) {
    const value = this.arg.run(row, i)
    util.checkNumber(value,
                     `Require number for ${this.name}`)
    return (value === util.MISSING) ? util.MISSING : util.safeValue(-value)
  }
}

/**
 * Logical negation.
 */
class OpNot extends OpNegationBase {
  /**
   * Constructor.
   * @param {expr} arg How to get the value.
   * @returns The negation.
   */
  constructor (arg) {
    super('not', arg)
  }

  /**
   * Operate on a single row.
   * @param {object} row The row to operate on.
   * @param {number} i The row's index.
   * @return The logical negation of the value returned by the sub-expression.
   */
  run (row, i) {
    const value = this.arg.run(row, i)
    return (value === util.MISSING) ? util.MISSING : !util.makeLogical(value)
  }
}

// ----------------------------------------------------------------------

/**
 * Type-checking expressions.
 */
class OpTypecheckBase extends ExprUnary {
  /**
   * Constructor.
   * @param {string} species The precise function name.
   * @param arg How to get a value.
   */
  constructor (species, arg) {
    super(FAMILY, species, arg)
  }

  /**
   * Check the type of a value.
   * @param {object} row The row to operate on.
   * @param {number} i The row's index.
   * @param {string} typeName What type to check for.
   * @returns True or false.
   */
  typeCheck (row, i, typeName) {
    const value = this.arg.run(row, i)
    return (value === util.MISSING)
      ? util.MISSING
      : (typeof value === typeName)
  }
}

/**
 * Check if a value is logical.
 */
class OpIsLogical extends OpTypecheckBase {
  constructor (arg) {
    super('isLogical', arg)
  }

  run (row, i) {
    return this.typeCheck(row, i, 'boolean')
  }
}

/**
 * Check if a value is a datetime.
 */
class OpIsDatetime extends OpTypecheckBase {
  constructor (arg) {
    super('isDatetime', arg)
  }

  run (row, i) {
    const value = this.arg.run(row, i)
    return (value === util.MISSING) ? util.MISSING : (value instanceof Date)
  }
}

/**
 * Check if a value is missing.
 */
class OpIsMissing extends OpTypecheckBase {
  constructor (arg) {
    super('isMissing', arg)
  }

  run (row, i) {
    const value = this.arg.run(row, i)
    return value === util.MISSING
  }
}

/**
 * Check if a value is numeric.
 */
class OpIsNumber extends OpTypecheckBase {
  constructor (arg) {
    super('isNumber', arg)
  }

  run (row, i) {
    return this.typeCheck(row, i, 'number')
  }
}

/**
 * Check if a value is text.
 */
class OpIsText extends OpTypecheckBase {
  constructor (arg) {
    super('isText', arg)
  }

  run (row, i) {
    return this.typeCheck(row, i, 'string')
  }
}

// ----------------------------------------------------------------------

/**
 * Type conversion expressions.
 */
class OpConvertBase extends ExprUnary {
  /**
   * Constructor.
   * @param {string} species The precise function name.
   * @param arg How to get a value.
   */
  constructor (species, arg) {
    super(FAMILY, species, arg)
  }
}

/**
 * Convert a value to logical.
 */
class OpToLogical extends OpConvertBase {
  constructor (arg) {
    super('toLogical', arg)
  }

  /**
   * Operate on a single row.
   * @param {object} row The row to operate on.
   * @param {number} i The row's index.
   * @return The sub-expression value as MISSING, true, or false.
   */
  run (row, i) {
    const value = this.arg.run(row, i)
    return (value === util.MISSING) ? util.MISSING : util.makeLogical(value)
  }
}

/**
 * Convert a value to a datetime.
 */
class OpToDatetime extends OpConvertBase {
  constructor (arg) {
    super('toDatetime', arg)
  }

  /**
   * Operate on a single row.
   * @param {object} row The row to operate on.
   * @param {number} i The row's index.
   * @return The sub-expression value as MISSING or a Date.
   */
  run (row, i) {
    const value = this.arg.run(row, i)
    return util.makeDate(value)
  }
}

/**
 * Convert a value to a number.
 */
class OpToNumber extends OpConvertBase {
  constructor (arg) {
    super('toNumber', arg)
  }

  /**
   * Operate on a single row.
   * @param {object} row The row to operate on.
   * @param {number} i The row's index.
   * @return The sub-expression value as a number.
   */
  run (row, i) {
    let value = this.arg.run(row, i)
    return util.makeNumber(value)
  }
}

/**
 * Convert a value to text.
 */
class OpToText extends OpConvertBase {
  constructor (arg) {
    super('toText', arg)
  }

  /**
   * Operate on a single row.
   * @param {object} row The row to operate on.
   * @param {number} i The row's index.
   * @return The sub-expression value as text.
   */
  run (row, i) {
    let value = this.arg.run(row, i)
    if (value === util.MISSING) {
      return util.MISSING
    }
    if (typeof value !== 'string') {
      value = `${value}`
    }
    return value
  }
}

// ----------------------------------------------------------------------

/**
 * Unary datetime expressions.
 */
class OpDatetimeBase extends ExprUnary {
  /**
   * Constructor.
   * @param {string} species The precise function name.
   * @param arg How to get a value.
   */
  constructor (species, arg) {
    super(FAMILY, species, arg)
  }

  /**
   * Extract a date component.
   * @param {object} row The row to operate on.
   * @param {number} i The row index within the dataframe.
   * @param func How to get the date component value.
   * @returns The date component's value.
   */
  dateValue (row, i, func) {
    const value = this.arg.run(row, i)
    if (value === util.MISSING) {
      return util.MISSING
    }
    util.check(value instanceof Date,
               `Require date for ${this.species}`)
    return func(value)
  }
}

/**
 * Extract year from date.
 */
class OpToYear extends OpDatetimeBase {
  constructor (arg) {
    super('toYear', arg)
  }

  run (row, i) {
    return this.dateValue(row, i, d => d.getFullYear())
  }
}

/**
 * Extract 1-based month from date.
 */
class OpToMonth extends OpDatetimeBase {
  constructor (arg) {
    super('toMonth', arg)
  }

  run (row, i) {
    return this.dateValue(row, i, d => d.getMonth() + 1)
  }
}

/**
 * Extract 1-based day of month from date.
 */
class OpToDay extends OpDatetimeBase {
  constructor (arg) {
    super('toDay', arg)
  }

  run (row, i) {
    return this.dateValue(row, i, d => d.getDate())
  }
}

/**
 * Extract day of week from date.
 */
class OpToWeekday extends OpDatetimeBase {
  constructor (arg) {
    super('toWeekday', arg)
  }

  run (row, i) {
    return this.dateValue(row, i, d => d.getDay())
  }
}

/**
 * Extract hour from date.
 */
class OpToHours extends OpDatetimeBase {
  constructor (arg) {
    super('toHours', arg)
  }

  run (row, i) {
    return this.dateValue(row, i, d => d.getHours())
  }
}

/**
 * Extract minutes from date.
 */
class OpToMinutes extends OpDatetimeBase {
  constructor (arg) {
    super('toMinutes', arg)
  }

  run (row, i) {
    return this.dateValue(row, i, d => d.getMinutes())
  }
}

/**
 * Extract seconds from date.
 */
class OpToSeconds extends OpDatetimeBase {
  constructor (arg) {
    super('toSeconds', arg)
  }

  run (row, i) {
    return this.dateValue(row, i, d => d.getSeconds())
  }
}

// ----------------------------------------------------------------------

/**
 * Binary arithmetic expressions.
 */
class OpArithmeticBase extends ExprBinary {
  /**
   * Constructor.
   * @param {string} species The name of the operation.
   * @param {expr} left How to get the left value.
   * @param {expr} right How to get the right value.
   */
  constructor (species, left, right) {
    super(FAMILY, species, left, right)
  }

  /**
   * Perform a binary arithmetic operation.
   * @param {object} row The row to operate on.
   * @param {number} i The row index within the dataframe.
   * @param func How to calculate the result.
   * @returns The result.
   */
  arithmetic (row, i, func) {
    const left = this.left.run(row, i)
    util.checkNumber(left,
                     `Require number for ${this.species}`)
    const right = this.right.run(row, i)
    util.checkNumber(right,
                     `Require number for ${this.species}`)
    return ((left === util.MISSING) || (right === util.MISSING))
      ? util.MISSING
      : util.safeValue(func(left, right))
  }
}

/**
 * Addition.
 */
class OpAdd extends OpArithmeticBase {
  constructor (left, right) {
    super('add', left, right)
  }

  run (row, i) {
    return this.arithmetic(row, i, (left, right) => left + right)
  }
}

/**
 * Division.
 */
class OpDivide extends OpArithmeticBase {
  constructor (left, right) {
    super('divide', left, right)
  }

  run (row, i) {
    return this.arithmetic(row, i, (left, right) => left / right)
  }
}

/**
 * Multiplication.
 */
class OpMultiply extends OpArithmeticBase {
  constructor (left, right) {
    super('multiply', left, right)
  }

  run (row, i) {
    return this.arithmetic(row, i, (left, right) => left * right)
  }
}

/**
 * Exponentiation.
 */
class OpPower extends OpArithmeticBase {
  constructor (left, right) {
    super('power', left, right)
  }

  run (row, i) {
    return this.arithmetic(row, i, (left, right) => left ** right)
  }
}

/**
 * Remainder.
 */
class OpRemainder extends OpArithmeticBase {
  constructor (left, right) {
    super('remainder', left, right)
  }

  run (row, i) {
    return this.arithmetic(row, i, (left, right) => left % right)
  }
}

/**
 * Subtraction.
 */
class OpSubtract extends OpArithmeticBase {
  constructor (left, right) {
    super('subtract', left, right)
  }

  run (row, i) {
    return this.arithmetic(row, i, (left, right) => left - right)
  }
}

// ----------------------------------------------------------------------

/**
 * Binary comparison expressions.
 */
class OpCompareBase extends ExprBinary {
  /**
   * Constructor.
   * @param {string} species The name of the operation.
   * @param {expr} left How to get the left value.
   * @param {expr} right How to get the right value.
   */
  constructor (species, left, right) {
    super(FAMILY, species, left, right)
  }

  /**
   * Perform a binary comparison operation.
   * @param {object} row The row to operate on.
   * @param {number} i The row index within the dataframe.
   * @param func How to calculate the result.
   * @returns The result.
   */
  comparison (row, i, func) {
    const left = this.left.run(row, i)
    const right = this.right.run(row, i)
    util.checkTypeEqual(left, right,
                        `Require equal types for ${this.species}`)
    return ((left === util.MISSING) || (right === util.MISSING))
      ? util.MISSING
      : func(left, right)
  }
}

/**
 * Equality.
 */
class OpEqual extends OpCompareBase {
  constructor (left, right) {
    super('equal', left, right)
  }

  run (row, i) {
    return this.comparison(row, i, (left, right) => util.equal(left, right))
  }
}

/**
 * Strictly greater than.
 */
class OpGreater extends OpCompareBase {
  constructor (left, right) {
    super('greater', left, right)
  }

  run (row, i) {
    return this.comparison(row, i, (left, right) => (left > right))
  }
}

/**
 * Greater than or equal.
 */
class OpGreaterEqual extends OpCompareBase {
  constructor (left, right) {
    super('greaterEqual', left, right)
  }

  run (row, i) {
    return this.comparison(row, i, (left, right) => (left >= right))
  }
}

/**
 * Strictly less than.
 */
class OpLess extends OpCompareBase {
  constructor (left, right) {
    super('less', left, right)
  }

  run (row, i) {
    return this.comparison(row, i, (left, right) => (left < right))
  }
}

/**
 * Less than or equal.
 */
class OpLessEqual extends OpCompareBase {
  constructor (left, right) {
    super('lessEqual', left, right)
  }

  run (row, i) {
    return this.comparison(row, i, (left, right) => (left <= right))
  }
}

/**
 * Inequality.
 */
class OpNotEqual extends OpCompareBase {
  constructor (left, right) {
    super('notEqual', left, right)
  }

  run (row, i) {
    return this.comparison(row, i, (left, right) => (!util.equal(left, right)))
  }
}

// ----------------------------------------------------------------------

/**
 * Binary logical expressions.
 */
class OpLogicalBase extends ExprBinary {
  /**
   * Constructor.
   * @param {string} species The name of the operation.
   * @param {expr} left How to get the left value.
   * @param {expr} right How to get the right value.
   */
  constructor (species, left, right) {
    super(FAMILY, species, left, right)
  }
}

/**
 * Logical conjunction.
 */
class OpAnd extends OpLogicalBase {
  constructor (left, right) {
    super('and', left, right)
  }

  /**
   * Perform short-circuit logical 'and'.
   * @param {object} row The row to operate on.
   * @param {number} i The row index within the dataframe.
   * @returns The left value if it is not truthy, otherwise the right value. The
   * right expression is only evaluated if necessary.
   */
  run (row, i) {
    const left = this.left.run(row, i)
    if (!left) {
      return left
    }
    return this.right.run(row, i)
  }
}

/**
 * Logical disjunction.
 */
class OpOr extends OpLogicalBase {
  constructor (left, right) {
    super('or', left, right)
  }

  /**
   * Perform short-circuit logical 'or'.
   * @param {object} row The row to operate on.
   * @param {number} i The row index within the dataframe.
   * @returns The left value if it is truthy, otherwise the right value. The
   * right expression is only evaluated if necessary.
   */
  run (row, i) {
    const left = this.left.run(row, i)
    if (left) {
      return left
    }
    return this.right.run(row, i)
  }
}

// ----------------------------------------------------------------------

/**
 * Logical selection.
 */
class OpIfElse extends ExprTernary {
  /**
   * Constructor
   * @param {expr} left How to get the condition's value.
   * @param {expr} middle How to get a value if the condition is truthy.
   * @param {expr} right How to get a value if the condition is not truthy.
   */
  constructor (left, middle, right) {
    super(FAMILY, 'ifElse', left, middle, right)
  }

  /**
   * Perform short-circuit logical 'or'.
   * @param {object} row The row to operate on.
   * @param {number} i The row index within the dataframe.
   * @returns The left value if the condition is truthy, otherwise the right
   * value. The left and right expressions are only evaluated if necessary.
   */
  run (row, i) {
    const cond = this.left.run(row, i)
    return (cond === util.MISSING)
      ? util.MISSING
      : (cond ? this.middle.run(row, i) : this.right.run(row, i))
  }
}

// ----------------------------------------------------------------------

module.exports = {
  FAMILY: FAMILY,
  add: OpAdd,
  and: OpAnd,
  divide: OpDivide,
  equal: OpEqual,
  greater: OpGreater,
  greaterEqual: OpGreaterEqual,
  ifElse: OpIfElse,
  less: OpLess,
  lessEqual: OpLessEqual,
  multiply: OpMultiply,
  negate: OpNegate,
  not: OpNot,
  notEqual: OpNotEqual,
  or: OpOr,
  power: OpPower,
  remainder: OpRemainder,
  subtract: OpSubtract,
  isLogical: OpIsLogical,
  isDatetime: OpIsDatetime,
  isMissing: OpIsMissing,
  isNumber: OpIsNumber,
  isText: OpIsText,
  toLogical: OpToLogical,
  toDatetime: OpToDatetime,
  toNumber: OpToNumber,
  toText: OpToText,
  toYear: OpToYear,
  toMonth: OpToMonth,
  toDay: OpToDay,
  toWeekday: OpToWeekday,
  toHours: OpToHours,
  toMinutes: OpToMinutes,
  toSeconds: OpToSeconds
}
