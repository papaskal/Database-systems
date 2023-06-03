const mariadb = require("mariadb")
const express = require("express")
const bodyParser = require("body-parser")


const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.set("view engine", "ejs")
app.use(express.static(__dirname + "/public"))


// Connect to mariadb
const pool = mariadb.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "db_2023",
    port: 3306,
    connectionLimit: 5
})


// Function to send queries to db
async function querydb(query) {
    let conn
    console.log(query)
    try {
        conn = await pool.getConnection()
        const rows = await conn.query(query)
        console.log(rows)
        if (conn) conn.end()
        return rows
    } catch (err) {
        console.log(err)
        if (conn) conn.end()
        return (err)
        // } finally {
        //     if (conn) return conn.end()
    }
}


app.listen(3000, () => {
    console.log("Listening on port 3000")
})


// Home page
app.get("/", (req, res) => {
    res.render("index")
})

// -----------------------------------------------------

// Administrator page
app.get("/administrator", async (req, res) => {
    const years = await querydb("SELECT DISTINCT YEAR(borrow_date) AS year FROM borrowing ORDER BY year")
    const categories = await querydb("SELECT * FROM category")
    res.render("administrator/administrator", { years, categories })
})


// q 3.1.1
app.post("/administrator/loans_per_school", async (req, res) => {
    const year = req.body.year
    const month = req.body.month

    const sql = `
        SELECT borrowing.school_id, school.name, COUNT(*) as total_loans
        FROM borrowing
        JOIN school ON borrowing.school_id = school.school_id
        WHERE YEAR(borrow_date) = ${year} AND MONTH(borrow_date) = ${month}
        GROUP BY borrowing.school_id
    `
    const results = await querydb(sql)

    res.render("administrator/loans_per_school", { results })
})


//q 3.1.2
app.post("/administrator/authors_and_teachers", async (req, res) => {
    const categoryId = req.body.category
    const authorsSql = `
        SELECT DISTINCT author.author_id, author.full_name 
        FROM author
        JOIN has_written ON author.author_id = has_written.author_id
        JOIN book ON has_written.isbn = book.isbn
        JOIN is_in_category ON book.isbn = is_in_category.isbn
        WHERE is_in_category.category_id = ${categoryId}
    `
    const authors = await querydb(authorsSql)

    const teachersSql = `
        SELECT user.first_name, user.last_name
        FROM user
        JOIN borrowing ON user.username = borrowing.username
        JOIN book ON borrowing.isbn = book.isbn
        JOIN is_in_category ON book.isbn = is_in_category.isbn
        WHERE user.role = "professor"
        AND is_in_category.category_id = ${categoryId}
        AND borrowing.borrow_date > DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
    `
    const teachers = await querydb(teachersSql)

    res.render("administrator/authors_and_teachers", { authors, teachers })
})


// q 3.1.3
app.post("/administrator/young_teachers", async (req, res) => {
    const sql = `
        SELECT user.username, user.first_name, user.last_name, COUNT(*) AS borrow_count
        FROM user
        JOIN borrowing ON user.username = borrowing.username
        WHERE user.role = "professor"
        AND TIMESTAMPDIFF(YEAR, user.date_of_birth, CURDATE()) < 40
        GROUP BY user.username
        ORDER BY borrow_count DESC
    `
    const teachers = await querydb(sql)
    res.render("administrator/young_teachers", { teachers })
})


// q 3.1.4
app.post("/administrator/authors_no_borrow", async (req, res) => {
    const sql = `
        SELECT author.full_name
        FROM author
        WHERE author.author_id NOT IN (
            SELECT has_written.author_id
            FROM has_written
            JOIN borrowing ON has_written.isbn = borrowing.isbn
        )
    `
    const authors = await querydb(sql)

    res.render("administrator/authors_no_borrow", { authors })
})


// q 3.1.5
app.post("/administrator/loans_per_operator", async (req, res) => {
    const year = req.body.year

    const sql = `
        SELECT borrowing.school_id, user.first_name, user.last_name, school.name as school_name, COUNT(*) as total_loans
        FROM borrowing
        JOIN school ON borrowing.school_id = school.school_id
        JOIN user ON school.school_id = user.school_id
        WHERE YEAR(borrow_date) = ${year} AND user.role = "operator"
        GROUP BY borrowing.school_id
        HAVING total_loans > 20
        ORDER BY total_loans DESC
    `
    const results = await querydb(sql)

    res.render("administrator/loans_per_operator", { results })
})


