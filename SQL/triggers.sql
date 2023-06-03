USE db_2023;

DELIMITER ;;

CREATE TRIGGER borrowing_overdue_check
BEFORE INSERT ON borrowing
FOR EACH ROW
BEGIN
    DECLARE overdueCount INT;
    
    SELECT COUNT(*) INTO overdueCount 
    FROM borrowing 
    WHERE username = NEW.username AND return_date IS NULL AND DATEDIFF(CURDATE(), borrow_date) > 7;
  
    IF (overdueCount > 0) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'A user cannot borrow a book, if they currently have an overdue book';
    END IF;
END ;;


CREATE TRIGGER reservation_overdue_check
BEFORE INSERT ON reservation
FOR EACH ROW
BEGIN
    DECLARE overdueCount INT;
    
    SELECT COUNT(*) INTO overdueCount 
    FROM borrowing 
    WHERE username = NEW.username AND return_date IS NULL AND DATEDIFF(CURDATE(), borrow_date) > 7;
  
    IF (overdueCount > 0) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'A user cannot reserve a book, if they currently have an overdue book';
    END IF;
END ;;


CREATE TRIGGER borrowing_not_already_borrowed_or_reserved
BEFORE INSERT ON borrowing
FOR EACH ROW
BEGIN
    DECLARE countBorrowed INT;
    DECLARE countReserved INT;
    
    SELECT COUNT(*) INTO countBorrowed 
    FROM borrowing 
    WHERE username = NEW.username AND isbn = NEW.isbn AND return_date IS NULL;
    
    SELECT COUNT(*) INTO countReserved 
    FROM reservation 
    WHERE username = NEW.username AND isbn = NEW.isbn AND cancel_date > CURDATE();
    
    IF (countBorrowed > 0 OR countReserved > 0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A user cannot borrow a book if they already have it reserved or borrowed';
    END IF;
END ;;


CREATE TRIGGER reservation_not_already_borrowed_or_reserved
BEFORE INSERT ON reservation
FOR EACH ROW
BEGIN
    DECLARE countBorrowed INT;
    DECLARE countReserved INT;
    
    SELECT COUNT(*) INTO countBorrowed 
    FROM borrowing 
    WHERE username = NEW.username AND isbn = NEW.isbn AND return_date IS NULL;
    
    SELECT COUNT(*) INTO countReserved 
    FROM reservation 
    WHERE username = NEW.username AND isbn = NEW.isbn AND cancel_date > CURDATE();
    
    IF (countBorrowed > 0 OR countReserved > 0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A user cannot reserve a book if they already have it reserved or borrowed';
    END IF;
END ;;


CREATE TRIGGER reservation_limit_check
BEFORE INSERT ON reservation
FOR EACH ROW
BEGIN
    DECLARE countReserved INT;
    DECLARE userRole VARCHAR(256);
    
    SELECT COUNT(*) INTO countReserved 
    FROM reservation 
    WHERE username = NEW.username AND cancel_date > CURDATE();
    
    SELECT role INTO userRole 
    FROM user 
    WHERE username = NEW.username;
    
    IF (userRole NOT IN ('student', 'professor')) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Only a student or a professor can reserve books';
    ELSEIF (userRole = 'student' AND countReserved >= 2) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'A student can only have up to 2 books reserved at a time';
    ELSEIF (userRole = 'professor' AND countReserved >= 1) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'A professor can only have up to 1 book reserved at a time';
    END IF;
END ;;


CREATE TRIGGER borrowing_limit_check
BEFORE INSERT ON borrowing
FOR EACH ROW
BEGIN
    DECLARE countBorrowed INT;
    DECLARE userRole ENUM('administrator', 'operator', 'student', 'professor');
    
    SELECT COUNT(*) INTO countBorrowed 
    FROM borrowing 
    WHERE username = NEW.username AND return_date IS NULL;
    
    SELECT role INTO userRole 
    FROM user 
    WHERE username = NEW.username;
    
    IF (userRole NOT IN ('student', 'professor')) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Only a student or a professor can borrow books';
    ELSEIF (userRole = 'student' AND countBorrowed >= 2) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'A student can only have up to 2 books borrowed at a time';
    ELSEIF (userRole = 'professor' AND countBorrowed >= 1) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'A professor can only have up to 1 book borrowed at a time';
    END IF;
END ;;


CREATE TRIGGER book_to_reserve_exists_in_school 
BEFORE INSERT ON reservation 
FOR EACH ROW 
BEGIN
    DECLARE available_books INT;
    
    SELECT COUNT(*) INTO available_books 
    FROM school_has_book 
    WHERE school_id = NEW.school_id AND isbn = NEW.isbn;

    IF available_books = 0 THEN 
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This school does not have this book';
    END IF;
END ;;


CREATE TRIGGER book_to_borrow_exists_in_school 
BEFORE INSERT ON borrowing 
FOR EACH ROW 
BEGIN
    DECLARE available_books INT;
    
    SELECT COUNT(*) INTO available_books 
    FROM school_has_book 
    WHERE school_id = NEW.school_id AND isbn = NEW.isbn;

    IF available_books = 0 THEN 
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This school does not have this book';
    END IF;
END ;;




CREATE TRIGGER available_copy_check 
BEFORE INSERT ON borrowing 
FOR EACH ROW 
BEGIN
    DECLARE borrowed_books INT;
    DECLARE total_books INT;

    SELECT num_of_copies INTO total_books 
    FROM school_has_book 
    WHERE school_id = NEW.school_id 
    AND isbn = NEW.isbn;
    
    SELECT COUNT(*) INTO borrowed_books 
    FROM borrowing 
    WHERE school_id = NEW.school_id 
    AND isbn = NEW.isbn 
    AND return_date IS NULL;

    IF borrowed_books >= total_books THEN 
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No available copies';
    END IF;
END ;;


CREATE TRIGGER pending_borrowing_check 
BEFORE DELETE ON user 
FOR EACH ROW
BEGIN
    DECLARE pending INT;
    SELECT COUNT(*) INTO pending
    FROM borrowing 
    WHERE username = OLD.username AND return_date IS NULL;

    IF pending > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot delete user with pending borrowings';
    END IF;
END ;;

DELIMITER ;
