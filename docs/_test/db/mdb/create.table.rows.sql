CREATE PROCEDURE sqlermysql.perform_test_inserts
(
  IN p_id INTEGER, IN p_name VARCHAR(255), IN p_created DATETIME(3), IN p_updated DATETIME(3),
  IN p_id2 INTEGER, IN p_name2 VARCHAR(255), IN p_report2 BLOB, IN p_created2 DATETIME(3), IN p_updated2 DATETIME(3)
)
BEGIN
  /*
  Stored procedure is not required when executing a single SQL statement
  Also, MySQL doesn't support anonymous stored procedure blocks
  So, a temporary stored procedure is used instead
  */
  INSERT INTO sqlermysql.TEST (`ID`, `NAME`, CREATED_AT, UPDATED_AT)
  VALUES (p_id, p_name, p_created, p_updated);
  INSERT INTO sqlermysql.TEST2 (`ID`, `NAME`, REPORT, CREATED_AT, UPDATED_AT)
  VALUES (p_id2, p_name2, p_report2, p_created2, p_updated2);
END;
CALL sqlermysql.perform_test_inserts(
  :id, :name, :created, :updated,
  :id2, :name2, :report2, :created2, :updated2
);
DROP PROCEDURE sqlermysql.perform_test_inserts;