// q 3.1.6
app.post("/administrator/top_category_pairs", async (req, res) => {
    const sql = `
        SELECT c1.name AS category1, c2.name AS category2, COUNT(*) AS count
        FROM is_in_category ic1
        JOIN is_in_category ic2 ON ic1.isbn = ic2.isbn AND ic1.category_id < ic2.category_id
        JOIN category c1 ON ic1.category_id = c1.category_id
        JOIN category c2 ON ic2.category_id = c2.category_id
        JOIN borrowing b ON ic1.isbn = b.isbn
        GROUP BY ic1.category_id, ic2.category_id
        ORDER BY count DESC
        LIMIT 3
    `
    const categoryPairs = await querydb(sql)

    res.render("administrator/top_category_pairs", { categoryPairs })
})


// q 3.1.7
app.post("/administrator/authors_with_less_books", async (req, res) => {
    const sql = `
        SELECT a.full_name, COUNT(*) AS book_count
        FROM author a
        JOIN has_written hw ON a.author_id = hw.author_id
        GROUP BY a.author_id
        HAVING book_count <= 
        (SELECT MAX(book_count) - 5 FROM 
            (SELECT COUNT(*) AS book_count 
            FROM has_written 
            GROUP BY author_id) AS subquery)
        ORDER BY book_count DESC
    `
    const authors = await querydb(sql)

    res.render("administrator/authors_with_less_books", { authors })
})

// -----------------------------------------------------------

// Operator page
app.get("/operator", async (req, res) => {
    const schools = await querydb("SELECT school_id, name FROM school")
    res.render("operator/operator", { schools })
})


// q 3.2.1
app.post("/operator/search_books", async (req, res) => {
    let { title, category, author, copies, school, order_by, order_dir } = req.body
    title = title || ""
    category = category || ""
    author = author || ""
    copies = copies || 0
    school = school || ""
    order_by = order_by === "author" ? "authors" : "b.title"
    order_dir = order_dir || "ASC"

    const sql = `
        SELECT DISTINCT b.title, 
        GROUP_CONCAT(DISTINCT a.full_name SEPARATOR ", ") AS authors,
        GROUP_CONCAT(DISTINCT c.name SEPARATOR ", ") AS categories,
        shb.num_of_copies AS total_copies, 
        (shb.num_of_copies - IFNULL((SELECT COUNT(*) FROM borrowing WHERE isbn = b.isbn AND return_date IS NULL), 0)) AS available_copies
        FROM book b
        JOIN has_written hw ON b.isbn = hw.isbn
        JOIN author a ON hw.author_id = a.author_id
        JOIN is_in_category ic ON b.isbn = ic.isbn
        JOIN category c ON ic.category_id = c.category_id
        JOIN school_has_book shb ON b.isbn = shb.isbn
        LEFT JOIN borrowing bor ON b.isbn = bor.isbn AND shb.school_id = bor.school_id
        WHERE b.title LIKE "%${title}%" 
        AND c.name LIKE "%${category}%"
        AND a.full_name LIKE "%${author}%"
        AND shb.school_id = "${school}"
        AND shb.num_of_copies >= ${copies}
        GROUP BY b.isbn, shb.school_id
        HAVING available_copies >= 0
        ORDER BY ${order_by} ${order_dir}
    `
    const books = await querydb(sql)

    res.render("operator/search_books", { books })
})


// q 3.2.2
app.post("/operator/search_delays", async function (req, res) {
    let { first_name, last_name, delay_days } = req.body
    first_name = first_name || ""
    last_name = last_name || ""
    delay_days = delay_days || 1

    const sql = `
        SELECT u.username, u.first_name, u.last_name, b.isbn, b.title, s.name as school_name, bor.borrow_date, 
        TIMESTAMPDIFF(DAY, bor.borrow_date, CURDATE()) - 7 as delay_days
        FROM user u 
        JOIN borrowing bor ON u.username = bor.username
        JOIN book b ON bor.isbn = b.isbn
        JOIN school s ON bor.school_id = s.school_id
        WHERE u.first_name LIKE "%${first_name}%"
        AND u.last_name LIKE "%${last_name}%"
        AND bor.return_date IS NULL
        AND TIMESTAMPDIFF(DAY, bor.borrow_date, CURDATE()) - 7 >= ${delay_days}
    `
    const users = await querydb(sql)

    res.render("operator/search_delays", { users })
})


