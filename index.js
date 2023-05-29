const express = require('express');
const booksRouter = require('./routes/books.routes');
const path = require('path');
const cors = require('cors');
const PORT = process.env.PORT || 8080;

const app = express();
app.use(cors({
    origin: [
        "http://localhost:8081"
    ],
    credentials: true
}));
app.use(express.json());
app.use('/api', booksRouter);
/*app.use('/uploads', express.static(path.join(__dirname, 'uploads')));*/

app.listen(PORT, () => console.log(`server started on port ${PORT}`));