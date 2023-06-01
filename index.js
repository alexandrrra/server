const express = require('express');
const booksRouter = require('./routes/books.routes');
const userRouter = require('./routes/user.routes');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 8080;

const app = express();
app.use(cors({
    origin: [
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ],
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use('/api', booksRouter);
app.use('/api', userRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'static')));
app.use(express.static(path.join(__dirname, '../book_store/dist')));

app.listen(PORT, () => console.log(`server started on port ${PORT}`));