// q 3.3.3
app.post("/operator/search_average_ratings", async (req, res) => {
    let { username, category } = req.body
    username = username || ""
    category = category || ""

    const userSql = `
        SELECT user.username, user.first_name, user.last_name, school.name as school_name, ROUND(AVG(review.rating), 1) as average_rating
        FROM review
        JOIN user ON user.username = review.username
        JOIN school ON school.school_id = user.school_id
        WHERE user.username LIKE "%${username}%"
        GROUP BY user.username
    `
    const userResults = await querydb(userSql)

    const categorySql = `
        SELECT category.category_id, category.name, ROUND(AVG(review.rating), 1) as average_rating
        FROM review
        JOIN book ON book.isbn = review.isbn
        JOIN is_in_category ON is_in_category.isbn = book.isbn
        JOIN category ON category.category_id = is_in_category.category_id
        WHERE category.name LIKE "%${category}%"
        GROUP BY category.category_id
    `
    const categoryResults = await querydb(categorySql)

    res.render("operator/average_ratings_results", { userResults, categoryResults })
})


// Add new user
app.post("/operator/new_user", async (req, res) => {
    const { username, first_name, last_name, date_of_birth, password, role, school } = req.body

    const sql = `
        INSERT INTO user (username, first_name, last_name, date_of_birth, PASSWORD, role, school_id) 
        VALUES ("${username}", "${first_name}", "${last_name}", "${date_of_birth}", "${password}", "${role}", "${school}")
        `
    const results = await querydb(sql)

    if ("text" in results) res.send(results.text)
    else res.send("Success")
})


// ------------------------------------------------------------------

// User page
app.get("/user", async (req, res) => {
    const users = await querydb("SELECT username FROM user ORDER BY username")
    res.render("user/user", { users })
})


// q 3.3.1
app.post("/user/search_books", async (req, res) => {
    let { title, category, author } = req.body
    title = title || ""
    category = category || ""
    author = author || ""

    const sql = `
        SELECT book.isbn, book.title, 
        GROUP_CONCAT(DISTINCT author.full_name SEPARATOR ", ") AS authors,
        GROUP_CONCAT(DISTINCT category.name SEPARATOR ", ") AS categories
        FROM book
        JOIN is_in_category ON book.isbn = is_in_category.isbn
        JOIN category ON category.category_id = is_in_category.category_id
        JOIN has_written ON book.isbn = has_written.isbn
        JOIN author ON author.author_id = has_written.author_id
        WHERE book.title LIKE "%${title}%" AND category.name LIKE "%${category}%" AND author.full_name LIKE "%${author}%"
        GROUP BY book.isbn
    `
    const results = await querydb(sql)

    res.render("user/book_results", { results })
})


// View book info
app.post("/user/book_info", async (req, res) => {
    const { isbn } = req.body

    // View book info
    const bookInfoSql = `
        SELECT book.isbn, book.title, book.num_of_pages, book.summary, book.image_url, publisher.name AS publisher, 
        language.name AS language, GROUP_CONCAT(DISTINCT author.full_name SEPARATOR ", ") AS authors,
        GROUP_CONCAT(DISTINCT category.name SEPARATOR ", ") AS categories,
        GROUP_CONCAT(DISTINCT keyword.name SEPARATOR ", ") AS keywords,
        IFNULL(ROUND(AVG(review.rating), 1) , "N/A") AS avg_rating
        FROM book
        JOIN has_written ON book.isbn = has_written.isbn
        JOIN author ON author.author_id = has_written.author_id
        JOIN is_in_category ON book.isbn = is_in_category.isbn
        JOIN category ON category.category_id = is_in_category.category_id
        LEFT JOIN has_keyword ON book.isbn = has_keyword.isbn
        LEFT JOIN keyword ON keyword.keyword_id = has_keyword.keyword_id
        LEFT JOIN review ON book.isbn = review.isbn
        JOIN language ON book.language_id = language.language_id
        JOIN publisher ON book.publisher_id = publisher.publisher_id
        WHERE book.isbn = "${isbn}"
        GROUP BY book.isbn
    `
    const book = await querydb(bookInfoSql)

    // View schools that have the book
    const availableSchoolsSql = `
        SELECT school.school_id, school.name, school_has_book.num_of_copies AS total_copies, 
            (school_has_book.num_of_copies - IFNULL((SELECT COUNT(*)
            FROM borrowing 
            WHERE borrowing.isbn = "${isbn}" AND borrowing.school_id = school.school_id AND borrowing.return_date IS NULL), 0)) AS available_copies
        FROM school
        JOIN school_has_book ON school.school_id = school_has_book.school_id
        WHERE school_has_book.isbn = "${isbn}" AND school_has_book.num_of_copies > 0
    `
    const schools = await querydb(availableSchoolsSql)

    const usersSql = `
        SELECT username, first_name, last_name 
        FROM user
        `
    const users = await querydb(usersSql)

    res.render("user/book_info", { book: book[0], schools, users })
})


