const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const checkToken = (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    return res.status(401).send("Access denied...");
  }

  try {
    const verified = jwt.verify(token, process.env.SECRET_KEY);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(400).send("Inavlid Token");
  }
};

const app = express();

const database = mysql.createConnection({
  database: "library",
  host: "localhost",
  user: "root",
  password: "",
  port: "3306",
});

database.connect((err) => {
  if (err) throw err;
  console.log("Connected to database successfully...");
});

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Welcome to KDA Library");
});

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const newEmployee = {
    name,
    email,
    password: hashedPassword,
  };
  const sql = "INSERT INTO employee SET ?";

  database.query(sql, newEmployee, (err, result) => {
    if (err) throw err;
    res.send("Employee registered...");
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const sql = `SELECT * FROM employee WHERE email='${email}'`;
  database.query(sql, async (err, result) => {
    if (err) throw err;
    if (!result.length) {
      return res.status(404).json({ error: "Invalid email" });
    } else {
      const passwordCorrect = await bcrypt.compare(
        password,
        result[0].password
      );
      if (!passwordCorrect) {
        return res.status(400).json({ error: "Invalid password" });
      }

      //Create a token
      const { name, email } = result[0];
      const token = jwt.sign({ name, email }, process.env.SECRET_KEY);
      res.header("auth-token", token).send(token);
    }
  });
});

app.get("/api/books", checkToken, (req, res) => {
  const sql = "SELECT * FROM books";

  database.query(sql, (err, result) => {
    if (err) throw err;
    res.json({ nb_books: result.length, books: result });
  });
});

app.get("/api/books/:id", (req, res) => {
  const sql = `SELECT * FROM books WHERE id=${req.params.id}`;

  database.query(sql, (err, result) => {
    if (err) throw err;
    res.json({ book: result });
  });
});

app.post("/api/books", (req, res) => {
  const { title, author } = req.body;
  const newBook = { title, author };
  const sql = "INSERT INTO books SET ?";

  database.query(sql, newBook, (err, result) => {
    if (err) throw err;
    res.json({ message: "New book registered" });
  });
});

app.listen(4000, () => console.log("Server is running on port 4000"));
