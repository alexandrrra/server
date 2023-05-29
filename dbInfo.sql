-- Создание таблицы книг
CREATE TABLE books
(
    book_id    INT AUTO_INCREMENT PRIMARY KEY,
    title      VARCHAR(255) NOT NULL ,
    author     VARCHAR(255) NOT NULL ,
    page_count INT NOT NULL ,
    price      INT NOT NULL ,
    image_url  VARCHAR(255)
);

-- Создание таблицы пользователей
CREATE TABLE users
(
    user_id     INT AUTO_INCREMENT PRIMARY KEY,
    login       VARCHAR(255) NOT NULL ,
    email       VARCHAR(255) NOT NULL ,
    phone       VARCHAR(255),
    password    VARCHAR(255) NOT NULL ,
    first_name  VARCHAR(255) NOT NULL ,
    last_name   VARCHAR(255) NOT NULL ,
    middle_name VARCHAR(255),
    role        VARCHAR(255) NOT NULL
);

-- Создание таблицы заказов
CREATE TABLE orders
(
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id  INT,
    user_id  INT,
    FOREIGN KEY (book_id) REFERENCES books (book_id),
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- Создание таблицы деталей заказов
CREATE TABLE order_details
(
    detail_id  INT AUTO_INCREMENT PRIMARY KEY,
    order_id   INT,
    quantity   INT NOT NULL ,
    address    VARCHAR(255) NOT NULL ,
    order_date DATE NOT NULL ,
    FOREIGN KEY (order_id) REFERENCES orders (order_id)
);

-- Создание таблицы избранного
CREATE TABLE favorites
(
    favorite_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id     INT,
    user_id     INT,
    FOREIGN KEY (book_id) REFERENCES books (book_id),
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- Создание таблицы жанров
CREATE TABLE genres
(
    genre_id   INT AUTO_INCREMENT PRIMARY KEY,
    genre_name VARCHAR(255)
);

-- Создание таблицы издательств
CREATE TABLE publishments
(
    publishment_id   INT AUTO_INCREMENT PRIMARY KEY,
    publishment_name VARCHAR(255)
);

-- Создание связующей таблицы Books_genres
CREATE TABLE books_genres
(
    books_genres_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id         INT,
    genre_id        INT,
    FOREIGN KEY (book_id) REFERENCES books (book_id),
    FOREIGN KEY (genre_id) REFERENCES genres (genre_id)
);

-- Создание связующей таблицы Books_publishments
CREATE TABLE books_publishments
(
    books_publishments_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id               INT,
    publishment_id        INT,
    FOREIGN KEY (book_id) REFERENCES books (book_id),
    FOREIGN KEY (publishment_id) REFERENCES publishments (publishment_id)
);

CREATE TABLE schema_version (
    schema_version INT NOT NULL
);
