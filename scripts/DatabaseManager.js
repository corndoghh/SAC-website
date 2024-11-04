const fs = require('fs/promises')

const jsonPath = __dirname + "/../json/users.json"

const getIndex = async (entry) => {
    const data = await this.readDatabase()

    return (data.map((user, index) => {
        if (user["Email"] === entry["Email"]) { return index }
    })).filter((x) => x !== undefined)[0]

}

module.exports.doesValueExist = async (key, value) => {
    const data = await this.readDatabase()

    return data.map(user => {
        if (user[key] === value) { return true; } 
    }).filter((x) => x !== undefined)[0] ? true : false
}


module.exports.readDatabase = async () => {
    data = await fs.readFile(jsonPath, "utf-8")
    return JSON.parse(data)
}

module.exports.writeDatabase = async (data) => {
    await fs.writeFile(jsonPath, JSON.stringify(data))
}

module.exports.addEntry = async (newEntry) => {
    const data = await this.readDatabase()
    data.push(newEntry)
    await this.writeDatabase(data);
}

module.exports.deleteEntry = async (entry) => {
    const data = await this.readDatabase()

    const index = await getIndex(entry)

    data.splice(index, 1)

    await this.writeDatabase(data)

}

module.exports.updateEntry = async (oldEntry, newEntry) => {
    const data = await this.readDatabase()

    const index = await getIndex(oldEntry)

    data.splice(index, 1)

    data.push(newEntry)

    await this.writeDatabase(data);
}