// View reviews
app.post("/user/book_reviews", async (req, res) => {
    const { isbn } = req.body

    const reviewsSql = `
        SELECT *
        FROM review
        WHERE isbn = "${isbn}"
    `
    const reviews = await querydb(reviewsSql)

    const usersSql = `
    SELECT *
    FROM user
    `
    const users = await querydb(usersSql)

    res.render("user/book_reviews", { reviews, users, isbn })
})


// Add new review
app.post("/user/book_reviews/add_review", async (req, res) => {
    let { isbn, username, rating, review_text } = req.body
    review_text = review_text || ""

    const sql = `INSERT INTO review (username, isbn, rating, review_text) VALUES ("${username}", "${isbn}", ${rating}, "${review_text}")`
    const results = await querydb(sql)

    if ("text" in results) res.send(results.text)
    else res.send("Success")
})


// Borrow or reserve a book
app.post("/user/book_request", async (req, res) => {
    const { isbn, user, school, action } = req.body

    let sql = ""
    if (action === "reserve") {
        sql = `
            INSERT INTO reservation (isbn, username, school_id, reservation_date)
            VALUES ("${isbn}", "${user}", "${school}", CURDATE())
        `
    } else if (action === "borrow") {
        sql = `
            INSERT INTO borrowing (isbn, username, school_id, borrow_date)
            VALUES ("${isbn}", "${user}", "${school}", CURDATE())
        `
    }

    const results = await querydb(sql)
    if ("text" in results) res.send(results.text)
    else res.send("Success")
})

// View user info
app.post("/user/user_info", async (req, res) => {
    const { username } = req.body

    // View user info
    const userSql = `
        SELECT user.*, school.name AS school_name 
        FROM user 
        LEFT JOIN school ON user.school_id = school.school_id 
        WHERE user.username = "${username}"
    `
    const user = await querydb(userSql)

    // View user's borrowings
    const borrowingsSql = `
        SELECT book.isbn, book.title, school.name AS school_name, borrowing.borrow_date, borrowing.return_date
        FROM borrowing
        JOIN book ON book.isbn = borrowing.isbn
        JOIN school ON school.school_id = borrowing.school_id
        WHERE borrowing.username = "${username}"
        ORDER BY borrowing.borrow_date DESC
        `
    const borrowings = await querydb(borrowingsSql)

    // View user's reservations
    const reservationsSql = `
        SELECT book.isbn, book.title, school.name AS school_name, reservation.reservation_date, reservation.cancel_date
        FROM reservation
        JOIN book ON book.isbn = reservation.isbn
        JOIN school ON school.school_id = reservation.school_id
        WHERE reservation.username = "${username}"
        ORDER BY reservation.reservation_date DESC
        `
    const reservations = await querydb(reservationsSql)

    res.render("user/user_info", { user: user[0], borrowings, reservations })
})

// Delete user
app.post("/user/user_info/delete", async (req, res) => {
    const { username } = req.body

    const sql = `DELETE FROM user WHERE username = "${username}"`
    const results = await querydb(sql)

    if ("text" in results) res.send(results.text)
    else res.send(`Deleted ${username}`)
})

app.post("/user/user_info/complete_borrowing", async (req, res) => {
    const { username, isbn } = req.body

    const sql = `
        UPDATE borrowing 
        SET return_date = CURDATE() 
        WHERE username = "${username}" 
        AND isbn = "${isbn}" 
        AND return_date IS NULL
        `
    const results = await querydb(sql)

    if ("text" in results) res.send(results.text)
    else res.send("Success")
})

// Cancel reservation
app.post("/user/user_info/cancel_reservation", async (req, res) => {
    const { username, isbn } = req.body

    const sql = `UPDATE reservation 
                SET cancel_date = CURDATE() 
                WHERE username = "${username}" AND isbn = "${isbn}" AND cancel_date > CURDATE()`
    await querydb(sql)

    if ("text" in results) res.send(results.text)
    else res.send("Success")
})

// Update user info page
app.get("/user/user_info/update", async (req, res) => {
    const { username } = req.query

    const userSql = `
        SELECT * 
        FROM user 
        WHERE username = "${username}"
        `
    const user = await querydb(userSql)

    const schoolsSql = `
        SELECT * 
        FROM school
        `
    const schools = await querydb(schoolsSql)

    res.render("user/update_user_info", { user: user[0], schools })
})

//Update user info req
app.post("/user/user_info/update", async (req, res) => {
    const { username, first_name, last_name, password, school } = req.body

    const sql = `
        UPDATE user 
        SET first_name = "${first_name}", last_name = "${last_name}", PASSWORD = "${password}", school_id = "${school}" 
        WHERE username = "${username}"
        `
    const results = await querydb(sql)

    if ("text" in results) res.send(results.text)
    else res.send("Success")
})
