const express = require("express")
const app = express()


app.use(express.static("/public"))

app.set("views engine", "ejs")

const PORT = 3000

app.listen(PORT, () => {
    console.log(`Listeing on port ${PORT}`)
})


app.get("/", (req, res) => {
    res.statusCode = 200
    res.render("home.ejs", {parm: "hebhe"})
})
