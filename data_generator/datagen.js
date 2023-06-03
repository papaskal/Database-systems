const fs = require("fs")
const { faker } = require("@faker-js/faker")

num_of_schools = 10
num_of_books = 1500
num_of_students = 1000
num_of_professors = 500
num_of_categories = 200
num_of_authors = 500
num_of_publishers = 300
num_of_keywords = 3000
num_of_borrowings = 1500
num_of_reservations = 1500
num_of_unreturned = 20
num_of_reviews = 2000

isbn = []
username = []
languages = ["english", "greek", "spanish", "french", "italian", "german"]
num_of_languages = languages.length

let sql = "USE db_2023;\n"
sql += "DELETE FROM school;\n"
sql += "DELETE FROM language;\n"
sql += "DELETE FROM book;\n"
sql += "DELETE FROM user;\n"
sql += "DELETE FROM school_has_book;\n"
sql += "DELETE FROM reservation;\n"
sql += "DELETE FROM review;\n"
sql += "DELETE FROM category;\n"
sql += "DELETE FROM keyword;\n"
sql += "DELETE FROM borrowing;\n"
sql += "DELETE FROM reservation;\n"
sql += "DELETE FROM category;\n"
sql += "DELETE FROM author;\n"
sql += "DELETE FROM publisher;\n"
sql += "DELETE FROM has_written;\n"
sql += "DELETE FROM is_in_category;\n"
sql += "DELETE FROM has_keyword;\n"

// Generate schools
for (let i = 0; i < num_of_schools; i++) {
  sql += `INSERT IGNORE INTO school (name, city, street_name, street_number, zip_code, phone_number, email, director_name) VALUES ("${faker.company.name()}", "${faker.location.city()}", "${faker.location.street()}", ${faker.number.int({ min: 1, max: 300 })}, "${faker.location.zipCode()}", "${faker.phone.number()}", "${faker.internet.email()}", "${faker.person.fullName()}");\n`
}

for (const lang of languages) {
  sql += `INSERT IGNORE INTO language (name) VALUES ("${lang}");\n`
}

// Generate publishers
for (let i = 0; i < num_of_publishers; i++) {
  sql += `INSERT IGNORE INTO publisher (name) VALUES ("${faker.company.name()}");\n`
}

// Generate books
for (let i = 0; i < num_of_books; i++) {
  isbn.push(faker.string.numeric(10))
  sql += `INSERT IGNORE INTO book (isbn, title, num_of_pages, summary, image_url, publisher_id, language_id) VALUES ("${isbn[i]}", "${faker.lorem.words({ min: 1, max: 5 })}", ${faker.number.int({ min: 50, max: 1000 })}, "${faker.lorem.paragraph()}", "${faker.image.url()}", ${faker.number.int({ min: 1, max: num_of_publishers })}, ${faker.number.int({ min: 1, max: num_of_languages })});\n`
}

// Generate students
for (let i = 0; i < num_of_students; i++) {
  username.push(faker.internet.userName())
  sql += `INSERT IGNORE INTO user (username, password, role, first_name, last_name, date_of_birth, school_id) VALUES ("${username[i]}", "${faker.internet.password()}", "student", "${faker.person.firstName()}", "${faker.person.lastName()}", "${faker.date.birthdate({ min: 10, max: 20, mode: 'age' }).toISOString().slice(0, 10)}", ${faker.number.int({ min: 1, max: num_of_schools })});\n`
}

// Generate teachers
for (let i = 0; i < num_of_professors; i++) {
  username.push(faker.internet.userName())
  sql += `INSERT IGNORE INTO user (username, password, role, first_name, last_name, date_of_birth, school_id) VALUES ("${username[i + num_of_students]}", "${faker.internet.password()}", "professor", "${faker.person.firstName()}", "${faker.person.lastName()}", "${faker.date.birthdate({ min: 20, max: 65, mode: 'age' }).toISOString().slice(0, 10)}", ${faker.number.int({ min: 1, max: num_of_schools })});\n`
}

// Generate administrator
sql += `INSERT IGNORE INTO user (username, password, role, first_name, last_name, date_of_birth, school_id) VALUES ("${faker.internet.userName()}", "${faker.internet.password()}", "administrator", "${faker.person.firstName()}", "${faker.person.lastName()}", "${faker.date.birthdate({ min: 20, max: 65, mode: 'age' }).toISOString().slice(0, 10)}", null);\n`

// Generate 1 operator per school
for (let i = 1; i <= num_of_schools; i++) {
  sql += `INSERT IGNORE INTO user (username, password, role, first_name, last_name, date_of_birth, school_id) VALUES ("${faker.internet.userName()}", "${faker.internet.password()}", "operator", "${faker.person.firstName()}", "${faker.person.lastName()}", "${faker.date.birthdate({ min: 20, max: 65, mode: 'age' }).toISOString().slice(0, 10)}", ${i});\n`
}

