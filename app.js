const express = require("express")
const expressSession = require('express-session')
const { doesUserExist, addUser, deleteUser, createUserAccount, isPasswordCorrect, doesUserHaveAccount, login, getUser, getHashedToken, setUserValue, getUserValue, doesPropertyExist, setUserPassword, removeUserProperty } = require('./scripts/UserManager')
const { sendConfirmationEmail, sendForgotPasswordEmail } = require("./scripts/EmailManager")

const app = express()
const PORT = 3000

app.set("views engine", "ejs")

app.use(express.static("public"))
app.use(express.urlencoded())
app.use(expressSession({
    secret: "7b6eZMeovUyQfFiKNSiZice0XIYa6",
    cookie: {},
    resave: false,
    saveUninitialized: false
}))

app.use((req, res, next) => {
    if (!req.session.views) {
        req.session.loggedIn = false;
        req.session.views = 0;
    }
    
    req.session.views += 1;

    if (req.session.loggedIn) {
        console.log(`Logged in UUID ${req.session.UUID}`)
    }

    req.session.save();
    next()
})

app.listen(PORT, () => {
    console.log(`Listeing on port ${PORT}`)
})

//functions

const authentication = async (req, res) => {
    if (req.session.loggedIn) { console.log("already logged in"); return }
    const {token, email, tempCode} = req.query

    const type = req.url === "/login" ? "l" : req.url === "/sign-up" ? "s" : req.url === "/forgot-password" ? "f" : "r"

    if (
        type === "r" && 
        ((token === undefined || email === undefined || tempCode === undefined) ||
        await getHashedToken(email) !== token ||
        !await doesPropertyExist(email, "tempCode") ||
        await getUserValue(email, "tempCode") !== tempCode)
    ) { res.send("Invalid password reset link"); return }

    res.render("login-signup.ejs", {type, token, email, tempCode})
}

const removeUser = async (req, res) => {
    await deleteUser(req.session.UUID)
    req.session.destroy()

    //DO TO what to do with clients after account deletion
    res.send("Account deleted successfully")
}

const logout = (req, res) => {
    req.session.destroy()
    res.redirect("/")
}

const reqAuth = async (req, res, next) => {
    if (req.session.loggedIn && await doesUserExist(req.session.UUID)) { next(); return }
    res.redirect("/login")
}

const reqNoAuth = (req, res, next) => {
    if (!req.session.loggedIn) { next(); return }
    res.send("Error Already Logged In")
}

const reqData = (req, res, next) => {
    const isGetMethod = req.method === 'GET';
    const hasData = isGetMethod ? Object.keys(req.query).length > 0 : Object.keys(req.body).length > 0;

    if (!hasData) {
        res.send("No data sent");
        return;
    }
    next();
}

const reqUser = async (req, res, next) => {

    if ((await Promise.all((Object.values(req.body).length !== 0 ? Object.values(req.body) : Object.values(req.query).length !== 0 ? Object.values(req.query) : [req.session.UUID]).map(async (x) => {
        if (await doesUserExist(x)) { return true }
    }))).filter((x) => x !== undefined)[0]) { next(); return }
    
    res.send("User does not exist");

    //if (!(await doesUserExist(email))) { res.send("User does not exist"); return }

    
}

//get requests

app.get('/', (req, res) => {
    res.send("Hello")
})

app.get('/about-us', (req, res) => {

})

app.get('/goal1', (req, res) => {

})

app.get('/goal2', (req, res) => {
    
})

app.get('/goal3', (req, res) => {
    
})

app.get('/sign-up', reqNoAuth, authentication)
app.get('/login', reqNoAuth, authentication)
app.get('/forgot-password', reqNoAuth, authentication)
app.get('/reset-password', reqNoAuth, authentication)

app.get('/FAQ', (req, res) => {
    
})

app.get('/profile', reqAuth, async (req, res) => {
    res.send(`Hello ${(await getUser(req.session.UUID))["FirstName"]}`)
})

app.get('/confirm', reqData, reqUser, async (req, res) => {
    const {token, email} = req.query
    
    const user = await getUser(email)
    if (user["IsEmailVerified"]) { res.send("Email already verified"); return }
    if ((await getHashedToken(email)) !== token) { res.send("Invalid token"); return }

    await setUserValue(email, "IsEmailVerified", true)

    //DO TO what to do with clients after email verification
    res.send("Email verified")
})

app.get('/unsubscribe', reqData, reqUser, async (req, res) => {
    const {token, email} = req.query
    //if (!(await doesUserExist(email))) { res.send("User does not exist"); return }

    const user = await getUser(email)
    if ((await getHashedToken(email)) !== token) { res.send("Invalid token"); return }

    await deleteUser(email)
    req.session.destroy()

    //DO TO what to do with clients after account deletion
    res.send("User deleted")
})

