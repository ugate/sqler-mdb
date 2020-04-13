CREATE PROCEDURE sqlermysql.perform_test_updates
(
  IN p_id INTEGER, IN p_name VARCHAR(255), IN p_updated DATETIME(3),
  IN p_id2 INTEGER, IN p_name2 VARCHAR(255), IN p_updated2 DATETIME(3)
)
BEGIN
  /*
  Stored procedure is not required when executing a single SQL statement
  Also, MySQL doesn't support anonymous stored procedure blocks
  So, a temporary stored procedure is used instead
  */
  UPDATE sqlermysql.TEST
  SET NAME = p_name, UPDATED_AT = p_updated
  WHERE ID = p_id;
  UPDATE sqlermysql.TEST2
  SET NAME = p_name2, UPDATED_AT = p_updated2
  WHERE ID = p_id2;
END;
CALL sqlermysql.perform_test_updates(
  :id, :name, :updated,
  :id2, :name2, :updated2
);
DROP PROCEDURE sqlermysql.perform_test_updates;