// Generate borrowings
for (let i = 0; i < num_of_borrowings; i++) {
  const d = faker.date.past({ years: 3, refDate: '2023-05-20T00:00:00.000Z' })
  sql += `INSERT IGNORE INTO borrowing (school_id, username, isbn, borrow_date, return_date) VALUES (${faker.number.int({ min: 1, max: num_of_schools })}, "${username[faker.number.int({ min: 1, max: num_of_students + num_of_professors }) - 1]}", "${isbn[faker.number.int({ min: 1, max: num_of_books }) - 1]}", "${d.toISOString().slice(0, 10)}", "${faker.date.soon({ days: 10, refDate: d }).toISOString().slice(0, 10)}");\n`
}

for (let i = 0; i < num_of_unreturned; i++) {
  const d = faker.date.recent({ days: 10 })
  sql += `INSERT IGNORE INTO borrowing (school_id, username, isbn, borrow_date, return_date) VALUES (${faker.number.int({ min: 1, max: num_of_schools })}, "${username[faker.number.int({ min: 1, max: num_of_students + num_of_professors }) - 1]}", "${isbn[faker.number.int({ min: 1, max: num_of_books }) - 1]}", "${d.toISOString().slice(0, 10)}", null);\n`
}

// Generate reservations
for (let i = 0; i < num_of_reservations; i++) {
  const d = faker.date.past({ years: 3, refDate: '2023-05-20T00:00:00.000Z' })
  sql += `INSERT IGNORE INTO reservation (school_id, username, isbn, reservation_date, cancel_date) VALUES (${faker.number.int({ min: 1, max: num_of_schools })}, "${username[faker.number.int({ min: 1, max: num_of_students + num_of_professors }) - 1]}", "${isbn[faker.number.int({ min: 1, max: num_of_books }) - 1]}", "${d.toISOString().slice(0, 10)}", "${faker.date.soon({ days: 7, refDate: d }).toISOString().slice(0, 10)}");\n`
}


// Generate categories
for (let i = 0; i < num_of_categories; i++) {
  sql += `INSERT IGNORE INTO category (name) VALUES ("${faker.lorem.word()}");\n`
}

// Generate keywords
for (let i = 0; i < num_of_keywords; i++) {
  sql += `INSERT IGNORE INTO keyword (name) VALUES ("${faker.lorem.word()}");\n`
}

// Generate authors
for (let i = 0; i < num_of_authors; i++) {
  sql += `INSERT IGNORE INTO author (full_name) VALUES ("${faker.person.fullName()}");\n`
}



// Generate reviews
for (let i = 0; i < num_of_reviews; i++) {
  sql += `INSERT IGNORE INTO review (username, isbn, rating, review_text) VALUES ("${username[faker.number.int({ min: 1, max: num_of_students + num_of_professors }) - 1]}", "${isbn[faker.number.int({ min: 1, max: num_of_books }) - 1]}", ${faker.number.int({ min: 1, max: 5 })}, "${faker.lorem.paragraph()}");\n`
}

// Generate school_has_book
for (let i = 0; i < num_of_books * num_of_schools; i++) {
  sql += `INSERT IGNORE INTO school_has_book (school_id, isbn, num_of_copies) VALUES (${faker.number.int({ min: 1, max: num_of_schools })}, "${isbn[faker.number.int({ min: 1, max: num_of_books }) - 1]}", ${faker.number.int({ min: 1, max: 20 })});\n`
}

// Generate is_in_category
for (let i = 0; i < num_of_books; i++) {
  sql += `INSERT IGNORE INTO is_in_category (isbn, category_id) VALUES ("${isbn[i]}", ${faker.number.int({ min: 1, max: num_of_categories })});\n`
}

for (let i = 0; i < num_of_books * 2; i++) {
  sql += `INSERT IGNORE INTO is_in_category (isbn, category_id) VALUES ("${isbn[faker.number.int({ min: 1, max: num_of_books }) - 1]}", ${faker.number.int({ min: 1, max: num_of_categories })});\n`
}

// Generate has_keyword
for (let i = 0; i < num_of_keywords * 10; i++) {
  sql += `INSERT IGNORE INTO has_keyword (isbn, keyword_id) VALUES ("${isbn[faker.number.int({ min: 1, max: num_of_books }) - 1]}", ${faker.number.int({ min: 1, max: num_of_keywords })});\n`
}


// Generate has_written
for (let i = 0; i < num_of_books; i++) {
  sql += `INSERT IGNORE INTO has_written (author_id, isbn) VALUES (${faker.number.int({ min: 1, max: num_of_authors })}, "${isbn[i]}");\n`
}

for (let i = 1; i <= num_of_authors; i++) {
  sql += `INSERT IGNORE INTO has_written (author_id, isbn) VALUES (${i}, "${isbn[faker.number.int({ min: 1, max: num_of_books }) - 1]}");\n`
}

for (let i = 0; i < 1000; i++) {
  sql += `INSERT IGNORE INTO has_written (author_id, isbn) VALUES (${faker.number.int({ min: 1, max: num_of_authors })}, "${isbn[faker.number.int({ min: 1, max: num_of_books }) - 1]}");\n`
}

fs.writeFile("data.sql", sql, (err) => {
  if (err) throw err;
  console.log("Data successfully written to file")
});
