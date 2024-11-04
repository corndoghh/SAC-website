const { readDatabase, updateEntry, addEntry, deleteEntry, doesValueExist } = require('./DatabaseManager')
const Crypto = require("crypto")
const UserError = require("./Errors")


const setValue = async (identifier, key, value) => {
    const user = await this.getUser(identifier)
    
    const updatedUser = {...user}

    updatedUser[key] = value

    await updateEntry(user, updatedUser)
}

module.exports.addUser = async (Email, FirstName, MiddleNames, LastName, Comment) => {
    if (Email === undefined || FirstName === undefined || LastName === undefined) { throw new UserError("Required Parameters Null") }
    if (await this.doesUserExist(Email)) { throw new UserError("User already exists") }

    const user = { FirstName, MiddleNames, LastName, Email, "UUID": Crypto.randomUUID(), Comment, "IsEmailVerified": false, "TimeCreated": Date.now(), "HasAccount": false, "Username": false, "Salt": false, "HashedPassword": false }

    await addEntry(user)
}

module.exports.deleteUser = async (identifier) => {
    if (!(await this.doesUserExist(identifier))) { throw new UserError("User does not exist") } 

    const user = await this.getUser(identifier);

    await deleteEntry(user)
}

module.exports.createUserAccount = async (Email, Username, Password) => {
    if (!(await this.doesUserExist(Email))) { throw new UserError("User does not exist") }
    if (await this.doesUserHaveAccount(Email)) { throw new UserError("User already has an account") }
    //if (await this.getUserValue(Email, "HasAccount")) { throw new UserError("User already has an account"); return }
    if (await this.isUsernameUsed(Username)) { throw new UserError("Username already in use") }

    const salt = Crypto.randomBytes(128).toString('base64')
    await this.setUserValue(Email, "Username", Username)
    await this.setUserValue(Email, "Salt", salt)
    await this.setUserPassword(Email, Password)
    await this.setUserValue(Email, "HasAccount", true)

}

module.exports.setUserPassword = async (identifier, Password) => {
    if (!(await this.doesUserExist(identifier))) { throw new UserError("User does not exist") }
    if (!(await this.doesUserHaveAccount(identifier))) { throw new UserError("No account associated with user") }
    await this.setUserValue(identifier, "HashedPassword", Crypto.pbkdf2Sync(Password, await this.getUserValue(identifier, "Salt"), 10000, 64, 'sha512').toString("base64"))
}

module.exports.getUser = async (identifier) => {
    const users = await readDatabase()

    return users.filter((user) => (
        user['Username'] === identifier ||
        user['Email'] === identifier ||
        user['UUID'] === identifier
    ))[0]
}


module.exports.getUserValue = async (identifier, key) => {
    if (!(await this.doesUserExist(identifier))) { throw new UserError("User does not exist") } 
    if (!(await this.doesPropertyExist(identifier, key))) { throw new UserError("Property does not exist") }

    return (await this.getUser(identifier))[key]
}


module.exports.setUserValue = async (identifier, key, value) => {
    if (!(await this.doesUserExist(identifier))) { throw new UserError("User does not exist") } 
    if (!(await this.doesPropertyExist(identifier, key))) { throw new UserError("Property does not exist") }

    await setValue(identifier, key, value)
}

module.exports.doesPropertyExist = async (identifier, key) => {
    if (!(await this.doesUserExist(identifier))) { throw new UserError("User does not exist") } 

    const user = await this.getUser(identifier)
    
    return user.hasOwnProperty(key)
}

module.exports.addUserProperty = async (identifier, key) => {
    if (!(await this.doesUserExist(identifier))) { throw new UserError("User does not exist") } 
    if (await this.doesPropertyExist(identifier, key)) { throw new UserError("Property exists") } 

    await setValue(identifier, key, "null")
}

module.exports.removeUserProperty = async (identifier, key) => {
    if (!(await this.doesUserExist(identifier))) { throw new UserError("User does not exist") } 
    if (!(await this.doesPropertyExist(identifier, key))) { throw new UserError("Property does not exist") }

    const user = await this.getUser(identifier)
    
    const updatedUser = {...user}

    delete updatedUser[key]

    await updateEntry(user, updatedUser)
}

module.exports.doesUserExist = async (identifier) => {
    return true ? await this.getUser(identifier) !== undefined : false
}

module.exports.isUsernameUsed = async (Username) => {
    return await doesValueExist("Username", Username)
}

module.exports.isEmailUsed = async (Email) => {
    return await doesValueExist("Email", Email)
}

module.exports.doesUserHaveAccount = async (identifier) => {
    if (!(await this.doesUserExist(identifier))) { throw new UserError("User does not exist") }
    return (await this.getUser(identifier))["HasAccount"]   
}

module.exports.isPasswordCorrect = async (identifier, Password) => {
    if (!(await this.doesUserExist(identifier))) { throw new UserError("User does not exist") } 
    if (!(await this.doesUserHaveAccount(identifier))) { throw new UserError("No account associated with user") }

    const user = await this.getUser(identifier)

    return (user["HashedPassword"] === Crypto.pbkdf2Sync(Password, user["Salt"], 10000, 64, 'sha512').toString("base64"))
}

module.exports.login = async (identifier, req) => {
    if (!(await this.doesUserExist(identifier))) { throw new UserError("User does not exist") } 
    if (!(await this.doesUserHaveAccount(identifier))) { throw new UserError("No account associated with user") }

    req.session.loggedIn = true
    req.session.UUID = await this.getUserValue(identifier, "UUID")
    req.session.save()
}

module.exports.getHashedToken = async (identifier) => {
    if (!(await this.doesUserExist(identifier))) { throw new UserError("User does not exist") } 
    const user = await this.getUser(identifier)
    
    return Crypto.createHash("sha256").update(user["UUID"]+user["Email"]).digest("hex")
}