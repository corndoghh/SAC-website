const app = require("express")()

const PORT = 3000

app.listen(PORT, () => {
    console.log(`Listeing on port ${PORT}`)
})


app.get("/", (req, res) => {
    res.statusCode = 200
    res.send("All good")
})