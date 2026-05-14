const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

const SECRET = "tajneheslo";

const usersPath = path.join(__dirname, "users.json");
const scoresPath = path.join(__dirname, "scores.json");

app.post("/api/register", async (req, res) => {

    const { username, password } = req.body;

    const users = JSON.parse(fs.readFileSync(usersPath));

    const existingUser = users.find(u => u.username === username);

    if (existingUser) {
        return res.status(400).json({
            message: "Uživatel existuje"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    users.push({
        username,
        password: hashedPassword
    });

    fs.writeFileSync(
        usersPath,
        JSON.stringify(users, null, 2)
    );

    res.json({
        message: "Registrace úspěšná"
    });
});

app.post("/api/login", async (req, res) => {

    const { username, password } = req.body;

    const users = JSON.parse(fs.readFileSync(usersPath));

    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(400).json({
            message: "Uživatel neexistuje"
        });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
        return res.status(400).json({
            message: "Špatné heslo"
        });
    }

    const token = jwt.sign(
        { username },
        SECRET
    );

    res.json({
        token,
        username
    });
});

app.post("/api/score", (req, res) => {

    const { username, score, mode } = req.body;

    const scores = JSON.parse(fs.readFileSync(scoresPath));

    scores.push({
        username,
        score,
        mode
    });

    fs.writeFileSync(
        scoresPath,
        JSON.stringify(scores, null, 2)
    );

    console.log("SCORE ULOŽENO:", username, score);

    res.json({
        message: "Score uloženo"
    });
});

app.get("/api/leaderboard/:mode", (req, res) => {

    const mode = req.params.mode;

    const scores = JSON.parse(fs.readFileSync(scoresPath));

    const filtered = scores
        .filter(s => s.mode === mode)
        .sort((a, b) => a.score - b.score)
        .slice(0, 10);

    res.json(filtered);
});

app.listen(3000, () => {
    console.log("Server běží na portu 3000");
});