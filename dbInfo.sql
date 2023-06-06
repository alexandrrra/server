-- Создание таблицы книг
CREATE TABLE IF NOT EXISTS books
(
    book_id    INT AUTO_INCREMENT PRIMARY KEY,
    title      VARCHAR(255) NOT NULL ,
    author     VARCHAR(255) NOT NULL ,
    page_count INT NOT NULL ,
    price      INT NOT NULL ,
    image_url  VARCHAR(255)
);

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users
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
CREATE TABLE IF NOT EXISTS orders
(
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id  INT,
    user_id  INT,
    FOREIGN KEY (book_id) REFERENCES books (book_id),
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- Создание таблицы деталей заказов
CREATE TABLE IF NOT EXISTS order_details
(
    detail_id  INT AUTO_INCREMENT PRIMARY KEY,
    order_id   INT,
    quantity   INT NOT NULL ,
    address    VARCHAR(255) NOT NULL ,
    order_date DATE NOT NULL ,
    FOREIGN KEY (order_id) REFERENCES orders (order_id)
);

-- Создание таблицы избранного
CREATE TABLE IF NOT EXISTS favorites
(
    favorite_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id     INT,
    user_id     INT,
    FOREIGN KEY (book_id) REFERENCES books (book_id),
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- Создание таблицы жанров
CREATE TABLE IF NOT EXISTS genres
(
    genre_id   INT AUTO_INCREMENT PRIMARY KEY,
    genre_name VARCHAR(255)
);

-- Создание таблицы издательств
CREATE TABLE IF NOT EXISTS publishments
(
    publishment_id   INT AUTO_INCREMENT PRIMARY KEY,
    publishment_name VARCHAR(255)
);

-- Создание связующей таблицы Books_genres
CREATE TABLE IF NOT EXISTS books_genres
(
    books_genres_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id         INT,
    genre_id        INT,
    FOREIGN KEY (book_id) REFERENCES books (book_id),
    FOREIGN KEY (genre_id) REFERENCES genres (genre_id)
);

-- Создание связующей таблицы Books_publishments
CREATE TABLE IF NOT EXISTS books_publishments
(
    books_publishments_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id               INT,
    publishment_id        INT,
    FOREIGN KEY (book_id) REFERENCES books (book_id),
    FOREIGN KEY (publishment_id) REFERENCES publishments (publishment_id)
);

CREATE TABLE IF NOT EXISTS schema_version (
    schema_version INT NOT NULL
);

CREATE TABLE IF NOT EXISTS products
(
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id  INT,
    user_id  INT,
    quantity INT NOT NULL ,
    FOREIGN KEY (book_id) REFERENCES books (book_id),
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);

CREATE TABLE IF NOT EXISTS feedbacks
(
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    rating  INT,
    body    VARCHAR(255),
    book_id INT,
    user_id INT,
    FOREIGN KEY (book_id) REFERENCES books (book_id),
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);

DROP PROCEDURE IF EXISTS init;
DELIMITER //
CREATE PROCEDURE init()
BEGIN
    DECLARE ver INT;

    SELECT schema_version FROM schema_version INTO ver;
    IF ver IS NULL THEN
        SET ver = 1;
        INSERT INTO schema_version (schema_version) VALUES (ver);
    END IF;

    IF ver = 1 THEN
        ALTER TABLE users CHANGE COLUMN password password_hash VARCHAR(255) NOT NULL DEFAULT '';
        ALTER TABLE users ADD COLUMN one_time_password_hash VARCHAR(255) NOT NULL DEFAULT '';
        ALTER TABLE users ADD COLUMN token VARCHAR(255) NOT NULL DEFAULT '';
        ALTER TABLE users ADD UNIQUE (login);
        ALTER TABLE users ADD UNIQUE (email);
        ALTER TABLE users ADD UNIQUE (phone);
        SET ver = ver + 1;
    END IF;

    IF ver = 2 THEN
        ALTER TABLE users MODIFY COLUMN email VARCHAR(255);
        ALTER TABLE users MODIFY COLUMN phone VARCHAR(255);
        SET ver = ver + 1;
    END IF;

    UPDATE schema_version SET schema_version = ver;
END //
DELIMITER ;
CALL init();
