DROP DATABASE IF EXISTS db_2023;


CREATE DATABASE db_2023;


USE db_2023;


CREATE TABLE school (
    school_id INT UNSIGNED AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    street_name VARCHAR(255) NOT NULL,
    street_number INT NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    email VARCHAR(255) NOT NULL,
    director_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (school_id)
);


CREATE TABLE language (
    language_id INT UNSIGNED AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    PRIMARY KEY (language_id)
);


CREATE TABLE publisher(
    publisher_id INT UNSIGNED AUTO_INCREMENT,
    name VARCHAR(255),
    PRIMARY KEY(publisher_id)
);


CREATE TABLE book (
    isbn VARCHAR(20),
    title VARCHAR(255) NOT NULL,
    num_of_pages INT NOT NULL,
    summary TEXT NOT NULL,
    image_url VARCHAR(255) NOT NULL DEFAULT 'placeholder',
    publisher_id INT UNSIGNED,
    language_id INT UNSIGNED,
    PRIMARY KEY (isbn),
    FOREIGN KEY (language_id) REFERENCES language(language_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (publisher_id) REFERENCES publisher(publisher_id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE category(
    category_id INT UNSIGNED AUTO_INCREMENT,
    name VARCHAR(255),
    PRIMARY KEY(category_id)
);


CREATE TABLE keyword(
    keyword_id INT UNSIGNED AUTO_INCREMENT,
    name VARCHAR(255),
    PRIMARY KEY(keyword_id)
);


CREATE TABLE is_in_category(
    isbn VARCHAR(20),
    category_id INT UNSIGNED,
    PRIMARY KEY(isbn, category_id),
    FOREIGN KEY(isbn) REFERENCES book(isbn) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES category(category_id) ON UPDATE CASCADE ON DELETE CASCADE
);


CREATE TABLE has_keyword(
    isbn VARCHAR(20),
    keyword_id INT UNSIGNED,
    PRIMARY KEY(isbn, keyword_id),
    FOREIGN KEY(isbn) REFERENCES book(isbn) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY(keyword_id) REFERENCES keyword(keyword_id) ON UPDATE CASCADE ON DELETE CASCADE
);


CREATE TABLE author(
    author_id INT UNSIGNED AUTO_INCREMENT,
    full_name VARCHAR(255),
    PRIMARY KEY(author_id)
);


CREATE TABLE has_written(
    author_id INT UNSIGNED,
    isbn VARCHAR(20),
    PRIMARY KEY(author_id, isbn),
    FOREIGN KEY(author_id) REFERENCES author(author_id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY(isbn) REFERENCES book(isbn) ON UPDATE CASCADE ON DELETE CASCADE
);


CREATE TABLE user (
    username VARCHAR(256),
    password VARCHAR(255) NOT NULL,
    role ENUM(
        'administrator',
        'operator',
        'student',
        'professor'
    ) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    school_id INT UNSIGNED,
    PRIMARY KEY (username),
    FOREIGN KEY (school_id) REFERENCES school(school_id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE school_has_book (
    school_id INT UNSIGNED NOT NULL,
    isbn VARCHAR(20) NOT NULL,
    num_of_copies INT UNSIGNED NOT NULL,
    PRIMARY KEY (school_id, isbn),
    FOREIGN KEY (school_id) REFERENCES school(school_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (isbn) REFERENCES book(isbn) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE borrowing (
    school_id INT UNSIGNED NOT NULL,
    username VARCHAR(256) NOT NULL,
    isbn VARCHAR(20) NOT NULL,
    borrow_date DATE NOT NULL DEFAULT CURDATE(),
    return_date DATE,
    PRIMARY KEY (school_id, username, isbn, borrow_date),
    FOREIGN KEY (school_id) REFERENCES school(school_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (username) REFERENCES user(username) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (isbn) REFERENCES book(isbn) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT valid_return_date CHECK (return_date IS NULL OR return_date >= borrow_date)
);


CREATE TABLE reservation (
    school_id INT UNSIGNED NOT NULL,
    username VARCHAR(256) NOT NULL,
    isbn VARCHAR(20) NOT NULL,
    reservation_date DATE NOT NULL DEFAULT CURDATE(),
    cancel_date DATE DEFAULT DATE_ADD(reservation_date, INTERVAL 1 WEEK),
    PRIMARY KEY (school_id, username, isbn, reservation_date),
    FOREIGN KEY (school_id) REFERENCES school(school_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (username) REFERENCES user(username) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (isbn) REFERENCES book(isbn) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT valid_cancel_date CHECK (cancel_date >= reservation_date)
);


CREATE TABLE review (
    username VARCHAR(256) NOT NULL,
    isbn VARCHAR(20) NOT NULL,
    rating INT UNSIGNED NOT NULL,
    review_text TEXT,
    PRIMARY KEY (username, isbn),
    FOREIGN KEY (username) REFERENCES user(username) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (isbn) REFERENCES book(isbn) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT valid_rating CHECK (rating BETWEEN 1 AND 5)
);