USE db_2023;

CREATE INDEX user_role_idx ON user (role);

CREATE INDEX school_has_book_num_of_copies_idx ON school_has_book (num_of_copies);

CREATE INDEX borrowing_return_date_idx ON borrowing (return_date);

CREATE INDEX book_title_idx ON book (title);

CREATE INDEX author_full_name_idx ON author (full_name);
