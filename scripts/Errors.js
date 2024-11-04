module.exports = class UserError extends Error {
    constructor(msg) {
        super(msg)
    }
}

module.exports = class EmailError extends Error {
    constructor(msg) {
        super(msg)
    }
}