app.get("/delete-user", reqAuth, reqUser, removeUser)

app.get('/logout', reqAuth, reqUser, logout)


//404 to catch all unregistered paths

app.get('*', (req, res) => {
    res.status(404).send('404 not found')
})

//post requests

app.post("/auth", reqData, reqNoAuth, reqUser, async (req, res) => {
    const {Username, Email, Password} = req.body
    console.log(req.body)

    if (!((Username || Email) && Password)) { res.send("Invalid data submitted"); return }
    const identifier = Username ? Username : Email

    if (!(await doesUserHaveAccount(identifier)) || !(await isPasswordCorrect(identifier, Password))) { res.send("Incorrect Username or Password"); return } 

    await login(identifier, req)

    console.log(`Successfully logged in as ${identifier} using password ${Password}`)

    //DO TO what to do with clients after successfull authentication...
    res.redirect("/")
})

app.post('/forgot-password', reqData, reqNoAuth, reqUser, async (req, res) => {
    const { email } = req.body

    await sendForgotPasswordEmail(email)

    //DO TO what to do with clients after password reset email sent
    res.send("Reset password email sent")
})

app.post('/reset-password', reqData, reqNoAuth, reqUser, async (req, res) => {
    const {token, email, tempCode, Password} = req.body
    console.log(req.body)

    const user = await getUser(email)

    if (
        await getHashedToken(email) !== token ||
        !await doesPropertyExist(email, "tempCode") ||
        await getUserValue(email, "tempCode") !== tempCode
    ) { res.send("Invalid date sent"); return }

    await removeUserProperty(email, "tempCode")
    await setUserPassword(email, Password)

    //DO TO what to do with clients after password reset
    res.send("Password Reset")
})

app.post("/add-account", reqData, reqNoAuth, reqUser, async (req, res) => {
    const {Email, Username, Password} = req.body
    if (Email === undefined || Username === undefined || Password === undefined) { res.send("Invalid account creation request"); return }
    if (await doesUserHaveAccount(Email)) { res.send("User already has an account"); return }

    await createUserAccount(Email, Username, Password)

    await login(Email, req)

    //DO TO what to do with clients after account created
    res.send("Account has been created")
})

app.post("/sign-up", reqData, reqNoAuth, reqUser, async (req, res) => {
    let {Email, FirstName, MiddleNames, LastName, Comment, Username, Password} = req.body
    if (Email === undefined || FirstName === undefined || LastName === undefined) { res.send("Invalid sign-up request"); return }

    MiddleNames = MiddleNames ? MiddleNames : []

    await addUser(Email, FirstName, MiddleNames, LastName, Comment)

    await sendConfirmationEmail(Email)

    if (Username === undefined || Password === undefined) { res.send("You are signed up for the newsletter"); return }

    await createUserAccount(Email, Username, Password)

    await login(Email, req)

    //DO TO what to do with clients after account created
    res.send("You are now signed up for the newsletter and an account")
})

app.post("/delete-user", reqAuth, reqUser, removeUser)

app.post('/logout', reqAuth, reqUser, logout)

//404 to catch all unregistered paths

app.post("*", (req, res) => {
    res.status(404).send("404 not found")
})

//testing


const test = async () => {
    // console.log(await getUser('redacted@expunged.eu'))

    // console.log(await getUserValue('the-caretaker', 'HashedPassword'))

    // await setUserValue("the-caretaker", "Email", "personal@harleyhugh.es")

    // console.log(await getUserValue('the-caretaker', 'Email'))

    // await setUserValue("the-caretaker", "Email", "RANDOM BS")

    // console.log(await getUserValue('the-caretaker', 'Email'))

    // await setUserValue("the-caretaker", "Email", "redacted@expunged.eu")

    // console.log(await doesUserExist("the-caretaker"))

    // await removeUserProperty("redacted@expunged.eu", "isDog")

    // await addUser("null@expunged.eu", "Bob", ["Sam", "Another", "Name"], "Smith", "MHM")

    // await addUserProperty("null@expunged.eu", "isCool")

    // await setUserValue("redacted@expunged.eu", "isCool", true)
    
    // await addUserProperty("redacted@expunged.eu", "isCool")

    // await removeUserProperty("redacted@expunged.eu", "isCool")

    // if (await doesUserExist("personal@harleyhugh.es")) {
    //     await deleteUser("personal@harleyhugh.es")
    // }


    // await createUserAccount("null@expunged.eu", "corndoghh", "password123").catch(e => {
    //     console.log(e)
    // })

    // console.log(await isPasswordCorrect("redacted@expunged.eu", "Whylifewhy1"))
}

test()